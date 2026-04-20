import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { BLACK_74, WHITE_92 } from '../../../theme/tokens';

interface SubtitleOverlayProps {
  /** Texto da legenda */
  text: string;
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Posição vertical da legenda (default: bottom) */
  style?: 'bottom' | 'center' | 'top';
}

/** Frames de fade in/out da legenda */
const SUBTITLE_FADE = 8;

/**
 * Legenda estilo TikTok/Shorts com posição customizável.
 * Usa tokens do tema para font e cores, com fade animado.
 */
export function SubtitleOverlay({ text, durationInFrames, style = 'bottom' }: SubtitleOverlayProps) {
  const frame = useCurrentFrame();

  // Se a duração é muito curta para fade in+out, reduz o fade proporcionalmente
  // para manter o inputRange monotonicamente crescente
  const safeFade = Math.min(SUBTITLE_FADE, Math.floor(durationInFrames / 3));

  const opacity = interpolate(
    frame,
    [0, safeFade, durationInFrames - safeFade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Leve deslocamento vertical para animação de entrada
  const translateY = interpolate(
    frame,
    [0, safeFade],
    [12, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Mapeia estilo para alinhamento flex e padding
  const alignmentMap = {
    bottom: { alignItems: 'flex-end' as const, padding: '40px 24px' },
    center: { alignItems: 'center' as const, padding: '24px' },
    top: { alignItems: 'flex-start' as const, padding: '40px 24px' },
  };

  const alignment = alignmentMap[style];

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: alignment.alignItems,
        justifyContent: 'center',
        padding: alignment.padding,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          backgroundColor: BLACK_74,
          color: WHITE_92,
          fontSize: 'clamp(16px, 3.5vw, 32px)',
          fontWeight: 600,
          lineHeight: 1.4,
          textAlign: 'center',
          maxWidth: '80%',
          padding: '10px 24px',
          borderRadius: 8,
          // Evita seleção de texto durante reprodução
          userSelect: 'none',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}
