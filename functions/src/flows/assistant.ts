// ---------------------------------------------------------------------------
// Flow do Assistente — Chat principal com streaming
// ---------------------------------------------------------------------------
//
// Substitui useAssistant.ts do frontend, movendo toda a lógica de IA
// para o backend via Genkit + Cloud Functions.
//
// Funcionalidades:
//   - Chat com streaming de texto (Server-Sent Events)
//   - Suporte a anexos (imagens e documentos via inlineData)
//   - Extração de configurações JSON sugeridas (```json)
//   - Gestão transacional de créditos via helper withCreditMetering()
//   - Contexto dinâmico: memórias, vozes, ritmos, estado do estúdio
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
  AssistantInputSchema,
  AssistantOutputSchema,
  AssistantStreamSchema,
  type AssistantInput,
  type AssistantOutput,
} from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  finishAiRequest,
  isRequestIdValid,
  startAiRequest,
  throwIfAiCancellationRequested,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import { VOICES, PACE_DESCRIPTIONS } from '../genkit/constants.js';
import {
  buildAssistantSystemInstruction,
  buildCustomPromptBlock,
  buildMemoriesText,
  buildStudioBlock,
  buildUserProfileBlock,
  type AssistantUserSettingsDoc,
} from '../genkit/utils/assistant-context.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';

// ---------------------------------------------------------------------------
// Constantes de Modelo
// ---------------------------------------------------------------------------

const MODEL_FAST = 'googleai/gemini-3.1-flash-lite';
const MODEL_SPECIALIST = 'googleai/gemini-3.5-flash';

interface ModelConfig {
  model: string;
  thinkingConfig?: Record<string, unknown>;
}

/**
 * Determina a configuração do modelo com base na escolha do usuário.
 * Se nenhum modelo for especificado, usa o rápido por padrão.
 */
function resolveModelConfig(
  model?: 'fast' | 'specialist',
  thinkingLevel?: string,
): ModelConfig {
  const resolvedModel = model === 'specialist' ? MODEL_SPECIALIST : MODEL_FAST;

  // Se nível de pensamento for especificado, inclui no config
  if (thinkingLevel && ['minimal', 'low', 'medium', 'high'].includes(thinkingLevel)) {
    return {
      model: resolvedModel,
      thinkingConfig: { thinkingLevel },
    };
  }

  return { model: resolvedModel };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extrai um bloco JSON da resposta do modelo.
 * Procura por ```json ... ``` e retorna o objeto parseado.
 */
function extractJsonSettings(text: string): Record<string, unknown> | undefined {
  // Regex para capturar bloco ```json ... ```
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/i;
  const match = jsonBlockRegex.exec(text);

  if (!match || !match[1]) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(match[1].trim());
    // Garante que o resultado é um objeto válido (não array, não primitivo)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    // JSON inválido — ignora silenciosamente
    return undefined;
  }
}

function buildMeteringHistoryText(input: AssistantInput): string {
  return JSON.stringify(
    (input.history ?? []).map((message) => ({
      role: message.role,
      text: message.text,
      attachments: (message.attachments ?? []).map((attachment) => ({
        mimeType: attachment.mimeType,
        name: attachment.name ?? '',
      })),
    })),
  );
}

// ---------------------------------------------------------------------------
// Flow Definition
// ---------------------------------------------------------------------------

export const assistant = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'assistant',
      inputSchema: AssistantInputSchema,
      outputSchema: AssistantOutputSchema,
      streamSchema: AssistantStreamSchema,
    },
    async (input: AssistantInput, flowContext): Promise<AssistantOutput> => {
      const uid = getCallableUidOrThrow(flowContext);
      const { sendChunk } = flowContext;

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
      let requestStarted = false;
      let requestFinished = false;
      let creditsSettled = false;
      let creditMeter: Awaited<ReturnType<typeof withCreditMetering>> | null = null;

      try {
        await startAiRequest(db, uid, requestId, 'assistant');
        requestStarted = true;

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

        // Monta texto de memórias
        const memories: Array<{ content: string }> = memoriesSnap && !memoriesSnap.empty
          ? memoriesSnap.docs.map((d) => d.data() as { content: string })
          : [];
        const memoriesText = buildMemoriesText(memories);

        // Monta bloco de prompt customizado
        const userSettings = settingsSnap?.exists
          ? (settingsSnap.data() as AssistantUserSettingsDoc)
          : null;
        const customPromptBlock = buildCustomPromptBlock(userSettings);
        const userProfileBlock = buildUserProfileBlock(userSettings);

        // Listas de vozes e ritmos
        const voicesList = VOICES.map((v) => `- ${v.name} (${v.style})`).join('\n');
        const paceList = Object.entries(PACE_DESCRIPTIONS)
          .map(([key, desc]) => `${key} (${desc})`)
          .join(', ');

        // Bloco de estado do estúdio
        const studioBlock = buildStudioBlock(input.studioState ?? undefined);

        // -----------------------------------------------------------------------
        // 2. Reserva créditos via helper withCreditMetering()
        // -----------------------------------------------------------------------

        const historyText = buildMeteringHistoryText(input);

        creditMeter = await withCreditMetering(
          db,
          uid,
          requestId,
          'assistant',
          { message: input.message, history: historyText },
        );

        // -----------------------------------------------------------------------
        // 3. Constrói mensagens para o modelo
        // -----------------------------------------------------------------------

        // Converte anexos para partes inlineData
        const attachmentParts = (input.attachments ?? [])
          .filter((att) => att.data && att.data.length > 0)
          .map((att) => ({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data,
            },
          }));

        // Histórico de mensagens
        const historyMessages = (input.history ?? []).map((msg) => ({
          role: msg.role as 'user' | 'model',
          content: [
            { text: msg.text },
            ...(msg.attachments ?? [])
              .filter((attachment) => attachment.data.length > 0)
              .map((attachment) => ({
                inlineData: {
                  mimeType: attachment.mimeType,
                  data: attachment.data,
                },
              })),
          ],
        }));

        // Mensagem atual do usuário
        const currentMessage = {
          role: 'user' as const,
          content: [
            { text: input.message },
            ...attachmentParts,
          ],
        };

        const messages = [...historyMessages, currentMessage];

        // -----------------------------------------------------------------------
        // 4. Geração com streaming via instrução em código
        // -----------------------------------------------------------------------

        const systemInstruction = buildAssistantSystemInstruction({
          memoriesText,
          userProfileBlock,
          voicesList,
          paceList,
          studioBlock,
          customPromptBlock,
        });

        let fullText = '';
        let sendFailed = false;

        // Resolve configuração do modelo com base na escolha do usuário
        const { model: resolvedModel, thinkingConfig } = resolveModelConfig(
          input.model ?? undefined,
          input.thinkingLevel ?? undefined,
        );

        try {
          const { response: streamResponse, stream } = ai.generateStream({
            model: resolvedModel,
            system: systemInstruction,
            messages,
            config: thinkingConfig ? { thinkingConfig } : undefined,
          });

          // Itera sobre chunks de texto do modelo
          for await (const chunk of stream) {
            await throwIfAiCancellationRequested(db, uid, requestId);
            const chunkText = chunk.content?.[0]?.text ?? chunk.text ?? '';
            if (chunkText) {
              fullText += chunkText;
              try {
                sendChunk(chunkText);
              } catch {
                // Cliente desconectou — aborta o streaming localmente,
                // mas confirma créditos parciais pelo texto já gerado
                sendFailed = true;
                break;
              }
            }
          }

          // Se cliente desconectou durante o streaming, confirma custo parcial
          if (sendFailed) {
            // Aborta o stream pendente (não bloqueia)
            streamResponse.catch(() => {});

            if (fullText.length > 0) {
              const messageChars = input.message.length;
              const historyChars = historyText.length;
              const outputChars = fullText.length;

              const partialCredits = calculateCreditCost({
                operationType: 'assistant',
                inputChars: messageChars + historyChars,
                outputChars,
              });

              await creditMeter.confirm({
                finalCredits: partialCredits,
                outputSize: outputChars,
                model: resolvedModel,
              });
              creditsSettled = true;

              console.log(
                `[assistant] Streaming abortado por desconexão do cliente: ` +
                `uid=${uid} requestId=${requestId} chars=${outputChars} credits=${partialCredits}`,
              );
            } else {
              // Nada foi gerado — reverte reserva
              await creditMeter.revert('CLIENT_DISCONNECTED');
              creditsSettled = true;
            }

            // Retorna o texto parcial (cliente já desconectado, mas mantém consistência)
            const jsonSettings = extractJsonSettings(fullText);
            await finishAiRequest(db, uid, requestId, 'completed').catch((finishError: unknown) => {
              console.error(
                `[assistant] Falha ao finalizar ai_request após desconexão: ` +
                `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
              );
            });
            requestFinished = true;
            return { text: fullText, jsonSettings };
          }

          // Aguarda finalização da resposta
          await streamResponse;

          // -------------------------------------------------------------------
          // 5. Extrai configurações JSON da resposta
          // -------------------------------------------------------------------

          const jsonSettings = extractJsonSettings(fullText);

          // -------------------------------------------------------------------
          // 6. Confirma créditos com o custo real
          // -------------------------------------------------------------------

          const messageChars = input.message.length;
          const historyChars = historyText.length;
          const outputChars = fullText.length;

          const finalCredits = calculateCreditCost({
            operationType: 'assistant',
            inputChars: messageChars + historyChars,
            outputChars,
          });

          await creditMeter.confirm({
            finalCredits,
            outputSize: outputChars,
            model: resolvedModel,
          });
          creditsSettled = true;

          console.log(
            `[assistant] Resposta gerada: uid=${uid} requestId=${requestId} ` +
            `chars=${outputChars} credits=${finalCredits}`,
          );

          await finishAiRequest(db, uid, requestId, 'completed').catch((finishError: unknown) => {
            console.error(
              `[assistant] Falha ao finalizar ai_request com sucesso: ` +
              `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
            );
          });
          requestFinished = true;
          return { text: fullText, jsonSettings };

        } catch (error) {
          // -------------------------------------------------------------------
          // 7. Reverte créditos em caso de erro
          // -------------------------------------------------------------------

          const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

          if (!creditsSettled) {
            await creditMeter.revert(errorCode);
            creditsSettled = true;
          }
          await finishAiRequest(
            db,
            uid,
            requestId,
            error instanceof HttpsError && error.code === 'cancelled' ? 'cancelled' : 'failed',
            errorCode,
          ).catch((finishError: unknown) => {
            console.error(
              `[assistant] Falha ao finalizar ai_request com erro interno: ` +
              `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
            );
          });
          requestFinished = true;

          console.error(
            `[assistant] Erro na geração: uid=${uid} requestId=${requestId} erro=${errorCode}`,
          );

          throw error;
        }
      } catch (error) {
        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

        if (creditMeter && !creditsSettled) {
          await creditMeter.revert(errorCode);
        }

        if (requestStarted && !requestFinished) {
          await finishAiRequest(
            db,
            uid,
            requestId,
            error instanceof HttpsError && error.code === 'cancelled' ? 'cancelled' : 'failed',
            errorCode,
          ).catch((finishError: unknown) => {
            console.error(
              `[assistant] Falha ao finalizar ai_request no catch externo: ` +
              `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
            );
          });
        }

        throw error;
      }
    },
  ),
);
