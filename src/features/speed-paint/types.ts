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
  animation?: StrokeAnimation;
}
