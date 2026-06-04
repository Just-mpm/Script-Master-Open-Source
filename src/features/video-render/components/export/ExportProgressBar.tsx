/**
 * Barra de progresso de exportação reutilizável.
 * Exibe progresso, texto de status e botão cancelar.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW_SOFT,
  RADIUS_CHIP,
  WHITE_08,
} from '../../../../theme/tokens';
import { useLocale } from '../../../../features/i18n';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ExportProgressBarProps {
  /** Título opcional acima do status principal */
  title?: string;
  /** Progresso 0-100 */
  progress: number;
  /** Texto descritivo do status */
  statusText: string;
  /** Texto de apoio opcional */
  helperText?: string;
  /** Se está renderizando no momento */
  isRendering: boolean;
  /** Callback de cancelamento */
  onCancel: () => void;
  /** Label do botão cancelar */
  cancelLabel?: string;
  /** Label aria da barra de progresso */
  progressAriaLabel?: string;
  /** Texto opcional do valor do progresso */
  progressValueText?: string;
  /** sx override */
  sx?: SystemStyleObject<Theme>;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const ExportProgressBar = React.memo(function ExportProgressBar({
  title,
  progress,
  statusText,
  helperText,
  isRendering,
  onCancel,
  cancelLabel: _cancelLabel,
  progressAriaLabel: _progressAriaLabel,
  progressValueText,
  sx,
}: ExportProgressBarProps) {
  const { t } = useLocale();
  const cancelLabel = _cancelLabel ?? t('common.cancelEsc').replace(' (Esc)', '');
  const progressAriaLabel = _progressAriaLabel ?? t('video.exportProgress');
  const resolvedProgressValueText = progressValueText ?? `${progress}%`;

  return (
    <Stack role="status" aria-live="polite" spacing={1.5} useFlexGap sx={sx}>
      {title ? (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              color: 'text.secondary',
              fontWeight: 700,
              letterSpacing: '0.08em',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              letterSpacing: '-0.02em',
              lineHeight: 1.35,
            }}
          >
            {statusText}
          </Typography>
        </Box>
      ) : null }

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography
          variant={title ? 'body2' : 'body1'}
          sx={{
            minWidth: 0,
            fontWeight: title ? 500 : 700,
            color: title ? 'text.secondary' : 'text.primary',
            letterSpacing: '-0.01em',
          }}
          noWrap
        >
          {title ? helperText ?? statusText : statusText }
        </Typography>
        <Typography
          variant="caption"
          sx={{
            flexShrink: 0,
            color: 'text.secondary',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
          }}
        >
          {resolvedProgressValueText}
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label={progressAriaLabel}
        aria-valuetext={statusText}
        sx={{
          height: 10,
          borderRadius: RADIUS_CHIP,
          bgcolor: WHITE_08,
          overflow: 'hidden',
          '& .MuiLinearProgress-bar': {
            borderRadius: RADIUS_CHIP,
            background: BRAND_GRADIENT,
            boxShadow: `0 0 16px ${BRAND_PRIMARY_GLOW_SOFT}`,
          },
        }}
      />

      {helperText && !title ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          {helperText}
        </Typography>
      ) : null }

      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={1}
        useFlexGap
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          {isRendering ? t('video.exportBackgroundProcess') : statusText }
        </Typography>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={onCancel}
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}
        >
          {cancelLabel}
        </Button>
      </Stack>
    </Stack>
  );
});
