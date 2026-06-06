/**
 * Módulo de logger centralizado do Script Master.
 *
 * Ponto de entrada que reexporta a API pública e mantém compatibilidade
 * total com a interface anterior (`createLogger` e `logger`).
 *
 * Novas funcionalidades:
 * - Envio de logs (warn/error) para Firestore em batch
 * - Interceptação de erros globais (window.onerror, unhandledrejection)
 * - Sanitização automática de dados sensíveis
 * - Filtros de mensagens irrelevantes
 */

export type {
  LogLevel,
  LogCategory,
  LogPayload,
  LoggerInstance,
  ErrorLogEntry,
  LoggerConfig,
} from './types';

export { LOG_LEVEL_PRIORITY, isLevelEnabled } from './types';
export {
  getLoggerConfig,
  isLoggerEnabled,
  shouldSendLogs,
  shouldSanitize,
  isDevelopmentMode,
} from './config';
export {
  sanitizeMessage,
  sanitizeStackTrace,
  sanitizePayload,
  sanitizeUrl,
} from './sanitization';
export { shouldIgnoreError, shouldIgnoreErrorObject } from './filters';
export { startErrorInterception, stopErrorInterception } from './interceptor';

import type {
  LogLevel,
  LogPayload,
  LoggerInstance,
  ErrorLogEntry,
  LogCategory,
} from './types';
import { getLoggerConfig, shouldSendLogs, shouldSanitize } from './config';
import { sanitizeMessage, sanitizeStackTrace, sanitizePayload } from './sanitization';
import { shouldIgnoreError } from './filters';
import { emitToConsole } from './console';
import { BatchProcessor } from './batch-processor';
import { startErrorInterception } from './interceptor';

// ---------------------------------------------------------------------------
// Singleton do BatchProcessor
// ---------------------------------------------------------------------------

let batchProcessor: BatchProcessor | null = null;

function getBatchProcessor(): BatchProcessor {
  if (!batchProcessor) {
    batchProcessor = new BatchProcessor();
  }
  return batchProcessor;
}

// ---------------------------------------------------------------------------
// Estado da sessão
// ---------------------------------------------------------------------------

/** ID da sessão atual — gerado uma vez por carregamento de página. */
const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** ID do usuário autenticado — atualizado quando auth muda. */
let currentUserId: string | undefined;

/** Atualiza o userId associado aos logs (chamado pelo AuthContext). */
export function setLoggerUserId(userId: string | undefined): void {
  currentUserId = userId;
}

// ---------------------------------------------------------------------------
// Envio para batch
// ---------------------------------------------------------------------------

/**
 * Envia um log para o BatchProcessor (Firestore).
 *
 * Apenas níveis warn, error e fatal são enviados.
 * Debug e info ficam restritos ao console.
 */
function sendToBatch(
  level: LogLevel,
  context: string,
  message: string,
  payload?: LogPayload,
): void {
  if (!shouldSendLogs()) return;
  // Só envia warn, error e fatal para o Firestore
  if (level === 'debug' || level === 'info') return;

  const config = getLoggerConfig();

  // Sanitiza mensagem
  const sanitizedMessage = shouldSanitize()
    ? sanitizeMessage(message).slice(0, config.maxMessageLength)
    : message.slice(0, config.maxMessageLength);

  // Sanitiza payload
  const sanitizedPayload =
    payload && shouldSanitize() ? sanitizePayload(payload) : payload;

  // Categoriza baseado no contexto (nome do módulo)
  const category = inferCategory(context);

  // Stack trace para erros (captura no ponto de emissão)
  let stackTrace: string | undefined;
  if (level === 'error' || level === 'fatal') {
    const stack = new Error().stack;
    if (stack) {
      stackTrace = shouldSanitize()
        ? sanitizeStackTrace(stack).slice(0, config.maxStackTraceLength)
        : stack.slice(0, config.maxStackTraceLength);
    }
  }

  const entry: ErrorLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    level,
    category,
    context,
    message: sanitizedMessage,
    payload: sanitizedPayload,
    userId: currentUserId,
    sessionId,
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

  getBatchProcessor().addToQueue(entry);
}

// ---------------------------------------------------------------------------
// Inferência de categoria
// ---------------------------------------------------------------------------

/** Infere a categoria do log a partir do contexto (nome do módulo). */
function inferCategory(context: string): LogCategory {
  const ctx = context.toLowerCase();
  if (ctx.includes('auth') || ctx.includes('login') || ctx.includes('onboarding'))
    return 'auth';
  if (ctx.includes('audio') || ctx.includes('tts')) return 'audio';
  if (ctx.includes('video') || ctx.includes('remotion') || ctx.includes('speed-paint'))
    return 'video';
  if (ctx.includes('genkit') || ctx.includes('assistant') || ctx.includes('ai'))
    return 'ai';
  if (
    ctx.includes('firestore') ||
    ctx.includes('storage') ||
    ctx.includes('indexeddb') ||
    ctx.includes('db')
  )
    return 'storage';
  if (ctx.includes('analytics')) return 'analytics';
  if (ctx.includes('pwa') || ctx.includes('firebase') || ctx.includes('app-check'))
    return 'infrastructure';
  return 'system';
}

// ---------------------------------------------------------------------------
// Emit principal
// ---------------------------------------------------------------------------

/**
 * Função central de emissão de logs.
 *
 * 1. Verifica filtro de mensagens irrelevantes
 * 2. Emite no console (respeitando nível do ambiente)
 * 3. Envia para o BatchProcessor (warn/error/fatal apenas)
 */
function emit(
  level: LogLevel,
  context: string,
  message: string,
  payload?: LogPayload,
): void {
  // Verifica filtro antes de qualquer processamento
  if (shouldIgnoreError(message)) return;

  // Console sempre (respeitando nível)
  emitToConsole(level, context, message, payload);

  // Batch para Firestore (warn/error/fatal)
  sendToBatch(level, context, message, payload);
}

// ---------------------------------------------------------------------------
// API pública (COMPATÍVEL COM A ANTERIOR)
// ---------------------------------------------------------------------------

/**
 * Cria uma instância de logger com contexto pré-fixado.
 *
 * Ideal para uso em módulos específicos — evita repetir o prefixo manualmente.
 *
 * @param context - Nome do módulo/origem (ex: "useAudioGenerator", "Migração").
 * @returns Instância de `LoggerInstance` com o contexto fixado.
 */
export function createLogger(context: string): LoggerInstance {
  return {
    debug(message: string, payload?: LogPayload) {
      emit('debug', context, message, payload);
    },
    info(message: string, payload?: LogPayload) {
      emit('info', context, message, payload);
    },
    warn(message: string, payload?: LogPayload) {
      emit('warn', context, message, payload);
    },
    error(message: string, payload?: LogPayload) {
      emit('error', context, message, payload);
    },
  };
}

/** Logger genérico sem contexto específico — uso pontual e rápido. */
export const logger: LoggerInstance = createLogger('app');

// ---------------------------------------------------------------------------
// Inicialização e flush
// ---------------------------------------------------------------------------

/**
 * Inicializa o sistema de error tracking.
 *
 * Registra interceptors globais e listener de beforeunload para flush.
 * Deve ser chamada uma vez na inicialização do app.
 */
export function initErrorTracking(): void {
  startErrorInterception();
  // Flush ao sair da página (garante que logs pendentes sejam enviados)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      getBatchProcessor().flush();
    });
  }
}

/** Força o envio de todos os logs pendentes. */
export async function flushLogs(): Promise<void> {
  await getBatchProcessor().flush();
}
