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
 * (9) `totalDurationMs` = `max(3000, paths.length * 120)` (Leva 3.2 — recalibrado)
 * (10) Pipeline edge+bezier (v0.132.0): presets `edge-*` produzem `VetorialAnimation`
 *     sem rejeição — `strokeWidth` vem de `EDGE_PRESET_CONFIG` (>= 6)
 * (11) `edgeThreshold`/`contourEpsilon` opcionais não quebram a chamada
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

  it('totalDurationMs é >= 3000 (mínimo) e proporcional a paths.length', async () => {
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
      // Mínimo absoluto: 3000ms (Leva 3.2 — recalibrado de 2000 → 3000)
      expect(animation.totalDurationMs).toBeGreaterThanOrEqual(3000);
      // Fórmula: Math.max(3000, paths.length * 120) — calibrada para o
      // pipeline edge+bezier (v0.132.0) que gera menos paths porém mais longos.
      const expected = Math.max(3000, animation.paths.length * 120);
      expect(animation.totalDurationMs).toBe(expected);
    } else {
      throw new Error('Tipo inesperado: esperado VetorialAnimation');
    }
  });

  // ---------------------------------------------------------------------------
  // Leva 3.2 — testes da nova fórmula + pipeline edge+bezier (v0.132.0)
  // ---------------------------------------------------------------------------

  it('totalDurationMs escala com número de paths (consistência monotônica)', async () => {
    // Arrange — duas imagens: menor (80x80) e maior (120x120).
    // A maior gera mais paths → totalDurationMs >= da menor.
    const { triggerLoad } = createImageMock(80, 80);
    const promiseSmall = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial' },
    );
    triggerLoad();
    const animSmall = (await promiseSmall) as VetorialAnimation;

    const { triggerLoad: triggerLoad2 } = createImageMock(120, 120);
    const promiseLarge = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial' },
    );
    triggerLoad2();
    const animLarge = (await promiseLarge) as VetorialAnimation;

    // Assert — consistência monotônica: maior duração ↔ maior (ou igual) quantidade de paths
    if ('paths' in animSmall && 'paths' in animLarge) {
      expect(animLarge.paths.length).toBeGreaterThanOrEqual(animSmall.paths.length);
      expect(animLarge.totalDurationMs).toBeGreaterThanOrEqual(animSmall.totalDurationMs);
      // Garante que a fórmula nova é respeitada em ambos os casos
      expect(animSmall.totalDurationMs).toBe(Math.max(3000, animSmall.paths.length * 120));
      expect(animLarge.totalDurationMs).toBe(Math.max(3000, animLarge.paths.length * 120));
    } else {
      throw new Error('Tipo inesperado: esperado VetorialAnimation');
    }
  });

  it('totalDurationMs é >= 3000 mesmo com poucos paths (mínimo absoluto)', async () => {
    // Arrange — imagem mínima 40x40 (gera paths pequenos, mas >= 1)
    const { triggerLoad } = createImageMock(40, 40);

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
      // Independente da quantidade de paths, mínimo absoluto é 3000ms
      expect(animation.totalDurationMs).toBeGreaterThanOrEqual(3000);
      // Confirma que a fórmula usa o floor de 3000 quando paths.length * 120 < 3000
      if (animation.paths.length * 120 < 3000) {
        expect(animation.totalDurationMs).toBe(3000);
      }
    } else {
      throw new Error('Tipo inesperado: esperado VetorialAnimation');
    }
  });

  it('vetorialPreset: edge-default produz paths com strokeWidth >= 6 (pipeline edge+bezier)', async () => {
    // Arrange — preset `edge-default` usa novo pipeline Canny → RDP → Bezier
    // (EDGE_PRESET_CONFIG['edge-default'].strokeWidth === 8)
    const { triggerLoad } = createImageMock(100, 100);

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial', vetorialPreset: 'edge-default' },
    );
    triggerLoad();
    const animation = (await promise) as VetorialAnimation;

    // Assert — Leva 3.2: o orquestrador não rejeita mais presets `edge-*`
    expect(animation.sourcePreset).toBe('edge-default');
    if ('paths' in animation) {
      // Cada path deve ter strokeWidth consistente com EDGE_PRESET_CONFIG
      // (>= 6 conforme premissa do pipeline edge+bezier — range 6..12)
      for (const path of animation.paths) {
        expect(path.strokeWidth).toBeGreaterThanOrEqual(6);
      }
    } else {
      throw new Error('Tipo inesperado: esperado VetorialAnimation');
    }
  });

  it('vetorialPreset: edge-detailed funciona (smoke test do pipeline edge+bezier)', async () => {
    // Arrange — `edge-detailed` tem strokeWidth 6, epsilon 1.0 (mais paths granulares)
    const { triggerLoad } = createImageMock(100, 100);

    // Act — não deve rejeitar nem lançar exceção
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial', vetorialPreset: 'edge-detailed' },
    );
    triggerLoad();
    const animation = (await promise) as VetorialAnimation;

    // Assert — apenas garantir que completa sem erro
    expect(animation.sourcePreset).toBe('edge-detailed');
    expect(animation.id).toBeTruthy();
    expect(animation.totalDurationMs).toBeGreaterThanOrEqual(3000);
  });

  it('AbortSignal cancela pipeline edge+bezier (rejeita com AbortError)', async () => {
    // Arrange — preset `edge-bold` (strokeWidth 12, pipeline edge+bezier pesado)
    const { triggerLoad } = createImageMock(100, 100);
    const controller = new AbortController();
    controller.abort();

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      { renderMode: 'vetorial', vetorialPreset: 'edge-bold', signal: controller.signal },
    );
    triggerLoad();

    // Assert — mesmo padrão do teste análogo para mask/legado
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aceita edgeThreshold e contourEpsilon opcionais sem quebrar', async () => {
    // Arrange — passar opções extras do pipeline edge+bezier não deve quebrar
    // o contrato da API (são opcionais e ignoradas em outros pipelines)
    const { triggerLoad } = createImageMock(100, 100);

    // Act
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      {
        renderMode: 'vetorial',
        vetorialPreset: 'edge-default',
        edgeThreshold: 0.35,
        contourEpsilon: 2.5,
      },
    );
    triggerLoad();
    const animation = (await promise) as VetorialAnimation;

    // Assert — apenas garantir que completa sem rejeitar
    expect(animation.sourcePreset).toBe('edge-default');
    expect(animation.totalDurationMs).toBeGreaterThanOrEqual(3000);
  });
});
