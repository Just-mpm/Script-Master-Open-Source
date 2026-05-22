/**
 * Cliente HTTP da API Pexels para busca de fotos stock.
 *
 * Usa withRetry do rate-limiter para retry automático em erros transitórios
 * (429 rate limit, 5xx servidor). Erros definitivos (401, 403, 404) falham
 * imediatamente sem retry.
 *
 * Rate limit do plano free: 200 requisições/hora.
 * Monitorado via header X-Ratelimit-Remaining.
 */
import { createLogger } from './logger';
import { withRetry } from './rate-limiter';

const log = createLogger('pexelsApi');

// ---------------------------------------------------------------------------
// Tipos — Resposta da API Pexels
// ---------------------------------------------------------------------------

/** Fontes de imagem disponíveis em uma foto Pexels */
interface PexelsPhotoSrc {
  readonly original: string;
  readonly large2x: string;
  readonly large: string;
  readonly medium: string;
  readonly small: string;
  readonly portrait: string;
  readonly landscape: string;
  readonly tiny: string;
}

/** Foto retornada pela API Pexels */
export interface PexelsPhoto {
  readonly id: number;
  readonly width: number;
  readonly height: number;
  readonly url: string;
  readonly photographer: string;
  readonly photographer_url: string;
  readonly avg_color: string;
  readonly alt: string;
  readonly src: PexelsPhotoSrc;
}

/** Resposta da API de busca do Pexels */
export interface PexelsSearchResponse {
  readonly total_results: number;
  readonly page: number;
  readonly per_page: number;
  readonly photos: readonly PexelsPhoto[];
  readonly next_page: string | null;
}

/** Parâmetros para busca na API Pexels */
export interface PexelsSearchParams {
  readonly query: string;
  readonly orientation?: 'landscape' | 'portrait' | 'square';
  readonly page?: number;
  readonly perPage?: number;
}

// ---------------------------------------------------------------------------
// Erro customizado — compatível com isRetryableError do rate-limiter
// ---------------------------------------------------------------------------

/**
 * Erro da API Pexels com código HTTP.
 *
 * A propriedade `status` é reconhecida pelo `isRetryableError` do rate-limiter,
 * permitindo retry automático em erros 429/5xx.
 */
export class PexelsApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'PexelsApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PEXELS_BASE_URL = 'https://api.pexels.com/v1/';

/** Configuração de retry para Pexels (delay mais conservador que Gemini) */
const PEXELS_RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 1500,
  jitterMs: 500,
} as const;

/** Query padrão quando o usuário envia busca vazia (Pexels exige query não-vazia) */
const DEFAULT_QUERY = 'background';

// ---------------------------------------------------------------------------
// Cliente HTTP
// ---------------------------------------------------------------------------

/**
 * Faz uma requisição à API Pexels e retorna o JSON tipado.
 * Lança PexelsApiError em caso de resposta não-ok.
 */
async function fetchPexels<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  apiKey: string,
): Promise<T> {
  const url = new URL(endpoint, PEXELS_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
  });

  // Loga rate limit restante quando disponível (aviso preventivo)
  const remaining = response.headers.get('X-Ratelimit-Remaining');
  if (remaining !== null) {
    const remainingNum = Number(remaining);
    if (remainingNum <= 20) {
      log.warn(`Pexels rate limit: ${remainingNum} requisições restantes nesta hora`);
    }
  }

  if (!response.ok) {
    throw new PexelsApiError(
      response.status,
      `Pexels API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Busca fotos na API Pexels com retry automático em erros transitórios.
 *
 * Usa withRetry para lidar com rate limits (429) e erros de servidor (5xx).
 * Para erros definitivos (401, 403, 404), falha imediatamente.
 *
 * @throws PexelsApiError quando a API retorna erro após todas as tentativas
 */
export async function searchPexelsPhotos(
  params: PexelsSearchParams,
  apiKey: string,
): Promise<PexelsSearchResponse> {
  const { query, orientation, page = 1, perPage = 12 } = params;

  // Pexels exige query não-vazia — usa default quando o campo está vazio
  const effectiveQuery = query.trim() || DEFAULT_QUERY;

  log.info('Buscando fotos no Pexels', { query: effectiveQuery, orientation, page, perPage });

  const { value } = await withRetry(
    () => fetchPexels<PexelsSearchResponse>(
      'search',
      {
        query: effectiveQuery,
        orientation,
        page,
        per_page: perPage,
      },
      apiKey,
    ),
    PEXELS_RETRY_CONFIG,
  );

  log.info(`Pexels: ${value.total_results} resultados (página ${value.page})`);
  return value;
}
