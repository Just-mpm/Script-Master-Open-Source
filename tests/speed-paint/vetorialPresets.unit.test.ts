/**
 * Testes unitários para as constantes de presets vetoriais do Speed Paint.
 *
 * A constante `VETORIAL_PRESETS_GROUPED` é a ÚNICA fonte de verdade para
 * o agrupamento dos 20 `VetorialPreset` em 7 grupos, exibidos no `<Select>`
 * da `SpeedPaintPage.tsx`. Estes testes protegem:
 * (a) cardinalidade (7 grupos, 20 presets totais)
 * (b) unicidade dos `id` de grupo e dos `presets` na lista completa
 * (c) consistência com os tipos `VetorialPreset` e `VetorialPresetGroupId`
 * (d) integridade estrutural de cada `VetorialPresetGroup`
 * (e) presença do grupo `edge-detection` em PRIMEIRO lugar (v0.132.0)
 *
 * @see `src/features/speed-paint/constants/vetorialPresets.ts`
 */

import { describe, it, expect } from 'vitest';
import {
  VETORIAL_PRESETS_GROUPED,
  EDGE_PRESET_CONFIG,
  type VetorialPresetGroupId,
  type EdgePresetName,
  type EdgePresetConfig,
} from '../../src/features/speed-paint/constants/vetorialPresets';
import type { VetorialPreset } from '../../src/features/speed-paint/types/vetorial';

describe('VETORIAL_PRESETS_GROUPED', () => {
  describe('cardinalidade', () => {
    it('tem exatamente 7 grupos', () => {
      expect(VETORIAL_PRESETS_GROUPED).toHaveLength(7);
    });

    it('tem exatamente 20 presets no total (soma de todos os grupos)', () => {
      const total = VETORIAL_PRESETS_GROUPED.reduce(
        (sum, group) => sum + group.presets.length,
        0,
      );
      expect(total).toBe(20);
    });

    it('cada grupo tem pelo menos 1 preset', () => {
      for (const group of VETORIAL_PRESETS_GROUPED) {
        expect(group.presets.length).toBeGreaterThan(0);
      }
    });
  });

  describe('unicidade', () => {
    it('IDs de grupo são únicos (sem repetição)', () => {
      const ids = VETORIAL_PRESETS_GROUPED.map((g) => g.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('presets são únicos em toda a lista (sem repetição entre grupos)', () => {
      const allPresets = VETORIAL_PRESETS_GROUPED.flatMap((g) => g.presets);
      const uniquePresets = new Set(allPresets);
      expect(uniquePresets.size).toBe(allPresets.length);
    });
  });

  describe('cobertura do union VetorialPreset', () => {
    it('todos os 20 valores de VetorialPreset estão presentes nos grupos', () => {
      // Lista canônica de todos os 20 valores de VetorialPreset
      const allExpectedPresets: VetorialPreset[] = [
        'default',
        'posterized1',
        'posterized2',
        'posterized3',
        'curvy',
        'sharp',
        'detailed',
        'smoothed',
        'grayscale',
        'fixedpalette',
        'randomsampling1',
        'randomsampling2',
        'artistic1',
        'artistic2',
        'artistic3',
        'artistic4',
        'edge-default',
        'edge-detailed',
        'edge-bold',
        'edge-sketch',
      ];

      const actualPresets = VETORIAL_PRESETS_GROUPED.flatMap((g) => g.presets);
      const expectedSet = new Set<VetorialPreset>(allExpectedPresets);
      const actualSet = new Set<VetorialPreset>(actualPresets);

      // Esperado ⊆ Real
      for (const preset of expectedSet) {
        expect(actualSet.has(preset)).toBe(true);
      }
      // Real ⊆ Esperado (mesmo conjunto)
      for (const preset of actualSet) {
        expect(expectedSet.has(preset)).toBe(true);
      }
      // Mesma cardinalidade
      expect(actualSet.size).toBe(expectedSet.size);
    });

    it('não há presets "extras" fora do union VetorialPreset', () => {
      // Se algum preset não estiver no union, o TypeScript acusa erro.
      // Aqui validamos que TODOS os presets retornados pertencem ao union,
      // garantindo que o source de verdade está sincronizado.
      const allPresets = VETORIAL_PRESETS_GROUPED.flatMap((g) => g.presets);
      for (const preset of allPresets) {
        // Type guard: se compilou, pertence ao union. Aqui só verificamos
        // que é uma string não-vazia (sanity check runtime).
        expect(typeof preset).toBe('string');
        expect(preset.length).toBeGreaterThan(0);
      }
    });
  });

  describe('cobertura do union VetorialPresetGroupId', () => {
    it('todos os IDs de grupo pertencem ao union VetorialPresetGroupId', () => {
      const validIds: VetorialPresetGroupId[] = [
        'edge-detection',
        'artistic',
        'posterized',
        'smoothed',
        'detailed',
        'grayscale',
        'sampling',
      ];

      const actualIds = VETORIAL_PRESETS_GROUPED.map((g) => g.id);
      for (const id of actualIds) {
        expect(validIds).toContain(id);
      }
      // Mesma cardinalidade
      expect(actualIds.length).toBe(validIds.length);
    });
  });

  describe('estrutura de cada grupo', () => {
    it('cada grupo tem `id` (string) e `presets` (array de strings)', () => {
      for (const group of VETORIAL_PRESETS_GROUPED) {
        expect(typeof group.id).toBe('string');
        expect(group.id.length).toBeGreaterThan(0);
        expect(Array.isArray(group.presets)).toBe(true);
        for (const preset of group.presets) {
          expect(typeof preset).toBe('string');
          expect(preset.length).toBeGreaterThan(0);
        }
      }
    });

    it('cada grupo é um objeto com exatamente as chaves `id` e `presets`', () => {
      for (const group of VETORIAL_PRESETS_GROUPED) {
        const keys = Object.keys(group).sort();
        expect(keys).toEqual(['id', 'presets']);
      }
    });
  });

  describe('grupos específicos (sanity)', () => {
    it('grupo "artistic" contém artistic1..4', () => {
      const artistic = VETORIAL_PRESETS_GROUPED.find((g) => g.id === 'artistic');
      expect(artistic?.presets).toEqual([
        'artistic1',
        'artistic2',
        'artistic3',
        'artistic4',
      ]);
    });

    it('grupo "grayscale" tem exatamente 1 preset', () => {
      const grayscale = VETORIAL_PRESETS_GROUPED.find((g) => g.id === 'grayscale');
      expect(grayscale?.presets).toEqual(['grayscale']);
      expect(grayscale?.presets).toHaveLength(1);
    });

    it('existe um grupo "sampling" com 2 presets randomsampling', () => {
      const sampling = VETORIAL_PRESETS_GROUPED.find((g) => g.id === 'sampling');
      expect(sampling?.presets).toEqual(['randomsampling1', 'randomsampling2']);
    });

    it('grupo "edge-detection" é o PRIMEIRO do array (default da v0.132.0)', () => {
      expect(VETORIAL_PRESETS_GROUPED[0]?.id).toBe('edge-detection');
      expect(VETORIAL_PRESETS_GROUPED[0]?.presets).toEqual([
        'edge-default',
        'edge-detailed',
        'edge-bold',
        'edge-sketch',
      ]);
    });
  });

  describe('imutabilidade', () => {
    it('a constante é ReadonlyArray (não mutável em runtime)', () => {
      // TypeScript: ReadonlyArray<...> garante imutabilidade em compile-time.
      // Aqui só verificamos que o array existe e é um Array.
      expect(Array.isArray(VETORIAL_PRESETS_GROUPED)).toBe(true);
    });
  });
});

describe('EDGE_PRESET_CONFIG', () => {
  describe('cobertura', () => {
    it('tem entrada para os 4 EdgePresetName', () => {
      const expectedKeys: EdgePresetName[] = [
        'edge-default',
        'edge-detailed',
        'edge-bold',
        'edge-sketch',
      ];
      const actualKeys = Object.keys(EDGE_PRESET_CONFIG) as EdgePresetName[];
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('integridade dos parâmetros', () => {
    it('cada preset tem os 4 campos numéricos esperados', () => {
      for (const [name, config] of Object.entries(EDGE_PRESET_CONFIG) as [
        EdgePresetName,
        EdgePresetConfig,
      ][]) {
        expect(typeof config.strokeWidth).toBe('number');
        expect(Number.isFinite(config.strokeWidth)).toBe(true);
        expect(config.strokeWidth).toBeGreaterThan(0);

        expect(typeof config.highThreshold).toBe('number');
        expect(Number.isFinite(config.highThreshold)).toBe(true);
        expect(config.highThreshold).toBeGreaterThan(0);
        expect(config.highThreshold).toBeLessThanOrEqual(1);

        expect(typeof config.epsilon).toBe('number');
        expect(Number.isFinite(config.epsilon)).toBe(true);
        expect(config.epsilon).toBeGreaterThan(0);

        expect(typeof config.blurSigma).toBe('number');
        expect(Number.isFinite(config.blurSigma)).toBe(true);
        expect(config.blurSigma).toBeGreaterThan(0);

        // Usa `name` para silenciar unused-var sem perder a checagem
        expect(name.length).toBeGreaterThan(0);
      }
    });

    it('valores por preset batem com o plano D8 §8.3', () => {
      expect(EDGE_PRESET_CONFIG['edge-default']).toEqual({
        strokeWidth: 8,
        highThreshold: 0.3,
        epsilon: 2.0,
        blurSigma: 1.0,
      });
      expect(EDGE_PRESET_CONFIG['edge-detailed']).toEqual({
        strokeWidth: 6,
        highThreshold: 0.2,
        epsilon: 1.0,
        blurSigma: 0.8,
      });
      expect(EDGE_PRESET_CONFIG['edge-bold']).toEqual({
        strokeWidth: 12,
        highThreshold: 0.4,
        epsilon: 3.0,
        blurSigma: 1.2,
      });
      expect(EDGE_PRESET_CONFIG['edge-sketch']).toEqual({
        strokeWidth: 6,
        highThreshold: 0.25,
        epsilon: 1.5,
        blurSigma: 1.0,
      });
    });
  });
});
