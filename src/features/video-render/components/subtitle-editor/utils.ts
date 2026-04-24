import { BASE_PADDING_BOTTOM } from './constants';

/** Clamp numérico simples */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calcula o `bottom` em pixels de tela para o preview CSS.
 *
 * No Remotion: offsetPadding = BASE_PADDING_BOTTOM + verticalOffset
 * Isso é padding-bottom no espaço da composição (ex: 1920×1080).
 * No preview, convertemos para pixels de tela usando a escala do container.
 */
export function calculatePreviewBottom(
  verticalOffset: number,
  compositionHeight: number,
  displayHeight: number,
): number {
  if (displayHeight <= 0 || compositionHeight <= 0) return 0;
  const offsetPadding = BASE_PADDING_BOTTOM + verticalOffset;
  const scale = displayHeight / compositionHeight;
  return Math.max(0, offsetPadding * scale);
}
