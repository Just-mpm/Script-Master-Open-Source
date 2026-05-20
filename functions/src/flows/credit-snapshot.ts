import { z } from 'genkit';
import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import { CreditSnapshotOutputSchema, type CreditSnapshotOutput } from '../genkit/schemas/common.js';
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
    async (): Promise<CreditSnapshotOutput> => {
      const auth = ai.currentContext()?.auth;
      const uid = auth?.uid;

      if (!uid) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado');
      }

      const db = getFirestore();
      return getCreditAvailabilitySnapshot(db, uid);
    },
  ),
);
