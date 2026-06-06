// ---------------------------------------------------------------------------
// Utils para BYOK — acesso ao ProviderAuth fora de componentes React
// ---------------------------------------------------------------------------
//
// Permite que hooks e funções acessem o ProviderAuth do store Zustand
// sem precisar usar hooks React (útil em callbacks assíncronos).
// ---------------------------------------------------------------------------

import { useProviderStore } from './store/useProviderStore';
import type { ProviderAuth } from './types';

/**
 * Obtém o ProviderAuth atual do store.
 * Retorna null se não há chave configurada.
 * Use em callbacks onde não é possível usar hooks.
 */
export function getProviderAuthFromStore(): ProviderAuth | null {
  return useProviderStore.getState().getProviderAuth();
}

/**
 * Verifica se há uma chave de API configurada.
 */
export function hasProviderKey(): boolean {
  return useProviderStore.getState().hasApiKey();
}
