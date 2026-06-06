// ---------------------------------------------------------------------------
// Flow utilitário de chunking — divisão inteligente de scripts com BYOK
// ---------------------------------------------------------------------------
//
// Pipeline:
//   1. Valida autenticação (isSignedIn + App Check)
//   2. Extrai API key do usuário (BYOK)
//   3. Se script <= limit: retorna array com 1 elemento
//   4. Se script > limit: usa builder TypeScript + structured output
//   5. Fallback: divisão programática por sentenças
//   6. Retorna array de strings (chunks) + enrichedChunks
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//   - Região: southamerica-east1
// ---------------------------------------------------------------------------

import { z } from 'genkit';
import { onCallGenkit, isSignedIn } from 'firebase-functions/v2/https';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import { ChunkingInputSchema, ChunkingOutputSchema, ProviderAuthSchema } from '../genkit/schemas/common.js';
import { extractApiKey, withApiKey } from '../genkit/utils/byok.js';
import { buildChunkingInstruction } from '../genkit/utils/assistant-context.js';
import { splitTextProgrammatically, extractTrailingSentence } from '../genkit/utils/chunking.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { createLogger } from '../genkit/utils/logger.js';

const log = createLogger('chunking');

/** Input schema estendido com providerAuth para BYOK */
const ChunkingInputByokSchema = ChunkingInputSchema.extend({
  providerAuth: ProviderAuthSchema.nullable().optional(),
});

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Modelo usado para chunking */
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
      inputSchema: ChunkingInputByokSchema,
      outputSchema: ChunkingOutputSchema,
    },
    async (input, flowContext) => {
      const uid = getCallableUidOrThrow(flowContext);
      const apiKey = extractApiKey(input);

      const limit = input.limit ?? DEFAULT_CHUNK_LIMIT;

      // ------------------------------------------------------------------
      // 1. Caso simples: script já está dentro do limite
      // ------------------------------------------------------------------
      if (input.script.length <= limit) {
        return { chunks: [input.script] };
      }

      // ------------------------------------------------------------------
      // 2. Chunking via builder TypeScript + structured output enriquecido
      // ------------------------------------------------------------------
      try {
        const response = await ai.generate({
          model: CHUNKING_MODEL,
          prompt: buildChunkingInstruction(input.script, limit),
          config: {
            ...withApiKey(apiKey),
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

        log.info('Divisão concluída via Gemini', {
          uid,
          scriptLen: input.script.length,
          chunks: finalChunks.length,
        });

        return {
          chunks: finalChunks,
          enrichedChunks: finalItems,
        };

      } catch (genErr) {
        const errorMessage = genErr instanceof Error ? genErr.message : 'Erro desconhecido';
        log.error('Falha no chunking via Gemini', { error: errorMessage });

        // ------------------------------------------------------------------
        // 3. Fallback programático
        // ------------------------------------------------------------------
        const fallbackChunks = splitTextProgrammatically(input.script, limit);

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
