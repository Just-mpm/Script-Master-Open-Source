import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { BLACK_74, WHITE_92 } from '../../../theme/tokens';

interface SubtitleOverlayProps {
  /** Texto da legenda */
  text: string;
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Posição vertical da legenda (default: bottom) */
  position?: 'bottom' | 'center' | 'top';
}

/** Segmento de texto com informação de formatação */
interface TextSegment {
  text: string;
  bold: boolean;
}

/** Frames de fade in/out da legenda */
const SUBTITLE_FADE = 8;

/** Caracteres máximos por linha antes de quebrar */
const MAX_CHARS_PER_LINE = 35;

/**
 * Quebra texto em linhas de no máximo `maxChars` caracteres,
 * respeitando limites de palavras (word wrap).
 */
function wrapSubtitleText(text: string, maxChars = MAX_CHARS_PER_LINE): string[] {
  if (text.length <= maxChars) return [text];

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Parseia markdown de negrito (**texto**) em segmentos tipados.
 * Retorna array de { text, bold } para renderização customizada.
 */
function parseBoldMarkdown(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  return segments.length > 0 ? segments : [{ text, bold: false }];
}

/** Renderiza uma única linha de legenda com suporte a negrito */
function SubtitleLine({ text }: { text: string }) {
  const segments = parseBoldMarkdown(text);
  return (
    <>
      {segments.map((seg, i) => (
        <span key={i} style={{
          fontWeight: seg.bold ? 800 : 600,
          color: seg.bold ? '#FFFFFF' : WHITE_92,
        }}>
          {seg.text}
        </span>
      ))}
    </>
  );
}

/**
 * Legenda estilo TikTok/Shorts com posição customizável.
 * Suporta quebra de linha automática e negrito via **markdown**.
 */
export function SubtitleOverlay({ text, durationInFrames, position = 'bottom' }: SubtitleOverlayProps) {
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

  // Mapeia posição para alinhamento flex e padding
  const alignmentMap = {
    bottom: { alignItems: 'flex-end' as const, padding: '40px 24px' },
    center: { alignItems: 'center' as const, padding: '24px' },
    top: { alignItems: 'flex-start' as const, padding: '40px 24px' },
  };

  const alignment = alignmentMap[position];
  const lines = wrapSubtitleText(text);

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
          userSelect: 'none',
        }}
      >
        {lines.map((line, i) => (
          <div key={i}>
            <SubtitleLine text={line} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
