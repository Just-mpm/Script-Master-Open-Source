import { useMemo } from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BLACK_50, WHITE, WHITE_92 } from '../../../theme/tokens';

// ─── Tipos ──────────────────────────────────────────────────

interface SubtitleOverlayProps {
  /** Texto da legenda */
  text: string;
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Posição vertical da legenda (default: bottom) */
  position?: 'bottom' | 'center' | 'top';
}

/** Segmento de texto com informação de formatação (negrito markdown) */
interface TextSegment {
  text: string;
  bold: boolean;
}

/** Palavra individual com timing e formatação para animação */
interface WordEntry {
  text: string;
  bold: boolean;
  startFrame: number;
  endFrame: number;
}

// ─── Constantes de animação ─────────────────────────────────

/** Frames de fade in/out da legenda inteira */
const SUBTITLE_FADE = 8;

/** Escala máxima da palavra ativa (pop-in) */
const ACTIVE_WORD_SCALE = 1.15;

/** Opacidade das palavras já faladas */
const PAST_WORD_OPACITY = 0.5;

/** Opacidade das palavras ainda não faladas */
const FUTURE_WORD_OPACITY = 0.25;

/** Frames para transição suave entre estados de palavra */
const WORD_TRANSITION_FRAMES = 6;

// ─── Helpers de parse ───────────────────────────────────────

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

/**
 * Divide o texto em palavras individuais preservando a flag de negrito
 * originada do markdown **bold**. Espaços e pontuação solta são ignorados;
 * o espaçamento visual é adicionado na renderização.
 */
function splitIntoWords(text: string): WordEntry[] {
  const segments = parseBoldMarkdown(text);
  const words: WordEntry[] = [];

  for (const seg of segments) {
    const segWords = seg.text.match(/\S+/g) ?? [];
    for (const w of segWords) {
      words.push({ text: w, bold: seg.bold, startFrame: 0, endFrame: 0 });
    }
  }

  return words;
}

/**
 * Calcula o timing proporcional de cada palavra baseado no seu comprimento.
 * Palavras maiores recebem fatias de tempo proporcionais — simulando a
 * duração natural da fala. A última palavra absorve frames residuais
 * para garantir cobertura completa da duração da cena.
 */
function calculateWordTiming(words: WordEntry[], totalFrames: number): void {
  if (words.length === 0) return;

  const totalChars = words.reduce((sum, w) => sum + w.text.length, 0);
  let frame = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const proportion = totalChars > 0 ? word.text.length / totalChars : 1 / words.length;
    const wordFrames = Math.max(1, Math.round(proportion * totalFrames));

    word.startFrame = frame;

    // Última palavra absorve frames residuais para cobrir a duração total
    if (i === words.length - 1) {
      word.endFrame = totalFrames;
    } else {
      word.endFrame = frame + wordFrames;
    }

    frame = word.endFrame;
  }
}

// ─── Componente de palavra animada ──────────────────────────

type WordState = 'active' | 'past' | 'future';

/**
 * Renderiza uma única palavra com animação determinada pelo seu estado:
 * - **active**: spring pop-in com escala 1.15, branca, bold
 * - **past**: opacidade reduzida suavemente, escala normal
 * - **future**: opacidade discreta, aparece gradualmente antes de ativar
 */
function AnimatedWord({
  word,
  state,
  frame,
  fps,
}: {
  word: WordEntry;
  state: WordState;
  frame: number;
  fps: number;
}) {
  // ── Palavra ativa: spring pop-in + destaque visual ──
  if (state === 'active') {
    const scaleSpring = spring({
      fps,
      frame: frame - word.startFrame,
      config: { damping: 12, stiffness: 200, mass: 0.8 },
    });

    // Mapeia spring 0→1 para escala 1.0→1.15
    const scale = interpolate(scaleSpring, [0, 1], [1.0, ACTIVE_WORD_SCALE]);

    // Opacidade de entrada rápida acompanhando o spring
    const opacity = interpolate(scaleSpring, [0, 0.4], [0.6, 1], {
      extrapolateRight: 'clamp',
    });

    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: 'inherit',
          fontWeight: word.bold ? 800 : 700,
          color: WHITE,
          transform: `scale(${scale})`,
          opacity,
          textShadow: '0 0 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)',
        }}
      >
        {word.text}
      </span>
    );
  }

  // ── Palavra passada: transição suave de opacidade ──
  if (state === 'past') {
    const fadeOut = interpolate(
      frame,
      [word.endFrame, word.endFrame + WORD_TRANSITION_FRAMES],
      [1, PAST_WORD_OPACITY],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );

    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: 'inherit',
          fontWeight: word.bold ? 700 : 600,
          color: WHITE_92,
          opacity: fadeOut,
          transform: 'scale(1)',
        }}
      >
        {word.text}
      </span>
    );
  }

  // ── Palavra futura: aparece gradualmente antes de ativar ──
  const fadeIn = interpolate(
    frame,
    [word.startFrame - WORD_TRANSITION_FRAMES, word.startFrame],
    [0, FUTURE_WORD_OPACITY],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 'inherit',
        fontWeight: word.bold ? 600 : 500,
        color: WHITE_92,
        opacity: fadeIn,
        transform: 'scale(1)',
      }}
    >
      {word.text}
    </span>
  );
}

// ─── Componente principal ───────────────────────────────────

/**
 * Legenda estilo TikTok com timing palavra-por-palavra.
 *
 * Cada palavra surge com animação spring pop-in no momento proporcional
 * ao seu comprimento (simulando a duração natural da fala). A palavra
 * ativa é destacada com escala maior, cor branca e text-shadow, enquanto
 * palavras passadas ficam com opacidade reduzida e futuras ficam discretas.
 *
 * Preserva suporte a negrito via **markdown** e posicionamento vertical.
 */
export function SubtitleOverlay({
  text,
  durationInFrames,
  position = 'bottom',
}: SubtitleOverlayProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing global de fade in/out da legenda inteira ──
  const safeFade = Math.min(SUBTITLE_FADE, Math.floor(durationInFrames / 3));

  const globalOpacity = interpolate(
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

  // ── Prepara palavras com timing (memoizado: text/durationInFrames não mudam entre frames) ──
  const words = useMemo(() => {
    const parsed = splitIntoWords(text);
    calculateWordTiming(parsed, durationInFrames);
    return parsed;
  }, [text, durationInFrames]);

  // ── Encontra o índice da palavra ativa (-1 se nenhuma) ──
  const activeIndex = words.findIndex(
    (w) => frame >= w.startFrame && frame < w.endFrame,
  );

  // ── Posição vertical: alinhamento e padding ──
  const alignmentMap = {
    bottom: { alignItems: 'flex-end' as const, padding: '40px 24px' },
    center: { alignItems: 'center' as const, padding: '24px' },
    top: { alignItems: 'flex-start' as const, padding: '40px 24px' },
  };

  const alignment = alignmentMap[position];

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
          opacity: globalOpacity,
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
        {words.map((word, i) => {
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
    </AbsoluteFill>
  );
}
