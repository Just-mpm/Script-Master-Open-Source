/**
 * Seletor de qualidade de exportação reutilizável.
 * Exibe um ToggleButtonGroup com as opções de qualidade e estimativa de tamanho.
 */

import React from 'react';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import type { VideoExportQuality } from '../../types';
import {
  BRAND_GRADIENT,
  BRAND_GRADIENT_HOVER,
  BRAND_GLOW,
  WHITE,
} from '../../../../theme/tokens';
import { useLocale } from '../../../../features/i18n';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ExportQualitySelectorProps {
  /** Qualidade atual */
  quality: VideoExportQuality;
  /** Callback de mudança */
  onQualityChange: (quality: VideoExportQuality) => void;
  /** Qualidades disponíveis (ex: ['720p', '1080p'] para speed paint, todas para video) */
  qualities: { value: VideoExportQuality; label: string }[];
  /** Tamanho estimado em bytes (0 ou menor para ocultar) */
  estimatedSizeBytes: number;
  /** Label do aria-label */
  ariaLabel?: string;
  /** sx override para o container */
  sx?: SystemStyleObject<Theme>;
}

// ---------------------------------------------------------------------------
// Estilo compartilhado dos ToggleButtonGroups de exportação
// ---------------------------------------------------------------------------

const EXPORT_TOGGLE_GROUP_SX = (fontSize: string): SystemStyleObject<Theme> => ({
  '& .MuiToggleButton-root': {
    px: 1.5,
    py: 0.4,
    fontSize,
    fontWeight: 600,
    letterSpacing: 0,
    border: '1px solid',
    borderColor: 'divider',
    color: 'text.secondary',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&.Mui-selected': {
      background: BRAND_GRADIENT,
      color: WHITE,
      borderColor: 'transparent',
      boxShadow: BRAND_GLOW,
      transform: 'translateY(-1px)',
      '&:hover': { background: BRAND_GRADIENT_HOVER },
    },
  },
});

// ---------------------------------------------------------------------------
// Utilitário
// ---------------------------------------------------------------------------

/**
 * Formata bytes em string legível (KB / MB / GB).
 * Retorna `null` para valores não positivos.
 */
function formatFileSize(bytes: number): string | null {
  if (bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const ExportQualitySelector = React.memo(function ExportQualitySelector({
  quality,
  onQualityChange,
  qualities,
  estimatedSizeBytes,
  ariaLabel: _ariaLabel,
  sx,
}: ExportQualitySelectorProps) {
  const { t } = useLocale();
  const ariaLabel = _ariaLabel ?? t('video.exportQuality');
  const sizeLabel = formatFileSize(estimatedSizeBytes);

  return (
    <Box sx={sx}>
      <ToggleButtonGroup
        value={quality}
        exclusive
        onChange={(_, value: VideoExportQuality | null) => {
          if (value) onQualityChange(value);
        }}
        size="small"
        aria-label={ariaLabel}
        sx={EXPORT_TOGGLE_GROUP_SX('0.8rem')}
      >
        {qualities.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {sizeLabel && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          ~{sizeLabel}
        </Typography>
      )}
    </Box>
  );
});