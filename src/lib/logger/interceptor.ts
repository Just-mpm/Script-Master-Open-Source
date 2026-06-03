/**
 * Interceptor de erros globais.
 *
 * Captura erros não tratados via `window.onerror` e
 * `window.onunhandledrejection`, encaminhando-os ao BatchProcessor
 * para registro persistente no Firestore.
 */

import type { LogLevel, LogCategory, ErrorLogEntry } from './types';
import { shouldIgnoreError } from './filters';
import { shouldSendLogs, getLoggerConfig } from './config';
import { sanitizeMessage, sanitizeStackTrace } from './sanitization';
import { BatchProcessor } from './batch-processor';

// ---------------------------------------------------------------------------
// Estado interno
// ---------------------------------------------------------------------------

let intercepting = false;
let batchProcessor: BatchProcessor | null = null;

// Handlers originais para restauração
let originalOnError: ((...args: unknown[]) => boolean) | null = null;
let originalOnUnhandledRejection: ((ev: PromiseRejectionEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Garante uma instância única do BatchProcessor. */
function getProcessor(): BatchProcessor {
  if (!batchProcessor) {
    batchProcessor = new BatchProcessor();
  }
  return batchProcessor;
}

/**
 * Captura um erro e envia ao BatchProcessor.
 *
 * Chamada diretamente pelos handlers globais — NÃO usa o logger
 * para evitar loops infinitos (erro → logger → erro → ...).
 */
function captureError(
  level: LogLevel,
  context: string,
  message: string,
  error?: Error,
): void {
  if (!shouldSendLogs()) return;
  if (shouldIgnoreError(message)) return;
  if (error && shouldIgnoreError(error.message)) return;

  const config = getLoggerConfig();

  const sanitizedMessage = sanitizeMessage(message).slice(0, config.maxMessageLength);

  let stackTrace: string | undefined;
  if (error?.stack) {
    stackTrace = sanitizeStackTrace(error.stack).slice(0, config.maxStackTraceLength);
  }

  const entry: ErrorLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    level,
    category: inferCategoryFromContext(context),
    context,
    message: sanitizedMessage,
    userId: undefined, // preenchido pelo index.ts via setLoggerUserId
    sessionId: `interceptor_${Date.now().toString(36)}`,
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewport:
      typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : { width: 0, height: 0 },
    stackTrace,
    occurrenceCount: 1,
    environment: config.environment,
  };

  getProcessor().addToQueue(entry);
}

/** Infere a categoria do log a partir do contexto de origem. */
function inferCategoryFromContext(context: string): LogCategory {
  const ctx = context.toLowerCase();
  if (ctx.includes('auth') || ctx.includes('login')) return 'auth';
  if (ctx.includes('audio') || ctx.includes('tts')) return 'audio';
  if (ctx.includes('video') || ctx.includes('remotion')) return 'video';
  if (ctx.includes('genkit') || ctx.includes('assistant') || ctx.includes('ai')) return 'ai';
  if (ctx.includes('firestore') || ctx.includes('storage') || ctx.includes('indexeddb')) return 'storage';
  if (ctx.includes('credit') || ctx.includes('billing') || ctx.includes('stripe')) return 'billing';
  if (ctx.includes('analytics')) return 'analytics';
  if (ctx.includes('pwa') || ctx.includes('firebase') || ctx.includes('app-check')) return 'infrastructure';
  return 'system';
}

/** Extrai mensagem legível de um reason de Promise rejection. */
function extractMessageFromReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

// ---------------------------------------------------------------------------
// Handlers globais
// ---------------------------------------------------------------------------

/** Handler para `window.onerror`. */
function handleWindowError(
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error,
): boolean {
  const msg = typeof message === 'string' ? message : String(message);
  const context = source
    ? `window.onerror:${source}:${lineno ?? 0}:${colno ?? 0}`
    : 'window.onerror';
  captureError('error', context, msg, error);
  // Retorna false para permitir que o erro propague normalmente
  return false;
}

/** Handler para `window.onunhandledrejection`. */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const message = extractMessageFromReason(event.reason);
  captureError('error', 'unhandledrejection', message);
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Registra os interceptors globais de erro.
 *
 * Deve ser chamada uma vez na inicialização do app.
 * Salva handlers originais para possível restauração.
 */
export function startErrorInterception(): void {
  if (intercepting) return;
  if (typeof window === 'undefined') return;

  // Salva handlers originais
  originalOnError = window.onerror as ((...args: unknown[]) => boolean) | null;
  originalOnUnhandledRejection = window.onunhandledrejection;

  window.onerror = handleWindowError as OnErrorEventHandler;
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  intercepting = true;
}

/**
 * Remove os interceptors globais e restaura handlers originais.
 *
 * Útil para cleanup em ambientes de teste.
 */
export function stopErrorInterception(): void {
  if (!intercepting) return;
  if (typeof window === 'undefined') return;

  window.onerror = originalOnError as OnErrorEventHandler;
  window.onunhandledrejection = originalOnUnhandledRejection;
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  originalOnError = null;
  originalOnUnhandledRejection = null;

  intercepting = false;
}

/** Verifica se os interceptors estão ativos. */
export function isIntercepting(): boolean {
  return intercepting;
}
