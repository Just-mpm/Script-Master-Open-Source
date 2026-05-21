// ---------------------------------------------------------------------------
// Flow do Assistente Inline — Reescrita de trechos de texto
// ---------------------------------------------------------------------------
//
// Substitui useInlineAssistant.ts do frontend, movendo a reescrita de
// trechos selecionados do roteiro para o backend via Genkit.
//
// Funcionalidades:
//   - Reescrita inline (expandir, resumir, reescrever) sem streaming
//   - Contexto completo do roteiro para manter tom e coerência
//   - Resposta limpa: apenas o trecho reescrito, sem markdown ou explicações
//   - Gestão transacional de créditos via helper withCreditMetering()
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//   - region: southamerica-east1
// ---------------------------------------------------------------------------

import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import {
  InlineAssistantInputSchema,
  InlineAssistantOutputSchema,
  type InlineAssistantInput,
  type InlineAssistantOutput,
} from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  isRequestIdValid,
  finishAiRequest,
  startAiRequest,
  throwIfAiCancellationRequested,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import { VOICES, PACE_DESCRIPTIONS } from '../genkit/constants.js';
import {
  buildInlineAssistantInstruction,
  buildCustomPromptBlock,
  buildMemoriesText,
  buildUserProfileBlock,
  type AssistantUserSettingsDoc,
} from '../genkit/utils/assistant-context.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Remove formatação markdown residual da resposta do modelo.
 * Garante que o texto retornado seja um drop-in replacement limpo.
 */
function cleanMarkdown(text: string): string {
  let cleaned = text.trim();

  // Remove blocos ``` completos
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    const firstLineBreak = cleaned.indexOf('\n');
    const lastLineBreak = cleaned.lastIndexOf('\n');
    if (firstLineBreak !== -1 && lastLineBreak !== -1 && firstLineBreak !== lastLineBreak) {
      cleaned = cleaned.substring(firstLineBreak + 1, lastLineBreak).trim();
    } else {
      cleaned = cleaned
        .replace(/^```(markdown|text|md)?\s*/i, '')
        .replace(/```$/, '')
        .trim();
    }
  }

  // Remove aspas triplas no início/fim (a IA às vezes coloca)
  cleaned = cleaned.replace(/^"""/, '').replace(/"""$/, '').trim();

  return cleaned;
}

// ---------------------------------------------------------------------------
// Flow Definition
// ---------------------------------------------------------------------------

export const inlineAssistant = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'inlineAssistant',
      inputSchema: InlineAssistantInputSchema,
      outputSchema: InlineAssistantOutputSchema,
    },
    async (input: InlineAssistantInput, flowContext): Promise<InlineAssistantOutput> => {
      const uid = getCallableUidOrThrow(flowContext);

      // Guard do beta aberto — bloqueia acesso quando beta fechado
      if (process.env.OPEN_BETA_ENABLED !== 'true') {
        throw new HttpsError('unavailable', 'O beta aberto está temporariamente desabilitado. Tente novamente em breve.');
      }

      const db = getFirestore();

      // Valida requestId enviado pelo cliente (deve ser UUID v4)
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId || crypto.randomUUID();
      await startAiRequest(db, uid, requestId, 'inline_assistant');

      // -----------------------------------------------------------------------
      // 1. Busca contexto do usuário (memórias + user settings)
      // -----------------------------------------------------------------------
      await throwIfAiCancellationRequested(db, uid, requestId);

      const [memoriesSnap, settingsSnap] = await Promise.all([
        db
          .collection('memories')
          .where('userId', '==', uid)
          .limit(100)
          .get()
          .catch(() => null),
        db
          .collection('user_settings')
          .doc(uid)
          .get()
          .catch(() => null),
      ]);

      const memories: Array<{ content: string }> = memoriesSnap && !memoriesSnap.empty
        ? memoriesSnap.docs.map((d) => d.data() as { content: string })
        : [];
      const memoriesText = buildMemoriesText(memories);

      const userSettings = settingsSnap?.exists
        ? (settingsSnap.data() as AssistantUserSettingsDoc)
        : null;
      const customPromptBlock = buildCustomPromptBlock(userSettings);
      const userProfileBlock = buildUserProfileBlock(userSettings);

      const voicesList = VOICES.map((v) => `- ${v.name} (${v.style})`).join('\n');
      const paceList = Object.entries(PACE_DESCRIPTIONS)
        .map(([key, desc]) => `${key} (${desc})`)
        .join(', ');

      // -----------------------------------------------------------------------
      // 2. Reserva créditos via helper withCreditMetering()
      // -----------------------------------------------------------------------

      const creditMeter = await withCreditMetering(
        db,
        uid,
        requestId,
        'inline_assistant',
        { message: input.selectedText },
      );
      await throwIfAiCancellationRequested(db, uid, requestId);

      // -----------------------------------------------------------------------
      // 3. Geração via instrução em código (sem streaming)
      // -----------------------------------------------------------------------

      try {
        const instruction = buildInlineAssistantInstruction({
          memoriesText,
          userProfileBlock,
          voicesList,
          paceList,
          customPromptBlock,
          selectedText: input.selectedText,
          instruction: input.instruction,
          fullScript: input.fullScript ?? '',
        });

        const response = await ai.generate({
          model: 'googleai/gemini-3.1-flash-lite',
          prompt: instruction,
          config: {
            temperature: 0.7,
          },
        });

        const text = response.text;

        if (!text) {
          throw new Error('Resposta vazia da IA.');
        }

        // Limpa a resposta para ser um drop-in replacement
        const rewrittenText = cleanMarkdown(text);
        await throwIfAiCancellationRequested(db, uid, requestId);

        // -------------------------------------------------------------------
        // 4. Confirma créditos com o custo real
        // -------------------------------------------------------------------

        const inputChars = input.selectedText.length + (input.fullScript?.length ?? 0) + input.instruction.length;
        const outputChars = rewrittenText.length;

        const finalCredits = calculateCreditCost({
          operationType: 'inline_assistant',
          inputChars,
          outputChars,
        });

        await creditMeter.confirm({
          finalCredits,
          outputSize: outputChars,
          model: 'googleai/gemini-3.1-flash-lite',
        });

        console.log(
          `[inlineAssistant] Texto reescrito: uid=${uid} requestId=${requestId} ` +
          `inputChars=${inputChars} outputChars=${outputChars} credits=${finalCredits}`,
        );
        await finishAiRequest(db, uid, requestId, 'completed');

        return { rewrittenText };

      } catch (error) {
        // -------------------------------------------------------------------
        // 5. Reverte créditos em caso de erro
        // -------------------------------------------------------------------

        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

        await creditMeter.revert(errorCode);
        const finalStatus = error instanceof HttpsError && error.code === 'cancelled'
          ? 'cancelled'
          : 'failed';
        await finishAiRequest(db, uid, requestId, finalStatus, errorCode);

        console.error(
          `[inlineAssistant] Erro na geração: uid=${uid} requestId=${requestId} erro=${errorCode}`,
        );

        throw error;
      }
    },
  ),
);
