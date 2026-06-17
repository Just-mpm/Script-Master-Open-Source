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
 * Easing da animação vetorial (L10, RF-10).
 *
 * Controla como o progresso da animação (`drawnLength`) evolui ao longo
 * do tempo no `interpolate` do `WhiteboardScene`. Default: `'smooth'`
 * (visual fluido, padrão InstaDoodle).
 *
 * - `'linear'`: progresso uniforme frame-a-frame
 * - `'smooth'`: `Easing.inOut(Easing.ease)` — acelera no começo, desacelera no fim
 * - `'bounce'`: `Easing.out(Easing.bounce)` — efeito de quique no final
 */
export type VetorialEasingType = 'linear' | 'smooth' | 'bounce';

/**
 * Ordem de desenho dos paths na animação sequencial (L9, RF-09).
 *
 * Controla em que ordem cada `<path>` é revelado durante a animação
 * whiteboard. Útil para que o usuário adapte o ritmo de revelação ao
 * estilo do desenho (top-down para paisagens, center-out para retratos,
 * etc).
 *
 * - `'top-down'`: ordena por Y mínimo do path (menor Y primeiro)
 * - `'center-out'`: ordena por distância ao centro geométrico (mais perto primeiro)
 * - `'big-first'`: ordena por `length` decrescente (path maior primeiro)
 * - `'random'`: shuffle com seed determinístico (reproduzível)
 */
export type VetorialPathSortOrder = 'top-down' | 'center-out' | 'big-first' | 'random';

/**
 * Preset do modo de renderização vetorial do Speed Paint.
 *
 * Há duas famílias de presets:
 *
 * - **Legados (`imagetracerjs`)** — 16 valores que alimentam o
 *   `imagetracerjs.imagedataToSVG()` e controlam a quantização de cores,
 *   suavização, amostragem e estilo artístico. Mantidos para
 *   retrocompatibilidade (v0.131.0 e anteriores).
 *
 * - **Edge (`edge-*`)** — 4 valores adicionados na v0.132.0 que
 *   alimentarão o novo pipeline edge+bezier (Canny → RDP → Bézier
 *   smoothing). Os parâmetros de cada preset (strokeWidth, highThreshold,
 *   epsilon, blurSigma) ficam em `EDGE_PRESET_CONFIG` na constante
 *   `src/features/speed-paint/constants/vetorialPresets.ts`.
 *
 * @see https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md
 * @see `EDGE_PRESET_CONFIG` em `constants/vetorialPresets.ts`
 */
export type VetorialPreset =
  // Legados (imagetracerjs) — 16 valores
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
  | 'artistic4'
  // Edge (pipeline edge+bezier) — 4 valores adicionados na v0.132.0
  | 'edge-default'
  | 'edge-detailed'
  | 'edge-bold'
  | 'edge-sketch';

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
