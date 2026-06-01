// ---------------------------------------------------------------------------
// Flow de Feedback com bônus de créditos
// ---------------------------------------------------------------------------
//
// Permite que usuários autenticados enviem feedback sobre o produto e,
// como incentivo, recebem um bônus único de 250 créditos.
//
// O bônus é concedido apenas UMA vez por usuário, controlado pelo campo
// `feedbackBonusGranted` no documento `beta_access/current` do Firestore.
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//
// Fluxo:
//   1. Valida entrada (texto mínimo de 10 caracteres)
//   2. Concede bônus de feedback via grantFeedbackBonus()
//   3. Retorna status do bônus + saldo atualizado de créditos
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
  grantFeedbackBonus,
  getOrCreateBetaAccess,
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

      // Instância do Firestore (admin já inicializado pelo index.ts)
      const db = getFirestore();

      // Gera requestId se não fornecido (para rastreamento e idempotência)
      // Valida requestId enviado pelo cliente (deve ser UUID v4)
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId || crypto.randomUUID();

      // Garante que o documento beta_access/current existe antes de conceder o bônus.
      // Se o usuário nunca usou IA, o documento pode não existir e a transação falharia.
      await getOrCreateBetaAccess(db, uid);

      // Concede o bônus de feedback (controla se já foi concedido antes)
      const bonusResult = await grantFeedbackBonus(db, uid, requestId);

      // Busca o saldo atualizado de créditos para retornar ao cliente
      const betaAccess = await getOrCreateBetaAccess(db, uid);

      log.info('Feedback recebido', { uid, category: input.category, bonusGranted: bonusResult.bonusGranted, availableCredits: betaAccess.availableCredits });

      return {
        success: true,
        bonusGranted: bonusResult.bonusGranted,
        availableCredits: betaAccess.availableCredits,
      };
    },
  ),
);
