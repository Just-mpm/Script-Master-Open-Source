import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getApp } from 'firebase/app';
import { getRecaptchaSiteKey, getAppCheckDebugToken } from './env';
import { createLogger } from './logger';

const log = createLogger('app-check');

/**
 * Chave de teste pública do Google reCAPTCHA v3 para desenvolvimento local.
 * Fornecida oficialmente pelo Google para testes automatizados.
 * Ref: https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do
 *
 * Esta chave NUNCA deve ser usada em produção — ela sempre retorna tokens válidos.
 * Em produção, a chave real vem de VITE_RECAPTCHA_SITE_KEY no .env.
 */
const GOOGLE_RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

let initialized = false;

/**
 * Inicializa o Firebase App Check de forma lazy (preguiçosa).
 *
 * Chamado pelo AuthProvider SOMENTE quando um usuário autenticado é detectado.
 * Visitantes anônimos NÃO acionam esta função — eliminando o carregamento do
 * reCAPTCHA v3 (~729 KiB, ~720ms) na landing page e rotas públicas.
 *
 * É idempotente: múltiplas chamadas são seguras e retornam imediatamente.
 */
export async function ensureAppCheck(): Promise<void> {
  if (initialized) return;

  const app = getApp();

  const shouldUseDebugAppCheck =
    import.meta.env.DEV &&
    (
      import.meta.env.VITE_USE_EMULATORS === 'true' ||
      getAppCheckDebugToken() !== undefined
    );

  if (shouldUseDebugAppCheck) {
    // Desenvolvimento local: App Check em modo debug evita falhas de reCAPTCHA
    // em localhost e mantém o fluxo compatível com os emuladores.
    (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
      getAppCheckDebugToken() ?? true;
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(GOOGLE_RECAPTCHA_TEST_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    log.debug('App Check inicializado (modo debug)');
  } else {
    const recaptchaKey = getRecaptchaSiteKey();
    if (recaptchaKey) {
      // Produção: App Check com reCAPTCHA v3
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaKey),
        isTokenAutoRefreshEnabled: true,
      });
      log.debug('App Check inicializado (reCAPTCHA v3)');
    } else {
      // Sem chave reCAPTCHA em produção — Cloud Functions vão rejeitar requests.
      log.warn('App Check NÃO inicializado: chave reCAPTCHA ausente. Chamadas serverless podem falhar.');
    }
  }

  initialized = true;
}
