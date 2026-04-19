import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
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

// Validação de conexão com Firestore — executada de forma isolada, não no escopo do módulo
export async function testFirebaseConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log('Firebase connection successful.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. The client is offline or the config is incorrect.');
    }
    // Skip logging for other errors (like permission denied), as this is simply a connection test.
  }
}

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
