/**
 * Cache LRU para StrokeAnimation — evita reprocessar imagens já convertidas.
 *
 * Usa hash SHA-256 via SubtleCrypto (async) como chave.
 * Limitado a 20 entradas — ao exceder, remove a mais antiga (por timestamp).
 */

import type { StrokeAnimation } from '../../speed-paint/types';
import { createLogger } from '../../../lib/logger';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface CacheEntry {
  animation: StrokeAnimation;
  timestamp: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/** Número máximo de entradas no cache antes de eviction */
const MAX_CACHE_SIZE = 20;

// ---------------------------------------------------------------------------
// Estado interno
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Gera hash SHA-256 hex digest de uma string (URL da imagem).
 * Usa crypto.subtle.digest — disponível em contextos seguros (HTTPS/local).
 */
async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Eviction
// ---------------------------------------------------------------------------

/**
 * Remove a entrada mais antiga do cache (menor timestamp).
 * Chamado quando o cache excede MAX_CACHE_SIZE.
 */
function evictOldest(): void {
  if (cache.size === 0) return;

  let oldestKey = '';
  let oldestTimestamp = Infinity;

  for (const [key, entry] of cache) {
    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

const log = createLogger('strokeCache');

/**
 * Busca uma StrokeAnimation no cache.
 *
 * @param imageUrl - URL da imagem (chave de busca)
 * @returns A animação em cache, ou null se não encontrada
 */
export async function getStrokeAnimation(imageUrl: string): Promise<StrokeAnimation | null> {
  try {
    const key = await hashUrl(imageUrl);
    const entry = cache.get(key);

    if (entry) {
      // Atualiza timestamp para LRU — entradas acessadas recentemente não são evictadas primeiro
      entry.timestamp = Date.now();
      log.debug('Cache hit', { imageUrl: imageUrl.substring(0, 60) });
      return entry.animation;
    }

    log.debug('Cache miss', { imageUrl: imageUrl.substring(0, 60) });
    return null;
  } catch (err: unknown) {
    // crypto.subtle indisponível (contexto inseguro) — ignora cache
    log.warn('Falha ao ler cache de strokes', { error: String(err) });
    return null;
  }
}

/**
 * Armazena uma StrokeAnimation no cache.
 *
 * Se o cache exceder MAX_CACHE_SIZE, remove a entrada mais antiga.
 *
 * @param imageUrl - URL da imagem (chave de armazenamento)
 * @param animation - Dados da animação de speed paint
 */
export async function setStrokeAnimation(imageUrl: string, animation: StrokeAnimation): Promise<void> {
  try {
    const key = await hashUrl(imageUrl);

    // Eviction antes de inserir se necessário
    if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
      evictOldest();
    }

    cache.set(key, { animation, timestamp: Date.now() });
    log.debug('Cache set', { imageUrl: imageUrl.substring(0, 60), cacheSize: cache.size });
  } catch (err: unknown) {
    // crypto.subtle indisponível — falha silenciosa, sem cache
    log.warn('Falha ao escrever cache de strokes', { error: String(err) });
  }
}

/**
 * Limpa todo o cache, permitindo GC das StrokeAnimations.
 */
export function clearStrokeCache(): void {
  const previousSize = cache.size;
  cache.clear();
  if (previousSize > 0) {
    log.info('Cache limpo', { entriesRemoved: previousSize });
  }
}

/**
 * Retorna estatísticas do cache.
 */
export function getStrokeCacheStats(): CacheStats {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}
