/**
 * Contour tracing Moore-Neighbor com regra de Jacob Eliosoff para o pipeline
 * edge+bezier do modo vetorial do Speed Paint.
 *
 * ## Pipeline
 *
 * 1. **Varredura raster** — para cada pixel `(x, y)` de borda não visitado,
 *    inicia um novo contorno
 * 2. **Moore-Neighbor tracing** — segue a borda em 8-vizinhança, sempre
 *    escolhendo o próximo vizinho que **minimiza o ângulo de mudança de
 *    direção** (fork handling)
 * 3. **Regra de Jacob Eliosoff** — detecção de loop: encerra quando o
 *    algoritmo tenta voltar a um pixel já visitado pela mesma direção de
 *    entrada pela 2ª vez
 * 4. **Filtro** — descarta contornos com `points.length < minContourLength`
 *
 * ## Saída
 *
 * Array de `Contour`, cada um com:
 * - `points: Point2D[]` — sequência ordenada de pixels do contorno
 * - `closed: boolean` — `true` se voltou ao pixel inicial; `false` se
 *   atingiu borda, pixel já visitado (sem fechar) ou guard de iterações
 *
 * ## Algoritmo
 *
 * Baseado em Moore-Neighbor Tracing clássico (Gonzalez & Woods, 1992) com
 * a extensão de Jacob Eliosoff para robustez contra auto-intersecções
 * (https://jacobeliosoff.com/2011/04/04/moore-neighbour-contour-tracing.html).
 *
 * A regra de Eliosoff resolve dois problemas do algoritmo clássico:
 * 1. **Loops infinitos** em pixels espúriós: o clássico pode girar
 *    indefinidamente em clusters de 4 pixels. Eliosoff detecta quando a
 *    mesma tupla `(x, y, entryDir)` aparece 2x.
 * 2. **Figuras abertas**: garante terminação quando o tracing sai da
 *    borda ou encontra um pixel já consumido por outro contorno.
 *
 * ## Performance
 *
 * Acesso linear a `Uint8Array` (cálculo de `idx = y * width + x` em
 * variável local). `visited` é `Uint8Array` paralelo (mesma técnica de
 * `edgeDetection.ts`). Guard de iterações (`MAX_ITERATIONS_PER_CONTOUR`)
 * evita loops em casos degenerados.
 *
 * ## Edge cases
 *
 * - `edgeMap` vazio ou `width*height === 0` → retorna `[]`
 * - Todos pixels são 0 → retorna `[]`
 * - `width !== edgeMap.length / height` → lança `Error` (sanity check)
 * - Pixel inicial já visitado (após fork) → ignorado
 * - Contorno degenerado (1 pixel) → descartado pelo filtro de
 *   `minContourLength` (default 10)
 *
 * @see `src/features/speed-paint/lib/edgeDetection.ts` — entrada (Leva 1.2)
 * @see `src/features/speed-paint/lib/bezierFitting.ts` — próximo estágio (Leva 2.2)
 * @see `docs/plan/edge-detection-whiteboard-architecture.md` §3.2
 */

import { createLogger } from '../../../lib/logger';

const log = createLogger('contour-tracing');

// ---------------------------------------------------------------------------
// Constantes — direções 8-vizinhança e defaults
// ---------------------------------------------------------------------------

/**
 * Direções 8-vizinhança em ordem anti-horária partindo de East.
 *
 * ```
 *  6=N  7=NE  0=E
 *  5=NW  *   1=SE
 *  4=W   3=SW  2=S
 * ```
 *
 * O delta `(dx, dy)` é o passo para mover de um pixel ao vizinho naquela
 * direção. Usado por `getNeighbor` e `findNextNeighbor`.
 */
const DX: readonly number[] = [1, 1, 0, -1, -1, -1, 0, 1];
const DY: readonly number[] = [0, 1, 1, 1, 0, -1, -1, -1];

/** Total de direções (8-vizinhança). */
const DIRECTION_COUNT = 8;

/** Máscara para wrap-around de direção (8 → 0, 9 → 1, etc). */
const DIRECTION_MASK = DIRECTION_COUNT - 1;

/**
 * Default do filtro `minContourLength` (descarta contornos com menos pontos
 * que este mínimo). Valor escolhido empiricamente — contornos menores
 * geralmente são ruído da edge detection e não geram bezier útil.
 */
const DEFAULT_MIN_CONTOUR_LENGTH = 10;

/**
 * Guard contra loops infinitos em casos degenerados. Cada pixel contribui
 * no máximo uma iteração; 4× o tamanho do mapa é um limite seguro que
 * detecta loops sem ser restritivo demais para contornos longos.
 */
const MAX_ITERATIONS_PER_CONTOUR_MULTIPLIER = 4;

// ---------------------------------------------------------------------------
// API pública — tipos
// ---------------------------------------------------------------------------

/** Ponto 2D em coordenadas inteiras (pixel). */
export interface Point2D {
  x: number;
  y: number;
}

/** Contorno extraído de um `edgeMap` binário. */
export interface Contour {
  /** Sequência ordenada de pontos (x, y) do contorno. */
  points: Point2D[];
  /** `true` se o contorno fechou de volta ao ponto inicial; `false` se atingiu borda. */
  closed: boolean;
}

/** Opções de configuração do tracer. */
export interface ContourTracingOptions {
  /** Descartar contornos com menos pontos que este mínimo (default: 10). */
  minContourLength?: number;
}

// ---------------------------------------------------------------------------
// Helpers SRP (cada um faz uma coisa só)
// ---------------------------------------------------------------------------

/**
 * Valida o edgeMap e dimensões. Lança `Error` com mensagem clara se alguma
 * invariante for violada.
 */
function validateInputs(edgeMap: Uint8Array, width: number, height: number): void {
  if (width <= 0 || height <= 0) {
    throw new Error(
      `traceContours: dimensões inválidas (width=${width}, height=${height})`,
    );
  }
  const expected = width * height;
  if (edgeMap.length !== expected) {
    throw new Error(
      `traceContours: edgeMap.length (${edgeMap.length}) !== width * height (${expected})`,
    );
  }
}

/**
 * Retorna o vizinho de `(x, y)` na direção `dir` (0..7), ou `null` se
 * estiver fora de `[0, width) × [0, height)`.
 */
function getNeighbor(x: number, y: number, dir: number, width: number, height: number): Point2D | null {
  const nx = x + DX[dir]!;
  const ny = y + DY[dir]!;
  if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
    return null;
  }
  return { x: nx, y: ny };
}

/** Marca o pixel `(x, y)` como visitado. */
function markVisited(x: number, y: number, visited: Uint8Array, width: number): void {
  visited[y * width + x] = 1;
}

/**
 * Distância angular circular mínima entre duas direções (0..7). Usada pela
 * heurística de fork handling para escolher o vizinho que mantém a direção
 * predominante.
 *
 * Retorna valor em [0, 4] (0 = mesma direção, 4 = direção oposta).
 */
function angularDistance(prevDir: number, nextDir: number): number {
  const diff = (nextDir - prevDir + DIRECTION_COUNT) & DIRECTION_MASK;
  return diff > 4 ? DIRECTION_COUNT - diff : diff;
}

/**
 * A partir de `(x, y)`, escolhe o próximo pixel de borda não visitado na
 * 8-vizinhança, **minimizando o ângulo de mudança de direção** em relação
 * a `prevDir` (fork handling).
 *
 * Varre as 8 direções em ordem anti-horária a partir de `(prevDir + 1) % 8`
 * (backtrack clássico de Moore-Neighbor). Retorna o PRIMEIRO pixel de
 * borda não visitado com menor distância angular. Empate: vence o que
 * aparece primeiro na varredura (anti-horário).
 *
 * @returns Tupla `[nx, ny, entryDir]` do próximo pixel, ou `null` se
 *          nenhum vizinho válido (atingiu borda ou já consumido).
 */
function findNextNeighbor(
  x: number,
  y: number,
  prevDir: number,
  edgeMap: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; entryDir: number } | null {
  // Backtrack clássico: começa a busca em (prevDir + 1) % 8 — sentido
  // anti-horário a partir da direção oposta à última entrada.
  const startDir = (prevDir + 1) & DIRECTION_MASK;

  let bestX = 0;
  let bestY = 0;
  let bestEntryDir = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  let found = false;

  for (let i = 0; i < DIRECTION_COUNT; i++) {
    const dir = (startDir + i) & DIRECTION_MASK;
    const neighbor = getNeighbor(x, y, dir, width, height);
    if (neighbor === null) continue;
    const idx = neighbor.y * width + neighbor.x;
    if (edgeMap[idx] !== 1 || visited[idx] === 1) continue;

    // entryDir = direção da qual entramos neste vizinho (oposta a `dir`).
    // Se saímos de (x,y) na direção `dir` para chegar em (nx,ny), então
    // a entryDir de (nx,ny) é `dir + 4` (de onde viemos).
    const entryDir = (dir + 4) & DIRECTION_MASK;
    const dist = angularDistance(prevDir, entryDir);
    if (dist < bestDist) {
      bestDist = dist;
      bestX = neighbor.x;
      bestY = neighbor.y;
      bestEntryDir = entryDir;
      found = true;
    }
  }

  if (!found) {
    return null;
  }
  return { x: bestX, y: bestY, entryDir: bestEntryDir };
}

/**
 * Executa o Moore-Neighbor tracing a partir de `(startX, startY)`.
 *
 * Aplica a regra de Jacob Eliosoff: encerra quando a tupla
 * `(x, y, entryDir)` aparece pela 2ª vez (loop detectado) ou quando
 * `findNextNeighbor` retorna `null` (atingiu borda / pixel já consumido).
 *
 * Retorna o `Contour` com `points` (pode ter 1+ pontos) e `closed` (true
 * se o último ponto é igual ao primeiro).
 */
function mooreNeighborTrace(
  startX: number,
  startY: number,
  edgeMap: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
): Contour {
  // entryDir inicial = W (4) — convenção: "viemos de fora da imagem pela
  // esquerda" (sentido de varredura raster padrão). backtrack = (W+1)%8 = NW (5).
  const initialEntryDir = 4; // W
  let curX = startX;
  let curY = startY;
  let prevDir = initialEntryDir;

  const points: Point2D[] = [{ x: startX, y: startY }];
  // Set de tuplas (x, y, entryDir) visitadas — chave string para performance
  // (Set<number> com hash de 3 ints seria mais rápido mas mais verboso).
  const seenTuples = new Set<string>();
  seenTuples.add(`${startX},${startY},${initialEntryDir}`);

  const maxIterations = width * height * MAX_ITERATIONS_PER_CONTOUR_MULTIPLIER;
  let iterations = 0;

  while (iterations++ < maxIterations) {
    const next = findNextNeighbor(
      curX,
      curY,
      prevDir,
      edgeMap,
      visited,
      width,
      height,
    );

    // Sem próximo vizinho: contorno aberto (atingiu borda ou pixel consumido).
    if (next === null) {
      const first = points[0]!;
      const last = points[points.length - 1]!;
      return { points, closed: first.x === last.x && first.y === last.y };
    }

    // Regra de Jacob Eliosoff: tupla (x, y, entryDir) repetida → loop.
    const tupleKey = `${next.x},${next.y},${next.entryDir}`;
    if (seenTuples.has(tupleKey)) {
      const first = points[0]!;
      // Se voltou ao pixel inicial, é um contorno fechado.
      const closed = next.x === first.x && next.y === first.y;
      return { points, closed };
    }

    seenTuples.add(tupleKey);
    markVisited(next.x, next.y, visited, width);
    points.push({ x: next.x, y: next.y });

    // entryDir do próximo pixel é a direção da qual saímos do anterior
    // (oposta à direção do vizinho) — calcula a partir de (curX,curY)→(next.x,next.y).
    const dx = next.x - curX;
    const dy = next.y - curY;
    let exitDir = 0;
    for (let d = 0; d < DIRECTION_COUNT; d++) {
      if (DX[d] === dx && DY[d] === dy) {
        exitDir = d;
        break;
      }
    }
    curX = next.x;
    curY = next.y;
    prevDir = exitDir;
  }

  // Guard de iterações atingido: contorno degenerado ou loop muito longo.
  // Marca como aberto (não conseguiu fechar) e emite warning.
  log.warn('Contorno atingiu guard de iterações — marcado como aberto', {
    startX,
    startY,
    points: points.length,
    maxIterations,
  });
  return { points, closed: false };
}

// ---------------------------------------------------------------------------
// API pública — orquestrador
// ---------------------------------------------------------------------------

/**
 * Extrai contornos de um mapa binário de bordas via Moore-Neighbor tracing
 * com regra de Jacob Eliosoff e heurística de fork handling.
 *
 * Algoritmo:
 * 1. Varre o `edgeMap` em ordem raster (top-down, left-to-right)
 * 2. Para cada pixel de borda não visitado, inicia um novo contorno
 * 3. Aplica `mooreNeighborTrace` que segue a borda em 8-vizinhança
 * 4. Descarta contornos com `points.length < minContourLength`
 *
 * @param edgeMap - Mapa binário de bordas (`Uint8Array` de comprimento
 *                  `width × height`, valores 0 ou 1). Produzido por
 *                  `detectEdges()` de `edgeDetection.ts`.
 * @param width - Largura do mapa em pixels.
 * @param height - Altura do mapa em pixels.
 * @param options - Configurações opcionais (`minContourLength`).
 * @returns Array de `Contour` filtrado por `minContourLength`. Ordem dos
 *          contornos segue a varredura raster (top-down, left-to-right).
 * @throws Error se `width <= 0`, `height <= 0`, ou `edgeMap.length !==
 *         width * height`.
 *
 * @example
 * ```ts
 * const edgeMap = detectEdges(imageData);
 * const contours = traceContours(edgeMap, imageData.width, imageData.height);
 * for (const contour of contours) {
 *   console.log(contour.points.length, contour.closed);
 * }
 * ```
 */
export function traceContours(
  edgeMap: Uint8Array,
  width: number,
  height: number,
  options?: ContourTracingOptions,
): Contour[] {
  validateInputs(edgeMap, width, height);

  const minContourLength = options?.minContourLength ?? DEFAULT_MIN_CONTOUR_LENGTH;
  const size = width * height;

  // Edge case: mapa vazio ou dimensão zero.
  if (size === 0) {
    log.debug('EdgeMap vazio — retornando []');
    return [];
  }

  const visited = new Uint8Array(size);
  const contours: Contour[] = [];

  // Varredura raster — ordem top-down, left-to-right.
  for (let y = 0; y < height; y++) {
    const rowStart = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowStart + x;
      if (edgeMap[idx] !== 1 || visited[idx] === 1) {
        continue;
      }

      // Marca o pixel inicial como visitado ANTES de chamar o tracer —
      // garante que o primeiro pixel é contabilizado mesmo se o tracer
      // falhar em marcá-lo internamente.
      markVisited(x, y, visited, width);
      const contour = mooreNeighborTrace(x, y, edgeMap, visited, width, height);

      if (contour.points.length >= minContourLength) {
        contours.push(contour);
      }
    }
  }

  log.debug('Contour tracing concluído', {
    width,
    height,
    contourCount: contours.length,
    minContourLength,
  });

  return contours;
}
