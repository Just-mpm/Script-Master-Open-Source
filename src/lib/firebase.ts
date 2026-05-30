import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth,
  connectAuthEmulator,
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
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getFirebaseEnvConfig, getRecaptchaSiteKey, getAppCheckDebugToken, getActiveEmulators } from './env';

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
const debugToken = getAppCheckDebugToken();
const shouldUseDebugAppCheck =
  import.meta.env.DEV &&
  (
    import.meta.env.VITE_USE_EMULATORS === 'true' ||
    debugToken !== undefined
  );

if (shouldUseDebugAppCheck) {
  // Desenvolvimento local: App Check em modo debug evita falhas de reCAPTCHA
  // em localhost e mantém o fluxo compatível com os emuladores.
  (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken ?? true;
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(GOOGLE_RECAPTCHA_TEST_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
} else if (recaptchaKey) {
  // Produção: App Check com reCAPTCHA v3
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaKey),
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

// ── Emuladores Firebase (desenvolvimento local) ─────────────────────────────
// Quando VITE_USE_EMULATORS=true, conecta SDKs aos emuladores locais.
// Flags individuais (VITE_EMULATOR_AUTH, VITE_EMULATOR_FIRESTORE, etc.)
// permitem selecionar quais emuladores conectar no frontend.
// Se nenhuma flag individual existir, conecta todos (backward compat).
// As Cloud Functions emuladas setam automaticamente as variáveis de ambiente
// FIRESTORE_EMULATOR_HOST, STORAGE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST
// para o firebase-admin (backend).

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  const active = getActiveEmulators();
  const connectAll = active.length === 0; // backward compat: sem flags → todos

  if (connectAll || active.includes('auth')) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  if (connectAll || active.includes('firestore')) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  if (connectAll || active.includes('storage')) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  if (connectAll || active.includes('functions')) {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
}

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, deleteUser, signOut, onAuthStateChanged };
export type { User };
