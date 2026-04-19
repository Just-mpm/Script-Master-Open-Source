import type Konva from 'konva';

/**
 * Ref compartilhado para acessar o Stage Konva a partir de AnimationControls.
 * Evita poluir `window` com variáveis globais não tipadas.
 */
let stageRef: Konva.Stage | null = null;

export function setStageRef(ref: Konva.Stage | null): void {
  stageRef = ref;
}

export function getStageRef(): Konva.Stage | null {
  return stageRef;
}
