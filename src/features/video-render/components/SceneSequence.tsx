import { useState } from 'react';
import {
  AbsoluteFill,
  Img,
  cancelRender,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { computeSafeFadeFrames, springFadeIn, springFadeOut } from '../lib/transitions';

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

  // Garante que o inputRange seja estritamente crescente (precisa 2*t < dur)
  const safeFadeFrames = computeSafeFadeFrames(durationInFrames, tFrames);

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
