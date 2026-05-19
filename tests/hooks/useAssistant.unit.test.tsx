import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '../../src/features/i18n';

// --- Helpers ---

async function* createMockStream(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

// --- Hoisted mocks (acessíveis dentro das factories de vi.mock) ---

const { mockStreamFn, mockHttpsCallable } = vi.hoisted(() => ({
  mockStreamFn: vi.fn(),
  mockHttpsCallable: vi.fn(),
}));

// --- Mocks ---

vi.mock('firebase/functions', () => ({
  httpsCallable: mockHttpsCallable,
}));

vi.mock('../../src/lib/firebase', () => ({
  functions: {},
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
  PACE_INSTRUCTIONS: { normal: 'Ritmo normal', lento: 'Ritmo lento', rapido: 'Ritmo rápido' },
  VOICES: [
    { id: 'Puck', name: 'Puck', style: 'Animada' },
    { id: 'Zephyr', name: 'Zephyr', style: 'Brilhante' },
  ],
}));

vi.mock('../../src/lib/db', () => ({
  getMemories: vi.fn().mockResolvedValue([]),
  saveChatSession: vi.fn().mockResolvedValue(undefined),
  getUserSettings: vi.fn().mockResolvedValue(null),
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
  useAuth: () => ({ user: { uid: 'test-uid', email: 'test@test.com' } }),
}));

import { useAssistant } from '../../src/hooks/useAssistant';

/** Wrapper com providers necessários para o hook */
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <I18nProvider>{children}</I18nProvider>;
  };
}

describe('useAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Stubs globais por teste (limpos no afterEach via unstubAllGlobals)
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

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(cb, 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000000' as ReturnType<typeof crypto.randomUUID>,
    );

    // Configura o mock de httpsCallable para retornar objeto com .stream()
    mockHttpsCallable.mockReturnValue({
      stream: mockStreamFn,
    });

    // Configura stream padrão
    mockStreamFn.mockResolvedValue({
      stream: createMockStream(['Olá!', ' Como posso ajudar?']),
      data: Promise.resolve({ text: 'Olá! Como posso ajudar?' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('deve inicializar com mensagem de boas-vindas', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('model');
    expect(result.current.messages[0].text).toBeTruthy();
  });

  it('deve ter isLoading false e isStreaming false inicialmente', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve expor todas as funções esperadas', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.startNewChat).toBe('function');
    expect(typeof result.current.loadSession).toBe('function');
    expect(typeof result.current.stopGeneration).toBe('function');
    expect(result.current.messagesEndRef).toBeDefined();
  });

  it('deve adicionar mensagem do usuário ao chamar sendMessage', async () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Olá assistente!');
    });

    expect(result.current.messages.length).toBeGreaterThanOrEqual(2);

    const userMsg = result.current.messages.find(
      (m) => m.role === 'user' && m.text === 'Olá assistente!',
    );
    expect(userMsg).toBeDefined();
  });

  it('deve chamar httpsCallable com os parâmetros corretos', async () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Teste de parâmetros');
    });

    // httpsCallable deve ter sido chamado com functions e 'assistant'
    expect(mockHttpsCallable).toHaveBeenCalledWith(
      expect.any(Object), // functions stub
      'assistant',
    );

    // mockStreamFn deve ter sido chamado com o input correto
    expect(mockStreamFn).toHaveBeenCalledTimes(1);
    const callInput = mockStreamFn.mock.calls[0][0] as Record<string, unknown>;
    expect(callInput.message).toBe('Teste de parâmetros');
    expect(Array.isArray(callInput.history)).toBe(true);
    expect(typeof callInput.requestId).toBe('string');
  });

  it('deve acumular chunks de streaming na mensagem do assistente', async () => {
    // Configura stream com múltiplos chunks
    mockStreamFn.mockResolvedValue({
      stream: createMockStream(['Parte 1', 'Parte 2', 'Parte 3']),
      data: Promise.resolve({ text: 'Parte 1Parte 2Parte 3' }),
    });

    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Stream test');
    });

    const assistantMsg = result.current.messages.find((m) => m.role === 'model' && m.id !== 'welcome');
    expect(assistantMsg).toBeDefined();
    // O texto acumulado deve conter todos os chunks
    expect(assistantMsg?.text).toContain('Parte 1');
    expect(assistantMsg?.text).toContain('Parte 2');
    expect(assistantMsg?.text).toContain('Parte 3');
  });

  it('deve resetar sessão ao chamar startNewChat', async () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Olá');
    });

    act(() => {
      result.current.startNewChat();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('model');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve carregar sessão existente via loadSession', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    const session = {
      id: 'existing-session',
      userId: 'test-uid',
      title: 'Conversa anterior',
      messages: [
        { id: '1', role: 'user' as const, text: 'Oi', attachments: [] },
        { id: '2', role: 'model' as const, text: 'Olá!', attachments: [] },
      ],
      updatedAt: Date.now(),
    };

    act(() => {
      result.current.loadSession(session);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].text).toBe('Oi');
    expect(result.current.messages[1].text).toBe('Olá!');
  });

  it('deve ignorar sendMessage com texto vazio e sem anexos', async () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('');
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it('deve aceitar sendMessage com texto e anexos', async () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    const attachments = [
      { id: '1', mimeType: 'image/png', data: 'base64data', url: undefined },
    ];

    await act(async () => {
      await result.current.sendMessage('O que há nesta imagem?', attachments);
    });

    const userMsg = result.current.messages.find((m) => m.role === 'user');
    expect(userMsg).toBeDefined();
    expect(userMsg?.attachments).toHaveLength(1);
  });

  // ─── retryLastMessage ──────────────────────────────────────

  it('deve remover mensagem de erro com retry marker via retryLastMessage', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    // Carrega sessão com erro contendo o marker de retry
    act(() => {
      result.current.loadSession({
        id: 'retry-session',
        userId: 'test-uid',
        title: 'Sessão com erro',
        messages: [
          { id: '1', role: 'user' as const, text: 'Crie um roteiro', attachments: [] },
          { id: '2', role: 'model' as const, text: '__RETRY_DETECTED__ Erro de streaming', attachments: [] },
        ],
        updatedAt: Date.now(),
      });
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.retryLastMessage();
    });

    // A mensagem de erro deve ter sido removida
    const errorMessages = result.current.messages.filter(
      (m) => m.role === 'model' && m.text.includes('__RETRY_DETECTED__'),
    );
    expect(errorMessages).toHaveLength(0);
  });

  it('não deve alterar mensagens via retryLastMessage quando não há erro com marker', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    // Estado inicial: apenas mensagem de boas-vindas (sem marker)
    const originalLength = result.current.messages.length;

    act(() => {
      result.current.retryLastMessage();
    });

    expect(result.current.messages).toHaveLength(originalLength);
  });

  it('não deve alterar mensagens via retryLastMessage quando não há user message antes do erro', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    // Sessão com erro mas sem user message antes
    act(() => {
      result.current.loadSession({
        id: 'no-user-session',
        userId: 'test-uid',
        title: 'Sem user',
        messages: [
          { id: '2', role: 'model' as const, text: '__RETRY_DETECTED__ Erro', attachments: [] },
        ],
        updatedAt: Date.now(),
      });
    });

    act(() => {
      result.current.retryLastMessage();
    });

    // Mensagem de erro permanece (não há user message para retry)
    expect(result.current.messages).toHaveLength(1);
  });

  // ─── stopGeneration ────────────────────────────────────────

  it('deve expor stopGeneration como função', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });
    expect(typeof result.current.stopGeneration).toBe('function');
  });

  it('deve expor retryLastMessage como função', () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });
    expect(typeof result.current.retryLastMessage).toBe('function');
  });

  // ─── comportamento de erro ─────────────────────────────────

  it('deve tratar erro de streaming e exibir mensagem de fallback', async () => {
    // Simula erro na stream
    mockStreamFn.mockRejectedValue(new Error('Erro simulado de streaming'));

    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Mensagem que vai falhar');
    });

    // Deve ter mensagem do usuário
    const userMsg = result.current.messages.find((m) => m.role === 'user');
    expect(userMsg).toBeDefined();

    // Deve ter mensagem de fallback do assistente com o marker de retry
    const fallbackMsg = result.current.messages.find(
      (m) => m.role === 'model' && m.text.includes('__RETRY_DETECTED__'),
    );
    expect(fallbackMsg).toBeDefined();
  });

  it('deve abortar streaming via stopGeneration e não exibir erro', async () => {
    // Cria uma stream que nunca termina (simula streaming longo)
    // eslint-disable-next-line require-yield
    async function* infiniteStream(): AsyncGenerator<string> {
      // Stream controlada manualmente — usamos uma promise que nunca resolve
      await new Promise(() => {});
      yield '';
    }

    mockStreamFn.mockResolvedValue({
      stream: infiniteStream(),
      data: new Promise(() => {}), // nunca resolve
    });

    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    // Inicia sendMessage mas NÃO espera completar
    act(() => {
      void result.current.sendMessage('Mensagem longa');
    });

    // Aguarda o estado refletir isLoading true
    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });

    // Aborta
    act(() => {
      result.current.stopGeneration();
    });

    // O erro NÃO deve aparecer (abortos são silenciosos)
    expect(result.current.error).toBeNull();
  });
});
