/**
 * Logger de console — extraído do logger.ts original.
 *
 * Em desenvolvimento, todos os níveis são exibidos.
 * Em produção, `debug` e `info` são suprimidos.
 */

import type { LogLevel, LogPayload } from './types';

// ---------------------------------------------------------------------------
// Configuração de console
// ---------------------------------------------------------------------------

const IS_PROD = import.meta.env.PROD;

/**
 * Prioridade numérica para o console.
 * Menor valor = mais severo. Usa <= para filtrar.
 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  fatal: -1,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

/** Nível mínimo para exibição no console (baseado no ambiente). */
const MIN_LEVEL: LogLevel = IS_PROD ? 'warn' : 'debug';

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Verifica se o nível deve ser exibido no console. */
function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[MIN_LEVEL];
}

/** Retorna o método nativo do console correspondente ao nível. */
function getConsoleMethod(
  level: LogLevel,
): (...args: Parameters<typeof console.log>) => void {
  switch (level) {
    case 'error':
    case 'fatal':
      return console.error;
    case 'warn':
      return console.warn;
    case 'info':
      return console.info;
    case 'debug':
      return console.debug;
  }
}

// ---------------------------------------------------------------------------
// Função pública
// ---------------------------------------------------------------------------

/**
 * Emite uma mensagem formatada no console.
 *
 * Formato: `[context] message` ou `[context] message {payload}`.
 * Respeita o nível mínimo configurado para o ambiente.
 */
export function emitToConsole(
  level: LogLevel,
  context: string,
  message: string,
  payload?: LogPayload,
): void {
  if (!shouldLog(level)) return;

  const prefix = `[${context}]`;
  const method = getConsoleMethod(level);

  if (payload !== undefined) {
    method(prefix, message, payload);
  } else {
    method(prefix, message);
  }
}
