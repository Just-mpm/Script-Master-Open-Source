import { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { BLACK_50, BLACK_40, WHITE } from '../../../theme/tokens';
import { parseBoldMarkdown, SUBTITLE_FADE } from '../lib/subtitleUtils';
import type { TextSegment } from '../lib/subtitleUtils';
import type { CaptionWord } from '../types';

// ─── Tipos ──────────────────────────────────────────────────

interface ScrollingPhraseProps {
  /** Palavras que compõem esta frase */
  words: CaptionWord[];
  /** Índice desta frase no grupo (usado para decidir animação de saída) */
  phraseIndex: number;
  /** Total de frases no grupo */
  totalPhrases: number;
  /** Variante visual: ativa (destaque) ou anterior (opacidade reduzida) */
  variant: 'active' | 'previous';
  /** Frame em que esta frase deve começar a sair (apenas para previous) */
  fadeOutStartFrame?: number;
}

// ─── Componente ─────────────────────────────────────────────

/**
 * Renderiza UMA frase de legenda como texto contínuo (sem karaoke).
 *
 * - active: fade in + translateY de entrada, opacidade 1.0
 * - previous: transição suave para opacidade 0.5, fade out ao sair
 *
 * Preserva markdown **bold** via parseBoldMarkdown para segmentos
 * com fontWeight diferenciado.
 */
export function ScrollingPhrase({
  words,
  variant,
  fadeOutStartFrame,
}: ScrollingPhraseProps) {
  const frame = useCurrentFrame();

  // ── Monta texto completo e parseia bold ──
  const segments: TextSegment[] = useMemo(() => {
    const fullText = words.map((w) => w.text).join(' ');
    return parseBoldMarkdown(fullText);
  }, [words]);

  if (words.length === 0) {
    return <></>;
  }

  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  // ── Estilos base compartilhados entre variantes ──
  const baseStyle: React.CSSProperties = {
    fontSize: 'clamp(18px, 3.5vw, 36px)',
    fontWeight: 600,
    lineHeight: 1.6,
    textAlign: 'center',
    maxWidth: '90%',
    width: 'fit-content',
    margin: '0 auto',
    padding: '12px 24px',
    borderRadius: 12,
    userSelect: 'none',
    backgroundColor: BLACK_50,
    boxShadow: `0 0 40px 20px ${BLACK_40}`,
    color: WHITE,
  };

  // ── Variante ativa: fade in + translateY de entrada ──
  if (variant === 'active') {
    const fadeIn = interpolate(
      frame,
      [firstWord.startFrame, firstWord.startFrame + SUBTITLE_FADE],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );

    const translateY = interpolate(
      frame,
      [firstWord.startFrame, firstWord.startFrame + SUBTITLE_FADE],
      [8, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );

    return (
      <div style={{ ...baseStyle, opacity: fadeIn, transform: `translateY(${translateY}px)` }}>
        {segments.map((seg, i) => (
          <span key={i} style={{ fontWeight: seg.bold ? 800 : 'inherit' }}>
            {seg.text}
          </span>
        ))}
      </div>
    );
  }

  // ── Variante anterior: transição suave + fade out na saída ──

  // Transição de opacidade 1.0 (estado ativo anterior) para 0.5
  // Inicia quando a última palavra desta frase termina (momento em que
  // a próxima frase se torna ativa e esta se torna "anterior")
  const transitionToPrevious = interpolate(
    frame,
    [lastWord.endFrame, lastWord.endFrame + SUBTITLE_FADE],
    [1.0, 0.5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Fade out quando uma nova frase ativa entra (esta frase deixa de ser anterior)
  const fadeOut = fadeOutStartFrame !== undefined
    ? interpolate(
        frame,
        [fadeOutStartFrame - SUBTITLE_FADE, fadeOutStartFrame],
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
