import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock do Canvas API e Image para jsdom ────────────────────────

class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
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

const origCreateElement = document.createElement.bind(document);

function setupCanvasMock() {
  vi.stubGlobal('document', {
    ...document,
    createElement(tag: string): HTMLElement {
      if (tag === 'canvas') {
        return new MockCanvas() as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tag);
    },
  });
}

describe('generateStrokesFromImage', () => {
  let generateStrokesFromImage: typeof import('../../src/features/speed-paint/lib/imageProcessing').generateStrokesFromImage;

  beforeEach(async () => {
    vi.resetModules();
    setupCanvasMock();
    createImageMock(50, 50);

    const mod = await import('../../src/features/speed-paint/lib/imageProcessing');
    generateStrokesFromImage = mod.generateStrokesFromImage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejeita com erro quando Image dispara onerror', async () => {
    const { triggerError } = createImageMock(10, 10);
    const promise = generateStrokesFromImage('invalid', vi.fn());
    triggerError();

    await expect(promise).rejects.toThrow('Failed to load image');
  });

  it('resolve com StrokeAnimation quando Image carrega', async () => {
    const { triggerLoad } = createImageMock(100, 100);
    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();

    const result = await promise;

    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
    expect(result.canvasWidth).toBe(100);
    expect(result.canvasHeight).toBe(100);
    expect(result.canvasColor).toBe('white');
    expect(result.fps).toBe(60);
    expect(result.totalDurationMs).toBeGreaterThan(0);
    expect(result.strokes).toBeInstanceOf(Array);
    expect(result.resizedImage).toBeTruthy();
  });

  it('chama onProgress(0.5) e onProgress(1.0)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(50, 50);
    const onProgress = vi.fn();

    const promise = generateStrokesFromImage('data:image/png;base64,test', onProgress);
    triggerLoad();

    await vi.advanceTimersByTimeAsync(60);
    expect(onProgress).toHaveBeenCalledWith(0.5);

    await vi.advanceTimersByTimeAsync(60);
    expect(onProgress).toHaveBeenCalledWith(1.0);

    await promise;
    vi.useRealTimers();
  });

  it('strokes reveal sempre são gerados (grade de paint dabs)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(50, 50);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    const revealStrokes = result.strokes.filter((s) => s.type === 'reveal');
    expect(revealStrokes.length).toBeGreaterThan(0);
    for (const stroke of revealStrokes) {
      expect(stroke.layer).toBe(1);
      expect(stroke.alpha).toBe(1);
      expect(stroke.lineWidth).toBeGreaterThan(0);
    }
  });

  it('totalFrames é igual ao número de strokes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(50, 50);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    expect(result.totalFrames).toBe(result.strokes.length);
  });

  it('totalDurationMs é pelo menos 1000ms', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(50, 50);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    expect(result.totalDurationMs).toBeGreaterThanOrEqual(1000);
  });

  it('cada stroke tem id único incrementando', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(50, 50);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    const ids = result.strokes.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
  });

  it('respeita limite de redimensionamento (max 1920x1080)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(4000, 3000);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    expect(result.canvasWidth).toBeLessThanOrEqual(1920);
    expect(result.canvasHeight).toBeLessThanOrEqual(1080);
  });

  it('mantém proporção ao redimensionar (4000x3000 → 1440x1080)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(4000, 3000);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    // ratio = min(1920/4000, 1080/3000) = min(0.48, 0.36) = 0.36
    expect(result.canvasWidth).toBe(1440);
    expect(result.canvasHeight).toBe(1080);
  });

  it('não redimensiona imagem menor que o limite', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(800, 600);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    expect(result.canvasWidth).toBe(800);
    expect(result.canvasHeight).toBe(600);
  });

  it('calcula revealThreshold como sketchCount / totalStrokes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(50, 50);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    if (result.revealThreshold !== undefined && result.strokes.length > 0) {
      const sketchCount = result.strokes.filter((s) => s.type === 'sketch').length;
      const expected = sketchCount / result.strokes.length;
      expect(result.revealThreshold).toBeCloseTo(expected, 5);
    }
  });

  it('rejeita com AbortError quando o signal é abortado antes do processamento terminar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(50, 50);
    const controller = new AbortController();

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn(), {
      signal: controller.signal,
    });

    triggerLoad();
    controller.abort();

    await expect(promise).rejects.toThrow(/aborted/i);
    vi.useRealTimers();
  });

  it('strokes têm 4 ou 6 pontos (lineTo ou quadraticCurveTo)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(50, 50);

    const promise = generateStrokesFromImage('data:image/png;base64,test', vi.fn());
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    vi.useRealTimers();

    for (const stroke of result.strokes) {
      expect([4, 6]).toContain(stroke.points.length);
    }
  });
});
