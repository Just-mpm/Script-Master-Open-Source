// ---------------------------------------------------------------------------
// Flow de teste de API key — valida a chave do Gemini do usuário (BYOK)
// ---------------------------------------------------------------------------
//
// Chamado pelo ProviderSettingsSection para validar a chave antes de salvar.
// Usa a chave recebida no providerAuth para fazer uma chamada mínima ao Gemini.
// Não persiste a chave, não armazena nada — apenas valida.
//
// A chave é passada via providerAuth e NUNCA é salva em Firestore, logs ou
// analytics. Logs usam apenas a versão mascarada (maskApiKeyForLog).
// ---------------------------------------------------------------------------

import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import {
  TestApiKeyInputSchema,
  TestApiKeyOutputSchema,
  type TestApiKeyInput,
  type TestApiKeyOutput,
} from '../genkit/schemas/common.js';
import { extractApiKey, withApiKey, maskApiKeyForLog } from '../genkit/utils/byok.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { createLogger } from '../genkit/utils/logger.js';

const log = createLogger('test-api-key');

/** Modelo leve usado apenas para validar que a key funciona */
const TEST_MODEL = 'googleai/gemini-3.1-flash-lite';

export const testApiKey = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'testApiKey',
      inputSchema: TestApiKeyInputSchema,
      outputSchema: TestApiKeyOutputSchema,
    },
    async (input: TestApiKeyInput, flowContext): Promise<TestApiKeyOutput> => {
      const uid = getCallableUidOrThrow(flowContext);
      const apiKey = extractApiKey(input);

      log.info('Testando API key', { uid, maskedKey: maskApiKeyForLog(apiKey) });

      try {
        // Chamada mínima ao Gemini para validar a key
        await ai.generate({
          model: TEST_MODEL,
          prompt: 'Reply with just "ok"',
          config: {
            ...withApiKey(apiKey),
            maxOutputTokens: 5,
            temperature: 0,
          },
        });

        log.info('API key válida', { uid, maskedKey: maskApiKeyForLog(apiKey) });
        return { valid: true, message: 'API key válida' };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn('API key inválida', {
          uid,
          maskedKey: maskApiKeyForLog(apiKey),
          error: message,
        });
        throw new HttpsError('invalid-argument', 'Chave de API inválida ou sem permissão.');
      }
    },
  ),
);
