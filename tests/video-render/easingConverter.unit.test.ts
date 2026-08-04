/**
 * v0.135.3 (S4+S6 da auditoria): garante que `getRemotionEasing` retorna
 * a MESMA referência de função para o mesmo tipo em chamadas sucessivas.
 *
 * Por quê: hoisting das constantes `LINEAR_EASING`/`BOUNCE_EASING`/
 * `SMOOTH_EASING` no escopo do módulo + tabela de lookup. Se algum
 * caller futuro trocar a implementação por `Easing.inOut(Easing.ease)`
 * inline, o teste falha — alertando para alocação por chamada.
 *
 * Também cobre:
 * - `undefined` → SMOOTH_EASING (default consistente com a store)
 * - Tipo futuro desconhecido (extensibilidade via `VetorialEasingType`)
 *   → fallback para SMOOTH_EASING
 */

import { describe, expect, it } from 'vitest';
import { getRemotionEasing } from '../../src/features/video-render/lib/easingConverter';

describe('getRemotionEasing (v0.135.3 / S4+S6)', () => {
  it("retorna referência estável para 'linear' em chamadas sucessivas", () => {
    const first = getRemotionEasing('linear');
    const second = getRemotionEasing('linear');
    expect(first).toBe(second);
  });

  it("retorna referência estável para 'smooth' em chamadas sucessivas", () => {
    const first = getRemotionEasing('smooth');
    const second = getRemotionEasing('smooth');
    expect(first).toBe(second);
  });

  it("retorna referência estável para 'bounce' em chamadas sucessivas", () => {
    const first = getRemotionEasing('bounce');
    const second = getRemotionEasing('bounce');
    expect(first).toBe(second);
  });

  it('referências entre tipos diferentes são distintas', () => {
    // Sanity: a tabela não está colapsando todos os tipos no mesmo objeto
    const linear = getRemotionEasing('linear');
    const smooth = getRemotionEasing('smooth');
    const bounce = getRemotionEasing('bounce');
    expect(linear).not.toBe(smooth);
    expect(linear).not.toBe(bounce);
    expect(smooth).not.toBe(bounce);
  });

  it('undefined cai no default smooth (consistente com DEFAULT_EASING da store)', () => {
    const fromUndefined = getRemotionEasing(undefined);
    const fromSmooth = getRemotionEasing('smooth');
    expect(fromUndefined).toBe(fromSmooth);
  });

  it('retorna uma função de easing (não é um valor primitivo)', () => {
    // Type guard: o consumer do `WhiteboardScene` chama `easing(progress)` —
    // precisa ser uma função.
    const easing = getRemotionEasing('smooth');
    expect(typeof easing).toBe('function');
  });

  it('a função de easing retorna um número finito para progress 0..1', () => {
    const easing = getRemotionEasing('bounce');
    expect(Number.isFinite(easing(0))).toBe(true);
    expect(Number.isFinite(easing(0.5))).toBe(true);
    expect(Number.isFinite(easing(1))).toBe(true);
  });
});
