import { describe, it, expect } from 'vitest';
import {
  checkEntitlement,
  getRemainingUsage,
  needsUpgrade,
  formatUsageLimit,
  formatUsageDisplay,
} from '../../src/features/billing/usageUtils';
import { PLANS, FREE_PLAN_LIMITS, PRO_PLAN_LIMITS, BUSINESS_PLAN_LIMITS, formatPrice } from '../../src/features/billing/plans';
import type { PlanLimits, UsageState, UsageResource } from '../../src/features/billing/types';

// ---------------------------------------------------------------------------
// checkEntitlement
// ---------------------------------------------------------------------------

describe('checkEntitlement', () => {
  it('permite uso quando currentUsage < limit', () => {
    const result = checkEntitlement('free', 'maxAudioGenerationsPerMonth', 5);

    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(5);
    expect(result.limit).toBe(FREE_PLAN_LIMITS.maxAudioGenerationsPerMonth);
    expect(result.upgradeRequired).toBeUndefined();
  });

  it('bloqueia uso quando currentUsage >= limit', () => {
    const limit = FREE_PLAN_LIMITS.maxAudioGenerationsPerMonth;
    const result = checkEntitlement('free', 'maxAudioGenerationsPerMonth', limit);

    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe('pro');
  });

  it('trata limite 0 como ilimitado (sempre permite)', () => {
    const result = checkEntitlement('business', 'maxAudioGenerationsPerMonth', 99999);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(0);
    expect(result.upgradeRequired).toBeUndefined();
  });

  it('permite boolean true (funcionalidade disponível)', () => {
    const result = checkEntitlement('pro', 'hasMultiSpeaker');

    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBeUndefined();
  });

  it('bloqueia boolean false e sugere upgrade', () => {
    const result = checkEntitlement('free', 'hasMultiSpeaker');

    expect(result.allowed).toBe(false);
    expect(result.currentUsage).toBe(0);
    expect(result.limit).toBe(0);
    expect(result.upgradeRequired).toBe('pro');
  });

  it('business não tem upgrade disponível', () => {
    // Business tem tudo = true, mas se testarmos com um cenário hipotético
    const result = checkEntitlement('business', 'hasMultiSpeaker');

    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBeUndefined();
  });

  it('uso exato no limite é bloqueado', () => {
    const result = checkEntitlement('free', 'maxImageGenerationsPerMonth', 10);

    expect(result.allowed).toBe(false);
  });

  it('uso acima do limite é bloqueado', () => {
    const result = checkEntitlement('free', 'maxImageGenerationsPerMonth', 15);

    expect(result.allowed).toBe(false);
  });

  it('currentUsage padrão é 0 quando não informado', () => {
    const result = checkEntitlement('free', 'maxAudioGenerationsPerMonth');

    expect(result.currentUsage).toBe(0);
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRemainingUsage
// ---------------------------------------------------------------------------

describe('getRemainingUsage', () => {
  const baseUsageState: UsageState = {
    planId: 'free',
    records: [
      { resource: 'audio_generations' as UsageResource, used: 7, limit: 10, resetDate: Date.now() + 86400000 },
      { resource: 'image_generations' as UsageResource, used: 10, limit: 10, resetDate: Date.now() + 86400000 },
      { resource: 'video_exports' as UsageResource, used: 0, limit: 3, resetDate: Date.now() + 86400000 },
    ],
    updatedAt: Date.now(),
  };

  it('retorna uso restante correto', () => {
    const remaining = getRemainingUsage(baseUsageState, 'audio_generations');
    expect(remaining).toBe(3);
  });

  it('retorna 0 quando uso está no limite', () => {
    const remaining = getRemainingUsage(baseUsageState, 'image_generations');
    expect(remaining).toBe(0);
  });

  it('retorna Infinity quando limite é 0 (ilimitado)', () => {
    const unlimitedState: UsageState = {
      ...baseUsageState,
      records: [
        { resource: 'audio_generations' as UsageResource, used: 100, limit: 0, resetDate: Date.now() + 86400000 },
      ],
    };

    const remaining = getRemainingUsage(unlimitedState, 'audio_generations');
    expect(remaining).toBe(Infinity);
  });

  it('retorna 0 como floor mínimo (nunca negativo)', () => {
    const overusedState: UsageState = {
      ...baseUsageState,
      records: [
        { resource: 'audio_generations' as UsageResource, used: 15, limit: 10, resetDate: Date.now() + 86400000 },
      ],
    };

    const remaining = getRemainingUsage(overusedState, 'audio_generations');
    expect(remaining).toBe(0);
  });

  it('retorna limite total quando não há registro do recurso', () => {
    const remaining = getRemainingUsage(baseUsageState, 'video_exports');
    expect(remaining).toBe(3);
  });

  it('retorna Infinity quando recurso não existe e plano é ilimitado', () => {
    const businessState: UsageState = {
      planId: 'business',
      records: [],
      updatedAt: Date.now(),
    };

    const remaining = getRemainingUsage(businessState, 'audio_generations');
    expect(remaining).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// needsUpgrade
// ---------------------------------------------------------------------------

describe('needsUpgrade', () => {
  it('retorna true para recurso booleano indisponível no plano', () => {
    expect(needsUpgrade('free', 'hasMultiSpeaker')).toBe(true);
    expect(needsUpgrade('free', 'hasEmotionalTTS')).toBe(true);
    expect(needsUpgrade('free', 'hasStockMedia')).toBe(true);
    expect(needsUpgrade('free', 'hasPriorityQueue')).toBe(true);
  });

  it('retorna false para recurso booleano disponível no plano', () => {
    expect(needsUpgrade('pro', 'hasMultiSpeaker')).toBe(false);
    expect(needsUpgrade('business', 'hasStockMedia')).toBe(false);
  });

  it('retorna false para recursos numéricos (não são booleanos)', () => {
    expect(needsUpgrade('free', 'maxAudioGenerationsPerMonth')).toBe(false);
    expect(needsUpgrade('free', 'maxProjectCount')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatUsageLimit
// ---------------------------------------------------------------------------

describe('formatUsageLimit', () => {
  it('formata "Ilimitado" quando valor é 0', () => {
    expect(formatUsageLimit(0)).toBe('Ilimitado');
  });

  it('formata número com separador de milhar', () => {
    expect(formatUsageLimit(10)).toBe('10');
    expect(formatUsageLimit(1000)).toBe('1.000');
    expect(formatUsageLimit(50000)).toBe('50.000');
  });
});

// ---------------------------------------------------------------------------
// formatUsageDisplay
// ---------------------------------------------------------------------------

describe('formatUsageDisplay', () => {
  it('formata "X de Y" normalmente', () => {
    expect(formatUsageDisplay(7, 10)).toBe('7 de 10');
    expect(formatUsageDisplay(0, 3)).toBe('0 de 3');
  });

  it('formata "X (ilimitado)" quando limite é 0', () => {
    expect(formatUsageDisplay(42, 0)).toBe('42 (ilimitado)');
    expect(formatUsageDisplay(0, 0)).toBe('0 (ilimitado)');
  });
});

// ---------------------------------------------------------------------------
// PLANS e limites
// ---------------------------------------------------------------------------

describe('PLANS', () => {
  it('possui exatamente 3 planos', () => {
    expect(Object.keys(PLANS)).toHaveLength(3);
  });

  it('free é gratuito', () => {
    expect(PLANS.free.price.monthly).toBe(0);
    expect(PLANS.free.price.yearly).toBe(0);
  });

  it('pro é mais caro que free', () => {
    expect(PLANS.pro.price.monthly).toBeGreaterThan(PLANS.free.price.monthly);
    expect(PLANS.pro.price.yearly).toBeGreaterThan(PLANS.free.price.yearly);
  });

  it('business é mais caro que pro', () => {
    expect(PLANS.business.price.monthly).toBeGreaterThan(PLANS.pro.price.monthly);
  });

  it('business tem limites 0 (ilimitados)', () => {
    expect(BUSINESS_PLAN_LIMITS.maxAudioGenerationsPerMonth).toBe(0);
    expect(BUSINESS_PLAN_LIMITS.maxImageGenerationsPerMonth).toBe(0);
    expect(BUSINESS_PLAN_LIMITS.maxVideoExportsPerMonth).toBe(0);
    expect(BUSINESS_PLAN_LIMITS.maxScriptChars).toBe(0);
    expect(BUSINESS_PLAN_LIMITS.maxStorageMB).toBe(0);
  });

  it('free não tem multi-speaker', () => {
    expect(FREE_PLAN_LIMITS.hasMultiSpeaker).toBe(false);
  });

  it('pro tem multi-speaker', () => {
    expect(PRO_PLAN_LIMITS.hasMultiSpeaker).toBe(true);
  });

  it('cada plano tem features não-vazias', () => {
    for (const planId of ['free', 'pro', 'business'] as const) {
      expect(PLANS[planId].features.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

describe('formatPrice', () => {
  it('formata preço em centavos para BRL', () => {
    expect(formatPrice(0)).toBe('R$\xa00,00');
    expect(formatPrice(4990)).toBe('R$\xa049,90');
    expect(formatPrice(14990)).toBe('R$\xa0149,90');
  });
});
