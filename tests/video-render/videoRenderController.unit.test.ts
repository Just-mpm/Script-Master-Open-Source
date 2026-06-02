/**
 * Testes do controller singleton de renderização de vídeo (M1).
 *
 * Valida que:
 * - Estado inicial é `idle` com valores padrão
 * - `startRender` invoca `renderMediaOnWeb` e atualiza o estado
 * - `cancelRender` preserva o blob completo
 * - `reset` revoga `outputUrl` via `URL.revokeObjectURL`
 * - 2 chamadas a `startRender` em paralelo: a 1ª é abortada, a 2ª continua
 *
 * @see videoRenderController contract — `docs/plan/video-render-survive-navigation-architecture.md §3 M1`
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────

const mockRenderMediaOnWeb = vi.fn();
const mockGetBlob = vi.fn();

vi.mock('@remotion/web-renderer', () => ({
  renderMediaOnWeb: (...args: unknown[]) => mockRenderMediaOnWeb(...args),
}));

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

vi.mock('../../src/features/video-render/lib/speedPaintService', () => ({
  enhanceScenesWithSpeedPaint: vi.fn().mockImplementation(async (scenes: unknown[]) => ({
    scenes,
    warnings: [],
  })),
}));

vi.mock('../../src/features/video-render/lib/strokeCache', () => ({
  clearStrokeCache: vi.fn(),
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
  setLoggerUserId: vi.fn(),
}));

vi.mock('../../src/lib/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
  categorizeAnalyticsError: () => 'unknown',
}));

// ─── Helpers ───────────────────────────────────────────────────

function createMinimalStudioScene() {
  return {
    imageUrl: 'scene1.png',
    prompt: 'test prompt',
    timestamp: 0,
  };
}

// ─── Testes ────────────────────────────────────────────────────

describe('videoRenderController (M1 — singleton Zustand)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useVideoRenderController } = await import(
      '../../src/features/video-render/store/videoRenderController'
    );
    useVideoRenderController.getState().reset();
  });

  it('estado inicial é idle com valores padrão', async () => {
    const { useVideoRenderController } = await import(
      '../../src/features/video-render/store/videoRenderController'
    );
    const state = useVideoRenderController.getState();
    expect(state.status).toBe('idle');
    expect(state.isRendering).toBe(false);
    expect(state.renderProgress).toBe(0);
    expect(state.renderStatusText).toBe('');
    expect(state.outputBlob).toBeNull();
    expect(state.outputUrl).toBeNull();
    expect(state.error).toBeNull();
    expect(state.startedAt).toBeNull();
    expect(state.speedPaintWarnings).toEqual([]);
    expect(state.kind).toBe('video');
  });

  it('startRender invoca renderMediaOnWeb e marca status como completed', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'video/mp4' });
    mockGetBlob.mockResolvedValue(fakeBlob);
    mockRenderMediaOnWeb.mockResolvedValue({ getBlob: mockGetBlob });

    const { useVideoRenderController } = await import(
      '../../src/features/video-render/store/videoRenderController'
    );

    await useVideoRenderController.getState().startRender({
      scenes: [createMinimalStudioScene()],
      audioUrl: 'audio.mp3',
      fps: 30,
      durationInFrames: 90,
      ratio: '16:9',
    });

    expect(mockRenderMediaOnWeb).toHaveBeenCalledTimes(1);
    const state = useVideoRenderController.getState();
    expect(state.status).toBe('completed');
    expect(state.isRendering).toBe(false);
    expect(state.renderProgress).toBe(100);
    expect(state.outputBlob).toBe(fakeBlob);
    expect(state.outputUrl).toMatch(/^blob:/);
  });

  it('cancelRender preserva outputBlob quando render já completou', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'video/mp4' });
    mockGetBlob.mockResolvedValue(fakeBlob);
    mockRenderMediaOnWeb.mockResolvedValue({ getBlob: mockGetBlob });

    const { useVideoRenderController } = await import(
      '../../src/features/video-render/store/videoRenderController'
    );

    await useVideoRenderController.getState().startRender({
      scenes: [createMinimalStudioScene()],
      audioUrl: 'audio.mp3',
      fps: 30,
      durationInFrames: 90,
      ratio: '16:9',
    });

    const urlBefore = useVideoRenderController.getState().outputUrl;
    expect(urlBefore).toMatch(/^blob:/);

    useVideoRenderController.getState().cancelRender();

    const state = useVideoRenderController.getState();
    // Blob preservado após cancel, apenas status muda
    expect(state.outputBlob).toBe(fakeBlob);
    expect(state.outputUrl).toBe(urlBefore);
    expect(state.status).toBe('cancelled');
  });

  it('reset revoga outputUrl via URL.revokeObjectURL', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'video/mp4' });
    mockGetBlob.mockResolvedValue(fakeBlob);
    mockRenderMediaOnWeb.mockResolvedValue({ getBlob: mockGetBlob });

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const { useVideoRenderController } = await import(
      '../../src/features/video-render/store/videoRenderController'
    );

    await useVideoRenderController.getState().startRender({
      scenes: [createMinimalStudioScene()],
      audioUrl: 'audio.mp3',
      fps: 30,
      durationInFrames: 90,
      ratio: '16:9',
    });

    const urlBefore = useVideoRenderController.getState().outputUrl;
    expect(urlBefore).toMatch(/^blob:/);

    useVideoRenderController.getState().reset();

    const state = useVideoRenderController.getState();
    expect(state.outputBlob).toBeNull();
    expect(state.outputUrl).toBeNull();
    expect(state.status).toBe('idle');
    expect(revokeSpy).toHaveBeenCalledWith(urlBefore);

    revokeSpy.mockRestore();
  });

  it('2 chamadas a startRender em paralelo: a 1ª é abortada, a 2ª continua', async () => {
    // Render #1: nunca resolve (simula render demorado)
    let resolveFirst: ((value: unknown) => void) | null = null;
    mockRenderMediaOnWeb.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
    );

    // Render #2: resolve rapidamente
    const fakeBlob = new Blob(['fake2'], { type: 'video/mp4' });
    mockGetBlob.mockResolvedValue(fakeBlob);
    mockRenderMediaOnWeb.mockResolvedValueOnce({ getBlob: mockGetBlob });

    const { useVideoRenderController } = await import(
      '../../src/features/video-render/store/videoRenderController'
    );

    // Inicia render #1 (não-awaita — fica pendente)
    const promise1 = useVideoRenderController.getState().startRender({
      scenes: [createMinimalStudioScene()],
      audioUrl: 'audio.mp3',
      fps: 30,
      durationInFrames: 90,
      ratio: '16:9',
    });

    // Aguarda microtasks para #1 entrar em render
    await new Promise((r) => setTimeout(r, 10));

    // Inicia render #2 (cancela #1 internamente)
    await useVideoRenderController.getState().startRender({
      scenes: [createMinimalStudioScene()],
      audioUrl: 'audio2.mp3',
      fps: 30,
      durationInFrames: 90,
      ratio: '16:9',
    });

    // Estado final reflete #2
    const state = useVideoRenderController.getState();
    expect(state.status).toBe('completed');
    expect(state.outputBlob).toBe(fakeBlob);

    // Limpa #1 (resolve com blob descartado — será ignorado por renderId)
    if (resolveFirst) {
      (resolveFirst as (value: unknown) => void)({ getBlob: () => Promise.resolve(new Blob(['fake1'])) });
    }
    // Aguarda promise1 terminar (não deve sobrescrever estado)
    await promise1.catch(() => {
      // ignore
    });
  });

  it('startRender bloqueia exportação quando durationInFrames é 0', async () => {
    const { useVideoRenderController } = await import(
      '../../src/features/video-render/store/videoRenderController'
    );

    await useVideoRenderController.getState().startRender({
      scenes: [createMinimalStudioScene()],
      audioUrl: 'audio.mp3',
      fps: 30,
      durationInFrames: 0,
      ratio: '16:9',
    });

    expect(mockRenderMediaOnWeb).not.toHaveBeenCalled();
    const state = useVideoRenderController.getState();
    expect(state.status).toBe('idle');
    expect(state.isRendering).toBe(false);
    expect(state.error).toMatch(/duração do áudio/);
  });

  it('startRender falha graciosamente quando renderMediaOnWeb lança', async () => {
    mockRenderMediaOnWeb.mockRejectedValue(new Error('WebCodecs não suportado'));

    const { useVideoRenderController } = await import(
      '../../src/features/video-render/store/videoRenderController'
    );

    await useVideoRenderController.getState().startRender({
      scenes: [createMinimalStudioScene()],
      audioUrl: 'audio.mp3',
      fps: 30,
      durationInFrames: 90,
      ratio: '16:9',
    });

    const state = useVideoRenderController.getState();
    expect(state.status).toBe('failed');
    expect(state.isRendering).toBe(false);
    expect(state.error).toBeTruthy();
  });
});
