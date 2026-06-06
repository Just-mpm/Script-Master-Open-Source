// ---------------------------------------------------------------------------
// useProviderStore — estado global de provider settings (Zustand + IndexedDB)
// ---------------------------------------------------------------------------
//
// Gerencia a API key do provedor de IA do usuário (BYOK).
// A key é persistida APENAS em IndexedDB, escopada por uid.
// Nunca salva em Firestore ou localStorage.
//
// Fluxo:
// 1. loadProviderSettings(uid) — carrega do IndexedDB na inicialização
// 2. saveApiKey(uid, key) — salva no IndexedDB, atualiza estado em memória
// 3. getProviderAuth() — retorna { provider, apiKey } para enviar ao backend
// 4. removeApiKey(uid) — remove do IndexedDB e limpa estado
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { createLogger } from '../../../lib/logger';
import {
  getIndexedDbItem,
  putIndexedDbItem,
  deleteIndexedDbItem,
  PROVIDER_SETTINGS_STORE,
} from '../../../lib/db/shared';
import type { AiProvider, ProviderAuth, ProviderSettingsRecord } from '../types';

const log = createLogger('provider-settings');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Gera o ID do registro IndexedDB a partir do uid */
function buildRecordId(uid: string): string {
  return `provider-settings:${uid}`;
}

/**
 * Mascara a API key para exibição na UI.
 * Mostra primeiros 4 e últimos 4 caracteres: `AIza...xyz1`
 * Keys curtas (<8 chars) mostram apenas os primeiros 4 com reticências.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return `${key.slice(0, 4)}...`;
  }
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Estado da store
// ---------------------------------------------------------------------------

interface ProviderState {
  /** Provedor ativo (null = nenhum configurado) */
  provider: AiProvider | null;
  /** API key mascarada para exibição */
  maskedApiKey: string | null;
  /** Timestamp da última validação bem-sucedida */
  lastValidatedAt: number | null;
  /** Carregando dados do IndexedDB */
  loading: boolean;
  /** Erro na última operação */
  error: string | null;
  /** UID atualmente carregado (para detectar mudança de conta) */
  currentUid: string | null;
  /** API key em memória (NÃO persistida no Zustand — só existe em runtime) */
  _apiKey: string | null;
}

interface ProviderActions {
  /** Carrega configurações do IndexedDB para o uid informado */
  loadProviderSettings: (uid: string) => Promise<void>;
  /** Salva uma nova API key no IndexedDB e atualiza o estado */
  saveApiKey: (uid: string, apiKey: string) => Promise<void>;
  /** Remove a API key do IndexedDB e limpa o estado */
  removeApiKey: (uid: string) => Promise<void>;
  /** Retorna o objeto de autenticação para enviar no payload de chamadas de IA */
  getProviderAuth: () => ProviderAuth | null;
  /** Verifica se há API key configurada */
  hasApiKey: () => boolean;
  /** Reseta o estado (logout / troca de conta) */
  reset: () => void;
}

type ProviderStore = ProviderState & ProviderActions;

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

const initialState: ProviderState = {
  provider: null,
  maskedApiKey: null,
  lastValidatedAt: null,
  loading: false,
  error: null,
  currentUid: null,
  _apiKey: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProviderStore = create<ProviderStore>((set, get) => ({
  ...initialState,

  loadProviderSettings: async (uid: string) => {
    const { currentUid } = get();

    // Se uid mudou (logout/troca), limpa estado antes de carregar
    if (currentUid !== null && currentUid !== uid) {
      set(initialState);
    }

    set({ loading: true, error: null, currentUid: uid });

    try {
      const recordId = buildRecordId(uid);
      const record = await getIndexedDbItem<ProviderSettingsRecord>(
        PROVIDER_SETTINGS_STORE,
        recordId,
      );

      if (record) {
        set({
          provider: record.provider,
          maskedApiKey: record.maskedApiKey,
          lastValidatedAt: record.lastValidatedAt,
          _apiKey: record.apiKey,
          loading: false,
        });
        log.info('Provider settings carregado do IndexedDB');
      } else {
        // Sem registro = sem API key configurada (estado válido)
        set({ loading: false });
        log.info('Nenhum provider settings encontrado — sem API key configurada');
      }
    } catch (error) {
      log.error('Erro ao carregar provider settings do IndexedDB', { error });
      set({
        ...initialState,
        currentUid: uid,
        loading: false,
        error: 'Erro ao carregar configurações do provedor',
      });
    }
  },

  saveApiKey: async (uid: string, apiKey: string) => {
    set({ loading: true, error: null });

    try {
      const now = Date.now();
      const masked = maskApiKey(apiKey);
      const recordId = buildRecordId(uid);

      const record: ProviderSettingsRecord = {
        id: recordId,
        uid,
        provider: 'gemini',
        apiKey,
        maskedApiKey: masked,
        lastValidatedAt: null,
        updatedAt: now,
      };

      await putIndexedDbItem(PROVIDER_SETTINGS_STORE, record);

      set({
        provider: 'gemini',
        maskedApiKey: masked,
        lastValidatedAt: null,
        _apiKey: apiKey,
        currentUid: uid,
        loading: false,
      });

      log.info('API key salva no IndexedDB', { masked });
    } catch (error) {
      log.error('Erro ao salvar API key no IndexedDB', { error });
      set({
        loading: false,
        error: 'Erro ao salvar API key',
      });
    }
  },

  removeApiKey: async (uid: string) => {
    set({ loading: true, error: null });

    try {
      const recordId = buildRecordId(uid);
      await deleteIndexedDbItem(PROVIDER_SETTINGS_STORE, recordId);

      set({
        ...initialState,
        currentUid: uid,
      });

      log.info('API key removida do IndexedDB');
    } catch (error) {
      log.error('Erro ao remover API key do IndexedDB', { error });
      set({
        loading: false,
        error: 'Erro ao remover API key',
      });
    }
  },

  getProviderAuth: () => {
    const { provider, _apiKey } = get();

    if (!provider || !_apiKey) {
      return null;
    }

    return { provider, apiKey: _apiKey };
  },

  hasApiKey: () => {
    return get()._apiKey !== null;
  },

  reset: () => {
    set(initialState);
  },
}));
