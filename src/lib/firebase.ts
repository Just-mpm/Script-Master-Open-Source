import { initializeApp } from 'firebase/app';
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
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type User,
  type ActionCodeInfo,
  type ActionCodeSettings,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getFirebaseEnvConfig, getActiveEmulators } from './env';

const appletConfig = getFirebaseEnvConfig();

export const app = initializeApp(appletConfig);

// ── App Check movido para src/lib/app-check.ts (lazy loading) ─────────────
// Inicializado via ensureAppCheck() apenas quando um usuário autenticado é
// detectado pelo AuthProvider. Isso elimina o carregamento do reCAPTCHA v3
// (~729 KiB, ~720ms) em rotas públicas visitadas por usuários anônimos.

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

export {
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, deleteUser, signOut, onAuthStateChanged,
  applyActionCode, checkActionCode, verifyPasswordResetCode, confirmPasswordReset,
};
export type { User, ActionCodeInfo, ActionCodeSettings };
