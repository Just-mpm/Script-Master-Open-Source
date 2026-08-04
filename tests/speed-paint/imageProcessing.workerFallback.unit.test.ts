/**
 * Testes do fallback main-thread do Web Worker no pipeline vetorial.
 *
 * v0.135.2 (F10 da auditoria): valida o try/catch que `processVetorialInWorker`
 * adiciona em torno de `new Worker(url, { type: 'module' })` —
 * em CSP restritivo, sandbox ou navegador sem suporte a module workers,
 * o construtor lança `Error`. Sem o try/catch, a exceção vira unhandled
 * rejection e a Promise nunca settle (job eternamente em 'processing').
 *
 * O teste simula o cenário mockando o construtor `Worker` para lançar,
 * e verifica que `generateStrokesFromImage` resolve normalmente via
 * fallback `processVetorialOnMainThread`.
 *
 * Espelha o mesmo padrão do fallback em `createStrokeWorker` (F6).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks de Canvas, Image e Worker ─────────────────────────────────

class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace = 'srgb' as const;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

class MockCanvas {
  width = 0;
  height = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ctx: any = {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, w: number, h: number) =>
      new MockImageData(w, h),
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getContext(_type: string): unknown {
    return this.ctx;
  }
  toDataURL(): string {
    return 'data:image/jpeg;base64,mock';
  }
}

const IMAGE_MOCK_WIDTH = 100;
const IMAGE_MOCK_HEIGHT = 100;

// ─── Image mock: handlers capturáveis (mesmo padrão de imageProcessing.unit.test.ts) ──

let _imageOnLoad: (() => void) | null = null;

function setupImageMock() {
  _imageOnLoad = null;
  vi.stubGlobal(
    'Image',
    class {
      width = IMAGE_MOCK_WIDTH;
      height = IMAGE_MOCK_HEIGHT;
      _src = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _onload: ((...args: any[]) => void) | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _onerror: ((...args: any[]) => void) | null = null;

      set src(_val: string) {
        /* noop — o teste invoca onload via triggerLoad() */
      }
      get src() {
        return this._src;
      }

      set onload(fn: (() => void) | null) {
        this._onload = fn;
        _imageOnLoad = fn;
      }
      get onload() {
        return this._onload;
      }

      set onerror(fn: (() => void) | null) {
        this._onerror = fn;
      }
      get onerror() {
        return this._onerror;
      }

      crossOrigin = '';
      decode() {
        return Promise.resolve();
      }
      addEventListener() {}
      removeEventListener() {}
    },
  );
}

function triggerLoad() {
  if (_imageOnLoad) _imageOnLoad();
}

function setupCanvasMock() {
  const origCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return new MockCanvas() as unknown as HTMLCanvasElement;
    }
    return origCreateElement(tag);
  });
}

function setupWorkerThrowMock() {
  // v0.135.2 (F10): mock do `Worker` global para lançar no construtor.
  // Simula CSP restritivo / sandbox / navegador sem suporte a module workers.
  // Em jsdom, `Worker` não existe por padrão — usamos `stubGlobal` para
  // criar a propriedade antes de fazer o spy.
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        throw new Error(
          'Worker constructor failed (simulated CSP/sandbox restriction)',
        );
      }
    } as unknown as typeof Worker,
  );
}

// ─── Testes ──────────────────────────────────────────────────────────

describe('imageProcessing — fallback do Worker vetorial (v0.135.2 / F10)', () => {
  let generateStrokesFromImage: typeof import('../../src/features/speed-paint/lib/imageProcessing').generateStrokesFromImage;

  beforeEach(async () => {
    vi.resetModules();
    _imageOnLoad = null;
    setupCanvasMock();
    setupImageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('cai para processVetorialOnMainThread quando Worker constructor lança', async () => {
    // Arrange — Worker constructor lança (CSP simulado)
    setupWorkerThrowMock();
    const mod = await import('../../src/features/speed-paint/lib/imageProcessing');
    generateStrokesFromImage = mod.generateStrokesFromImage;

    // Act — gera vetorial (deve cair no fallback main-thread)
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial', vetorialPreset: 'edge-default' },
    );
    triggerLoad();

    // Assert — resolve via fallback com `VetorialAnimation` válida
    const animation = (await promise) as import('../../src/features/speed-paint/types/vetorial').VetorialAnimation;
    expect(animation).toBeDefined();
    expect(animation).toHaveProperty('paths');
    expect(Array.isArray(animation.paths)).toBe(true);
    expect(animation.canvasWidth).toBe(IMAGE_MOCK_WIDTH);
    expect(animation.canvasHeight).toBe(IMAGE_MOCK_HEIGHT);
  }, 10_000);
});
