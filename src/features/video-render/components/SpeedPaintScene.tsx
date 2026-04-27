import { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { interpolate } from 'remotion';
import type { StrokeAnimation } from '../../speed-paint/types';
import type { SpeedPaintMultipliers } from '../types';
import { renderSpeedPaintFrame, createBufferCanvas, loadImageElement } from '../lib/speedPaintRenderer';

// ---------------------------------------------------------------------------
// Constantes de timing
// ---------------------------------------------------------------------------

/** Tempo de exposição da pintura completa antes do fade out (em segundos) */
const SPEED_PAINT_HOLD_SECONDS = 3;
/** Duração do fade in/out para speed paint no vídeo (em segundos) */
const SPEED_PAINT_FADE_SECONDS = 1;

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
 * Comportamento "hold + crossfade":
 * 1. Fade in (1s) — opacity 0→1
 * 2. Animação — progress 0→1 com opacidade total
 * 3. Hold (3s) — imagem completa visível, progress = 1
 * 4. Fade out (1s) — opacity 1→0 (exceto última cena)
 *
 * A opacidade é aplicada via CSS no `<AbsoluteFill>` (NÃO via ctx.globalAlpha)
 * para permitir que o crossfade com a cena seguinte funcione corretamente.
 *
 * Usa useCurrentFrame() como driver de tempo — totalmente determinístico,
 * compatível com scrub, pause e exportação via web-renderer.
 */
export function SpeedPaintScene({
  animation,
  imageSource,
  durationInFrames,
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

  // ── Cálculo das 4 zonas: fade in → animação → hold → fade out ──

  // Frames ideais baseados nas constantes de tempo
  let fadeFrames = Math.round(fps * SPEED_PAINT_FADE_SECONDS);
  let holdFrames = Math.round(fps * SPEED_PAINT_HOLD_SECONDS);

  // Cenas muito curtas: reduzir hold proporcionalmente, depois fade
  const totalOverhead = (isLastScene ? fadeFrames : 2 * fadeFrames) + holdFrames;

  if (totalOverhead > durationInFrames) {
    // Edge case 1: nem hold + fade cabem — reduzir hold proporcionalmente
    const availableForAnimation = Math.max(1, durationInFrames * 0.2);
    const remaining = durationInFrames - availableForAnimation;
    const fadeTotal = isLastScene ? fadeFrames : 2 * fadeFrames;

    if (fadeTotal >= remaining) {
      // Edge case 2: nem os fades cabem — comprimir tudo proporcionalmente
      const scale = remaining / fadeTotal;
      fadeFrames = Math.max(1, Math.floor(fadeFrames * scale));
      holdFrames = 0;
    } else {
      holdFrames = Math.max(0, remaining - fadeTotal);
    }
  }

  const animationFrames = Math.max(1, durationInFrames - (isLastScene ? fadeFrames : 2 * fadeFrames) - holdFrames);

  // Limites das zonas em frames absolutos
  const fadeOutStart = isLastScene
    ? durationInFrames // Sem fade out na última cena
    : durationInFrames - fadeFrames;

  // ── Cálculo de opacidade e progress ──

  let progress: number;
  let opacity: number;

  if (frame < fadeFrames) {
    // Zona 1: Fade in — opacity 0→1, progress = 0
    opacity = interpolate(frame, [0, fadeFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    progress = 0;
  } else if (frame < fadeFrames + animationFrames) {
    // Zona 2: Animação — opacity = 1, progress 0→1
    opacity = 1;
    const localFrame = frame - fadeFrames;
    progress = animationFrames > 1
      ? localFrame / (animationFrames - 1)
      : 1;
  } else if (frame < fadeOutStart) {
    // Zona 3: Hold — opacity = 1, progress = 1 (imagem completa)
    opacity = 1;
    progress = 1;
  } else {
    // Zona 4: Fade out — opacity 1→0, progress = 1
    const localFrame = frame - fadeOutStart;
    opacity = interpolate(localFrame, [0, fadeFrames], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    progress = 1;
  }

  // Clamp final
  opacity = Math.max(0, Math.min(1, opacity));
  progress = Math.max(0, Math.min(1, progress));

  // ── Desenho do frame — TUDO síncrono, sem requestAnimationFrame ──

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    const buffer = bufferRef.current;

    if (!canvas || !ctx || !img || !buffer) return;

    // Determina o multiplicador de velocidade: draw/paint separado > global > default
    const resolvedSpeedMultiplier = (drawSpeed != null && paintSpeed != null)
      ? ({ sketch: drawSpeed, reveal: paintSpeed } satisfies SpeedPaintMultipliers)
      : speedMultiplier;

    // Canvas desenha sempre com opacidade total — o fade é via CSS no AbsoluteFill
    renderSpeedPaintFrame(ctx, buffer, {
      animation,
      imageElement: img,
      progress,
      opacity: 1,
      speedMultiplier: resolvedSpeedMultiplier,
    });
  }, [frame, animation, progress, drawSpeed, paintSpeed, speedMultiplier]);

  // Dimensões do canvas — usa as dimensões da animação para pixel-perfect rendering
  const canvasWidth = animation.canvasWidth;
  const canvasHeight = animation.canvasHeight;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', opacity }}>
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
