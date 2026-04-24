import { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import type { StrokeAnimation } from '../../speed-paint/types';
import { renderSpeedPaintFrame, createBufferCanvas, loadImageElement } from '../lib/speedPaintRenderer';
import { computeSafeFadeFrames, springFadeIn, springFadeOut } from '../lib/transitions';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SpeedPaintSceneProps {
  /** Dados da animação de speed paint */
  animation: StrokeAnimation;
  /** URL da imagem de origem (original ou redimensionada) */
  imageSource: string;
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Frames de fade in/out (default: 12) */
  fadeFrames?: number;
  /** Se é a última cena — remove fade-out */
  isLastScene?: boolean;
  /** Multiplicador de velocidade da animação (default: 1.0) */
  speedMultiplier?: number;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Componente Remotion que renderiza speed paint em canvas nativo.
 *
 * Usa useCurrentFrame() como driver de tempo — totalmente determinístico,
 * compatível com scrub, pause e exportação via web-renderer.
 *
 * NÃO usa requestAnimationFrame, Konva ou APIs assíncronas de desenho.
 * Todo o desenho é síncrono dentro do ciclo de render do React.
 */
export function SpeedPaintScene({
  animation,
  imageSource,
  durationInFrames,
  fadeFrames: tFrames = 12,
  isLastScene = false,
  speedMultiplier,
}: SpeedPaintSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);

  // Bloqueia a renderização até que a imagem carregue
  const [handle] = useState(() => delayRender('Carregando imagem do speed paint'));

  // Carrega a imagem e cria o buffer canvas uma vez
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const img = await loadImageElement(imageSource);
        if (cancelled) return;
        imageRef.current = img;
        bufferRef.current = createBufferCanvas(animation);
        continueRender(handle);
      } catch (err) {
        if (!cancelled) {
          cancelRender(err instanceof Error ? err : new Error('Falha ao carregar imagem do speed paint'));
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      // Failsafe: libera o lock caso desmonte antes do carregamento.
      // Se continueRender já foi chamado, esta chamada é um no-op seguro.
      continueRender(handle);
    };
  }, [imageSource, animation, handle]);

  // Desenha o frame corrente — TUDO síncrono, sem requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    const buffer = bufferRef.current;

    if (!canvas || !ctx || !img || !buffer) return;

    // Calcula progress com fade
    const rawProgress = frame / durationInFrames;
    const clampedProgress = Math.max(0, Math.min(1, rawProgress));

    // Calcula opacidade do fade via helpers compartilhados
    const safeFadeFrames = computeSafeFadeFrames(durationInFrames, tFrames);
    let opacity = 1;

    if (safeFadeFrames > 0 && durationInFrames >= 2) {
      if (isLastScene) {
        opacity = springFadeIn(frame, fps, safeFadeFrames);
      } else {
        const fadeIn = springFadeIn(frame, fps, safeFadeFrames);
        const fadeOut = springFadeOut(frame, fps, durationInFrames - safeFadeFrames, safeFadeFrames);
        opacity = Math.min(fadeIn, fadeOut);
      }
    }

    renderSpeedPaintFrame(ctx, buffer, {
      animation,
      imageElement: img,
      progress: clampedProgress,
      opacity,
      speedMultiplier,
    });
  }, [frame, animation, durationInFrames, tFrames, isLastScene, fps, speedMultiplier]);

  // Dimensões do canvas — usa as dimensões da animação para pixel-perfect rendering
  const canvasWidth = animation.canvasWidth;
  const canvasHeight = animation.canvasHeight;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        aria-label={`Animação speed paint: ${animation.strokes.length} traços`}
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
