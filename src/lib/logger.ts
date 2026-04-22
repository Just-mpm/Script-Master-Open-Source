/**
 * Logger centralizado para o Script-Master.
 *
 * Em desenvolvimento, todos os níveis são exibidos.
 * Em produção (`import.meta.env.PROD`), `debug` e `info` são suprimidos.
 *
 * Uso:
 * ```ts
 * import { logger } from '@/lib/logger';
 * logger.info('Projeto salvo', { id: 'abc' });
 *
 * import { createLogger } from '@/lib/logger';
 * const log = createLogger('useAudioGenerator');
 * log.warn('Timeout excedido');
 * ```
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Níveis de severidade do logger, ordenados do mais para o menos severo. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Dados extras opcionais passados junto à mensagem. */
export type LogPayload = Record<string, unknown>;

/** Interface pública do logger. */
export interface LoggerInstance {
  debug(message: string, payload?: LogPayload): void;
  info(message: string, payload?: LogPayload): void;
  warn(message: string, payload?: LogPayload): void;
  error(message: string, payload?: LogPayload): void;
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const IS_PROD = import.meta.env.PROD;

/**
 * Ordem de severidade — níveis com valor numérico menor são mais severos.
 * Em produção, só exibe níveis >= `warn` (índice 2).
 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const satisfies Record<LogLevel, number>;

/** Menor nível permitido no ambiente atual. */
const MIN_LEVEL: LogLevel = IS_PROD ? 'warn' : 'debug';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Verifica se o nível deve ser exibido com base no ambiente. */
function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

/** Retorna o método nativo do console correspondente ao nível. */
function getConsoleMethod(level: LogLevel): (...args: Parameters<typeof console.log>) => void {
  switch (level) {
    case 'error':
      return console.error;
    case 'warn':
      return console.warn;
    case 'info':
      return console.info;
    case 'debug':
      return console.debug;
  }
}

/**
 * Formata e emite uma mensagem de log.
 *
 * @param level    - Nível de severidade.
 * @param context  - Prefixo de origem (ex: "[useAudioGenerator]").
 * @param message  - Texto principal do log.
 * @param payload  - Objeto extra opcional exibido junto à mensagem.
 */
function emit(level: LogLevel, context: string, message: string, payload?: LogPayload): void {
  if (!shouldLog(level)) return;

  const prefix = `[${context}]`;
  const method = getConsoleMethod(level);

  if (payload !== undefined) {
    method(prefix, message, payload);
  } else {
    method(prefix, message);
  }

  // Preserva stack trace em erros para facilitar debugging
  if (level === 'error' && IS_PROD) {
    const stack = new Error().stack;
    if (stack) {
      console.trace(`[stack] ${prefix} ${message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
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
    debug(message: string, payload?: LogPayload): void {
      emit('debug', context, message, payload);
    },
    info(message: string, payload?: LogPayload): void {
      emit('info', context, message, payload);
    },
    warn(message: string, payload?: LogPayload): void {
      emit('warn', context, message, payload);
    },
    error(message: string, payload?: LogPayload): void {
      emit('error', context, message, payload);
    },
  } as const satisfies LoggerInstance;
}

// ---------------------------------------------------------------------------
// Instância padrão (genérica)
// ---------------------------------------------------------------------------

/** Logger genérico sem contexto específico — uso pontual e rápido. */
export const logger: LoggerInstance = createLogger('app');
