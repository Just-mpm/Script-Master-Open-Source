import React, { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type Theme } from '@mui/material/styles';
import SpeedIcon from '@mui/icons-material/Speed';
import { insetPanelSx } from '../../../theme/surfaces';
import {
  GAP_COMPACT,
  BRAND_PRIMARY_GLOW_SOFT,
} from '../../../theme/tokens';
import { useLocaleSafe } from '../../../features/i18n';
import { StackedHeader } from '../../../components/ui';
import { useCollapsibleSection } from '../../../hooks/useCollapsibleSection';

// ─── Constantes ──────────────────────────────────────────────

const SPEED_MIN = 0.25;
const SPEED_MAX = 4.0;
const SPEED_STEP = 0.25;

// ─── Helpers ─────────────────────────────────────────────────

/** Formata o multiplicador de velocidade com label descritivo (sketch — labels originais) */
function formatSpeedLabel(value: number, t: (k: string) => string): string {
  if (value === 0.25) return `0.25x ${t('speedPaint.speedLabels.verySlow')}`;
  if (value === 0.5) return `0.5x ${t('speedPaint.speedLabels.slow')}`;
  if (value === 0.75) return '0.75x';
  if (value === 1.0) return `1.0x ${t('speedPaint.speedLabels.normal')}`;
  if (value === 1.5) return `1.5x ${t('speedPaint.speedLabels.fast')}`;
  if (value === 2.0) return `2.0x ${t('speedPaint.speedLabels.fast')}`;
  if (value === 3.0) return `3.0x ${t('speedPaint.speedLabels.veryFast')}`;
  if (value === 4.0) return `4.0x ${t('speedPaint.speedLabels.maximum')}`;
  return `${value}x`;
}

// ─── Props ───────────────────────────────────────────────────

interface SpeedPaintControlsProps {
  /** Multiplicador atual de velocidade do sketch */
  sketch: number;
  /** Multiplicador atual de velocidade do reveal */
  reveal: number;
  /** Callback quando o multiplicador do sketch muda */
  onSketchChange: (value: number) => void;
  /** Callback quando o multiplicador do reveal muda */
  onRevealChange: (value: number) => void;
}

// ─── Componente ──────────────────────────────────────────────

export const SpeedPaintControls = React.memo(function SpeedPaintControls({
  sketch,
  reveal,
  onSketchChange,
  onRevealChange,
}: SpeedPaintControlsProps) {
  const { expanded, onToggle, collapseId } = useCollapsibleSection(false);

  const { t } = useLocaleSafe();
  // Labels memoizados para evitar re-cálculo a cada render
  const sketchLabel = useMemo(() => formatSpeedLabel(sketch, t), [sketch, t]);
  const revealLabel = useMemo(() => formatSpeedLabel(reveal, t), [reveal, t]);

  // Handler de mudança do slider sketch — estável entre renders
  const handleSketchChange = useCallback(
    (_event: Event, value: number | number[]) => {
      if (typeof value !== 'number') return;
      onSketchChange(value);
    },
    [onSketchChange],
  );

  // Handler de mudança do slider reveal — estável entre renders
  const handleRevealChange = useCallback(
    (_event: Event, value: number | number[]) => {
      if (typeof value !== 'number') return;
      onRevealChange(value);
    },
    [onRevealChange],
  );

  return (
    <StackedHeader
      variant="glass"
      collapsible
      expanded={expanded}
      onToggle={onToggle}
      collapseId={collapseId}
      icon={<SpeedIcon fontSize="small" sx={{ color: 'primary.main' }} />}
      title={t('speedPaint.speedSectionTitle')}
      description={t('speedPaint.speedSectionDescription')}
      density="compact"
    >
      <Box sx={(t: Theme) => ({ ...insetPanelSx(t), p: 2 })}>
        <Stack spacing={2.5}>
          {/* Slider Desenho (Sketch) */}
          <Stack spacing={GAP_COMPACT}>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {t('speedPaint.sketchLabel')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'JetBrains Mono, monospace' }}>
                {sketchLabel}
              </Typography>
            </Stack>
            <Slider
              size="small"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={SPEED_STEP}
              value={sketch}
              onChange={handleSketchChange}
              aria-label={t('speedPaint.sketchAriaLabel')}
              sx={{
                color: 'primary.main',
                '& .MuiSlider-thumb': {
                  boxShadow: `0 0 8px ${BRAND_PRIMARY_GLOW_SOFT}`,
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: `0 0 0 6px ${BRAND_PRIMARY_GLOW_SOFT}`,
                  },
                },
                '& .MuiSlider-rail': {
                  opacity: 0.24,
                },
              }}
            />
          </Stack>

          {/* Slider Colorir (Reveal) */}
          <Stack spacing={GAP_COMPACT}>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {t('speedPaint.revealLabel')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'JetBrains Mono, monospace' }}>
                {revealLabel}
              </Typography>
            </Stack>
            <Slider
              size="small"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={SPEED_STEP}
              value={reveal}
              onChange={handleRevealChange}
              aria-label={t('speedPaint.revealSpeed')}
              sx={{
                color: 'primary.main',
                '& .MuiSlider-thumb': {
                  boxShadow: `0 0 8px ${BRAND_PRIMARY_GLOW_SOFT}`,
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: `0 0 0 6px ${BRAND_PRIMARY_GLOW_SOFT}`,
                  },
                },
                '& .MuiSlider-rail': {
                  opacity: 0.24,
                },
              }}
            />
          </Stack>
        </Stack>
      </Box>
    </StackedHeader>
  );
});
