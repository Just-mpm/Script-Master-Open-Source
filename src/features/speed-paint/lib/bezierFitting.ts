/**
 * Ajuste de curvas Bezier cúbicas para contornos de bordas — pipeline edge+bezier.
 *
 * Recebe os contornos produzidos por `traceContours` e devolve uma lista de
 * paths SVG (atributo `d`) com curvas Bézier cúbicas que aproximam a forma
 * original, prontos para animação whiteboard com `strokeDashoffset`.
 *
 * ## Pipeline em 3 etapas (por contorno)
 *
 * 1. **Ramer-Douglas-Peucker (RDP):** simplifica a sequência de pontos removendo
 *    pontos com distância perpendicular ao segmento `< epsilon` (default 2.0).
 *    Algoritmo recursivo — encontra o ponto de maior distância perpendicular
 *    ao segmento (primeiro→último). Se > ε, subdivide nesse ponto e recursa
 *    nos 2 sub-segmentos. Preserva cantos e descarta redundâncias.
 *
 * 2. **Cubic Bezier least squares fitting (Schneider 1990):** ajusta curvas
 *    Bezier cúbicas aos pontos do RDP. Para cada par de pontos consecutivos,
 *    calcula tangentes de entrada/saída (via pontos vizinhos — forward/backward
 *    differences) e ajusta 2 pontos de controle via mínimos quadrados. Se o
 *    erro máximo > `fitError` (default 1.5), subdivide ao meio e reajusta
 *    recursivamente até `maxDepth` (default 10).
 *
 * 3. **Geração de SVG `d`:** começa com `M x0 y0` (primeiro ponto do RDP).
 *    Para cada par subsequente emite `C cx1 cy1, cx2 cy2, x y` (Bezier cúbica).
 *    Contornos `closed: true` não usam `Z` — a curva já fecha ao início via
 *    última Bezier que conecta de volta. `closed: false` apenas encerra a
 *    sequência. Validação final: `getLength(d) > 0 && Number.isFinite(length)`.
 *
 * ## Por que não normalizar coordenadas
 *
 * O consumidor (`imageProcessing.ts`) já recebe contornos em coordenadas
 * absolutas do canvas. Normalizar para [0,1] e re-escalar aqui seria trabalho
 * redundante. `width` e `height` são usados apenas para sanity check
 * (validação > 0).
 *
 * @see `src/features/speed-paint/lib/contourTracing.ts` — `Contour`/`Point2D`
 * @see `src/features/speed-paint/lib/edgeDetection.ts` — pipeline anterior
 * @see `docs/plan/edge-detection-whiteboard-architecture.md` §3.3
 * @see Schneider 1990 — "An Algorithm for Automatically Fitting Digitized
 *      Curves" (Graphics Gems, Academic Press)
 */

import { getLength } from '@remotion/paths';

import { createLogger } from '../../../lib/logger';
import type { Contour, Point2D } from './contourTracing';

const log = createLogger('bezier-fitting');

// ---------------------------------------------------------------------------
// Constantes — defaults alinhados ao plano §3.3
// ---------------------------------------------------------------------------

/** Tolerância RDP (Ramer-Douglas-Peucker). Quanto maior, mais simplificação. */
const DEFAULT_RDP_EPSILON = 2.0;

/** Erro máximo de fitting Bezier antes de subdivisão (Schneider 1990). */
const DEFAULT_FIT_ERROR = 1.5;

/** Profundidade máxima de subdivisão Bezier — evita loop infinito. */
const DEFAULT_MAX_DEPTH = 10;

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Path SVG individual com comprimento pré-calculado.
 * Compatível com `VetorialPath` (re-aproveita o shape para o consumidor final).
 */
export interface BezierPath {
  /** Atributo `d` do `<path>` SVG (ex: `"M 0 0 C ..."`). */
  d: string;
  /** Comprimento total pré-calculado via `@remotion/paths.getLength()`. */
  length: number;
}

/** Opções de ajuste de curvas Bezier em contornos de borda. */
export interface BezierFittingOptions {
  /** Tolerância Ramer-Douglas-Peucker (default: 2.0). */
  epsilon?: number;
  /** Erro máximo de fitting (default: 1.5). Se excedido, subdivide. */
  fitError?: number;
  /** Profundidade máxima de subdivisão (default: 10) para evitar loop infinito. */
  maxDepth?: number;
}

// ---------------------------------------------------------------------------
// Helpers SRP — cada função faz uma coisa só
// ---------------------------------------------------------------------------

/**
 * Valida dimensões do canvas. `width` e `height` devem ser > 0.
 * Lança `Error` com mensagem clara em caso de violação.
 */
function validateDimensions(width: number, height: number): void {
  if (width <= 0 || height <= 0) {
    throw new Error(
      `fitBezierPaths: dimensões inválidas (width=${width}, height=${height})`,
    );
  }
}

/** Resolve as opções com defaults alinhados ao plano §3.3. */
function resolveOptions(
  options: BezierFittingOptions | undefined,
): { epsilon: number; fitError: number; maxDepth: number } {
  return {
    epsilon: options?.epsilon ?? DEFAULT_RDP_EPSILON,
    fitError: options?.fitError ?? DEFAULT_FIT_ERROR,
    maxDepth: options?.maxDepth ?? DEFAULT_MAX_DEPTH,
  };
}

/**
 * Distância perpendicular de um ponto `p` à reta definida por `a` e `b`.
 * Retorna 0 quando `a` e `b` coincidem (segmento degenerado).
 */
function perpendicularDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    // `a` e `b` coincidem — distância é a distância de `p` a `a`.
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  // Fórmula da área do triângulo × 2 / base = distância perpendicular.
  return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / Math.sqrt(len2);
}

/**
 * Ramer-Douglas-Peucker recursivo. Simplifica uma sequência de pontos
 * preservando cantos cuja distância perpendicular ao segmento é > ε.
 */
function rdp(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) {
    return points.slice();
  }
  // Encontra o ponto de maior distância ao segmento (primeiro, último).
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i]!, first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  // Se nenhum ponto supera o epsilon, descarta todos os intermediários.
  if (maxDist <= epsilon) {
    return [first, last];
  }
  // Subdivide no ponto de maior distância e recursa.
  const left = rdp(points.slice(0, maxIdx + 1), epsilon);
  const right = rdp(points.slice(maxIdx), epsilon);
  // Concatena sem duplicar o ponto pivô (último da esquerda = primeiro da direita).
  return left.concat(right.slice(1));
}

/**
 * Subtrai vetores 2D. `a - b`.
 */
function vecSub(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Soma vetores 2D. `a + b`.
 */
function vecAdd(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Escala vetor 2D por escalar.
 */
function vecScale(a: Point2D, s: number): Point2D {
  return { x: a.x * s, y: a.y * s };
}

/**
 * Calcula a tangente unitária no ponto `i` da sequência.
 * Usa central differences quando há vizinhos left/right; cai para forward
 * difference no início e backward difference no fim.
 *
 * Retorna `{0,0}` quando os 3 pontos (left, current, right) são colineares
 * E coincidentes em magnitude — caso degenerado (sequência colapsada).
 */
function computeCenterTangent(points: Point2D[], i: number): Point2D {
  const current = points[i]!;
  const left = points[i - 1] ?? current;
  const right = points[i + 1] ?? current;
  // Direção = (right - left) normalizada.
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    // Sem direção definida (pontos coincidentes) — tangente zero.
    return { x: 0, y: 0 };
  }
  return { x: dx / len, y: dy / len };
}

/**
 * Calcula a magnitude do segmento entre dois pontos.
 */
function segmentLength(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Ajusta control points de uma Bezier cúbica aos pontos fornecidos, dadas
 * as tangentes de entrada e saída. Algoritmo de Schneider 1990 com sistema
 * linear 2x2 resolvido pela regra de Cramer.
 *
 * - `leftTangent`: tangente unitária de saída em `points[first]`
 * - `rightTangent`: tangente unitária de entrada em `points[last]`
 * - Retorna `{ leftHandle, rightHandle }` (os 2 control points).
 */
function fitBezierSegment(
  points: Point2D[],
  first: number,
  last: number,
  leftTangent: Point2D,
  rightTangent: Point2D,
): { leftHandle: Point2D; rightHandle: Point2D } {
  // Casos triviais: início = fim ou adjacentes.
  if (last === first + 1) {
    // Segmento reto entre 2 pontos — control points a 1/3 do caminho.
    const p1 = points[first]!;
    const p2 = points[last]!;
    const seg = segmentLength(p1, p2) / 3;
    return {
      leftHandle: vecAdd(p1, vecScale(leftTangent, seg)),
      rightHandle: vecSub(p2, vecScale(rightTangent, seg)),
    };
  }

  // Sistema linear 2x2 (Schneider 1990) — resolve a + b = C e a·c1 + b·c2 = C·c12.
  const pFirst = points[first]!;
  const pLast = points[last]!;
  const c1 = vecScale(leftTangent, 3 * segmentLength(pFirst, points[first + 1]!));
  const c2 = vecScale(rightTangent, 3 * segmentLength(pLast, points[last - 1]!));

  // Resolve matriz [[c1·c1, -c1·c2], [-c1·c2, c2·c2]] * [a, b]^T = [c1·(pLast-pFirst), c2·(pLast-pFirst)]^T
  // (Schneider 1990 — eq. 7-9 com notação padrão).
  const v = vecSub(pLast, pFirst);
  const c1DotC1 = c1.x * c1.x + c1.y * c1.y;
  const c1DotC2 = c1.x * c2.x + c1.y * c2.y;
  const c2DotC2 = c2.x * c2.x + c2.y * c2.y;
  const c1DotV = c1.x * v.x + c1.y * v.y;
  const c2DotV = c2.x * v.x + c2.y * v.y;
  const denom = c1DotC1 * c2DotC2 - c1DotC2 * c1DotC2;

  let alpha: number;
  let beta: number;
  if (denom === 0) {
    // Pontos colineares — fallback para control points proporcionais.
    alpha = 0;
    beta = 0;
  } else {
    alpha = (c1DotV * c2DotC2 - c2DotV * c1DotC2) / denom;
    beta = (c2DotV * c1DotC1 - c1DotV * c1DotC2) / denom;
  }
  // Clamp para evitar magnitudes negativas (degenerate bezier).
  if (alpha < 0) alpha = 0;
  if (beta < 0) beta = 0;

  return {
    leftHandle: vecAdd(pFirst, vecScale(c1, alpha / 3)),
    rightHandle: vecAdd(pLast, vecScale(c2, beta / 3)),
  };
}

/**
 * Calcula a Bezier cúbica entre `points[first]` e `points[last]` e mede
 * o erro máximo (distância de cada ponto intermediário à curva).
 *
 * Usa aproximação discreta: amostra a curva em `nSamples` pontos e mede
 * a distância de cada `points[i]` (first < i < last) ao ponto amostrado
 * mais próximo — O(n × samples) que é aceitável para 100s de pontos.
 */
function computeBezierError(
  points: Point2D[],
  first: number,
  last: number,
  leftHandle: Point2D,
  rightHandle: Point2D,
  nSamples: number,
): number {
  const p0 = points[first]!;
  const p3 = points[last]!;
  const p1 = leftHandle;
  const p2 = rightHandle;
  // Pré-calcula os pontos amostrados da curva Bezier.
  const samples: Point2D[] = new Array(nSamples);
  for (let k = 0; k < nSamples; k++) {
    const t = k / (nSamples - 1);
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
    samples[k] = { x, y };
  }
  // Para cada ponto intermediário, encontra a menor distância aos samples.
  let maxErr = 0;
  for (let i = first + 1; i < last; i++) {
    const p = points[i]!;
    let minD = Number.POSITIVE_INFINITY;
    for (let k = 0; k < nSamples; k++) {
      const s = samples[k]!;
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < minD) minD = d;
    }
    if (minD > maxErr) maxErr = minD;
  }
  return maxErr;
}

/**
 * Resultado de `fitBezierRecursive`: lista de control points Bezier encadeados.
 * Cada par `Bezier` representa o segmento entre 2 pontos do RDP.
 */
interface Bezier {
  /** Ponto de controle 1 (saída de `start`). */
  c1: Point2D;
  /** Ponto de controle 2 (entrada de `end`). */
  c2: Point2D;
  /** Ponto final do segmento Bezier (= próximo `start`). */
  end: Point2D;
}

/**
 * Adiciona recursivamente curvas Bezier entre `first` e `last` da sequência
 * `points`. Em cada nível, tenta ajustar uma única Bezier; se o erro máximo
 * > `fitError` E a profundidade < `maxDepth`, subdivide no ponto médio e
 * recursa nas duas metades.
 */
function fitBezierRecursive(
  points: Point2D[],
  first: number,
  last: number,
  leftTangent: Point2D,
  rightTangent: Point2D,
  depth: number,
  maxDepth: number,
  fitError: number,
): Bezier[] {
  const pLast = points[last]!;

  // Ajusta uma Bezier única.
  const { leftHandle, rightHandle } = fitBezierSegment(
    points,
    first,
    last,
    leftTangent,
    rightTangent,
  );
  // Calcula erro com 10 amostras (suficiente para detecção de dobra pronunciada).
  const err = computeBezierError(points, first, last, leftHandle, rightHandle, 10);

  // Critérios de parada:
  // 1. Erro aceitável OU
  // 2. Profundidade máxima atingida OU
  // 3. first+1 >= last (1 ponto entre eles — não há o que ajustar).
  if (err <= fitError || depth >= maxDepth || last <= first + 1) {
    return [{ c1: leftHandle, c2: rightHandle, end: pLast }];
  }

  // Subdivisão no ponto médio — recursa nas duas metades.
  const mid = (first + last) >> 1;
  // Tangente no ponto médio = média das tangentes dos extremos (aproximação suave).
  const leftTangentMid = computeCenterTangent(points, mid);
  const rightTangentMid = leftTangentMid;

  const leftHalf = fitBezierRecursive(
    points,
    first,
    mid,
    leftTangent,
    rightTangentMid,
    depth + 1,
    maxDepth,
    fitError,
  );
  const rightHalf = fitBezierRecursive(
    points,
    mid,
    last,
    leftTangentMid,
    rightTangent,
    depth + 1,
    maxDepth,
    fitError,
  );
  return leftHalf.concat(rightHalf);
}

/**
 * Formata um número com até 3 casas decimais (suficiente para coordenadas
 * SVG e mais legível que `toString()` que pode produzir notação científica).
 */
function formatCoord(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(3);
}

/**
 * Converte uma sequência simplificada (após RDP) + lista de Beziers em
 * um atributo `d` SVG. Para contornos `closed: true`, não usa `Z` —
 * a última Bezier conecta de volta ao primeiro ponto.
 */
function pointsToSvg(
  start: Point2D,
  beziers: Bezier[],
  isClosed: boolean,
): string {
  const parts: string[] = [`M ${formatCoord(start.x)} ${formatCoord(start.y)}`];
  for (const b of beziers) {
    parts.push(
      `C ${formatCoord(b.c1.x)} ${formatCoord(b.c1.y)}, ${formatCoord(b.c2.x)} ${formatCoord(b.c2.y)}, ${formatCoord(b.end.x)} ${formatCoord(b.end.y)}`,
    );
  }
  if (isClosed) {
    // Fecha conectando o último end de volta ao start com uma Bezier "linha"
    // (control points coincidentes com endpoints) — alternativa a `Z` que
    // produz uma linha reta. Escolhemos não emitir Z pois a animação
    // whiteboard usa strokeDashoffset e `Z` introduz comandos extras que
    // confundiriam o cálculo de comprimento.
    parts.push(
      `C ${formatCoord(start.x)} ${formatCoord(start.y)}, ${formatCoord(start.x)} ${formatCoord(start.y)}, ${formatCoord(start.x)} ${formatCoord(start.y)}`,
    );
  }
  return parts.join(' ');
}

/**
 * Constrói um `BezierPath` validado a partir de um atributo `d`.
 * Retorna `null` quando `getLength` retorna 0, NaN ou Infinity — caso o
 * `d` seja degenerado (sem segmentos válidos).
 */
function buildValidatedPath(d: string): BezierPath | null {
  if (d.length === 0) {
    return null;
  }
  let length: number;
  try {
    length = getLength(d);
  } catch (err) {
    // `getLength` lança em paths totalmente malformados (raríssimo).
    log.warn('getLength falhou — descartando path', {
      d: d.substring(0, 80),
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
  if (!Number.isFinite(length) || length <= 0) {
    log.warn('Path com length inválido (0/NaN/Infinity) — descartando', {
      d: d.substring(0, 80),
      length,
    });
    return null;
  }
  return { d, length };
}

/**
 * Processa um único contorno: RDP → Bezier fit → SVG `d` → validação.
 * Retorna `null` se o contorno for muito pequeno (≤ 1 ponto) ou se o
 * `d` resultante for inválido.
 */
function processContour(
  contour: Contour,
  epsilon: number,
  fitError: number,
  maxDepth: number,
): BezierPath | null {
  if (contour.points.length < 2) {
    return null;
  }
  // 1. RDP — simplifica a sequência preservando cantos.
  const simplified = rdp(contour.points, epsilon);
  if (simplified.length < 2) {
    // RDP colapsou para um único ponto — descarta.
    return null;
  }
  // 2. Bezier fit.
  const start = simplified[0]!;
  const lastIdx = simplified.length - 1;
  const end = simplified[lastIdx]!;
  const leftTangent = computeCenterTangent(simplified, 0);
  const rightTangent = computeCenterTangent(simplified, lastIdx);
  let beziers: Bezier[];
  if (simplified.length === 2) {
    // Apenas 2 pontos — uma única Bezier reta (control points a 1/3).
    const seg = segmentLength(start, end) / 3;
    beziers = [
      {
        c1: vecAdd(start, vecScale(leftTangent, seg)),
        c2: vecSub(end, vecScale(rightTangent, seg)),
        end,
      },
    ];
  } else {
    beziers = fitBezierRecursive(
      simplified,
      0,
      lastIdx,
      leftTangent,
      rightTangent,
      0,
      maxDepth,
      fitError,
    );
  }
  // 3. Geração de `d` SVG.
  const d = pointsToSvg(start, beziers, contour.closed);
  // 4. Validação via getLength.
  return buildValidatedPath(d);
}

// ---------------------------------------------------------------------------
// API pública — orquestrador
// ---------------------------------------------------------------------------

/**
 * Ajusta curvas Bezier cúbicas aos contornos de borda de uma imagem.
 *
 * Pipeline: RDP (simplificação) → Schneider 1990 (least squares fit) →
 * SVG `d` (comandos M + C) → validação via `@remotion/paths.getLength()`.
 *
 * @param contours - Lista de contornos produzidos por `traceContours`.
 * @param width - Largura do canvas (sanity check > 0).
 * @param height - Altura do canvas (sanity check > 0).
 * @param options - Configurações opcionais (epsilon RDP, fitError, maxDepth).
 * @returns Lista de `BezierPath` validados e prontos para animação.
 * @throws Error se `width` ou `height` forem ≤ 0.
 *
 * @example
 * ```ts
 * const contours = traceContours(edgeMap, width, height);
 * const paths = fitBezierPaths(contours, width, height);
 * // paths[0].d → "M 10 10 C 20 30, 40 50, 60 60"
 * // paths[0].length → 68.42
 * ```
 */
export function fitBezierPaths(
  contours: Contour[],
  width: number,
  height: number,
  options?: BezierFittingOptions,
): BezierPath[] {
  validateDimensions(width, height);
  const { epsilon, fitError, maxDepth } = resolveOptions(options);

  if (contours.length === 0) {
    return [];
  }

  log.debug('Iniciando ajuste Bezier em contornos', {
    contourCount: contours.length,
    epsilon,
    fitError,
    maxDepth,
  });

  const out: BezierPath[] = [];
  let dropped = 0;
  for (const contour of contours) {
    const path = processContour(contour, epsilon, fitError, maxDepth);
    if (path === null) {
      dropped += 1;
      continue;
    }
    out.push(path);
  }
  log.debug('Ajuste Bezier concluído', {
    input: contours.length,
    output: out.length,
    dropped,
  });
  return out;
}
