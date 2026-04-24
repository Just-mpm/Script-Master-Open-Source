import { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  calculateWordTiming,
  splitIntoWords,
  SUBTITLE_FADE,
} from '../lib/subtitleUtils';
import type { WordEntry } from '../lib/subtitleUtils';
import type { CaptionWord, SubtitleStyle } from '../types';
import { DEFAULT_SUBTITLE_STYLE } from '../types';
import { ScrollingPhrase } from './ScrollingPhrase';

// ─── Helpers ────────────────────────────────────────────────

/** Retorna estilos de alinhamento baseado na posição vertical (função pura, sem alocação extra) */
function getAlignment(position: 'bottom' | 'center' | 'top', offsetPadding: number) {
  const configs = {
    bottom: { justifyContent: 'flex-end' as const, alignItems: 'center' as const, padding: `${Math.max(0, offsetPadding)}px 24px` },
    center: { justifyContent: 'center' as const, alignItems: 'center' as const, padding: `${Math.max(0, offsetPadding)}px` },
    top: { justifyContent: 'flex-start' as const, alignItems: 'center' as const, padding: `${Math.max(0, offsetPadding)}px 24px` },
  };
  return configs[position];
}

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
  /** Estilo personalizável das legendas */
  subtitleStyle?: SubtitleStyle;
}

/**
 * Agrupa CaptionWord[] em frases usando pontuação final ou limite de ~12 palavras.
 * Memoizável pois não depende de frame.
 */
function groupCaptionWordsIntoPhrases(words: CaptionWord[]): CaptionWord[][] {
  const phrases: CaptionWord[][] = [];
  let current: CaptionWord[] = [];

  for (const word of words) {
    current.push(word);
    const isEndOfSentence = /[.!?;:]$/.test(word.text);
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
 * Scroll absoluto com 2 posições fixas no container:
 * - Posição 0: frase ativa na base
 * - -phraseHeight: frase anterior acima da ativa
 * Interpolação suave apenas na primeira transição (frase 0 → frase 1),
 * evitando drift vertical e bounce em frases subsequentes.
 *
 * Fallback sticky: entre gaps de frases (quando nenhuma está "ativa"),
 * mantém a última frase concluída visível para evitar piscada.
 *
 * Máximo de 2 frases visíveis por vez:
 * - Frase ANTERIOR em cima (opacidade 0.5, fade out suave)
 * - Frase ATIVA embaixo (opacidade 1.0, fade in suave)
 */
export function SubtitleOverlay({
  captions,
  text,
  durationInFrames,
  position = 'bottom',
  subtitleStyle,
}: SubtitleOverlayProps) {
  const frame = useCurrentFrame();

  // Estilo com defaults — garante valores válidos mesmo sem prop
  const style = subtitleStyle ?? DEFAULT_SUBTITLE_STYLE;

  // Altura dinâmica de cada frase: texto (fontSize * lineHeight) + padding vertical + gap
  // Isso substitui o LINE_HEIGHT estático que causava descompasso com o scroll
  const phraseHeight = style.fontSize * 1.6 + style.paddingY * 2 + style.gap;

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

  if (phrases.length === 0) return null;

  // ── Encontra frase ativa (depende de frame) ──
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

  // Fallback sticky: cobre gaps entre frases sem causar piscada.
  // Quando a frase N termina mas a N+1 ainda não começou, atribui a última
  // frase concluída para manter a legenda visível durante a transição.
  if (activePhraseIndex === -1 && phrases.length > 0 && frame >= phrases[0][0].startFrame) {
    for (let i = phrases.length - 1; i >= 0; i--) {
      const lastWord = phrases[i][phrases[i].length - 1];
      if (lastWord.endFrame <= frame) {
        activePhraseIndex = i;
        break;
      }
    }
  }

  // ── Scroll absoluto com 2 posições fixas ──
  // Container mostra no máximo 2 frases visíveis:
  // - Posição 0 (frase ativa na base)
  // - -phraseHeight (frase anterior acima da ativa)
  // Interpolação suave APENAS na primeira transição (frase 0 → frase 1).
  // A referência é phrases[1][0].startFrame (fixa) para evitar bounce.
  let scrollY = 0;
  if (activePhraseIndex >= 1) {
    const firstScrollFrame = phrases[1][0].startFrame;
    scrollY = interpolate(
      frame,
      [firstScrollFrame, firstScrollFrame + SUBTITLE_FADE],
      [0, -phraseHeight],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
  }

  // ── Determina range de frases visíveis (máx 2) ──
  // Sempre renderiza: activePhraseIndex e activePhraseIndex - 1 (se existir)
  const startIdx = Math.max(0, activePhraseIndex - 1);
  const endIdx = activePhraseIndex + 1; // exclusivo

  // ── Fade global da cena (entrada e saída suaves) ──
  const safeFade = Math.min(SUBTITLE_FADE, Math.floor(durationInFrames / 3));

  const globalOpacity = interpolate(
    frame,
    [0, safeFade, durationInFrames - safeFade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // ── Posição: usa flexDirection nativa (column) do AbsoluteFill ──
  // verticalOffset é aplicado como padding extra na direção correspondente
  const basePadding = position === 'center' ? 24 : 40;
  const offsetPadding = basePadding + style.verticalOffset;

  const alignment = getAlignment(position, offsetPadding);

  // ── Se nenhuma frase está ativa mas já há frases, mostra a primeira com fade in ──
  const hasVisiblePhrases = activePhraseIndex !== -1 || frame < phrases[0][0].startFrame + SUBTITLE_FADE * 3;
  if (!hasVisiblePhrases) return null;

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
          gap: style.gap,
          alignItems: 'center',
          transform: `translateY(${scrollY}px)`,
        }}
      >
        {/* Renderiza frases visíveis — container scrolla, frases só controlam opacidade */}
        {activePhraseIndex !== -1
          ? Array.from({ length: endIdx - startIdx }, (_, offset) => {
              const idx = startIdx + offset;
              const isActive = idx === activePhraseIndex;
              const isPrevious = idx === activePhraseIndex - 1;

              return (
                <ScrollingPhrase
                  key={idx}
                  words={phrases[idx]}
                  variant={isActive ? 'active' : 'previous'}
                  fadeOutFrame={isPrevious && activePhraseIndex + 1 < phrases.length
                    ? phrases[activePhraseIndex + 1][0].startFrame
                    : undefined}
                  fontSize={style.fontSize}
                  paddingX={style.paddingX}
                  paddingY={style.paddingY}
                  borderRadius={style.borderRadius}
                  backgroundOpacity={style.backgroundOpacity}
                />
              );
            })
          : (
            // Antes da primeira frase ativa: prévia com fade in
            <ScrollingPhrase
              key={0}
              words={phrases[0]}
              variant="active"
              fadeOutFrame={undefined}
              fontSize={style.fontSize}
              paddingX={style.paddingX}
              paddingY={style.paddingY}
              borderRadius={style.borderRadius}
              backgroundOpacity={style.backgroundOpacity}
            />
          )
        }
      </div>
    </AbsoluteFill>
  );
}
