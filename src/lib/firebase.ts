import { initializeApp } from 'firebase/app';
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
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFirebaseEnvConfig } from './env';

const appletConfig = getFirebaseEnvConfig();

const app = initializeApp(appletConfig);

export const auth = getAuth(app);
export const db = appletConfig.firestoreDatabaseId 
  ? getFirestore(app, appletConfig.firestoreDatabaseId)
  : getFirestore(app);

// Ativa persistência offline do Firestore (cache local via IndexedDB)
try {
  enableIndexedDbPersistence(db);
} catch {
  // Múltiplas abas ou browser sem suporte — fallback silencioso para cache em memória
}

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, deleteUser, signOut, onAuthStateChanged };
export type { User };
