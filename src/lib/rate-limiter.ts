/**
 * Rate limiter com exponential backoff para chamadas client-side ao Gemini.
 *
 * Detecta erros 429 (RESOURCE_EXHAUSTED) e 503 (UNAVAILABLE) e aumenta
 * o delay automaticamente entre tentativas. Segue o padrão recomendado
 * pela documentação oficial da Gemini API.
 *
 * Referência: Gemini API docs — "implement your own client-side retry
 * logic using exponential backoff".
 */
import { ApiError } from '@google/genai';
import { createLogger } from './logger';

const log = createLogger('rate-limiter');

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Configuração do rate limiter */
export interface RateLimiterConfig {
  /** Número máximo de tentativas (incluindo a primeira) */
  readonly maxRetries: number;
  /** Delay base em ms — dobrado a cada retry (ex: 1000 → 2000 → 4000) */
  readonly baseDelayMs: number;
  /** Jitter máximo adicionado ao delay para evitar thundering herd (0–jitterMs) */
  readonly jitterMs: number;
}

/** Resultado de uma tentativa com retry */
export interface RetryResult<T> {
  readonly value: T;
  readonly attempts: number;
}

/** Códigos de erro transitórios que justificam retry */
const RETRYABLE_STATUS_CODES = new Set([429, 503, 504]);

// ---------------------------------------------------------------------------
// Configuração padrão
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  jitterMs: 1000,
} as const satisfies RateLimiterConfig;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Verifica se um erro é transitório e justifica retry */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }

  // Fallback para erros que não são ApiError mas contêm status/message
  const errorLike = error as Record<string, unknown>;
  const status = typeof errorLike.status === 'number'
    ? errorLike.status
    : typeof errorLike.code === 'number'
      ? errorLike.code
      : 0;

  if (RETRYABLE_STATUS_CODES.has(status)) return true;

  // Mensagens comuns em erros que vêm como string
  const message = typeof errorLike.message === 'string' ? errorLike.message : '';
  const retryableKeywords = ['quota', 'resource_exhausted', 'deadline', 'unavailable'];
  const lowerMessage = message.toLowerCase();
  return retryableKeywords.some(keyword => lowerMessage.includes(keyword));
}

/** Pausa por `ms` milissegundos */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Calcula o delay com exponential backoff + jitter para uma tentativa */
function calculateDelay(attempt: number, config: RateLimiterConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.jitterMs;
  return Math.round(exponentialDelay + jitter);
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Executa `fn` com retry automático e exponential backoff.
 *
 * Retry apenas em erros transitórios (429, 503, 504 ou mensagens de quota).
 * Em erros definitivos (400, 403, 404), falha imediatamente sem retry.
 *
 * @param fn — Função assíncrona a executar
 * @param config — Configuração do limiter (opcional, usa padrão)
 * @returns Resultado com o valor e o número de tentativas realizadas
 * @throws O último erro recebido se todas as tentativas falharem
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RateLimiterConfig> = {},
): Promise<RetryResult<T>> {
  const mergedConfig: RateLimiterConfig = { ...DEFAULT_CONFIG, ...config };

  let lastError: unknown;

  for (let attempt = 0; attempt < mergedConfig.maxRetries; attempt++) {
    try {
      const value = await fn();
      return { value, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt >= mergedConfig.maxRetries - 1;
      if (isLastAttempt || !isRetryableError(error)) {
        throw error;
      }

      const delay = calculateDelay(attempt, mergedConfig);
      const errorInfo = error instanceof ApiError
        ? `status ${error.status}`
        : 'desconhecido';
      log.warn(
        `Erro transitório (${errorInfo}), tentativa ${attempt + 1}/${mergedConfig.maxRetries}. Aguardando ${delay}ms...`,
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('withRetry: todas as tentativas esgotadas sem nenhuma execução');
}
