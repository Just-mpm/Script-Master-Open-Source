import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Add from '@mui/icons-material/Add';
import Remove from '@mui/icons-material/Remove';

import { TOOLBAR_ICON_BTN_BASE, FONT_BTN_HOVER_SX, FONT_CHIP_SX } from './constants';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface FontSizeControlsProps {
  /** Valor atual do fontSize */
  fontSize: number;
  /** Callback para diminuir */
  onDecrease: () => void;
  /** Callback para aumentar */
  onIncrease: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Controles de +/- para tamanho da fonte com chip numérico.
 */
export function FontSizeControls({ fontSize, onDecrease, onIncrease }: FontSizeControlsProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      <Tooltip title="Diminuir tamanho" placement="top" arrow describeChild>
        <IconButton
          size="small"
          aria-label="Diminuir tamanho da fonte"
          onClick={onDecrease}
          sx={{ ...TOOLBAR_ICON_BTN_BASE, '&:hover': FONT_BTN_HOVER_SX }}
        >
          <Remove sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>

      <span aria-live="polite" aria-atomic="true">
        <Chip label={`${fontSize}`} size="small" sx={FONT_CHIP_SX} />
      </span>

      <Tooltip title="Aumentar tamanho" placement="top" arrow describeChild>
        <IconButton
          size="small"
          aria-label="Aumentar tamanho da fonte"
          onClick={onIncrease}
          sx={{ ...TOOLBAR_ICON_BTN_BASE, '&:hover': FONT_BTN_HOVER_SX }}
        >
          <Add sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
