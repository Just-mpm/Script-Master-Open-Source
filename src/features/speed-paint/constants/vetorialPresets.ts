/**
 * Agrupamento dos 20 valores de `VetorialPreset` em 7 grupos para a UI do
 * seletor de estilo do modo Desenho do Speed Paint.
 *
 * A ordem dos grupos aqui define a ordem de exibição no `<Select>` (cada
 * `<ListSubheader>` aparece antes dos `<MenuItem>` do seu grupo). A ordem
 * dos presets dentro de cada grupo segue a convenção do `imagetracerjs`
 * (do mais "neutro" para o mais "expressivo"), exceto para os grupos
 * `edge-detection` (ordem do mais simples ao mais expressivo) e
 * `default` (v0.132.0).
 *
 * Esta é a ÚNICA fonte de verdade para o agrupamento — o componente
 * `SpeedPaintPage.tsx` consome `VETORIAL_PRESETS_GROUPED` para renderizar
 * o seletor. As chaves dos grupos correspondem 1:1 com a chave
 * `speedPaint.presetGroups.{groupId}` nos 3 locales (pt-BR, en, es).
 *
 * ## Presets `edge-*` (v0.132.0)
 *
 * Os 4 presets `edge-default`, `edge-detailed`, `edge-bold` e `edge-sketch`
 * alimentam o novo pipeline edge+bezier (Canny → RDP → Bézier smoothing)
 * que substituirá o `imagetracerjs` para o grupo `edge-detection`.
 * Os parâmetros numéricos de cada preset ficam em `EDGE_PRESET_CONFIG`
 * abaixo — esta constante (`VETORIAL_PRESETS_GROUPED`) cuida apenas do
 * agrupamento/UI.
 *
 * @see `src/features/speed-paint/types/vetorial.ts` — definição do tipo `VetorialPreset`
 * @see `src/pages/SpeedPaintPage.tsx` — consumo do seletor
 * @see `EDGE_PRESET_CONFIG` — parâmetros numéricos dos presets `edge-*`
 */

import type { VetorialPreset } from '../types/vetorial';

/** Identificador de grupo do seletor de preset (chave i18n em `presetGroups`). */
export type VetorialPresetGroupId = 'edge-detection' | 'legacy';

/** Grupo de presets do `imagetracerjs` com mesmo estilo visual. */
export interface VetorialPresetGroup {
  /** ID do grupo — vira sufixo da chave i18n `speedPaint.presetGroups.{id}`. */
  id: VetorialPresetGroupId;
  /** Lista de presets do grupo (ordem de exibição no dropdown). */
  presets: VetorialPreset[];
}

/**
 * Lista imutável dos 2 grupos com os 4 presets totalizados (v0.133.1).
 * Consumida pelo `<Select>` em `SpeedPaintPage.tsx` para renderizar
 * `<ListSubheader>` + `<MenuItem>` por grupo.
 *
 * v0.133.1: simplificação de 7 grupos / 20 presets para 2 grupos / 4 presets.
 * Mantém os 3 presets do pipeline edge+bezier (`edge-default`, `edge-detailed`,
 * `edge-bold`) + 1 preset legado (`default`) como fallback. O pipeline
 * edge+bezier roda no Web Worker (`vetorialWorker.ts`).
 */
export const VETORIAL_PRESETS_GROUPED: ReadonlyArray<VetorialPresetGroup> = [
  { id: 'edge-detection', presets: ['edge-default', 'edge-detailed', 'edge-bold'] },
  { id: 'legacy', presets: ['default'] },
];

/**
 * Subconjunto de `VetorialPreset` correspondente aos 4 presets da família
 * `edge-*` que alimentam o pipeline edge+bezier. Usado como chave do map
 * `EDGE_PRESET_CONFIG` para garantir em compile-time que apenas presets
 * edge tenham parâmetros de edge detection associados.
 */
export type EdgePresetName = Extract<
  VetorialPreset,
  'edge-default' | 'edge-detailed' | 'edge-bold'
>;

/**
 * Subconjunto de `VetorialPreset` que alimenta o pipeline legado baseado em
 * `imagetracerjs` (v0.131.0 e anteriores). Corresponde a todos os presets
 * MENOS os 4 `edge-*` (que dependem do novo pipeline edge+bezier das
 * Fases 2 e 3 — ainda não implementado).
 *
 * O `vectorizer.ts` e o `imageProcessing.ts` aceitam este sub-tipo para
 * impedir em compile-time que presets `edge-*` sejam passados para o
 * `imagetracerjs` (que não os reconhece).
 */
export type ImagetRacerPreset = Exclude<VetorialPreset, EdgePresetName>;

/**
 * Type guard: verifica se um `VetorialPreset` pertence à família `edge-*`
 * (pipeline edge+bezier — Fases 2 e 3 da v0.132.0).
 *
 * Útil em pontos de borda onde o `VetorialPreset` completo precisa ser
 * narrowado para `EdgePresetName` ou para `ImagetRacerPreset` em runtime.
 *
 * @example
 * ```ts
 * if (isEdgePreset(preset)) {
 *   // preset: EdgePresetName — pipeline novo
 * } else {
 *   // preset: ImagetRacerPreset — pipeline imagetracerjs legado
 * }
 * ```
 */
export function isEdgePreset(preset: VetorialPreset): preset is EdgePresetName {
  return preset.startsWith('edge-');
}

/**
 * Parâmetros numéricos de um preset `edge-*` consumidos pelo novo pipeline
 * edge+bezier (Canny → RDP → Bézier smoothing — Fases 2 e 3).
 *
 * @see Plano D8 §8.3 linhas 666-671 — valores sugeridos por preset
 */
export interface EdgePresetConfig {
  /** Espessura do traço SVG no render. */
  strokeWidth: number;
  /** Threshold alto normalizado (0..1) do detector de bordas Canny. */
  highThreshold: number;
  /** Tolerância (em pixels) do algoritmo RDP de simplificação de polyline. */
  epsilon: number;
  /** Desvio padrão (em pixels) do Gaussian Blur aplicado antes do Canny. */
  blurSigma: number;
  /**
   * Compacidade mínima (razão isoperimétrica `4π·A/P²`) para aceitar um
   * contour gerado por Canny. Valores em [0, 1] — círculo = 1.
   *
   * Calibração 2026-06-17 (v0.133.0): contours de Canny com compacidade
   * abaixo deste valor são tipicamente fragmentos lineares finos (linhas
   * espúrias com 1-3px de espessura) que viram paths degenerados após
   * o RDP. O filtro é aplicado em `vectorizeImageEdgeBezier` antes do
   * `fitBezierPaths` para reduzir o volume que chega ao fitting.
   *
   * Valores típicos:
   * - `0.0001` (default v0.133.0) — só remove patológicos com compactness
   *   praticamente 0 (linhas espúrias). Necessário porque o Canny deste
   *   projeto gera contours de 1px onde até formas legítimas (lados de
   *   quadrados, contornos de letras) têm compactness baixa.
   * - `0.02` (perm.) — preserva mais detalhes, gera mais paths
   * - `0.05` (agress.) — descarta contornos alongados, só blobs densos
   */
  filterSpeckle: number;
}

/**
 * Parâmetros numéricos por preset `edge-*` consumidos pelo pipeline
 * edge+bezier nas Fases 2 e 3. Presets legados (`artistic1` etc.) não
 * têm entrada aqui — serão tratados no branch do `imagetracerjs`.
 *
 * Valores conforme D8 §8.3 do plano de implementação da v0.132.0, com
 * `filterSpeckle` adicionado em 2026-06-17 (v0.133.0) para a calibração
 * do pipeline edge+bezier (ver `vectorizeImageEdgeBezier`).
 */
export const EDGE_PRESET_CONFIG: Readonly<Record<EdgePresetName, EdgePresetConfig>> = {
  'edge-default': { strokeWidth: 8, highThreshold: 0.3, epsilon: 2.0, blurSigma: 1.0, filterSpeckle: 0.0001 },
  'edge-detailed': { strokeWidth: 6, highThreshold: 0.2, epsilon: 1.0, blurSigma: 0.8, filterSpeckle: 0.0001 },
  'edge-bold': { strokeWidth: 12, highThreshold: 0.4, epsilon: 3.0, blurSigma: 1.2, filterSpeckle: 0.0001 },
};
