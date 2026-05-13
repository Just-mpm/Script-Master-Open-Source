/**
 * Barra de progresso de exportação reutilizável.
 * Exibe progresso, texto de status e botão cancelar.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW_SOFT,
  RADIUS_CHIP,
  WHITE_08,
} from '../../../../theme/tokens';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ExportProgressBarProps {
  /** Progresso 0-100 */
  progress: number;
  /** Texto descritivo do status */
  statusText: string;
  /** Se está renderizando no momento */
  isRendering: boolean;
  /** Callback de cancelamento */
  onCancel: () => void;
  /** Label do botão cancelar */
  cancelLabel?: string;
  /** Label aria da barra de progresso */
  progressAriaLabel?: string;
  /** sx override */
  sx?: SystemStyleObject<Theme>;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const ExportProgressBar = React.memo(function ExportProgressBar({
  progress,
  statusText,
  onCancel,
  cancelLabel = 'Cancelar',
  progressAriaLabel = 'Progresso da exportação',
  sx,
}: ExportProgressBarProps) {
  return (
    <Box role="status" aria-live="polite" sx={sx}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', letterSpacing: '-0.01em' }} noWrap>
          {statusText}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
          {progress}%
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'relative',
          height: 8,
          borderRadius: RADIUS_CHIP,
          bgcolor: WHITE_08,
          overflow: 'hidden',
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-label={progressAriaLabel}
          sx={{
            height: 8,
            borderRadius: RADIUS_CHIP,
            bgcolor: 'transparent',
            '& .MuiLinearProgress-bar': {
              borderRadius: RADIUS_CHIP,
              background: BRAND_GRADIENT,
              boxShadow: `0 0 12px ${BRAND_PRIMARY_GLOW_SOFT}`,
            },
          }}
        />
      </Box>
      <Button
        variant="outlined"
        color="error"
        size="small"
        onClick={onCancel}
        sx={{ alignSelf: 'flex-end', mt: 0.5 }}
      >
        {cancelLabel}
      </Button>
    </Box>
  );
});