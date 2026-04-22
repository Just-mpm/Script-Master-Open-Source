import { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { BLACK_50 } from '../../../theme/tokens';
import {
  AnimatedWord,
  SUBTITLE_FADE,
} from '../lib/subtitleUtils';
import type { WordEntry, WordState } from '../lib/subtitleUtils';
import type { CaptionWord } from '../types';

// ─── Tipos ──────────────────────────────────────────────────

interface ScrollingPhraseProps {
  /** Palavras que compõem esta frase */
  words: CaptionWord[];
  /** Índice desta frase no grupo (usado para decidir animação de saída) */
  phraseIndex: number;
  /** Total de frases no grupo */
  totalPhrases: number;
}

// ─── Componente ─────────────────────────────────────────────

/**
 * Renderiza UMA frase de legenda com karaoke palavra-a-palavra.
 *
 * - Fade in + translateY na entrada (spring via interpolate)
 * - Karaoke interno reusando AnimatedWord de subtitleUtils
 * - Fade out quando a próxima frase entra (exceto na última)
 *
 * Usa useCurrentFrame/useVideoConfig diretamente pois é
 * renderizado dentro de um contexto Remotion.
 */
export function ScrollingPhrase({
  words,
  phraseIndex,
  totalPhrases,
}: ScrollingPhraseProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wordEntries: WordEntry[] = useMemo(
    () => words.map((w) => w as WordEntry),
    [words],
  );

  if (wordEntries.length === 0) {
    return <></>;
  }

  const firstWord = wordEntries[0];
  const lastWord = wordEntries[wordEntries.length - 1];
  const isLastPhrase = phraseIndex === totalPhrases - 1;

  // ── Fade in + translateY na entrada ──
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

  // ── Fade out na saída (somente se houver próxima frase) ──
  const fadeOut = isLastPhrase
    ? 1
    : interpolate(
        frame,
        [lastWord.endFrame - SUBTITLE_FADE, lastWord.endFrame],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );

  // Opacidade combinada: garante que fadeOut não sobrepõe fadeIn
  const opacity = Math.min(fadeIn, fadeOut);

  // ── Índice da palavra ativa (-1 se nenhuma) ──
  const activeIndex = wordEntries.findIndex(
    (w) => frame >= w.startFrame && frame < w.endFrame,
  );

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize: 'clamp(18px, 3.5vw, 36px)',
        fontWeight: 600,
        lineHeight: 1.6,
        textAlign: 'center',
        maxWidth: '80%',
        padding: '12px 24px',
        borderRadius: 12,
        userSelect: 'none',
        backgroundColor: BLACK_50,
        boxShadow: '0 0 40px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {wordEntries.map((word, i) => {
        const isActive = i === activeIndex;
        const isPast = activeIndex !== -1 && i < activeIndex;
        const state: WordState = isActive ? 'active' : isPast ? 'past' : 'future';

        return (
          <span key={i}>
            <AnimatedWord word={word} state={state} frame={frame} fps={fps} />
            {' '}
          </span>
        );
      })}
    </div>
  );
}
