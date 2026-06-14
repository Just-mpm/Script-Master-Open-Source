/**
 * Wrapper assíncrono em torno de `imagetracerjs.imagedataToSVG()`.
 *
 * Converte `ImageData` (pixels raster) em uma lista de `VetorialPath[]`
 * pré-calculados para animação com `strokeDashoffset` no Remotion.
 *
 * ## Pipeline
 *
 * 1. `ImageTracer.imagedataToSVG()` — converte pixels em SVG string (síncrono)
 * 2. Parser regex extrai cada `<path d="..." fill="..." />` do SVG
 *    (sem `DOMParser` — funciona em Web Worker inline via Blob URL)
 * 3. Para cada path, `getLength(d)` do `@remotion/paths` calcula o comprimento
 *    total uma única vez (custo amortizado — não recalculado no render)
 * 4. Paths com `length < pathomit` são descartados (reduz custo de render)
 *
 * ## Por que `async`
 *
 * A vetorização é síncrona internamente, mas a API é assíncrona para:
 * - Contrato uniforme com `generateStrokesFromImage()` (consumidor em
 *   `imageProcessing.ts` faz `await`)
 * - Suporte a `AbortSignal` no futuro (yield entre etapas, cancelar mid-flight)
 *
 * @see `src/features/speed-paint/types/vetorial.ts` — tipos `VetorialPath`
 * @see `src/features/video-render/components/WhiteboardScene.tsx` — consumidor
 */

import { getLength } from '@remotion/paths';
import ImageTracer from 'imagetracerjs';

import { createLogger } from '../../../lib/logger';
import type { VetorialPath, VetorialPreset } from '../types/vetorial';

const log = createLogger('vectorizer');

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/**
 * Default do preset — `'artistic1'` é o sweet spot para flat/cartoon
 * (decisão Matheus 2026-06-14, documentada no tracker da fase 1.2).
 */
const DEFAULT_PRESET: VetorialPreset = 'artistic1';

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
 * @see Premissa #12 do tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`
 * @see https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md#pathomit
 */
const MAX_PATHS_PER_SCENE = 500;

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
const PATHOMIT_BY_PRESET: Record<VetorialPreset, number> = {
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
  /** Preset do `imagetracerjs` (default: `'artistic1'`). */
  preset?: VetorialPreset;
  /** Descarta paths com `length < pathomit` (default: `8`). */
  pathomit?: number;
  /** Espessura do traço em pixels SVG (default: `2`). */
  strokeWidth?: number;
  /** Cor de fallback quando o path não tem `fill` (default: `'#222222'`). */
  defaultColor?: string;
  /** Sinal de cancelamento — lança `AbortError` se abortado. */
  signal?: AbortSignal;
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
// API pública
// ---------------------------------------------------------------------------

/**
 * Trunca a lista de paths para no máximo `MAX_PATHS_PER_SCENE` paths e emite
 * um warning via `createLogger('vectorizer')` quando o limite é excedido.
 *
 * Mitiga a Premissa #12 do tracker: SVG com 500+ paths trava o Remotion
 * durante a exportação. O `totalLength` no consumidor (`imageProcessing.ts`)
 * é recalculado a partir de `paths` via `reduce`, então o truncamento é
 * seguro — não introduz inconsistência com a duração.
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
  log.warn('Vetorização gerou muitos paths — truncando para evitar travamento', {
    originalCount: paths.length,
    maxAllowed: MAX_PATHS_PER_SCENE,
    preset,
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

/**
 * Vetoriza um `ImageData` em uma lista de paths SVG prontos para animação.
 *
 * @param imageData - Pixels da imagem (largura/altura/data).
 * @param options - Configurações opcionais (preset, filtros, sinal).
 * @returns Lista de `VetorialPath` com `length` pré-calculado.
 * @throws `Error` se `imageData` for inválido.
 * @throws `DOMException` (`AbortError`) se `options.signal` for abortado.
 *
 * @example
 * ```ts
 * const ctx = canvas.getContext('2d');
 * const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
 * const paths = await vectorizeImage(imageData, { preset: 'artistic1' });
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

  // 2. Resolve defaults (DIP — opções como abstração, não valores concretos)
  const preset = options.preset ?? DEFAULT_PRESET;
  const pathomit = options.pathomit ?? DEFAULT_PATHOMIT;
  const strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const defaultColor = options.defaultColor ?? DEFAULT_COLOR;
  const signal = options.signal;

  // 3. Verifica abort inicial (chamada rápida antes do trabalho pesado)
  ensureNotAborted(signal);

  // 4. Calcula o `pathomit` efetivo enviado ao `imagetracerjs`:
  //    é o MAIOR entre `options.pathomit` (override do usuário, usado no
  //    filtro final) e `PATHOMIT_BY_PRESET[preset]` (heurística por preset
  //    que limita paths em presets "ricos" como `'detailed'` e `'artistic4'`).
  //    Preservar a API pública: `options.pathomit` continua sendo o que
  //    dita o filtro final em `enrichPaths`.
  const effectivePathomit = Math.max(pathomit, PATHOMIT_BY_PRESET[preset]);

  // 5. Converte ImageData em SVG string (síncrono, mas custoso para
  //    imagens grandes — ponto de checagem de abort após)
  const svg = ImageTracer.imagedataToSVG(imageData, {
    preset,
    pathomit: effectivePathomit,
  });

  // 6. Verifica abort após a chamada síncrona pesada
  ensureNotAborted(signal);

  // 7. Parse do SVG via regex (sem DOMParser — funciona no Web Worker)
  const parsed = parseSvgPaths(svg);
  if (parsed.length === 0) {
    log.warn('Vetorização produziu SVG sem paths', {
      preset,
      width: imageData.width,
      height: imageData.height,
    });
    return [];
  }

  // 8. Enriquece cada path com `length` pré-calculado e aplica filtro
  //    `pathomit` (paths pequenos são descartados para reduzir custo de render)
  const enriched = enrichPaths(parsed, pathomit, strokeWidth, defaultColor, signal);

  // 9. Trunca a lista final para `MAX_PATHS_PER_SCENE` (Premissa #12).
  //    `totalLength` é recalculado no consumidor a partir de `paths`,
  //    então o truncamento é seguro.
  //    Premissa #16 (batch em paralelo): o batch atual não suporta
  //    `renderMode='vetorial'` (decisão da Fase 3.2 — `runBatchRender`
  //    só suporta mask). Se a Fase 5.3 ou futuro habilitar batch
  //    vetorial, considerar pré-vetorizar N imagens em paralelo via
  //    `Promise.all([...])` na main thread antes de enviar ao Worker.
  return truncatePaths(enriched, preset);
}
