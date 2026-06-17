/**
 * Wrapper assíncrono que delega a dois pipelines de vetorização:
 *
 * 1. **Legado (`imagetracerjs`)** — para os 16 presets `ImagetRacerPreset`
 *    (`'artistic1'`, `'detailed'`, etc). Preservado 100% (sem mudança de
 *    comportamento) — usado em produção desde a v0.131.0.
 *
 * 2. **Edge+Bezier** — para os 4 presets `EdgePresetName` (`'edge-default'`,
 *    `'edge-detailed'`, `'edge-bold'`, `'edge-sketch'`) adicionados na
 *    v0.132.0. Pipeline novo: Canny → Moore-Neighbor → RDP → Schneider 1990
 *    → SVG `d`. Mais determinístico e amigável ao whiteboard.
 *
 * O branch é decidido por `options.pipelineMode` (override explícito) ou
 * automaticamente por `isEdgePreset(preset)` (default = `pipelineMode: undefined`).
 *
 * ## Saída
 *
 * `VetorialPath[]` com `d`, `length`, `color`, `strokeWidth` prontos para
 * animação com `strokeDashoffset` no Remotion.
 *
 * ## Por que `async`
 *
 * A vetorização é majoritariamente síncrona internamente, mas a API é
 * assíncrona para:
 * - Contrato uniforme com `generateStrokesFromImage()` (consumidor em
 *   `imageProcessing.ts` faz `await`)
 * - Suporte a `AbortSignal` (yield entre etapas, cancelar mid-flight)
 *
 * @see `src/features/speed-paint/types/vetorial.ts` — tipos `VetorialPath`
 * @see `src/features/video-render/components/WhiteboardScene.tsx` — consumidor
 * @see `src/features/speed-paint/lib/edgeDetection.ts` — pipeline edge
 * @see `src/features/speed-paint/lib/contourTracing.ts` — pipeline edge
 * @see `src/features/speed-paint/lib/bezierFitting.ts` — pipeline edge
 */

import { getLength } from '@remotion/paths';
import ImageTracer from 'imagetracerjs';

import { createLogger } from '../../../lib/logger';
import type {
  VetorialPath,
  VetorialPathSortOrder,
  VetorialPreset,
} from '../types/vetorial';
import {
  EDGE_PRESET_CONFIG,
  isEdgePreset,
  type EdgePresetName,
  type ImagetRacerPreset,
} from '../constants/vetorialPresets';
import type { BezierPath } from './bezierFitting';
import type { Contour } from './contourTracing';
import { fitBezierPaths } from './bezierFitting';
import { detectEdges } from './edgeDetection';
import { traceContours } from './contourTracing';

const log = createLogger('vectorizer');

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/**
 * Default do preset — `'edge-default'` é o novo sweet spot do pipeline
 * edge+bezier (v0.132.0). O tipo foi expandido de `ImagetRacerPreset`
 * para `VetorialPreset` completo para acomodar tanto a família legada
 * quanto a nova família `edge-*`. O type guard `isEdgePreset` decide
 * o pipeline em runtime.
 */
const DEFAULT_PRESET: VetorialPreset = 'edge-default';

/** Tamanho mínimo (em "unidades de comprimento SVG") para aceitar um path. */
const DEFAULT_PATHOMIT = 8;

/** Espessura padrão do traço em pixels SVG. */
const DEFAULT_STROKE_WIDTH = 2;

/** Cor padrão do traço quando o path não tem `fill` (ou `fill="none"`). */
const DEFAULT_COLOR = '#222222';

/** Quantos paths processar antes de checar `signal?.aborted`. */
const ABORT_CHECK_INTERVAL = 50;

/**
 * Limite máximo de paths por cena para evitar que SVGs muito complexos
 * travem o Remotion durante a exportação. Quando o vetorizador gera mais
 * paths que este limite, descarta os excedentes e loga um warning.
 *
 * ## Por que 60?
 *
 * O pipeline edge+bezier (v0.132.0) tende a gerar mais paths por cena que
 * o `imagetracerjs` legado — cada contorno virado é uma `BezierPath`
 * independente, e presets `edge-detailed` (ε=1.0) geram contornos
 * granulares. 60 é o sweet spot observado: imagens flat design (ícones,
 * diagramas) ficam bem representadas; fotos complexas perdem detalhes
 * finos mas mantêm a estrutura reconhecível. Reduzido de 150 (legado) →
 * 60 (edge) com base em benchmarks com 100 imagens.
 *
 * Usuários que precisarem de mais qualidade podem usar `pathomit` maior
 * para remover paths pequenos, ou trocar para um preset `edge-bold` (que
 * tem strokeWidth 12 e ε=3.0 — gera menos paths).
 *
 * @see Premissa #12 do tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`
 * @see https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md#pathomit
 */
const MAX_PATHS_PER_SCENE = 60;

/**
 * `pathomit` mínimo por preset. Presets que tendem a gerar muitos paths
 * (ex: `'detailed'` com `pathomit: 0` na lib) recebem um valor mais alto
 * para controlar a complexidade do SVG resultante.
 *
 * O `pathomit` efetivo enviado ao `imagetracerjs` é o MAIOR entre o
 * `options.pathomit` (override do usuário) e este valor por preset.
 *
 * Referência: presets do `imagetracerjs` (1.2.6) + testes empíricos
 * com imagens flat design 1920×1080.
 */
const PATHOMIT_BY_PRESET: Record<ImagetRacerPreset, number> = {
  default: 8,
  posterized1: 8,
  posterized2: 8,
  posterized3: 8,
  curvy: 10,
  sharp: 10,
  detailed: 20, // pathomit: 0 na lib + numberofcolors: 64 — gera muitos paths
  smoothed: 10,
  grayscale: 8,
  fixedpalette: 8,
  randomsampling1: 12,
  randomsampling2: 12,
  artistic1: 8, // default — sweet spot
  artistic2: 10,
  artistic3: 12,
  artistic4: 15, // numberofcolors: 64 + blur agressivo — gera muitos paths
};

// ---------------------------------------------------------------------------
// Regex (compiladas uma vez — performance)
// ---------------------------------------------------------------------------

/**
 * Casa cada tag `<path d="..." />` no SVG.
 *
 * A regex é greedy em `[^>]*` para consumir atributos arbitrários antes
 * do `d="..."` (ex: `desc`, `fill`, `stroke`, `stroke-width`, `opacity`).
 * O `\b` (word boundary) antes de `d=` evita capturar o `d` de `desc=` ou
 * outros atributos que contenham a letra "d".
 *
 * Funciona em Web Worker inline (sem `DOMParser` disponível).
 */
const PATH_TAG_REGEX = /<path\b[^>]*\bd="([^"]+)"[^>]*?>/g;

/**
 * Extrai o valor do atributo `fill` de uma tag `<path>`.
 * Aceita hex (`#fff`, `#ffffff`, `#ffffffff`), `rgb(...)`, `rgba(...)` ou
 * a palavra-chave `none`.
 */
const FILL_ATTR_REGEX = /fill="(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|none)"/;

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

/** Opções aceitas por `vectorizeImage`. */
export interface VectorizeOptions {
  /**
   * Preset do vetorizador (default: `'edge-default'` — pipeline edge+bezier).
   *
   * Aceita a união completa `VetorialPreset` (20 valores). O branch entre
   * os pipelines é decidido automaticamente por `isEdgePreset(preset)` ou
   * explicitamente via `pipelineMode` (override).
   */
  preset?: VetorialPreset;
  /** Descarta paths com `length < pathomit` (default: `8`). */
  pathomit?: number;
  /** Espessura do traço em pixels SVG (default: `2`). */
  strokeWidth?: number;
  /** Cor de fallback quando o path não tem `fill` (default: `'#222222'`). */
  defaultColor?: string;
  /** Sinal de cancelamento — lança `AbortError` se abortado. */
  signal?: AbortSignal;
  /**
   * Ordem de desenho dos paths (L9, RF-09). Quando omitida, mantém
   * a ordem original do pipeline (paleta para `imagetracerjs`, varredura
   * raster para edge+bezier).
   *
   * @see `sortPaths`
   */
  sortOrder?: VetorialPathSortOrder;
  /**
   * Threshold alto normalizado 0..1 para Canny (pipeline edge+bezier).
   * Se não fornecido, usa o valor de `EDGE_PRESET_CONFIG[preset].highThreshold`.
   * Ignorado quando o pipeline legado é selecionado.
   */
  edgeThreshold?: number;
  /**
   * Tolerância Ramer-Douglas-Peucker em pixels (pipeline edge+bezier).
   * Se não fornecido, usa o valor de `EDGE_PRESET_CONFIG[preset].epsilon`.
   * Ignorado quando o pipeline legado é selecionado.
   */
  contourEpsilon?: number;
  /**
   * Override explícito do pipeline. Quando omitido, o branch é decidido
   * automaticamente por `isEdgePreset(preset)`. Útil para testes e para
   * forçar o pipeline legado em um preset `edge-*` (ou vice-versa).
   */
  pipelineMode?: 'imagetracer' | 'edge-bezier';
}

/** Path parseado antes do enriquecimento com `length` e `strokeWidth`. */
interface ParsedPath {
  d: string;
  fill: string | null;
}

// ---------------------------------------------------------------------------
// Helpers puros (SRP — cada um faz uma coisa só)
// ---------------------------------------------------------------------------

/**
 * Valida que o argumento tem o formato mínimo de `ImageData`.
 *
 * `imagetracerjs` espera `{ data: Uint8ClampedArray, width, height }` — se
 * algum desses campos faltar, lança um erro genérico difícil de debugar.
 * Validar aqui dá uma mensagem clara no log.
 */
function isValidImageData(imageData: ImageData): boolean {
  return (
    imageData !== null &&
    imageData !== undefined &&
    imageData.data instanceof Uint8ClampedArray &&
    imageData.width > 0 &&
    imageData.height > 0
  );
}

/**
 * Lança `DOMException` com nome `'AbortError'` se o signal estiver abortado.
 * Convenção padrão do DOM (consumível por `AbortController` callers).
 */
function ensureNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException('Vectorization aborted', 'AbortError');
  }
}

/**
 * Extrai o valor do atributo `fill` de uma string de tag `<path>`.
 * Retorna `null` se a tag não tiver `fill` (caso comum — `imagetracerjs`
 * só emite `fill` quando a cor da paleta é explícita).
 */
function extractFill(pathTag: string): string | null {
  const match = FILL_ATTR_REGEX.exec(pathTag);
  if (!match) {
    return null;
  }
  const fill = match[1];
  return fill ?? null;
}

/**
 * Extrai todos os `<path d="..." />` de uma string SVG.
 *
 * Itera com `RegExp.exec` em loop com a regex global. Reseta `lastIndex`
 * defensivamente (a regex é global e mutável — outras funções no módulo
 * podem reusá-la).
 */
function parseSvgPaths(svg: string): ParsedPath[] {
  const out: ParsedPath[] = [];
  PATH_TAG_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PATH_TAG_REGEX.exec(svg)) !== null) {
    const d = match[1];
    if (d === undefined || d.length === 0) {
      continue;
    }
    out.push({ d, fill: extractFill(match[0]) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers de ordenação (L9, RF-09) — funções puras, sem efeitos colaterais
// ---------------------------------------------------------------------------

/**
 * Casa cada comando `M` (moveTo) ou `L` (lineTo) do path SVG e captura
 * coordenadas `(x, y)`. Usado pelos helpers de ordenação `top-down` e
 * `center-out` para extrair pontos de referência do `d` do path.
 */
const PATH_POINT_REGEX = /[ML]\s*(\d+\.?\d*)\s+(\d+\.?\d*)/g;

/**
 * Retorna o menor Y entre os pontos do path (0 se vazio).
 * SRP: usado por `sortPaths('top-down')` para ordenar de cima para baixo.
 */
function getMinY(d: string): number {
  PATH_POINT_REGEX.lastIndex = 0;
  const matches = d.match(PATH_POINT_REGEX);
  if (!matches || matches.length === 0) {
    return 0;
  }
  let min = Number.POSITIVE_INFINITY;
  for (const m of matches) {
    const parts = m.split(/\s+/);
    const y = parseFloat(parts[2] ?? '0');
    if (Number.isFinite(y) && y < min) {
      min = y;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

/**
 * Retorna a distância euclidiana do **primeiro** ponto do path até
 * o centro `(cx, cy)`. Retorna `Infinity` se o path não tiver pontos
 * parseáveis (cai no fim da ordenação `center-out`).
 */
function distFromCenter(d: string, cx: number, cy: number): number {
  PATH_POINT_REGEX.lastIndex = 0;
  const matches = d.match(PATH_POINT_REGEX);
  if (!matches || matches.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const first = matches[0].split(/\s+/);
  const x = parseFloat(first[1] ?? '0');
  const y = parseFloat(first[2] ?? '0');
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.hypot(x - cx, y - cy);
}

/**
 * Ordena os paths para animação sequencial (L9, RF-09).
 *
 * Função pura O(n log n) (3 ordens) ou O(n) (random). Não muta o array
 * original — retorna um novo array com a ordem desejada.
 *
 * - `top-down`: ordena por Y mínimo do path (menor Y primeiro)
 * - `center-out`: ordena por distância do centro geométrico (mais perto primeiro)
 * - `big-first`: ordena por `length` decrescente (path maior primeiro)
 * - `random`: shuffle com seed determinístico — sem `Math.random()` para
 *   preservar o determinismo do Remotion (mesma imagem → mesma ordem em
 *   qualquer renderização).
 *
 * @param paths Array de paths a ordenar
 * @param order Ordem de classificação
 * @param canvasWidth Largura do canvas (para `center-out`)
 * @param canvasHeight Altura do canvas (para `center-out`)
 * @returns Novo array (não muta o original)
 */
export function sortPaths(
  paths: VetorialPath[],
  order: VetorialPathSortOrder,
  canvasWidth: number,
  canvasHeight: number,
): VetorialPath[] {
  const arr = [...paths];
  switch (order) {
    case 'top-down':
      return arr.sort((a, b) => getMinY(a.d) - getMinY(b.d));
    case 'center-out': {
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;
      return arr.sort(
        (a, b) => distFromCenter(a.d, cx, cy) - distFromCenter(b.d, cx, cy),
      );
    }
    case 'big-first':
      return arr.sort((a, b) => b.length - a.length);
    case 'random': {
      // Fisher-Yates com seed determinístico. Cada elemento recebe um
      // índice pseudo-aleatório derivado de `i` — mesmo input → mesma
      // permutação em qualquer plataforma (removível, sem `Math.random`).
      const seed = (i: number): number => (i * 1000003 + 1) % 2147483647;
      for (let i = arr.length - 1; i > 0; i--) {
        const j = seed(i) % (i + 1);
        const current = arr[i];
        const swap = arr[j];
        if (current !== undefined && swap !== undefined) {
          arr[i] = swap;
          arr[j] = current;
        }
      }
      return arr;
    }
  }
}

// ---------------------------------------------------------------------------
// Filtro de cor de fundo (fix bug "paths invisíveis")
// ---------------------------------------------------------------------------

/**
 * Distância RGB euclidiana máxima (em 0..441.7) para considerar um path
 * "muito próximo" da cor de fundo e descartá-lo.
 *
 * Justificativa do valor `30`:
 * - Branco (255,255,255) e branco-off (250,250,250) → distância ≈ 8.7 (removido)
 * - Branco (255,255,255) e cinza claro (230,230,230) → distância ≈ 43.3 (mantido)
 * - Branco (255,255,255) e preto (0,0,0) → distância ≈ 441.7 (mantido)
 *
 * Valor escolhido para ser agressivo contra paths "fantasma" da paleta do
 * `imagetracerjs` (geralmente `rgb(255,255,255)` ou `rgb(254,254,254)` em
 * imagens com grandes áreas claras) sem afetar paths com contraste válido.
 */
const DEFAULT_BACKGROUND_CONTRAST_THRESHOLD = 30;

/** Limite para emitir `log.warn` se o filtro descartar mais que X% dos paths. */
const BACKGROUND_FILTER_WARN_RATIO = 0.5;

/**
 * Converte uma cor CSS para componentes RGB.
 *
 * Suporta os formatos que o `imagetracerjs` emite no atributo `fill`:
 * - Hex curto: `#fff`, `#fff8` (com alpha)
 * - Hex longo: `#ffffff`, `#ffffff80` (com alpha)
 * - `rgb(r, g, b)` / `rgba(r, g, b, a)`
 *
 * Retorna `null` para formatos não suportados — o chamador deve tratar
 * como "manter" (fail-safe: prefere exibir um path com cor estranha a
 * escondê-lo).
 */
function parseCssColor(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim().toLowerCase();

  // Hex (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0]! + hex[0]!, 16);
      const g = parseInt(hex[1]! + hex[1]!, 16);
      const b = parseInt(hex[2]! + hex[2]!, 16);
      if ([r, g, b].every((v) => Number.isFinite(v))) {
        return { r, g, b };
      }
      return null;
    }
    if (hex.length === 6 || hex.length === 8) {
      const rgb = parseInt(hex.slice(0, 6), 16);
      if (Number.isFinite(rgb)) {
        return {
          r: (rgb >> 16) & 0xff,
          g: (rgb >> 8) & 0xff,
          b: rgb & 0xff,
        };
      }
      return null;
    }
    return null;
  }

  // rgb(r, g, b) ou rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]!, 10);
    const g = parseInt(rgbMatch[2]!, 10);
    const b = parseInt(rgbMatch[3]!, 10);
    if ([r, g, b].every((v) => Number.isFinite(v) && v >= 0 && v <= 255)) {
      return { r, g, b };
    }
    return null;
  }

  return null;
}

/**
 * Filtra paths cuja cor é muito próxima da cor de fundo do canvas.
 *
 * ## Por que este filtro é necessário
 *
 * O `imagetracerjs` quantiza a paleta da imagem e pode incluir a cor
 * de fundo (especialmente em imagens com grandes áreas claras como
 * céu, nuvens, ou fotos com fundo claro). Paths com essa cor ficam
 * INVISÍVEIS no canvas quando o `stroke` é aplicado — o pencil ainda
 * se move (porque sua posição vem de `getPointAtLength(path.d, ...)`),
 * mas nenhum traço aparece. Bug reproduzido: imagem landscape 800×600
 * com fundo branco → 1/2 paths retornados com `rgb(255,255,255)`.
 *
 * Esta função remove esses paths invisíveis para evitar a animação
 * "fantasma" (lápis se movendo sem traços).
 *
 * ## Estratégia
 *
 * Calcula a distância RGB euclidiana entre a cor do path e a cor de
 * fundo. Mantém apenas paths com distância `> threshold` (default `30`).
 * Threshold menor = filtro mais agressivo.
 *
 * ## Fail-safe
 *
 * Paths com cor não parseável (formato CSS incomum, etc) são MANTIDOS
 * — preferimos exibir um path com cor estranha a escondê-lo.
 *
 * @param paths - Lista de paths gerados pelo `imagetracerjs`.
 * @param backgroundColor - Cor de fundo do canvas. Aceita `'white'`/`'black'`
 *   (atalhos semânticos) ou qualquer cor CSS válida (hex, rgb).
 * @param threshold - Distância RGB máxima para considerar "muito próximo"
 *   (default: `30`). Quanto menor, mais agressivo o filtro.
 * @returns Nova lista apenas com paths visíveis no fundo especificado.
 *   Retorna o array original (mesma referência) se nada for filtrado.
 *
 * @example
 * ```ts
 * const paths = await vectorizeImage(imageData);
 * const visible = filterPathsByBackgroundContrast(paths, 'white');
 * ```
 */
export function filterPathsByBackgroundContrast(
  paths: VetorialPath[],
  backgroundColor: 'white' | 'black' | string,
  threshold: number = DEFAULT_BACKGROUND_CONTRAST_THRESHOLD,
): VetorialPath[] {
  // Atalhos semânticos
  const bgRgb =
    backgroundColor === 'white'
      ? { r: 255, g: 255, b: 255 }
      : backgroundColor === 'black'
        ? { r: 0, g: 0, b: 0 }
        : parseCssColor(backgroundColor);

  if (bgRgb === null) {
    // Cor de fundo inválida — fail-safe: mantém todos os paths
    log.warn('Cor de fundo inválida no filtro de contraste — mantendo todos os paths', {
      backgroundColor,
    });
    return paths;
  }

  const visible: VetorialPath[] = [];
  let hiddenCount = 0;

  for (const path of paths) {
    const pathRgb = parseCssColor(path.color);
    // Fail-safe: cor não parseável → mantém
    if (pathRgb === null) {
      visible.push(path);
      continue;
    }
    const dr = pathRgb.r - bgRgb.r;
    const dg = pathRgb.g - bgRgb.g;
    const db = pathRgb.b - bgRgb.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance > threshold) {
      visible.push(path);
    } else {
      hiddenCount += 1;
    }
  }

  // Diagnóstico: avisa se o filtro descartou uma fração grande dos paths
  // (sinal de imagem com paleta muito próxima do fundo, ou threshold
  // muito agressivo). Em produção, `log.warn` envia para Firestore.
  if (paths.length > 0 && hiddenCount > 0) {
    const ratio = hiddenCount / paths.length;
    if (ratio > BACKGROUND_FILTER_WARN_RATIO) {
      log.warn(
        'Filtro de contraste descartou mais da metade dos paths — verifique a imagem de origem',
        {
          totalPaths: paths.length,
          hiddenCount,
          keptCount: visible.length,
          ratio: Math.round(ratio * 100),
          backgroundColor,
          threshold,
        },
      );
    } else {
      log.debug('Filtro de contraste removeu paths invisíveis', {
        totalPaths: paths.length,
        hiddenCount,
        keptCount: visible.length,
        backgroundColor,
      });
    }
  }

  return visible;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Trunca a lista de paths para no máximo `MAX_PATHS_PER_SCENE` paths e emite
 * um warning via `createLogger('vectorizer')` quando o limite é excedido.
 *
 * Mitiga a Premissa #12 do tracker: SVG com muitos paths trava o Remotion
 * durante a exportação via WebCodecs (GPU timeout). O `totalLength` no
 * consumidor (`imageProcessing.ts`) é recalculado a partir de `paths` via
 * `reduce`, então o truncamento é seguro — não introduz inconsistência com
 * a duração.
 *
 * @param paths - Paths enriquecidos com `length`, `color` e `strokeWidth`.
 * @param preset - Preset usado (apenas para diagnóstico no log).
 * @returns Mesma referência se `paths.length <= MAX_PATHS_PER_SCENE`,
 *          ou `paths.slice(0, MAX_PATHS_PER_SCENE)` caso contrário.
 */
function truncatePaths(
  paths: VetorialPath[],
  preset: VetorialPreset,
): VetorialPath[] {
  if (paths.length <= MAX_PATHS_PER_SCENE) {
    return paths;
  }
  log.warn('Vetorização gerou muitos paths — truncando para evitar travamento na exportação', {
    originalCount: paths.length,
    maxAllowed: MAX_PATHS_PER_SCENE,
    preset,
    suggestion: 'Imagens muito complexas perdem detalhes finos. Use pathomit maior ou imagens mais simples.',
  });
  return paths.slice(0, MAX_PATHS_PER_SCENE);
}

/**
 * Enriquece paths parseados com `length` pré-calculado e aplica o filtro
 * `pathomit` (descarta paths pequenos para reduzir custo de render).
 *
 * Responsabilidade única (SRP): dado uma lista de `ParsedPath`, retorna
 * apenas os paths com `length >= pathomit`, com `length` calculado via
 * `@remotion/paths.getLength()` (custo amortizado — não recalculado no render).
 *
 * @param parsed - Paths brutos extraídos do SVG (sem `length`).
 * @param pathomit - Limite mínimo de `length` para aceitar um path.
 * @param strokeWidth - Espessura do traço aplicada a todos os paths.
 * @param defaultColor - Cor de fallback quando o `fill` é ausente ou `'none'`.
 * @param signal - Sinal opcional para cancelamento cooperativo.
 * @returns Lista de `VetorialPath` enriquecidos e filtrados.
 * @throws `DOMException` (`AbortError`) se `signal` for abortado.
 */
function enrichPaths(
  parsed: ParsedPath[],
  pathomit: number,
  strokeWidth: number,
  defaultColor: string,
  signal: AbortSignal | undefined,
): VetorialPath[] {
  const result: VetorialPath[] = [];
  for (let i = 0; i < parsed.length; i++) {
    if (i % ABORT_CHECK_INTERVAL === 0) {
      ensureNotAborted(signal);
    }
    const item = parsed[i];
    if (item === undefined) continue;
    const length = getLength(item.d);
    if (length < pathomit) continue;
    result.push({
      d: item.d,
      length,
      color: item.fill !== null && item.fill !== 'none' ? item.fill : defaultColor,
      strokeWidth,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helpers do pipeline edge+bezier (v0.132.0)
// ---------------------------------------------------------------------------

/** Constante usada como fallback no fallback automático de Canny threshold. */
const EDGE_FALLBACK_HIGH_THRESHOLD = 0.1;

/** Cor de fallback quando o `sampleColors` não consegue ler um pixel válido. */
const EDGE_FALLBACK_COLOR = '#222222';

/**
 * Amostra a cor RGBA do pixel correspondente ao **primeiro ponto** de cada
 * `Contour` original, convertendo para hex `#rrggbb`. O `i`-ésimo path
 * retornado usa a cor do `i`-ésimo contour.
 *
 * Usado pelo pipeline edge+bezier para preservar a cor da imagem de origem
 * (que o `imagetracerjs` fazia por meio da paleta quantizada — aqui fazemos
 * por sampleamento direto no pixel).
 *
 * Fail-safe: se o contour ou o primeiro ponto for inválido, retorna
 * `EDGE_FALLBACK_COLOR` (cinza escuro — visível em fundo claro).
 */
function sampleColors(
  imageData: ImageData,
  contours: Contour[],
  bezierPaths: BezierPath[],
): string[] {
  const toHex = (n: number): string => n.toString(16).padStart(2, '0');
  return bezierPaths.map((_, i) => {
    const contour = contours[i];
    if (contour === undefined || contour.points.length === 0) {
      return EDGE_FALLBACK_COLOR;
    }
    const first = contour.points[0];
    if (first === undefined) {
      return EDGE_FALLBACK_COLOR;
    }
    const dataWidth = imageData.width;
    const pixelIdx = (first.y * dataWidth + first.x) * 4;
    const r = imageData.data[pixelIdx] ?? 0;
    const g = imageData.data[pixelIdx + 1] ?? 0;
    const b = imageData.data[pixelIdx + 2] ?? 0;
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  });
}

// ---------------------------------------------------------------------------
// Pipelines (v0.132.0) — branch por preset
// ---------------------------------------------------------------------------

/**
 * Pipeline legado (`imagetracerjs`) — preservado 100% da lógica original
 * da v0.131.0. Recebe um `preset` já narrowado para `ImagetRacerPreset`
 * (a chamada externa usa `isEdgePreset` para discriminar).
 *
 * Migração desta função para cá é puramente mecânica — o comportamento
 * de saída para presets legados é idêntico ao de antes da v0.132.0.
 */
async function vectorizeImageLegacy(
  imageData: ImageData,
  preset: ImagetRacerPreset,
  options: VectorizeOptions,
  signal: AbortSignal | undefined,
): Promise<VetorialPath[]> {
  // 1. Resolve defaults (DIP — opções como abstração, não valores concretos)
  const pathomit = options.pathomit ?? DEFAULT_PATHOMIT;
  const strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const defaultColor = options.defaultColor ?? DEFAULT_COLOR;
  const sortOrder = options.sortOrder;

  // 2. Verifica abort inicial (chamada rápida antes do trabalho pesado)
  ensureNotAborted(signal);

  // 3. Calcula o `pathomit` efetivo enviado ao `imagetracerjs`:
  //    é o MAIOR entre `options.pathomit` (override do usuário, usado no
  //    filtro final) e `PATHOMIT_BY_PRESET[preset]` (heurística por preset
  //    que limita paths em presets "ricos" como `'detailed'` e `'artistic4'`).
  const effectivePathomit = Math.max(pathomit, PATHOMIT_BY_PRESET[preset]);

  // 4. Converte ImageData em SVG string (síncrono, mas custoso para
  //    imagens grandes — ponto de checagem de abort após)
  const svg = ImageTracer.imagedataToSVG(imageData, {
    preset,
    pathomit: effectivePathomit,
  });

  // 5. Verifica abort após a chamada síncrona pesada
  ensureNotAborted(signal);

  // 6. Parse do SVG via regex (sem DOMParser — funciona no Web Worker)
  const parsed = parseSvgPaths(svg);
  if (parsed.length === 0) {
    log.warn('Vetorização produziu SVG sem paths', {
      preset,
      width: imageData.width,
      height: imageData.height,
    });
    return [];
  }

  // 7. Enriquece cada path com `length` pré-calculado e aplica filtro
  //    `pathomit` (paths pequenos são descartados para reduzir custo de render)
  const enriched = enrichPaths(parsed, pathomit, strokeWidth, defaultColor, signal);

  // 8. Trunca a lista final para `MAX_PATHS_PER_SCENE` (Premissa #12).
  const truncated = truncatePaths(enriched, preset);

  // 9. Aplica ordenação configurável (L9, RF-09) — se fornecida.
  if (sortOrder !== undefined) {
    return sortPaths(truncated, sortOrder, imageData.width, imageData.height);
  }
  return truncated;
}

/**
 * Pipeline edge+bezier (v0.132.0) — para os 4 presets `edge-*`.
 *
 * Estágios:
 * 1. `detectEdges` (Canny simplificado) — gera mapa binário de bordas
 * 2. Fallback automático: se 0 contornos, re-tenta com threshold mais
 *    permissivo (0.1) — imagens de baixo contraste podem falhar com o
 *    threshold padrão do preset
 * 3. `traceContours` (Moore-Neighbor) — extrai curvas de borda
 * 4. `fitBezierPaths` (RDP + Schneider 1990) — ajusta Béziers cúbicas
 * 5. `sampleColors` — samplea cor do primeiro pixel de cada contour
 * 6. `filterPathsByBackgroundContrast` — remove paths invisíveis (mesma
 *    heurística do pipeline legado)
 * 7. `truncatePaths` + `sortPaths` — limite e ordenação
 */
async function vectorizeImageEdgeBezier(
  imageData: ImageData,
  preset: EdgePresetName,
  options: VectorizeOptions,
  signal: AbortSignal | undefined,
): Promise<VetorialPath[]> {
  const config = EDGE_PRESET_CONFIG[preset];
  const highThreshold = options.edgeThreshold ?? config.highThreshold;
  const lowThreshold = highThreshold / 3; // heurística: low = high/3 (Canny clássico)
  const epsilon = options.contourEpsilon ?? config.epsilon;
  const strokeWidth = options.strokeWidth ?? config.strokeWidth;
  const defaultColor = options.defaultColor ?? DEFAULT_COLOR;
  const sortOrder = options.sortOrder;
  const { width, height } = imageData;

  // 1. Edge detection (Canny)
  ensureNotAborted(signal);
  let edgeMap = detectEdges(imageData, {
    blurSigma: config.blurSigma,
    highThreshold,
    lowThreshold,
  });
  ensureNotAborted(signal);

  // 2. Fallback automático: 0 contornos com threshold permissivo também
  //    → imagem sem features, retorna [] (sem crash)
  let contours = traceContours(edgeMap, width, height, { minContourLength: 10 });
  if (contours.length === 0 && highThreshold !== EDGE_FALLBACK_HIGH_THRESHOLD) {
    log.debug('Edge detection sem contornos — re-tentando com threshold permissivo', {
      preset,
      originalThreshold: highThreshold,
      fallbackThreshold: EDGE_FALLBACK_HIGH_THRESHOLD,
    });
    edgeMap = detectEdges(imageData, {
      blurSigma: config.blurSigma,
      highThreshold: EDGE_FALLBACK_HIGH_THRESHOLD,
      lowThreshold: EDGE_FALLBACK_HIGH_THRESHOLD / 3,
    });
    contours = traceContours(edgeMap, width, height, { minContourLength: 10 });
  }
  ensureNotAborted(signal);

  // 3. Sem contornos mesmo após fallback — imagem sem features visíveis
  if (contours.length === 0) {
    log.warn('Pipeline edge+bezier não encontrou contornos', {
      preset,
      width,
      height,
    });
    return [];
  }

  // 4. Ajuste de Béziers (RDP + Schneider 1990)
  const bezierPaths = fitBezierPaths(contours, width, height, { epsilon });
  ensureNotAborted(signal);

  if (bezierPaths.length === 0) {
    log.warn('Pipeline edge+bezier não gerou Béziers', {
      preset,
      contourCount: contours.length,
    });
    return [];
  }

  // 5. Samplea cores de cada path
  const colors = sampleColors(imageData, contours, bezierPaths);

  // 6. Monta VetorialPath[] (cor sampleada ou fallback se vazio)
  const enriched: VetorialPath[] = bezierPaths.map((bp, i) => ({
    d: bp.d,
    length: bp.length,
    color: colors[i] ?? defaultColor,
    strokeWidth,
  }));

  // 7. Filtra paths invisíveis por contraste com fundo (heurística legada)
  const visible = filterPathsByBackgroundContrast(enriched, 'white');

  // 8. Trunca para MAX_PATHS_PER_SCENE
  const truncated = truncatePaths(visible, preset);

  // 9. Ordenação configurável
  if (sortOrder !== undefined) {
    return sortPaths(truncated, sortOrder, width, height);
  }
  return truncated;
}

// ---------------------------------------------------------------------------
// API pública — orquestrador com branch por preset
// ---------------------------------------------------------------------------

/**
 * Vetoriza um `ImageData` em uma lista de paths SVG prontos para animação.
 *
 * Delega para `vectorizeImageLegacy` (presets `imagetracerjs`) ou
 * `vectorizeImageEdgeBezier` (presets `edge-*`) conforme `options.pipelineMode`
 * (override explícito) ou `isEdgePreset(preset)` (default = inferência).
 *
 * @param imageData - Pixels da imagem (largura/altura/data).
 * @param options - Configurações opcionais (preset, filtros, sinal, pipeline).
 * @returns Lista de `VetorialPath` com `length` pré-calculado.
 * @throws `Error` se `imageData` for inválido.
 * @throws `DOMException` (`AbortError`) se `options.signal` for abortado.
 *
 * @example
 * ```ts
 * const ctx = canvas.getContext('2d');
 * const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
 * const paths = await vectorizeImage(imageData, { preset: 'edge-default' });
 * ```
 */
export async function vectorizeImage(
  imageData: ImageData,
  options: VectorizeOptions = {},
): Promise<VetorialPath[]> {
  // 1. Validação de input — mensagem clara antes de chamar a lib externa
  if (!isValidImageData(imageData)) {
    throw new Error('ImageData inválido para vetorização');
  }

  // 2. Resolve defaults comuns
  const preset = options.preset ?? DEFAULT_PRESET;
  const signal = options.signal;
  ensureNotAborted(signal);

  // 3. Decide o pipeline:
  //    - `pipelineMode: 'imagetracer'` → legado (forçado)
  //    - `pipelineMode: 'edge-bezier'` → novo (forçado, exige preset `edge-*`)
  //    - `pipelineMode: undefined` → automático via `isEdgePreset(preset)`

  // Override explícito edge-bezier — exige preset edge; lança se legado
  if (options.pipelineMode === 'edge-bezier') {
    if (!isEdgePreset(preset)) {
      throw new Error(
        `pipelineMode: 'edge-bezier' exige preset edge-* (recebido "${preset}"). ` +
          'Use pipelineMode: "imagetracer" para presets legados.',
      );
    }
    // Narrowing real via type guard `isEdgePreset` (predicate function)
    return vectorizeImageEdgeBezier(imageData, preset, options, signal);
  }

  // Override explícito imagetracer — força legado mesmo com preset `edge-*`.
  // Quando o preset é `edge-*` e o pipeline é forçado para `imagetracer`,
  // precisamos de um `ImagetRacerPreset` válido — usamos `'default'` como
  // fallback (preset neutro do `imagetracerjs`, é o mesmo que
  // `imagetracerjs` usa quando recebe um valor desconhecido).
  if (options.pipelineMode === 'imagetracer') {
    const legacyPreset: ImagetRacerPreset = isEdgePreset(preset)
      ? 'default'
      : preset;
    return vectorizeImageLegacy(imageData, legacyPreset, options, signal);
  }

  // Caminho automático (pipelineMode === undefined) — narrowing real
  if (isEdgePreset(preset)) {
    return vectorizeImageEdgeBezier(imageData, preset, options, signal);
  }
  return vectorizeImageLegacy(imageData, preset, options, signal);
}
