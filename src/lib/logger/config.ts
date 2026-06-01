/**
 * Configuração do módulo de logger.
 *
 * Lê variáveis de ambiente (VITE_LOGGER_*) com defaults sensatos.
 * Todas as funções são puras e podem ser chamadas a qualquer momento.
 */

import type { LogLevel, LoggerConfig } from './types';

// ---------------------------------------------------------------------------
// Config padrão
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  environment: import.meta.env.PROD ? 'production' : 'development',
  batchSize: 5,
  batchTimeout: 30_000,
  minLevel: import.meta.env.PROD ? 'warn' : 'debug',
  sendInDev: false,
  maxMessageLength: 500,
  maxStackTraceLength: 2000,
};

// ---------------------------------------------------------------------------
// Helpers para parsing de env vars
// ---------------------------------------------------------------------------

/** Faz parse de uma env var booleana ('true' → true, resto → false). */
function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === 'true';
}

/** Faz parse de uma env var numérica (retorna undefined se inválida). */
function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Faz parse de uma env var de nível de log (valida contra os valores aceitos). */
function parseLogLevel(value: string | undefined): LogLevel | undefined {
  if (value === undefined) return undefined;
  const valid: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
  if (valid.includes(value as LogLevel)) return value as LogLevel;
  return undefined;
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Retorna a config do logger mesclando defaults com env vars.
 *
 * Cada env var sobrescreve o default apenas se definida e válida.
 */
export function getLoggerConfig(): LoggerConfig {
  const env = import.meta.env;
  return {
    enabled: parseBoolean(env.VITE_LOGGER_ENABLED) ?? DEFAULT_CONFIG.enabled,
    environment: DEFAULT_CONFIG.environment,
    batchSize: parseNumber(env.VITE_LOGGER_BATCH_SIZE) ?? DEFAULT_CONFIG.batchSize,
    batchTimeout: parseNumber(env.VITE_LOGGER_BATCH_TIMEOUT) ?? DEFAULT_CONFIG.batchTimeout,
    minLevel: parseLogLevel(env.VITE_LOGGER_MIN_LEVEL) ?? DEFAULT_CONFIG.minLevel,
    sendInDev: parseBoolean(env.VITE_LOGGER_SEND_IN_DEV) ?? DEFAULT_CONFIG.sendInDev,
    maxMessageLength: DEFAULT_CONFIG.maxMessageLength,
    maxStackTraceLength: DEFAULT_CONFIG.maxStackTraceLength,
  };
}

/** Verifica se o logger está habilitado. */
export function isLoggerEnabled(): boolean {
  return getLoggerConfig().enabled;
}

/**
 * Determina se os logs devem ser enviados para o Firestore.
 *
 * Em produção: sempre (se habilitado).
 * Em desenvolvimento: apenas se `sendInDev` estiver ativo.
 */
export function shouldSendLogs(): boolean {
  const config = getLoggerConfig();
  if (!config.enabled) return false;
  if (config.environment === 'production') return true;
  return config.sendInDev;
}

/**
 * Indica se sanitização deve ser aplicada.
 *
 * Sempre ativa — proteção contra vazamento de dados sensíveis.
 */
export function shouldSanitize(): boolean {
  return true;
}

/** Verifica se o ambiente atual é desenvolvimento. */
export function isDevelopmentMode(): boolean {
  return getLoggerConfig().environment === 'development';
}
