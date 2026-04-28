import { describe, it, expect } from 'vitest';
import {
  getTemplateById,
  getTemplatesByCategory,
  groupTemplatesByCategory,
  getAllCategories,
  TEMPLATE_CATEGORY_LABELS,
} from '../../src/features/studio/utils/templateUtils';
import { SCRIPT_TEMPLATES } from '../../src/data/scriptTemplates';
import type { ScriptTemplate } from '../../src/data/scriptTemplates';

describe('templateUtils', () => {
  // ─── Catálogo ─────────────────────────────────────────────

  describe('SCRIPT_TEMPLATES', () => {
    it('deve ter pelo menos 8 templates', () => {
      expect(SCRIPT_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    });

    it('cada template deve ter campos obrigatórios preenchidos', () => {
      for (const template of SCRIPT_TEMPLATES) {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(template.icon).toBeTruthy();
        expect(template.patch).toBeDefined();
        expect(template.previewScript).toBeTruthy();
      }
    });

    it('cada template deve ter IDs únicos', () => {
      const ids = SCRIPT_TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('cada patch deve ter pelo menos pace ou audioProfile preenchidos', () => {
      for (const template of SCRIPT_TEMPLATES) {
        const { patch } = template;
        const hasEssentialFields = patch.pace || patch.audioProfile || patch.scene;
        expect(hasEssentialFields).toBeTruthy();
      }
    });

    it('patches não devem incluir roteiro vazio', () => {
      for (const template of SCRIPT_TEMPLATES) {
        // Templates não devem definir script no patch (preservam o roteiro do usuário)
        expect(template.patch.script).toBeUndefined();
      }
    });
  });

  // ─── getTemplateById ─────────────────────────────────────

  describe('getTemplateById', () => {
    it('deve retornar o template correto para ID válido', () => {
      const template = getTemplateById('youtube-tutorial');
      expect(template).toBeDefined();
      expect(template!.name).toBe('Tutorial');
      expect(template!.category).toBe('youtube');
    });

    it('deve retornar undefined para ID inexistente', () => {
      const template = getTemplateById('nao-existe');
      expect(template).toBeUndefined();
    });

    it('deve retornar undefined para string vazia', () => {
      const template = getTemplateById('');
      expect(template).toBeUndefined();
    });
  });

  // ─── getTemplatesByCategory ──────────────────────────────

  describe('getTemplatesByCategory', () => {
    it('deve retornar todos os templates sem filtro', () => {
      const result = getTemplatesByCategory();
      expect(result).toHaveLength(SCRIPT_TEMPLATES.length);
    });

    it('deve filtrar por categoria youtube', () => {
      const result = getTemplatesByCategory('youtube');
      expect(result.length).toBeGreaterThanOrEqual(1);
      for (const template of result) {
        expect(template.category).toBe('youtube');
      }
    });

    it('deve filtrar por categoria podcast', () => {
      const result = getTemplatesByCategory('podcast');
      expect(result.length).toBeGreaterThanOrEqual(1);
      for (const template of result) {
        expect(template.category).toBe('podcast');
      }
    });

    it('deve retornar array vazio para categoria sem templates', () => {
      // Como não controlamos todas as categorias, testamos com categoria inexistente
      const result = getTemplatesByCategory('inexistente' as ScriptTemplate['category']);
      expect(result).toHaveLength(0);
    });

    it('não deve mutar o array original', () => {
      const before = [...SCRIPT_TEMPLATES];
      getTemplatesByCategory('youtube');
      expect(SCRIPT_TEMPLATES).toEqual(before);
    });
  });

  // ─── groupTemplatesByCategory ────────────────────────────

  describe('groupTemplatesByCategory', () => {
    it('deve agrupar todos os templates corretamente', () => {
      const groups = groupTemplatesByCategory(SCRIPT_TEMPLATES);
      expect(groups.size).toBeGreaterThanOrEqual(3);

      // Total de templates agrupados deve ser igual ao total original
      const totalGrouped = Array.from(groups.values()).reduce(
        (sum, templates) => sum + templates.length,
        0,
      );
      expect(totalGrouped).toBe(SCRIPT_TEMPLATES.length);
    });

    it('cada grupo deve conter apenas templates da mesma categoria', () => {
      const groups = groupTemplatesByCategory(SCRIPT_TEMPLATES);
      for (const [category, templates] of groups) {
        for (const template of templates) {
          expect(template.category).toBe(category);
        }
      }
    });

    it('deve funcionar com array vazio', () => {
      const groups = groupTemplatesByCategory([]);
      expect(groups.size).toBe(0);
    });

    it('deve funcionar com array de um único template', () => {
      const single = [SCRIPT_TEMPLATES[0]];
      const groups = groupTemplatesByCategory(single);
      expect(groups.size).toBe(1);
      expect(groups.get(single[0].category)).toHaveLength(1);
    });
  });

  // ─── getAllCategories ────────────────────────────────────

  describe('getAllCategories', () => {
    it('deve retornar pelo menos 3 categorias', () => {
      const categories = getAllCategories();
      expect(categories.length).toBeGreaterThanOrEqual(3);
    });

    it('não deve ter categorias duplicadas', () => {
      const categories = getAllCategories();
      const unique = new Set(categories);
      expect(unique.size).toBe(categories.length);
    });

    it('todas as categorias devem ter label traduzido', () => {
      const categories = getAllCategories();
      for (const cat of categories) {
        expect(TEMPLATE_CATEGORY_LABELS[cat]).toBeTruthy();
      }
    });
  });

  // ─── TEMPLATE_CATEGORY_LABELS ───────────────────────────

  describe('TEMPLATE_CATEGORY_LABELS', () => {
    it('deve ter labels para todas as categorias esperadas', () => {
      const expectedCategories = [
        'youtube', 'podcast', 'educacao', 'marketing', 'storytelling', 'acessibilidade',
      ] as const;
      for (const cat of expectedCategories) {
        expect(TEMPLATE_CATEGORY_LABELS[cat]).toBeTruthy();
      }
    });

    it('labels devem ser strings não vazias', () => {
      for (const [cat, label] of Object.entries(TEMPLATE_CATEGORY_LABELS)) {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      }
    });
  });
});
