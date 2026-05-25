import { useMemo } from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { UsageResource } from '../types';
import { formatUsageDisplay } from '../usageUtils';
import { useLocale } from '../../../features/i18n';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface UsageIndicatorProps {
  resource: UsageResource;
  used: number;
  /** 0 = ilimitado */
  limit: number;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Indicador compacto de uso — barra de progresso com cor adaptativa.
 * Verde (< 60%), amarelo (60-90%), vermelho (> 90%).
 */
export function UsageIndicator({ resource, used, limit }: UsageIndicatorProps) {
  const { t } = useLocale();
  const theme = useTheme();

  const color = useMemo(() => {
    if (limit === 0) {
      return theme.palette.success.main;
    }

    const percentage = (used / limit) * 100;

    if (percentage >= 90) {
      return theme.palette.error.main;
    }

    if (percentage >= 60) {
      return theme.palette.warning.main;
    }

    return theme.palette.success.main;
  }, [used, limit, theme]);

  const percentage = limit === 0 ? 0 : Math.min(100, (used / limit) * 100);

  const label = useMemo(() => {
    const resourceLabels: Record<UsageResource, string> = {
      audio_generations: t('billing.metrics.audioGenerations'),
      image_generations: t('billing.metrics.imageGenerations'),
      video_exports: t('billing.metrics.videoExports'),
      script_chars: t('billing.metrics.scriptChars'),
      storage_mb: t('billing.usage.storageMb'),
    };

    return resourceLabels[resource] ?? resource;
  }, [resource, t]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {formatUsageDisplay(used, limit)}
        </Typography>
      </Box>
      <LinearProgress
        variant={limit === 0 ? 'indeterminate' : 'determinate'}
        value={percentage}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: `${theme.palette.action.disabledBackground}`,
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            backgroundColor: color,
          },
        }}
      />
    </Box>
  );
}
