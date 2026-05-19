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
// Créditos gerenciados pelo middleware credit-metering (ai.generateMiddleware).
//
// Suporta imagem de referência opcional (base64 data URL).
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//   - Região: southamerica-east1
// ---------------------------------------------------------------------------

import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { ai } from '../genkit/genkit.js';
import { ImageInputSchema, ImageOutputSchema } from '../genkit/schemas/common.js';
import { creditMeteringMiddleware } from '../genkit/middlewares/credit-metering.js';

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

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const images = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    enforceAppCheck: true,
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

      const hasReference = !!(input.referenceImage && input.referenceImage.trim().length > 0);

      // ------------------------------------------------------------------
      // 1. Monta o prompt e conteúdos
      // ------------------------------------------------------------------
      let effectivePrompt = input.prompt;

      // Se houver referência, incluímos a imagem inline no prompt.
      // O plugin googleAI detecta Data URLs no prompt e as trata como imagens inline.
      if (hasReference && input.referenceImage) {
        effectivePrompt = `${input.prompt}\n\n[Imagem de referência anexada para guiar o estilo visual]\nReferência: ${input.referenceImage}`;
      }

      // ------------------------------------------------------------------
      // 2. Gera a imagem via Genkit
      //
      // O middleware credit-metering gerencia automaticamente:
      //   - Estimativa de créditos pelo tamanho do prompt
      //   - Reserva antes da geração
      //   - Confirmação após sucesso
      //   - Reversão em caso de erro
      // ------------------------------------------------------------------
      const response = await ai.generate({
        model: IMAGE_MODEL,
        prompt: effectivePrompt,
        config: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: input.aspectRatio,
          },
        } as Record<string, unknown>,
        use: [creditMeteringMiddleware({ operationType: 'image', hasReferenceImage: hasReference })],
      });

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

      console.log(
        `[images] Geração concluída: uid=${uid} ratio=${input.aspectRatio} ` +
        `tamanho=${imageBase64.length}chars hasRef=${hasReference}`,
      );

      return {
        imageBase64,
        mimeType: 'image/png',
      };
    },
  ),
);
