// ---------------------------------------------------------------------------
// Flow de teste — Ping
// ---------------------------------------------------------------------------
//
// Flow mínimo para validar que o Genkit está funcionando corretamente
// no ambiente Cloud Functions, com autenticação e App Check ativos.
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//
// O flow retorna status, timestamp e o uid do usuário autenticado,
// confirmando que o pipeline completo (auth + Genkit + deploy) está ok.
// ---------------------------------------------------------------------------

import { z } from 'genkit';
import { onCallGenkit, isSignedIn } from 'firebase-functions/v2/https';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';

export const ping = onCallGenkit(
  {
    // Apenas usuários logados podem chamar este flow
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
      name: 'ping',
      inputSchema: z.object({
        // Mensagem opcional para ecoar de volta (validação de input)
        message: z.string().optional(),
      }),
      outputSchema: z.object({
        status: z.literal('ok'),
        timestamp: z.number(),
        uid: z.string(),
      }),
    },
    async (input, flowContext) => {
      const uid = getCallableUidOrThrow(flowContext);

      console.log(`[ping] Chamado por uid=${uid}, message=${input.message ?? '(vazia)'}`);

      return {
        status: 'ok' as const,
        timestamp: Date.now(),
        uid,
      };
    },
  ),
);
