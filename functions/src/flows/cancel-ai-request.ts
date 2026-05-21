import { z } from 'genkit';
import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import { isRequestIdValid, requestAiCancellation } from '../usage/index.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';

const CancelAiRequestInputSchema = z.object({
  requestId: z.string(),
});

const CancelAiRequestOutputSchema = z.object({
  success: z.boolean(),
});

export const cancelAiRequest = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'cancelAiRequest',
      inputSchema: CancelAiRequestInputSchema,
      outputSchema: CancelAiRequestOutputSchema,
    },
    async (input, flowContext) => {
      const uid = getCallableUidOrThrow(flowContext);

      if (!isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }

      const db = getFirestore();
      const success = await requestAiCancellation(db, uid, input.requestId);
      return { success };
    },
  ),
);
