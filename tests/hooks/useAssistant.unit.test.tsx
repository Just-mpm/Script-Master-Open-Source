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

vi.mock('../../src/hooks/useCredits', () => ({
  useCredits: () => ({ ...mockCreditsState }),
}));

import { useAssistant } from '../../src/hooks/useAssistant';
import type { AssistantStudioState } from '../../src/features/assistant/types';

/** Wrapper com providers necessários para o hook */
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <I18nProvider>{children}</I18nProvider>;
  };
}

describe('useAssistant', () => {
  beforeEach(() => {
    mockCreditsState.availableCredits = 100;
    mockCreditsState.usedCredits = 0;
    mockCreditsState.reservedCredits = 0;
    mockCreditsState.baseCredits = 100;
    mockCreditsState.bonusCredits = 0;
    mockCreditsState.feedbackBonusGranted = false;
    mockCreditsState.unlimitedCredits = false;
    mockCreditsState.canEnforceBalance = true;
    mockCreditsState.loading = false;
    mockCreditsState.error = null;
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

    mockHttpsCallable.mockImplementation((_: unknown, callableName: string) => {
      if (callableName === 'cancelAiRequest') {
        return mockCancelCallable;
      }

      return {
        stream: mockStreamFn,
      };
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

  it('deve enviar o contexto atual do estúdio para o backend', async () => {
    const currentState: AssistantStudioState = {
      script: 'Roteiro de teste',
      selectedVoice: 'Zephyr',
      isMultiSpeaker: true,
      speakerAName: 'Narrador',
      speakerBName: 'Convidado',
      speakerBVoice: 'Puck',
      audioProfile: 'Documental',
      scene: 'Estúdio escuro',
      pace: 'normal',
      styleNotes: 'Tom confiante',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 12,
      visualFramework: 'general',
      referenceImage: null,
      emotion: 'dramatic',
      emotionIntensity: 0.8,
      imageTextLanguage: 'pt-BR',
    };

    const { result } = renderHook(() => useAssistant(currentState), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Oi');
    });

    const callInput = mockStreamFn.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    const studioState = callInput?.studioState as Record<string, unknown> | undefined;

    expect(studioState).toBeDefined();
    expect(studioState?.script).toBe('Roteiro de teste');
    expect(studioState?.speakerAName).toBe('Narrador');
    expect(studioState?.speakerBName).toBe('Convidado');
    expect(studioState?.speakerBVoice).toBe('Puck');
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

  it('deve normalizar attachments nulos ao carregar sessão e reenviar histórico', async () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    act(() => {
      result.current.loadSession({
        id: 'legacy-session',
        userId: 'test-uid',
        title: 'Sessão legada',
        messages: [
          { id: '1', role: 'user' as const, text: 'Primeira', attachments: null as unknown as [] },
          { id: '2', role: 'model' as const, text: 'Resposta anterior', attachments: null as unknown as [] },
        ],
        updatedAt: Date.now(),
      });
    });

    mockStreamFn.mockClear();

    await act(async () => {
      await result.current.sendMessage('Segunda');
    });

    const callInput = mockStreamFn.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    const history = callInput?.history as Array<{ attachments?: unknown[] }> | undefined;

    expect(Array.isArray(history)).toBe(true);
    expect(Array.isArray(history?.[0]?.attachments)).toBe(true);
    expect(Array.isArray(history?.[1]?.attachments)).toBe(true);
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

  it('deve reenviar o retry sem incluir o fallback técnico no histórico', async () => {
    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    act(() => {
      result.current.loadSession({
        id: 'retry-history-session',
        userId: 'test-uid',
        title: 'Sessão com fallback',
        messages: [
          { id: '1', role: 'user' as const, text: 'Primeira mensagem', attachments: [] },
          { id: '2', role: 'model' as const, text: 'Resposta ok', attachments: [] },
          { id: '3', role: 'user' as const, text: 'Segunda mensagem', attachments: [] },
          { id: '4', role: 'model' as const, text: '__RETRY_DETECTED__ Falha temporária', attachments: [] },
        ],
        updatedAt: Date.now(),
      });
    });

    mockStreamFn.mockClear();

    await act(async () => {
      result.current.retryLastMessage();
      await Promise.resolve();
    });

    const retryInput = mockStreamFn.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    const retryHistory = retryInput?.history as Array<{ text: string }> | undefined;

    expect(retryHistory?.some((message) => message.text.includes('__RETRY_DETECTED__'))).toBe(false);
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
    expect(mockCancelCallable).toHaveBeenCalledWith({
      requestId: '00000000-0000-4000-8000-000000000000',
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isStreaming).toBe(false);
      });
    });

    const transientAssistantMessages = result.current.messages.filter(
      (message) => message.role === 'model' && message.id !== 'welcome',
    );
    expect(transientAssistantMessages).toHaveLength(0);
  });

  it('deve solicitar cancelamento remoto ao iniciar novo chat durante streaming', async () => {
    // eslint-disable-next-line require-yield
    async function* infiniteStream(): AsyncGenerator<string> {
      await new Promise(() => {});
      yield '';
    }

    mockStreamFn.mockResolvedValue({
      stream: infiniteStream(),
      data: new Promise(() => {}),
    });

    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    act(() => {
      void result.current.sendMessage('Mensagem longa');
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });

    act(() => {
      result.current.startNewChat();
    });

    expect(mockCancelCallable).toHaveBeenCalledWith({
      requestId: '00000000-0000-4000-8000-000000000000',
    });
  });

  it('deve marcar créditos esgotados quando receber details estruturado do backend', async () => {
    mockStreamFn.mockRejectedValue({
      code: 'functions/failed-precondition',
      message: 'Créditos insuficientes',
      details: {
        code: 'INSUFFICIENT_CREDITS',
      },
    });

    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendMessage('Mensagem que vai falhar por saldo');
    });

    expect(result.current.creditsExhausted).toBe(true);
  });

  it('não bloqueia por saldo quando o zero ainda não foi confirmado', () => {
    mockCreditsState.availableCredits = 0;
    mockCreditsState.canEnforceBalance = false;

    const { result } = renderHook(() => useAssistant(), { wrapper: createWrapper() });

    expect(result.current.creditBlockedByBalance).toBe(false);
    expect(result.current.creditsExhausted).toBe(false);
  });
});
