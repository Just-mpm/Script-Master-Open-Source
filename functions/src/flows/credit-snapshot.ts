import { z } from 'genkit';
import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import { CreditSnapshotOutputSchema, type CreditSnapshotOutput } from '../genkit/schemas/common.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { getCreditAvailabilitySnapshot } from '../usage/index.js';

const CreditSnapshotInputSchema = z.object({});

export const creditSnapshot = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'creditSnapshot',
      inputSchema: CreditSnapshotInputSchema,
      outputSchema: CreditSnapshotOutputSchema,
    },
    async (_input, flowContext): Promise<CreditSnapshotOutput> => {
      const uid = getCallableUidOrThrow(flowContext);

      const db = getFirestore();

      try {
        const snapshot = await getCreditAvailabilitySnapshot(db, uid);
        return snapshot;
      } catch (err: unknown) {
        // Log detalhado para diagnóstico no Cloud Logging.
        // O framework do Firebase Functions mascara o erro para o cliente
        // como INTERNAL, mas o log fica disponível para debugging.
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error(
          `[creditSnapshot] Erro ao obter snapshot para uid=${uid}: ${message}`,
        );
        if (stack) {
          console.error(`[creditSnapshot] Stack trace:`, stack);
        }

        // Relança como HttpsError para preservar o código de status HTTP
        // (500 internal) e garantir que headers CORS sejam incluídos.
        throw new HttpsError('internal', 'Falha ao carregar saldo de créditos.', {
          message,
        });
      }
    },
  ),
);
