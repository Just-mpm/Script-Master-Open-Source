import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '../../src/features/i18n';

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

const mockDownloadFile = vi.fn().mockResolvedValue(undefined);
const mockGetBlob = vi.fn().mockResolvedValue(new Blob(['fake-video'], { type: 'video/mp4' }));
const mockRenderMediaOnWeb = vi.fn().mockResolvedValue({ getBlob: mockGetBlob });
const mockGenerateStrokesFromImage = vi.fn();
const mockCheckSupport = vi.fn().mockResolvedValue(true);
const mockResetSupport = vi.fn();

vi.mock('@remotion/web-renderer', () => ({
  renderMediaOnWeb: (...args: unknown[]) => mockRenderMediaOnWeb(...args),
}));

vi.mock('../../src/features/video-render/components/SpeedPaintScene', () => ({
  SpeedPaintScene: () => null,
}));

vi.mock('../../src/features/video-render/lib/canvasFontStretchPatch', () => ({
  patchCanvasFontStretch: vi.fn(),
}));

vi.mock('../../src/features/video-render/lib/exportUtils', async () => {
  const actual = await vi.importActual<typeof import('../../src/features/video-render/lib/exportUtils')>('../../src/features/video-render/lib/exportUtils');
  return actual;
});

vi.mock('../../src/features/video-render/hooks/useCodecSupport', () => ({
  useCodecSupport: () => ({
    canRender: true,
    resolvedVideoCodec: 'h264',
    resolvedContainer: 'mp4',
    supportError: null,
    checkSupport: (...args: unknown[]) => mockCheckSupport(...args),
    resetSupport: (...args: unknown[]) => mockResetSupport(...args),
  }),
}));

vi.mock('../../src/features/speed-paint/lib/imageProcessing', () => ({
  generateStrokesFromImage: (...args: unknown[]) => mockGenerateStrokesFromImage(...args),
}));

vi.mock('../../src/lib/download', () => ({
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useSpeedPaintExporter', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    class MockImage {
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public naturalWidth = 1920;
      public naturalHeight = 1080;
      public width = 1920;
      public height = 1080;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }

    vi.stubGlobal('Image', MockImage);
    mockGenerateStrokesFromImage.mockResolvedValue({
      id: 'anim-batch',
      canvasWidth: 1920,
      canvasHeight: 1080,
      canvasColor: 'white',
      totalFrames: 120,
      fps: 30,
      totalDurationMs: 4000,
      strokes: [],
    });
    mockCheckSupport.mockResolvedValue(true);
  });

  it('dispara download automático quando autoDownload é true', async () => {
    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { result } = renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startRender({
        animation: {
          id: 'anim-1',
          canvasWidth: 1920,
          canvasHeight: 1080,
          canvasColor: 'white',
          totalFrames: 120,
          fps: 30,
          totalDurationMs: 4000,
          strokes: [],
        },
        imageSource: 'data:image/png;base64,abc',
        fps: 30,
        durationInFrames: 120,
        quality: '1080p',
        drawSpeed: 1,
        paintSpeed: 1,
        fileName: 'lote-01',
        autoDownload: true,
      });
    });

    expect(mockDownloadFile).toHaveBeenCalledTimes(1);
    expect(mockDownloadFile).toHaveBeenCalledWith(expect.stringMatching(/^blob:/), 'lote-01.mp4');
  });

  it('gera um único vídeo final no startBatchRender', async () => {
    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { result } = renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startBatchRender({
        items: [
          { imageSource: 'data:image/png;base64,aaa' },
          { imageSource: 'data:image/png;base64,bbb' },
        ],
        fps: 30,
        quality: '1080p',
        drawSpeed: 1,
        paintSpeed: 1,
        fileName: 'fila-completa',
      });
    });

    expect(mockGenerateStrokesFromImage).toHaveBeenCalledTimes(2);
    expect(mockRenderMediaOnWeb).toHaveBeenCalledTimes(1);
    expect(mockDownloadFile).toHaveBeenCalledWith(expect.stringMatching(/^blob:/), 'fila-completa.mp4');
    expect(result.current.renderStatusText).toBe('Vídeo final do lote concluído!');
  });

  it('interrompe o lote antes de gerar animações quando o navegador não suporta exportação', async () => {
    mockCheckSupport.mockResolvedValue(false);

    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { result } = renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startBatchRender({
        items: [{ imageSource: 'data:image/png;base64,aaa' }],
        fps: 30,
        quality: '1080p',
        drawSpeed: 1,
        paintSpeed: 1,
        fileName: 'sem-suporte',
      });
    });

    expect(mockGenerateStrokesFromImage).not.toHaveBeenCalled();
    expect(mockRenderMediaOnWeb).not.toHaveBeenCalled();
    expect(result.current.canRender).toBe(false);
  });

  it('cancela o lote durante a geração das animações', async () => {
    mockGenerateStrokesFromImage.mockImplementation((_imageSource: string, _onProgress: (p: number) => void, options?: { signal?: AbortSignal }) =>
      new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      }));

    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { result } = renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    await act(async () => {
      const exportPromise = result.current.startBatchRender({
        items: [{ imageSource: 'data:image/png;base64,aaa' }],
        fps: 30,
        quality: '1080p',
        drawSpeed: 1,
        paintSpeed: 1,
        fileName: 'cancelado-geracao',
      });

      result.current.handleCancel();
      await exportPromise;
    });

    expect(mockRenderMediaOnWeb).not.toHaveBeenCalled();
    expect(result.current.wasCancelled).toBe(true);
    expect(result.current.renderStatusText).toBe('Exportação cancelada.');
  });

  it('cancela o lote durante a renderização final', async () => {
    mockRenderMediaOnWeb.mockImplementation(({ signal }: { signal: AbortSignal }) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      }));

    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { result } = renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    await act(async () => {
      const exportPromise = result.current.startBatchRender({
        items: [{ imageSource: 'data:image/png;base64,aaa' }],
        fps: 30,
        quality: '1080p',
        drawSpeed: 1,
        paintSpeed: 1,
        fileName: 'cancelado-render',
      });

      await Promise.resolve();
      result.current.handleCancel();
      await exportPromise;
    });

    expect(result.current.wasCancelled).toBe(true);
    expect(result.current.renderStatusText).toBe('Exportação cancelada.');
  });

  it('reset também limpa o estado de suporte do codec', async () => {
    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { result } = renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    act(() => {
      result.current.reset();
    });

    expect(mockResetSupport).toHaveBeenCalledTimes(1);
  });
});
