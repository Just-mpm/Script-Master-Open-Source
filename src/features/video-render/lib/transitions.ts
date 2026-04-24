/**
 * Constantes compartilhadas de transição entre componentes de vídeo.
 * Usado por SceneSequence e SpeedPaintScene — fonte única (DRY).
 */

import { spring } from 'remotion';

// ---------------------------------------------------------------------------
// Spring config
// ---------------------------------------------------------------------------

/**
 * Spring para transições de fade.
 * damping > stiffness = superamortecido → sem oscilação, sem overshoot.
 * A curva natural de spring dá aceleração suave na entrada e desaceleração na saída.
 */
export const SPRING_TRANSICAO = {
  damping: 26,
  stiffness: 100,
  mass: 1,
} as const;

// ---------------------------------------------------------------------------
// Cálculo de fade frames seguro
// ---------------------------------------------------------------------------

/**
 * Calcula o número máximo de frames de fade sem ultrapassar metade da duração.
 * Garante que inputRange do spring seja estritamente crescente (precisa 2*t < dur).
 * Retorna 0 se a cena for muito curta (< 3 frames).
 */
export function computeSafeFadeFrames(
  durationInFrames: number,
  fadeFrames: number,
): number {
  const maxAllowed = durationInFrames >= 3
    ? Math.floor((durationInFrames - 1) / 2)
    : 0;
  return Math.min(Math.max(1, fadeFrames), maxAllowed);
}

// ---------------------------------------------------------------------------
// Helpers de fade com spring (physics-based timing)
// ---------------------------------------------------------------------------

/**
 * Gera progresso de fade-in com spring (0→1) ao longo de fadeFrames.
 * Substitui interpolate linear por curva de spring com aceleração/desaceleração.
 */
export function springFadeIn(
  frame: number,
  fps: number,
  fadeFrames: number,
): number {
  return spring({
    frame,
    fps,
    config: SPRING_TRANSICAO,
    durationInFrames: fadeFrames,
  });
}

/**
 * Gera opacidade de fade-out com spring (1→0) começando em fadeStartFrame.
 * Inverte o spring (0→1 vira 1→0) e impede valores negativos.
 */
export function springFadeOut(
  frame: number,
  fps: number,
  fadeStartFrame: number,
  fadeFrames: number,
): number {
  if (fadeFrames <= 0) return 1;
  const localFrame = frame - fadeStartFrame;
  return Math.max(0, 1 - spring({
    frame: localFrame,
    fps,
    config: SPRING_TRANSICAO,
    durationInFrames: fadeFrames,
  }));
}
