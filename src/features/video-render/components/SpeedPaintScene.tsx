import { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import type { StrokeAnimation } from '../../speed-paint/types';
import type { SpeedPaintMultipliers } from '../types';
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
  /** Multiplicador de velocidade para a fase de desenho (sketch) — se fornecido junto com paintSpeed, sobrepõe speedMultiplier */
  drawSpeed?: number;
  /** Multiplicador de velocidade para a fase de coloração (reveal) — se fornecido junto com drawSpeed, sobrepõe speedMultiplier */
  paintSpeed?: number;
  /** Se está em modo exportação — esconde o badge de fase */
  isExporting?: boolean;
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
  drawSpeed,
  paintSpeed,
  isExporting,
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

    // Determina o multiplicador de velocidade: draw/paint separado > global > default
    const resolvedSpeedMultiplier = (drawSpeed != null && paintSpeed != null)
      ? ({ sketch: drawSpeed, reveal: paintSpeed } satisfies SpeedPaintMultipliers)
      : speedMultiplier;

    renderSpeedPaintFrame(ctx, buffer, {
      animation,
      imageElement: img,
      progress: clampedProgress,
      opacity,
      speedMultiplier: resolvedSpeedMultiplier,
    });
  }, [frame, animation, durationInFrames, tFrames, isLastScene, fps, drawSpeed, paintSpeed, speedMultiplier]);

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
      {/* Badge de fase — apenas no preview (não durante exportação) */}
      {!isExporting && (
        <SpeedPaintPhaseBadge
          animation={animation}
          durationInFrames={durationInFrames}
        />
      )}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Badge de fase (sub-componente dentro da árvore Remotion)
// ---------------------------------------------------------------------------

interface SpeedPaintPhaseBadgeProps {
  animation: StrokeAnimation;
  durationInFrames: number;
}

/**
 * Badge semi-transparente que mostra a fase atual do speed paint.
 * Usa useCurrentFrame() — determinístico, só funciona dentro de <Composition>.
 * Calcula a fase baseada em animation.revealThreshold vs progress.
 */
function SpeedPaintPhaseBadge({ animation, durationInFrames }: SpeedPaintPhaseBadgeProps) {
  const frame = useCurrentFrame();
  const revealThreshold = animation.revealThreshold ?? 0.8;
  const progress = Math.min(1, Math.max(0, frame / durationInFrames));
  const isSketchPhase = progress < revealThreshold;
  const label = isSketchPhase ? 'Desenhando...' : 'Colorindo...';

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        padding: '4px 12px',
        borderRadius: 8,
        backgroundColor: isSketchPhase
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(46, 117, 182, 0.15)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.02em',
        fontFamily: "'Inter', sans-serif",
        pointerEvents: 'none',
        zIndex: 10,
        opacity: 0.85,
        transition: 'background-color 0.3s ease',
      }}
    >
      {label}
    </div>
  );
}
