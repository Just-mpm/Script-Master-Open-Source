/**
 * Testes unitários dos dados de billing — plans, tipos, formatPrice, getUsageResourceKey.
 * Testa estrutura de dados e funções puras sem mocks.
 */

import { describe, it, expect } from 'vitest';
import {
  PLANS,
  FREE_PLAN_LIMITS,
  PRO_PLAN_LIMITS,
  BUSINESS_PLAN_LIMITS,
  getUsageResourceKey,
  formatPrice,
} from '../../src/features/billing/plans';
import type { PlanId, PlanLimits, UsageResource } from '../../src/features/billing/types';

// ---------------------------------------------------------------------------
// Estrutura dos planos
// ---------------------------------------------------------------------------

describe('PLANS — estrutura e consistência', () => {
  const planIds: PlanId[] = ['free', 'pro', 'business'];

  it('possui exatamente os 3 planos esperados', () => {
    expect(Object.keys(PLANS)).toEqual(['free', 'pro', 'business']);
  });

  it('cada plano tem todos os campos obrigatórios de Plan', () => {
    for (const id of planIds) {
      const plan = PLANS[id];
      expect(plan.id).toBe(id);
      expect(plan.name).toBeTruthy();
      expect(typeof plan.name).toBe('string');
      expect(plan.description).toBeTruthy();
      expect(typeof plan.description).toBe('string');
      expect(plan.price).toBeDefined();
      expect(typeof plan.price.monthly).toBe('number');
      expect(typeof plan.price.yearly).toBe('number');
      expect(plan.limits).toBeDefined();
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('features contém apenas strings não-vazias', () => {
    for (const id of planIds) {
      for (const feature of PLANS[id].features) {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      }
    }
  });

  it('preços anuais são menores que 12x o preço mensal (desconto anual)', () => {
    for (const id of planIds) {
      const { monthly, yearly } = PLANS[id].price;
      if (monthly > 0) {
        // Anual deve ter desconto em relação a 12 meses
        expect(yearly).toBeLessThan(monthly * 12);
      }
    }
  });

  it('hierarquia de preços: free < pro < business', () => {
    expect(PLANS.free.price.monthly).toBeLessThan(PLANS.pro.price.monthly);
    expect(PLANS.pro.price.monthly).toBeLessThan(PLANS.business.price.monthly);
    expect(PLANS.free.price.yearly).toBeLessThan(PLANS.pro.price.yearly);
    expect(PLANS.pro.price.yearly).toBeLessThan(PLANS.business.price.yearly);
  });

  it('todos os limites numéricos do free são > 0 exceto UNLIMITED convention', () => {
    const numericKeys: (keyof PlanLimits)[] = [
      'maxScriptChars',
      'maxAudioGenerationsPerMonth',
      'maxImageGenerationsPerMonth',
      'maxVideoExportsPerMonth',
      'maxProjectCount',
      'maxStorageMB',
    ];

    for (const key of numericKeys) {
      const value = FREE_PLAN_LIMITS[key];
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });

  it('business tem todos os booleanos true', () => {
    const booleanKeys: (keyof PlanLimits)[] = [
      'hasMultiSpeaker',
      'hasEmotionalTTS',
      'hasStockMedia',
      'hasPriorityQueue',
    ];

    for (const key of booleanKeys) {
      expect(BUSINESS_PLAN_LIMITS[key]).toBe(true);
    }
  });

  it('free tem todos os booleanos false', () => {
    const booleanKeys: (keyof PlanLimits)[] = [
      'hasMultiSpeaker',
      'hasEmotionalTTS',
      'hasStockMedia',
      'hasPriorityQueue',
    ];

    for (const key of booleanKeys) {
      expect(FREE_PLAN_LIMITS[key]).toBe(false);
    }
  });

  it('pro tem todos os booleanos true', () => {
    const booleanKeys: (keyof PlanLimits)[] = [
      'hasMultiSpeaker',
      'hasEmotionalTTS',
      'hasStockMedia',
      'hasPriorityQueue',
    ];

    for (const key of booleanKeys) {
      expect(PRO_PLAN_LIMITS[key]).toBe(true);
    }
  });

  it('pro tem limites maiores que free em todos os recursos numéricos', () => {
    const numericKeys: (keyof PlanLimits)[] = [
      'maxScriptChars',
      'maxAudioGenerationsPerMonth',
      'maxImageGenerationsPerMonth',
      'maxVideoExportsPerMonth',
      'maxProjectCount',
      'maxStorageMB',
    ];

    for (const key of numericKeys) {
      const proValue = PRO_PLAN_LIMITS[key] as number;
      const freeValue = FREE_PLAN_LIMITS[key] as number;
      expect(proValue).toBeGreaterThan(freeValue);
    }
  });

  it('business tem limites 0 (UNLIMITED) em todos os recursos numéricos', () => {
    const numericKeys: (keyof PlanLimits)[] = [
      'maxScriptChars',
      'maxAudioGenerationsPerMonth',
      'maxImageGenerationsPerMonth',
      'maxVideoExportsPerMonth',
      'maxProjectCount',
      'maxStorageMB',
    ];

    for (const key of numericKeys) {
      expect(BUSINESS_PLAN_LIMITS[key]).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getUsageResourceKey
// ---------------------------------------------------------------------------

describe('getUsageResourceKey', () => {
  it('mapeia recursos numéricos corretamente', () => {
    expect(getUsageResourceKey('maxScriptChars')).toBe('script_chars');
    expect(getUsageResourceKey('maxAudioGenerationsPerMonth')).toBe('audio_generations');
    expect(getUsageResourceKey('maxImageGenerationsPerMonth')).toBe('image_generations');
    expect(getUsageResourceKey('maxVideoExportsPerMonth')).toBe('video_exports');
    expect(getUsageResourceKey('maxStorageMB')).toBe('storage_mb');
  });

  it('retorna null para recursos booleanos', () => {
    expect(getUsageResourceKey('hasMultiSpeaker')).toBeNull();
    expect(getUsageResourceKey('hasEmotionalTTS')).toBeNull();
    expect(getUsageResourceKey('hasStockMedia')).toBeNull();
    expect(getUsageResourceKey('hasPriorityQueue')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

describe('formatPrice — formatação monetária BRL', () => {
  it('formata zero como R$ 0,00', () => {
    const result = formatPrice(0);
    expect(result).toContain('0,00');
  });

  it('formata preços em centavos para reais', () => {
    const result = formatPrice(4990);
    expect(result).toContain('49,90');
  });

  it('formata preço anual do business', () => {
    const result = formatPrice(149900);
    expect(result).toContain('1.499,00');
  });

  it('formata preço mensal do pro', () => {
    const result = formatPrice(4990);
    expect(result).toContain('R$');
  });

  it('todos os preços dos planos formatam sem erro', () => {
    for (const id of ['free', 'pro', 'business'] as PlanId[]) {
      const plan = PLANS[id];
      expect(() => formatPrice(plan.price.monthly)).not.toThrow();
      expect(() => formatPrice(plan.price.yearly)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// PLANS — dados de features
// ---------------------------------------------------------------------------

describe('PLANS — features', () => {
  it('free menciona funcionalidades principais', () => {
    const features = PLANS.free.features.join(' ');
    // Verifica keywords relevantes (case-insensitive via regex para evitar problemas de encoding)
    expect(features.toLowerCase()).toContain('tts');
    expect(features.toLowerCase()).toContain('imagens');
    expect(features.toLowerCase()).toContain('vídeo');
  });

  it('pro menciona multi-speaker', () => {
    const features = PLANS.pro.features.join(' ').toLowerCase();
    expect(features).toContain('multi-speaker');
  });

  it('business menciona limites ilimitados', () => {
    const features = PLANS.business.features.join(' ').toLowerCase();
    expect(features).toContain('ilimitad');
  });

  it('pro menciona "Tudo do plano Gratuito"', () => {
    const features = PLANS.pro.features.join(' ');
    expect(features).toContain('Gratuito');
  });

  it('business menciona "Tudo do plano Pro"', () => {
    const features = PLANS.business.features.join(' ');
    expect(features).toContain('Pro');
  });
});
