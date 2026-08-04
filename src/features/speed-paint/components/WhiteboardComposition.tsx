/**
 * Composição Remotion dedicada a uma ÚNICA cena de speed paint **vetorial**
 * (whiteboard). Sem áudio, sem legendas, sem multi-cena.
 *
 * Análoga a `SpeedPaintComposition.tsx` (modo máscara), porém envolvendo
 * `WhiteboardScene` (Fase 3.1) em vez de `SpeedPaintScene`. Diferente do modo
 * máscara, **não consome `imageSource`** — a imagem original já foi vetorizada
 * em `VetorialAnimation.paths` pelo pipeline `imageProcessing.ts` (Fase 2.1).
 *
 * Compatível com `renderMediaOnWeb` (props serializáveis).
 */

import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { WhiteboardScene } from '../../video-render/components/WhiteboardScene';
import { getRemotionEasing } from '../../video-render/lib/easingConverter';
import type { VetorialAnimation } from '../types';
import type { VetorialEasingType } from '../types/vetorial';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WhiteboardCompositionProps {
  /** Dados da animação vetorial (paths SVG pré-calculados). */
  animation: VetorialAnimation;
  /** Exibir caneta SVG seguindo a ponta do traço (default: `true`). */
  showDrawTool?: boolean;
  /** Indica se a cena deve encerrar sem fade-out. */
  isLastScene?: boolean;
  /**
   * Curva de progressão da animação (L10, RF-10). Default `undefined`
   * = usa o default interno de `WhiteboardScene` (`Easing.inOut(Easing.ease)`).
   * v0.135.2 (F3 da auditoria): o seletor "Linear / Smooth / Bounce" da
   * UI finalmente propaga para o render — antes era controle morto.
   */
  easing?: VetorialEasingType;
}

// ---------------------------------------------------------------------------
// Composição
// ---------------------------------------------------------------------------

/**
 * Composição Remotion para speed paint **vetorial** standalone.
 *
 * Usa `WhiteboardScene` internamente — que renderiza os paths SVG com
 * `strokeDashoffset` e posiciona a caneta SVG na ponta do traço via
 * `getPointAtLength()` do `@remotion/paths`. O `durationInFrames` é obtido
 * via `useVideoConfig()` e repassado ao `WhiteboardScene`.
 *
 * Determinismo: igual ao `SpeedPaintComposition`, depende apenas de
 * `useCurrentFrame()` e do snapshot da `VetorialAnimation` (sem estado,
 * sem `useEffect`, sem DOM refs no caminho de render).
 */
export const WhiteboardComposition = React.memo(function WhiteboardComposition({
  animation,
  showDrawTool = true,
  isLastScene = true,
  easing,
}: WhiteboardCompositionProps) {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}
    >
      <WhiteboardScene
        animation={animation}
        durationInFrames={durationInFrames}
        isLastScene={isLastScene}
        showDrawTool={showDrawTool}
        easing={getRemotionEasing(easing)}
      />
    </AbsoluteFill>
  );
});
