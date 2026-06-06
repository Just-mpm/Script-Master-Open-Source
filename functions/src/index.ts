// ---------------------------------------------------------------------------
// Cloud Functions — Genkit Flows (BYOK)
// ---------------------------------------------------------------------------
//
// Funções Firebase v2 para IA via Genkit com BYOK (Bring Your Own Key).
// Cada flow recebe a API key do Gemini no payload e repassa ao modelo.
//
// Flows:
//   - ping: flow de teste — valida auth + App Check + Genkit
//   - assistant: chat principal com streaming
//   - inlineAssistant: reescrita de trechos de texto
//   - audio: geração de áudio TTS
//   - audioPreflight: validação técnica pré-geração
//   - cancelAiRequest: cancelamento de requisição em andamento
//   - images: geração de imagens
//   - scenePrompts: geração de prompts de cena
//   - chunking: divisão inteligente de scripts
//   - feedback: formulário de feedback
//   - testApiKey: validação da API key do usuário (BYOK)
// ---------------------------------------------------------------------------

import { initializeApp } from 'firebase-admin/app';
import { createLogger } from './genkit/utils/logger.js';

const log = createLogger('index');

// ---------------------------------------------------------------------------
// Service Account dedicada — menor privilégio (opcional)
// ---------------------------------------------------------------------------
//
// Por padrão as Cloud Functions usam a service account default do projeto
// (App Engine default service account). Se quiser usar uma service account
// dedicada de menor privilégio, importe `setGlobalOptions` de
// 'firebase-functions/v2/options' e configure:
//
//   setGlobalOptions({
//     serviceAccount: 'your-functions-sa@your-project.iam.gserviceaccount.com',
//   });
// ---------------------------------------------------------------------------

// Inicialização explícita do Firebase Admin SDK (necessário para Genkit flows)
initializeApp();

// ---------------------------------------------------------------------------
// Verificação de startup — App Check em produção
// ---------------------------------------------------------------------------

if (process.env.FUNCTIONS_EMULATOR !== 'true') {
  log.info('Ambiente de produção detectado. Verifique:');
  log.info('   → App Check habilitado no Console do Firebase?');
  log.info('   → VITE_RECAPTCHA_SITE_KEY configurada no frontend?');
  log.info('   → Sem App Check, todos os flows (audio, images, assistant, etc.) serão rejeitados.');
}

// ---------------------------------------------------------------------------
// Genkit Flows
// ---------------------------------------------------------------------------

export { ping } from './flows/ping.js';
export { assistant } from './flows/assistant.js';
export { inlineAssistant } from './flows/inline-assistant.js';
export { audio } from './flows/audio.js';
export { audioPreflight } from './flows/audio-preflight.js';
export { cancelAiRequest } from './flows/cancel-ai-request.js';
export { images } from './flows/images.js';
export { scenePrompts } from './flows/scene-prompts.js';
export { chunking } from './flows/chunking.js';
export { feedback } from './flows/feedback.js';
export { testApiKey } from './flows/test-api-key.js';
