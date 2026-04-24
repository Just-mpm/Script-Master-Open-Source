import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- Mocks ---

vi.stubGlobal('AbortController', class MockAbortController {
  signal = { aborted: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  abort() { this.signal.aborted = true; }
});

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContentStream: vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield { text: 'Olá!' };
          yield { text: ' Como posso ajudar?' };
        },
      }),
    };
  }
  return { GoogleGenAI: MockGoogleGenAI };
});

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

describe('useAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000000' as ReturnType<typeof crypto.randomUUID>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('deve inicializar com mensagem de boas-vindas', () => {
    const { result } = renderHook(() => useAssistant());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('model');
    expect(result.current.messages[0].text).toContain('Assistente Criativo');
  });

  it('deve ter isLoading false e isStreaming false inicialmente', () => {
    const { result } = renderHook(() => useAssistant());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve expor todas as funções esperadas', () => {
    const { result } = renderHook(() => useAssistant());

    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.startNewChat).toBe('function');
    expect(typeof result.current.loadSession).toBe('function');
    expect(typeof result.current.stopGeneration).toBe('function');
    expect(result.current.messagesEndRef).toBeDefined();
  });

  it('deve adicionar mensagem do usuário ao chamar sendMessage', async () => {
    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      await result.current.sendMessage('Olá assistente!');
    });

    expect(result.current.messages.length).toBeGreaterThanOrEqual(2);

    const userMsg = result.current.messages.find(m => m.role === 'user' && m.text === 'Olá assistente!');
    expect(userMsg).toBeDefined();
  });

  it('deve resetar sessão ao chamar startNewChat', async () => {
    const { result } = renderHook(() => useAssistant());

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
    const { result } = renderHook(() => useAssistant());

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
    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      await result.current.sendMessage('');
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it('deve aceitar sendMessage com texto e anexos', async () => {
    const { result } = renderHook(() => useAssistant());

    const attachments = [
      { id: '1', mimeType: 'image/png', data: 'base64data', url: undefined },
    ];

    await act(async () => {
      await result.current.sendMessage('O que há nesta imagem?', attachments);
    });

    const userMsg = result.current.messages.find(m => m.role === 'user');
    expect(userMsg).toBeDefined();
    expect(userMsg?.attachments).toHaveLength(1);
  });
});
