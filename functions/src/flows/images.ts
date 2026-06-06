// ---------------------------------------------------------------------------
// Flow de geração de imagens — Gemini Image via Genkit (BYOK)
// ---------------------------------------------------------------------------
//
// Pipeline:
//   1. Valida autenticação (isSignedIn + App Check)
//   2. Extrai API key do usuário (BYOK)
//   3. Gera imagem com gemini-3.1-flash-image-preview
//   4. Extrai inlineData da resposta como base64
//   5. Retorna imagem como base64 + mimeType
//
// Suporta imagem de referência opcional (base64 data URL).
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
import { ImageInputSchema, ImageOutputSchema, ProviderAuthSchema } from '../genkit/schemas/common.js';
import {
  finishAiRequest,
  isRequestIdValid,
  startAiRequest,
  throwIfAiCancellationRequested,
} from '../usage/index.js';
import { extractApiKey, withApiKey } from '../genkit/utils/byok.js';
import { buildImageInstruction } from '../genkit/utils/assistant-context.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { createLogger } from '../genkit/utils/logger.js';

const log = createLogger('images');

/** Input schema estendido com providerAuth para BYOK */
const ImageInputByokSchema = ImageInputSchema.extend({
  providerAuth: ProviderAuthSchema.nullable().optional(),
});

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Modelo de geração de imagens */
const IMAGE_MODEL = 'googleai/gemini-3.1-flash-image-preview';

/** Tamanho máximo do data URL de referência (~10MB em base64) */
const MAX_REFERENCE_IMAGE_DATA_URL_LENGTH = 15_000_000;

/** Content types aceitos para imagem de referência */
const ALLOWED_REFERENCE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extrai a string base64 da imagem do Data URL retornado pelo Genkit.
 */
function extractBase64FromDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]*;base64,/, '');
}

function getDataUrlContentType(dataUrl: string): string {
  const match = /^data:([^;]+);base64,/.exec(dataUrl);
  return match?.[1] || 'image/jpeg';
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const images = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'images',
      inputSchema: ImageInputByokSchema,
      outputSchema: ImageOutputSchema,
    },
    async (input, flowContext) => {
      const uid = getCallableUidOrThrow(flowContext);
      const apiKey = extractApiKey(input);

      const db = getFirestore();
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId ?? randomUUID();
      const hasReference = !!(input.referenceImage && input.referenceImage.trim().length > 0);

      // Validação server-side da imagem de referência
      if (hasReference && input.referenceImage) {
        if (input.referenceImage.length > MAX_REFERENCE_IMAGE_DATA_URL_LENGTH) {
          throw new HttpsError(
            'invalid-argument',
            'Imagem de referência excede o tamanho máximo permitido.',
          );
        }

        const refContentType = getDataUrlContentType(input.referenceImage);
        if (!ALLOWED_REFERENCE_CONTENT_TYPES.has(refContentType)) {
          throw new HttpsError(
            'invalid-argument',
            `Content type da imagem de referência não suportado: ${refContentType}. Aceitos: jpeg, png, webp.`,
          );
        }
      }

      let requestStarted = false;

      try {
        await startAiRequest(db, uid, requestId, 'image');
        requestStarted = true;
        await throwIfAiCancellationRequested(db, uid, requestId);

        // ------------------------------------------------------------------
        // 1. Monta o prompt e conteúdos
        // ------------------------------------------------------------------
        const promptParts: Array<
          | { text: string }
          | { media: { url: string; contentType: string } }
        > = [{
          text: buildImageInstruction({
            prompt: input.prompt,
            aspectRatio: input.aspectRatio,
            hasReferenceImage: hasReference,
          }),
        }];

        if (hasReference && input.referenceImage) {
          promptParts.push({
            media: {
              url: input.referenceImage,
              contentType: getDataUrlContentType(input.referenceImage),
            },
          });
        }

        // ------------------------------------------------------------------
        // 2. Gera a imagem via Genkit
        // ------------------------------------------------------------------
        const response = await ai.generate({
          model: IMAGE_MODEL,
          prompt: promptParts,
          config: {
            ...withApiKey(apiKey),
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio: input.aspectRatio,
            },
            thinkingConfig: { thinkingLevel: 'high' },
          } as Record<string, unknown>,
        });
        await throwIfAiCancellationRequested(db, uid, requestId);

        const mediaUrl = response.media?.url;
        if (!mediaUrl) {
          throw new HttpsError(
            'internal',
            'Falha ao gerar imagem. O modelo não retornou dados.',
          );
        }

        const imageBase64 = extractBase64FromDataUrl(mediaUrl);

        if (!imageBase64 || imageBase64.trim().length === 0) {
          throw new HttpsError(
            'internal',
            'Falha ao gerar imagem. Dados da imagem vazios.',
          );
        }

        await finishAiRequest(db, uid, requestId, 'completed').catch((finishError: unknown) => {
          log.error('Falha ao finalizar ai_request com sucesso', {
            error: finishError instanceof Error ? finishError.message : 'desconhecido',
          });
        });

        log.info('Geração concluída', {
          uid,
          ratio: input.aspectRatio,
          tamanho: imageBase64.length,
          hasRef: hasReference,
        });

        return {
          imageBase64,
          mimeType: getDataUrlContentType(mediaUrl),
        };
      } catch (error) {
        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

        if (requestStarted) {
          await finishAiRequest(
            db,
            uid,
            requestId,
            error instanceof HttpsError && error.code === 'cancelled' ? 'cancelled' : 'failed',
            errorCode,
          ).catch((finishError: unknown) => {
            log.error('Falha ao finalizar ai_request com erro', {
              error: finishError instanceof Error ? finishError.message : 'desconhecido',
            });
          });
        }

        throw error;
      }
    },
  ),
);
