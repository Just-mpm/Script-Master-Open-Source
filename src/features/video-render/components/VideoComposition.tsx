import { AbsoluteFill, Audio, Sequence } from 'remotion';
import type { VideoCompositionProps } from '../types';
import type { EditingScene } from '../lib/editingPlan';
import { msToFrames } from '../lib/videoUtils';
import { SceneSequence } from './SceneSequence';
import { SubtitleOverlay } from './SubtitleOverlay';

/**
 * Composition principal Remotion para o vídeo de roteiro.
 * Recebe VideoCompositionProps como inputProps do Player e renderiza:
 * - Áudio master sincronizado
 * - Sequências de cena com imagens, transições e efeitos
 * - Legendas opcionais sobrepostas
 *
 * Backward compatible: sem editingPlan, usa fade padrão em todas as cenas.
 */
export function VideoComposition({ scenes, audioUrl, fps, editingPlan }: VideoCompositionProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Áudio como master clock — Remotion sincroniza automaticamente */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Renderiza cada cena como uma Sequence */}
      {scenes.map((scene, index) => {
        // Timestamp em ms * 1000 -> converte para frames
        const startFrame = msToFrames(scene.timestamp * 1000, fps);

        // Busca dados do plano de edição para esta cena (se disponível)
        const planScene = findEditingSceneForIndex(editingPlan, scene.timestamp, index);

        // Se há plano, converte transitionDuration de ms para frames
        const transitionDurationFrames = planScene?.transitionDuration
          ? msToFrames(planScene.transitionDuration, fps)
          : undefined;

        // Prioriza legenda do plano de edição sobre a legenda da cena
        const subtitleText = planScene?.subtitle ?? scene.subtitle;

        return (
          <Sequence
            key={`${scene.imageUrl}-${scene.timestamp}`}
            from={startFrame}
            durationInFrames={scene.durationInFrames}
          >
            {/* Imagem da cena com transição, câmera e efeitos */}
            <SceneSequence
              imageUrl={scene.imageUrl}
              durationInFrames={scene.durationInFrames}
              transition={planScene?.transition}
              transitionDurationFrames={transitionDurationFrames}
              camera={planScene?.camera}
              effects={planScene?.effects}
            />

            {/* Legenda opcional */}
            {subtitleText && (
              <SubtitleOverlay
                text={subtitleText}
                durationInFrames={scene.durationInFrames}
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
