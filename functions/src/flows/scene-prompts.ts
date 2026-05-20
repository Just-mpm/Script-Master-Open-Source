// ---------------------------------------------------------------------------
// Flow de geração de prompts de cena — Gemini via Genkit com Dotprompt
// ---------------------------------------------------------------------------
//
// Substitui a lógica client-side do generateScenePrompts() em src/lib/gemini.ts.
//
// Pipeline:
//   1. Valida autenticação (isSignedIn + App Check)
//   2. Reserva créditos via withCreditMetering() helper
//   3. Gera prompts de cena via Dotprompt externo (scene-prompts.prompt)
//   4. Confirma ou reverte créditos conforme resultado
//   5. Retorna array de { timestamp, prompt } + flag isFallback
//
// Suporta dois frameworks visuais: 'general' (cinema/fotografia) e
// 'whiteboard' (ilustrações + texto integrado).
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//   - Região: southamerica-east1
// ---------------------------------------------------------------------------

import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import {
  ScenePromptsInputSchema,
  ScenePromptsOutputSchema,
} from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  finishAiRequest,
  isRequestIdValid,
  startAiRequest,
  throwIfAiCancellationRequested,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Modelo usado para geração de prompts de cena (registro em credit_events) */
const SCENE_PROMPTS_MODEL = 'googleai/gemini-3.1-flash-lite-preview';

/** Densidade padrão de cenas (em segundos) */
const DEFAULT_DENSITY_SECONDS = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mapa locale -> nome do idioma para instruções ao Gemini.
 * Usado para garantir que textos nas imagens estejam no idioma correto.
 */
const LOCALE_LANGUAGE_MAP: Record<string, string> = {
  'pt-BR': 'português brasileiro',
  'pt': 'português',
  'en': 'inglês',
  'es': 'espanhol',
};

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const scenePrompts = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'scenePrompts',
      inputSchema: ScenePromptsInputSchema,
      outputSchema: ScenePromptsOutputSchema,
    },
    async (input) => {
      const auth = ai.currentContext()?.auth;
      const uid = auth?.uid;

      if (!uid) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado');
      }

      // Guard do beta aberto — bloqueia acesso quando beta fechado
      if (process.env.OPEN_BETA_ENABLED !== 'true') {
        throw new HttpsError('unavailable', 'O beta aberto está temporariamente desabilitado. Tente novamente em breve.');
      }

      const db = getFirestore();

      // Valida requestId enviado pelo cliente (deve ser UUID v4)
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId ?? randomUUID();
      let requestStarted = false;
      let creditsSettled = false;
      let creditMeter: Awaited<ReturnType<typeof withCreditMetering>> | null = null;

      try {
        await startAiRequest(db, uid, requestId, 'scene_prompts');
        requestStarted = true;
        await throwIfAiCancellationRequested(db, uid, requestId);

        // ------------------------------------------------------------------
        // 1. Reserva créditos via helper withCreditMetering()
        // ------------------------------------------------------------------
        const densitySeconds = input.densitySeconds ?? DEFAULT_DENSITY_SECONDS;
        const imageCount = Math.max(1, Math.ceil(input.durationInSeconds / densitySeconds));

        creditMeter = await withCreditMetering(
          db,
          uid,
          requestId,
          'scene_prompts',
          { script: input.script, scenes: Array.from({ length: imageCount }) },
        );

        // ------------------------------------------------------------------
        // 2. Prepara variáveis para o Dotprompt
        // ------------------------------------------------------------------
        const visualFramework = input.visualFramework ?? 'general';
        const locale = input.locale ?? 'pt-BR';
        const languageName = LOCALE_LANGUAGE_MAP[locale] ?? locale;
        const style = input.style ?? 'Nenhum específico';

        // Instruções específicas do framework visual (pré-montadas como no padrão
        // do assistant.prompt, que usa {{studioBlock}} e {{customPromptBlock}})
        const frameworkInstructions = visualFramework === 'whiteboard'
          ? `
[CRÍTICO: MODO WHITEBOARD MASTER]
A identidade visual DEVE imitar vídeos de "whiteboard animation" coloridos (ex: Ilustrações explicativas em quadro branco).
Regras estritas deste modo:
1. O fundo DEVE ser explicitamente descrito como um quadro branco e limpo ("white board", "blank white background").
2. Elementos visuais devem ser PRIMARIAMENTE ilustrações coloridas (use termos como "colored marker illustration", "colorful doodle", "expressive sketch").
3. [IMPORTANTE] Como é uma aula/explicação, insira textos integrados na imagem resumindo o tópico. No prompt, use instruções para renderizar texto (ex: text "TÓPICO" written on the board) com 1 a 4 palavras chaves capturadas daquela parte do roteiro.
4. NÃO use fotografias ou 3D. Apenas ilustrações artísticas vibrantes e explicativas desenhadas sobre o fundo branco.`
          : `
[MODO CENÁRIO PADRÃO]
As imagens devem ser ricas e focar em fotografia, cinemática, ou seguir estritamente a direção de arte e estilo configurados.`;

        // ------------------------------------------------------------------
        // 3. Gera prompts de cena via Dotprompt externo
        // ------------------------------------------------------------------
        try {
          const scenePrompt = ai.prompt('scene-prompts');

          const response = await scenePrompt({
            input: {
              duration: input.durationInSeconds.toFixed(1),
              imageCount: String(imageCount),
              densitySeconds: String(densitySeconds),
              frameworkInstructions,
              style,
              languageName,
              languageNameUpper: languageName.toUpperCase(),
              script: input.script,
            },
          });
          await throwIfAiCancellationRequested(db, uid, requestId);

          const prompts = response.output as Array<{ timestamp: number; prompt: string }> | undefined;

          if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            throw new Error('Resposta de prompts de cena inválida ou vazia');
          }

          // ------------------------------------------------------------------
          // 4. Confirma créditos (custo real baseado nos prompts gerados)
          // ------------------------------------------------------------------
          const finalCredits = calculateCreditCost({
            operationType: 'scene_prompts',
            itemCount: prompts.length,
          });

          await creditMeter.confirm({
            finalCredits,
            outputSize: JSON.stringify(prompts).length,
            model: SCENE_PROMPTS_MODEL,
          });
          creditsSettled = true;

          console.log(
            `[scene-prompts] Geração concluída: uid=${uid} prompts=${prompts.length} ` +
            `framework=${visualFramework} locale=${locale} créditos=${finalCredits}`,
          );

          await finishAiRequest(db, uid, requestId, 'completed').catch((finishError: unknown) => {
            console.error(
              `[scene-prompts] Falha ao finalizar ai_request com sucesso: ` +
              `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
            );
          });

          return {
            prompts,
            isFallback: false,
          };

        } catch (genErr) {
          if (genErr instanceof HttpsError && genErr.code === 'cancelled') {
            throw genErr;
          }

          const errorMessage = genErr instanceof Error ? genErr.message : 'Erro desconhecido';
          console.error(`[scene-prompts] Falha na geração: ${errorMessage}`);

          // Reverte créditos em caso de falha
          await creditMeter.revert('SCENE_PROMPTS_FAILED');
          creditsSettled = true;

          // ------------------------------------------------------------------
          // 5. Fallback genérico como último recurso
          // ------------------------------------------------------------------
          const fallbackPrompts = [{
            timestamp: 0,
            prompt: `A captivating scene about: ${input.script.substring(0, 100)}... Style: ${style}`,
          }];

          console.log(
            `[scene-prompts] Retornando fallback genérico: uid=${uid} ` +
            `scriptLen=${input.script.length}`,
          );
          await finishAiRequest(db, uid, requestId, 'completed', 'FALLBACK_RETURNED').catch((finishError: unknown) => {
            console.error(
              `[scene-prompts] Falha ao finalizar ai_request com fallback: ` +
              `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
            );
          });

          return {
            prompts: fallbackPrompts,
            isFallback: true,
          };
        }
      } catch (error) {
        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

        if (creditMeter && !creditsSettled) {
          await creditMeter.revert(errorCode);
        }

        if (requestStarted) {
          await finishAiRequest(
            db,
            uid,
            requestId,
            error instanceof HttpsError && error.code === 'cancelled' ? 'cancelled' : 'failed',
            errorCode,
          ).catch((finishError: unknown) => {
            console.error(
              `[scene-prompts] Falha ao finalizar ai_request com erro: ` +
              `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
            );
          });
        }

        throw error;
      }
    },
  ),
);
