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
  /** Estilo personalizável das legendas */
  subtitleStyle?: SubtitleStyle;
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

/** Fonte dos dados de temporização das legendas */
export type CaptionSource =
  | 'whisper-aligned'      // Timing Whisper refinado + texto do roteiro
  | 'segment-timing'       // Timing real do chunk TTS + texto do roteiro
  | 'proportional'         // Timing proporcional (fallback quando não há segmentos)
  | 'manual';              // Editado manualmente pelo usuário

/** Resultado de uma transcrição (Whisper, segmentos TTS ou fallback proporcional) */
export interface TranscriptionResult {
  words: CaptionWord[];
  source: CaptionSource;
  /** Hash SHA-256 do roteiro usado para gerar as legendas (staleness detection) */
  scriptHash?: string;
}

/** Estilo personalizável das legendas no vídeo */
export interface SubtitleStyle {
  /** Tamanho da fonte em px (default: 28) */
  fontSize: number;
  /** Padding horizontal da caixa da legenda em px (default: 24) */
  paddingX: number;
  /** Padding vertical da caixa da legenda em px (default: 12) */
  paddingY: number;
  /** Border radius da caixa em px (default: 12) */
  borderRadius: number;
  /** Opacidade do fundo da caixa 0-1 (default: 0.5) */
  backgroundOpacity: number;
  /** Gap entre frases visíveis em px (default: 8) */
  gap: number;
  /** Offset vertical do container de legendas em px — positivo desce, negativo sobe (default: 0) */
  verticalOffset: number;
}

/** Estilo padrão das legendas */
export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSize: 28,
  paddingX: 24,
  paddingY: 12,
  borderRadius: 12,
  backgroundOpacity: 0.5,
  gap: 8,
  verticalOffset: 0,
};
