/**
 * Composição Remotion dedicada a uma ÚNICA cena de speed paint.
 * Sem áudio, sem legendas, sem multi-cena.
 * Compatível com renderMediaOnWeb (props serializáveis).
 */

import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { SpeedPaintScene } from '../../video-render/components/SpeedPaintScene';
import type { SpeedPaintTimingMode } from '../../video-render/lib/speedPaintTimings';
import type { StrokeAnimation } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SpeedPaintCompositionProps {
  /** Dados da animação de speed paint */
  animation: StrokeAnimation;
  /** URL da imagem de origem */
  imageSource: string;
  /** Exibir lápis/pincel animado seguindo o stroke */
  showDrawTool?: boolean;
  /** Estratégia de tempo usada pela composição */
  timingMode?: SpeedPaintTimingMode;
  /** Indica se a cena deve encerrar sem fade-out */
  isLastScene?: boolean;
}

// ---------------------------------------------------------------------------
// Composição
// ---------------------------------------------------------------------------

/**
 * Composição Remotion para speed paint standalone.
 *
 * Usa SpeedPaintScene internamente — que já gerencia as 4 zonas
 * (fade in → animação → hold → fade out) via useCurrentFrame().
 * O durationInFrames é obtido via useVideoConfig() e repassado ao SpeedPaintScene.
 */
export const SpeedPaintComposition = React.memo(function SpeedPaintComposition({
  animation,
  imageSource,
  showDrawTool,
  timingMode = 'duration-based',
  isLastScene = true,
}: SpeedPaintCompositionProps) {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
      <SpeedPaintScene
        animation={animation}
        imageSource={imageSource}
        durationInFrames={durationInFrames}
        isLastScene={isLastScene}
        showDrawTool={showDrawTool}
        timingMode={timingMode}
      />
    </AbsoluteFill>
  );
});
