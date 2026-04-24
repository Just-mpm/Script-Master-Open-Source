import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { SLIDER_LABEL_SX, SLIDER_SHARED_SX } from './constants';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface StyleSliderProps {
  /** Texto do label (ex: "Fundo", "Posição") */
  label: string;
  /** Valor atual */
  value: number;
  /** Callback ao alterar */
  onChange: (_: Event, value: number | number[]) => void;
  /** Valor mínimo */
  min: number;
  /** Valor máximo */
  max: number;
  /** Incremento (step) */
  step: number;
  /** Largura do slider em px */
  sliderWidth?: number;
  /** aria-label */
  ariaLabel: string;
  /** id do slider (para htmlFor associado) */
  id?: string;
  /** Se true, renderiza label como <label> com htmlFor */
  isLabel?: boolean;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Slider genérico com label monospace — reutilizado por opacidade e posição vertical.
 */
export function StyleSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  sliderWidth = 72,
  ariaLabel,
  id,
  isLabel = false,
}: StyleSliderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
      <Typography
        variant="caption"
        {...(isLabel ? { component: 'label' as const, htmlFor: id } : {})}
        sx={SLIDER_LABEL_SX}
      >
        {label}
      </Typography>
      <Slider
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        size="small"
        aria-label={ariaLabel}
        {...(id ? { id } : {})}
        sx={{ width: sliderWidth, ...SLIDER_SHARED_SX }}
      />
    </Box>
  );
}
