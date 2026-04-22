import { interpolate, spring } from 'remotion';
import { WHITE, WHITE_92 } from '../../../theme/tokens';
import type { CaptionWord } from '../types';

// ─── Tipos exportados ──────────────────────────────────────

/** Segmento de texto com informação de formatação (negrito markdown) */
export interface TextSegment {
  text: string;
  bold: boolean;
}

/** Palavra individual com timing e formatação para animação */
export interface WordEntry {
  text: string;
  bold: boolean;
  startFrame: number;
  endFrame: number;
}

/** Estado visual de uma palavra na animação de legenda */
export type WordState = 'active' | 'past' | 'future';

// ─── Constantes de animação ────────────────────────────────

/** Frames de fade in/out da legenda inteira */
export const SUBTITLE_FADE = 8;

/** Escala máxima da palavra ativa (pop-in) */
export const ACTIVE_WORD_SCALE = 1.15;

/** Opacidade das palavras já faladas */
export const PAST_WORD_OPACITY = 0.5;

/** Opacidade das palavras ainda não faladas */
export const FUTURE_WORD_OPACITY = 0.25;

/** Frames para transição suave entre estados de palavra */
export const WORD_TRANSITION_FRAMES = 6;

// ─── Helpers de parse ──────────────────────────────────────

/**
 * Parseia markdown de negrito (**texto**) em segmentos tipados.
 * Retorna array de { text, bold } para renderização customizada.
 */
export function parseBoldMarkdown(text: string): TextSegment[] {
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
export function splitIntoWords(text: string): WordEntry[] {
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
export function calculateWordTiming(words: WordEntry[], totalFrames: number): void {
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

// ─── Componente de palavra animada ─────────────────────────

/**
 * Renderiza uma única palavra com animação determinada pelo seu estado:
 * - **active**: spring pop-in com escala 1.15, branca, bold
 * - **past**: opacidade reduzida suavemente, escala normal
 * - **future**: opacidade discreta, aparece gradualmente antes de ativar
 */
export function AnimatedWord({
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

// ─── Segmentação de roteiro por cenas ──────────────────────

/** Número máximo de palavras por frase antes de forçar divisão */
const MAX_WORDS_PER_PHRASE = 12;

/**
 * Segmenta o roteiro em frases por cena usando divisão proporcional de caracteres.
 *
 * ALGORITMO:
 * 1. Para cada cena, calcula charStart e charEnd proporcionais ao timestamp
 * 2. Divide o trecho atribuído por pontuação (., !, ?, \n) para obter frases
 * 3. Se uma frase excede ~12 palavras, divide por vírgula ou limite duro
 * 4. Distribui frames proporcionalmente dentro de cada frase
 *
 * EDGE CASE: Se o roteiro foi editado após a geração do áudio,
 * o fallback fica desalinhado. Este é um trade-off aceitável.
 */
export function segmentScriptByCenes(
  script: string,
  scenes: { timestamp: number }[],
  totalDurationFrames: number,
  fps: number,
): CaptionWord[] {
  if (scenes.length === 0 || script.length === 0) return [];

  const totalDurationSec = totalDurationFrames / fps;
  const result: CaptionWord[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const startSec = scenes[i].timestamp;
    const endSec = scenes[i + 1]?.timestamp ?? totalDurationSec;

    // Frames da cena
    const sceneStartFrame = Math.round(startSec * fps);
    const sceneEndFrame = Math.round(endSec * fps);
    const sceneFrames = sceneEndFrame - sceneStartFrame;

    if (sceneFrames <= 0) continue;

    // Extrai trecho proporcional do roteiro
    const startChar = Math.round((startSec / totalDurationSec) * script.length);
    const endChar = Math.round((endSec / totalDurationSec) * script.length);
    const snippet = script.slice(startChar, endChar).trim();

    if (snippet.length === 0) continue;

    // Divide por pontuação forte (., !, ?) e quebra de linha
    const rawPhrases = snippet.split(/[.!?\n]+/).filter((p) => p.trim().length > 0);

    // Divide frases longas por vírgula ou limite duro
    const phrases: string[] = [];
    for (const raw of rawPhrases) {
      const words = raw.trim().split(/\s+/);

      if (words.length <= MAX_WORDS_PER_PHRASE) {
        phrases.push(raw.trim());
        continue;
      }

      // Tenta dividir por vírgulas primeiro
      const commaParts = raw.split(/,\s*/).filter((p) => p.trim().length > 0);
      let buffer = '';

      for (const part of commaParts) {
        const candidate = buffer ? `${buffer}, ${part.trim()}` : part.trim();
        const candidateWords = candidate.split(/\s+/);

        if (candidateWords.length > MAX_WORDS_PER_PHRASE && buffer) {
          phrases.push(buffer.trim());
          buffer = part.trim();
        } else {
          buffer = candidate;
        }
      }

      if (buffer.trim()) {
        // Se ainda exceder, aplica limite duro
        const remaining = buffer.trim().split(/\s+/);
        for (let j = 0; j < remaining.length; j += MAX_WORDS_PER_PHRASE) {
          phrases.push(remaining.slice(j, j + MAX_WORDS_PER_PHRASE).join(' '));
        }
      }
    }

    // Distribui frames proporcionalmente entre frases (por nº de caracteres)
    const totalPhraseChars = phrases.reduce((sum, p) => sum + p.length, 0);
    let currentFrame = sceneStartFrame;

    for (let p = 0; p < phrases.length; p++) {
      const phrase = phrases[p];
      const phraseWords = phrase.split(/\s+/).filter((w) => w.length > 0);

      if (phraseWords.length === 0) continue;

      const phraseChars = phrase.length;
      const phraseProportion = totalPhraseChars > 0 ? phraseChars / totalPhraseChars : 1 / phrases.length;
      const phraseFrames = Math.round(phraseProportion * sceneFrames);

      // Distribui frames proporcionalmente entre palavras da frase
      const totalWordChars = phraseWords.reduce((sum, w) => sum + w.length, 0);
      let wordFrame = currentFrame;

      for (let w = 0; w < phraseWords.length; w++) {
        const word = phraseWords[w];
        const wordProportion =
          totalWordChars > 0 ? word.length / totalWordChars : 1 / phraseWords.length;
        const wordFrames = Math.max(1, Math.round(wordProportion * phraseFrames));

        const startFrame = wordFrame;

        // Última palavra absorve frames residuais
        const isLastPhraseWord = w === phraseWords.length - 1;
        const isLastPhrase = p === phrases.length - 1;

        let endFrame: number;
        if (isLastPhraseWord && isLastPhrase) {
          endFrame = sceneEndFrame;
        } else if (isLastPhraseWord) {
          endFrame = currentFrame + phraseFrames;
        } else {
          endFrame = wordFrame + wordFrames;
        }

        result.push({
          text: word,
          startFrame,
          endFrame: Math.min(endFrame, sceneEndFrame),
          bold: false,
        });

        wordFrame = endFrame;
      }

      currentFrame += phraseFrames;
    }
  }

  return result;
}
