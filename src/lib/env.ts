export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

type RequiredEnvName =
  | 'VITE_GEMINI_API_KEY'
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'
  | 'VITE_FIREBASE_APP_ID';

function readRequiredEnv(name: RequiredEnvName): string {
  const value = import.meta.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}.`);
  }

  return value;
}

function readOptionalEnv(name: 'VITE_FIREBASE_MEASUREMENT_ID' | 'VITE_FIREBASE_FIRESTORE_DATABASE_ID'): string | undefined {
  const value = import.meta.env[name];

  return value && value.trim().length > 0 ? value : undefined;
}

export function getGeminiApiKey(): string {
  return readRequiredEnv('VITE_GEMINI_API_KEY');
}

export function getFirebaseEnvConfig(): FirebaseEnvConfig {
  return {
    apiKey: readRequiredEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readRequiredEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readRequiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readRequiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readRequiredEnv('VITE_FIREBASE_APP_ID'),
    measurementId: readOptionalEnv('VITE_FIREBASE_MEASUREMENT_ID'),
    firestoreDatabaseId: readOptionalEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID'),
  };
}
