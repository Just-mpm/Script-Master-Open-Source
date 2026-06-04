import Fade from '@mui/material/Fade';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Visibility from '@mui/icons-material/Visibility';

import {
  BRAND_PRIMARY_GLOW_SOFT,
  TEXT_SECONDARY,
  WHITE_04,
  WHITE_08,
  RADIUS_CHIP,
  BLACK_55,
} from '../../../../theme/tokens';
import type { SubtitleStyle } from '../../types';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SubtitlePreviewProps {
  /** Estilo sendo editado */
  editingStyle: SubtitleStyle;
  /** Escala de composição → tela */
  scale: number;
  /** Posição bottom em pixels de tela */
  previewBottom: number;
  /** Se true, exibe o preview */
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Preview CSS da legenda — exibe o texto "Editar o estilo das legendas"
 * com o estilo atualizado em tempo real sobre o vídeo.
 */
export function SubtitlePreview({
  editingStyle,
  scale,
  previewBottom,
  visible,
}: SubtitlePreviewProps) {
  return (
    <Fade in={visible} timeout={350}>
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          bottom: `${previewBottom}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9,
          pointerEvents: 'none',
          maxWidth: '90%',
          width: 'fit-content',
        }}
      >
        <div
          style={{
            fontSize: `${editingStyle.fontSize * scale }px`,
            fontWeight: 600,
            lineHeight: 1.6,
            textAlign: 'center',
            color: '#ffffff',
            userSelect: 'none',
            padding: `${editingStyle.paddingY * scale }px ${editingStyle.paddingX * scale }px`,
            borderRadius: `${editingStyle.borderRadius * scale }px`,
            backgroundColor: `rgba(0, 0, 0, ${editingStyle.backgroundOpacity})`,
            boxShadow: `0 0 ${40 * scale }px ${20 * scale }px rgba(0, 0, 0, ${editingStyle.backgroundOpacity * 0.8 })`,
            border: `1.5px solid ${BRAND_PRIMARY_GLOW_SOFT}`,
            outline: `1px solid ${WHITE_04}`,
            outlineOffset: '3px',
            transition: 'border-color 0.2s ease, outline-color 0.2s ease',
          }}
        >
          Editar o estilo das legendas
        </div>

        {/* Label "Preview" sobre a legenda */}
        <Box
          sx={{
            position: 'absolute',
            top: -(8 * scale) - 18,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: `${RADIUS_CHIP}px`,
            backgroundColor: BLACK_55,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${WHITE_08}`,
          }}
        >
          <Visibility sx={{ fontSize: 12, color: TEXT_SECONDARY }} />
          <Typography
            variant="caption"
            sx={{
              color: TEXT_SECONDARY,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Preview
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
}
