export interface Stroke {
  id: number;
  layer: number;
  type: 'sketch' | 'reveal' | 'polyline';
  points: number[]; // [x1, y1, x2, y2, ...]
  lineWidth: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export interface StrokeAnimation {
  id: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasColor: 'white' | 'black';
  totalFrames: number;
  fps: number;
  totalDurationMs: number;
  revealThreshold?: number;
  strokes: Stroke[];
  resizedImage?: string;
}

export interface QueuedImage {
  id: string;
  dataUrl: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Revoga blob URLs temporárias quando o item sai da fila. */
  shouldRevokeObjectUrl?: boolean;
}

export interface PaintingJob {
  id: string;
  inputImage: string; // data URL
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  /**
   * Animação gerada pelo `generateStrokesFromImage`. Pode ser:
   * - `StrokeAnimation` (modo `'mask'`, default retrocompatível)
   * - `VetorialAnimation` (modo `'vetorial'`, vetorização com `imagetracerjs`)
   *
   * GAP-03 (Fase 1.5): estendido para aceitar `VetorialAnimation` na Fase 2.1.
   * O consumidor deve discriminar por propriedades presentes (ex: `'paths' in
   * animation` vs `'strokes' in animation`).
   */
  animation?: StrokeAnimation | VetorialAnimation;
}

// Tipos do modo de renderização vetorial (criados na Fase 1.1).
// Importado aqui para uso local no `PaintingJob` e re-exportado para
// consumidores externos — evita import circular entre `types.ts` e
// `types/vetorial.ts` (consumidores devem importar de `../types`).
import type { VetorialAnimation } from './types/vetorial';

export type {
  SpeedPaintRenderMode,
  VetorialPreset,
  VetorialPath,
  VetorialAnimation,
} from './types/vetorial';
