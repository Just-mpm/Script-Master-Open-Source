/**
 * Tipos do modo de renderização vetorial do Speed Paint.
 *
 * Diferente do modo máscara (raspadinha — `StrokeAnimation`), o modo vetorial
 * representa a imagem como uma lista de `<path>` SVG animados via
 * `strokeDashoffset`. O resultado parece um desenho sendo feito à mão
 * (whiteboard animation) em vez de uma raspadinha.
 *
 * ## Pipeline
 *
 * 1. `imagetracerjs.imagedataToSVG()` — converte `ImageData` (pixels) em SVG
 * 2. Parser SVG extrai cada `<path d="...">` individual
 * 3. Para cada path, pré-calcula `length` via `@remotion/paths.getLength()`
 * 4. Composição Remotion (`WhiteboardScene`) anima cada path com
 *    `strokeDashoffset` e move a caneta via `getPointAtLength()`
 *
 * @see `src/features/speed-paint/lib/vectorizer.ts` — implementação
 * @see `src/features/video-render/components/WhiteboardScene.tsx` — render
 */

/** Modo de renderização do Speed Paint (feature flag). */
export type SpeedPaintRenderMode = 'mask' | 'vetorial';

/**
 * Preset do `imagetracerjs` que define o estilo da vetorização.
 *
 * @see https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md
 */
export type VetorialPreset =
  | 'default'
  | 'posterized1'
  | 'posterized2'
  | 'posterized3'
  | 'curvy'
  | 'sharp'
  | 'detailed'
  | 'smoothed'
  | 'grayscale'
  | 'fixedpalette'
  | 'randomsampling1'
  | 'randomsampling2'
  | 'artistic1'
  | 'artistic2'
  | 'artistic3'
  | 'artistic4';

/** Path SVG individual extraído de uma imagem vetorizada. */
export interface VetorialPath {
  /** Atributo `d` do `<path>`: ex: `"M 10 10 L 90 90"` */
  d: string;
  /** Comprimento total pré-calculado via `@remotion/paths.getLength()`.
   *  Calculado na vetorização (não no render) para evitar custo por frame. */
  length: number;
  /** Cor do traço no formato CSS (hex, rgb, etc). */
  color: string;
  /** Espessura do traço em pixels SVG. */
  strokeWidth: number;
}

/**
 * Animação vetorial completa — análoga a `StrokeAnimation` (modo máscara)
 * mas com `paths` SVG em vez de `strokes` raster.
 *
 * Usado como entrada da composição `WhiteboardScene` e armazenado em
 * `PaintingJob.animation` (união discriminada por `kind`).
 */
export interface VetorialAnimation {
  /** Identificador único (mesmo padrão de `StrokeAnimation.id`). */
  id: string;
  /** Largura do canvas em pixels (mesmo da imagem original). */
  canvasWidth: number;
  /** Altura do canvas em pixels. */
  canvasHeight: number;
  /** Cor de fundo do canvas (consistente com `StrokeAnimation.canvasColor`). */
  canvasColor: 'white' | 'black';
  /** Paths SVG ordenados para animação sequencial. */
  paths: VetorialPath[];
  /** Soma pré-calculada de `paths[i].length` — evita recomputar no render. */
  totalLength: number;
  /** FPS da animação (60 é o padrão do projeto). */
  fps: number;
  /** Duração total em milissegundos. */
  totalDurationMs: number;
  /** Preset do `imagetracerjs` que gerou este vetor — exibido na UI e logs. */
  sourcePreset: VetorialPreset;
  /** Imagem original redimensionada (mantida para fallback/comparação). */
  resizedImage?: string;
}
