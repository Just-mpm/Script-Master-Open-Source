// ---------------------------------------------------------------------------
// Flow de geração de imagens — Gemini Image via Genkit
// ---------------------------------------------------------------------------
//
// Substitui a lógica client-side do useImageGenerator.ts e generateImageFromPrompt().
//
// Pipeline:
//   1. Valida autenticação (isSignedIn + App Check)
//   2. Gera imagem com gemini-3.1-flash-image-preview
//   3. Extrai inlineData da resposta como base64
//   4. Retorna imagem como base64 + mimeType
//
// Créditos gerenciados manualmente via withCreditMetering() para permitir
// cancelamento cooperativo e reconciliação consistente do requestId.
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
import { ImageInputSchema, ImageOutputSchema } from '../genkit/schemas/common.js';
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

/** Modelo de geração de imagens */
const IMAGE_MODEL = 'googleai/gemini-3.1-flash-image-preview';

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
      inputSchema: ImageInputSchema,
      outputSchema: ImageOutputSchema,
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
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId ?? randomUUID();
      const hasReference = !!(input.referenceImage && input.referenceImage.trim().length > 0);
      let requestStarted = false;
      let creditsSettled = false;
      let creditMeter: Awaited<ReturnType<typeof withCreditMetering>> | null = null;

      try {
        await startAiRequest(db, uid, requestId, 'image');
        requestStarted = true;
        await throwIfAiCancellationRequested(db, uid, requestId);

        creditMeter = await withCreditMetering(
          db,
          uid,
          requestId,
          'image',
          {
            prompt: input.prompt,
            referenceImage: hasReference ? 'true' : undefined,
          },
        );

        // ------------------------------------------------------------------
        // 1. Monta o prompt e conteúdos
        // ------------------------------------------------------------------
        const promptParts: Array<
          | { text: string }
          | { media: { url: string; contentType: string } }
        > = [{ text: input.prompt }];

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
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio: input.aspectRatio,
            },
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

        const finalCredits = calculateCreditCost({
          operationType: 'image',
          hasReferenceImage: hasReference,
        });

        await creditMeter.confirm({
          finalCredits,
          outputSize: imageBase64.length,
          model: IMAGE_MODEL,
        });
        creditsSettled = true;
        await finishAiRequest(db, uid, requestId, 'completed').catch((finishError: unknown) => {
          console.error(
            `[images] Falha ao finalizar ai_request com sucesso: ` +
            `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
          );
        });

        console.log(
          `[images] Geração concluída: uid=${uid} ratio=${input.aspectRatio} ` +
          `tamanho=${imageBase64.length}chars hasRef=${hasReference}`,
        );

        return {
          imageBase64,
          mimeType: 'image/png',
        };
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
              `[images] Falha ao finalizar ai_request com erro: ` +
              `${finishError instanceof Error ? finishError.message : 'desconhecido'}`,
            );
          });
        }

        throw error;
      }
    },
  ),
);
