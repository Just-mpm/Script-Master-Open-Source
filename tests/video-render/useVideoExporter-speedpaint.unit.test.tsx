/**
 * Testes para useVideoExporter — foco na integração Speed Paint.
 *
 * Valida:
 * - Prop `animateScenes` nas opções de exportação
 * - Lógica de chamada a generateScenesWithSpeedPaint
 * - Graceful degradation quando geração falha
 * - Estado speedPaintWarnings no INITIAL_STATE
 *
 * BUG DOCUMENTADO (P1): speedPaintWarnings são perdidos por batching.
 * Na linha 351, `setState(prev => ({ ...prev, speedPaintWarnings: failedScenes }))`
 * é batched pelo React. Na linha 396, `prev.speedPaintWarnings` lê o estado
 * ANTES do batch ser processado, resultando em array vazio no estado final.
 * Correção: acumular warnings em ref e ler no setState da linha 396.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — Remotion web-renderer
// ---------------------------------------------------------------------------

const mockGetBlob = vi.fn().mockResolvedValue(new Blob(['fake-video'], { type: 'video/mp4' }));
const mockRenderMediaOnWeb = vi.fn().mockResolvedValue({ getBlob: mockGetBlob });

vi.mock('@remotion/web-renderer', () => ({
  renderMediaOnWeb: (...args: unknown[]) => mockRenderMediaOnWeb(...args),
  canRenderMediaOnWeb: vi.fn().mockResolvedValue({
    canRender: true,
    resolvedVideoCodec: 'h264',
    resolvedAudioCodec: 'aac',
    issues: [],
  }),
}));

// ---------------------------------------------------------------------------
// Mocks — dependências internas
// ---------------------------------------------------------------------------

vi.mock('../../src/features/video-render/components/VideoComposition', () => ({
  VideoComposition: () => null,
}));

vi.mock('../../src/features/video-render/lib/canvasFontStretchPatch', () => ({
  patchCanvasFontStretch: vi.fn(),
}));

vi.mock('../../src/features/video-render/lib/videoUtils', () => ({
  getResolutionFromQuality: () => ({ width: 1920, height: 1080 }),
  mapScenesToVideoScenes: (scenes: unknown[]) =>
    scenes.map((s: unknown) => ({ ...(s as Record<string, unknown>), durationInFrames: 90 })),
  DEFAULT_EXPORT_QUALITY: '1080p',
}));

vi.mock('../../src/lib/db/videos', () => ({
  saveVideoToProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/download', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock — env (força isCloudRunVideoEnabled=false para testar fluxo local
// independente do .env, que pode ter VITE_CLOUD_RUN_VIDEO_ENABLED=true)
// ---------------------------------------------------------------------------

vi.mock('../../src/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/env')>();
  return {
    ...actual,
    isCloudRunVideoEnabled: () => false,
  };
});

// ---------------------------------------------------------------------------
// Mocks — speed paint renderer (focus principal)
// ---------------------------------------------------------------------------

const mockGenerateScenesWithSpeedPaint = vi.fn();

vi.mock('../../src/features/video-render/lib/speedPaintRenderer', () => ({
  renderSpeedPaintFrame: vi.fn(),
  createBufferCanvas: vi.fn(),
  loadImageElement: vi.fn(),
  generateScenesWithSpeedPaint: (...args: unknown[]) => mockGenerateScenesWithSpeedPaint(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMinimalStudioScene(overrides?: Record<string, unknown>) {
  return {
    imageUrl: 'scene1.png',
    prompt: 'test prompt',
    timestamp: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('useVideoExporter — integração Speed Paint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia a exportação quando durationInFrames é 0 e não chama o Remotion', async () => {
    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [createMinimalStudioScene()],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 0,
        ratio: '16:9',
      });
    });

    expect(mockRenderMediaOnWeb).not.toHaveBeenCalled();
    expect(result.current.isRendering).toBe(false);
    expect(result.current.error).toBe(
      'A duração do áudio ainda não foi carregada. Aguarde alguns instantes e tente exportar novamente.',
    );
  });

  it('não chama generateScenesWithSpeedPaint quando animateScenes é false (default)', async () => {
    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [createMinimalStudioScene()],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 90,
        ratio: '16:9',
        animateScenes: false,
      });
    });

    expect(mockGenerateScenesWithSpeedPaint).not.toHaveBeenCalled();
  });

  it('não chama generateScenesWithSpeedPaint quando animateScenes é omitido', async () => {
    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [createMinimalStudioScene()],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 90,
        ratio: '16:9',
        // animateScenes omitido — default false
      });
    });

    expect(mockGenerateScenesWithSpeedPaint).not.toHaveBeenCalled();
  });

  it('chama generateScenesWithSpeedPaint quando animateScenes é true', async () => {
    const mockAnimation = {
      id: 'anim-1',
      canvasWidth: 1920,
      canvasHeight: 1080,
      canvasColor: 'white' as const,
      totalFrames: 60,
      fps: 30,
      totalDurationMs: 2000,
      strokes: [],
    };

    mockGenerateScenesWithSpeedPaint.mockResolvedValue([
      { animation: mockAnimation, sceneIndex: 0 },
    ]);

    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [createMinimalStudioScene()],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 90,
        ratio: '16:9',
        animateScenes: true,
      });
    });

    expect(mockGenerateScenesWithSpeedPaint).toHaveBeenCalledTimes(1);
    expect(mockGenerateScenesWithSpeedPaint).toHaveBeenCalledWith(
      [{ imageUrl: 'scene1.png' }],
      expect.any(Function),
      { useWorker: true },
    );
  });

  it('passa lista de imageUrls corretas para generateScenesWithSpeedPaint', async () => {
    mockGenerateScenesWithSpeedPaint.mockResolvedValue([
      { animation: undefined, sceneIndex: 0 },
      { animation: undefined, sceneIndex: 1 },
      { animation: undefined, sceneIndex: 2 },
    ]);

    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [
          createMinimalStudioScene({ imageUrl: 'a.png', timestamp: 0 }),
          createMinimalStudioScene({ imageUrl: 'b.png', timestamp: 3 }),
          createMinimalStudioScene({ imageUrl: 'c.png', timestamp: 6 }),
        ],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 270,
        ratio: '16:9',
        animateScenes: true,
      });
    });

    expect(mockGenerateScenesWithSpeedPaint).toHaveBeenCalledWith(
      [
        { imageUrl: 'a.png' },
        { imageUrl: 'b.png' },
        { imageUrl: 'c.png' },
      ],
      expect.any(Function),
      { useWorker: true },
    );
  });

  it('exportação prossegue normalmente mesmo quando speed paint falha completamente (graceful degradation)', async () => {
    // generateScenesWithSpeedPaint lança erro geral
    mockGenerateScenesWithSpeedPaint.mockRejectedValue(new Error('imageProcessing indisponível'));

    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [createMinimalStudioScene()],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 90,
        ratio: '16:9',
        animateScenes: true,
      });
    });

    // A exportação deve ter sido concluída com sucesso (não deve ter erro)
    expect(result.current.isRendering).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('preserva speedPaintWarnings após exportação concluída com falhas parciais', async () => {
    mockGenerateScenesWithSpeedPaint.mockResolvedValue([
      { animation: undefined, sceneIndex: 0, error: 'formato não suportado' },
    ]);

    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [createMinimalStudioScene()],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 90,
        ratio: '16:9',
        animateScenes: true,
      });
    });

    expect(result.current.error).toBeNull();
    expect(result.current.speedPaintWarnings).toEqual(['Cena 1: formato não suportado']);
  });

  it('reset limpa speedPaintWarnings para array vazio', async () => {
    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    // Estado inicial deve ter speedPaintWarnings vazio
    expect(result.current.speedPaintWarnings).toEqual([]);

    act(() => {
      result.current.reset();
    });

    expect(result.current.speedPaintWarnings).toEqual([]);
  });

  it('não chama generateScenesWithSpeedPaint quando scenes está vazio', async () => {
    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 90,
        ratio: '16:9',
        animateScenes: true,
      });
    });

    // startRender retorna cedo quando scenes.length === 0
    expect(mockGenerateScenesWithSpeedPaint).not.toHaveBeenCalled();
  });

  it('passa callback de progresso para generateScenesWithSpeedPaint', async () => {
    mockGenerateScenesWithSpeedPaint.mockResolvedValue([
      { animation: undefined, sceneIndex: 0 },
    ]);

    const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
    const { result } = renderHook(() => useVideoExporter());

    await act(async () => {
      await result.current.startRender({
        scenes: [createMinimalStudioScene()],
        audioUrl: 'audio.mp3',
        fps: 30,
        durationInFrames: 90,
        ratio: '16:9',
        animateScenes: true,
      });
    });

    // O segundo argumento deve ser uma função (callback de progresso)
    const lastCallArgs = mockGenerateScenesWithSpeedPaint.mock.calls[0];
    expect(typeof lastCallArgs[1]).toBe('function');
  });

  // --- speedPaintMultipliers ---

  describe('speedPaintMultipliers', () => {
    it('repassa speedPaintMultipliers nos inputProps do renderMediaOnWeb', async () => {
      mockGenerateScenesWithSpeedPaint.mockResolvedValue([
        { animation: undefined, sceneIndex: 0 },
      ]);

      const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
      const { result } = renderHook(() => useVideoExporter());

      const multipliers = { sketch: 2.0, reveal: 0.5 };

      await act(async () => {
        await result.current.startRender({
          scenes: [createMinimalStudioScene()],
          audioUrl: 'audio.mp3',
          fps: 30,
          durationInFrames: 90,
          ratio: '16:9',
          animateScenes: false,
          speedPaintMultipliers: multipliers,
        });
      });

      // Verifica que renderMediaOnWeb foi chamado com speedPaintMultipliers nos inputProps
      expect(mockRenderMediaOnWeb).toHaveBeenCalledTimes(1);
      const callArgs = mockRenderMediaOnWeb.mock.calls[0][0] as Record<string, unknown>;
      const inputProps = callArgs.inputProps as Record<string, unknown>;
      expect(inputProps.speedPaintMultipliers).toEqual(multipliers);
    });

    it('não inclui speedPaintMultipliers nos inputProps quando omitido', async () => {
      mockGenerateScenesWithSpeedPaint.mockResolvedValue([
        { animation: undefined, sceneIndex: 0 },
      ]);

      const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
      const { result } = renderHook(() => useVideoExporter());

      await act(async () => {
        await result.current.startRender({
          scenes: [createMinimalStudioScene()],
          audioUrl: 'audio.mp3',
          fps: 30,
          durationInFrames: 90,
          ratio: '16:9',
          animateScenes: false,
          // sem speedPaintMultipliers
        });
      });

      expect(mockRenderMediaOnWeb).toHaveBeenCalledTimes(1);
      const callArgs = mockRenderMediaOnWeb.mock.calls[0][0] as Record<string, unknown>;
      const inputProps = callArgs.inputProps as Record<string, unknown>;
      expect(inputProps.speedPaintMultipliers).toBeUndefined();
    });

    it('repassa speedPaintSpeed nos inputProps do renderMediaOnWeb', async () => {
      mockGenerateScenesWithSpeedPaint.mockResolvedValue([
        { animation: undefined, sceneIndex: 0 },
      ]);

      const { useVideoExporter } = await import('../../src/features/video-render/hooks/useVideoExporter');
      const { result } = renderHook(() => useVideoExporter());

      await act(async () => {
        await result.current.startRender({
          scenes: [createMinimalStudioScene()],
          audioUrl: 'audio.mp3',
          fps: 30,
          durationInFrames: 90,
          ratio: '16:9',
          animateScenes: false,
          speedPaintSpeed: 'fast',
        });
      });

      const callArgs = mockRenderMediaOnWeb.mock.calls[0][0] as Record<string, unknown>;
      const inputProps = callArgs.inputProps as Record<string, unknown>;
      expect(inputProps.speedPaintSpeed).toBe('fast');
    });
  });
});
