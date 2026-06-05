/**
 * Validadores para o wizard de Projeto Manual.
 *
 * Funções puras e assíncronas que verificam se um arquivo é válido
 * para uso no projeto. Cada função retorna `ValidationResult` com
 * categoria de erro tipada para rastreio em analytics.
 */

import { createLogger } from '../../../lib/logger';
import { validateImageIsDecodable } from '../../../lib/validateImage';
import {
  ACCEPTED_AUDIO_MIMES,
  ACCEPTED_IMAGE_MIMES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  MIN_AUDIO_DURATION_SEC,
  MIN_IMAGE_DIMENSION,
  type ValidationErrorKind,
  type ValidationResult,
} from '../types';

const log = createLogger('manualProjectValidation');

/** Mapeia MIME/extensão para bucket de tamanho (reutiliza helper existente) */
function getSizeBucket(bytes: number): 'small' | 'medium' | 'large' | 'xlarge' {
  if (bytes <= 500 * 1024) return 'small'; // ≤500KB
  if (bytes <= 5 * 1024 * 1024) return 'medium'; // ≤5MB
  if (bytes <= 20 * 1024 * 1024) return 'large'; // ≤20MB
  return 'xlarge';
}

/** Mapeia duração em segundos para bucket */
function getDurationBucket(seconds: number): 'short' | 'medium' | 'long' {
  if (seconds <= 30) return 'short';
  if (seconds <= 180) return 'medium';
  return 'long';
}

/** Extrai a duração real do áudio via Web Audio API */
async function probeAudioDuration(file: File): Promise<number> {
  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } finally {
    void audioContext.close();
  }
}

/** Valida nome do projeto (≥3 chars, ≤100 chars, sem caracteres de controle) */
export function validateProjectName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { ok: false, errorKind: 'empty_file', errorMessage: 'Nome do projeto deve ter ao menos 3 caracteres.' };
  }
  if (trimmed.length > 100) {
    return { ok: false, errorKind: 'too_large', errorMessage: 'Nome do projeto deve ter no máximo 100 caracteres.' };
  }
  // Caracteres de controle (\x00-\x1F) não permitidos
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F]/.test(trimmed)) {
    return { ok: false, errorKind: 'invalid_mime', errorMessage: 'Nome do projeto contém caracteres inválidos.' };
  }
  return { ok: true };
}

/**
 * Valida um arquivo de áudio:
 *  1. MIME deve estar em ACCEPTED_AUDIO_MIMES
 *  2. Tamanho ≤ MAX_AUDIO_BYTES (50MB)
 *  3. decodeAudioData deve funcionar (arquivo íntegro)
 *  4. Duração ≥ MIN_AUDIO_DURATION_SEC (1s)
 */
export async function validateAudioFile(file: File): Promise<ValidationResult> {
  if (!file || file.size === 0) {
    return { ok: false, errorKind: 'empty_file', errorMessage: 'Arquivo de áudio vazio.' };
  }

  if (!ACCEPTED_AUDIO_MIMES.includes(file.type as typeof ACCEPTED_AUDIO_MIMES[number])) {
    log.warn('MIME de áudio não suportado', { type: file.type });
    return {
      ok: false,
      errorKind: 'invalid_mime',
      errorMessage: `Formato "${file.type || 'desconhecido'}" não suportado. Use MP3, WAV, M4A, OGG ou WebM.`,
    };
  }

  if (file.size > MAX_AUDIO_BYTES) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      errorKind: 'too_large',
      errorMessage: `Áudio de ${sizeMb}MB excede o limite de 50MB. Reduza o tamanho ou use outro arquivo.`,
    };
  }

  let duration: number;
  try {
    duration = await probeAudioDuration(file);
  } catch (error) {
    log.warn('Falha ao decodificar áudio', { error });
    return {
      ok: false,
      errorKind: 'decode_failed',
      errorMessage: 'Não foi possível ler o áudio. O arquivo pode estar corrompido.',
    };
  }

  if (!Number.isFinite(duration) || duration < MIN_AUDIO_DURATION_SEC) {
    return {
      ok: false,
      errorKind: 'too_short',
      errorMessage: `Áudio muito curto (${duration.toFixed(1)}s). Mínimo: ${MIN_AUDIO_DURATION_SEC}s.`,
    };
  }

  return { ok: true };
}

/**
 * Valida um arquivo de imagem:
 *  1. MIME deve estar em ACCEPTED_IMAGE_MIMES
 *  2. Tamanho ≤ MAX_IMAGE_BYTES (10MB)
 *  3. Image.decode() deve funcionar
 *  4. Dimensões ≥ MIN_IMAGE_DIMENSION x MIN_IMAGE_DIMENSION
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
  if (!file || file.size === 0) {
    return { ok: false, errorKind: 'empty_file', errorMessage: 'Arquivo de imagem vazio.' };
  }

  if (!ACCEPTED_IMAGE_MIMES.includes(file.type as typeof ACCEPTED_IMAGE_MIMES[number])) {
    log.warn('MIME de imagem não suportado', { type: file.type });
    return {
      ok: false,
      errorKind: 'invalid_mime',
      errorMessage: `Formato "${file.type || 'desconhecido'}" não suportado. Use JPG, PNG ou WebP.`,
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      errorKind: 'too_large',
      errorMessage: `Imagem de ${sizeMb}MB excede o limite de 10MB. Reduza o tamanho ou use outra imagem.`,
    };
  }

  // Cria blob URL para decode + leitura de dimensões
  const blobUrl = URL.createObjectURL(file);
  try {
    const decodable = await validateImageIsDecodable(blobUrl);
    if (!decodable) {
      return {
        ok: false,
        errorKind: 'decode_failed',
        errorMessage: 'Não foi possível ler a imagem. O arquivo pode estar corrompido.',
      };
    }

    // Leitura de dimensões via <img> naturalWidth/Height
    const { width, height } = await readImageDimensions(blobUrl);
    if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
      return {
        ok: false,
        errorKind: 'too_small_dimensions',
        errorMessage: `Imagem muito pequena (${width}x${height}). Mínimo: ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}px.`,
      };
    }

    return { ok: true };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/** Lê dimensões naturais de uma imagem via <img> */
function readImageDimensions(blobUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Falha ao ler dimensões da imagem'));
    img.src = blobUrl;
  });
}

// Re-exports para analytics no hook
export { getSizeBucket, getDurationBucket };
export type { ValidationErrorKind };
