// ---------------------------------------------------------------------------
// Provider Settings — módulo BYOK (Bring Your Own Key)
// ---------------------------------------------------------------------------
//
// Ponto de entrada único para consumo do módulo de configuração de provedores.
// API keys são persistidas APENAS em IndexedDB (escopadas por uid).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type { AiProvider, ProviderAuth, ProviderSettings, ProviderSettingsRecord } from './types';

// ---------------------------------------------------------------------------
// Store (Zustand)
// ---------------------------------------------------------------------------
export { useProviderStore, maskApiKey } from './store/useProviderStore';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export { useProviderSettings } from './hooks/useProviderSettings';

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------
export { ProviderSettingsSection } from './components/ProviderSettingsSection';

// ---------------------------------------------------------------------------
// Utils (acesso ao ProviderAuth fora de componentes React)
// ---------------------------------------------------------------------------
export { getProviderAuthFromStore, hasProviderKey } from './utils';
