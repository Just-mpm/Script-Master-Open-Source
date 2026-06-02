/**
 * Testes do hook useCrossRouteRenderGuard (M5).
 *
 * Valida que:
 * - `beforeunload` é registrado quando há render em andamento
 * - `beforeunload` NÃO é registrado quando nenhum render está ativo
 * - Listeners são removidos no cleanup
 * - `document.title` muda conforme o status (rendering / completed / failed / idle)
 * - `beforeunload` também dispara quando há geração de áudio em andamento
 *   (regressão coberta pelo GAP-09 da auditoria)
 *
 * @see useCrossRouteRenderGuard contract — `docs/plan/video-render-survive-navigation-architecture.md §3 M5`
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// ─── Mocks dos controllers (singleton) ────────────────────────

const mockVideoState = {
  isRendering: false,
  status: 'idle' as 'idle' | 'preparing' | 'rendering' | 'completed' | 'cancelled' | 'failed',
};

const mockSpeedPaintState = {
  isRendering: false,
  status: 'idle' as 'idle' | 'preparing' | 'rendering' | 'completed' | 'cancelled' | 'failed',
};

const mockAudioState = {
  isGenerating: false,
};

vi.mock('../../src/features/video-render/store/videoRenderController', () => ({
  useVideoRenderController: {
    getState: () => mockVideoState,
  },
}));

vi.mock('../../src/features/speed-paint/store/speedPaintRenderController', () => ({
  useSpeedPaintRenderController: {
    getState: () => mockSpeedPaintState,
  },
}));

vi.mock('../../src/features/studio/store/audioGeneratorStore', () => ({
  useAudioGeneratorStore: {
    getState: () => mockAudioState,
  },
}));

// ─── Testes ────────────────────────────────────────────────────

describe('useCrossRouteRenderGuard (M5)', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;
  let docAddSpy: ReturnType<typeof vi.spyOn>;
  let docRemoveSpy: ReturnType<typeof vi.spyOn>;
  let originalTitle: string;

  beforeEach(() => {
    mockVideoState.isRendering = false;
    mockVideoState.status = 'idle';
    mockSpeedPaintState.isRendering = false;
    mockSpeedPaintState.status = 'idle';
    mockAudioState.isGenerating = false;

    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
    docAddSpy = vi.spyOn(document, 'addEventListener');
    docRemoveSpy = vi.spyOn(document, 'removeEventListener');

    originalTitle = document.title;
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
    docAddSpy.mockRestore();
    docRemoveSpy.mockRestore();
    document.title = originalTitle;
    vi.useRealTimers();
  });

  it('registra listeners (beforeunload, visibilitychange) ao montar', async () => {
    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    renderHook(() => useCrossRouteRenderGuard());

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(docAddSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('remove listeners no cleanup', async () => {
    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    const { unmount } = renderHook(() => useCrossRouteRenderGuard());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(docRemoveSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('beforeunload chama preventDefault quando há render em andamento', async () => {
    mockVideoState.isRendering = true;
    mockVideoState.status = 'rendering';

    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    renderHook(() => useCrossRouteRenderGuard());

    // Encontra o handler de beforeunload
    const beforeUnloadCall = addSpy.mock.calls.find(
      ([event]: [string, EventListenerOrEventListenerObject]) => event === 'beforeunload',
    );
    expect(beforeUnloadCall).toBeDefined();
    const handler = beforeUnloadCall?.[1] as (event: BeforeUnloadEvent) => void;

    // Simula o evento
    const event = { preventDefault: vi.fn() } as unknown as BeforeUnloadEvent;
    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('beforeunload NÃO chama preventDefault quando nenhum render está ativo', async () => {
    mockVideoState.isRendering = false;
    mockVideoState.status = 'idle';
    mockSpeedPaintState.isRendering = false;
    mockSpeedPaintState.status = 'idle';
    mockAudioState.isGenerating = false;

    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    renderHook(() => useCrossRouteRenderGuard());

    const beforeUnloadCall = addSpy.mock.calls.find(
      ([event]: [string, EventListenerOrEventListenerObject]) => event === 'beforeunload',
    );
    const handler = beforeUnloadCall?.[1] as (event: BeforeUnloadEvent) => void;

    const event = { preventDefault: vi.fn() } as unknown as BeforeUnloadEvent;
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('beforeunload chama preventDefault quando há geração de áudio em andamento (regressão GAP-09)', async () => {
    mockVideoState.isRendering = false;
    mockVideoState.status = 'idle';
    mockSpeedPaintState.isRendering = false;
    mockSpeedPaintState.status = 'idle';
    mockAudioState.isGenerating = true;

    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    renderHook(() => useCrossRouteRenderGuard());

    const beforeUnloadCall = addSpy.mock.calls.find(
      ([event]: [string, EventListenerOrEventListenerObject]) => event === 'beforeunload',
    );
    expect(beforeUnloadCall).toBeDefined();
    const handler = beforeUnloadCall?.[1] as (event: BeforeUnloadEvent) => void;

    const event = { preventDefault: vi.fn() } as unknown as BeforeUnloadEvent;
    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('document.title reflete o status do controller (rendering)', async () => {
    mockVideoState.isRendering = true;
    mockVideoState.status = 'rendering';

    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    renderHook(() => useCrossRouteRenderGuard());

    // updateTitle é chamado imediatamente no useEffect
    expect(document.title).toBe('🎥 Renderizando — Script Master');
  });

  it('document.title reflete completed', async () => {
    mockVideoState.status = 'completed';
    mockSpeedPaintState.status = 'completed';

    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    renderHook(() => useCrossRouteRenderGuard());

    expect(document.title).toBe('✅ Vídeo pronto! — Script Master');
  });

  it('document.title reflete failed', async () => {
    mockVideoState.status = 'failed';
    mockSpeedPaintState.status = 'failed';

    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    renderHook(() => useCrossRouteRenderGuard());

    expect(document.title).toBe('❌ Falha na exportação — Script Master');
  });

  it('document.title volta ao default quando idle', async () => {
    mockVideoState.status = 'idle';
    mockSpeedPaintState.status = 'idle';
    document.title = 'Algo customizado';

    const { useCrossRouteRenderGuard } = await import(
      '../../src/hooks/useCrossRouteRenderGuard'
    );
    renderHook(() => useCrossRouteRenderGuard());

    expect(document.title).toBe('Script Master');
  });
});
