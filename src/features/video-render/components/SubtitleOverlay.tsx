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
 * Legenda com modo scroll de frases.
 *
 * Suporta dois modos:
 * - `captions`: CaptionWord[] com timestamps reais (prioridade)
 * - `text`: string simples (backward compat, convertido para CaptionWord[])
 *
 * Agrupa palavras em frases (~12 palavras ou pontuação final) e renderiza
 * apenas a frase ativa + próxima usando ScrollingPhrase, evitando
 * renderizar todas as frases simultaneamente.
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

  // ── Renderiza apenas frase ativa + próxima (otimização) ──
  const visiblePhrases: { phrase: CaptionWord[]; index: number }[] = [];
  if (activePhraseIndex !== -1) {
    visiblePhrases.push({ phrase: phrases[activePhraseIndex], index: activePhraseIndex });
    if (activePhraseIndex + 1 < phrases.length) {
      visiblePhrases.push({
        phrase: phrases[activePhraseIndex + 1],
        index: activePhraseIndex + 1,
      });
    }
  }

  if (phrases.length === 0) return null;

  // ── Posição: usa flexDirection nativa (column) do AbsoluteFill ──
  // justifyContent controla o eixo VERTICAL, alignItems o HORIZONTAL
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
      <div style={{ opacity: globalOpacity }}>
        {visiblePhrases.map(({ phrase, index }) => (
          <ScrollingPhrase
            key={index}
            words={phrase}
            phraseIndex={index}
            totalPhrases={phrases.length}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}
