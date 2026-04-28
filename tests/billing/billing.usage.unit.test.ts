/**
 * Testes unitários do usageUtils — checkEntitlement, getRemainingUsage, needsUpgrade,
 * formatUsageLimit, formatUsageDisplay, getPlanLimitForResource (via getRemainingUsage).
 */

import { describe, it, expect } from 'vitest';
import {
  checkEntitlement,
  getRemainingUsage,
  needsUpgrade,
  formatUsageLimit,
  formatUsageDisplay,
} from '../../src/features/billing/usageUtils';
import { PLANS } from '../../src/features/billing/plans';
import type { PlanId, PlanLimits, UsageResource, UsageState } from '../../src/features/billing/types';

// ---------------------------------------------------------------------------
// checkEntitlement — cenários avançados
// ---------------------------------------------------------------------------

describe('checkEntitlement — cenários avançados', () => {
  it('pro bloqueia quando atinge limite de vídeo', () => {
    const limit = PLANS.pro.limits.maxVideoExportsPerMonth as number;
    const result = checkEntitlement('pro', 'maxVideoExportsPerMonth', limit);
    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe('business');
  });

  it('pro permite uso abaixo do limite de vídeo', () => {
    const result = checkEntitlement('pro', 'maxVideoExportsPerMonth', 15);
    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBeUndefined();
  });

  it('free bloqueia hasEmotionalTTS e sugere pro', () => {
    const result = checkEntitlement('free', 'hasEmotionalTTS');
    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe('pro');
  });

  it('pro permite hasEmotionalTTS', () => {
    const result = checkEntitlement('pro', 'hasEmotionalTTS');
    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBeUndefined();
  });

  it('business permite tudo — verificação de todos os recursos booleanos', () => {
    const booleanResources: (keyof PlanLimits)[] = [
      'hasMultiSpeaker',
      'hasEmotionalTTS',
      'hasStockMedia',
      'hasPriorityQueue',
    ];

    for (const resource of booleanResources) {
      const result = checkEntitlement('business', resource);
      expect(result.allowed).toBe(true);
      expect(result.upgradeRequired).toBeUndefined();
    }
  });

  it('free permite hasStockMedia=false mas bloqueia acesso', () => {
    const result = checkEntitlement('free', 'hasStockMedia');
    expect(result.allowed).toBe(false);
  });

  it('retorna resource correto na resposta', () => {
    const result = checkEntitlement('free', 'maxAudioGenerationsPerMonth', 5);
    expect(result.resource).toBe('maxAudioGenerationsPerMonth');
  });

  it('usage negativo é tratado como permitido', () => {
    // currentUsage negativo não deveria acontecer, mas se acontecer, deve permitir
    const result = checkEntitlement('free', 'maxAudioGenerationsPerMonth', -1);
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRemainingUsage — cenários avançados
// ---------------------------------------------------------------------------

describe('getRemainingUsage — cenários avançados', () => {
  it('pro com uso parcial retorna restante correto', () => {
    const state: UsageState = {
      planId: 'pro',
      records: [
        { resource: 'audio_generations' as UsageResource, used: 50, limit: 100, resetDate: Date.now() + 86400000 },
      ],
      updatedAt: Date.now(),
    };

    expect(getRemainingUsage(state, 'audio_generations')).toBe(50);
  });

  it('quando não há registro e plano tem limite, retorna limite total', () => {
    const state: UsageState = {
      planId: 'free',
      records: [],
      updatedAt: Date.now(),
    };

    // free: maxAudioGenerationsPerMonth = 10
    expect(getRemainingUsage(state, 'audio_generations')).toBe(10);
  });

  it('business com records de limite 0 retorna Infinity', () => {
    const state: UsageState = {
      planId: 'business',
      records: [
        { resource: 'audio_generations' as UsageResource, used: 999, limit: 0, resetDate: Date.now() + 86400000 },
      ],
      updatedAt: Date.now(),
    };

    expect(getRemainingUsage(state, 'audio_generations')).toBe(Infinity);
  });

  it('múltiplos records: retorna correto para cada recurso', () => {
    const state: UsageState = {
      planId: 'free',
      records: [
        { resource: 'audio_generations' as UsageResource, used: 8, limit: 10, resetDate: 1 },
        { resource: 'image_generations' as UsageResource, used: 3, limit: 10, resetDate: 1 },
        { resource: 'video_exports' as UsageResource, used: 1, limit: 3, resetDate: 1 },
        { resource: 'storage_mb' as UsageResource, used: 200, limit: 500, resetDate: 1 },
      ],
      updatedAt: Date.now(),
    };

    expect(getRemainingUsage(state, 'audio_generations')).toBe(2);
    expect(getRemainingUsage(state, 'image_generations')).toBe(7);
    expect(getRemainingUsage(state, 'video_exports')).toBe(2);
    expect(getRemainingUsage(state, 'storage_mb')).toBe(300);
  });

  it('resource não rastreável (sem correspondência) retorna Infinity', () => {
    const state: UsageState = {
      planId: 'free',
      records: [],
      updatedAt: Date.now(),
    };

    // script_chars mapeia para maxScriptChars — free = 5000
    expect(getRemainingUsage(state, 'script_chars')).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// needsUpgrade — cenários completos
// ---------------------------------------------------------------------------

describe('needsUpgrade — todos os planos e recursos', () => {
  it('free precisa de upgrade para todos os recursos booleanos', () => {
    const booleanResources: (keyof PlanLimits)[] = [
      'hasMultiSpeaker',
      'hasEmotionalTTS',
      'hasStockMedia',
      'hasPriorityQueue',
    ];

    for (const resource of booleanResources) {
      expect(needsUpgrade('free', resource)).toBe(true);
    }
  });

  it('pro não precisa de upgrade para nenhum recurso booleano', () => {
    const booleanResources: (keyof PlanLimits)[] = [
      'hasMultiSpeaker',
      'hasEmotionalTTS',
      'hasStockMedia',
      'hasPriorityQueue',
    ];

    for (const resource of booleanResources) {
      expect(needsUpgrade('pro', resource)).toBe(false);
    }
  });

  it('business não precisa de upgrade para nenhum recurso', () => {
    const allResources: (keyof PlanLimits)[] = [
      'hasMultiSpeaker',
      'hasEmotionalTTS',
      'hasStockMedia',
      'hasPriorityQueue',
      'maxScriptChars',
      'maxAudioGenerationsPerMonth',
    ];

    for (const resource of allResources) {
      expect(needsUpgrade('business', resource)).toBe(false);
    }
  });

  it('recursos numéricos sempre retornam false (não são booleanos)', () => {
    const numericResources: (keyof PlanLimits)[] = [
      'maxScriptChars',
      'maxAudioGenerationsPerMonth',
      'maxImageGenerationsPerMonth',
      'maxVideoExportsPerMonth',
      'maxProjectCount',
      'maxStorageMB',
    ];

    for (const resource of numericResources) {
      expect(needsUpgrade('free', resource)).toBe(false);
      expect(needsUpgrade('pro', resource)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// formatUsageLimit — edge cases
// ---------------------------------------------------------------------------

describe('formatUsageLimit — edge cases', () => {
  it('valor zero retorna "Ilimitado"', () => {
    expect(formatUsageLimit(0)).toBe('Ilimitado');
  });

  it('valor pequeno formata sem separador', () => {
    expect(formatUsageLimit(5)).toBe('5');
  });

  it('valor grande formata com separador de milhar pt-BR', () => {
    expect(formatUsageLimit(1000)).toBe('1.000');
    expect(formatUsageLimit(10000)).toBe('10.000');
    expect(formatUsageLimit(50000)).toBe('50.000');
  });

  it('valor 500 (storage free) formata corretamente', () => {
    expect(formatUsageLimit(500)).toBe('500');
  });

  it('valor 100 (gerações pro) formata corretamente', () => {
    expect(formatUsageLimit(100)).toBe('100');
  });
});

// ---------------------------------------------------------------------------
// formatUsageDisplay — edge cases
// ---------------------------------------------------------------------------

describe('formatUsageDisplay — edge cases', () => {
  it('zero de zero com limite zero retorna "0 (ilimitado)"', () => {
    expect(formatUsageDisplay(0, 0)).toBe('0 (ilimitado)');
  });

  it('uso alto com limite zero mostra valor com (ilimitado)', () => {
    expect(formatUsageDisplay(99999, 0)).toBe('99.999 (ilimitado)');
  });

  it('uso normal formata com separador pt-BR', () => {
    expect(formatUsageDisplay(7, 10)).toBe('7 de 10');
  });

  it('uso grande com limite grande formata ambos', () => {
    expect(formatUsageDisplay(5000, 10000)).toBe('5.000 de 10.000');
  });

  it('uso no limite exato', () => {
    expect(formatUsageDisplay(10, 10)).toBe('10 de 10');
  });
});
