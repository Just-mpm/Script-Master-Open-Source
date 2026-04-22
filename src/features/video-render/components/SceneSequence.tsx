import { useState } from 'react';
import {
  AbsoluteFill,
  Img,
  cancelRender,
  continueRender,
  delayRender,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ─── Configuração spring ──────────────────────────────────

/**
 * Spring para transições de fade.
 * damping > stiffness = superamortecido → sem oscilação, sem overshoot.
 * A curva natural de spring dá aceleração suave na entrada e desaceleração na saída.
 */
const SPRING_TRANSICAO = {
  damping: 26,
  stiffness: 100,
  mass: 1,
} as const;

// ─── Props ─────────────────────────────────────────────────

interface SceneSequenceProps {
  /** URL da imagem da cena */
  imageUrl: string;
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Frames de fade in/out (default: 12) */
  fadeFrames?: number;
  /** Se é a última cena — remove fade-out para permanecer visível até o final */
  isLastScene?: boolean;
}

// ─── Componente principal ─────────────────────────────────

/**
 * Renderiza uma cena individual com imagem em tela cheia e fade in/out padrão.
 * Usa `<Img>` do Remotion que aguarda o carregamento antes de renderizar.
 * Todas as animações usam spring() do Remotion para timing physics-based.
 */
export function SceneSequence({
  imageUrl,
  durationInFrames,
  fadeFrames: tFrames = 12,
  isLastScene = false,
}: SceneSequenceProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bloqueia a renderização até que a imagem carregue; cancela em caso de falha
  const [handle] = useState(() => delayRender('Carregando imagem da cena'));

  // Garante que o inputRange seja estritamente crescente:
  // precisa t >= 1 e 2*t < durationInFrames, ou seja t <= floor((dur-1)/2)
  const maxAllowed = durationInFrames >= 3 ? Math.floor((durationInFrames - 1) / 2) : 0;
  const safeFadeFrames = Math.min(Math.max(1, tFrames), maxAllowed);

  // Cenas muito curtas (< 2 frames) não têm espaço para transição
  if (safeFadeFrames <= 0 || durationInFrames < 2) {
    return (
      <AbsoluteFill>
        <Img
          src={imageUrl}
          alt=""
          onLoad={() => continueRender(handle)}
          onError={() => cancelRender(new Error(`Falha ao carregar imagem: ${imageUrl}`))}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </AbsoluteFill>
    );
  }

  // Cálculo do fade com spring

  if (isLastScene) {
    // Última cena: só fade-in com spring, permanece visível até o final
    const opacity = springFadeIn(frame, fps, safeFadeFrames);
    return (
      <AbsoluteFill style={{ opacity }}>
        <Img
          src={imageUrl}
          alt=""
          onLoad={() => continueRender(handle)}
          onError={() => cancelRender(new Error(`Falha ao carregar imagem: ${imageUrl}`))}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      </AbsoluteFill>
    );
  }

  const fadeIn = springFadeIn(frame, fps, safeFadeFrames);
  const fadeOut = springFadeOut(frame, fps, durationInFrames - safeFadeFrames, safeFadeFrames);
  // min(fadeIn, fadeOut) cria a curva de entrada platô saída
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={imageUrl}
        alt=""
        onLoad={() => continueRender(handle)}
        onError={() => cancelRender(new Error(`Falha ao carregar imagem: ${imageUrl}`))}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Helpers de fade com spring (physics-based timing)
// ---------------------------------------------------------------------------

/**
 * Gera progresso de fade-in com spring (0→1) ao longo de fadeFrames.
 * Substitui interpolate linear por curva de spring com aceleração/desaceleração.
 */
function springFadeIn(
  frame: number,
  fps: number,
  fadeFrames: number,
): number {
  return spring({
    frame,
    fps,
    config: SPRING_TRANSICAO,
    durationInFrames: fadeFrames,
  });
}

/**
 * Gera opacidade de fade-out com spring (1→0) começando em fadeStartFrame.
 * Inverte o spring (0→1 vira 1→0) e impede valores negativos.
 */
function springFadeOut(
  frame: number,
  fps: number,
  fadeStartFrame: number,
  fadeFrames: number,
): number {
  if (fadeFrames <= 0) return 1;
  // Offset do frame para que o spring comece em fadeStartFrame
  const localFrame = frame - fadeStartFrame;
  // Inverte o spring (0→1 vira 1→0) e impede valores negativos
  return Math.max(0, 1 - spring({
    frame: localFrame,
    fps,
    config: SPRING_TRANSICAO,
    durationInFrames: fadeFrames,
  }));
}
