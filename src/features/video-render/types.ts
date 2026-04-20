import type { StudioScene } from '../studio/types';
import type { EditingScene } from './lib/editingPlan';

/** Cena estendida para vídeo Remotion */
export interface VideoScene extends StudioScene {
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Legenda opcional para esta cena */
  subtitle?: string;
}

/** Props da Composition Remotion */
export interface VideoCompositionProps {
  /** Lista de cenas com imagens e timing */
  scenes: VideoScene[];
  /** URL do áudio para sincronização */
  audioUrl: string;
  /** Frames por segundo (default: 30) */
  fps: number;
  /** Plano de edição com transições, legendas e efeitos por cena */
  editingPlan?: EditingScene[];
}

/** Configuração de renderização (Fase 3) */
export interface VideoRenderConfig {
  width: number;
  height: number;
  fps: number;
  codec: 'h264' | 'h265' | 'vp8' | 'vp9';
}
