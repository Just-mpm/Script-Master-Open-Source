import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFirebaseEnvConfig } from './env';

const appletConfig = getFirebaseEnvConfig();

const app = initializeApp(appletConfig);

export const auth = getAuth(app);
export const db = appletConfig.firestoreDatabaseId 
  ? getFirestore(app, appletConfig.firestoreDatabaseId)
  : getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged };
export type { User };
