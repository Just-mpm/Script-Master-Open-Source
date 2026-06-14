/**
 * Teste end-to-end do pipeline vetorial do Speed Paint com 10 imagens diversas.
 *
 * Valida que o pipeline completo `dataUrl → Image → canvas → ImageData →
 * vectorizeImage → VetorialAnimation` funciona corretamente para uma variedade
 * de padrões visuais (flat, multi-cores, gradiente, formas, linhas, alta
 * densidade, pequena, escura, clara, círculos aninhados).
 *
 * Também valida que o **fallback mask continua funcionando** (retrocompatibilidade
 * com projetos existentes — o `renderMode` default é `'mask'`).
 *
 * ## 10 imagens geradas em runtime
 *
 * Como o jsdom não implementa a Canvas API 2D (nem `ImageData` global), geramos
 * `MockImageData` sintéticas com pixels RGBA reais (semelhante ao padrão de
 * `imageProcessing.vetorial.integration.test.ts`). Cada imagem é uma função
 * pura `(width, height) => MockImageData` que pode ser trocada entre iterações
 * via variável de closure.
 *
 * ## Decisões de dimensões
 *
 * Usamos 200×200 para a maioria das imagens (vs. 800×600 sugerido no handoff)
 * para manter o teste abaixo de 30s — `imagetracerjs` escala com pixels².
 * A validação principal (`paths <= MAX_PATHS_PER_SCENE`) não depende de
 * dimensões, apenas da complexidade da imagem.
 *
 * ## Validações
 *
 * - `paths.length <= 500` (MAX_PATHS_PER_SCENE — vetor limitante do Remotion)
 * - `canvasColor === 'white'`, `fps === 60`, `sourcePreset === 'artistic1'`
 * - `canvasWidth/Height` respeitam o limite 1920×1080
 * - Latência medida e logada (informativo, não falha o teste)
 * - Fallback mask retorna `StrokeAnimation` com `strokes` (sem `paths`)
 *
 * @see `src/features/speed-paint/lib/imageProcessing.ts`
 * @see `src/features/speed-paint/lib/vectorizer.ts`
 * @see `tests/speed-paint/imageProcessing.vetorial.integration.test.ts`
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

// ─── Mock do Canvas API e Image para jsdom ──────────────────────────

/**
 * `MockImageData` — jsdom não tem `ImageData` global. Esta classe expõe a mesma
 * superfície (`data: Uint8ClampedArray`, `width`, `height`) que `vectorizeImage`
 * valida em `isValidImageData()` e que `imagetracerjs` consome.
 */
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

/** Tipo do builder de ImageData — função pura que recebe dimensões. */
type ImageDataBuilder = (width: number, height: number) => MockImageData;

/** Builder ativo — trocado por iteração para simular imagens diferentes. */
let currentImageBuilder: ImageDataBuilder = (w, h) => makeFlatDesign(w, h);

function setCurrentImageBuilder(builder: ImageDataBuilder): void {
  currentImageBuilder = builder;
}

// ─── Helpers para gerar ImageData das 10 imagens de teste ────────────

/** Preenche o buffer RGBA inteiro com uma cor sólida. */
function fillSolid(
  data: Uint8ClampedArray,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
}

/** Desenha um retângulo preenchido (coordenadas inclusivas). */
function fillRect(
  data: Uint8ClampedArray,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
): void {
  const maxY = data.length / 4 / w;
  for (let y = Math.max(0, y0); y < Math.min(maxY, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
      const idx = (y * w + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
}

/** Converte HSL (h: 0-360, s: 0-100, l: 0-100) para RGB. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

// ─── 10 builders de imagens de teste ────────────────────────────────

/** 1. Flat design básico — fundo branco + quadrado preto central. */
function makeFlatDesign(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  const x0 = Math.floor(w / 4);
  const y0 = Math.floor(h / 4);
  const x1 = Math.floor((w * 3) / 4);
  const y1 = Math.floor((h * 3) / 4);
  fillRect(img.data, w, x0, y0, x1, y1, 0, 0, 0);
  return img;
}

/** 2. Multi-cores — grade 4×4 de cores HSL. */
function makeMultiCores(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  const cols = 4;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hue = (r * cols + c) * (360 / (cols * rows));
      const [rr, gg, bb] = hslToRgb(hue, 80, 50);
      const x0 = Math.floor((c * w) / cols);
      const y0 = Math.floor((r * h) / rows);
      const x1 = Math.floor(((c + 1) * w) / cols);
      const y1 = Math.floor(((r + 1) * h) / rows);
      fillRect(img.data, w, x0, y0, x1, y1, rr, gg, bb);
    }
  }
  return img;
}

/** 3. Gradiente — simulação de gradiente linear com bandas de cor. */
function makeGradiente(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  // 20 bandas horizontais que simulam transição vermelho → verde → azul
  const bands = 20;
  for (let b = 0; b < bands; b++) {
    const t = b / (bands - 1);
    let r: number;
    let g: number;
    let bv: number;
    if (t < 0.5) {
      // vermelho → verde
      r = Math.round(255 * (1 - t * 2));
      g = Math.round(255 * (t * 2));
      bv = 0;
    } else {
      // verde → azul
      r = 0;
      g = Math.round(255 * (1 - (t - 0.5) * 2));
      bv = Math.round(255 * ((t - 0.5) * 2));
    }
    const y0 = Math.floor((b * h) / bands);
    const y1 = Math.floor(((b + 1) * h) / bands);
    fillRect(img.data, w, 0, y0, w, y1, r, g, bv);
  }
  return img;
}

/** 4. Múltiplas formas — círculo vermelho + retângulo azul + triângulo verde. */
function makeMultiplasFormas(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  // Retângulo azul no canto superior esquerdo
  fillRect(img.data, w, 0, 0, Math.floor(w / 3), Math.floor(h / 3), 0, 0, 255);
  // Círculo vermelho no centro
  const cx = w / 2;
  const cy = h / 2;
  const radius = w / 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * w + x) * 4;
        img.data[idx] = 255;
        img.data[idx + 1] = 0;
        img.data[idx + 2] = 0;
        img.data[idx + 3] = 255;
      }
    }
  }
  // Triângulo verde no canto inferior direito
  const tx0 = Math.floor(w * 0.7);
  const ty0 = Math.floor(h * 0.3);
  const tx1 = Math.floor(w * 0.9);
  const ty2 = Math.floor(h * 0.7);
  for (let y = ty0; y <= ty2; y++) {
    for (let x = tx0; x <= tx1; x++) {
      const t = (y - ty0) / (ty2 - ty0);
      const leftEdge = tx0 + ((Math.floor(w * 0.8) - tx0) * t);
      const rightEdge = tx1 + ((Math.floor(w * 0.8) - tx1) * t);
      if (x >= Math.min(leftEdge, rightEdge) && x <= Math.max(leftEdge, rightEdge)) {
        const idx = (y * w + x) * 4;
        img.data[idx] = 0;
        img.data[idx + 1] = 200;
        img.data[idx + 2] = 0;
        img.data[idx + 3] = 255;
      }
    }
  }
  return img;
}

/** 5. Linhas paralelas — 20 linhas horizontais pretas. */
function makeLinhasParalelas(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  const numLines = 20;
  const lineThickness = 3;
  for (let i = 0; i < numLines; i++) {
    const y0 = Math.floor(((i + 1) * h) / (numLines + 1)) - Math.floor(lineThickness / 2);
    const y1 = y0 + lineThickness;
    fillRect(img.data, w, 0, y0, w, y1, 0, 0, 0);
  }
  return img;
}

/** 6. Alta densidade — 100 pequenos círculos coloridos (testa MAX_PATHS_PER_SCENE). */
function makeAltaDensidade(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  // 100 pequenos círculos — gera muitos paths para testar o limite de 500
  const numCircles = 100;
  const radius = 6;
  const cols = 10;
  for (let i = 0; i < numCircles; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x0 = Math.floor(((col + 0.5) * w) / cols) - radius;
    const y0 = Math.floor(((row + 0.5) * h) / 10) - radius;
    const cx = x0 + radius;
    const cy = y0 + radius;
    const [rr, gg, bb] = hslToRgb((i * 36) % 360, 70, 35);
    for (let y = y0; y < y0 + radius * 2; y++) {
      for (let x = x0; x < x0 + radius * 2; x++) {
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          const idx = (y * w + x) * 4;
          img.data[idx] = rr;
          img.data[idx + 1] = gg;
          img.data[idx + 2] = bb;
          img.data[idx + 3] = 255;
        }
      }
    }
  }
  return img;
}

/** 7. Pequena 50×50 — círculo preto em fundo branco. */
function makePequena(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  const cx = w / 2;
  const cy = h / 2;
  const radius = w / 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * w + x) * 4;
        img.data[idx] = 0;
        img.data[idx + 1] = 0;
        img.data[idx + 2] = 0;
        img.data[idx + 3] = 255;
      }
    }
  }
  return img;
}

/** 8. Muito escura — fundo preto com quadrado cinza médio. */
function makeMuitoEscura(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 0, 0, 0, 255);
  // Cinza médio para garantir contraste detectável pelo imagetracerjs
  const x0 = Math.floor(w / 3);
  const y0 = Math.floor(h / 3);
  const x1 = Math.floor((w * 2) / 3);
  const y1 = Math.floor((h * 2) / 3);
  fillRect(img.data, w, x0, y0, x1, y1, 102, 102, 102);
  return img;
}

/** 9. Muito clara — fundo branco com quadrado cinza médio. */
function makeMuitoClara(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  // Cinza médio para garantir contraste detectável pelo imagetracerjs
  const x0 = Math.floor(w / 3);
  const y0 = Math.floor(h / 3);
  const x1 = Math.floor((w * 2) / 3);
  const y1 = Math.floor((h * 2) / 3);
  fillRect(img.data, w, x0, y0, x1, y1, 153, 153, 153);
  return img;
}

/** 10. Círculos aninhados — 6 círculos concêntricos alternados. */
function makeCirculosAninhados(w: number, h: number): MockImageData {
  const img = new MockImageData(w, h);
  fillSolid(img.data, 255, 255, 255, 255);
  const cx = w / 2;
  const cy = h / 2;
  const maxRadius = Math.min(w, h) / 2 - 2;
  const numRings = 6;
  for (let i = 0; i < numRings; i++) {
    const radius = Math.floor(maxRadius * (1 - i / numRings));
    if (radius <= 0) break;
    const gray = i % 2 === 0 ? 0 : 102;
    // Desenha anel (borda) com espessura 2
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq <= radius * radius && distSq >= (radius - 2) * (radius - 2)) {
          const idx = (y * w + x) * 4;
          img.data[idx] = gray;
          img.data[idx + 1] = gray;
          img.data[idx + 2] = gray;
          img.data[idx + 3] = 255;
        }
      }
    }
  }
  return img;
}

// ─── Catálogo das 10 imagens ────────────────────────────────────────

interface TestImage {
  readonly name: string;
  readonly size: readonly [number, number];
  readonly build: ImageDataBuilder;
}

const TEST_IMAGES: readonly TestImage[] = [
  { name: 'flat-design-basico', size: [200, 200], build: makeFlatDesign },
  { name: 'multi-cores', size: [200, 200], build: makeMultiCores },
  { name: 'gradiente', size: [200, 200], build: makeGradiente },
  { name: 'multiplas-formas', size: [200, 200], build: makeMultiplasFormas },
  { name: 'linhas-paralelas', size: [200, 200], build: makeLinhasParalelas },
  { name: 'alta-densidade', size: [200, 200], build: makeAltaDensidade },
  { name: 'pequena-50x50', size: [50, 50], build: makePequena },
  { name: 'muito-escura', size: [200, 200], build: makeMuitoEscura },
  { name: 'muito-clara', size: [200, 200], build: makeMuitoClara },
  { name: 'circulos-aninhados', size: [200, 200], build: makeCirculosAninhados },
];

// ─── Mock do Canvas e Image ─────────────────────────────────────────

class MockCanvas {
  _width = 0;
  _height = 0;

  get width(): number { return this._width; }
  set width(v: number) { this._width = v; }
  get height(): number { return this._height; }
  set height(v: number) { this._height = v; }

  getContext(_type: string): MockCanvasRenderingContext2D {
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

  constructor(private readonly _w: number, private readonly _h: number) {}

  fillRect(): void { /* noop — dados já estão no ImageData */ }
  drawImage(): void { /* noop */ }
  clearRect(): void {}
  beginPath(): void {}
  stroke(): void {}
  fill(): void {}
  moveTo(): void {}
  lineTo(): void {}
  arc(): void {}
  quadraticCurveTo(): void {}
  createLinearGradient(): CanvasGradient {
    // Gradiente real não é necessário — `makeGradiente` gera via bandas
    return { addColorStop: () => {} } as unknown as CanvasGradient;
  }

  /**
   * Retorna ImageData do builder ativo. Espelha o padrão de
   * `imageProcessing.vetorial.integration.test.ts` mas permite trocar a
   * imagem entre iterações via `setCurrentImageBuilder()`.
   */
  getImageData(_x: number, _y: number, w: number, h: number): ImageData {
    return currentImageBuilder(w, h) as unknown as ImageData;
  }

  toDataURL(): string {
    return 'data:image/jpeg;base64,mock';
  }

  createImageData(w: number, h: number): ImageData {
    return new MockImageData(w, h) as unknown as ImageData;
  }
}

// ─── Image mock com onload/onerror capturáveis ──────────────────────

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
    get src(): string { return this._src; }

    set onload(fn: (() => void) | null) {
      this._onload = fn;
      _imageOnLoad = fn;
    }
    get onload(): (() => void) | null { return this._onload; }

    set onerror(fn: (() => void) | null) {
      this._onerror = fn;
      _imageOnError = fn;
    }
    get onerror(): (() => void) | null { return this._onerror; }

    crossOrigin = '';
    decode(): Promise<void> { return Promise.resolve(); }
    addEventListener(): void {}
    removeEventListener(): void {}
  });

  function triggerLoad(): void {
    if (_imageOnLoad) _imageOnLoad();
  }

  function triggerError(): void {
    if (_imageOnError) _imageOnError();
  }

  return { triggerLoad, triggerError };
}

// ─── Canvas mock no document.createElement ──────────────────────────
// vi.spyOn intercepta a referência real do jsdom, ao contrário de vi.stubGlobal
// que substitui o objeto global mas pode não afetar referências internas do jsdom.
const origCreateElement = document.createElement.bind(document);
let createElementSpy: ReturnType<typeof vi.spyOn>;

function setupCanvasMock(): void {
  createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return new MockCanvas() as unknown as HTMLCanvasElement;
    }
    return origCreateElement(tag);
  });
}

// ─── Testes ─────────────────────────────────────────────────────────

describe('imageProcessing — pipeline vetorial e2e (10 imagens)', () => {
  let generateStrokesFromImage: typeof import('../../src/features/speed-paint/lib/imageProcessing').generateStrokesFromImage;

  beforeEach(async () => {
    vi.resetModules();
    setupCanvasMock();

    const mod = await import('../../src/features/speed-paint/lib/imageProcessing');
    generateStrokesFromImage = mod.generateStrokesFromImage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setCurrentImageBuilder(makeFlatDesign);
  });

  it('processa 10 imagens diversas no modo vetorial', async () => {
    // Tipo do resultado por imagem
    interface ImageResult {
      name: string;
      size: string;
      latencyMs: number;
      paths: number;
      totalLength: number;
    }
    const results: ImageResult[] = [];

    for (const img of TEST_IMAGES) {
      const [w, h] = img.size;
      // Troca o builder ativo para esta imagem
      setCurrentImageBuilder(img.build);
      // Configura Image mock com as dimensões corretas
      const { triggerLoad } = createImageMock(w, h);

      const start = performance.now();
      const promise = generateStrokesFromImage(
        'data:image/png;base64,test',
        () => {},
        { renderMode: 'vetorial' },
      );
      triggerLoad();
      const animation = (await promise) as VetorialAnimation;
      const latencyMs = performance.now() - start;

      // Valida tipo discriminado
      expect(animation).toHaveProperty('paths');
      expect(animation).not.toHaveProperty('strokes');

      // Validações de sanidade (constantes da animação)
      expect(animation.canvasWidth).toBe(w);
      expect(animation.canvasHeight).toBe(h);
      expect(animation.canvasWidth).toBeLessThanOrEqual(1920);
      expect(animation.canvasHeight).toBeLessThanOrEqual(1080);
      expect(animation.fps).toBe(60);
      expect(animation.canvasColor).toBe('white');
      expect(animation.sourcePreset).toBe('artistic1');
      expect(animation.id).toBeTruthy();
      expect(animation.resizedImage).toBeTruthy();

      // Validação crítica: MAX_PATHS_PER_SCENE = 500 (constante do vectorizer)
      // Documentada como Premissa #12 do tracker
      expect(animation.paths.length).toBeLessThanOrEqual(500);

      // Validação: totalLength coerente com soma dos lengths
      const sumLength = animation.paths.reduce((s, p) => s + p.length, 0);
      expect(animation.totalLength).toBeCloseTo(sumLength, 1);

      // Validação: cada path tem `d` (string) e `length` (positivo)
      for (const path of animation.paths) {
        expect(typeof path.d).toBe('string');
        expect(path.d.length).toBeGreaterThan(0);
        expect(path.length).toBeGreaterThanOrEqual(0);
      }

      // totalDurationMs: Math.max(2000, paths.length * 80)
      const expectedDuration = Math.max(2000, animation.paths.length * 80);
      expect(animation.totalDurationMs).toBe(expectedDuration);

      results.push({
        name: img.name,
        size: `${w}x${h}`,
        latencyMs,
        paths: animation.paths.length,
        totalLength: animation.totalLength,
      });
    }

    // Log de latência para debug (informativo, não falha o teste)
    console.log('\n📊 Latência por imagem (pipeline vetorial):');
    let totalMs = 0;
    for (const r of results) {
      console.log(
        `  ${r.name.padEnd(22)} ${r.size.padEnd(9)} ${String(r.latencyMs).padStart(5)}ms, ${String(r.paths).padStart(3)} paths, totalLength=${r.totalLength.toFixed(0)}`,
      );
      totalMs += r.latencyMs;
    }
    console.log(`  ${'TOTAL'.padEnd(22)} ${''.padEnd(9)} ${String(totalMs).padStart(5)}ms`);

    // Validação: todas as 10 imagens foram processadas
    expect(results).toHaveLength(10);

    // Validação: pelo menos a maioria das imagens produziu paths
    // (imagens com contraste muito baixo podem produzir 0 paths)
    const imagesWithPaths = results.filter((r) => r.paths > 0).length;
    expect(imagesWithPaths).toBeGreaterThanOrEqual(7);

    // Validação: latency total razoável (< 60s)
    expect(totalMs).toBeLessThan(60000);
  }, 60000); // 60s timeout para 10 imagens (imagetracerjs pode ser lento)

  it('fallback mask ainda funciona (retrocompatibilidade)', async () => {
    // Arrange — usa imagem flat design com contraste para gerar strokes
    setCurrentImageBuilder(makeFlatDesign);
    // Modo mask usa `setTimeout` no fallback `processOnMainThread`,
    // então precisamos de fake timers para avançar o tempo sem esperar real
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { triggerLoad } = createImageMock(100, 100);

    // Act — sem `renderMode` = `'mask'` por default (retrocompatibilidade)
    const promise = generateStrokesFromImage(
      'data:image/png;base64,test',
      () => {},
      {},
    );
    triggerLoad();
    await vi.advanceTimersByTimeAsync(200);

    const animation = (await promise) as StrokeAnimation;
    vi.useRealTimers();

    // Assert — tipo discriminado: StrokeAnimation tem `strokes`, NÃO tem `paths`
    expect(animation).toHaveProperty('strokes');
    expect(animation).not.toHaveProperty('paths');
    expect(animation.fps).toBe(60);
    expect(animation.canvasColor).toBe('white');
    expect(animation.strokes.length).toBeGreaterThan(0);
  }, 30000); // 30s timeout — modo mask é mais rápido
});
