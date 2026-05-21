import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import {
  AudioPreflightInputSchema,
  AudioPreflightOutputSchema,
  type AudioPreflightInput,
  type AudioPreflightOutput,
} from '../genkit/schemas/common.js';
import {
  buildAudioPreflightPlan,
  getCreditAvailabilitySnapshot,
  isRequestIdValid,
} from '../usage/index.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';

export const audioPreflight = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'audioPreflight',
      inputSchema: AudioPreflightInputSchema,
      outputSchema: AudioPreflightOutputSchema,
    },
    async (input: AudioPreflightInput, flowContext): Promise<AudioPreflightOutput> => {
      const uid = getCallableUidOrThrow(flowContext);

      if (process.env.OPEN_BETA_ENABLED !== 'true') {
        throw new HttpsError('unavailable', 'O beta aberto está temporariamente desabilitado. Tente novamente em breve.');
      }

      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }

      const db = getFirestore();
      const creditSnapshot = await getCreditAvailabilitySnapshot(db, uid);

      return buildAudioPreflightPlan(input, {
        availableCredits: creditSnapshot.availableCredits,
        unlimitedCredits: creditSnapshot.unlimitedCredits,
      });
    },
  ),
);
