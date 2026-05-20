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
  | 'VITE_FIREBASE_FIRESTORE_DATABASE_ID'
  | 'VITE_STRIPE_PUBLISHABLE_KEY'
  | 'VITE_PEXELS_API_KEY'
  | 'VITE_BILLING_ENABLED'
  | 'VITE_OPEN_BETA_ENABLED'
  | 'VITE_APP_CHECK_DEBUG_TOKEN'
  | 'VITE_USE_EMULATORS';

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

/** Chave pública do Stripe (opcional — sem ela, o app funciona no plano Free) */
export function getStripePublishableKey(): string | undefined {
  return readOptionalEnv('VITE_STRIPE_PUBLISHABLE_KEY');
}

/** Modo de operação: billing habilitado (processamento Stripe ativo) */
export function isBillingEnabled(): boolean {
  return import.meta.env.VITE_BILLING_ENABLED === 'true';
}

/** Modo de operação: beta aberto com acesso gratuito */
export function isOpenBetaEnabled(): boolean {
  // Se não definida, default true (beta aberto)
  return (import.meta.env.VITE_OPEN_BETA_ENABLED as string) !== 'false';
}

/** Token de depuração do App Check (desenvolvimento apenas — nunca em produção) */
export function getAppCheckDebugToken(): string | undefined {
  return readOptionalEnv('VITE_APP_CHECK_DEBUG_TOKEN');
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
