import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { WHITE_92 } from '../../../theme/tokens';
import type { TitleOverlayStyle } from '../lib/editingPlan';

interface TitleOverlayProps {
  /** Texto do título */
  text: string;
  /** Estilo visual do título */
  style: TitleOverlayStyle;
  /** Duração da cena em frames */
  durationInFrames: number;
}

/** Frames de fade para entrada/saída */
const TITLE_FADE = 10;

/**
 * Overlay de título estilizado (intro, créditos, lower-third).
 * Renderiza texto sobre a cena com animação de fade e deslocamento.
 */
export function TitleOverlay({ text, style, durationInFrames }: TitleOverlayProps) {
  const frame = useCurrentFrame();

  // Se a duração é muito curta, reduz o fade proporcionalmente
  const safeFade = Math.min(TITLE_FADE, Math.floor(durationInFrames / 3));

  const opacity = interpolate(
    frame,
    [0, safeFade, durationInFrames - safeFade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Animação de entrada: leve deslocamento vertical para cima
  const translateY = interpolate(
    frame,
    [0, safeFade * 2],
    [20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Mapa de estilos visuais para cada tipo de título
  const styleMap: Record<TitleOverlayStyle, React.CSSProperties> = {
    intro: {
      fontSize: 'clamp(28px, 6vw, 56px)',
      fontWeight: 800,
      textAlign: 'center',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      color: WHITE_92,
      textShadow: '0 2px 12px rgba(0,0,0,0.7)',
    },
    credit: {
      fontSize: 'clamp(18px, 3.5vw, 36px)',
      fontWeight: 400,
      textAlign: 'center',
      color: WHITE_92,
      textShadow: '0 1px 8px rgba(0,0,0,0.5)',
    },
    'lower-third': {
      fontSize: 'clamp(16px, 3vw, 28px)',
      fontWeight: 600,
      textAlign: 'left',
      color: WHITE_92,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      padding: '8px 20px',
      borderRadius: 4,
      alignSelf: 'flex-end',
    },
  };

  const textStyle = styleMap[style];
  const isLowerThird = style === 'lower-third';

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: isLowerThird ? 'flex-end' : 'center',
        justifyContent: isLowerThird ? 'flex-start' : 'center',
        padding: isLowerThird ? '40px 32px' : '24px',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        ...textStyle,
        opacity,
        transform: `translateY(${translateY}px)`,
        userSelect: 'none',
      }}>
        {text}
      </div>
    </AbsoluteFill>
  );
}
