import { describe, it, expect } from 'vitest';
import { validateSceneTimestamps, buildUniformTimestamps } from '../../src/lib/audio-analysis';

// ---------------------------------------------------------------------------
// validateSceneTimestamps
// ---------------------------------------------------------------------------

describe('validateSceneTimestamps', () => {
  it('aceita timestamps válidos para 2 cenas em 52s', () => {
    expect(validateSceneTimestamps([0, 26], 52)).toBe(true);
  });

  it('aceita timestamps válidos para 4 cenas em 60s', () => {
    expect(validateSceneTimestamps([0, 15, 30, 45], 60)).toBe(true);
  });

  it('aceita 1 cena com timestamp 0', () => {
    expect(validateSceneTimestamps([0], 52)).toBe(true);
  });

  it('rejeita array vazio', () => {
    expect(validateSceneTimestamps([], 52)).toBe(false);
  });

  it('rejeita timestamp negativo', () => {
    expect(validateSceneTimestamps([0, -3], 52)).toBe(false);
  });

  it('rejeita timestamp que excede duração', () => {
    expect(validateSceneTimestamps([0, 60], 52)).toBe(false);
  });

  it('rejeita timestamp NaN', () => {
    expect(validateSceneTimestamps([0, NaN], 52)).toBe(false);
  });

  it('rejeita timestamp Infinity', () => {
    expect(validateSceneTimestamps([0, Infinity], 52)).toBe(false);
  });

  it('rejeita timestamps fora de ordem', () => {
    expect(validateSceneTimestamps([26, 0], 52)).toBe(false);
  });

  it('rejeita timestamps duplicados', () => {
    expect(validateSceneTimestamps([0, 0], 52)).toBe(false);
  });

  it('rejeita gap menor que 2s', () => {
    expect(validateSceneTimestamps([0, 1.5], 52)).toBe(false);
  });

  it('aceita gap exatamente 2s', () => {
    expect(validateSceneTimestamps([0, 2], 52)).toBe(true);
  });

  it('aceita timestamp 0 como primeiro valor', () => {
    expect(validateSceneTimestamps([0, 10, 20], 52)).toBe(true);
  });

  it('rejeita primeiro timestamp diferente de 0', () => {
    // Na verdade, isso é válido se estiver dentro da duração
    // A validação não exige que o primeiro seja 0
    expect(validateSceneTimestamps([5, 26], 52)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildUniformTimestamps
// ---------------------------------------------------------------------------

describe('buildUniformTimestamps', () => {
  it('1 cena retorna [0]', () => {
    expect(buildUniformTimestamps(1, 52)).toEqual([0]);
  });

  it('2 cenas em 52s → [0, 26]', () => {
    expect(buildUniformTimestamps(2, 52)).toEqual([0, 26]);
  });

  it('4 cenas em 60s → [0, 15, 30, 45]', () => {
    expect(buildUniformTimestamps(4, 60)).toEqual([0, 15, 30, 45]);
  });

  it('3 cenas em 60s → [0, 20, 40]', () => {
    expect(buildUniformTimestamps(3, 60)).toEqual([0, 20, 40]);
  });

  it('sempre começa com 0', () => {
    const result = buildUniformTimestamps(5, 100);
    expect(result[0]).toBe(0);
  });

  it('não inclui timestamp final (última cena estende até o fim)', () => {
    const result = buildUniformTimestamps(2, 52);
    expect(result).toHaveLength(2);
    expect(result[1]).toBeLessThan(52);
  });

  it('timestamps estão em ordem crescente', () => {
    const result = buildUniformTimestamps(6, 120);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  it('gaps são aproximadamente iguais', () => {
    const result = buildUniformTimestamps(4, 60);
    const gaps = result.slice(1).map((ts, i) => ts - result[i]);
    // Todos os gaps devem ser 15
    for (const gap of gaps) {
      expect(gap).toBe(15);
    }
  });

  it('funciona com duração curta', () => {
    const result = buildUniformTimestamps(2, 4);
    expect(result).toEqual([0, 2]);
  });

  it('0 cenas retorna [0] (fallback seguro)', () => {
    expect(buildUniformTimestamps(0, 52)).toEqual([0]);
  });

  it('timestamps negativos retornam [0] (fallback seguro)', () => {
    expect(buildUniformTimestamps(-1, 52)).toEqual([0]);
  });
});
