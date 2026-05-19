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
import {
  InlineAssistantInputSchema,
  InlineAssistantOutputSchema,
  type InlineAssistantInput,
  type InlineAssistantOutput,
} from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  isRequestIdValid,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import { VOICES, PACE_DESCRIPTIONS } from '../genkit/constants.js';

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
    enforceAppCheck: true,
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'inlineAssistant',
      inputSchema: InlineAssistantInputSchema,
      outputSchema: InlineAssistantOutputSchema,
    },
    async (input: InlineAssistantInput): Promise<InlineAssistantOutput> => {
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
      const requestId = input.requestId || crypto.randomUUID();

      // -----------------------------------------------------------------------
      // 1. Busca contexto do usuário (memórias + user settings)
      // -----------------------------------------------------------------------

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
      const memoriesText = memories.length > 0
        ? `\nMEMÓRIAS DO USUÁRIO (Leve estas preferências em conta):\n${memories.map((m) => `- ${m.content}`).join('\n')}`
        : '';

      const userSettings = settingsSnap?.exists
        ? (settingsSnap.data() as { customSystemPrompt?: string })
        : null;
      const customPromptBlock = userSettings?.customSystemPrompt
        ? `\n\nDIRETRIZES CUSTOMIZADAS DO USUÁRIO:\n${userSettings.customSystemPrompt}`
        : '';

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

      // -----------------------------------------------------------------------
      // 3. Geração via Dotprompt (sem streaming)
      // -----------------------------------------------------------------------

      const inlinePrompt = ai.prompt('inline-assistant');

      try {
        const response = await inlinePrompt({
          input: {
            memoriesText,
            voicesList,
            paceList,
            customPromptBlock,
            selectedText: input.selectedText,
            instruction: input.instruction,
            fullScript: input.fullScript ?? '',
          },
        });

        const text = response.text;

        if (!text) {
          throw new Error('Resposta vazia da IA.');
        }

        // Limpa a resposta para ser um drop-in replacement
        const rewrittenText = cleanMarkdown(text);

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
          model: 'gemini-3.1-flash-lite-preview',
        });

        console.log(
          `[inlineAssistant] Texto reescrito: uid=${uid} requestId=${requestId} ` +
          `inputChars=${inputChars} outputChars=${outputChars} credits=${finalCredits}`,
        );

        return { rewrittenText };

      } catch (error) {
        // -------------------------------------------------------------------
        // 5. Reverte créditos em caso de erro
        // -------------------------------------------------------------------

        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

        await creditMeter.revert(errorCode);

        console.error(
          `[inlineAssistant] Erro na geração: uid=${uid} requestId=${requestId} erro=${errorCode}`,
        );

        throw error;
      }
    },
  ),
);
