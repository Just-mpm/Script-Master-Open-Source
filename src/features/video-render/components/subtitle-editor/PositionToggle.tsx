import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import VerticalAlignBottom from '@mui/icons-material/VerticalAlignBottom';
import VerticalAlignCenter from '@mui/icons-material/VerticalAlignCenter';
import VerticalAlignTop from '@mui/icons-material/VerticalAlignTop';

import { TOGGLE_BUTTON_GROUP_SX } from './constants';
import type { SubtitlePosition } from '../../types';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PositionToggleProps {
  /** Posição atual */
  position: SubtitlePosition;
  /** Callback ao alterar */
  onChange: (_: React.MouseEvent<HTMLElement>, value: string | null) => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Toggle para posição vertical da legenda (bottom / center / top).
 */
export function PositionToggle({ position, onChange }: PositionToggleProps) {
  return (
    <Tooltip title="Posição da legenda" placement="top" arrow>
      <ToggleButtonGroup
        value={position}
        exclusive
        onChange={onChange}
        size="small"
        aria-label="Posição vertical da legenda"
        sx={TOGGLE_BUTTON_GROUP_SX}
      >
        <ToggleButton value="bottom" aria-label="Posição inferior">
          <VerticalAlignBottom sx={{ fontSize: 16 }} />
        </ToggleButton>
        <ToggleButton value="center" aria-label="Posição central">
          <VerticalAlignCenter sx={{ fontSize: 16 }} />
        </ToggleButton>
        <ToggleButton value="top" aria-label="Posição superior">
          <VerticalAlignTop sx={{ fontSize: 16 }} />
        </ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );
}
