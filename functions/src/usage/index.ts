// ---------------------------------------------------------------------------
// Barrel export — domínio de créditos
// ---------------------------------------------------------------------------
//
// Reexporta todos os módulos do domínio de créditos para consumo
// pelos flows de IA e outras partes do backend.
// ---------------------------------------------------------------------------

export {
  getCurrentPeriodKey,
  getNextPeriodKey,
  getPeriodStart,
  getPeriodEnd,
  isNewPeriod,
} from './period.js';

export {
  MONTHLY_BASE_CREDITS,
  FEEDBACK_BONUS_CREDITS,
  type OperationType,
  type CreditCostParams,
  calculateCreditCost,
} from './credit-policy.js';

export {
  estimateCredits,
} from './credit-estimator.js';

export {
  type IdempotencyStatus,
  isRequestIdValid,
} from './idempotency.js';

export {
  type CreditEventStatus,
  type CreditEvent,
  type CreateCreditEventInput,
} from './credit-events.js';

export {
  type BetaAccess,
  type CreditMonth,
  type CreditAvailabilitySnapshot,
  type ReserveResult,
  type ConfirmResult,
  type BonusResult,
  getOrCreateBetaAccess,
  getCreditAvailabilitySnapshot,
  reserveCredits,
  confirmCredits,
  revertCredits,
  grantFeedbackBonus,
} from './credit-service.js';

export {
  buildAudioPreflightPlan,
  type CreditSnapshot,
} from './audio-preflight.js';

export {
  type AiRequestStatus,
  type AiRequestRecord,
  startAiRequest,
  requestAiCancellation,
  isAiCancellationRequested,
  throwIfAiCancellationRequested,
  finishAiRequest,
} from './ai-requests.js';
