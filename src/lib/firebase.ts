import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getFirebaseEnvConfig, getRecaptchaSiteKey } from './env';

const appletConfig = getFirebaseEnvConfig();

const app = initializeApp(appletConfig);

// ── App Check (protege funções Genkit contra abuso) ────────────────────────

/**
 * Chave de teste pública do Google reCAPTCHA v3 para desenvolvimento local.
 * Fornecida oficialmente pelo Google para testes automatizados.
 * Ref: https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do
 *
 * Esta chave NUNCA deve ser usada em produção — ela sempre retorna tokens válidos.
 * Em produção, a chave real vem de VITE_RECAPTCHA_SITE_KEY no .env.
 */
const GOOGLE_RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const recaptchaKey = getRecaptchaSiteKey();

if (recaptchaKey) {
  // Produção: App Check com reCAPTCHA v3
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (import.meta.env.DEV) {
  // Desenvolvimento: modo debug gera token local (console do Firebase)
  (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(GOOGLE_RECAPTCHA_TEST_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
// Se não for DEV e não tiver chave, App Check fica desabilitado.
// As Cloud Functions vão rejeitar requests sem token válido nesse caso.

export const auth = getAuth(app);
export const db = appletConfig.firestoreDatabaseId
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    }, appletConfig.firestoreDatabaseId)
  : initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });

export const storage = getStorage(app);
export const functions = getFunctions(app, 'southamerica-east1');
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, deleteUser, signOut, onAuthStateChanged };
export type { User };
