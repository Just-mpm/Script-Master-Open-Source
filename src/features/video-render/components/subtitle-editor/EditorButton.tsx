import Fade from '@mui/material/Fade';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Subtitles from '@mui/icons-material/Subtitles';

import { EDITOR_BTN_SX } from './constants';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface EditorButtonProps {
  /** Se true, exibe o botão (quando NÃO está editando) */
  visible: boolean;
  /** Callback ao clicar */
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Botão "Editar legenda" — flutuante no canto inferior direito com pulse.
 */
export function EditorButton({ visible, onClick }: EditorButtonProps) {
  return (
    <Fade in={visible} timeout={200}>
      <Tooltip title="Personalizar posição e estilo da legenda" placement="left" arrow>
        <IconButton
          aria-label="Personalizar legenda"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          sx={EDITOR_BTN_SX}
        >
          <Subtitles sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>
    </Fade>
  );
}
