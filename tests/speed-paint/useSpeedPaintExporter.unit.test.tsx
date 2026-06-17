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
  setLoggerUserId: vi.fn(),
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
        showDrawTool: true,
        fileName: 'fila-completa',
        sceneDurationSeconds: 15,
      });
    });

    expect(mockGenerateStrokesFromImage).toHaveBeenCalledTimes(2);
    expect(mockRenderMediaOnWeb).toHaveBeenCalledTimes(1);
    expect(mockDownloadFile).toHaveBeenCalledWith(expect.stringMatching(/^blob:/), 'fila-completa.mp4');
    // Controller usa a mesma string final para single e batch (migração M2).
    expect(result.current.renderStatusText).toBe('Exportação concluída!');
  });

  it('mantém a duração escolhida por cena no lote', async () => {
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
        showDrawTool: true,
        fileName: 'fila-lenta',
        sceneDurationSeconds: 30,
      });
    });

    expect(mockRenderMediaOnWeb).toHaveBeenCalledTimes(1);
    const renderCall = mockRenderMediaOnWeb.mock.calls[0]?.[0] as {
      composition: { durationInFrames: number };
      inputProps: { sceneDurationInFrames: number; sceneStepFrames: number; timingMode: string };
    };

    expect(renderCall.inputProps.sceneDurationInFrames).toBe(900);
    expect(renderCall.inputProps.sceneStepFrames).toBe(870);
    expect(renderCall.inputProps.timingMode).toBe('sequenced-batch');
    expect(renderCall.composition.durationInFrames).toBe(1770);
  });

  it('sincroniza codec/container do codecSupport para o controller', async () => {
    // Responsabilidade migrada para a fachada (migração M2 — ver
    // `useSpeedPaintExporter` JSDoc): a fachada detecta suporte via
    // `useCodecSupport` local e propaga codec/container resolvidos para o
    // controller, que NÃO chama `checkSupport` por conta própria.
    // O preflight de bloqueio foi removido — o controller processa a fila
    // e a `useCodecSupport` (state local) é quem sinaliza suporte via UI.
    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { useSpeedPaintRenderController } = await import('../../src/features/speed-paint/store/speedPaintRenderController');

    renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    // Aguarda o useEffect de sincronização rodar após o render inicial
    await act(async () => {
      await Promise.resolve();
    });

    const state = useSpeedPaintRenderController.getState();
    expect(state.codec).toBe('h264');
    expect(state.container).toBe('mp4');
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
        showDrawTool: true,
        fileName: 'cancelado-geracao',
        sceneDurationSeconds: 15,
      });

      result.current.handleCancel();
      await exportPromise;
    });

    expect(mockRenderMediaOnWeb).not.toHaveBeenCalled();
    expect(result.current.wasCancelled).toBe(true);
    expect(result.current.renderStatusText).toBe('Exportação cancelada.');
  });

  it('cancela o lote durante a renderização final', async () => {
    // Edge case: o controller pode chegar em `renderMediaOnWeb` com o signal
    // JÁ aborted (se `handleCancel` foi chamado antes do lazy import resolver).
    // `addEventListener('abort', ...)` NÃO dispara retroativamente em signals
    // já aborted — precisa checar `signal.aborted` para rejeitar de imediato.
    mockRenderMediaOnWeb.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      if (signal.aborted) {
        return Promise.reject(new DOMException('aborted', 'AbortError'));
      }
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      });
    });

    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { result } = renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    await act(async () => {
      const exportPromise = result.current.startBatchRender({
        items: [{ imageSource: 'data:image/png;base64,aaa' }],
        fps: 30,
        quality: '1080p',
        showDrawTool: true,
        fileName: 'cancelado-render',
        sceneDurationSeconds: 15,
      });

      await Promise.resolve();
      result.current.handleCancel();
      await exportPromise;
    });

    expect(result.current.wasCancelled).toBe(true);
    expect(result.current.renderStatusText).toBe('Exportação cancelada.');
  });

  it('resetSupport delega para o codecSupport local (state por-instância)', async () => {
    // Responsabilidade separada na fachada (migração M2):
    // - `reset()`         → limpa o estado do CONTROLLER (singleton)
    // - `resetSupport()`  → limpa o estado do `useCodecSupport` LOCAL (per-mount)
    // O test antigo misturava os dois, mas o codecSupport não migra para o
    // controller (state é por-instância, não cross-route).
    const { useSpeedPaintExporter } = await import('../../src/features/speed-paint/hooks/useSpeedPaintExporter');
    const { result } = renderHook(() => useSpeedPaintExporter(), { wrapper: Wrapper });

    act(() => {
      result.current.resetSupport();
    });

    expect(mockResetSupport).toHaveBeenCalledTimes(1);
  });
});
