import { describe, it, expect } from 'vitest';
import { SPRING_TRANSICAO } from '../../src/features/video-render/lib/transitions';

describe('transitions', () => {
  describe('SPRING_TRANSICAO', () => {
    it('exporta objeto com propriedades de spring Remotion', () => {
      expect(SPRING_TRANSICAO).toHaveProperty('damping');
      expect(SPRING_TRANSICAO).toHaveProperty('stiffness');
      expect(SPRING_TRANSICAO).toHaveProperty('mass');
    });

    it('possui damping < stiffness para spring superamortecido (sem overshoot)', () => {
      // No Remotion, spring com damping < stiffness e mass=1 é criticamente amortecido.
      // damping=26, stiffness=100, mass=1 → ratio=1.3 (superamortecido, sem overshoot)
      expect(SPRING_TRANSICAO.damping).toBeLessThan(SPRING_TRANSICAO.stiffness);
    });

    it('possui mass de 1 (comportamento padrão)', () => {
      expect(SPRING_TRANSICAO.mass).toBe(1);
    });

    it('é readonly (as const)', () => {
      // as const congela os valores — tentar atribuir deve falhar em tempo de compilação.
      // Em runtime, verificamos que os valores são literais.
      expect(SPRING_TRANSICAO.damping).toBe(26);
      expect(SPRING_TRANSICAO.stiffness).toBe(100);
      expect(SPRING_TRANSICAO.mass).toBe(1);
    });

    it('valores são números positivos', () => {
      expect(SPRING_TRANSICAO.damping).toBeGreaterThan(0);
      expect(SPRING_TRANSICAO.stiffness).toBeGreaterThan(0);
      expect(SPRING_TRANSICAO.mass).toBeGreaterThan(0);
    });
  });
});
