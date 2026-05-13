/**
 * Utilitários compartilhados entre os hooks de exportação de vídeo e speed paint.
 * Funções de diagnóstico e mapeamento de erros reutilizáveis.
 */

import { createLogger } from '../../../lib/logger';

// ---------------------------------------------------------------------------
// Logger contextualizado
// ---------------------------------------------------------------------------

/** Logger genérico para exportUtils — callers podem substituir pelo próprio em toUserFriendlyError */
const log = createLogger('exportUtils');

// ---------------------------------------------------------------------------
// Erro de cancelamento
// ---------------------------------------------------------------------------

/**
 * Verifica se o erro representa um cancelamento intencional do usuário.
 * O Remotion lança Error com "was cancelled" ao invés de DOMException AbortError.
 */
export function isCancellationError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.message.toLowerCase().includes('cancelled')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Mapeamento de erros para mensagens amigáveis
// ---------------------------------------------------------------------------

/**
 * Mapeia erros de renderização para mensagens amigáveis em pt-BR.
 * Não deve ser chamada para erros de cancelamento (usar isCancellationError antes).
 *
 * @param err - Erro original
 * @param logger - Logger opcional para manter contexto de origem (ex: createLogger('useVideoExporter'))
 */
export function toUserFriendlyError(err: unknown, logger?: ReturnType<typeof createLogger>): string {
  const ctx = logger ?? log;

  if (!(err instanceof Error)) {
    return 'Erro ao exportar vídeo. Tente novamente.';
  }

  const msg = err.message.toLowerCase();

  // Loga o erro real para diagnóstico
  ctx.error('Erro original na exportação', { error: err.message });

  if (msg.includes('webcodecs') || msg.includes('videoencoder') || msg.includes('not supported')) {
    return `Navegador não suporta exportação de vídeo: ${err.message}`;
  }

  return 'Erro ao exportar vídeo. Tente novamente.';
}