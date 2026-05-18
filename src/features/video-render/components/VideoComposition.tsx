import { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import type { CaptionWord, VideoCompositionProps } from '../types';
import { SPEED_PAINT_MULTIPLIERS } from '../types';
import type { SpeedPaintSpeed } from '../types';
import { getSpeedPaintOverlapFrames } from '../lib/speedPaintTimings';
import { msToFrames } from '../lib/videoUtils';
import { SceneSequence } from './SceneSequence';
import { SpeedPaintScene } from './SpeedPaintScene';
import { SubtitleOverlay } from './SubtitleOverlay';
import { WaveformOverlay } from './WaveformOverlay';

/** Frames de fade para transição entre cenas (cenas estáticas) */
const FADE_FRAMES = 12;
/** Duração do fade em ms para cenas estáticas (usado para calcular overlap) */
const FADE_DURATION_MS = 400;

/**
 * Composition principal Remotion para o vídeo de roteiro.
 * Recebe VideoCompositionProps como inputProps do Player e renderiza:
 * - Áudio master sincronizado
 * - Sequências de cena com imagens e fade in/out padrão
 * - Legendas opcionais sobrepostas
 * - Cross-scene via overlap de Sequences (crossfade real entre cenas)
 */
export function VideoComposition({
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

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Áudio como master clock — Remotion sincroniza automaticamente */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Renderiza cada cena como uma Sequence com overlap para crossfade */}
      {scenes.map((scene, index) => {
        const startFrame = msToFrames(scene.timestamp * 1000, fps);

        // Overlap por cena: speed paint usa 1s, estático usa 400ms
        const nextHasSpeedPaint = index < totalScenes - 1 && !!scenes[index + 1].strokeAnimation;
        const thisHasSpeedPaint = !!scene.strokeAnimation;
        const sceneOverlapFrames = (thisHasSpeedPaint || nextHasSpeedPaint)
          ? speedPaintOverlapFrames
          : msToFrames(FADE_DURATION_MS, fps);

        // Compensa o from com overlap: cena começa mais cedo durante a anterior
        const adjustedFrom = Math.max(0, startFrame - sceneOverlapFrames);
        const adjustedDuration = scene.durationInFrames + sceneOverlapFrames;

        // Busca captions pré-computados para esta cena (P1: lookup O(1) no lugar de filter+map)
        const sceneCaptions = sceneCaptionsMap.get(index) ?? [];

        const isLastScene = index === totalScenes - 1;
        // Divide por 4 para a nova base de velocidade (reescala: 1x nominal = 0.25x real)
        const globalSpeedMultiplier = (SPEED_PAINT_MULTIPLIERS[speedPaintSpeed as SpeedPaintSpeed] ?? SPEED_PAINT_MULTIPLIERS.normal) / 4;

        return (
          <Sequence
            key={`${scene.imageUrl}-${scene.timestamp}`}
            from={adjustedFrom}
            durationInFrames={adjustedDuration}
          >
            {/* Imagem da cena: SpeedPaint animado ou fade estático */}
            {scene.strokeAnimation ? (
              <SpeedPaintScene
                animation={scene.strokeAnimation}
                imageSource={scene.imageUrl}
                durationInFrames={adjustedDuration}
                isLastScene={isLastScene}
                speedMultiplier={speedPaintMultipliers ? undefined : globalSpeedMultiplier}
                drawSpeed={speedPaintMultipliers?.sketch}
                paintSpeed={speedPaintMultipliers?.reveal}
                isExporting={isExporting}
                showDrawTool={showDrawTool}
              />
            ) : (
              <SceneSequence
                imageUrl={scene.imageUrl}
                durationInFrames={adjustedDuration}
                fadeFrames={FADE_FRAMES}
                isLastScene={isLastScene}
              />
            )}

            {/* Legenda: captions com timestamps ou texto fallback */}
            {(sceneCaptions.length > 0 || scene.subtitle) && (
              <SubtitleOverlay
                captions={sceneCaptions.length > 0 ? sceneCaptions : undefined}
                text={sceneCaptions.length === 0 ? scene.subtitle : undefined}
                durationInFrames={adjustedDuration}
                subtitleStyle={subtitleStyle}
                position={subtitleStyle?.position ?? 'bottom'}
              />
            )}

            {/* Waveform de áudio sincronizado com a cena — usa frame absoluto (não local da Sequence) */}
            {audioUrl && (
              <WaveformOverlay
                audioUrl={audioUrl}
                sceneStartTime={scene.timestamp}
                sceneEndTime={scene.timestamp + scene.durationInFrames / fps}
                frame={frame}
                fps={fps}
                opacity={0.3}
                isExporting={isExporting}
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
