/**
 * Wrapper do Player do Remotion para speed paint standalone.
 * Usa forwardRef para expor PlayerRef ao componente pai.
 */

import { forwardRef, memo, useEffect, useMemo } from 'react';
import type { PlayerRef } from '@remotion/player';
import { Player } from '@remotion/player';
import Paper from '@mui/material/Paper';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { SpeedPaintComposition } from './SpeedPaintComposition';
import type { StrokeAnimation } from '../types';
import { glassPanelSx } from '../../../theme/surfaces';
import { createLogger } from '../../../lib/logger';

const logger = createLogger('SpeedPaintPlayer');

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SpeedPaintPlayerProps {
  /** Dados da animação de speed paint */
  animation: StrokeAnimation;
  /** URL da imagem de origem */
  imageSource: string;
  /** Multiplicador de velocidade para sketch (0.25-4.0) */
  drawSpeed: number;
  /** Multiplicador de velocidade para reveal (0.25-4.0) */
  paintSpeed: number;
  /** Exibir lápis/pincel animado seguindo o stroke */
  showDrawTool?: boolean;
  /** Duração da animação em segundos (default: 15) */
  animationDuration?: number;
  /** FPS do vídeo (default: 30) */
  fps?: number;
  /** Status do job — usado para auto-play quando completa */
  jobStatus?: 'idle' | 'processing' | 'completed' | 'failed';
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DEFAULT_ANIMATION_DURATION = 15;
const DEFAULT_FPS = 30;

// ---------------------------------------------------------------------------
// Estilo do wrapper
// ---------------------------------------------------------------------------

const playerWrapperSx = (theme: Theme): SystemStyleObject<Theme> => ({
  ...glassPanelSx(theme),
  overflow: 'hidden',
  lineHeight: 0,
  // Fundo escuro para contraste com o canvas — mais escuro que o glass padrão
  backgroundColor: alpha(theme.palette.common.black, 0.92),
  borderRadius: { xs: 3, md: 4 },
  '& video': {
    borderRadius: { xs: 2, md: 3 },
  },
});

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Player Remotion dedicado ao speed paint.
 *
 * Auto-play: quando `jobStatus` transita para 'completed', o player
 * inicia a reprodução automaticamente.
 */
export const SpeedPaintPlayer = memo(forwardRef<PlayerRef, SpeedPaintPlayerProps>(
  function SpeedPaintPlayer(
    {
      animation,
      imageSource,
      drawSpeed,
      paintSpeed,
      showDrawTool,
      animationDuration = DEFAULT_ANIMATION_DURATION,
      fps = DEFAULT_FPS,
      jobStatus,
    },
    ref,
  ) {
    const durationInFrames = Math.max(1, Math.round(animationDuration * fps));

    // Props serializáveis para a Composition
    const inputProps = useMemo(
      () => ({
        animation,
        imageSource,
        drawSpeed,
        paintSpeed,
        showDrawTool,
      }),
      [animation, imageSource, drawSpeed, paintSpeed, showDrawTool],
    );

    // Auto-play quando o job completa
    useEffect(() => {
      if (jobStatus !== 'completed') return;

      // Timeout curto para aguardar o Player montar e carregar recursos
      const timer = setTimeout(() => {
        try {
          const playerRef = ref as React.RefObject<PlayerRef | null>;
          if (playerRef.current) {
            playerRef.current.seekTo(0);
            playerRef.current.play();
            logger.info('Auto-play disparado após conclusão do job');
          }
        } catch (err) {
          logger.warn('Falha no auto-play', { error: String(err) });
        }
      }, 300);

      return () => clearTimeout(timer);
    }, [jobStatus, ref]);

    return (
      <Paper elevation={0} sx={playerWrapperSx}>
        <Player
          ref={ref}
          component={SpeedPaintComposition}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={animation.canvasWidth}
          compositionHeight={animation.canvasHeight}
          style={{ width: '100%', display: 'block' }}
          acknowledgeRemotionLicense
        />
    </Paper>
  );
}));
