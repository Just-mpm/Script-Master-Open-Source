interface FirebaseEnvConfig {
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
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'
  | 'VITE_FIREBASE_APP_ID';

/** Nomes de env vars opcionais com tipagem */
type OptionalEnvName =
  | 'VITE_RECAPTCHA_SITE_KEY'
  | 'VITE_FIREBASE_MEASUREMENT_ID'
  | 'VITE_FIREBASE_ANALYTICS_ENABLED'
  | 'VITE_FIREBASE_FIRESTORE_DATABASE_ID'
  | 'VITE_PEXELS_API_KEY'
  | 'VITE_APP_CHECK_DEBUG_TOKEN'
  | 'VITE_USE_EMULATORS'
  | 'VITE_EMULATOR_AUTH'
  | 'VITE_EMULATOR_FIRESTORE'
  | 'VITE_EMULATOR_STORAGE'
  | 'VITE_EMULATOR_FUNCTIONS'
  | 'VITE_EMULATOR_HOSTING'
  | 'VITE_EMULATOR_UI';

function readRequiredEnv(name: RequiredEnvName): string {
  const value = import.meta.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}.`);
  }

  return value;
}

function readOptionalEnv(name: OptionalEnvName): string | undefined {
  const value = import.meta.env[name];

  return value && value.trim().length > 0 ? value : undefined;
}

/** Chave do site reCAPTCHA v3 para App Check (obrigatória em produção — sem ela, App Check não inicializa e chamadas httpsCallable falham) */
export function getRecaptchaSiteKey(): string | undefined {
  return readOptionalEnv('VITE_RECAPTCHA_SITE_KEY');
}

/** Chave da API Pexels (opcional — sem ela, stock media usa placeholder local) */
export function getPexelsApiKey(): string | undefined {
  return readOptionalEnv('VITE_PEXELS_API_KEY');
}

/** Token de depuração do App Check (desenvolvimento apenas — nunca em produção) */
export function getAppCheckDebugToken(): string | undefined {
  return readOptionalEnv('VITE_APP_CHECK_DEBUG_TOKEN');
}

// ── Emuladores Firebase (seletivos) ─────────────────────────────────────────

/** Tipo que representa os emuladores Firebase disponíveis */
export type EmulatorName = 'auth' | 'firestore' | 'storage' | 'functions' | 'hosting' | 'ui';

/** Mapa de nome do emulador → chave VITE no .env */
const EMULATOR_ENV_MAP: Record<EmulatorName, OptionalEnvName> = {
  auth: 'VITE_EMULATOR_AUTH',
  firestore: 'VITE_EMULATOR_FIRESTORE',
  storage: 'VITE_EMULATOR_STORAGE',
  functions: 'VITE_EMULATOR_FUNCTIONS',
  hosting: 'VITE_EMULATOR_HOSTING',
  ui: 'VITE_EMULATOR_UI',
};

/**
 * Verifica se um emulador específico está habilitado via .env.
 * Retorna `true` se a flag VITE_EMULATOR_* for 'true'.
 */
export function isEmulatorEnabled(emulator: EmulatorName): boolean {
  return import.meta.env[EMULATOR_ENV_MAP[emulator]] === 'true';
}

/**
 * Retorna a lista de emuladores ativos no .env.
 * Útil para lógica condicional no frontend (ex: conectar apenas alguns SDKs).
 */
export function getActiveEmulators(): EmulatorName[] {
  const names: EmulatorName[] = ['auth', 'firestore', 'storage', 'functions', 'hosting', 'ui'];
  return names.filter((name) => isEmulatorEnabled(name));
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

/** Analytics fica ativo por padrão apenas em produção. */
export function isFirebaseAnalyticsEnabled(): boolean {
  const configured = readOptionalEnv('VITE_FIREBASE_ANALYTICS_ENABLED');
  return configured === undefined ? import.meta.env.PROD : configured === 'true';
}
