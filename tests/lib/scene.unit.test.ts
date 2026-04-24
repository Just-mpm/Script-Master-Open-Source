import { describe, it, expect } from 'vitest';
import { resolveActiveScene } from '../../src/lib/scene';

describe('scene', () => {
  describe('resolveActiveScene', () => {
    const scenes = [
      { timestamp: 0, label: 'cena-0' },
      { timestamp: 5.5, label: 'cena-1' },
      { timestamp: 12.0, label: 'cena-2' },
      { timestamp: 20.0, label: 'cena-3' },
    ];

    it('retorna null para array vazio', () => {
      expect(resolveActiveScene([], 0)).toBeNull();
    });

    it('retorna a primeira cena quando currentTime = 0', () => {
      const result = resolveActiveScene(scenes, 0);
      expect(result).toBe(scenes[0]);
    });

    it('retorna a primeira cena quando currentTime está antes da segunda cena', () => {
      const result = resolveActiveScene(scenes, 3);
      expect(result).toBe(scenes[0]);
    });

    it('retorna a cena correta para timestamp entre duas cenas', () => {
      const result = resolveActiveScene(scenes, 8);
      expect(result).toBe(scenes[1]);
    });

    it('retorna a última cena quando currentTime está no exato timestamp', () => {
      const result = resolveActiveScene(scenes, 20);
      expect(result).toBe(scenes[3]);
    });

    it('retorna a última cena quando currentTime está além do último timestamp', () => {
      const result = resolveActiveScene(scenes, 100);
      expect(result).toBe(scenes[3]);
    });

    it('funciona com array de uma única cena', () => {
      const singleScene = [{ timestamp: 5, label: 'única' }];
      expect(resolveActiveScene(singleScene, 0)).toBe(singleScene[0]);
      expect(resolveActiveScene(singleScene, 5)).toBe(singleScene[0]);
      expect(resolveActiveScene(singleScene, 999)).toBe(singleScene[0]);
    });

    it('funciona com tipo genérico que estende { timestamp: number }', () => {
      interface ExtendedScene {
        timestamp: number;
        title: string;
        duration: number;
      }

      const extendedScenes: ExtendedScene[] = [
        { timestamp: 0, title: 'Intro', duration: 10 },
        { timestamp: 10, title: 'Desenvolvimento', duration: 20 },
      ];

      const result = resolveActiveScene(extendedScenes, 5);
      expect(result?.title).toBe('Intro');
    });

    it('retorna a cena exata no limite inferior do intervalo', () => {
      const result = resolveActiveScene(scenes, 5.5);
      expect(result).toBe(scenes[1]);
    });

    it('retorna a cena anterior quando currentTime está um microssegundo antes da próxima', () => {
      const result = resolveActiveScene(scenes, 4.999);
      expect(result).toBe(scenes[0]);
    });
  });
});
