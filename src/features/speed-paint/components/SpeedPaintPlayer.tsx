/**
 * Wrapper do Player do Remotion para speed paint standalone.
 * Usa forwardRef para expor PlayerRef ao componente pai.
 *
 * Aceita tanto o modo **mask** (`StrokeAnimation` — raspadinha sobre a imagem
 * original) quanto o modo **vetorial** (`VetorialAnimation` — paths SVG
 * desenhados progressivamente, estilo whiteboard). A discriminação é feita
 * em runtime via type guard real (`'paths' in animation`) e casa cada
 * animação com a Composição Remotion apropriada.
 *
 * Modo `vetorial` é opt-in via `animationStore.renderMode === 'vetorial'` —
 * o usuário alterna pelo seletor "Clássico / Desenho" na
 * `SpeedPaintPage` (Fase 4.1). Este wrapper **NÃO** desabilita o toggle:
 * se a animação é vetorial, renderiza `WhiteboardComposition` em vez de
 * quebrar o preview. Ver GAP-01 da reauditoria F5.5.
 */

import { forwardRef, memo, useEffect } from 'react';
import type { ComponentType } from 'react';
import type { PlayerRef } from '@remotion/player';
import { Player } from '@remotion/player';
import Paper from '@mui/material/Paper';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { SpeedPaintComposition, type SpeedPaintCompositionProps } from './SpeedPaintComposition';
import { WhiteboardComposition, type WhiteboardCompositionProps } from './WhiteboardComposition';
import type { StrokeAnimation, VetorialAnimation } from '../types';
import type { SpeedPaintTimingMode } from '../../video-render/lib/speedPaintTimings';
import { glassPanelSx } from '../../../theme/surfaces';
import { createLogger } from '../../../lib/logger';

const logger = createLogger('SpeedPaintPlayer');

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SpeedPaintPlayerProps {
  /**
   * Animação a ser renderizada. Pode ser:
   * - `StrokeAnimation` (modo `'mask'` — raspadinha)
   * - `VetorialAnimation` (modo `'vetorial'` — whiteboard)
   *
   * A discriminação é feita via type guard real (`'paths' in animation`),
   * sem `as` bypass — campos exclusivos de `VetorialAnimation` (`paths`,
   * `totalLength`, `sourcePreset`) nunca existem em `StrokeAnimation`.
   */
  animation: StrokeAnimation | VetorialAnimation;
  /**
   * URL da imagem de origem (obrigatório no modo mask; ignorado no modo
   * vetorial, onde a imagem já foi vetorizada em `animation.paths`).
   * Opcional para refletir o caso vetorial em typecheck, mas a página
   * sempre passa `resizedImage || inputImage` independentemente do modo.
   */
  imageSource?: string;
  /** Exibir lápis/pincel animado seguindo o stroke */
  showDrawTool?: boolean;
  /** Duração da animação em segundos */
  animationDuration: number;
  /** FPS do vídeo (default: 30) */
  fps?: number;
  /** Status do job — usado para auto-play quando completa */
  jobStatus?: 'idle' | 'processing' | 'completed' | 'failed';
  /** Estratégia de tempo da cena exibida */
  timingMode?: SpeedPaintTimingMode;
  /** Indica se a cena é a última da sequência */
  isLastScene?: boolean;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

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
// Helpers de discriminação
// ---------------------------------------------------------------------------

/**
 * Type guard real para `VetorialAnimation`. Usa o campo exclusivo `paths`
 * (nunca presente em `StrokeAnimation`) — narrowing sem `as` bypass.
 */
function isVetorialAnimation(
  animation: StrokeAnimation | VetorialAnimation,
): animation is VetorialAnimation {
  return 'paths' in animation;
}

// ---------------------------------------------------------------------------
// Sub-componentes de Player por modo
// ---------------------------------------------------------------------------

/**
 * Wrapper do `<Player>` para o **modo vetorial** (whiteboard).
 * `inputProps` é tipado contra `WhiteboardCompositionProps` (sem `imageSource`,
 * sem `timingMode` — campos exclusivos de `SpeedPaintComposition`).
 *
 * Existe como sub-componente dedicado para que o generic `P` do `@remotion/player`
 * infira corretamente a partir do `Component` concreto — o TS rejeita uniões em
 * `composition.component` por variância (mesma técnica usada no
 * `speedPaintRenderController` para `ExportableWhiteboardProps`).
 */
interface VetorialPlayerProps {
  animation: VetorialAnimation;
  durationInFrames: number;
  fps: number;
  ref: React.Ref<PlayerRef>;
  showDrawTool: boolean | undefined;
  isLastScene: boolean;
}

const VetorialPlayer = memo(forwardRef<PlayerRef, VetorialPlayerProps>(
  function VetorialPlayer({ animation, durationInFrames, fps, showDrawTool, isLastScene }, ref) {
    const inputProps: WhiteboardCompositionProps = {
      animation,
      showDrawTool,
      isLastScene,
    };
    return (
      <Player
        ref={ref}
        // Cast para `Record<string, unknown>`: requerido pela constraint
        // do generic `Props` do `@remotion/player`. As props concretas
        // (`WhiteboardCompositionProps`) viajam em `inputProps` e o TS
        // valida a shape via `PropsIfHasProps` quando o generic é
        // resolvido. Sem cast, o TS infere `Props = Record<string,
        // unknown>` (default) e rejeita o componente por variância.
        component={WhiteboardComposition as unknown as ComponentType<Record<string, unknown>>}
        inputProps={inputProps as unknown as Record<string, unknown>}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={animation.canvasWidth}
        compositionHeight={animation.canvasHeight}
        style={{ width: '100%', display: 'block' }}
        acknowledgeRemotionLicense
      />
    );
  },
));

/**
 * Wrapper do `<Player>` para o **modo mask** (raspadinha).
 * `inputProps` é tipado contra `SpeedPaintCompositionProps` (com `imageSource`
 * + `timingMode`).
 */
interface MaskPlayerProps {
  animation: StrokeAnimation;
  imageSource: string;
  durationInFrames: number;
  fps: number;
  ref: React.Ref<PlayerRef>;
  showDrawTool: boolean | undefined;
  timingMode: SpeedPaintTimingMode;
  isLastScene: boolean;
}

const MaskPlayer = memo(forwardRef<PlayerRef, MaskPlayerProps>(
  function MaskPlayer(
    { animation, imageSource, durationInFrames, fps, showDrawTool, timingMode, isLastScene },
    ref,
  ) {
    const inputProps: SpeedPaintCompositionProps = {
      animation,
      imageSource,
      showDrawTool,
      timingMode,
      isLastScene,
    };
    return (
      <Player
        ref={ref}
        // Cast para `Record<string, unknown>`: ver comentário em
        // `VetorialPlayer` (constraint do generic `Props` do @remotion/player).
        component={SpeedPaintComposition as unknown as ComponentType<Record<string, unknown>>}
        inputProps={inputProps as unknown as Record<string, unknown>}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={animation.canvasWidth}
        compositionHeight={animation.canvasHeight}
        style={{ width: '100%', display: 'block' }}
        acknowledgeRemotionLicense
      />
    );
  },
));

// ---------------------------------------------------------------------------
// Hook interno: auto-play
// ---------------------------------------------------------------------------

/** Dispara `play()` no Player quando o job completa. Extraído para evitar
 *  duplicação entre as branches mask/vetorial do componente principal. */
function useAutoPlayOnComplete(
  ref: React.Ref<PlayerRef>,
  jobStatus: SpeedPaintPlayerProps['jobStatus'],
): void {
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
}

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
      showDrawTool,
      animationDuration,
      fps = DEFAULT_FPS,
      jobStatus,
      timingMode = 'duration-based',
      isLastScene = true,
    },
    ref,
  ) {
    const durationInFrames = Math.max(1, Math.round(animationDuration * fps));
    const isVetorial = isVetorialAnimation(animation);
    useAutoPlayOnComplete(ref, jobStatus);

    return (
      <Paper elevation={0} sx={playerWrapperSx}>
        {isVetorial ? (
          <VetorialPlayer
            ref={ref}
            animation={animation}
            durationInFrames={durationInFrames}
            fps={fps}
            showDrawTool={showDrawTool}
            isLastScene={isLastScene}
          />
        ) : (
          <MaskPlayer
            ref={ref}
            animation={animation}
            // `imageSource` é opcional no tipo público, mas obrigatório
            // no ramo mask (raspadinha precisa da imagem de fundo).
            // Fallback para string vazia preserva o comportamento legado
            // e é logado via warn para diagnóstico.
            imageSource={imageSource ?? ''}
            durationInFrames={durationInFrames}
            fps={fps}
            showDrawTool={showDrawTool}
            timingMode={timingMode}
            isLastScene={isLastScene}
          />
        )}
      </Paper>
    );
  },
));
