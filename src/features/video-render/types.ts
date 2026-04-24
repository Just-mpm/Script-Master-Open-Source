import type { StudioScene } from '../studio/types';
import type { StrokeAnimation } from '../speed-paint/types';

/** Qualidade de exportação do vídeo */
export type VideoExportQuality = '720p' | '1080p' | '1440p' | '4k';

/** Velocidade da animação speed paint */
export type SpeedPaintSpeed = 'slow' | 'normal' | 'fast';

/** Mapeamento de SpeedPaintSpeed para multiplicador numérico */
export const SPEED_PAINT_MULTIPLIERS: Readonly<Record<SpeedPaintSpeed, number>> = {
  slow: 0.5,
  normal: 1.0,
  fast: 1.5,
} as const;

/** Cena estendida para vídeo Remotion */
export interface VideoScene extends StudioScene {
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Legenda opcional para esta cena */
  subtitle?: string;
  /** Dados de animação speed paint — se presente, a cena é animada via canvas */
  strokeAnimation?: StrokeAnimation;
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
  /** Indica se está em modo exportação — desabilita overlays pesados (ex: waveform) */
  isExporting?: boolean;
  /** Velocidade da animação speed paint (default: 'normal') */
  speedPaintSpeed?: SpeedPaintSpeed;
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

/** Frase agrupada de legendas — unidade primária do editor */
export interface CaptionPhrase {
  /** Identificador único e estável (crypto.randomUUID()) — usado como key no React */
  id: string;
  /** Texto completo da frase */
  text: string;
  /** Palavras individuais com timing granular (usado pelo Remotion/SubtitleOverlay) */
  words: CaptionWord[];
  /** Frame de início da frase (derivado de words[0].startFrame) */
  startFrame: number;
  /** Frame de fim da frase (derivado de words[words.length - 1].endFrame) */
  endFrame: number;
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

/** Posição vertical da legenda no vídeo */
export type SubtitlePosition = 'bottom' | 'center' | 'top';

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
  /** Offset vertical do container de legendas em px — positivo sobe, negativo desce (default: 0) */
  verticalOffset: number;
  /** Posição vertical da legenda (default: 'bottom') */
  position?: SubtitlePosition;
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
  position: 'bottom',
};
