// ---------------------------------------------------------------------------
// Flow utilitário de chunking — divisão inteligente de scripts com instrução em código
// ---------------------------------------------------------------------------
//
// Substitui a lógica client-side de chunking do useAudioGenerator.ts.
//
// Pipeline:
//   1. Valida autenticação (isSignedIn + App Check)
//   2. Reserva créditos via withCreditMetering() helper
//   3. Se script <= limit: retorna array com 1 elemento
//   4. Se script > limit: usa builder TypeScript + structured output
//   5. Fallback: divisão programática por sentenças
//   6. Confirma ou reverte créditos conforme resultado
//   7. Retorna array de strings (chunks)
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//   - Região: southamerica-east1
// ---------------------------------------------------------------------------

import { z } from 'genkit';
import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import { ChunkingInputSchema, ChunkingOutputSchema } from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  isRequestIdValid,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import { buildChunkingInstruction } from '../genkit/utils/assistant-context.js';
import { splitTextProgrammatically, extractTrailingSentence } from '../genkit/utils/chunking.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { createLogger } from '../genkit/utils/logger.js';

const log = createLogger('chunking');

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Modelo usado para chunking (registro em credit_events) */
const CHUNKING_MODEL = 'googleai/gemini-3.1-flash-lite';

/** Limite padrão de caracteres por chunk */
const DEFAULT_CHUNK_LIMIT = 500;

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const chunking = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'chunking',
      inputSchema: ChunkingInputSchema,
      outputSchema: ChunkingOutputSchema,
    },
    async (input, flowContext) => {
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
      // 3. Chunking via builder TypeScript + structured output enriquecido
      // ------------------------------------------------------------------
      try {
        const response = await ai.generate({
          model: CHUNKING_MODEL,
          prompt: buildChunkingInstruction(input.script, limit),
          config: {
            temperature: 0,
          },
          output: {
            schema: z.array(z.object({
              text: z.string(),
              isContinuation: z.boolean().optional(),
            })),
          },
        });

        const enrichedItems = response.output as Array<{
          text: string;
          isContinuation?: boolean;
        }> | undefined;

        if (!enrichedItems || !Array.isArray(enrichedItems) || enrichedItems.length === 0) {
          throw new Error('Resposta de chunking inválida ou vazia');
        }

        // Valida e re-divide chunks que excedam o limite
        const validatedItems: Array<{
          text: string;
          isContinuation?: boolean;
          trailingSentence?: string;
        }> = [];
        for (const item of enrichedItems) {
          if (item.text.length > limit) {
            // Re-divide o chunk excedido e marca os sub-chunks como continuação
            const subChunks = splitTextProgrammatically(item.text, limit);
            for (let j = 0; j < subChunks.length; j++) {
              validatedItems.push({
                text: subChunks[j],
                isContinuation: j > 0 ? true : item.isContinuation,
                trailingSentence: extractTrailingSentence(subChunks[j]),
              });
            }
          } else {
            validatedItems.push({
              text: item.text,
              isContinuation: item.isContinuation,
              trailingSentence: extractTrailingSentence(item.text),
            });
          }
        }

        const finalItems = validatedItems.filter((item) => item.text.trim().length > 0);
        const finalChunks = finalItems.map((item) => item.text);

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

        log.info('Divisão concluída via Gemini', {
          uid,
          scriptLen: input.script.length,
          chunks: finalChunks.length,
          credits: finalCredits,
        });

        return {
          chunks: finalChunks,
          enrichedChunks: finalItems,
        };

      } catch (genErr) {
        const errorMessage = genErr instanceof Error ? genErr.message : 'Erro desconhecido';
        log.error('Falha no chunking via Gemini', { error: errorMessage });

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

        // Gera enrichedChunks básicos para o fallback (sem emotionTag do Gemini)
        const fallbackEnriched = fallbackChunks.map((text, idx) => ({
          text,
          isContinuation: idx > 0,
          trailingSentence: extractTrailingSentence(text),
        }));

        log.info('Fallback programático', {
          uid,
          scriptLen: input.script.length,
          chunks: fallbackChunks.length,
        });

        return {
          chunks: fallbackChunks,
          enrichedChunks: fallbackEnriched,
        };
      }
    },
  ),
);
