/**
 * Tipos compartilhados do módulo de logger.
 *
 * Define níveis de severidade, categorias, payloads e o documento
 * salvo no Firestore para rastreamento de erros.
 */

// ---------------------------------------------------------------------------
// Níveis de severidade
// ---------------------------------------------------------------------------

/** Níveis de severidade disponíveis no sistema de logging. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Categorias específicas do Script Master para classificação de logs. */
export type LogCategory =
  | 'auth'
  | 'ai'
  | 'audio'
  | 'video'
  | 'storage'
  | 'billing'
  | 'analytics'
  | 'infrastructure'
  | 'system';

/** Dados extras opcionais passados junto à mensagem de log. */
export type LogPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Interface pública do logger (COMPATÍVEL COM A API ATUAL)
// ---------------------------------------------------------------------------

/**
 * Interface pública do logger.
 *
 * Mantida idêntica à versão anterior para compatibilidade total com os 279+
 * arquivos que importam `createLogger` ou `logger`.
 */
export interface LoggerInstance {
  debug(message: string, payload?: LogPayload): void;
  info(message: string, payload?: LogPayload): void;
  warn(message: string, payload?: LogPayload): void;
  error(message: string, payload?: LogPayload): void;
}

// ---------------------------------------------------------------------------
// Documento Firestore
// ---------------------------------------------------------------------------

/** Estrutura do documento salvo na coleção `errorLogs` do Firestore. */
export interface ErrorLogEntry {
  id: string;
  /** Timestamp do cliente em milissegundos (Date.now()).
   *
   * Usamos Date.now() em vez de serverTimestamp() porque:
   * 1. Error logs não precisam de precisão de tempo do servidor
   * 2. Evita edge cases com o sentinela serverTimestamp() em regras
   *    `is timestamp` (interceptor enviava `null`, gerando permission-denied)
   * 3. Correlaciona diretamente com o horário local do usuário
   * 4. Mais barato de processar (sem ida ao servidor)
   */
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  context: string;
  message: string;
  payload?: Record<string, unknown>;
  userId?: string;
  sessionId: string;
  pageUrl: string;
  userAgent: string;
  viewport: { width: number; height: number };
  stackTrace?: string;
  occurrenceCount: number;
  environment: 'development' | 'production';
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/** Configuração do módulo de logger. */
export interface LoggerConfig {
  enabled: boolean;
  environment: 'development' | 'production';
  batchSize: number;
  batchTimeout: number;
  minLevel: LogLevel;
  sendInDev: boolean;
  maxMessageLength: number;
  maxStackTraceLength: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Prioridade numérica dos níveis de log.
 * Maior valor = mais severo. Usado para filtrar nível mínimo.
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

/** Verifica se um nível de log atende ao nível mínimo configurado. */
export function isLevelEnabled(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}
