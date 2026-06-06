// ---------------------------------------------------------------------------
// Barrel export — domínio de uso (requests + idempotência)
// ---------------------------------------------------------------------------
//
// Exporta apenas os módulos usados pelos flows de IA (BYOK).
// ---------------------------------------------------------------------------

export {
  type IdempotencyStatus,
  isRequestIdValid,
} from './idempotency.js';

export {
  type AiRequestStatus,
  type AiRequestRecord,
  startAiRequest,
  requestAiCancellation,
  isAiCancellationRequested,
  throwIfAiCancellationRequested,
  finishAiRequest,
} from './ai-requests.js';
