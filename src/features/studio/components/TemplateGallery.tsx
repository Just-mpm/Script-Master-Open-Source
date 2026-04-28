/**
 * Galeria/grid de templates com filtro por categoria.
 *
 * Renderiza um grid responsivo (1→2→3 colunas) com chips de filtro.
 */

import React, { useState, useMemo } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { TemplateCategory, ScriptTemplate } from '../../../data/scriptTemplates';
import { SCRIPT_TEMPLATES } from '../../../data/scriptTemplates';
import { useLocale } from '../../../features/i18n';
import { TEMPLATE_CATEGORY_LABELS, getAllCategories } from '../utils/templateUtils';
import { TemplateCard } from './TemplateCard';
import { GAP_DEFAULT, GAP_MEDIUM } from '../../../theme/tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplateGalleryProps {
  onSelect: (template: ScriptTemplate) => void;
  /** Template atualmente selecionado (destaque visual) */
  selectedId?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function TemplateGallery({ onSelect, selectedId }: TemplateGalleryProps) {
  const { t } = useLocale();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | undefined>(undefined);

  const categories = useMemo(() => getAllCategories(), []);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === undefined) {
      return SCRIPT_TEMPLATES;
    }
    return SCRIPT_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const handleCategoryClick = (category: TemplateCategory | undefined) => {
    setActiveCategory((prev) => (prev === category ? undefined : category));
  };

  return (
    <Stack spacing={GAP_MEDIUM}>
      {/* Filtros por categoria */}
      <Stack
        direction="row"
        spacing={GAP_DEFAULT}
        sx={{
          flexWrap: 'wrap',
          gap: 1,
        }}
        role="tablist"
        aria-label={t('studio.templates.filterAriaLabel')}
      >
        <Chip
          label={t('studio.templates.allFilter')}
          size="small"
          variant={activeCategory === undefined ? 'filled' : 'outlined'}
          color={activeCategory === undefined ? 'primary' : 'default'}
          onClick={() => handleCategoryClick(undefined)}
          role="tab"
          aria-selected={activeCategory === undefined}
          sx={{
            fontWeight: activeCategory === undefined ? 600 : 400,
          }}
        />
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={TEMPLATE_CATEGORY_LABELS[cat]}
            size="small"
            variant={activeCategory === cat ? 'filled' : 'outlined'}
            color={activeCategory === cat ? 'primary' : 'default'}
            onClick={() => handleCategoryClick(cat)}
            role="tab"
            aria-selected={activeCategory === cat}
            sx={{
              fontWeight: activeCategory === cat ? 600 : 400,
            }}
          />
        ))}
      </Stack>

      {/* Grid de templates */}
      {filteredTemplates.length > 0 ? (
        <Grid container spacing={1.5}>
          {filteredTemplates.map((template) => (
            <Grid key={template.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <TemplateCard
                template={template}
                selected={template.id === selectedId}
                onSelect={onSelect}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t('studio.templates.emptyCategory')}
        </Typography>
      )}
    </Stack>
  );
}
