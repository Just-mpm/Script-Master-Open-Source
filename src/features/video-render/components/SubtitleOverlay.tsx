import { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  calculateWordTiming,
  splitIntoWords,
  SUBTITLE_FADE,
} from '../lib/subtitleUtils';
import type { WordEntry } from '../lib/subtitleUtils';
import type { CaptionWord } from '../types';
import { ScrollingPhrase } from './ScrollingPhrase';

// ─── Tipos ──────────────────────────────────────────────────

interface SubtitleOverlayProps {
  /** Legendas com timestamps (Whisper ou fallback proporcional) */
  captions?: CaptionWord[];
  /** Texto da legenda (backward compatibility -- convertido internamente para CaptionWord[]) */
  text?: string;
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Posição vertical da legenda (default: bottom) */
  position?: 'bottom' | 'center' | 'top';
}

interface VisiblePhrase {
  phrase: CaptionWord[];
  index: number;
  variant: 'active' | 'previous';
  /** Frame em que a frase anterior deve começar a fade out */
  fadeOutStartFrame?: number;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Agrupa CaptionWord[] em frases usando pontuação final ou limite de ~12 palavras.
 * Memoizável pois não depende de frame.
 */
function groupCaptionWordsIntoPhrases(words: CaptionWord[]): CaptionWord[][] {
  const phrases: CaptionWord[][] = [];
  let current: CaptionWord[] = [];

  for (const word of words) {
    current.push(word);
    const isEndOfSentence = /[.!?]$/.test(word.text);
    if (isEndOfSentence || current.length >= 12) {
      phrases.push(current);
      current = [];
    }
  }

  if (current.length > 0) phrases.push(current);
  return phrases;
}

// ─── Componente principal ───────────────────────────────────

/**
 * Legenda com modo scroll de frases (2 linhas visíveis).
 *
 * Suporta dois modos de entrada:
 * - `captions`: CaptionWord[] com timestamps reais (prioridade)
 * - `text`: string simples (backward compat, convertido para CaptionWord[])
 *
 * Agrupa palavras em frases (~12 palavras ou pontuação final) e renderiza
 * a frase ATIVA (opacidade 1.0) + a frase ANTERIOR (opacidade 0.5),
 * criando um efeito de scroll com 2 linhas visíveis.
 */
export function SubtitleOverlay({
  captions,
  text,
  durationInFrames,
  position = 'bottom',
}: SubtitleOverlayProps) {
  const frame = useCurrentFrame();

  // ── Constroi CaptionWord[] a partir de captions ou text (memoizado) ──
  const allWords: CaptionWord[] = useMemo(() => {
    if (captions && captions.length > 0) {
      return captions;
    }

    if (text) {
      const parsed: WordEntry[] = splitIntoWords(text);
      calculateWordTiming(parsed, durationInFrames);
      return parsed as CaptionWord[];
    }

    return [];
  }, [captions, text, durationInFrames]);

  // ── Agrupa em frases (memoizado: allWords não muda entre frames) ──
  const phrases = useMemo(
    () => groupCaptionWordsIntoPhrases(allWords),
    [allWords],
  );

  // ── Fade global da cena (entrada e saída suaves) ──
  const safeFade = Math.min(SUBTITLE_FADE, Math.floor(durationInFrames / 3));

  const globalOpacity = interpolate(
    frame,
    [0, safeFade, durationInFrames - safeFade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // ── Encontra frase ativa (depende de frame, recalculado a cada render) ──
  let activePhraseIndex = -1;
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const firstWord = phrase[0];
    const lastWord = phrase[phrase.length - 1];
    if (frame >= firstWord.startFrame && frame < lastWord.endFrame) {
      activePhraseIndex = i;
      break;
    }
  }

  // ── Renderiza frase ativa + frase anterior (2 linhas visíveis) ──
  const visiblePhrases: VisiblePhrase[] = [];
  if (activePhraseIndex !== -1) {
    // Frase ativa em cima (opacidade 1.0, fade in + translateY)
    visiblePhrases.push({
      phrase: phrases[activePhraseIndex],
      index: activePhraseIndex,
      variant: 'active',
    });

    // Frase anterior embaixo (opacidade 0.5, fade out na saída)
    if (activePhraseIndex - 1 >= 0) {
      // A frase anterior deve fade out quando a frase APÓS a ativa entrar
      const fadeOutStartFrame = (activePhraseIndex + 1 < phrases.length)
        ? phrases[activePhraseIndex + 1][0].startFrame
        : undefined;

      visiblePhrases.push({
        phrase: phrases[activePhraseIndex - 1],
        index: activePhraseIndex - 1,
        variant: 'previous',
        fadeOutStartFrame,
      });
    }
  }

  if (phrases.length === 0) return null;

  // ── Posição: usa flexDirection nativa (column) do AbsoluteFill ──
  const alignmentMap = {
    bottom: { justifyContent: 'flex-end' as const, alignItems: 'center' as const, padding: '40px 24px' },
    center: { justifyContent: 'center' as const, alignItems: 'center' as const, padding: '24px' },
    top: { justifyContent: 'flex-start' as const, alignItems: 'center' as const, padding: '40px 24px' },
  };

  const alignment = alignmentMap[position];

  return (
    <AbsoluteFill
      style={{
        justifyContent: alignment.justifyContent,
        alignItems: alignment.alignItems,
        padding: alignment.padding,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          opacity: globalOpacity,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {visiblePhrases.map(({ phrase, index, variant, fadeOutStartFrame }) => (
          <ScrollingPhrase
            key={index}
            words={phrase}
            phraseIndex={index}
            totalPhrases={phrases.length}
            variant={variant}
            fadeOutStartFrame={fadeOutStartFrame}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}
