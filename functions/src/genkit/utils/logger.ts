// ---------------------------------------------------------------------------
// Logger estruturado para Cloud Functions
// ---------------------------------------------------------------------------
//
// Substitui console.log/error direto por logging estruturado com contexto.
// Em produção, o Cloud Logging do GCP captura JSON automaticamente.
//
// Uso:
//   import { createLogger } from './logger.js';
//   const log = createLogger('assistant');
//   log.info('Resposta gerada', { uid, chars: 1200 });
//   log.error('Erro na geração', { error: err.message });
// ---------------------------------------------------------------------------

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  severity: LogLevel;
  message: string;
  context: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, context: string, message: string, data?: Record<string, unknown>): string {
  const entry: LogEntry = {
    severity: level,
    message,
    context,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Cloud Logging reconhece JSON lines como structured logs
  return JSON.stringify(entry);
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(context: string): Logger {
  return {
    debug(message, data) {
      // Debug apenas em desenvolvimento
      if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log(formatEntry('debug', context, message, data));
      }
    },

    info(message, data) {
      console.log(formatEntry('info', context, message, data));
    },

    warn(message, data) {
      console.warn(formatEntry('warn', context, message, data));
    },

    error(message, data) {
      console.error(formatEntry('error', context, message, data));
    },
  };
}
