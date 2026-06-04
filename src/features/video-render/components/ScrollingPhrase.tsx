import { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { WHITE } from '../../../theme/tokens';
import { parseBoldMarkdown, SUBTITLE_FADE } from '../lib/subtitleUtils';
import type { TextSegment } from '../lib/subtitleUtils';
import type { CaptionWord } from '../types';

// ─── Tipos ──────────────────────────────────────────────────

interface ScrollingPhraseProps {
  /** Palavras que compõem esta frase */
  words: CaptionWord[];
  /** Variante visual: ativa (destaque) ou anterior (opacidade reduzida) */
  variant: 'active' | 'previous';
  /** Frame em que esta frase deve começar a fade out (apenas para previous) */
  fadeOutFrame?: number;
  /** Tamanho da fonte em px */
  fontSize?: number;
  /** Padding horizontal da caixa em px */
  paddingX?: number;
  /** Padding vertical da caixa em px */
  paddingY?: number;
  /** Border radius da caixa em px */
  borderRadius?: number;
  /** Opacidade do fundo da caixa 0-1 */
  backgroundOpacity?: number;
}

// ─── Componente ─────────────────────────────────────────────

/**
 * Renderiza UMA frase de legenda como texto contínuo.
 *
 * O scroll vertical é feito pelo container pai (SubtitleOverlay) via translateY.
 * Este componente controla apenas opacidade:
 *
 * - active: fade in suave ao entrar, opacidade 1.0
 * - previous: transição para 0.5, fade out suave ao sair
 *
 * Preserva markdown **bold** via parseBoldMarkdown para segmentos
 * com fontWeight diferenciado.
 */
export function ScrollingPhrase({
  words,
  variant,
  fadeOutFrame,
  fontSize = 28,
  paddingX = 24,
  paddingY = 12,
  borderRadius = 12,
  backgroundOpacity = 0.5,
}: ScrollingPhraseProps) {
  const frame = useCurrentFrame();

  // ── Monta texto completo e parseia bold ──
  const segments: TextSegment[] = useMemo(() => {
    const fullText = words.map((w) => w.text).join(' ');
    return parseBoldMarkdown(fullText);
  }, [words]);

  // ── Estilos base construídos a partir das props (memoizado: evita recriação a cada frame) ──
  const baseStyle = useMemo((): React.CSSProperties => ({
    fontSize: `${fontSize}px`,
    fontWeight: 600,
    lineHeight: 1.6,
    textAlign: 'center' as const,
    maxWidth: '90%',
    width: 'fit-content',
    margin: '0 auto',
    padding: `${paddingY}px ${paddingX}px`,
    borderRadius,
    userSelect: 'none' as const,
    backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})`,
    boxShadow: `0 0 40px 20px rgba(0, 0, 0, ${backgroundOpacity * 0.8 })`,
    color: WHITE,
  }), [fontSize, paddingX, paddingY, borderRadius, backgroundOpacity]);

  if (words.length === 0) {
    return <></>;
  }

  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  // ── Variante ativa: fade in suave, opacidade 1.0 ──
  if (variant === 'active') {
    const fadeIn = interpolate(
      frame,
      [firstWord.startFrame, firstWord.startFrame + SUBTITLE_FADE],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );

    return (
      <div style={{ ...baseStyle, opacity: fadeIn }}>
        {segments.map((seg, i) => (
          <span key={i} style={{ fontWeight: seg.bold ? 800 : 'inherit' }}>
            {seg.text}
          </span>
        ))}
      </div>
    );
  }

  // ── Variante anterior: acima da ativa, opacidade 0.5, fade out suave ──

  // Transição de opacidade 1.0 → 0.5 quando deixa de ser a frase ativa
  const transitionToPrevious = interpolate(
    frame,
    [lastWord.endFrame, lastWord.endFrame + SUBTITLE_FADE],
    [1.0, 0.5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Fade out para 0 quando uma nova frase entra e esta deixa de ser anterior
  const fadeOut = fadeOutFrame !== undefined
    ? interpolate(
        frame,
        [fadeOutFrame - SUBTITLE_FADE, fadeOutFrame],
        [0.5, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 1.0;

  // Combinar: transição para 0.5 e fade out para 0 (prevalece o menor)
  const opacity = Math.min(transitionToPrevious, fadeOut);

  return (
    <div style={{ ...baseStyle, opacity }}>
      {segments.map((seg, i) => (
        <span key={i} style={{ fontWeight: seg.bold ? 800 : 'inherit' }}>
          {seg.text}
        </span>
      ))}
    </div>
  );
}
