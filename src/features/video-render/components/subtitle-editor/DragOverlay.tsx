import Fade from '@mui/material/Fade';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import OpenWith from '@mui/icons-material/OpenWith';

import { BRAND_PRIMARY, TEXT_SECONDARY } from '../../../../theme/tokens';
import { DRAG_AREA_SX, DRAG_HINT_SX } from './constants';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface DragOverlayProps {
  /** Se true, exibe o overlay */
  visible: boolean;
  /** Se true, exibe o hint de drag */
  showDragHint: boolean;
  /** Callback ao iniciar drag */
  onDragStart: (e: React.MouseEvent) => void;
  /** Callback ao iniciar drag (oculta hint) */
  onDragHintDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Overlay de drag — cobre o preview permitindo arrastar a legenda verticalmente.
 */
export function DragOverlay({
  visible,
  showDragHint,
  onDragStart,
  onDragHintDismiss,
}: DragOverlayProps) {
  return (
    <Fade in={visible} timeout={300}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 8,
          pointerEvents: 'none',
        }}
      >
        {/* Área de drag sobre todo o preview */}
        <Box
          onMouseDown={(e) => {
            onDragHintDismiss();
            onDragStart(e);
          }}
          sx={DRAG_AREA_SX}
        />

        {/* Hint de drag — aparece brevemente ao entrar no modo edição */}
        <Fade in={showDragHint} timeout={400}>
          <Box sx={DRAG_HINT_SX}>
            <OpenWith sx={{ fontSize: 16, color: BRAND_PRIMARY }} />
            <Typography
              variant="caption"
              sx={{
                color: TEXT_SECONDARY,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                letterSpacing: '0.3px',
              }}
            >
              Arraste para mover a legenda
            </Typography>
          </Box>
        </Fade>
      </Box>
    </Fade>
  );
}
