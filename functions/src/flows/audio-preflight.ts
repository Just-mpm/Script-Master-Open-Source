import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import {
  AudioPreflightInputSchema,
  type AudioPreflightInput,
  type AudioPreflightOutput,
} from '../genkit/schemas/common.js';
import {
  buildAudioPreflightPlan,
  getCreditAvailabilitySnapshot,
  isRequestIdValid,
} from '../usage/index.js';

export const audioPreflight = onCall(
  {
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  async (request): Promise<AudioPreflightOutput> => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'A solicitação deve ser feita por um usuário autenticado.');
    }

    const parsedInput = AudioPreflightInputSchema.safeParse(request.data);
    if (!parsedInput.success) {
      throw new HttpsError('invalid-argument', 'Dados inválidos para a prévia de áudio.', parsedInput.error.flatten());
    }

    const uid = request.auth.uid;
    const input: AudioPreflightInput = parsedInput.data;

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
);
