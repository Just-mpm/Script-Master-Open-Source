/**
 * Testes de integração do pipeline vetorial do Speed Paint.
 *
 * Valida end-to-end: `dataUrl` → `Image` → canvas → `ImageData` → `vectorizeImage` →
 * `VetorialAnimation` (via `processVetorialOnMainThread`).
 *
 * Cobre:
 * (1) Tipo discriminado `VetorialAnimation` (tem `paths`, NÃO tem `strokes`)
 * (2) Presets customizados (`vetorialPreset: 'detailed'`)
 * (3) Default do preset (`'artistic1'`)
 * (4) `onProgress` chamado com valores 0..1
 * (5) `AbortSignal` abortado rejeita com `AbortError`
 * (6) Retrocompatibilidade do modo mask (sem `renderMode` → `StrokeAnimation`)
 * (7) `renderMode: 'mask'` explícito → `StrokeAnimation`
 * (8) `totalLength` = soma dos `length` de cada path
 * (9) `totalDurationMs` = `max(2000, paths.length * 80)`
 *
 * ## Decisão de escopo (Premissa #15 do tracker)
 *
 * Snapshot/render de componente Remotion (`WhiteboardScene`) está fora do
 * escopo — seria pioneirismo. Testamos apenas o pipeline de geração
 * (`processOnMainThreadVetorial`), mesmo padrão de
 * `imageProcessing.unit.test.ts` (mask) e `vectorizer.unit.test.ts`.
 *
 * @see `src/features/speed-paint/lib/imageProcessing.ts`
 * @see `src/features/speed-paint/lib/vectorizer.ts`
 * @see `tests/speed-paint/imageProcessing.unit.test.ts`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  StrokeAnimation,
  VetorialAnimation,
} from '../../src/features/speed-paint/types';

// ─── Mock do Firebase para evitar re-inicialização após vi.resetModules() ──
// Cadeia de imports: imageProcessing → logger → batch-processor → firebase
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  collection: vi.fn().mockReturnValue({}),
  addDoc: vi.fn().mockResolvedValue({}),
  doc: vi.fn().mockReturnValue({}),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
  functions: {},
}));

// ─── Mock do Canvas API e Image para jsdom ────────────────────────

/**
 * `MockImageData` com pixels reais: fundo branco + quadrado preto central.
 *
 * Espelha o helper `makeTestImageData` do `vectorizer.unit.test.ts` — o
 * `imagetracerjs` precisa de contraste (pixels diferentes) para produzir
 * paths. Sem isso, vetoriza para 0 paths e os testes de `totalLength` /
 * `paths.length` ficam flakies.
 */
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);

    // Fundo branco opaco
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = 255;
      this.data[i + 1] = 255;
      this.data[i + 2] = 255;
      this.data[i + 3] = 255;
    }

    // Quadrado preto central — garante contraste para vetorização
    const x0 = Math.max(1, Math.floor(width / 4));
    const y0 = Math.max(1, Math.floor(height / 4));
    const x1 = Math.min(width - 1, Math.floor((width * 3) / 4));
    const y1 = Math.min(height - 1, Math.floor((height * 3) / 4));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * width + x) * 4;
        this.data[idx] = 0;
        this.data[idx + 1] = 0;
        this.data[idx + 2] = 0;
        this.data[idx + 3] = 255;
      }
    }
  }
}

class MockCanvas {
  _width = 0;
  _height = 0;

  get width() { return this._width; }
  set width(v: number) { this._width = v; }
  get height() { return this._height; }
  set height(v: number) { this._height = v; }

  getContext(_type: string): MockCanvasRenderingContext2D | null {
    return new MockCanvasRenderingContext2D(this._width, this._height);
  }

  toDataURL(): string {
    return 'data:image/jpeg;base64,mock';
  }
}

class MockCanvasRenderingContext2D {
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineCap: string = 'round';
  lineJoin: string = 'round';
  lineWidth = 1;
  globalCompositeOperation = 'source-over';

  constructor(private _w: number, private _h: number) {}

  fillRect() {}
  drawImage() {}
  clearRect() {}
  beginPath() {}
  stroke() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}

  /**
   * Retorna `MockImageData` com pixels reais (fundo + quadrado preto).
   * Diferente do `imageProcessing.unit.test.ts` (que retorna zerado), aqui
   * precisamos de contraste para o `imagetracerjs` gerar paths.
   */
  getImageData(_x: number, _y: number, w: number, h: number): MockImageData {
    return new MockImageData(w, h);
  }

  toDataURL(): string {
    return 'data:image/jpeg;base64,mock';
  }

  createImageData(w: number, h: number): MockImageData {
    return new MockImageData(w, h);
  }
}

// ─── Image mock com onload/onerror capturáveis ───────────────────

let _imageOnLoad: (() => void) | null = null;
let _imageOnError: (() => void) | null = null;

function createImageMock(imgWidth: number, imgHeight: number) {
  _imageOnLoad = null;
  _imageOnError = null;

  vi.stubGlobal('Image', class {
    width = imgWidth;
    height = imgHeight;
    _src = '';
    _onload: (() => void) | null = null;
    _onerror: (() => void) | null = null;

    set src(val: string) { this._src = val; }
    get src() { return this._src; }

    set onload(fn: (() => void) | null) {
      this._onload = fn;
      _imageOnLoad = fn;
    }
    get onload() { return this._onload; }

    set onerror(fn: (() => void) | null) {
      this._onerror = fn;
      _imageOnError = fn;
    }
    get onerror() { return this._onerror; }

    crossOrigin = '';
    decode() { return Promise.resolve(); }
    addEventListener() {}
    removeEventListener() {}
  });

  function triggerLoad() {
    if (_imageOnLoad) _imageOnLoad();
  }

  function triggerError() {
    if (_imageOnError) _imageOnError();
  }

  return { triggerLoad, triggerError };
}

// ─── Canvas mock no document.createElement ─────────────────────────
// vi.spyOn intercepta a referência real do jsdom, ao contrário de vi.stubGlobal
// que substitui o objeto global mas pode não afetar referências internas do jsdom.
const origCreateElement = document.createElement.bind(document);
let createElementSpy: ReturnType<typeof vi.spyOn>;

function setupCanvasMock() {
  createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return new MockCanvas() as unknown as HTMLCanvasElement;
    }
    return origCreateElement(tag);
  });
}

// ─── Testes ──────────────────────────────────────────────────────────

describe('generateStrokesFromImage — modo vetorial', () => {
  let generateStrokesFromImage: typeof import('../../src/features/speed-paint/lib/imageProcessing').generateStrokesFromImage;

  beforeEach(async () => {
    vi.resetModules();
    setupCanvasMock();
    createImageMock(100, 100);

    const mod = await import('../../src/features/speed-paint/lib/imageProcessing');
    generateStrokesFromImage = mod.generateStrokesFromImage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna VetorialAnimation quando renderMode é vetorial', async () => {
    // Arrange
    const { triggerLoad } = createImageMock(100, 100);

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial' },
    );
    triggerLoad();

    const animation = (await promise) as VetorialAnimation;

    // Assert — tipo discriminado
    expect(animation).toHaveProperty('paths');
    expect(animation).not.toHaveProperty('strokes');
    expect(animation).toHaveProperty('sourcePreset');
    expect(animation).toHaveProperty('totalLength');
    expect(animation.fps).toBe(60);
    expect(animation.canvasWidth).toBe(100);
    expect(animation.canvasHeight).toBe(100);
    expect(animation.canvasColor).toBe('white');
    expect(animation.id).toBeTruthy();
    expect(animation.resizedImage).toBeTruthy();
  });

  it('respeita vetorialPreset customizado', async () => {
    // Arrange
    const { triggerLoad } = createImageMock(100, 100);

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial', vetorialPreset: 'detailed' },
    );
    triggerLoad();

    const animation = (await promise) as VetorialAnimation;

    // Assert
    expect(animation.sourcePreset).toBe('detailed');
  });

  it('default preset é artistic1 quando não fornecido', async () => {
    // Arrange
    const { triggerLoad } = createImageMock(100, 100);

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial' },
    );
    triggerLoad();

    const animation = (await promise) as VetorialAnimation;

    // Assert
    expect(animation.sourcePreset).toBe('artistic1');
  });

  it('chama onProgress com valores 0..1 e termina em 1', async () => {
    // Arrange
    const { triggerLoad } = createImageMock(80, 80);
    const progressValues: number[] = [];

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      (p) => progressValues.push(p),
      { renderMode: 'vetorial' },
    );
    triggerLoad();
    await promise;

    // Assert
    expect(progressValues.length).toBeGreaterThan(0);
    // Cada valor reportado deve estar no range [0, 1]
    for (const p of progressValues) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    // O último valor deve ser 1 (conclusão)
    expect(progressValues[progressValues.length - 1]).toBe(1);
  });

  it('respeita AbortSignal — rejeita com AbortError se já abortado', async () => {
    // Arrange
    const { triggerLoad } = createImageMock(80, 80);
    const controller = new AbortController();
    controller.abort();

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial', signal: controller.signal },
    );
    triggerLoad();

    // Assert
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('modo mask (default) retorna StrokeAnimation (retrocompatibilidade)', async () => {
    // Arrange — modo mask usa `setTimeout` no fallback `processOnMainThread`,
    // então precisamos de fake timers para avançar o tempo sem esperar real
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(100, 100);

    // Act — sem `renderMode` = `'mask'` por default
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      {},
    );
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const animation = (await promise) as StrokeAnimation;
    vi.useRealTimers();

    // Assert
    expect(animation).toHaveProperty('strokes');
    expect(animation).not.toHaveProperty('paths');
  });

  it('modo mask com renderMode: "mask" explícito também retorna StrokeAnimation', async () => {
    // Arrange — mesmo motivo do teste anterior: `processOnMainThread` usa timers
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(100, 100);

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'mask' },
    );
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const animation = (await promise) as StrokeAnimation;
    vi.useRealTimers();

    // Assert
    expect(animation).toHaveProperty('strokes');
    expect(animation).not.toHaveProperty('paths');
    expect(animation.fps).toBe(60);
    expect(animation.strokes.length).toBeGreaterThan(0);
  });

  it('totalLength é igual à soma dos length de cada path', async () => {
    // Arrange
    const { triggerLoad } = createImageMock(100, 100);

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial' },
    );
    triggerLoad();
    const animation = (await promise) as VetorialAnimation;

    // Assert
    if ('paths' in animation) {
      const sum = animation.paths.reduce((s, p) => s + p.length, 0);
      expect(animation.totalLength).toBeCloseTo(sum, 1);
    } else {
      throw new Error('Tipo inesperado: esperado VetorialAnimation');
    }
  });

  it('totalDurationMs é >= 2000 (mínimo) e proporcional a paths.length', async () => {
    // Arrange
    const { triggerLoad } = createImageMock(100, 100);

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial' },
    );
    triggerLoad();
    const animation = (await promise) as VetorialAnimation;

    // Assert
    if ('paths' in animation) {
      // Mínimo absoluto: 2000ms
      expect(animation.totalDurationMs).toBeGreaterThanOrEqual(2000);
      // Fórmula: Math.max(2000, paths.length * 80)
      const expected = Math.max(2000, animation.paths.length * 80);
      expect(animation.totalDurationMs).toBe(expected);
    } else {
      throw new Error('Tipo inesperado: esperado VetorialAnimation');
    }
  });
});
