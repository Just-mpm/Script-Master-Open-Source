import { describe, it, expect } from 'vitest';
import { MAX_CHARS, CHUNK_LIMIT, VOICES, PACE_INSTRUCTIONS } from '../../src/lib/constants';

describe('constants', () => {
  it('MAX_CHARS deve ser 25000', () => {
    expect(MAX_CHARS).toBe(25000);
  });

  it('CHUNK_LIMIT deve ser 500', () => {
    expect(CHUNK_LIMIT).toBe(500);
  });

  it('CHUNK_LIMIT deve ser menor que MAX_CHARS', () => {
    expect(CHUNK_LIMIT).toBeLessThan(MAX_CHARS);
  });

  describe('VOICES', () => {
    it('deve ter vozes definidas', () => {
      expect(VOICES.length).toBeGreaterThan(0);
    });

    it('cada voz deve ter id, name e styleKey strings não vazios', () => {
      for (const voice of VOICES) {
        expect(typeof voice.id).toBe('string');
        expect(voice.id.length).toBeGreaterThan(0);
        expect(typeof voice.name).toBe('string');
        expect(voice.name.length).toBeGreaterThan(0);
        expect(typeof voice.styleKey).toBe('string');
        expect(voice.styleKey.length).toBeGreaterThan(0);
      }
    });

    it('todas as vozes devem ter id igual ao name', () => {
      for (const voice of VOICES) {
        expect(voice.id).toBe(voice.name);
      }
    });

    it('não deve ter vozes duplicadas (id único)', () => {
      const ids = VOICES.map((v) => v.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('a primeira voz deve ser Aoede', () => {
      expect(VOICES[0].id).toBe('Aoede');
    });
  });

  describe('PACE_INSTRUCTIONS', () => {
    it('deve conter 5 níveis de pace', () => {
      expect(Object.keys(PACE_INSTRUCTIONS)).toHaveLength(5);
    });

    it('deve conter very_slow, slow, normal, fast, very_fast', () => {
      expect(PACE_INSTRUCTIONS).toHaveProperty('very_slow');
      expect(PACE_INSTRUCTIONS).toHaveProperty('slow');
      expect(PACE_INSTRUCTIONS).toHaveProperty('normal');
      expect(PACE_INSTRUCTIONS).toHaveProperty('fast');
      expect(PACE_INSTRUCTIONS).toHaveProperty('very_fast');
    });

    it('o pace normal deve ter instrução vazia', () => {
      expect(PACE_INSTRUCTIONS['normal']).toBe('');
    });

    it('todos os paces exceto normal devem ter instruções não vazias', () => {
      for (const [key, value] of Object.entries(PACE_INSTRUCTIONS)) {
        if (key === 'normal') continue;
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('cada instrução deve ser string', () => {
      for (const value of Object.values(PACE_INSTRUCTIONS)) {
        expect(typeof value).toBe('string');
      }
    });
  });
});
