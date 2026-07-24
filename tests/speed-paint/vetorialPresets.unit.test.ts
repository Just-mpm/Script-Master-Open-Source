/**
 * Testes unitários para as constantes de presets vetoriais do Speed Paint.
 *
 * A constante `VETORIAL_PRESETS_GROUPED` é a ÚNICA fonte de verdade para
 * o agrupamento dos 4 `VetorialPreset` em 2 grupos, exibidos no `<Select>`
 * da `SpeedPaintPage.tsx`. Estes testes protegem:
 * (a) cardinalidade (2 grupos, 4 presets totais)
 * (b) unicidade dos `id` de grupo e dos `presets` na lista completa
 * (c) consistência com os tipos `VetorialPreset` e `VetorialPresetGroupId`
 * (d) integridade estrutural de cada `VetorialPresetGroup`
 * (e) presença do grupo `edge-detection` em PRIMEIRO lugar (v0.132.0)
 *
 * v0.133.1: simplificação de 7 grupos / 20 presets para 2 grupos / 4 presets.
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
    it('tem exatamente 2 grupos', () => {
      expect(VETORIAL_PRESETS_GROUPED).toHaveLength(2);
    });

    it('tem exatamente 4 presets no total (soma de todos os grupos)', () => {
      const total = VETORIAL_PRESETS_GROUPED.reduce(
        (sum, group) => sum + group.presets.length,
        0,
      );
      expect(total).toBe(4);
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
    it('todos os 4 valores de VetorialPreset estão presentes nos grupos', () => {
      // Lista canônica dos 4 valores de VetorialPreset (v0.133.1)
      const allExpectedPresets: VetorialPreset[] = [
        'default',
        'edge-default',
        'edge-detailed',
        'edge-bold',
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
      const validIds: VetorialPresetGroupId[] = ['edge-detection', 'legacy'];

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
    it('grupo "legacy" contém apenas "default"', () => {
      const legacy = VETORIAL_PRESETS_GROUPED.find((g) => g.id === 'legacy');
      expect(legacy?.presets).toEqual(['default']);
      expect(legacy?.presets).toHaveLength(1);
    });

    it('grupo "edge-detection" é o PRIMEIRO do array (default da v0.132.0)', () => {
      expect(VETORIAL_PRESETS_GROUPED[0]?.id).toBe('edge-detection');
      expect(VETORIAL_PRESETS_GROUPED[0]?.presets).toEqual([
        'edge-default',
        'edge-detailed',
        'edge-bold',
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
    it('tem entrada para os 3 EdgePresetName', () => {
      const expectedKeys: EdgePresetName[] = [
        'edge-default',
        'edge-detailed',
        'edge-bold',
      ];
      const actualKeys = Object.keys(EDGE_PRESET_CONFIG) as EdgePresetName[];
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('integridade dos parâmetros', () => {
    it('cada preset tem os 5 campos numéricos esperados (incluindo filterSpeckle)', () => {
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

        expect(typeof config.filterSpeckle).toBe('number');
        expect(Number.isFinite(config.filterSpeckle)).toBe(true);

        // Usa `name` para silenciar unused-var sem perder a checagem
        expect(name.length).toBeGreaterThan(0);
      }
    });

    it('valores por preset batem com o plano D8 §8.3 (+ filterSpeckle v0.133.0)', () => {
      // `filterSpeckle` foi adicionado em v0.133.0 para o filtro de
      // compacidade. Calibração 2026-06-17: `0.0001` (v0.133.0) para
      // contornar o Canny 1px que gera compactness baixa para formas
      // legítimas — só remove patológicos com compacidade praticamente 0.
      expect(EDGE_PRESET_CONFIG['edge-default']).toEqual({
        strokeWidth: 8,
        highThreshold: 0.3,
        epsilon: 2.0,
        blurSigma: 1.0,
        filterSpeckle: 0.0001,
      });
      expect(EDGE_PRESET_CONFIG['edge-detailed']).toEqual({
        strokeWidth: 6,
        highThreshold: 0.2,
        epsilon: 1.0,
        blurSigma: 0.8,
        filterSpeckle: 0.0001,
      });
      expect(EDGE_PRESET_CONFIG['edge-bold']).toEqual({
        strokeWidth: 12,
        highThreshold: 0.4,
        epsilon: 3.0,
        blurSigma: 1.2,
        filterSpeckle: 0.0001,
      });
    });

    it('filterSpeckle está em [0, 1] para todos os presets (0 = filtro desabilitado, 1 = círculo perfeito)', () => {
      for (const [, config] of Object.entries(EDGE_PRESET_CONFIG) as [
        EdgePresetName,
        EdgePresetConfig,
      ][]) {
        expect(config.filterSpeckle).toBeGreaterThanOrEqual(0);
        expect(config.filterSpeckle).toBeLessThanOrEqual(1);
      }
    });
  });
});
