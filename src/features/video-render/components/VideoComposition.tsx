import { AbsoluteFill, Sequence } from 'remotion';
import { Audio } from '@remotion/media';
import type { VideoCompositionProps } from '../types';
import { type EditingScene, TRANSITION_PRESETS } from '../lib/editingPlan';
import { msToFrames } from '../lib/videoUtils';
import { SceneSequence } from './SceneSequence';
import { SubtitleOverlay } from './SubtitleOverlay';
import { TitleOverlay } from './TitleOverlay';

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
export function VideoComposition({ scenes, audioUrl, fps, editingPlan }: VideoCompositionProps) {
  const totalScenes = scenes.length;

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

        // Prioriza legenda do plano de edição sobre a legenda da cena
        const subtitleText = planScene?.subtitle ?? scene.subtitle;

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

            {/* Legenda opcional com posição customizável */}
            {subtitleText && (
              <SubtitleOverlay
                text={subtitleText}
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
