// ---------------------------------------------------------------------------
// Utilitário de chunking — divisão programática de texto
// ---------------------------------------------------------------------------
//
// Fallback usado por audio.ts e chunking.ts quando o Gemini falha
// na divisão inteligente de scripts longos.
//
// Melhorias sobre a versão anterior:
// - Regex expandida: reconhece ; : — ... como pausas naturais
// - Nunca corta no meio de uma palavra
// - Respeita parágrafos como quebras prioritárias
// - Evita chunks muito curtos (< MIN_CHUNK_SIZE)
// ---------------------------------------------------------------------------

import { MIN_CHUNK_SIZE } from '../constants.js';

/**
 * Regex de divisão de sentenças expandida.
 * Reconhece: . ! ? \n ; : — (travessão) ... (reticências)
 * Mantém o delimitador anexado à sentença para preservar prosódia.
 */
const SENTENCE_SPLIT_REGEX = /[^.!?\n;:—]+(?:[.!?\n;:—]+|\.{2,})\s*/g;

/**
 * Extrai a última frase de um texto (após o último delimitador de sentença).
 * Usado como âncora contextual (trailing sentence) para continuidade entre chunks.
 */
export function extractTrailingSentence(text: string): string {
  const sentences = text.match(SENTENCE_SPLIT_REGEX);
  if (!sentences || sentences.length === 0) {
    return text.trim();
  }
  // Pega a última sentença, ou as duas últimas se a última for muito curta
  const last = sentences[sentences.length - 1]?.trim() ?? '';
  if (sentences.length >= 2 && last.length < MIN_CHUNK_SIZE) {
    return `${sentences[sentences.length - 2]?.trim() ?? ''} ${last}`.trim();
  }
  return last;
}

/**
 * Verifica se um chunk parece ter sido truncado no meio de uma frase.
 * Um chunk é considerado truncado se:
 * - Não termina com pontuação de fim de sentença (. ! ? ; : — ...)
 * - E não termina com quebra de linha
 */
export function isTruncatedChunk(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  // Verifica se NÃO termina com pontuação de fim de sentença
  return !/[.!?:;—]$/.test(trimmed) && !/\.{2,}$/.test(trimmed);
}

/**
 * Divide um texto em pedaços de no máximo `limit` caracteres,
 * respeitando quebras de sentença, parágrafo e pausas naturais.
 *
 * Nunca corta no meio de uma palavra — se uma sentença excede o limite,
 * divide no último espaço antes do limite.
 *
 * Fallback programático quando o Gemini falha ou o script é curto.
 */
export function splitTextProgrammatically(text: string, limit: number): string[] {
  const result: string[] = [];

  // Prioridade 1: dividir por parágrafos
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  for (const paragraph of paragraphs) {
    if (paragraph.length <= limit) {
      // Parágrafo inteiro cabe no limite — tenta agrupar com o chunk atual
      mergeOrPush(result, paragraph.trim(), limit);
      continue;
    }

    // Prioridade 2: dividir parágrafo por sentenças
    const sentences = paragraph.match(SENTENCE_SPLIT_REGEX) || [paragraph];
    let current = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      if (trimmedSentence.length > limit) {
        // Sentença excede o limite — flush current e divide a sentença por palavras
        if (current) {
          result.push(current.trim());
          current = '';
        }
        splitLongSentence(result, trimmedSentence, limit);
      } else if (current.length + trimmedSentence.length + 1 > limit) {
        // Adicionar esta sentença estouraria o limite — flush e começa novo chunk
        if (current) {
          result.push(current.trim());
        }
        current = trimmedSentence;
      } else {
        current += (current ? ' ' : '') + trimmedSentence;
      }
    }

    if (current) {
      result.push(current.trim());
    }
  }

  // Pós-processamento: merge chunks muito curtos com o vizinho
  return mergeShortChunks(result, limit);
}

/**
 * Adiciona texto ao último chunk se couber, ou cria novo chunk.
 */
function mergeOrPush(result: string[], text: string, limit: number): void {
  if (result.length > 0) {
    const lastIdx = result.length - 1;
    const last = result[lastIdx];
    if (last.length + text.length + 2 <= limit) {
      result[lastIdx] = `${last}\n\n${text}`;
      return;
    }
  }
  result.push(text);
}

/**
 * Divide uma sentença longa no último espaço antes do limite.
 * Nunca corta no meio de uma palavra.
 */
function splitLongSentence(result: string[], sentence: string, limit: number): void {
  let remaining = sentence;

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      result.push(remaining.trim());
      break;
    }

    // Encontra o último espaço antes do limite
    let cutPoint = remaining.lastIndexOf(' ', limit);
    if (cutPoint <= 0) {
      // Sem espaço encontrado — corta no limite (caso extremo: palavra > limit)
      cutPoint = limit;
    }

    result.push(remaining.slice(0, cutPoint).trim());
    remaining = remaining.slice(cutPoint).trim();
  }
}

/**
 * Pós-processamento: faz merge de chunks muito curtos (< MIN_CHUNK_SIZE)
 * com o chunk vizinho, desde que o resultado não exceda o limite.
 */
function mergeShortChunks(chunks: string[], limit: number): string[] {
  if (chunks.length <= 1) return chunks;

  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const current = chunks[i];
    const lastIdx = result.length - 1;
    const last = result[lastIdx];

    if (current.length < MIN_CHUNK_SIZE && last.length + current.length + 1 <= limit) {
      // Merge com o chunk anterior
      result[lastIdx] = `${last} ${current}`;
    } else {
      result.push(current);
    }
  }

  return result;
}
