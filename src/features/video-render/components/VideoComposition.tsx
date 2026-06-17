import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import type { CaptionWord, VideoCompositionProps, VideoScene, SpeedPaintMultipliers } from '../types';
import { SPEED_PAINT_MULTIPLIERS } from '../types';
import type { SpeedPaintSpeed } from '../types';
import { getSpeedPaintOverlapFrames } from '../lib/speedPaintTimings';
import { msToFrames } from '../lib/videoUtils';
import { isVetorialAnimation } from '../lib/strokeCache';
import { SceneSequence } from './SceneSequence';
import { SpeedPaintScene } from './SpeedPaintScene';
import { WhiteboardScene } from './WhiteboardScene';
import { SubtitleOverlay } from './SubtitleOverlay';
import { WaveformOverlay } from './WaveformOverlay';

/** Frames de fade para transição entre cenas (cenas estáticas) */
const FADE_FRAMES = 12;
/** Duração do fade em ms para cenas estáticas (usado para calcular overlap) */
const FADE_DURATION_MS = 400;

// ---------------------------------------------------------------------------
// Props do SceneItem — definido no escopo de módulo para referência estável
// ---------------------------------------------------------------------------

interface SceneItemProps {
  scene: VideoScene;
  index: number;
  totalScenes: number;
  fps: number;
  sceneCaptions: CaptionWord[];
  audioUrl?: string;
  subtitleStyle?: VideoCompositionProps['subtitleStyle'];
  isExporting?: boolean;
  speedPaintOverlapFrames: number;
  globalSpeedMultiplier: number;
  showDrawTool?: boolean;
  speedPaintMultipliers?: SpeedPaintMultipliers;
  /** Se a cena seguinte tem speed paint — pré-computado pelo pai */
  nextHasSpeedPaint: boolean;
  /** Frame global do composition — para WaveformOverlay */
  globalFrame: number;
}

/**
 * Componente memoizado por cena — DEVE estar no escopo de módulo.
 *
 * Se definido dentro de VideoComposition, a referência muda a cada frame
 * (pois VideoComposition usa useCurrentFrame), causando unmount/remount
 * de todos os SpeedPaintScene a cada frame. Isso impede o carregamento
 * da imagem e resulta em frames em branco na exportação.
 */
const SceneItem = React.memo(function SceneItem({
  scene,
  index,
  totalScenes,
  fps,
  sceneCaptions,
  audioUrl,
  subtitleStyle,
  isExporting,
  speedPaintOverlapFrames,
  globalSpeedMultiplier,
  showDrawTool,
  speedPaintMultipliers,
  nextHasSpeedPaint,
  globalFrame,
}: SceneItemProps) {
  const startFrame = msToFrames(scene.timestamp * 1000, fps);
  const thisHasSpeedPaint = !!scene.strokeAnimation;
  const sceneOverlapFrames = (thisHasSpeedPaint || nextHasSpeedPaint)
    ? speedPaintOverlapFrames
    : msToFrames(FADE_DURATION_MS, fps);
  const adjustedFrom = Math.max(0, startFrame - sceneOverlapFrames);
  const adjustedDuration = scene.durationInFrames + sceneOverlapFrames;
  const isLastScene = index === totalScenes - 1;

  return (
    <Sequence
      key={`${scene.imageUrl}-${scene.timestamp}`}
      from={adjustedFrom}
      durationInFrames={adjustedDuration}
    >
      {scene.strokeAnimation ? (
        isVetorialAnimation(scene.strokeAnimation) ? (
          <WhiteboardScene
            animation={scene.strokeAnimation}
            durationInFrames={adjustedDuration}
            isLastScene={isLastScene}
            isExporting={isExporting}
            showDrawTool={showDrawTool}
            canvasColor={scene.strokeAnimation.canvasColor}
          />
        ) : (
          <SpeedPaintScene
            animation={scene.strokeAnimation}
            imageSource={scene.imageUrl}
            durationInFrames={adjustedDuration}
            isLastScene={isLastScene}
            speedMultiplier={speedPaintMultipliers ? undefined : globalSpeedMultiplier }
            drawSpeed={speedPaintMultipliers?.sketch }
            paintSpeed={speedPaintMultipliers?.reveal }
            isExporting={isExporting}
            showDrawTool={showDrawTool}
          />
        )
      ) : (
        <SceneSequence
          imageUrl={scene.imageUrl}
          durationInFrames={adjustedDuration}
          fadeFrames={FADE_FRAMES}
          isLastScene={isLastScene}
        />
      )}
      {(sceneCaptions.length > 0 || scene.subtitle) && (
        <SubtitleOverlay
          captions={sceneCaptions.length > 0 ? sceneCaptions : undefined }
          text={sceneCaptions.length === 0 ? scene.subtitle : undefined }
          durationInFrames={adjustedDuration}
          subtitleStyle={subtitleStyle}
          position={subtitleStyle?.position ?? 'bottom'}
        />
      )}
      {audioUrl && !isExporting && (
        <WaveformOverlay
          audioUrl={audioUrl}
          frame={globalFrame}
          sceneStartTime={scene.timestamp}
          sceneEndTime={scene.timestamp + scene.durationInFrames / fps }
          fps={fps}
          opacity={0.3}
          isExporting={isExporting}
        />
      )}
    </Sequence>
  );
});

// ---------------------------------------------------------------------------
// Composition principal
// ---------------------------------------------------------------------------

/**
 * Composition principal Remotion para o vídeo de roteiro.
 * Recebe VideoCompositionProps como inputProps do Player e renderiza:
 * - Áudio master sincronizado
 * - Sequências de cena com imagens e fade in/out padrão
 * - Legendas opcionais sobrepostas
 * - Cross-scene via overlap de Sequences (crossfade real entre cenas)
 */
export const VideoComposition = React.memo(function VideoComposition({
  scenes,
  audioUrl,
  fps,
  captions,
  subtitleStyle,
  isExporting,
  speedPaintSpeed = 'normal',
  speedPaintMultipliers,
  showDrawTool = true,
}: VideoCompositionProps) {
  const totalScenes = scenes.length;
  const frame = useCurrentFrame();
  const speedPaintOverlapFrames = useMemo(() => getSpeedPaintOverlapFrames('default', fps), [fps]);

  // Pré-computa captions por cena — evita filter+map a cada frame (P1: hotspot em ~300K iterações/s)
  const sceneCaptionsMap = useMemo(() => {
    if (!captions || captions.length === 0) return new Map<number, CaptionWord[]>();

    const map = new Map<number, CaptionWord[]>();
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      const startFrame = msToFrames(scene.timestamp * 1000, fps);

      // Overlap por cena: speed paint usa 1s, estático usa 400ms
      const nextHasSpeedPaint = index < scenes.length - 1 && !!scenes[index + 1].strokeAnimation;
      const thisHasSpeedPaint = !!scene.strokeAnimation;
      const sceneOverlap = (thisHasSpeedPaint || nextHasSpeedPaint)
        ? speedPaintOverlapFrames
        : msToFrames(FADE_DURATION_MS, fps);

      const adjustedFrom = Math.max(0, startFrame - sceneOverlap);
      const adjustedDuration = scene.durationInFrames + sceneOverlap;

      const filtered = captions
        .filter((w) => w.startFrame < adjustedFrom + adjustedDuration && w.endFrame > adjustedFrom)
        .map((w) => ({
          ...w,
          startFrame: w.startFrame - adjustedFrom,
          endFrame: w.endFrame - adjustedFrom,
        }));

      if (filtered.length > 0) {
        map.set(index, filtered);
      }
    }
    return map;
  }, [captions, scenes, fps, speedPaintOverlapFrames]);

  // Pré-computa se cada cena seguinte tem speed paint — evita acesso ao array scenes no SceneItem
  const nextHasSpeedPaintMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (let i = 0; i < scenes.length; i++) {
      map.set(i, i < scenes.length - 1 && !!scenes[i + 1].strokeAnimation);
    }
    return map;
  }, [scenes]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Áudio como master clock — Remotion sincroniza automaticamente */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Renderiza cada cena como uma Sequence com overlap para crossfade */}
      {scenes.map((scene, index) => (
        <SceneItem
          key={`${scene.imageUrl}-${scene.timestamp}`}
          scene={scene}
          index={index}
          totalScenes={totalScenes}
          fps={fps}
          sceneCaptions={sceneCaptionsMap.get(index) ?? []}
          audioUrl={audioUrl}
          subtitleStyle={subtitleStyle}
          isExporting={isExporting}
          speedPaintOverlapFrames={speedPaintOverlapFrames}
          // No contexto de vídeo, a velocidade do speed paint é governada pela
          // duração da cena (animationFrames em SpeedPaintScene), não por um
          // multiplicador arbitrário. speed=1.0 → progressão linear, completa
          // no tempo certo. Para velocidade diferente, o slider da SpeedPaintPage
          // controla a duração total via AnimationDurationSelector.
          globalSpeedMultiplier={SPEED_PAINT_MULTIPLIERS[speedPaintSpeed as SpeedPaintSpeed] ?? SPEED_PAINT_MULTIPLIERS.normal }
          showDrawTool={showDrawTool}
          speedPaintMultipliers={speedPaintMultipliers}
          nextHasSpeedPaint={nextHasSpeedPaintMap.get(index) ?? false }
          globalFrame={frame}
        />
      ))}
    </AbsoluteFill>
  );
});
