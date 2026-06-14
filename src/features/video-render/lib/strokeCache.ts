/**
 * Cache LRU para animações de Speed Paint — evita reprocessar imagens.
 *
 * Suporta DOIS modos de renderização (discriminated union):
 * - `kind: 'mask'`     → `StrokeAnimation` (raspadinha, modo legado)
 * - `kind: 'vetorial'` → `VetorialAnimation` (path animation, modo novo)
 *
 * A chave SHA-256 inclui `renderMode` + `vetorialPreset` além da URL.
 * Isso garante que a mesma imagem processada em modos diferentes tem
 * chaves distintas no cache — sem isso, ler uma imagem no modo errado
 * retornaria a animação errada (colisão de cache). Veja Premissa #10
 * do tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`.
 *
 * Usa hash SHA-256 via SubtleCrypto (async) como chave.
 * Limitado a 20 entradas — ao exceder, remove a mais antiga (por timestamp).
 */

import type { StrokeAnimation, VetorialAnimation, VetorialPreset } from '../../speed-paint/types';
import { createLogger } from '../../../lib/logger';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/**
 * Entrada de cache discriminada por modo de renderização.
 * O consumidor deve discriminar `kind` antes de acessar campos específicos
 * para ter segurança de tipo em tempo de compilação.
 */
type CachedAnimation =
  | { kind: 'mask'; animation: StrokeAnimation }
  | { kind: 'vetorial'; animation: VetorialAnimation; preset: VetorialPreset };

interface CacheEntry {
  data: CachedAnimation;
  timestamp: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
}

/** Contexto do cache — identifica o modo de renderização + preset. */
interface CacheContext {
  mode: 'mask' | 'vetorial';
  preset?: VetorialPreset;
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/** Número máximo de entradas no cache antes de eviction */
const MAX_CACHE_SIZE = 20;

/** Preset default do modo vetorial (decisão Matheus — Premissa #4 do tracker) */
const DEFAULT_VETORIAL_PRESET: VetorialPreset = 'artistic1';

// ---------------------------------------------------------------------------
// Estado interno
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Gera hash SHA-256 hex digest de `url + JSON.stringify(context)`.
 * Usar crypto.subtle.digest — disponível em contextos seguros (HTTPS/local).
 *
 * Incluir `mode` + `preset` no payload é o que evita colisão entre
 * animações de modos diferentes da mesma imagem (Premissa #10).
 */
async function buildCacheKey(imageUrl: string, context: CacheContext): Promise<string> {
  const encoder = new TextEncoder();
  const payload = `${imageUrl}|${JSON.stringify(context)}`;
  const data = encoder.encode(payload);
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

const log = createLogger('strokeCache');

// ---------------------------------------------------------------------------
// Type guards (narrowing real em compile-time, sem `as`)
// ---------------------------------------------------------------------------

/**
 * Narrowing de `StrokeAnimation | VetorialAnimation` para `VetorialAnimation`
 * via campo exclusivo `totalLength` (existe em `VetorialAnimation`, ausente em
 * `StrokeAnimation`). Type guard do TS — narrowing real em compile-time.
 */
function isVetorialAnimation(
  animation: StrokeAnimation | VetorialAnimation,
): animation is VetorialAnimation {
  return 'totalLength' in animation;
}

/**
 * Narrowing de `StrokeAnimation | VetorialAnimation` para `StrokeAnimation`
 * via campo exclusivo `totalFrames` (existe em `StrokeAnimation`, ausente em
 * `VetorialAnimation`). Type guard do TS — narrowing real em compile-time.
 */
function isStrokeAnimation(
  animation: StrokeAnimation | VetorialAnimation,
): animation is StrokeAnimation {
  return 'totalFrames' in animation;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Busca uma animação de Speed Paint no cache (API legada, sem context).
 *
 * @param imageUrl - URL da imagem (chave de busca)
 * @returns A animação em cache (modo máscara), ou null se não encontrada
 */
export async function getStrokeAnimation(imageUrl: string): Promise<StrokeAnimation | null>;

/**
 * Busca uma animação vetorial no cache, discriminada por `mode: 'vetorial'`.
 *
 * @param imageUrl - URL da imagem (chave de busca)
 * @param context - Contexto discriminador: `mode: 'vetorial'` + `preset` opcional
 * @returns A animação `VetorialAnimation` em cache, ou null
 */
export async function getStrokeAnimation(
  imageUrl: string,
  context: { mode: 'vetorial'; preset?: VetorialPreset },
): Promise<VetorialAnimation | null>;

/**
 * Busca uma animação de máscara no cache, discriminada por `mode: 'mask'`.
 *
 * @param imageUrl - URL da imagem (chave de busca)
 * @param context - Contexto discriminador: `mode: 'mask'` (`preset` ignorado)
 * @returns A animação `StrokeAnimation` em cache, ou null
 */
export async function getStrokeAnimation(
  imageUrl: string,
  context: { mode: 'mask'; preset?: never },
): Promise<StrokeAnimation | null>;

/**
 * Implementação de `getStrokeAnimation` com overloads.
 * A primeira overload (sem context) preserva a API original e o tipo
 * de retorno `StrokeAnimation | null` para consumidores legados.
 */
export async function getStrokeAnimation(
  imageUrl: string,
  context?: { mode?: 'mask' | 'vetorial'; preset?: VetorialPreset },
): Promise<StrokeAnimation | VetorialAnimation | null> {
  const mode = context?.mode ?? 'mask';
  // Aplica default do preset só no modo vetorial — no modo mask é irrelevante
  const preset = mode === 'vetorial' ? (context?.preset ?? DEFAULT_VETORIAL_PRESET) : context?.preset;

  try {
    const key = await buildCacheKey(imageUrl, { mode, preset });
    const entry = cache.get(key);

    if (entry) {
      // Atualiza timestamp para LRU — entradas acessadas recentemente não são evictadas primeiro
      entry.timestamp = Date.now();
      log.debug('Cache hit', { imageUrl: imageUrl.substring(0, 60), mode, preset });
      // Discrimina por `kind` — a discriminated union `CachedAnimation` narrowa
      // o tipo de `entry.data.animation` automaticamente (sem `as`).
      return entry.data.animation;
    }

    log.debug('Cache miss', { imageUrl: imageUrl.substring(0, 60), mode, preset });
    return null;
  } catch (err: unknown) {
    // crypto.subtle indisponível (contexto inseguro) — ignora cache
    log.warn('Falha ao ler cache de strokes', { error: String(err) });
    return null;
  }
}

/**
 * Armazena uma animação vetorial no cache, com `mode: 'vetorial'` explícito.
 *
 * @param imageUrl - URL da imagem (chave de armazenamento)
 * @param animation - `VetorialAnimation` a ser armazenada
 * @param context - Contexto com `mode: 'vetorial'` + `preset` opcional
 */
export async function setStrokeAnimation(
  imageUrl: string,
  animation: VetorialAnimation,
  context: { mode: 'vetorial'; preset?: VetorialPreset },
): Promise<void>;

/**
 * Armazena uma animação de máscara no cache (API legada, `mode: 'mask'` default).
 *
 * @param imageUrl - URL da imagem (chave de armazenamento)
 * @param animation - `StrokeAnimation` a ser armazenada
 * @param context - Contexto opcional (default `mode: 'mask'`)
 */
export async function setStrokeAnimation(
  imageUrl: string,
  animation: StrokeAnimation,
  context?: { mode?: 'mask'; preset?: never },
): Promise<void>;

/**
 * Implementação de `setStrokeAnimation` com overloads.
 * A primeira overload exige `VetorialAnimation` quando `mode === 'vetorial'`;
 * a segunda aceita `StrokeAnimation` com `mode: 'mask'` (default).
 */
export async function setStrokeAnimation(
  imageUrl: string,
  animation: StrokeAnimation | VetorialAnimation,
  context?: { mode?: 'mask' | 'vetorial'; preset?: VetorialPreset },
): Promise<void> {
  const mode = context?.mode ?? 'mask';
  const preset = mode === 'vetorial' ? (context?.preset ?? DEFAULT_VETORIAL_PRESET) : context?.preset;

  try {
    const key = await buildCacheKey(imageUrl, { mode, preset });

    // Eviction antes de inserir se necessário
    if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
      evictOldest();
    }

    // Invariante de runtime: o caller DEVE passar `VetorialAnimation` quando
    // `mode === 'vetorial'` e `StrokeAnimation` quando `mode === 'mask'`.
    // Os overloads acima gatingam o tipo no caller side; aqui usamos type
    // guards baseados em shape (campos exclusivos) como salvaguarda runtime.
    // Type guard `=== 'vetorial'` narrowa o discriminator; `in` narrowa
    // `animation` para a variante correta. Narrowing real em compile-time.
    let data: CachedAnimation;
    if (mode === 'vetorial') {
      if (!isVetorialAnimation(animation)) {
        throw new TypeError(
          `Cache 'vetorial' exige VetorialAnimation (imageUrl=${imageUrl})`,
        );
      }
      // animation narrowou para VetorialAnimation via type guard
      data = { kind: 'vetorial', animation, preset: preset ?? DEFAULT_VETORIAL_PRESET };
    } else {
      if (!isStrokeAnimation(animation)) {
        throw new TypeError(
          `Cache 'mask' exige StrokeAnimation (imageUrl=${imageUrl})`,
        );
      }
      // animation narrowou para StrokeAnimation via type guard
      data = { kind: 'mask', animation };
    }

    cache.set(key, { data, timestamp: Date.now() });
    log.debug('Cache set', { imageUrl: imageUrl.substring(0, 60), mode, preset, cacheSize: cache.size });
  } catch (err: unknown) {
    // Shape mismatch (TypeError) é erro do caller — propaga para que o
    // problema seja visível em desenvolvimento. Outros erros (ex: crypto
    // indisponível) são falhas de runtime toleráveis e logamos como warning.
    if (err instanceof TypeError) {
      throw err;
    }
    log.warn('Falha ao escrever cache de strokes', { error: String(err) });
  }
}

/**
 * Limpa todo o cache, permitindo GC das animações.
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
