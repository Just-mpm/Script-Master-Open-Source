import { interpolate, spring } from 'remotion';
import { createLogger } from '../../../lib/logger';
import { WHITE, WHITE_92, BLACK_82, BLACK_64 } from '../../../theme/tokens';
import type { CaptionWord } from '../types';

const log = createLogger('subtitleUtils');

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

// ─── Tipos locais ──────────────────────────────────────────

/** Tipo local (espelho de AudioSegment em src/lib/db/types.ts) */
interface AudioSegmentData {
  text: string;
  startSec: number;
  endSec: number;
  chunkIndex: number;
}

// ─── Constantes de pausa por pontuação ─────────────────────

/** Pausas por tipo de pontuação em frames (base 24fps) */
const PUNCTUATION_PAUSES: Record<string, number> = {
  ',': 5,
  ';': 5,
  '.': 10,
  '!': 10,
  '?': 10,
  '...': 14,
};

/** Converte pausa de frames-24fps para fps real */
function scalePause(baseFrames: number, fps: number): number {
  return Math.round(baseFrames * (fps / 24));
}

// ─── Helpers de contagem de sílabas ────────────────────────

/**
 * Conta sílabas de uma palavra em português (regra simplificada).
 * 
 * Algoritmo:
 * 1. Conta vogais (a, e, i, o, u, á, é, í, ó, ú, ã, õ, â, ê, ô)
 * 2. Subtrai ditongos (ai, ei, oi, ui, au, eu, ou, ãe, õe) — cada um conta como 1 sílaba
 * 3. Subtrai tritongos (uai, uei, uão) — cada um conta como 1 sílaba
 * 4. Mínimo de 1 sílaba por palavra
 */
function countSyllables(word: string): number {
  const normalized = word.toLowerCase().replace(/[^a-záéíóúãõâêô]/g, '');
  if (normalized.length === 0) return 1;

  let vowels = 0;
  const vowelSet = new Set('aeiouáéíóúãõâêô');

  for (const ch of normalized) {
    if (vowelSet.has(ch)) vowels++;
  }

  // Ditongos: par de vogais adjacentes que forma uma sílaba
  const diphthongs = ['ai', 'ei', 'oi', 'ui', 'au', 'eu', 'ou', 'ãe', 'õe'];
  let diphthongCount = 0;
  const lower = normalized;
  for (const d of diphthongs) {
    let pos = lower.indexOf(d);
    while (pos !== -1) {
      diphthongCount++;
      pos = lower.indexOf(d, pos + d.length);
    }
  }

  // Tritongos: três vogais adjacentes que formam uma sílaba
  const triphthongs = ['uai', 'uei', 'uão'];
  for (const t of triphthongs) {
    let pos = lower.indexOf(t);
    while (pos !== -1) {
      // Tritongo já foi contado como ditongo + vogal, corrige subtraindo 1 extra
      diphthongCount++;
      pos = lower.indexOf(t, pos + t.length);
    }
  }

  return Math.max(1, vowels - diphthongCount);
}

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

// ─── Timing proporcional por sílabas com pausas ────────────

/**
 * Extrai tokens (palavras e pontuação) de um texto segmentado por bold.
 * Retorna lista de tokens na ordem original com flag de bold.
 */
function extractTokensFromSegments(segments: TextSegment[]): Array<{ text: string; bold: boolean; isPunct: boolean }> {
  const tokens: Array<{ text: string; bold: boolean; isPunct: boolean }> = [];

  for (const seg of segments) {
    // Separa pontuação e palavras mantendo ordem
    const parts = seg.text.split(/(\s*[,.!?;…]+\s*|\.{3})/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length === 0) continue;

      const isPunct = /^[,.!?;…]+$/.test(trimmed) || trimmed === '...';
      tokens.push({ text: trimmed, bold: seg.bold, isPunct });
    }
  }

  return tokens;
}

/** Pontuação mapeada para chave de PUNCTUATION_PAUSES */
function getPunctuationPauseKey(punct: string): string | undefined {
  if (punct === '...') return '...';
  // Normaliza reticências soltas (…)
  if (punct === '…') return '...';

  // Pega o primeiro caractere se for pontuação simples
  const first = punct[0];
  if (first && first in PUNCTUATION_PAUSES) return first;
  return undefined;
}

/**
 * Divide o texto em palavras com timing proporcional por SÍLABAS (não caracteres).
 * Parseia markdown **bold** e preserva a flag.
 * Respeita pausas de pontuação dentro do intervalo.
 *
 * Diferente de splitIntoWords + calculateWordTiming, esta função:
 * - Conta sílabas (não caracteres) para duração proporcional
 * - Adiciona pausas em pontuação (vírgula, ponto, reticências)
 * - Retorna CaptionWord[] pronto para uso (não precisa de calculateWordTiming depois)
 *
 * @param text - Texto com possível markdown **bold**
 * @param startFrame - Frame inicial do intervalo
 * @param endFrame - Frame final do intervalo
 * @param fps - Frames por segundo (para escalar pausas)
 */
export function splitIntoWordsWithTiming(
  text: string,
  startFrame: number,
  endFrame: number,
  fps: number,
): CaptionWord[] {
  if (startFrame >= endFrame || text.trim().length === 0) return [];

  const segments = parseBoldMarkdown(text);
  const tokens = extractTokensFromSegments(segments);

  // Separar palavras e pontuação
  const words = tokens.filter((t) => !t.isPunct);
  const punctuations = tokens.filter((t) => t.isPunct);

  if (words.length === 0) return [];

  // Calcular total de sílabas
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w.text), 0);

  // Calcular total de frames reservados para pausas
  const totalPauseFrames = punctuations.reduce((sum, p) => {
    const key = getPunctuationPauseKey(p.text);
    return key ? sum + scalePause(PUNCTUATION_PAUSES[key], fps) : sum;
  }, 0);

  // Frames disponíveis para palavras (clamped para não ficar negativo)
  const totalInterval = endFrame - startFrame;
  const availableForWords = Math.max(totalInterval - totalPauseFrames, totalInterval * 0.6);

  // Distribuir frames proporcionalmente por sílabas
  const result: CaptionWord[] = [];
  let currentFrame = startFrame;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const syllables = countSyllables(word.text);
    const proportion = totalSyllables > 0 ? syllables / totalSyllables : 1 / words.length;
    const wordFrames = Math.max(1, Math.round(proportion * availableForWords));

    const wordStartFrame = currentFrame;

    if (i === words.length - 1) {
      // Última palavra absorve frames residuais
      currentFrame = endFrame;
    } else {
      currentFrame = currentFrame + wordFrames;
    }

    result.push({
      text: word.text,
      startFrame: wordStartFrame,
      endFrame: currentFrame,
      bold: word.bold,
    });

    // Inserir pausas de pontuação entre palavras
    if (i < words.length - 1) {
      // Encontrar pontuação entre esta palavra e a próxima via índices no array de tokens
      const currentWordIdx = tokens.indexOf(word);
      const nextWordIdx = tokens.indexOf(words[i + 1]);
      for (let j = currentWordIdx + 1; j < nextWordIdx; j++) {
        const tok = tokens[j];
        if (tok.isPunct) {
          const key = getPunctuationPauseKey(tok.text);
          if (key) {
            currentFrame += scalePause(PUNCTUATION_PAUSES[key], fps);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Alinha o roteiro aos segmentos de áudio (com timing real do TTS).
 * Cada segmento tem startSec/endSec reais — não é estimativa.
 *
 * Este é o método principal de geração de legendas quando há mapeamento
 * de segmentos disponível. Substitui segmentScriptByCenes com timing real.
 *
 * @param script - Roteiro completo (pode conter markdown **bold**)
 * @param segments - Segmentos de áudio com timing real do TTS
 * @param totalDurationFrames - Duração total em frames
 * @param fps - Frames por segundo
 */
export function alignScriptToSegments(
  script: string,
  segments: AudioSegmentData[],
  totalDurationFrames: number,
  fps: number,
): CaptionWord[] {
  if (segments.length === 0) {
    log.warn('alignScriptToSegments: segmentos vazios, usando fallback proporcional');
    // Fallback: não temos cenas aqui, usar o script inteiro no intervalo total
    return splitIntoWordsWithTiming(script, 0, totalDurationFrames, fps);
  }

  const allWords: CaptionWord[] = [];

  for (const seg of segments) {
    const segText = seg.text.trim();
    if (segText.length === 0) continue;

    const startFrame = Math.round(seg.startSec * fps);
    const endFrame = Math.round(seg.endSec * fps);

    if (startFrame >= endFrame) continue;

    const segWords = splitIntoWordsWithTiming(segText, startFrame, endFrame, fps);
    allWords.push(...segWords);
  }

  // Se houver frames residuais, a última palavra absorve
  if (allWords.length > 0) {
    const lastWord = allWords[allWords.length - 1];
    if (lastWord.endFrame < totalDurationFrames) {
      lastWord.endFrame = totalDurationFrames;
    }
  }

  return allWords;
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
          textShadow: `0 0 12px ${BLACK_82}, 0 2px 4px ${BLACK_64}`,
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

    // Parseia bold markdown do snippet para preservar formatação nas legendas
    const boldSegments = parseBoldMarkdown(snippet);
    const boldWords = new Set<string>();
    for (const seg of boldSegments) {
      if (seg.bold) {
        const segWords = seg.text.match(/\S+/g) ?? [];
        for (const w of segWords) {
          boldWords.add(w.toLowerCase());
        }
      }
    }

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
          bold: boldWords.has(word.toLowerCase()),
        });

        wordFrame = endFrame;
      }

      currentFrame += phraseFrames;
    }
  }

  return result;
}
