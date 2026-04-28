/**
 * Seletor inline de templates — botão trigger para o Inspector.
 *
 * Renderiza um botão compacto que, ao ser clicado, abre a galeria de templates.
 * O estado do dialog de preview é gerenciado pelo componente pai (Inspector).
 */

import React from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import AutoFixHigh from '@mui/icons-material/AutoFixHigh';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import type { ScriptTemplate } from '../../../data/scriptTemplates';
import { useLocale } from '../../../features/i18n';
import { TemplateGallery } from './TemplateGallery';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
import { useStudioStore } from '../store';
import { glassPanelSx, insetPanelSx } from '../../../theme/surfaces';
import { ICON_SIZE_MD, GAP_COMPACT, GAP_DEFAULT } from '../../../theme/tokens';
import { createLogger } from '../../../lib/logger';

const log = createLogger('TemplateSelector');

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function TemplateSelector() {
  const theme = useTheme();
  const { t } = useLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ScriptTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSelectTemplate = (template: ScriptTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    log.info('Aplicando template', { id: selectedTemplate.id, name: selectedTemplate.name });
    useStudioStore.getState().applySettings(selectedTemplate.patch);
    setIsPreviewOpen(false);
    setSelectedTemplate(null);
    setIsOpen(false);
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <>
      <Paper elevation={0} sx={glassPanelSx}>
        <ButtonBase
          component="button"
          type="button"
          data-template-selector-trigger
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-controls="template-selector-section"
          sx={{
            width: '100%',
            px: { xs: 2.5, md: 3 },
            py: 2,
            textAlign: 'left',
            borderRadius: { xs: 3, md: 4 },
            transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            },
          }}
        >
          <Stack direction="row" sx={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack spacing={GAP_COMPACT}>
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                <AutoFixHigh sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }} aria-hidden="true" />
                <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                  {t('studio.templates.title')}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {t('studio.templates.description')}
              </Typography>
            </Stack>

            {isOpen ? <ExpandLess sx={{ fontSize: ICON_SIZE_MD }} /> : <ExpandMore sx={{ fontSize: ICON_SIZE_MD }} />}
          </Stack>
        </ButtonBase>

        <Collapse in={isOpen} timeout="auto" id="template-selector-section">
          <Stack spacing={2} sx={{ px: { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 } }}>
            <Paper
              elevation={0}
              sx={(currentTheme): SystemStyleObject<typeof currentTheme> => ({
                ...insetPanelSx(currentTheme),
                p: 2,
              })}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {t('studio.templates.selectHint')}
              </Typography>
              <TemplateGallery
                onSelect={handleSelectTemplate}
                selectedId={selectedTemplate?.id}
              />
            </Paper>
          </Stack>
        </Collapse>
      </Paper>

      <TemplatePreviewDialog
        template={selectedTemplate}
        open={isPreviewOpen}
        onClose={handlePreviewClose}
        onApply={handleApplyTemplate}
      />
    </>
  );
}
