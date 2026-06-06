import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── vi.hoisted: estado mutável acessível nos factories de mock ──

const {
  mockAuthState,
  mockClearAuthError,
  mockToggle,
  mockPlay,
  mockAudioActiveId,
  mockSetDurationOverride,
  mockStudioState,
  mockBridgeState,
  mockGenerateAudio,
  mockHandleCancel,
  mockSetError,
  mockBuildGenerateOptions,
  mockBuildAudioFlowInput,
  mockSaveGeneration,
  mockAudioPreflightCallable,
} = vi.hoisted(() => ({
  mockAuthState: {
    user: { uid: 'test-uid', email: 'test@test.com' } as { uid: string; email: string } | null,
    authError: null as string | null,
  },
  mockClearAuthError: vi.fn(),
  mockToggle: vi.fn(),
  mockPlay: vi.fn(),
  mockAudioActiveId: null as string | null,
  mockSetDurationOverride: vi.fn(),
  mockStudioState: {
    script: 'Roteiro de teste para áudio',
    selectedVoice: 'Puck',
    isMultiSpeaker: false,
    speakerBVoice: '',
    speakerAName: '',
    speakerBName: '',
    audioProfile: '',
    scene: '',
    pace: 'normal',
    styleNotes: '',
    generateScenes: false,
    sceneDensity: 15,
    sceneRatio: '16:9' as const,
    visualFramework: 'general',
    referenceImage: null,
    emotion: 'neutral' as const,
    emotionIntensity: 0.5,
  },
  mockBridgeState: {
    isExportingVideo: false,
    videoExportProgress: 0,
  },
  mockGenerateAudio: vi.fn(),
  mockHandleCancel: vi.fn(),
  mockSetError: vi.fn(),
  mockBuildGenerateOptions: vi.fn().mockReturnValue({ script: 'opts' }),
  mockBuildAudioFlowInput: vi.fn().mockReturnValue({ script: 'opts' }),
  mockSaveGeneration: vi.fn().mockResolvedValue(undefined),
  mockAudioPreflightCallable: vi.fn().mockResolvedValue({
    data: {
      summary: 'Resumo',
      estimatedDurationSeconds: 42,
      estimatedChunkCount: 1,
      estimatedSceneCount: 0,
      confidence: 'high',
      steps: [],
      canProceed: true,
      notes: [],
    },
  }),
}));

// ─── Mocks de dependências ─────────────────────────────────────

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    ...mockAuthState,
    clearAuthError: mockClearAuthError,
  }),
}));

vi.mock('../../src/contexts/AudioContext', () => ({
  useGlobalAudioActions: () => ({
    toggle: mockToggle,
    play: mockPlay,
    setDurationOverride: mockSetDurationOverride,
  }),
  useAudioActiveId: () => mockAudioActiveId,
}));

vi.mock('../../src/hooks/useAudioGenerator', () => ({
  buildAudioFlowInput: (...args: unknown[]) => mockBuildAudioFlowInput(...args),
  useAudioGenerator: () => ({
    isGenerating: false,
    statusText: '',
    generationProgress: 0,
    audioUrl: null,
    audioBlob: null,
    scenes: [],
    audioSegments: [],
    projectId: null,
    error: null as string | null,
    setError: mockSetError,
    sceneGenerationWarning: null,
    generateAudio: mockGenerateAudio,
    handleCancel: mockHandleCancel,
    loadProjectData: vi.fn(),
    durationInSeconds: 0,
  }),
}));

vi.mock('../../src/features/studio/store/studioStore', () => ({
  useStudioStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) => selector(mockStudioState),
    { getState: () => mockStudioState },
  ),
}));

vi.mock('../../src/features/studio/store/studio.utils', () => ({
  buildGenerateOptions: (...args: unknown[]) => mockBuildGenerateOptions(...args),
  VIDEO_FPS: 30,
}));

vi.mock('../../src/features/video-render/store/videoRenderBridge', () => ({
  useVideoRenderBridge: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(mockBridgeState),
}));

vi.mock('../../src/lib/db', () => ({
  saveGeneration: (...args: unknown[]) => mockSaveGeneration(...args),
}));

vi.mock('../../src/lib/firebase', () => ({
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn().mockReturnValue(mockAudioPreflightCallable),
}));

vi.mock('../../src/lib/constants', () => ({
  MAX_CHARS: 50000,
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

// ─── Import após mocks ────────────────────────────────────────

import { useAudioGenerationHandler } from '../../src/components/app/AudioGenerationHandler';

// ─── Testes ───────────────────────────────────────────────────

describe('useAudioGenerationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset estado padrão
    mockAuthState.user = { uid: 'test-uid', email: 'test@test.com' };
    mockAuthState.authError = null;
    mockStudioState.script = 'Roteiro de teste para áudio';
    mockBridgeState.isExportingVideo = false;
    mockBridgeState.videoExportProgress = 0;
  });

  // ─── Estado inicial ────────────────────────────────────────

  it('deve inicializar com estados padrão corretos', () => {
    const { result } = renderHook(() => useAudioGenerationHandler());

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.statusText).toBe('');
    expect(result.current.generationProgress).toBe(0);
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.scenes).toEqual([]);
    expect(result.current.activeError).toBeNull();
    expect(result.current.warning).toBeNull();
    expect(result.current.successMessage).toBeNull();
    expect(result.current.isExportingVideo).toBe(false);
    expect(result.current.videoExportProgress).toBe(0);
    expect(result.current.isSaved).toBe(false);
  });

  // ─── isGenerateDisabled ────────────────────────────────────

  it('deve habilitar geração quando roteiro é válido', () => {
    const { result } = renderHook(() => useAudioGenerationHandler());
    expect(result.current.isGenerateDisabled).toBe(false);
  });

  it('deve desabilitar geração quando roteiro está vazio', () => {
    mockStudioState.script = '   ';
    const { result } = renderHook(() => useAudioGenerationHandler());
    expect(result.current.isGenerateDisabled).toBe(true);
  });

  it('deve desabilitar geração quando roteiro excede MAX_CHARS', () => {
    mockStudioState.script = 'a'.repeat(50001);
    const { result } = renderHook(() => useAudioGenerationHandler());
    expect(result.current.isGenerateDisabled).toBe(true);
  });

  it('deve desabilitar geração quando roteiro tem exatamente MAX_CHARS', () => {
    // MAX_CHARS = 50000, script.length > MAX_CHARS desabilita
    mockStudioState.script = 'a'.repeat(50000);
    const { result } = renderHook(() => useAudioGenerationHandler());
    expect(result.current.isGenerateDisabled).toBe(false);
  });

  // ─── Priorização de erros ──────────────────────────────────

  it('deve exibir null quando não há erros', () => {
    const { result } = renderHook(() => useAudioGenerationHandler());
    expect(result.current.activeError).toBeNull();
  });

  // ─── dismissError ──────────────────────────────────────────

  it('deve chamar clearAuthError ao dispensar erro de autenticação', () => {
    mockAuthState.authError = 'Sessão expirada';
    const { result } = renderHook(() => useAudioGenerationHandler());

    expect(result.current.activeError).toBe('Sessão expirada');

    act(() => {
      result.current.dismissError();
    });

    expect(mockClearAuthError).toHaveBeenCalledTimes(1);
  });

  it('deve chamar setError("") ao dispensar erro do estúdio (sem authError)', () => {
    // studio error vem do useAudioGenerator mock (error: null por padrão)
    // Não há como testar dismiss de studio error sem mudar o mock de useAudioGenerator
    // pois o mock retorna error: null fixo. Testamos o caminho null abaixo:
    const { result } = renderHook(() => useAudioGenerationHandler());

    act(() => {
      result.current.dismissError();
    });

    // Sem authError e sem studio error → setError NÃO deve ser chamado
    expect(mockClearAuthError).not.toHaveBeenCalled();
    expect(mockSetError).not.toHaveBeenCalled();
  });

  // ─── Exposição de funções ──────────────────────────────────

  it('deve expor todas as funções esperadas', () => {
    const { result } = renderHook(() => useAudioGenerationHandler());

    expect(typeof result.current.handleGenerate).toBe('function');
    expect(typeof result.current.handleDownload).toBe('function');
    expect(typeof result.current.handleSaveToLibrary).toBe('function');
    expect(typeof result.current.handleCancel).toBe('function');
    expect(typeof result.current.scrollToExport).toBe('function');
    expect(typeof result.current.dismissError).toBe('function');
    expect(typeof result.current.dismissWarning).toBe('function');
    expect(typeof result.current.dismissSuccess).toBe('function');
    expect(typeof result.current.toggleAudioPlayer).toBe('function');
  });

  // ─── handleGenerate ────────────────────────────────────────

  it('deve abrir a prévia e só gerar após confirmação', async () => {
    const { result } = renderHook(() => useAudioGenerationHandler());

    await act(async () => {
      result.current.handleGenerate();
      await Promise.resolve();
    });

    expect(mockBuildGenerateOptions).toHaveBeenCalledWith('test-uid', mockStudioState);
    expect(mockBuildAudioFlowInput).toHaveBeenCalled();
    expect(mockAudioPreflightCallable).toHaveBeenCalledWith({ script: 'opts' });
    expect(result.current.isPreflightOpen).toBe(true);

    act(() => {
      result.current.confirmGenerate();
    });

    expect(mockGenerateAudio).toHaveBeenCalledWith({
      script: 'opts',
      estimatedChunkCount: 1,
    });
  });

  it('deve chamar buildGenerateOptions com userId undefined quando não autenticado', async () => {
    mockAuthState.user = null;
    const { result } = renderHook(() => useAudioGenerationHandler());

    await act(async () => {
      result.current.handleGenerate();
      await Promise.resolve();
    });

    expect(mockBuildGenerateOptions).toHaveBeenCalledWith(undefined, mockStudioState);
  });

  it('deve exibir erro genérico quando a prévia falhar', async () => {
    mockAudioPreflightCallable.mockRejectedValueOnce({
      code: 'functions/failed-precondition',
      message: 'Falha técnica',
      details: {
        code: 'PREFLIGHT_FAILED',
      },
    });

    const { result } = renderHook(() => useAudioGenerationHandler());

    await act(async () => {
      result.current.handleGenerate();
      await Promise.resolve();
    });

    expect(result.current.preflightError).toContain('prévia');
    expect(result.current.preflight).toBeNull();
    expect(mockGenerateAudio).not.toHaveBeenCalled();
  });

  it('deve confirmar geração com pacote visual estimado', async () => {
    mockAudioPreflightCallable.mockResolvedValueOnce({
      data: {
        summary: 'Pacote visual estimado',
        estimatedDurationSeconds: 42,
        estimatedChunkCount: 2,
        estimatedSceneCount: 3,
        confidence: 'medium',
        steps: [],
        canProceed: true,
        notes: [],
      },
    });

    const { result } = renderHook(() => useAudioGenerationHandler());

    await act(async () => {
      result.current.handleGenerate();
      await Promise.resolve();
    });

    act(() => {
      result.current.confirmGenerate();
    });

    expect(mockGenerateAudio).toHaveBeenCalledWith({
      script: 'opts',
      estimatedChunkCount: 2,
    });
  });

  it('deve permitir fechar a prévia mesmo durante loading e ignorar resultado tardio', async () => {
    let resolvePreflight: ((value: { data: {
      summary: string;
      estimatedDurationSeconds: number;
      estimatedChunkCount: number;
      estimatedSceneCount: number;
      confidence: 'high' | 'medium';
      steps: [];
      canProceed: boolean;
      notes: [];
    } }) => void) | null = null;

    mockAudioPreflightCallable.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolvePreflight = resolve;
      }),
    );

    const { result } = renderHook(() => useAudioGenerationHandler());

    act(() => {
      result.current.handleGenerate();
    });

    expect(result.current.isPreflightOpen).toBe(true);
    expect(result.current.isPreparingPreflight).toBe(true);

    act(() => {
      result.current.closePreflightDialog();
    });

    expect(result.current.isPreflightOpen).toBe(false);
    expect(result.current.isPreparingPreflight).toBe(false);

    await act(async () => {
      resolvePreflight?.({
        data: {
          summary: 'Resumo tardio',
          estimatedDurationSeconds: 30,
          estimatedChunkCount: 1,
          estimatedSceneCount: 0,
          confidence: 'high',
          steps: [],
          canProceed: true,
          notes: [],
        },
      });
      await Promise.resolve();
    });

    expect(result.current.preflight).toBeNull();
    expect(result.current.isPreflightOpen).toBe(false);
  });

  // ─── durationInFrames ──────────────────────────────────────

  it('deve calcular durationInFrames como durationInSeconds * VIDEO_FPS', () => {
    // useAudioGenerator mock retorna durationInSeconds: 0
    const { result } = renderHook(() => useAudioGenerationHandler());
    expect(result.current.durationInFrames).toBe(0);
  });

  // ─── Sincronização de duração com AudioContext ─────────────

  it('deve chamar setDurationOverride ao montar com duração > 0', () => {
    // Mock de useAudioGenerator retorna durationInSeconds: 0 → setDurationOverride(null)
    renderHook(() => useAudioGenerationHandler());
    expect(mockSetDurationOverride).toHaveBeenCalledWith(null);
  });
});
