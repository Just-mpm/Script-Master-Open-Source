import React, { useState, useCallback, useMemo, useId } from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import { useTheme, type Theme } from '@mui/material/styles';
import SpeedIcon from '@mui/icons-material/Speed';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import { insetPanelSx } from '../../../theme/surfaces';
import {
  GAP_COMPACT,
  GAP_DEFAULT,
  ICON_SIZE_MD,
  BRAND_PRIMARY_GLOW_SOFT,
} from '../../../theme/tokens';
import type { SpeedPaintMultipliers } from '../types';

// ─── Constantes ──────────────────────────────────────────────

const SPEED_MIN = 0.25;
const SPEED_MAX = 4.0;
const SPEED_STEP = 0.25;

// ─── Helpers ─────────────────────────────────────────────────

/** Formata o multiplicador de velocidade com label descritivo */
function formatSpeedLabel(value: number): string {
  if (value === 0.25) return '0.25x Muito lento';
  if (value === 0.5) return '0.5x Lento';
  if (value === 0.75) return '0.75x';
  if (value === 1.0) return '1.0x Normal';
  if (value === 1.5) return '1.5x Rápido';
  if (value === 2.0) return '2.0x Rápido';
  if (value === 3.0) return '3.0x Muito rápido';
  if (value === 4.0) return '4.0x Máximo';
  return `${value}x`;
}

// ─── Props ───────────────────────────────────────────────────

interface SpeedPaintControlsProps {
  /** Multiplicadores atuais de sketch e reveal */
  multipliers: SpeedPaintMultipliers;
  /** Callback quando os multiplicadores mudam */
  onMultipliersChange: (multipliers: SpeedPaintMultipliers) => void;
}

// ─── Componente ──────────────────────────────────────────────

export const SpeedPaintControls = React.memo(function SpeedPaintControls({
  multipliers,
  onMultipliersChange,
}: SpeedPaintControlsProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const sectionId = useId();

  // Labels memoizados para evitar re-cálculo a cada render
  const sketchLabel = useMemo(() => formatSpeedLabel(multipliers.sketch), [multipliers.sketch]);
  const revealLabel = useMemo(() => formatSpeedLabel(multipliers.reveal), [multipliers.reveal]);

  // Handler de mudança do slider sketch — estável entre renders
  const handleSketchChange = useCallback(
    (_event: Event, value: number | number[]) => {
      if (typeof value !== 'number') return;
      onMultipliersChange({ ...multipliers, sketch: value });
    },
    [multipliers, onMultipliersChange],
  );

  // Handler de mudança do slider reveal — estável entre renders
  const handleRevealChange = useCallback(
    (_event: Event, value: number | number[]) => {
      if (typeof value !== 'number') return;
      onMultipliersChange({ ...multipliers, reveal: value });
    },
    [multipliers, onMultipliersChange],
  );

  return (
    <Stack spacing={0}>
      {/* ── Header expansível ── */}
      <ButtonBase
        component="button"
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls={sectionId}
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
        <Stack
          direction="row"
          sx={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Stack spacing={GAP_COMPACT}>
            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
              <SpeedIcon
                sx={{ fontSize: ICON_SIZE_MD, color: theme.palette.primary.main }}
                aria-hidden="true"
              />
              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                Velocidade do Speed Paint
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              Controle separado de velocidade para desenho e coloração.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
            {!isExpanded ? (
              <ExpandMore sx={{ fontSize: ICON_SIZE_MD }} />
            ) : (
              <ExpandLess sx={{ fontSize: ICON_SIZE_MD }} />
            )}
          </Stack>
        </Stack>
      </ButtonBase>

      {/* ── Conteúdo expansível ── */}
      <Collapse in={isExpanded} timeout="auto" id={sectionId}>
        <Stack spacing={2} sx={{ px: { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 } }}>
          <Box sx={(t: Theme) => ({ ...insetPanelSx(t), p: 2 })}>
            <Stack spacing={2.5}>
              {/* Slider Desenho (Sketch) */}
              <Stack spacing={GAP_COMPACT}>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Desenho (Sketch)
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
                  value={multipliers.sketch}
                  onChange={handleSketchChange}
                  aria-label="Velocidade do desenho (sketch)"
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
                    Colorir (Reveal)
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
                  value={multipliers.reveal}
                  onChange={handleRevealChange}
                  aria-label="Velocidade da coloração (reveal)"
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
        </Stack>
      </Collapse>
    </Stack>
  );
});
