// ---------------------------------------------------------------------------
// Flow de Feedback
// ---------------------------------------------------------------------------
//
// Permite que usuários autenticados enviem feedback sobre o produto.
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//
// Fluxo:
//   1. Valida entrada (texto mínimo de 10 caracteres, categoria obrigatória)
//   2. Salva feedback no Firestore
//   3. Retorna status de sucesso
// ---------------------------------------------------------------------------

import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import {
  FeedbackInputSchema,
  FeedbackOutputSchema,
} from '../genkit/schemas/common.js';
import {
  isRequestIdValid,
} from '../usage/index.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { createLogger } from '../genkit/utils/logger.js';

const log = createLogger('feedback');

/** Comprimento mínimo do texto de feedback para evitar abuso trivial */
const MIN_TEXT_LENGTH = 10;

export const feedback = onCallGenkit(
  {
    // Apenas usuários logados podem enviar feedback
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    // Exige token válido do App Check (protege contra abuso)
    enforceAppCheck: true,
    invoker: 'public',
    // Mesma região do frontend e das demais functions
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'feedback',
      inputSchema: FeedbackInputSchema,
      outputSchema: FeedbackOutputSchema,
    },
    async (input, flowContext) => {
      const uid = getCallableUidOrThrow(flowContext);

      // Validação de negócio: texto mínimo para evitar abuso trivial
      if (!input.text || input.text.trim().length < MIN_TEXT_LENGTH) {
        throw new HttpsError(
          'invalid-argument',
          `O texto do feedback deve ter no mínimo ${MIN_TEXT_LENGTH} caracteres`,
        );
      }

      if (!input.category || input.category.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'A categoria do feedback é obrigatória');
      }

      const db = getFirestore();

      // Valida requestId enviado pelo cliente (deve ser UUID v4)
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId || crypto.randomUUID();

      // Salva o feedback no Firestore
      await db.collection('feedback').add({
        userId: uid,
        category: input.category,
        text: input.text,
        screenContext: input.screenContext ?? null,
        requestId,
        createdAt: Date.now(),
      });

      log.info('Feedback recebido', { uid, category: input.category });

      return {
        success: true,
      };
    },
  ),
);
