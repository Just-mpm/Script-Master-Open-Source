// ---------------------------------------------------------------------------
// Flow do Assistente Inline — Reescrita de trechos de texto (BYOK)
// ---------------------------------------------------------------------------
//
// Funcionalidades:
//   - Reescrita inline (expandir, resumir, reescrever) sem streaming
//   - Contexto completo do roteiro para manter tom e coerência
//   - Resposta limpa: apenas o trecho reescrito, sem markdown ou explicações
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
  ProviderAuthSchema,
  type InlineAssistantInput,
  type InlineAssistantOutput,
} from '../genkit/schemas/common.js';
import {
  isRequestIdValid,
  finishAiRequest,
  startAiRequest,
  throwIfAiCancellationRequested,
} from '../usage/index.js';
import { extractApiKey, withApiKey } from '../genkit/utils/byok.js';
import {
  buildInlineAssistantInstruction,
  buildCustomPromptBlock,
  buildMemoriesText,
  buildUserProfileBlock,
  type AssistantUserSettingsDoc,
} from '../genkit/utils/assistant-context.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { resolveModelConfig } from '../genkit/utils/model-config.js';
import { createLogger } from '../genkit/utils/logger.js';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const log = createLogger('inlineAssistant');

/** Input schema estendido com providerAuth para BYOK */
const InlineAssistantInputByokSchema = InlineAssistantInputSchema.extend({
  providerAuth: ProviderAuthSchema.nullable().optional(),
});

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
      inputSchema: InlineAssistantInputByokSchema,
      outputSchema: InlineAssistantOutputSchema,
    },
    async (input: InlineAssistantInput, flowContext): Promise<InlineAssistantOutput> => {
      const uid = getCallableUidOrThrow(flowContext);
      const apiKey = extractApiKey(input);

      const db = getFirestore();

      // Valida requestId enviado pelo cliente (deve ser UUID v4)
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId || crypto.randomUUID();

      // startAiRequest antes do try — se falhar, o HttpsError propaga diretamente
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

      await throwIfAiCancellationRequested(db, uid, requestId);

      // -----------------------------------------------------------------------
      // 2. Geração via instrução em código (sem streaming)
      // -----------------------------------------------------------------------

      try {
        const instruction = buildInlineAssistantInstruction({
          memoriesText,
          userProfileBlock,
          customPromptBlock,
          selectedText: input.selectedText,
          instruction: input.instruction,
          fullScript: input.fullScript ?? '',
        });

        // Resolve configuração do modelo — inline sempre usa fast
        const { model: resolvedModel, thinkingConfig } = resolveModelConfig(
          undefined,
          input.thinkingLevel ?? 'high', // Default high para máxima qualidade de reescrita
        );

        const response = await ai.generate({
          model: resolvedModel,
          prompt: instruction,
          config: {
            ...withApiKey(apiKey),
            temperature: 0.7,
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        });

        const text = response.text;

        if (!text) {
          throw new Error('Resposta vazia da IA.');
        }

        // Limpa a resposta para ser um drop-in replacement
        const rewrittenText = cleanMarkdown(text);
        await throwIfAiCancellationRequested(db, uid, requestId);

        log.info('Texto reescrito', {
          uid, requestId, inputChars: input.selectedText.length, outputChars: rewrittenText.length,
        });
        await finishAiRequest(db, uid, requestId, 'completed');

        return { rewrittenText };

      } catch (error) {
        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';
        const finalStatus = error instanceof HttpsError && error.code === 'cancelled'
          ? 'cancelled'
          : 'failed';
        await finishAiRequest(db, uid, requestId, finalStatus, errorCode).catch(() => {});

        log.error('Erro na geração', { uid, requestId, error: errorCode });

        throw error;
      }
    },
  ),
);
