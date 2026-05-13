import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { interpolate } from 'remotion';
import type { Stroke } from '../../speed-paint/types';
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
// Draw Tool — lápis/pincel animado que segue o último stroke visível
// ---------------------------------------------------------------------------

/** Tipo de ferramenta de desenho exibida durante a animação */
type DrawToolType = 'pencil' | 'brush';

/**
 * Desenha um lápis ou marcador na posição do último stroke visível.
 * Adaptado do StrokeRenderer (Konva.Context → CanvasRenderingContext2D).
 *
 * - Lápis (sketch): corpo amarelo, ponta de grafite, banda metálica e borracha
 * - Marcador (reveal): corpo azul, ponta rosada e tampa azul-escuro
 *
 * Inclui efeito visual de "bob" (flutuação sutil) baseado na posição
 * e sombra projetada para profundidade.
 */
function drawTool(ctx: CanvasRenderingContext2D, x: number, y: number, tool: DrawToolType): void {
  ctx.save();
  ctx.translate(x, y);

  // Efeito de flutuação sutil baseado na posição — dá vida à ferramenta
  const bob = Math.sin(x * 0.1 + y * 0.1) * 2;
  ctx.translate(0, bob);

  // Rotaciona para que a ponta fique em (0,0) e o corpo vá para cima-direita
  ctx.rotate(-Math.PI / 4);

  // Sombra projetada para profundidade visual
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;

  if (tool === 'pencil') {
    // Corpo amarelo
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-8, -100, 16, 80);

    // Ponta de madeira
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(-8, -20);
    ctx.lineTo(8, -20);
    ctx.lineTo(0, 0);
    ctx.fill();

    // Grafite
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(-3, -7.5);
    ctx.lineTo(3, -7.5);
    ctx.lineTo(0, 0);
    ctx.fill();

    // Banda metálica
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(-8, -110, 16, 10);

    // Borracha
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(-8, -120, 16, 10);
  } else {
    // Marcador — corpo azul
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-10, -100, 20, 80);

    // Base da ponta
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-8, -20, 16, 10);

    // Ponta feltro (rosa)
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.lineTo(6, -10);
    ctx.lineTo(2, 0);
    ctx.lineTo(-2, 0);
    ctx.fill();

    // Tampa azul-escuro
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-10, -120, 20, 20);
  }

  ctx.restore();
}

/**
 * Extrai a posição final (ponta) de um stroke.
 * Strokes com 6 pontos (quadraticCurve) usam o endpoint [4,5];
 * strokes com 4 pontos (lineTo) usam [2,3].
 */
function getStrokeEndPoint(stroke: Stroke): { x: number; y: number } {
  if (stroke.points.length >= 6) {
    return { x: stroke.points[4], y: stroke.points[5] };
  }
  return { x: stroke.points[2], y: stroke.points[3] };
}

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
  /** Se está em modo exportação — esconde o badge de fase e NÃO desenha a ferramenta */
  isExporting?: boolean;
  /** Se deve exibir o lápis/pincel animado seguindo o último stroke visível — apenas no preview */
  showDrawTool?: boolean;
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
export const SpeedPaintScene = React.memo(function SpeedPaintScene({
  animation,
  imageSource,
  durationInFrames,
  isLastScene = false,
  speedMultiplier,
  drawSpeed,
  paintSpeed,
  isExporting,
  showDrawTool = false,
}: SpeedPaintSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);

  // Ref para rastrear o último progress desenhado — evita redesenho duplicado
  // durante o hold (progress=1) quando o frame continua mudando
  const lastDrawnProgressRef = useRef<number>(-1);
  const lastDrawnOpacityRef = useRef<number>(-1);

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

  // Memoiza os cálculos de timing para evitar recomputação a cada frame
  const { fadeFrames, animationFrames, fadeOutStart } = useMemo(() => {
    let f = Math.round(fps * SPEED_PAINT_FADE_SECONDS);
    let h = Math.round(fps * SPEED_PAINT_HOLD_SECONDS);
    const totalOverhead = (isLastScene ? f : 2 * f) + h;

    if (totalOverhead > durationInFrames) {
      const availableForAnimation = Math.max(1, durationInFrames * 0.2);
      const remaining = durationInFrames - availableForAnimation;
      const fadeTotal = isLastScene ? f : 2 * f;

      if (fadeTotal >= remaining) {
        const scale = remaining / fadeTotal;
        f = Math.max(1, Math.floor(f * scale));
        h = 0;
      } else {
        h = Math.max(0, remaining - fadeTotal);
      }
    }

    const a = Math.max(1, durationInFrames - (isLastScene ? f : 2 * f) - h);
    const fos = isLastScene ? durationInFrames : durationInFrames - f;

    return { fadeFrames: f, animationFrames: a, fadeOutStart: fos };
  }, [fps, durationInFrames, isLastScene]);

  // ── Cálculo de opacidade e progress (memoizado por frame) ──

  const { progress, opacity } = useMemo(() => {
    let p: number;
    let o: number;

    if (frame < fadeFrames) {
      o = interpolate(frame, [0, fadeFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      p = 0;
    } else if (frame < fadeFrames + animationFrames) {
      o = 1;
      const localFrame = frame - fadeFrames;
      p = animationFrames > 1 ? localFrame / (animationFrames - 1) : 1;
    } else if (frame < fadeOutStart) {
      o = 1;
      p = 1;
    } else {
      const localFrame = frame - fadeOutStart;
      o = interpolate(localFrame, [0, fadeFrames], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      p = 1;
    }

    return { progress: Math.max(0, Math.min(1, p)), opacity: Math.max(0, Math.min(1, o)) };
  }, [frame, fadeFrames, animationFrames, fadeOutStart]);

  // ── Desenho do frame — TUDO síncrono, sem requestAnimationFrame ──

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    const buffer = bufferRef.current;

    if (!canvas || !ctx || !img || !buffer) return;

    // Early return: durante o hold (progress=1, opacity=1) e o último frame
    // já foi desenhado com os mesmos valores, não redesenha nada.
    // Isso elimina o trabalho pesado de stroke rendering durante os 3s de hold.
    if (progress === lastDrawnProgressRef.current && opacity === lastDrawnOpacityRef.current) {
      return;
    }

    lastDrawnProgressRef.current = progress;
    lastDrawnOpacityRef.current = opacity;

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

    // Desenha a ferramenta (lápis/pincel) na ponta do último stroke visível
    // Apenas no preview — nunca durante exportação e nunca quando a animação
    // está completa (progress = 0 ou 1)
    if (showDrawTool && !isExporting && progress > 0 && progress < 1) {
      const totalStrokes = animation.strokes.length;
      const visibleCount = Math.floor(progress * totalStrokes);

      if (visibleCount > 0 && visibleCount < totalStrokes) {
        const lastStroke = animation.strokes[visibleCount - 1];
        const { x, y } = getStrokeEndPoint(lastStroke);
        const toolType: DrawToolType = lastStroke.type === 'sketch' ? 'pencil' : 'brush';

        drawTool(ctx, x, y, toolType);
      }
    }
  }, [frame, animation, progress, opacity, drawSpeed, paintSpeed, speedMultiplier, showDrawTool, isExporting]);

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
          revealThreshold={animation.revealThreshold ?? 0.8}
          durationInFrames={durationInFrames}
        />
      )}
    </AbsoluteFill>
  );
});

// ---------------------------------------------------------------------------
// Badge de fase (extraído e memoizado para evitar re-render do pai)
// ---------------------------------------------------------------------------

interface SpeedPaintPhaseBadgeProps {
  revealThreshold: number;
  durationInFrames: number;
}

/**
 * Badge semi-transparente que mostra a fase atual do speed paint.
 * Usa useCurrentFrame() — determinístico, só funciona dentro de <Composition>.
 * Calcula a fase baseada em revealThreshold vs progress.
 *
 * Memoizado: só re-renderiza quando durationInFrames muda (raro).
 * O frame é lido internamente via useCurrentFrame(), não via props.
 */
const SpeedPaintPhaseBadge = React.memo(function SpeedPaintPhaseBadge({
  revealThreshold,
  durationInFrames,
}: SpeedPaintPhaseBadgeProps) {
  const frame = useCurrentFrame();
  const threshold = revealThreshold ?? 0.8;
  const progress = Math.min(1, Math.max(0, frame / durationInFrames));
  const isSketchPhase = progress < threshold;
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
});
