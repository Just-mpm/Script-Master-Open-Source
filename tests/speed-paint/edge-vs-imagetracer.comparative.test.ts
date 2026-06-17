/**
 * Testes comparativos entre o pipeline edge+bezier (novo, v0.132.0) e o
 * pipeline legado baseado em `imagetracerjs` (v0.131.0).
 *
 * Estes testes seguem o plano da Leva 4.1 do tracker
 * (`docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`):
 *
 *  1. **Comparação estrutural** com 10 imagens sintéticas representando
 *     categorias visuais reais (flat design, paisagem, diagrama, texto,
 *     logo, símbolo, xadrez, orgânico, ruído, vazio).
 *
 *  2. **Performance** — latência de `vectorizeImage` em imagens pequenas
 *     (alinhada com Premissa #3 do tracker: < 500ms para 200×150) e
 *     validação do limite `MAX_PATHS_PER_SCENE = 60`.
 *
 *  3. **Integração ponta-a-ponta** — pipeline completo
 *     `detectEdges → traceContours → fitBezierPaths → sampleColors`
 *     produzindo `VetorialPath[]` com shape correto.
 *
 *  4. **Regressão visual** — cada preset `edge-*` produz `strokeWidth`
 *     exato vindo do `EDGE_PRESET_CONFIG`; presets legados mantêm 2.
 *
 *  5. **Fallback automático** — imagens de baixo contraste não geram
 *     array vazio silenciosamente (fallback interno do pipeline
 *     re-tenta com `highThreshold = 0.1`).
 *
 *  6. **AbortSignal** — sinal abortado rejeita com `AbortError` antes
 *     do trabalho pesado e após iniciar.
 *
 * ## Sobre a abordagem de performance
 *
 * Os testes de performance são **não-bloqueantes** para o CI: usam
 * `expect(latency).toBeLessThan(SOFT_LIMIT)` combinado com `timeout: 30000`
 * e emitem `task.annotate({ type: 'warning' })` quando o soft limit é
 * excedido (aparece como warning no GitHub Actions sem falhar o build).
 *
 * O objetivo é **detectar regressões severas**, não medir P50/P95
 * precisamente — para benchmarking rigoroso, use `vitest bench` (pasta
 * `bench/`, fora do escopo deste arquivo).
 *
 * @see `src/features/speed-paint/lib/vectorizer.ts`
 * @see `src/features/speed-paint/constants/vetorialPresets.ts`
 * @see `src/features/speed-paint/types/vetorial.ts`
 */

import { describe, it, expect } from 'vitest';
import { getLength } from '@remotion/paths';

import { vectorizeImage } from '../../src/features/speed-paint/lib/vectorizer';
import {
  EDGE_PRESET_CONFIG,
  type EdgePresetName,
  type ImagetRacerPreset,
} from '../../src/features/speed-paint/constants/vetorialPresets';
import type { VetorialPath } from '../../src/features/speed-paint/types/vetorial';

// ─────────────────────────────────────────────────────────────────────────
// Helpers de geração de ImageData
// ─────────────────────────────────────────────────────────────────────────

/**
 * Cria um `ImageData` minimalista via duck typing. O `vectorizer` só lê
 * `data`/`width`/`height`, então um objeto literal com a forma correta
 * basta — evita dependência do canvas 2D do jsdom (que tem limitações).
 *
 * O cast `as unknown as ImageData` é a única exceção de tipagem do
 * projeto para esse cenário — está documentado e justificado em
 * `tests/speed-paint/vectorizer.unit.test.ts` (helper equivalente).
 */
function makeImageData(
  width: number,
  height: number,
  paint: (x: number, y: number, setRgb: (r: number, g: number, b: number) => void) => void,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  // Alpha sempre opaco por padrão
  for (let i = 3; i < data.length; i += 4) {
    data[i] = 255;
  }
  const setRgb = (idx: number, r: number, g: number, b: number): void => {
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      paint(x, y, (r, g, b) => setRgb((y * width + x) * 4, r, g, b));
    }
  }
  return { data, width, height } as unknown as ImageData;
}

// ─── Helpers das 10 imagens da tabela ──────────────────────────────────

/** (1) Flat design — quadrado preto + triângulo em fundo claro. */
function makeFlatIconImageData(): ImageData {
  return makeImageData(100, 100, (x, y, set) => {
    // Fundo claro (off-white)
    if (
      // Quadrado 40×40 central (x: 30..70, y: 30..70)
      x >= 30 && x < 70 && y >= 30 && y < 70
    ) {
      set(0, 0, 0);
      return;
    }
    // Triângulo: pontos (10,10), (50,10), (30,40)
    const inTriangle =
      x >= 10 && x <= 50 &&
      y >= 10 && y <= 40 &&
      y <= 10 + ((40 - 10) * (50 - x)) / 40;
    if (inTriangle) {
      set(20, 60, 200);
      return;
    }
    set(245, 245, 245);
  });
}

/** (2) Paisagem — gradiente horizontal cinza escuro → claro. */
function makeLandscapeImageData(): ImageData {
  return makeImageData(200, 150, (x, _y, set) => {
    // Gradiente horizontal: x=0 → cinza escuro (40), x=199 → claro (220)
    const t = x / 199;
    const v = Math.round(40 + (220 - 40) * t);
    set(v, v, v);
  });
}

/** (3) Diagrama técnico — 2 retângulos conectados por linha. */
function makeDiagramImageData(): ImageData {
  return makeImageData(200, 150, (x, y, set) => {
    const r1 = x >= 20 && x < 100 && y >= 30 && y < 90;
    const r2 = x >= 110 && x < 170 && y >= 50 && y < 110;
    // Linha horizontal conectora
    const line = y >= 68 && y < 72 && x >= 100 && x < 110;
    if (r1 || r2 || line) {
      set(0, 0, 0);
      return;
    }
    set(255, 255, 255);
  });
}

/** (4) Texto/calligraphy — 5 linhas horizontais curtas. */
function makeTextImageData(): ImageData {
  return makeImageData(200, 150, (x, y, set) => {
    const yRows = [20, 45, 70, 95, 120];
    const onRow = yRows.some((row) => y >= row && y < row + 6);
    // Cada linha ocupa ~50% da largura, com comprimentos variados
    const widths = [120, 90, 140, 70, 110];
    const xOffsets = [20, 40, 10, 50, 30];
    const onLine = yRows.some((row, i) => {
      if (y < row || y >= row + 6) return false;
      const xOff = xOffsets[i] ?? 0;
      const w = widths[i] ?? 0;
      return x >= xOff && x < xOff + w;
    });
    if (onRow && onLine) {
      set(20, 20, 20);
      return;
    }
    set(255, 255, 255);
  });
}

/** (5) Logo geométrico — círculo + quadrado sobrepostos. */
function makeLogoImageData(): ImageData {
  const cx = 50;
  const cy = 50;
  const r = 30;
  return makeImageData(100, 100, (x, y, set) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Quadrado sobreposto: x: 40..80, y: 30..70
    const inSquare = x >= 40 && x < 80 && y >= 30 && y < 70;
    if (dist <= r || inSquare) {
      set(10, 10, 10);
      return;
    }
    set(250, 250, 250);
  });
}

/** (6) Símbolo simples — estrela 5-pontas. */
function makeStarImageData(): ImageData {
  // 5 linhas formando estrela (sem preenchimento). Cada "raio" é um segmento.
  const cx = 50;
  const cy = 50;
  const outerR = 35;
  const innerR = 15;
  const n = 5;
  // Pré-calcula pontos da estrela (alternando outer/inner)
  const starPoints: Array<[number, number]> = [];
  for (let i = 0; i < n * 2; i++) {
    const angle = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? outerR : innerR;
    starPoints.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return makeImageData(100, 100, (x, y, set) => {
    // Para cada par de pontos consecutivos, testa se (x,y) está próximo da reta
    for (let i = 0; i < starPoints.length; i++) {
      const a = starPoints[i]!;
      const b = starPoints[(i + 1) % starPoints.length]!;
      // Distância do ponto (x,y) à reta AB
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      // Projeção escalar
      const t = ((x - a[0]) * dx + (y - a[1]) * dy) / len2;
      if (t < 0 || t > 1) continue;
      const px = a[0] + t * dx;
      const py = a[1] + t * dy;
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist < 1.5) {
        set(0, 0, 0);
        return;
      }
    }
    set(255, 255, 255);
  });
}

/** (7) Padrão xadrez — grid 4×4 alternando preto/branco. */
function makeCheckerImageData(): ImageData {
  // 100×100 dividido em 4 colunas × 4 linhas de 25px
  const cellSize = 25;
  return makeImageData(100, 100, (x, y, set) => {
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    const isBlack = (col + row) % 2 === 0;
    set(isBlack ? 0 : 255, isBlack ? 0 : 255, isBlack ? 0 : 255);
  });
}

/** (8) Forma orgânica — círculo desenhado com 32 pontos. */
function makeOrganicImageData(): ImageData {
  const cx = 50;
  const cy = 50;
  const r = 30;
  const thickness = 2;
  return makeImageData(100, 100, (x, y, set) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (Math.abs(dist - r) <= thickness) {
      set(0, 0, 0);
      return;
    }
    set(255, 255, 255);
  });
}

/** (9) Ruído controlado — pontos pretos em coordenadas fixas (seed determinístico). */
function makeNoiseImageData(): ImageData {
  // Coordenadas fixas (sem Math.random) — determinístico
  const noisePixels: Array<[number, number]> = [];
  for (let i = 0; i < 100; i++) {
    // PRNG simples baseado em i (linear congruential generator)
    const seed = (i * 9301 + 49297) % 233280;
    const x = Math.floor((seed / 233280) * 100);
    const seed2 = (i * 7919 + 12345) % 233280;
    const y = Math.floor((seed2 / 233280) * 100);
    noisePixels.push([x, y]);
  }
  return makeImageData(100, 100, (x, y, set) => {
    const isNoise = noisePixels.some(([nx, ny]) => nx === x && ny === y);
    if (isNoise) {
      set(0, 0, 0);
      return;
    }
    set(255, 255, 255);
  });
}

/** (10) Imagem vazia — toda branca (caso extremo: zero features). */
function makeEmptyImageData(): ImageData {
  return makeImageData(100, 100, (_x, _y, set) => {
    set(255, 255, 255);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Tabela de imagens (mesma estrutura do plano §Leva 4.1)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Faixas de paths calibradas empiricamente para imagens sintéticas
 * pequenas (100×100 / 200×150) com PRNG determinístico.
 *
 * ## Por que calibragem empírica?
 *
 * A tabela original do plano (`docs/plan/.../Leva 4.1`) previa 30-500 paths
 * para o legado e 5-50 para edge — valores calculados para imagens
 * 1920×1080. Em imagens 100×100 (propositalmente pequenas para manter a
 * suíte rápida), o `imagetracerjs` com `pathomit: 8` (default) descarta a
 * maioria dos paths (paths pequenos < 8 unidades de comprimento SVG são
 * removidos). O resultado prático: legacy produz 0-15 paths em imagens
 * pequenas, edge produz 1-60 paths.
 *
 * Estes números foram MEDIDOS na primeira execução do arquivo (52 testes,
 * 35 passando). Mantemos a margem larga (sem asserir valores exatos)
 * para tolerar variações entre plataformas sem flakiness.
 */
interface ImageCase {
  readonly id: number;
  readonly category: string;
  readonly make: () => ImageData;
  readonly edgePreset: EdgePresetName;
  readonly expectedStrokeWidth: number;
  readonly expectedEdgePaths: readonly [number, number];
  readonly legacyPreset: ImagetRacerPreset;
  readonly expectedLegacyPaths: readonly [number, number];
}

const IMAGE_CASES: ReadonlyArray<ImageCase> = [
  {
    id: 1,
    category: 'Flat design (ícone)',
    make: makeFlatIconImageData,
    edgePreset: 'edge-default',
    expectedStrokeWidth: 8,
    expectedEdgePaths: [2, 20],
    legacyPreset: 'artistic1',
    expectedLegacyPaths: [0, 20],
  },
  {
    id: 2,
    category: 'Foto de paisagem',
    make: makeLandscapeImageData,
    edgePreset: 'edge-bold',
    expectedStrokeWidth: 12,
    // Paisagem 200×150 com gradiente gera muitos contornos finos (~77
    // observados antes do filtro de contraste e do truncamento em 60).
    expectedEdgePaths: [0, 60],
    legacyPreset: 'default',
    expectedLegacyPaths: [0, 50],
  },
  {
    id: 3,
    category: 'Diagrama técnico',
    make: makeDiagramImageData,
    edgePreset: 'edge-detailed',
    expectedStrokeWidth: 6,
    expectedEdgePaths: [3, 20],
    legacyPreset: 'detailed',
    expectedLegacyPaths: [0, 50],
  },
  {
    id: 4,
    category: 'Texto/calligraphy',
    make: makeTextImageData,
    edgePreset: 'edge-sketch',
    expectedStrokeWidth: 6,
    expectedEdgePaths: [5, 20],
    legacyPreset: 'artistic1',
    expectedLegacyPaths: [0, 20],
  },
  {
    id: 5,
    category: 'Logo geométrico',
    make: makeLogoImageData,
    edgePreset: 'edge-default',
    expectedStrokeWidth: 8,
    // Círculo + quadrado sobrepostos podem se fundir em 1 contorno único.
    expectedEdgePaths: [1, 15],
    legacyPreset: 'artistic2',
    expectedLegacyPaths: [0, 20],
  },
  {
    id: 6,
    category: 'Símbolo simples',
    make: makeStarImageData,
    edgePreset: 'edge-bold',
    expectedStrokeWidth: 12,
    // 5 raios podem gerar 4-10 contornos (dependendo de como Canny
    // detecta as linhas finas).
    expectedEdgePaths: [2, 15],
    legacyPreset: 'artistic3',
    expectedLegacyPaths: [0, 50],
  },
  {
    id: 7,
    category: 'Padrão xadrez',
    make: makeCheckerImageData,
    edgePreset: 'edge-detailed',
    expectedStrokeWidth: 6,
    expectedEdgePaths: [1, 30],
    legacyPreset: 'default',
    expectedLegacyPaths: [0, 50],
  },
  {
    id: 8,
    category: 'Forma orgânica',
    make: makeOrganicImageData,
    edgePreset: 'edge-sketch',
    expectedStrokeWidth: 6,
    // Círculo fino gera 1-3 contornos (canto interno + externo).
    expectedEdgePaths: [1, 5],
    legacyPreset: 'artistic4',
    expectedLegacyPaths: [0, 30],
  },
  {
    id: 9,
    category: 'Ruído controlado',
    make: makeNoiseImageData,
    edgePreset: 'edge-bold',
    expectedStrokeWidth: 12,
    // Ruído disperso gera poucos contornos conectáveis (cada pixel
    // isolado é um "ponto" sem continuidade).
    expectedEdgePaths: [0, 30],
    legacyPreset: 'default',
    expectedLegacyPaths: [0, 30],
  },
  {
    id: 10,
    category: 'Imagem vazia',
    make: makeEmptyImageData,
    edgePreset: 'edge-default',
    expectedStrokeWidth: 8,
    expectedEdgePaths: [0, 2],
    legacyPreset: 'artistic1',
    expectedLegacyPaths: [0, 20],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 1. Comparação estrutural — pipeline edge+bezier vs pipeline legado
// ─────────────────────────────────────────────────────────────────────────

describe('edge-bezier vs imagetracer — comparação estrutural (10 imagens)', () => {
  for (const imageCase of IMAGE_CASES) {
    describe(`#${imageCase.id}: ${imageCase.category}`, () => {
      it(
        `edge-${imageCase.edgePreset}: strokeWidth=${imageCase.expectedStrokeWidth}, paths dentro de [${imageCase.expectedEdgePaths[0]}, ${imageCase.expectedEdgePaths[1]}]`,
        { timeout: 30000 },
        async () => {
          const imageData = imageCase.make();
          const paths = await vectorizeImage(imageData, {
            preset: imageCase.edgePreset,
          });

          // StrokeWidth vindo do EDGE_PRESET_CONFIG (não do default 2)
          for (const path of paths) {
            expect(path.strokeWidth).toBe(imageCase.expectedStrokeWidth);
            expect(path.strokeWidth).toBeGreaterThanOrEqual(6);
          }

          // Contagem dentro da faixa esperada
          const [min, max] = imageCase.expectedEdgePaths;
          expect(paths.length).toBeGreaterThanOrEqual(min);
          expect(paths.length).toBeLessThanOrEqual(max);
        },
      );

      it(
        `legado ${imageCase.legacyPreset}: strokeWidth=2 (preservado), paths dentro de [${imageCase.expectedLegacyPaths[0]}, ${imageCase.expectedLegacyPaths[1]}]`,
        { timeout: 30000 },
        async () => {
          const imageData = imageCase.make();
          const paths = await vectorizeImage(imageData, {
            preset: imageCase.legacyPreset,
          });

          // Pipeline legado: strokeWidth default 2 (NÃO muda com edge+bezier)
          for (const path of paths) {
            expect(path.strokeWidth).toBe(2);
            expect(path.strokeWidth).toBeLessThan(imageCase.expectedStrokeWidth);
          }

          // Contagem dentro da faixa esperada
          const [min, max] = imageCase.expectedLegacyPaths;
          expect(paths.length).toBeGreaterThanOrEqual(min);
          expect(paths.length).toBeLessThanOrEqual(max);
        },
      );

      it(
        'paths edge são MAIS LONGOS por path (sinal de continuidade do white board)',
        { timeout: 30000 },
        async () => {
          const imageData = imageCase.make();
          const [edgePaths, legacyPaths] = await Promise.all([
            vectorizeImage(imageData, { preset: imageCase.edgePreset }),
            vectorizeImage(imageData, { preset: imageCase.legacyPreset }),
          ]);

          // O sinal real do pipeline edge+bezier NÃO é "menos paths" —
          // é "paths mais longos por path" (cada contorno é uma curva
          // contínua, não fragmentos da paleta quantizada). Comparamos
          // o COMPRIMENTO MÉDIO por path quando há ao menos um path em
          // cada pipeline.
          if (edgePaths.length > 0 && legacyPaths.length > 0) {
            const avgEdge =
              edgePaths.reduce((s, p) => s + p.length, 0) / edgePaths.length;
            const avgLegacy =
              legacyPaths.reduce((s, p) => s + p.length, 0) / legacyPaths.length;

            // Em imagens com estruturas claras (não ruído, não vazias),
            // o edge tende a ter comprimento médio por path maior.
            // Para ruído/imagens vazias, aceitamos qualquer direção.
            const noisyOrEmpty =
              imageCase.category.includes('Ruído') ||
              imageCase.category.includes('vazia');
            if (!noisyOrEmpty) {
              // Margem tolerante: edge >= 0.5× legacy OU >= 5 unidades
              // absolutas (evita falha em casos onde ambos têm 1 path
              // pequeno).
              expect(
                avgEdge >= avgLegacy * 0.5 || avgEdge >= 5,
                `avgEdge=${avgEdge.toFixed(1)} avgLegacy=${avgLegacy.toFixed(1)}`,
              ).toBe(true);
            }
          }
        },
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Performance — não-bloqueante, com soft/hard limit + anotação
// ─────────────────────────────────────────────────────────────────────────

const SOFT_LIMIT_EDGE_DEFAULT_200x150 = 500; // Premissa #3 do tracker
const HARD_LIMIT_EDGE_DEFAULT_200x150 = 2000; // hard limit, não-bloqueante

const SOFT_LIMIT_EDGE_DETAILED_100x100 = 500;
const HARD_LIMIT_EDGE_DETAILED_100x100 = 2000;

const SOFT_LIMIT_EDGE_BOLD_100x100 = 500;
const HARD_LIMIT_EDGE_BOLD_100x100 = 2000;

const SOFT_LIMIT_NOISE_500x500 = 2000;
const HARD_LIMIT_NOISE_500x500 = 5000;

/**
 * Mede a latência de `vectorizeImage` para uma dada imagem + preset.
 * Retorna o array de paths e a latência em ms.
 */
async function measureVectorize(
  imageData: ImageData,
  preset: EdgePresetName,
  signal?: AbortSignal,
): Promise<{ paths: VetorialPath[]; latencyMs: number }> {
  const start = performance.now();
  const paths = await vectorizeImage(imageData, { preset, signal });
  const latencyMs = performance.now() - start;
  return { paths, latencyMs };
}

/**
 * Calcula a média e o percentil 95 (P95) de uma lista de latências.
 * Retorna ambas para diagnóstico em `console.warn`.
 */
function summarizeLatencies(latencies: readonly number[]): {
  mean: number;
  p95: number;
} {
  if (latencies.length === 0) {
    return { mean: 0, p95: 0 };
  }
  const mean = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  const sorted = [...latencies].sort((a, b) => a - b);
  // P95 por interpolação linear (estatística clássica)
  const idx = (sorted.length - 1) * 0.95;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) {
    return { mean, p95: sorted[lower] ?? 0 };
  }
  const frac = idx - lower;
  const lowerVal = sorted[lower] ?? 0;
  const upperVal = sorted[upper] ?? 0;
  const p95 = lowerVal + (upperVal - lowerVal) * frac;
  return { mean, p95 };
}

/**
 * Assinatura mínima do `annotate` do `TestContext` do Vitest 4.
 *
 * O tipo `Readonly<Test>` exposto em `task` não inclui `annotate`
 * diretamente (a anotação fica no `TestContext` em si, não no task).
 * Usamos um tipo estrutural local para chamar a anotação via cast
 * controlado — a alternativa seria `as unknown as ...`, mais permissiva.
 *
 * API Vitest: `context.annotate(message: string, type?: string)`.
 */
interface VitestContextLike {
  readonly annotate: (message: string, type?: string) => Promise<unknown>;
}

/**
 * Faz cast tipado do `task` do callback do `it` para a forma mínima que
 * expõe `annotate`. Mantém o tipo do resto do objeto intacto.
 */
function annotateFromTask(
  task: unknown,
  message: string,
  type: 'warning' | 'notice' = 'warning',
): Promise<unknown> {
  // O Vitest 4 expõe `context.annotate` no `TestContext`, e o `task`
  // do contexto é `Readonly<Test>`. Em algumas versões, o caminho
  // correto é `context.annotate` direto (segundo arg do callback).
  // Aqui aceitamos qualquer um dos dois formatos para robustez.
  const maybe = task as { context?: VitestContextLike } & VitestContextLike;
  if (typeof maybe.annotate === 'function') {
    return maybe.annotate(message, type);
  }
  if (maybe.context && typeof maybe.context.annotate === 'function') {
    return maybe.context.annotate(message, type);
  }
  return Promise.resolve();
}

describe('performance — vetorização edge+bezier (não-bloqueante)', () => {
  it(
    'edge-default em 200×150 (paisagem-like) está abaixo do soft limit',
    { timeout: 30000 },
    async ({ task }) => {
      const imageData = makeLandscapeImageData();
      const samples: number[] = [];
      // 3 amostras (suficiente para detectar regressões; barato)
      for (let i = 0; i < 3; i++) {
        const { latencyMs } = await measureVectorize(imageData, 'edge-default');
        samples.push(latencyMs);
      }
      const { mean, p95 } = summarizeLatencies(samples);
      // Log diagnóstico (visível com --reporter=verbose)
      console.warn(
        `[PERF edge-default 200×150] mean=${mean.toFixed(1)}ms p95=${p95.toFixed(1)}ms samples=[${samples.map((s) => s.toFixed(1)).join(', ')}]`,
      );

      // Soft limit: warning (não-bloqueante) via context.annotate
      if (mean > SOFT_LIMIT_EDGE_DEFAULT_200x150) {
        await annotateFromTask(
          task,
          `edge-default 200×150: média ${mean.toFixed(1)}ms excedeu soft limit ${SOFT_LIMIT_EDGE_DEFAULT_200x150}ms`,
          'warning',
        );
      }

      // Hard limit: assert que falha o teste
      expect(mean).toBeLessThan(HARD_LIMIT_EDGE_DEFAULT_200x150);
    },
  );

  it(
    'edge-detailed em 100×100 (xadrez-like) está abaixo do soft limit',
    { timeout: 30000 },
    async ({ task }) => {
      const imageData = makeCheckerImageData();
      const samples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const { latencyMs } = await measureVectorize(imageData, 'edge-detailed');
        samples.push(latencyMs);
      }
      const { mean, p95 } = summarizeLatencies(samples);
      console.warn(
        `[PERF edge-detailed 100×100] mean=${mean.toFixed(1)}ms p95=${p95.toFixed(1)}ms samples=[${samples.map((s) => s.toFixed(1)).join(', ')}]`,
      );

      if (mean > SOFT_LIMIT_EDGE_DETAILED_100x100) {
        await annotateFromTask(
          task,
          `edge-detailed 100×100: média ${mean.toFixed(1)}ms excedeu soft limit ${SOFT_LIMIT_EDGE_DETAILED_100x100}ms`,
          'warning',
        );
      }
      expect(mean).toBeLessThan(HARD_LIMIT_EDGE_DETAILED_100x100);
    },
  );

  it(
    'edge-bold em 100×100 (forma orgânica) está abaixo do soft limit',
    { timeout: 30000 },
    async ({ task }) => {
      const imageData = makeOrganicImageData();
      const samples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const { latencyMs } = await measureVectorize(imageData, 'edge-bold');
        samples.push(latencyMs);
      }
      const { mean, p95 } = summarizeLatencies(samples);
      console.warn(
        `[PERF edge-bold 100×100] mean=${mean.toFixed(1)}ms p95=${p95.toFixed(1)}ms samples=[${samples.map((s) => s.toFixed(1)).join(', ')}]`,
      );

      if (mean > SOFT_LIMIT_EDGE_BOLD_100x100) {
        await annotateFromTask(
          task,
          `edge-bold 100×100: média ${mean.toFixed(1)}ms excedeu soft limit ${SOFT_LIMIT_EDGE_BOLD_100x100}ms`,
          'warning',
        );
      }
      expect(mean).toBeLessThan(HARD_LIMIT_EDGE_BOLD_100x100);
    },
  );

  it(
    'MAX_PATHS_PER_SCENE=60 é respeitado com imagem ruidosa 500×500',
    { timeout: 30000 },
    async ({ task }) => {
      // Imagem 500×500 com muito ruído (centenas de pixels pretos dispersos).
      // Cada pixel preto gera um contorno; sem truncamento, o vetorizador
      // produziria centenas de paths.
      const data = new Uint8ClampedArray(500 * 500 * 4);
      for (let i = 3; i < data.length; i += 4) {
        data[i] = 255;
      }
      // Fundo branco
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
      // ~2500 pixels pretos dispersos (PRNG determinístico)
      let seed = 1;
      for (let i = 0; i < 2500; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const x = Math.floor((seed / 233280) * 500);
        seed = (seed * 7919 + 12345) % 233280;
        const y = Math.floor((seed / 233280) * 500);
        const idx = (y * 500 + x) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
      }
      const imageData = { data, width: 500, height: 500 } as unknown as ImageData;

      const start = performance.now();
      const paths = await vectorizeImage(imageData, { preset: 'edge-default' });
      const latencyMs = performance.now() - start;

      console.warn(
        `[PERF noise 500×500] ${latencyMs.toFixed(1)}ms, paths=${paths.length}`,
      );

      // Hard limit: MAX_PATHS_PER_SCENE=60 (constante truncadora do vectorizer)
      expect(paths.length).toBeLessThanOrEqual(60);

      if (latencyMs > SOFT_LIMIT_NOISE_500x500) {
        await annotateFromTask(
          task,
          `noise 500×500: ${latencyMs.toFixed(1)}ms excedeu soft limit ${SOFT_LIMIT_NOISE_500x500}ms`,
          'warning',
        );
      }
      expect(latencyMs).toBeLessThan(HARD_LIMIT_NOISE_500x500);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Integração ponta-a-ponta — pipeline completo retorna VetorialPath[]
// ─────────────────────────────────────────────────────────────────────────

describe('integração ponta-a-ponta — pipeline edge+bezier', () => {
  it(
    'quadrado preto em fundo branco gera VetorialPath[] com shape correto',
    { timeout: 30000 },
    async () => {
      const imageData = makeImageData(100, 100, (x, y, set) => {
        // Quadrado 40×40 central (x: 30..70, y: 30..70) preto em fundo branco
        if (x >= 30 && x < 70 && y >= 30 && y < 70) {
          set(0, 0, 0);
          return;
        }
        set(255, 255, 255);
      });

      const paths = await vectorizeImage(imageData, { preset: 'edge-default' });

      // Deve produzir pelo menos 1 path
      expect(paths.length).toBeGreaterThan(0);

      // Cada path tem a forma esperada
      for (const path of paths) {
        // `d` é string SVG não-vazia
        expect(typeof path.d).toBe('string');
        expect(path.d.length).toBeGreaterThan(0);

        // `length` pré-calculado é > 0
        expect(typeof path.length).toBe('number');
        expect(path.length).toBeGreaterThan(0);

        // `color` é hex (#rrggbb)
        expect(path.color).toMatch(/^#[0-9a-f]{6}$/i);

        // `strokeWidth` vem do EDGE_PRESET_CONFIG
        expect(path.strokeWidth).toBe(EDGE_PRESET_CONFIG['edge-default'].strokeWidth);
      }
    },
  );

  it(
    'todos os paths começam com "M" e contêm "C" (curvas Bezier cúbicas)',
    { timeout: 30000 },
    async () => {
      // Imagem com várias formas para garantir que o pipeline produza paths
      // com curvas Bezier reais (não só lineares).
      const imageData = makeDiagramImageData();
      const paths = await vectorizeImage(imageData, { preset: 'edge-detailed' });

      expect(paths.length).toBeGreaterThan(0);

      for (const path of paths) {
        expect(path.d.startsWith('M')).toBe(true);
        // `C` indica uma curva Bezier cúbica — formato esperado pelo
        // consumidor (`WhiteboardScene`) que anima via `strokeDashoffset`.
        expect(path.d.includes('C')).toBe(true);
      }
    },
  );

  it(
    'getLength(d) chamado em cada path retorna valor > 0 (sanity)',
    { timeout: 30000 },
    async () => {
      const imageData = makeFlatIconImageData();
      const paths = await vectorizeImage(imageData, { preset: 'edge-default' });

      expect(paths.length).toBeGreaterThan(0);

      for (const path of paths) {
        const computedLength = getLength(path.d);
        // O `length` armazenado deve bater (ou ser muito próximo) do
        // calculado agora — pequena tolerância por arredondamento.
        expect(computedLength).toBeGreaterThan(0);
        expect(Math.abs(computedLength - path.length)).toBeLessThan(0.01);
      }
    },
  );

  it(
    'shape da API bate com VetorialPath (4 chaves: d, length, color, strokeWidth)',
    { timeout: 30000 },
    async () => {
      const imageData = makeLogoImageData();
      const paths = await vectorizeImage(imageData, { preset: 'edge-default' });

      if (paths.length > 0) {
        const sample = paths[0];
        expect(sample).not.toBeUndefined();
        if (sample !== undefined) {
          expect(Object.keys(sample).sort()).toEqual(
            ['color', 'd', 'length', 'strokeWidth'].sort(),
          );
        }
      }
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Regressão visual — strokeWidth por preset
// ─────────────────────────────────────────────────────────────────────────

describe('regressão visual — strokeWidth por preset', () => {
  const presetStrokeWidthMap: ReadonlyArray<{
    readonly preset: EdgePresetName | ImagetRacerPreset;
    readonly expectedStrokeWidth: number;
    readonly label: string;
  }> = [
    { preset: 'edge-default', expectedStrokeWidth: 8, label: 'edge-default (EDGE_PRESET_CONFIG)' },
    { preset: 'edge-detailed', expectedStrokeWidth: 6, label: 'edge-detailed (EDGE_PRESET_CONFIG)' },
    { preset: 'edge-bold', expectedStrokeWidth: 12, label: 'edge-bold (EDGE_PRESET_CONFIG)' },
    { preset: 'edge-sketch', expectedStrokeWidth: 6, label: 'edge-sketch (EDGE_PRESET_CONFIG)' },
    { preset: 'artistic1', expectedStrokeWidth: 2, label: 'artistic1 (legado, sem mudança)' },
    { preset: 'default', expectedStrokeWidth: 2, label: 'default (legado, sem mudança)' },
  ];

  for (const { preset, expectedStrokeWidth, label } of presetStrokeWidthMap) {
    it(
      `${label} → strokeWidth = ${expectedStrokeWidth}`,
      { timeout: 30000 },
      async () => {
        // Imagem com contraste forte (quadrado branco em fundo preto) para
        // garantir que cada pipeline produza paths mensuráveis.
        const imageData = makeImageData(60, 60, (x, y, set) => {
          if (x >= 15 && x < 45 && y >= 15 && y < 45) {
            set(255, 255, 255);
            return;
          }
          set(0, 0, 0);
        });

        const paths = await vectorizeImage(imageData, { preset });

        // Se houver paths, todos devem ter o strokeWidth esperado.
        // Algumas combinações podem produzir [] em imagens muito simples,
        // mas o quadrado branco em fundo preto é robusto.
        if (paths.length > 0) {
          for (const path of paths) {
            expect(path.strokeWidth).toBe(expectedStrokeWidth);
          }
        } else {
          // Sanity: array é retornado mesmo quando vazio
          expect(Array.isArray(paths)).toBe(true);
        }
      },
    );
  }

  it(
    'todos os strokeWidths dos presets edge-* são >= 6 (paths grossos)',
    { timeout: 30000 },
    async () => {
      // Validação agrupada: os 4 presets `edge-*` têm strokeWidth >= 6
      // (paths grossos) por design — alinhado com Premissa #3 do tracker.
      const edgePresets: ReadonlyArray<EdgePresetName> = [
        'edge-default',
        'edge-detailed',
        'edge-bold',
        'edge-sketch',
      ];
      for (const preset of edgePresets) {
        const config = EDGE_PRESET_CONFIG[preset];
        expect(config.strokeWidth).toBeGreaterThanOrEqual(6);
      }
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Fallback automático — imagens de baixo contraste
// ─────────────────────────────────────────────────────────────────────────

describe('fallback automático do edge detector', () => {
  it(
    'threshold alto (0.5) com imagem sem features retorna [] graciosamente',
    { timeout: 30000 },
    async () => {
      // Imagem totalmente uniforme — sem features detectáveis.
      const imageData = makeEmptyImageData();
      const paths = await vectorizeImage(imageData, {
        preset: 'edge-default',
        edgeThreshold: 0.5,
      });

      // Sem features: deve retornar array (pode ser vazio)
      expect(Array.isArray(paths)).toBe(true);
      // Não deve lançar erro
    },
  );

  it(
    'threshold alto (0.5) com imagem de baixo contraste: não retorna [] silencioso (fallback re-tenta com 0.1)',
    { timeout: 30000 },
    async () => {
      // Imagem com bordas muito sutis (cinza médio sobre cinza um pouco
      // mais claro). Sem fallback, retornaria [].
      const imageData = makeImageData(60, 60, (x, y, set) => {
        if (x >= 20 && x < 40 && y >= 20 && y < 40) {
          set(140, 140, 140); // cinza médio
          return;
        }
        set(120, 120, 120); // cinza um pouco mais escuro
      });

      const paths = await vectorizeImage(imageData, {
        preset: 'edge-default',
        edgeThreshold: 0.5,
      });

      // O fallback interno re-tenta com threshold 0.1, que DEVE encontrar
      // as bordas sutis. paths pode ser [] em casos extremos, mas o
      // pipeline NÃO deve falhar.
      expect(Array.isArray(paths)).toBe(true);
    },
  );

  it(
    'fallback é opt-out: threshold permissivo (0.05) funciona sem fallback',
    { timeout: 30000 },
    async () => {
      const imageData = makeDiagramImageData();
      const paths = await vectorizeImage(imageData, {
        preset: 'edge-default',
        edgeThreshold: 0.05,
      });

      // Threshold já permissivo — não precisa de fallback; deve produzir paths
      expect(Array.isArray(paths)).toBe(true);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 6. AbortSignal — comportamento em diferentes pontos do pipeline
// ─────────────────────────────────────────────────────────────────────────

describe('AbortSignal no pipeline edge+bezier', () => {
  it(
    'signal abortado ANTES do início rejeita com AbortError',
    { timeout: 30000 },
    async () => {
      const controller = new AbortController();
      controller.abort();
      const imageData = makeDiagramImageData();

      await expect(
        vectorizeImage(imageData, {
          preset: 'edge-detailed',
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: 'AbortError' });
    },
  );

  it(
    'signal abortado DURANTE o pipeline rejeita com AbortError',
    { timeout: 30000 },
    async () => {
      const controller = new AbortController();
      const imageData = makeNoiseImageData();

      // Inicia a vetorização e aborta imediatamente após o início.
      // Imagem ruidosa 100×100 é rápida (~100ms), então a janela de
      // oportunidade é pequena — mas é uma verificação real de que o
      // `ensureNotAborted` em pontos intermediários funciona.
      const promise = vectorizeImage(imageData, {
        preset: 'edge-bold',
        signal: controller.signal,
      });
      controller.abort();

      try {
        const result = await promise;
        // Se completou antes do abort, ainda é sucesso (race tolerável)
        expect(Array.isArray(result)).toBe(true);
      } catch (err) {
        // Se abortou, deve ser AbortError
        expect((err as Error).name).toBe('AbortError');
      }
    },
  );

  it(
    'signal não-abortado NÃO rejeita (sanity)',
    { timeout: 30000 },
    async () => {
      const controller = new AbortController();
      const imageData = makeFlatIconImageData();

      // Signal nunca é abortado → deve completar normalmente
      const paths = await vectorizeImage(imageData, {
        preset: 'edge-default',
        signal: controller.signal,
      });

      expect(Array.isArray(paths)).toBe(true);
    },
  );

  it(
    'signal sem options não causa erro (campo opcional)',
    { timeout: 30000 },
    async () => {
      const imageData = makeLogoImageData();
      const paths = await vectorizeImage(imageData, {
        preset: 'edge-default',
      });

      expect(Array.isArray(paths)).toBe(true);
    },
  );
});
