import type { StudioScene } from '../studio/types';

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
  /** Legendas com timestamps (Whisper ou fallback proporcional) */
  captions?: CaptionWord[];
}

/** Configuração de renderização (Fase 3) */
export interface VideoRenderConfig {
  width: number;
  height: number;
  fps: number;
  codec: 'h264' | 'h265' | 'vp8' | 'vp9';
}

/** Palavra individual com timing e formatação para legenda */
export interface CaptionWord {
  text: string;
  startFrame: number;
  endFrame: number;
  bold: boolean;
}

/** Resultado de uma transcrição (Whisper ou fallback proporcional) */
export interface TranscriptionResult {
  words: CaptionWord[];
  source: 'whisper' | 'proportional';
}

/** Modo de exibição de legendas */
export type SubtitleMode = 'scroll-phrases' | 'word-karaoke';
