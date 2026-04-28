/**
 * Utilitários para o catálogo de templates do estúdio.
 *
 * Funções puras de busca, filtro e agrupamento — sem efeitos colaterais.
 */

import type { TemplateCategory, ScriptTemplate } from '../../../data/scriptTemplates';
import { SCRIPT_TEMPLATES } from '../../../data/scriptTemplates';

// ---------------------------------------------------------------------------
// Labels traduzidos das categorias
// ---------------------------------------------------------------------------

export const TEMPLATE_CATEGORY_LABELS: Readonly<Record<TemplateCategory, string>> = {
  youtube: 'YouTube',
  podcast: 'Podcast',
  educacao: 'Educação',
  marketing: 'Marketing',
  storytelling: 'Storytelling',
  acessibilidade: 'Acessibilidade',
} as const;

// ---------------------------------------------------------------------------
// Funções de consulta
// ---------------------------------------------------------------------------

/** Busca template pelo ID. Retorna `undefined` se não encontrado. */
export function getTemplateById(id: string): ScriptTemplate | undefined {
  return SCRIPT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Filtra templates por categoria.
 * Se `category` for `undefined`, retorna todos os templates.
 */
export function getTemplatesByCategory(category?: TemplateCategory): ScriptTemplate[] {
  if (category === undefined) {
    return [...SCRIPT_TEMPLATES];
  }
  return SCRIPT_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Agrupa templates por categoria.
 * Retorna um `Map` preservando a ordem de inserção (ordem de declaração).
 */
export function groupTemplatesByCategory(
  templates: readonly ScriptTemplate[],
): Map<TemplateCategory, ScriptTemplate[]> {
  const groups = new Map<TemplateCategory, ScriptTemplate[]>();
  for (const template of templates) {
    const existing = groups.get(template.category);
    if (existing) {
      existing.push(template);
    } else {
      groups.set(template.category, [template]);
    }
  }
  return groups;
}

/** Lista todas as categorias presentes no catálogo (sem duplicatas). */
export function getAllCategories(): TemplateCategory[] {
  const seen = new Set<TemplateCategory>();
  for (const template of SCRIPT_TEMPLATES) {
    seen.add(template.category);
  }
  return [...seen];
}
