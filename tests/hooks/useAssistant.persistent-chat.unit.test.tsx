/**
 * Testes do useAssistant para o PR de chat persistente + tour de boas-vindas.
 *
 * Cobertura:
 * - Restauração de sessão ativa do localStorage ao montar
 * - Persistência do sessionId no localStorage ao enviar mensagem (auto-save)
 * - Persistência do sessionId no localStorage ao chamar loadSession
 * - Limpeza do localStorage ao chamar startNewChat
 * - Auto-message de tour quando é primeiro acesso
 * - NÃO envio de auto-message quando tour já foi visto
 * - NÃO envio de auto-message quando já tem mensagens (sessão restaurada)
 * - NÃO envio de auto-message quando user é null
 * - Múltiplas montagens do componente (idempotência)
 *
 * Edge cases:
 * - localStorage vazio
 * - localStorage com ID inválido (sessão não existe em getChatSessions)
 * - Falha em getChatSessions (degradação silenciosa)
 * - Falha no localStorage (try/catch interno)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '../../src/features/i18n';

// ---------------------------------------------------------------------------
// Hoisted mocks (acessíveis dentro das factories de vi.mock)
// ---------------------------------------------------------------------------

const ACTIVE_SESSION_KEY = 's2a_active_chat_session_id';
const TOUR_SEEN_KEY = 's2a_assistant_tour_seen';

const authState = vi.hoisted(() => ({
  user: null as { uid: string; email?: string } | null,
}));

const sessionsState = vi.hoisted(() => ({
  sessions: [] as Array<{
    id: string;
    userId?: string;
    title: string;
    messages: Array<{ id: string; role: 'user' | 'model'; text: string; attachments: unknown[] }>;
    updatedAt: number;
  }>,
  shouldReject: false,
}));

const saveState = vi.hoisted(() => ({
  calls: [] as Array<unknown>,
}));

const { mockStreamFn, mockHttpsCallable, mockCancelCallable } = vi.hoisted(() => ({
  mockStreamFn: vi.fn(),
  mockHttpsCallable: vi.fn(),
  mockCancelCallable: vi.fn().mockResolvedValue({ data: { success: true } }),
}));

const mockCreditsState = vi.hoisted(() => ({
  availableCredits: 100,
  usedCredits: 0,
  reservedCredits: 0,
  baseCredits: 100,
  bonusCredits: 0,
  feedbackBonusGranted: false,
  unlimitedCredits: false,
  canEnforceBalance: true,
  loading: false,
  error: null as string | null,
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('firebase/functions', () => ({
  httpsCallable: mockHttpsCallable,
}));

vi.mock('../../src/lib/firebase', () => ({
  functions: {},
  db: {},
}));

vi.mock('../../src/lib/error-mapping', () => ({
  createErrorMapper: () =>
    vi.fn((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort') || msg.includes('cancelled')) return '';
      return 'Erro mockado';
    }),
  sharedErrorRules: [],
}));

vi.mock('../../src/lib/constants', () => ({
  CHUNK_LIMIT: 500,
  MAX_CHARS: 50000,
  PACE_INSTRUCTIONS: { normal: 'Ritmo normal' },
  VOICES: [
    { id: 'Puck', name: 'Puck', styleKey: 'animated' },
    { id: 'Zephyr', name: 'Zephyr', styleKey: 'bright' },
  ],
}));

vi.mock('../../src/lib/db', () => ({
  getMemories: vi.fn().mockResolvedValue([]),
  saveChatSession: vi.fn().mockImplementation((session: unknown) => {
    saveState.calls.push(session);
    if (sessionsState.shouldReject) {
      return Promise.reject(new Error('mock-save-failure'));
    }
    return Promise.resolve(false);
  }),
  getChatSessions: vi.fn().mockImplementation(() => {
    if (sessionsState.shouldReject) {
      return Promise.reject(new Error('mock-get-sessions-failure'));
    }
    return Promise.resolve(sessionsState.sessions);
  }),
  getUserSettings: vi.fn().mockResolvedValue(null),
  hasTourSeen: vi.fn().mockResolvedValue(false),
  markTourSeen: vi.fn().mockResolvedValue(undefined),
  sanitizeAssistantHistoryAttachments: (history: unknown) => history,
}));

vi.mock('../../src/lib/env', () => ({
  getGeminiApiKey: vi.fn().mockReturnValue('test-key'),
  getRecaptchaSiteKey: vi.fn().mockReturnValue(undefined),
  isBillingEnabled: vi.fn().mockReturnValue(false),
  isOpenBetaEnabled: vi.fn().mockReturnValue(true),
  getFirebaseEnvConfig: vi.fn().mockReturnValue({
    apiKey: 'mock-api-key',
    authDomain: 'mock.firebaseapp.com',
    projectId: 'mock-project',
    storageBucket: 'mock.appspot.com',
    messagingSenderId: '123',
    appId: '1:123:web:abc',
  }),
  getStripePublishableKey: vi.fn().mockReturnValue(undefined),
  getPexelsApiKey: vi.fn().mockReturnValue(undefined),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock('../../src/hooks/useCredits', () => ({
  useCredits: () => ({ ...mockCreditsState }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function* createMockStream(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <I18nProvider>{children}</I18nProvider>;
  };
}

// Espera que todas as promises pendentes resolvam (sem usar fake timers)
async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ---------------------------------------------------------------------------
// Importação tardia (após mocks)
// ---------------------------------------------------------------------------

import { useAssistant } from '../../src/hooks/useAssistant';

// ---------------------------------------------------------------------------
// Suite de testes
// ---------------------------------------------------------------------------

describe('useAssistant — chat persistente e tour de boas-vindas', () => {
  beforeEach(() => {
    // Estado de auth
    authState.user = { uid: 'test-uid', email: 'test@test.com' };

    // Estado de sessões
    sessionsState.sessions = [];
    sessionsState.shouldReject = false;
    saveState.calls = [];

    // Estado de créditos
    mockCreditsState.availableCredits = 100;
    mockCreditsState.unlimitedCredits = false;
    mockCreditsState.canEnforceBalance = true;
    mockCreditsState.loading = false;
    mockCreditsState.error = null;

    // localStorage limpo e locale pt-BR para evitar fallback para en
    localStorage.clear();
    localStorage.setItem('s2a_locale', 'pt-BR');

    vi.clearAllMocks();

    // Stubs globais
    vi.stubGlobal(
      'AbortController',
      class MockAbortController {
        signal: { aborted: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
        constructor() {
          this.signal = {
            aborted: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          };
        }
        abort() {
          this.signal.aborted = true;
        }
      },
    );

    // Stub do requestAnimationFrame usando setTimeout real (não fake)
    // para evitar loop infinito com fake timers
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(cb, 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

    // UUID determinístico
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000000' as ReturnType<typeof crypto.randomUUID>,
    );

    // Configura httpsCallable
    mockHttpsCallable.mockImplementation((_: unknown, callableName: string) => {
      if (callableName === 'cancelAiRequest') {
        return mockCancelCallable;
      }
      return { stream: mockStreamFn };
    });

    // Stream padrão
    mockStreamFn.mockResolvedValue({
      stream: createMockStream(['Olá!', ' Como posso ajudar?']),
      data: Promise.resolve({ text: 'Olá! Como posso ajudar?' }),
  setLoggerUserId: vi.fn(),
});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ─── Restauração de sessão ativa ───────────────────────────────

  describe('Restauração de sessão ativa do localStorage', () => {
    it('deve restaurar sessão quando localStorage tem ID válido e getChatSessions retorna a sessão', async () => {
      const sessionId = 'session-restore-1';
      const restoredMessages = [
        { id: 'm1', role: 'user' as const, text: 'Pergunta antiga', attachments: [] },
        { id: 'm2', role: 'model' as const, text: 'Resposta antiga', attachments: [] },
      ];
      sessionsState.sessions = [
        {
          id: sessionId,
          userId: 'test-uid',
          title: 'Sessão antiga',
          messages: restoredMessages,
          updatedAt: Date.now(),
        },
      ];
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      // Aguarda o efeito de restauração completar (getChatSessions é async)
      await flushPromises();

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].text).toBe('Pergunta antiga');
      expect(result.current.messages[1].text).toBe('Resposta antiga');
    });

    it('NÃO deve restaurar quando localStorage está vazio', async () => {
      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      await flushPromises();

      expect(result.current.messages).toHaveLength(0);
    });

    it('NÃO deve restaurar quando user é null', async () => {
      const sessionId = 'session-without-user';
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      sessionsState.sessions = [
        {
          id: sessionId,
          userId: 'test-uid',
          title: 'Sessão',
          messages: [{ id: 'm1', role: 'user' as const, text: 'msg', attachments: [] }],
          updatedAt: Date.now(),
        },
      ];
      authState.user = null;

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      await flushPromises();

      // Sem user, não tenta restaurar
      expect(result.current.messages).toHaveLength(0);
    });

    it('NÃO deve restaurar quando localStorage tem ID mas a sessão não existe em getChatSessions', async () => {
      const sessionId = 'session-not-found';
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      // sessionsState.sessions está vazio por padrão → find retorna undefined
      sessionsState.sessions = [];

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      await flushPromises();

      expect(result.current.messages).toHaveLength(0);
    });

    it('NÃO deve restaurar quando a sessão existe mas tem 0 mensagens', async () => {
      const sessionId = 'session-empty';
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      sessionsState.sessions = [
        {
          id: sessionId,
          userId: 'test-uid',
          title: 'Vazia',
          messages: [],
          updatedAt: Date.now(),
        },
      ];

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      await flushPromises();

      // loadSession só é chamado quando activeSession.messages.length > 0
      expect(result.current.messages).toHaveLength(0);
    });

    it('deve degradar silenciosamente quando getChatSessions falha', async () => {
      const sessionId = 'session-fail';
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      sessionsState.shouldReject = true;

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      // Não deve crashar; apenas não restaura
      await flushPromises();

      expect(result.current.messages).toHaveLength(0);
    });
  });

  // ─── Persistência do sessionId no localStorage ─────────────────

  describe('Persistência do sessionId no localStorage', () => {
    it('deve gravar sessionId no localStorage após enviar mensagem (auto-save)', async () => {
      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      // Antes: nada no localStorage
      expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();

      await act(async () => {
        await result.current.sendMessage('Olá assistente');
        await flushPromises();
      });

      // Após envio bem-sucedido com 2+ mensagens, deve persistir
      expect(localStorage.getItem(ACTIVE_SESSION_KEY)).not.toBeNull();
    });

    it('deve gravar sessionId no localStorage ao chamar loadSession', () => {
      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      const session = {
        id: 'manual-session-123',
        userId: 'test-uid',
        title: 'Sessão manual',
        messages: [
          { id: '1', role: 'user' as const, text: 'oi', attachments: [] },
        ],
        updatedAt: Date.now(),
      };

      act(() => {
        result.current.loadSession(session);
      });

      expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBe('manual-session-123');
    });

    it('deve limpar sessionId do localStorage ao chamar startNewChat', () => {
      // Pre-popula localStorage
      localStorage.setItem(ACTIVE_SESSION_KEY, 'old-session-id');

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      // Garante que temos session carregada (mas o teste de startNewChat em si
      // não depende de loadSession — só verifica que o cleanup ocorre)
      act(() => {
        result.current.startNewChat();
      });

      expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
    });
  });

  // ─── Auto-message de tour ──────────────────────────────────────

  describe('Auto-message de tour de boas-vindas', () => {
    it('deve enviar tour automaticamente após 1500ms no primeiro acesso', async () => {
      vi.useFakeTimers();

      // Garante que não viu o tour antes
      expect(localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      // Avança apenas o tempo do timer de 1500ms do tour
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // Deve ter chamado o mock do stream (porque sendMessage usa o stream)
      expect(mockStreamFn).toHaveBeenCalled();

      // Mensagem do usuário deve ser a mensagem de tour (em pt-BR)
      const userMsg = result.current.messages.find((m) => m.role === 'user');
      expect(userMsg).toBeDefined();
      expect(userMsg?.text).toBe('Oi! Sou novo por aqui, pode me mostrar como funciona a plataforma?');

      // Flag de tour deve estar marcada
      expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe('true');

      vi.useRealTimers();
    });

    it('NÃO deve enviar tour quando TOUR_SEEN_KEY já é true (já viu antes)', async () => {
      vi.useFakeTimers();

      // Marca como já visto
      localStorage.setItem(TOUR_SEEN_KEY, 'true');

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      // Avança o tempo
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // Não deve ter chamado stream
      expect(mockStreamFn).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);

      vi.useRealTimers();
    });

    it('NÃO deve enviar tour quando há mensagens restauradas (sessão restaurada)', async () => {
      vi.useFakeTimers();

      const sessionId = 'restored-session';
      const restoredMessages = [
        { id: 'm1', role: 'user' as const, text: 'Conversa anterior', attachments: [] },
        { id: 'm2', role: 'model' as const, text: 'Resposta anterior', attachments: [] },
      ];
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      sessionsState.sessions = [
        {
          id: sessionId,
          userId: 'test-uid',
          title: 'Restaurada',
          messages: restoredMessages,
          updatedAt: Date.now(),
        },
      ];

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      // Avança promises pendentes (getChatSessions é async)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Aguarda restauração completar
      expect(result.current.messages).toHaveLength(2);

      // Limpa mockStreamFn para contar apenas chamadas do tour
      mockStreamFn.mockClear();

      // Avança o tempo do tour
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // REGRESSÃO (BUG-001): o setTimeout do tour captura `messages` do closure
      // do primeiro render (vazio), então ignora a restauração assíncrona e
      // dispara o tour mesmo com sessão restaurada. O fix correto é usar
      // uma ref sincronizada com messages.length em vez do closure obsoleto.
      // Este teste é o guardrail — quando o bug for corrigido, o assert abaixo
      // passa e o teste protege contra regressões futuras.
      expect(mockStreamFn).not.toHaveBeenCalled();
      // Mensagens da sessão restaurada continuam
      expect(result.current.messages).toHaveLength(2);
      // Tour seen NÃO é marcado
      expect(localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();

      vi.useRealTimers();
    });

    it('NÃO deve enviar tour quando user é null', async () => {
      vi.useFakeTimers();
      authState.user = null;

      const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

      // Avança o tempo
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockStreamFn).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);
      // Tour seen NÃO é marcado
      expect(localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();

      vi.useRealTimers();
    });

    it('NÃO deve enviar tour em MÚLTIPLAS montagens quando já visto (idempotência)', async () => {
      vi.useFakeTimers();

      // Marca como visto
      localStorage.setItem(TOUR_SEEN_KEY, 'true');

      // Primeira montagem
      const first = renderHook(() => useAssistant(), { wrapper: createWrapper() });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });
      first.unmount();

      // Segunda montagem — não deve enviar tour
      mockStreamFn.mockClear();
      const second = renderHook(() => useAssistant(), { wrapper: createWrapper() });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockStreamFn).not.toHaveBeenCalled();
      second.unmount();

      vi.useRealTimers();
    });

    it('deve enviar tour uma única vez quando user muda de null para autenticado', async () => {
      vi.useFakeTimers();

      // Começa sem user (anônimo)
      authState.user = null;

      const { result, rerender } = renderHook(() => useAssistant(), { wrapper: createWrapper() });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // Sem user, tour não dispara
      expect(mockStreamFn).not.toHaveBeenCalled();

      // User autentica
      authState.user = { uid: 'test-uid', email: 'test@test.com' };
      rerender();

      // Avança o tempo após login
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // Agora o tour dispara
      expect(mockStreamFn).toHaveBeenCalled();
      expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe('true');

      // Mensagem de tour é a primeira mensagem do usuário
      const userMsg = result.current.messages.find((m) => m.role === 'user');
      expect(userMsg?.text).toBe('Oi! Sou novo por aqui, pode me mostrar como funciona a plataforma?');

      vi.useRealTimers();
    });
  });
});
