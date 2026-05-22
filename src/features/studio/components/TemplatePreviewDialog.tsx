/**
 * Dialog de preview do template — mostra detalhes e confirma aplicação.
 *
 * Segue o padrão do DataMigrationDialog: Dialog + DialogTitle + DialogContent + DialogActions.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import AutoFixHigh from '@mui/icons-material/AutoFixHigh';
import Close from '@mui/icons-material/Close';
import type { ScriptTemplate } from '../../../data/scriptTemplates';
import { useLocale } from '../../../features/i18n';
import { TEMPLATE_CATEGORY_LABELS } from '../utils/templateUtils';
import { GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, RADIUS_SM } from '../../../theme/tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplatePreviewDialogProps {
  template: ScriptTemplate | null;
  open: boolean;
  onClose: () => void;
  onApply: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function TemplatePreviewDialog({
  template,
  open,
  onClose,
  onApply,
}: TemplatePreviewDialogProps) {
  const theme = useTheme();
  const { t } = useLocale();

  /** Mapeia chaves do patch para labels legíveis */
  const patchLabels: Record<string, string> = {
    pace: t('studio.templates.patchLabels.pace'),
    audioProfile: t('studio.templates.patchLabels.audioProfile'),
    scene: t('studio.templates.patchLabels.scene'),
    styleNotes: t('studio.templates.patchLabels.styleNotes'),
    isMultiSpeaker: t('studio.templates.patchLabels.isMultiSpeaker'),
    speakerAName: t('studio.templates.patchLabels.speakerAName'),
    speakerBName: t('studio.templates.patchLabels.speakerBName'),
    speakerBVoice: t('studio.templates.patchLabels.speakerBVoice'),
    selectedVoice: t('studio.templates.patchLabels.selectedVoice'),
    generateScenes: t('studio.templates.patchLabels.generateScenes'),
    sceneRatio: t('studio.templates.patchLabels.sceneRatio'),
    sceneDensity: t('studio.templates.patchLabels.sceneDensity'),
    visualFramework: t('studio.templates.patchLabels.visualFramework'),
    script: t('studio.templates.patchLabels.script'),
  };

  const paceLabels: Record<string, string> = {
    very_slow: t('studio.inspector.paceOptions.very_slow'),
    slow: t('studio.inspector.paceOptions.slow'),
    normal: t('studio.inspector.paceOptions.normal'),
    fast: t('studio.inspector.paceOptions.fast'),
    very_fast: t('studio.inspector.paceOptions.very_fast'),
  };

  function formatPatchValue(key: string, value: unknown): string {
    if (typeof value === 'boolean') return value ? t('studio.templates.booleanYes') : t('studio.templates.booleanNo');
    if (typeof value === 'number') {
      if (key === 'sceneDensity') return t('studio.templates.sceneDensityValue', { value });
      return String(value);
    }
    if (key === 'pace' && typeof value === 'string') {
      return paceLabels[value] ?? value;
    }
    return String(value);
  }

  if (!template) {
    return null;
  }

  const patchEntries = Object.entries(template.patch).filter(
    ([, value]) => value !== undefined && value !== '',
  );

  const handleApply = () => {
    onApply();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: (t): SystemStyleObject<typeof t> => ({
            backgroundColor: alpha(t.palette.background.paper, 0.92),
            backdropFilter: 'blur(24px)',
            border: `1px solid ${alpha(t.palette.common.white, 0.08)}`,
            borderRadius: 4,
            overflow: 'hidden',
          }),
        },
      }}
      aria-labelledby="template-preview-title"
    >
      <DialogTitle
        id="template-preview-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
          <AutoFixHigh color="primary" sx={{ fontSize: 22 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {template.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {TEMPLATE_CATEGORY_LABELS[template.category] ?? template.category}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
          <Chip
            label={TEMPLATE_CATEGORY_LABELS[template.category] ?? template.category}
            size="small"
            variant="outlined"
            color="primary"
          />
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={GAP_MEDIUM}>
          {/* Descrição */}
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {template.description}
          </Typography>

          {/* Preview do roteiro */}
          <Box>
            <Typography variant="subtitle2" component="p" sx={{ mb: GAP_COMPACT }}>
              {t('studio.templates.previewTitle')}
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                borderRadius: RADIUS_SM,
                backgroundColor: alpha(theme.palette.background.default, 0.5),
                border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                overflow: 'auto',
                maxHeight: 180,
                m: 0,
                typography: 'body2',
                color: 'text.secondary',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
              }}
            >
              {template.previewScript}
            </Box>
          </Box>

          <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.06) }} />

          {/* Configurações que serão aplicadas */}
          <Box>
            <Typography variant="subtitle2" component="p" sx={{ mb: GAP_DEFAULT }}>
              {t('studio.templates.appliedSettings')}
            </Typography>
            <Stack
              component="ul"
              spacing={GAP_COMPACT}
              sx={{
                m: 0,
                pl: 2,
                listStyle: 'none',
              }}
            >
              {patchEntries.map(([key, value]) => (
                <Typography
                  key={key}
                  component="li"
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'flex', gap: 1 }}
                >
                  <Box component="strong" sx={{ color: 'text.primary', flexShrink: 0 }}>
                    {patchLabels[key] ?? key}:
                  </Box>
                  {formatPatchValue(key, value)}
                </Typography>
              ))}
            </Stack>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
            {t('studio.templates.applyDisclaimer')}
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" startIcon={<Close sx={{ fontSize: 16 }} />}>
          {t('studio.templates.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          startIcon={<AutoFixHigh sx={{ fontSize: 16 }} />}
        >
          {t('studio.templates.apply')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
