// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type { PlanId, Plan, PlanLimits, UsageResource, UsageRecord, UsageState, EntitlementCheck } from './types';

// ---------------------------------------------------------------------------
// Planos e utilitários
// ---------------------------------------------------------------------------
export { PLANS, FREE_PLAN_LIMITS, PRO_PLAN_LIMITS, BUSINESS_PLAN_LIMITS, getUsageResourceKey, formatPrice } from './plans';
export { checkEntitlement, getRemainingUsage, needsUpgrade, formatUsageLimit, formatUsageDisplay } from './usageUtils';

// ---------------------------------------------------------------------------
// Store (Zustand)
// ---------------------------------------------------------------------------
export { useBillingStore, useIsFreePlan, useIsStripeAvailable, useHasActiveSubscription } from './store';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export { useBillingInit } from './hooks';

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------
export { PlanBadge, UsageIndicator, UpgradeDialog } from './components';
