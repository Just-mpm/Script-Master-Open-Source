import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import type { VideoCompositionProps } from '../types';
import { type EditingScene, TRANSITION_PRESETS } from '../lib/editingPlan';
import { msToFrames } from '../lib/videoUtils';
import { SceneSequence } from './SceneSequence';
import { SubtitleOverlay } from './SubtitleOverlay';
import { TitleOverlay } from './TitleOverlay';
import { WaveformOverlay } from './WaveformOverlay';

/**
 * Composition principal Remotion para o vídeo de roteiro.
 * Recebe VideoCompositionProps como inputProps do Player e renderiza:
 * - Áudio master sincronizado
 * - Sequências de cena com imagens, transições e efeitos
 * - Legendas opcionais sobrepostas
 * - Overlays de título (intro, créditos, lower-third)
 * - Cross-scene via overlap de Sequences (crossfade real entre cenas)
 *
 * Backward compatible: sem editingPlan, usa fade padrão em todas as cenas.
 */
export function VideoComposition({
  scenes,
  audioUrl,
  fps,
  editingPlan,
  captions,
}: VideoCompositionProps) {
  const totalScenes = scenes.length;
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Áudio como master clock — Remotion sincroniza automaticamente */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Renderiza cada cena como uma Sequence com overlap para crossfade */}
      {scenes.map((scene, index) => {
        // Timestamp em ms * 1000 -> converte para frames
        const startFrame = msToFrames(scene.timestamp * 1000, fps);

        // Busca dados do plano de edição para esta cena (se disponível)
        const planScene = findEditingSceneForIndex(editingPlan, scene.timestamp, index);

        // Calcula frames de sobreposição para crossfade entre cenas
        const overlapFrames = getOverlapFrames(planScene, fps);

        // Compensa o from com overlap: cena começa mais cedo durante a anterior
        const adjustedFrom = Math.max(0, startFrame - overlapFrames);
        const adjustedDuration = scene.durationInFrames + overlapFrames;

        // Se há plano, converte transitionDuration de ms para frames
        const transitionDurationFrames = planScene?.transitionDuration
          ? msToFrames(planScene.transitionDuration, fps)
          : undefined;

        // Filtra captions que pertencem ao range de frames desta cena
        // e ajusta timestamps para serem relativos ao início da cena
        const sceneCaptions = captions?.filter(
          (w) => w.startFrame < adjustedFrom + adjustedDuration && w.endFrame > adjustedFrom,
        ).map((w) => ({
          ...w,
          startFrame: w.startFrame - adjustedFrom,
          endFrame: w.endFrame - adjustedFrom,
        })) ?? [];

        // Fallback para planos antigos que ainda usam subtitle textual
        const subtitleText = sceneCaptions.length === 0
          ? (planScene?.subtitle ?? scene.subtitle)
          : undefined;

        const isLastScene = index === totalScenes - 1;

        return (
          <Sequence
            key={`${scene.imageUrl}-${scene.timestamp}`}
            from={adjustedFrom}
            durationInFrames={adjustedDuration}
          >
            {/* Imagem da cena com transição, câmera, efeitos e controle de última cena */}
            <SceneSequence
              imageUrl={scene.imageUrl}
              durationInFrames={adjustedDuration}
              transition={planScene?.transition}
              transitionDurationFrames={transitionDurationFrames}
              camera={planScene?.camera}
              effects={planScene?.effects}
              isLastScene={isLastScene}
            />

            {/* Legenda: captions com timestamps ou texto fallback de planos antigos */}
            {(sceneCaptions.length > 0 || subtitleText) && (
              <SubtitleOverlay
                captions={sceneCaptions.length > 0 ? sceneCaptions : undefined}
                text={sceneCaptions.length === 0 ? subtitleText : undefined}
                durationInFrames={adjustedDuration}
                position={planScene?.subtitlePosition}
              />
            )}

            {/* Overlay de título (intro, créditos, lower-third) */}
            {planScene?.titleOverlay && (
              <TitleOverlay
                text={planScene.titleOverlay.text}
                style={planScene.titleOverlay.style}
                durationInFrames={adjustedDuration}
              />
            )}

            {/* Waveform de áudio sincronizado com a cena */}
            {audioUrl && (
              <WaveformOverlay
                audioUrl={audioUrl}
                sceneStartTime={scene.timestamp}
                sceneEndTime={scene.timestamp + scene.durationInFrames / fps}
                frame={frame}
                fps={fps}
                opacity={0.3}
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calcula frames de sobreposição para crossfade entre cenas.
 * Usa transitionDuration do plano ou o default do preset de transição.
 * Transições 'cut' não geram overlap.
 */
function getOverlapFrames(planScene: EditingScene | undefined, fps: number): number {
  if (!planScene?.transition || planScene.transition === 'cut') return 0;

  const durationMs = planScene.transitionDuration
    ?? TRANSITION_PRESETS[planScene.transition]?.defaultDuration
    ?? 500;

  return msToFrames(durationMs, fps);
}

/**
 * Encontra o EditingScene correspondente a uma cena pelo timestamp.
 * Faz fallback por índice caso o timestamp não bata exatamente
 * (a IA pode gerar timestamps levemente diferentes).
 */
function findEditingSceneForIndex(
  plan: EditingScene[] | undefined,
  sceneTimestamp: number,
  sceneIndex: number,
): EditingScene | undefined {
  if (!plan || plan.length === 0) return undefined;

  // Tenta match exato por timestamp (com tolerância de 0.5s)
  const exactMatch = plan.find(
    (p) => Math.abs(p.timestamp - sceneTimestamp) < 0.5,
  );
  if (exactMatch) return exactMatch;

  // Fallback por índice
  if (sceneIndex < plan.length) return plan[sceneIndex];

  return undefined;
}
