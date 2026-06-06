// ---------------------------------------------------------------------------
// useProviderSettings — hook de fachada para componentes consumirem BYOK
// ---------------------------------------------------------------------------
//
// Expõe o estado da store + ações com interface amigável para componentes.
// Recebe `uid` via parâmetro ou automaticamente de `useAuth()`.
// Carrega automaticamente na montagem se uid estiver disponível.
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useProviderStore } from '../store/useProviderStore';
import type { ProviderAuth } from '../types';

interface UseProviderSettingsReturn {
  /** API key mascarada para exibição na UI */
  maskedApiKey: string | null;
  /** Provedor ativo */
  provider: string | null;
  /** Timestamp da última validação */
  lastValidatedAt: number | null;
  /** Carregando dados */
  loading: boolean;
  /** Erro na última operação */
  error: string | null;
  /** Se há API key configurada */
  hasKey: boolean;
  /** Salva nova API key */
  saveKey: (apiKey: string) => Promise<void>;
  /** Remove API key configurada */
  removeKey: () => Promise<void>;
  /** Retorna autenticação para enviar no payload */
  getProviderAuth: () => ProviderAuth | null;
}

export function useProviderSettings(): UseProviderSettingsReturn {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const provider = useProviderStore((s) => s.provider);
  const maskedApiKey = useProviderStore((s) => s.maskedApiKey);
  const lastValidatedAt = useProviderStore((s) => s.lastValidatedAt);
  const loading = useProviderStore((s) => s.loading);
  const error = useProviderStore((s) => s.error);
  const currentUid = useProviderStore((s) => s.currentUid);
  // Seleciona _apiKey diretamente para que hasKey reaja a mudanças
  const internalKey = useProviderStore((s) => s._apiKey);

  const loadProviderSettings = useProviderStore((s) => s.loadProviderSettings);
  const saveApiKey = useProviderStore((s) => s.saveApiKey);
  const removeApiKey = useProviderStore((s) => s.removeApiKey);
  const getProviderAuth = useProviderStore((s) => s.getProviderAuth);
  const reset = useProviderStore((s) => s.reset);

  // Carrega do IndexedDB quando uid muda
  useEffect(() => {
    if (uid && uid !== currentUid) {
      void loadProviderSettings(uid);
    } else if (!uid && currentUid) {
      // Logout — limpa estado
      reset();
    }
  }, [uid, currentUid, loadProviderSettings, reset]);

  const saveKey = useCallback(
    async (apiKey: string) => {
      if (!uid) return;
      await saveApiKey(uid, apiKey);
    },
    [uid, saveApiKey],
  );

  const removeKey = useCallback(async () => {
    if (!uid) return;
    await removeApiKey(uid);
  }, [uid, removeApiKey]);

  const hasKey = internalKey !== null && internalKey.length > 0;

  return {
    maskedApiKey,
    provider,
    lastValidatedAt,
    loading,
    error,
    hasKey,
    saveKey,
    removeKey,
    getProviderAuth,
  };
}
