import type { PlanId, PlanLimits, UsageResource, UsageState, EntitlementCheck } from './types';
import { PLANS, getUsageResourceKey } from './plans';

// ---------------------------------------------------------------------------
// Entitlement — verificação de permissão
// ---------------------------------------------------------------------------

/**
 * Verifica se o plano atual permite usar um recurso.
 *
 * Para limites booleanos (hasMultiSpeaker, etc.), usa o valor direto.
 * Para limites numéricos, compara currentUsage < limit.
 * Limites com valor 0 são tratados como "ilimitado".
 */
export function checkEntitlement(
  planId: PlanId,
  resource: keyof PlanLimits,
  currentUsage: number = 0,
): EntitlementCheck {
  const plan = PLANS[planId];
  const rawLimit = plan.limits[resource];

  // Limites booleanos — verificação direta
  if (typeof rawLimit === 'boolean') {
    return {
      resource,
      allowed: rawLimit,
      currentUsage: 0,
      limit: 0,
      upgradeRequired: rawLimit ? undefined : getNextPlan(planId),
    };
  }

  // Limites numéricos — 0 significa ilimitado
  const isUnlimited = rawLimit === 0;
  const allowed = isUnlimited || currentUsage < rawLimit;

  return {
    resource,
    allowed,
    currentUsage,
    limit: rawLimit,
    upgradeRequired: allowed ? undefined : getNextPlan(planId),
  };
}

/**
 * Retorna o próximo plano acima na hierarquia, ou undefined se já é o mais alto.
 */
function getNextPlan(currentPlan: PlanId): PlanId | undefined {
  const hierarchy: readonly PlanId[] = ['free', 'pro', 'business'] as const;
  const currentIndex = hierarchy.indexOf(currentPlan);

  if (currentIndex >= hierarchy.length - 1) {
    return undefined;
  }

  return hierarchy[currentIndex + 1];
}

// ---------------------------------------------------------------------------
// Uso restante
// ---------------------------------------------------------------------------

/**
 * Calcula quanto de um recurso ainda pode ser usado.
 * Retorna Infinity se ilimitado.
 */
export function getRemainingUsage(
  usage: UsageState,
  resource: UsageResource,
): number {
  const record = usage.records.find((r) => r.resource === resource);

  if (!record) {
    // Sem registro = limite do plano não atingido
    const planLimit = getPlanLimitForResource(usage.planId, resource);
    // 0 = ilimitado
    return planLimit === 0 ? Infinity : planLimit;
  }

  if (record.limit === 0) {
    return Infinity;
  }

  return Math.max(0, record.limit - record.used);
}

// ---------------------------------------------------------------------------
// Verificação de upgrade
// ---------------------------------------------------------------------------

/**
 * Verifica se o plano atual requer upgrade para usar um recurso booleano.
 */
export function needsUpgrade(
  planId: PlanId,
  resource: keyof PlanLimits,
): boolean {
  const plan = PLANS[planId];
  const value = plan.limits[resource];

  if (typeof value === 'boolean') {
    return !value;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Utilitários de exibição
// ---------------------------------------------------------------------------

/**
 * Formata um valor de limite para exibição na UI.
 * 0 → "Ilimitado", senão o número formatado com separador de milhar.
 */
export function formatUsageLimit(value: number): string {
  if (value === 0) {
    return 'Ilimitado';
  }

  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Formata o uso como "X de Y" ou "X (ilimitado)".
 */
export function formatUsageDisplay(used: number, limit: number): string {
  if (limit === 0) {
    return `${new Intl.NumberFormat('pt-BR').format(used)} (ilimitado)`;
  }

  return `${new Intl.NumberFormat('pt-BR').format(used)} de ${new Intl.NumberFormat('pt-BR').format(limit)}`;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Obtém o limite numérico de um recurso a partir do plano.
 * Retorna 0 (ilimitado) se não encontrar correspondência.
 */
function getPlanLimitForResource(planId: PlanId, resource: UsageResource): number {
  const plan = PLANS[planId];
  const limitKeys: ReadonlyArray<keyof PlanLimits> = [
    'maxAudioGenerationsPerMonth',
    'maxImageGenerationsPerMonth',
    'maxVideoExportsPerMonth',
    'maxScriptChars',
    'maxStorageMB',
  ];

  for (const key of limitKeys) {
    if (getUsageResourceKey(key) === resource) {
      const value = plan.limits[key];
      return typeof value === 'number' ? value : 0;
    }
  }

  return 0;
}
