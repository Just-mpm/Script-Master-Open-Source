// ---------------------------------------------------------------------------
// Tipos do módulo BYOK (Bring Your Own Key)
// ---------------------------------------------------------------------------
//
// Define provedores de IA suportados, autenticação e dados persistidos.
// A API key fica salva APENAS em IndexedDB — nunca em Firestore ou localStorage.
// ---------------------------------------------------------------------------

/** Provedores de IA suportados (inicialmente apenas Gemini) */
export type AiProvider = 'gemini';

/** Autenticação do provedor — enviada no payload de cada chamada de IA */
export interface ProviderAuth {
  provider: AiProvider;
  apiKey: string;
}

/** Registro persistido no IndexedDB (escopado por uid) */
export interface ProviderSettingsRecord {
  /** ID composto: `provider-settings:{uid}` */
  id: string;
  /** UID do usuário (para queries por index) */
  uid: string;
  provider: AiProvider;
  /** API key em texto plano — acessível apenas localmente */
  apiKey: string;
  /** API key mascarada para exibição na UI */
  maskedApiKey: string;
  /** Timestamp da última validação bem-sucedida */
  lastValidatedAt: number | null;
  updatedAt: number;
}

/** Dados persistidos localmente por usuário (view para a UI) */
export interface ProviderSettings {
  provider: AiProvider;
  /** API key mascarada para exibição na UI */
  maskedApiKey: string;
  /** Timestamp da última validação bem-sucedida */
  lastValidatedAt: number | null;
  updatedAt: number;
}
