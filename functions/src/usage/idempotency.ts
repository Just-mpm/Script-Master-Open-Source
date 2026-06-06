// ---------------------------------------------------------------------------
// Serviço de validação de requestId para idempotência
// ---------------------------------------------------------------------------
//
// Valida que um requestId tenha formato UUID v4 antes de ser usado pelos
// flows callable. A deduplicação persistente fica nos registros de request
// de IA quando necessário.
// ---------------------------------------------------------------------------

/** Status de idempotência retornado pela verificação */
export type IdempotencyStatus = 'new' | 'completed' | 'in_progress';

/** Regex para validar formato UUID v4 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Verifica se um requestId tem o formato UUID v4 válido.
 */
export function isRequestIdValid(requestId: string): boolean {
  return UUID_REGEX.test(requestId);
}
