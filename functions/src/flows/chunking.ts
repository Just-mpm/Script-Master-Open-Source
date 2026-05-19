// ---------------------------------------------------------------------------
// Flow utilitário de chunking — divisão inteligente de scripts com Dotprompt
// ---------------------------------------------------------------------------
//
// Substitui a lógica client-side de chunking do useAudioGenerator.ts.
//
// Pipeline:
//   1. Valida autenticação (isSignedIn + App Check)
//   2. Reserva créditos via withCreditMetering() helper
//   3. Se script <= limit: retorna array com 1 elemento
//   4. Se script > limit: usa Dotprompt externo (chunking.prompt) para chunking inteligente
//   5. Fallback: divisão programática por sentenças
//   6. Confirma ou reverte créditos conforme resultado
//   7. Retorna array de strings (chunks)
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
import { ChunkingInputSchema, ChunkingOutputSchema } from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  isRequestIdValid,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import { splitTextProgrammatically } from '../genkit/utils/chunking.js';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Modelo usado para chunking (registro em credit_events) */
const CHUNKING_MODEL = 'googleai/gemini-3.1-flash-lite-preview';

/** Limite padrão de caracteres por chunk */
const DEFAULT_CHUNK_LIMIT = 500;

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const chunking = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    enforceAppCheck: true,
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'chunking',
      inputSchema: ChunkingInputSchema,
      outputSchema: ChunkingOutputSchema,
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
      const limit = input.limit ?? DEFAULT_CHUNK_LIMIT;

      // ------------------------------------------------------------------
      // 1. Caso simples: script já está dentro do limite
      // ------------------------------------------------------------------
      if (input.script.length <= limit) {
        return { chunks: [input.script] };
      }

      // ------------------------------------------------------------------
      // 2. Reserva créditos via helper withCreditMetering()
      // ------------------------------------------------------------------
      const creditMeter = await withCreditMetering(
        db,
        uid,
        requestId,
        'chunking',
        { script: input.script, limit },
      );

      // ------------------------------------------------------------------
      // 3. Chunking via Dotprompt externo
      // ------------------------------------------------------------------
      try {
        const chunkingPrompt = ai.prompt('chunking');

        const response = await chunkingPrompt({
          input: {
            limit: String(limit),
            script: input.script,
          },
        });

        const chunks = response.output as string[] | undefined;

        if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
          throw new Error('Resposta de chunking inválida ou vazia');
        }

        // Garante que nenhum chunk individual exceda o limite
        // (o Gemini pode ocasionalmente retornar chunks maiores que o limite)
        const validatedChunks: string[] = [];
        for (const c of chunks) {
          if (c.length > limit) {
            validatedChunks.push(...splitTextProgrammatically(c, limit));
          } else {
            validatedChunks.push(c);
          }
        }

        const finalChunks = validatedChunks.filter((c) => c.trim().length > 0);

        // ------------------------------------------------------------------
        // 4. Confirma créditos com o custo real
        // ------------------------------------------------------------------
        const finalCredits = calculateCreditCost({
          operationType: 'chunking',
          itemCount: finalChunks.length,
        });

        await creditMeter.confirm({
          finalCredits,
          outputSize: input.script.length,
          model: CHUNKING_MODEL,
        });

        console.log(
          `[chunking] Divisão concluída via Gemini: uid=${uid} ` +
          `scriptLen=${input.script.length} chunks=${finalChunks.length} créditos=${finalCredits}`,
        );

        return { chunks: finalChunks };

      } catch (genErr) {
        const errorMessage = genErr instanceof Error ? genErr.message : 'Erro desconhecido';
        console.error(`[chunking] Falha no chunking via Gemini: ${errorMessage}`);

        // Reverte créditos em caso de falha
        await creditMeter.revert('CHUNKING_FAILED');

        // ------------------------------------------------------------------
        // 5. Fallback programático
        //
        // No beta aberto, o fallback é gratuito — o usuário não pagou pela
        // IA então não consome créditos. Se a API Gemini falhar, o resultado
        // de fallback (menos preciso) é entregue sem custo.
        // ------------------------------------------------------------------
        const fallbackChunks = splitTextProgrammatically(input.script, limit);

        console.log(
          `[chunking] Fallback programático: uid=${uid} ` +
          `scriptLen=${input.script.length} chunks=${fallbackChunks.length}`,
        );

        return { chunks: fallbackChunks };
      }
    },
  ),
);
