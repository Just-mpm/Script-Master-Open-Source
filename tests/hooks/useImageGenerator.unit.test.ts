import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockImageCallable, mockCancelCallable, mockHttpsCallable } = vi.hoisted(() => ({
  mockImageCallable: vi.fn(),
  mockCancelCallable: vi.fn().mockResolvedValue({ data: { success: true } }),
  mockHttpsCallable: vi.fn(),
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

vi.mock('../../src/lib/env', () => ({
  getGeminiApiKey: vi.fn().mockReturnValue('test-key'),
  getRecaptchaSiteKey: vi.fn().mockReturnValue(undefined),
  isBillingEnabled: vi.fn().mockReturnValue(false),
  isOpenBetaEnabled: vi.fn().mockReturnValue(true),
  getFirebaseEnvConfig: vi.fn().mockReturnValue({
    apiKey: 'mock-api-key',
    authDomain: 'mock.firebaseapp.com',
    projectId: 'mock-project',
    storageBucket: 'mock.firebasestorage.app',
    messagingSenderId: '123',
    appId: '1:123:web:abc',
  }),
  getStripePublishableKey: vi.fn().mockReturnValue(undefined),
  getPexelsApiKey: vi.fn().mockReturnValue(undefined),
}));

vi.mock('../../src/lib/audio', () => ({
  base64ToBlob: vi.fn().mockResolvedValue(new Blob(['image-data'], { type: 'image/png' })),
}));

vi.mock('../../src/lib/rate-limiter', () => ({
  withRetry: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

vi.mock('../../src/hooks/useCredits', () => ({
  useCredits: () => ({ ...mockCreditsState }),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: mockHttpsCallable,
}));

vi.mock('../../src/lib/firebase', () => ({
  functions: {},
}));

import { useImageGenerator } from '../../src/hooks/useImageGenerator';

describe('useImageGenerator', () => {
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
    mockHttpsCallable.mockImplementation((_: unknown, callableName: string) => {
      if (callableName === 'cancelAiRequest') {
        return mockCancelCallable;
      }
      return mockImageCallable;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve inicializar com estados padrão', () => {
    const { result } = renderHook(() => useImageGenerator());

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.imageBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('deve expor todas as funções esperadas', () => {
    const { result } = renderHook(() => useImageGenerator());

    expect(typeof result.current.generateImage).toBe('function');
    expect(typeof result.current.clearImage).toBe('function');
    expect(typeof result.current.setError).toBe('function');
  });

  it('deve limpar estado ao chamar clearImage', () => {
    const { result } = renderHook(() => useImageGenerator());

    act(() => {
      result.current.clearImage();
    });

    expect(result.current.imageUrl).toBeNull();
    expect(result.current.imageBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('deve solicitar cancelamento remoto da imagem em andamento', async () => {
    mockImageCallable.mockImplementation(async () => {
      await new Promise(() => {});
      return { data: { imageBase64: 'abc', mimeType: 'image/png' } };
    });

    const { result } = renderHook(() => useImageGenerator());

    act(() => {
      void result.current.generateImage({
        prompt: 'Uma imagem',
        aspectRatio: '1:1',
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleCancel();
    });

    expect(mockCancelCallable).toHaveBeenCalledWith({
      requestId: expect.any(String),
    });
  });

  it('não bloqueia imagem quando o saldo zero ainda não foi confirmado', () => {
    mockCreditsState.availableCredits = 0;
    mockCreditsState.canEnforceBalance = false;

    const { result } = renderHook(() => useImageGenerator());

    expect(result.current.creditsExhausted).toBe(false);
  });
});
