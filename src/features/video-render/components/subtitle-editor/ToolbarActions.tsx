import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import OpenWith from '@mui/icons-material/OpenWith';
import Refresh from '@mui/icons-material/Refresh';

import { TEXT_DISABLED } from '../../../../theme/tokens';
import { RESET_BTN_SX, CONFIRM_BTN_SX, CANCEL_BTN_SX } from './constants';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ToolbarActionsProps {
  /** Callback para resetar ao padrão */
  onReset: () => void;
  /** Callback para confirmar */
  onConfirm: () => void;
  /** Callback para cancelar */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Grupo de ações da toolbar: lembrete de drag, reset, confirmar e cancelar.
 */
export function ToolbarActions({ onReset, onConfirm, onCancel }: ToolbarActionsProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      {/* Lembrete visual de drag */}
      <Tooltip title="Arraste sobre o vídeo para mover" placement="top" arrow>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            color: TEXT_DISABLED,
            cursor: 'default',
            transition: 'color 0.15s ease',
          }}
        >
          <OpenWith sx={{ fontSize: 14 }} />
        </Box>
      </Tooltip>

      {/* Reset */}
      <Tooltip title="Restaurar padrão" placement="top" arrow describeChild>
        <IconButton
          size="small"
          aria-label="Restaurar estilo padrão"
          onClick={onReset}
          sx={RESET_BTN_SX}
        >
          <Refresh sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>

      {/* Confirmar */}
      <Tooltip title="Confirmar" placement="top" arrow describeChild>
        <IconButton
          size="small"
          aria-label="Confirmar alterações"
          onClick={onConfirm}
          sx={CONFIRM_BTN_SX}
        >
          <Check sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>

      {/* Cancelar */}
      <Tooltip title="Cancelar (Esc)" placement="top" arrow describeChild>
        <IconButton
          size="small"
          aria-label="Cancelar alterações"
          onClick={onCancel}
          sx={CANCEL_BTN_SX}
        >
          <Close sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
