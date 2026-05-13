/**
 * Composição Remotion dedicada a uma ÚNICA cena de speed paint.
 * Sem áudio, sem legendas, sem multi-cena.
 * Compatível com renderMediaOnWeb (props serializáveis).
 */

import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { SpeedPaintScene } from '../../video-render/components/SpeedPaintScene';
import type { StrokeAnimation } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SpeedPaintCompositionProps {
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
  drawSpeed,
  paintSpeed,
  showDrawTool,
}: SpeedPaintCompositionProps) {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
      <SpeedPaintScene
        animation={animation}
        imageSource={imageSource}
        durationInFrames={durationInFrames}
        isLastScene
        drawSpeed={drawSpeed}
        paintSpeed={paintSpeed}
        showDrawTool={showDrawTool}
      />
    </AbsoluteFill>
  );
});
