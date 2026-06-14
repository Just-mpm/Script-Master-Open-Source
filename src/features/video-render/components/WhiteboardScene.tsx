/**
 * Componente Remotion para animação vetorial (whiteboard-style).
 *
 * Renderiza os paths SVG de uma `VetorialAnimation` crescendo sequencialmente
 * com `strokeDashoffset`, e posiciona uma caneta SVG (`Pencil`) na ponta do
 * traço ativo. Diferente do `SpeedPaintScene` (que usa `<canvas>` + raster),
 * este componente é **puramente declarativo** — todo o frame é derivado de
 * matemática pura a partir de `useCurrentFrame()`, sem `useEffect`, `useState`
 * ou refs DOM.
 *
 * ## Determinismo
 *
 * - `drawnLength` = `interpolate(frame, [0, durationInFrames], [0, totalLength])`
 * - `strokeDashoffset` e posição da caneta derivam de `drawnLength`
 * - Mesmo frame → mesmo output sempre (compatível com scrub, pause, export)
 *
 * ## Performance
 *
 * - `VetorialPath.length` é pré-calculado em `vectorizer.ts` (Fase 1.2).
 *   **NUNCA** chamar `getLength(path.d)` no render — usar `path.length`.
 * - `getPointAtLength(path.d, length)` é chamado **1× por frame** (apenas
 *   para o path ativo). Síncrono, sem DOM, sem flickering — atende à
 *   Premissa #6 do tracker.
 * - `React.memo` evita re-render quando outras cenas atualizam.
 *
 * @see `src/features/speed-paint/types/vetorial.ts` — tipos `VetorialPath`/`VetorialAnimation`
 * @see `src/features/speed-paint/lib/vectorizer.ts` — geração dos paths
 * @see `src/features/video-render/components/SpeedPaintScene.tsx:37-106` — `drawTool()` original (Canvas 2D)
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { getPointAtLength } from '@remotion/paths';
import type { VetorialAnimation, VetorialPath } from '../../speed-paint/types/vetorial';

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

/** Coordenada 2D retornada por `getPointAtLength` do `@remotion/paths`. */
interface PathPoint {
  x: number;
  y: number;
}

/** Cor de fundo do canvas — consistente com `StrokeAnimation.canvasColor`. */
type CanvasColor = 'white' | 'black';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WhiteboardSceneProps {
  /** Dados da animação vetorial (paths pré-calculados, comprimentos prontos). */
  animation: VetorialAnimation;
  /** Duração da cena em frames (driver do `interpolate`). */
  durationInFrames: number;
  /** Se é a última cena — sem fade-out (placeholder para uso futuro pelo wrapper). */
  isLastScene?: boolean;
  /** Se está em modo exportação — escondido badges/overlays de preview. */
  isExporting?: boolean;
  /** Se deve exibir a caneta animada seguindo a ponta do traço (default: `true`). */
  showDrawTool?: boolean;
  /** Override da cor de fundo — default: `animation.canvasColor` (Premissa #14). */
  canvasColor?: CanvasColor;
}

// ---------------------------------------------------------------------------
// Estado derivado de um path no frame atual
// ---------------------------------------------------------------------------

/**
 * Resultado do cálculo de visibilidade de um path para o frame atual.
 * SRP: tipo pequeno, descreve apenas "quanto do path está visível".
 */
interface RenderedPath {
  /** Path original. */
  path: VetorialPath;
  /** Comprimento total do path (atalho para `path.length`, evita acesso repetido). */
  pathLen: number;
  /** Comprimento visível no frame atual (0 ≤ visibleLength ≤ pathLen). */
  visibleLength: number;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * Componente que renderiza a animação whiteboard de uma cena.
 *
 * Algoritmo (segue §5.3:251-281 do plano):
 * 1. `pathLengths` = comprimentos pré-calculados (memo por `animation.paths`)
 * 2. `drawnLength` = quanto já foi desenhado no frame atual (interpolate linear)
 * 3. Para cada path: classifica em completo / parcial / não começado
 * 4. Posição da caneta: ponta do path parcial, ou fim do último completo
 *    (fallback Premissa #13: evita desaparecer entre paths)
 */
export const WhiteboardScene = React.memo(function WhiteboardScene(
  props: WhiteboardSceneProps,
) {
  // Desestruturação seletiva: `isLastScene` e `isExporting` fazem parte da
  // API pública (placeholders para uso futuro pelo `WhiteboardComposition`
  // da Fase 3.2) mas não são usados aqui — não desestruturamos para evitar
  // warning de `no-unused-vars`.
  const { animation, durationInFrames, showDrawTool = true, canvasColor } = props;
  const frame = useCurrentFrame();

  // 1. Comprimentos pré-calculados (Fase 1.2 já populou `path.length`).
  //    O `useMemo` evita criar um novo array a cada frame — estável enquanto
  //    `animation.paths` não mudar (memoização feita no `WhiteboardComposition`).
  const pathLengths = React.useMemo<readonly number[]>(
    () => animation.paths.map((p) => p.length),
    [animation.paths],
  );

  // Atalho: comprimento total acumulado entre todos os paths.
  // Já vem pré-calculado em `animation.totalLength` — usar o campo evita
  // somar manualmente e mantém o custo em zero por frame.
  const totalDrawingLength = animation.totalLength;

  // 2. Quanto já foi desenhado neste frame? (0 → totalDrawingLength).
  const drawnLength = interpolate(
    frame,
    [0, durationInFrames],
    [0, totalDrawingLength],
    { extrapolateRight: 'clamp' },
  );

  // 3. Classifica cada path em completo / parcial / não começado.
  const renderedPaths: RenderedPath[] = [];
  let accumulatedLength = 0;
  for (let i = 0; i < animation.paths.length; i++) {
    const path = animation.paths[i];
    const pathLen = pathLengths[i] ?? 0;
    const pathStart = accumulatedLength;
    const pathEnd = accumulatedLength + pathLen;

    let visibleLength: number;
    if (drawnLength <= pathStart) {
      visibleLength = 0;
    } else if (drawnLength >= pathEnd) {
      visibleLength = pathLen;
    } else {
      visibleLength = drawnLength - pathStart;
    }

    renderedPaths.push({ path, pathLen, visibleLength });
    accumulatedLength = pathEnd;
  }

  // 4. Posição da caneta:
  //    - Path parcial (em progresso): ponta do traço parcial
  //    - Path completo (último completo): ponta final (fim do path)
  //    - Gap entre paths: fim do último path completo (Premissa #13)
  //    - Antes do primeiro path: caneta escondida
  let showPen = showDrawTool && totalDrawingLength > 0;
  let penPosition: PathPoint = { x: 0, y: 0 };

  // Procura o path parcial (em progresso) — apenas 1 por definição.
  const activePath = renderedPaths.find(
    (p) => p.visibleLength > 0 && p.visibleLength < p.pathLen,
  );

  if (activePath) {
    penPosition = getPointAtLength(activePath.path.d, activePath.visibleLength);
  } else {
    // Fallback: último path COMPLETO com comprimento > 0.
    // Itera de trás pra frente — O(N) no pior caso, mas tipicamente
    // o último completo é o último path processado.
    let lastCompleteIdx = -1;
    for (let i = renderedPaths.length - 1; i >= 0; i--) {
      const item = renderedPaths[i];
      if (item && item.pathLen > 0 && item.visibleLength === item.pathLen) {
        lastCompleteIdx = i;
        break;
      }
    }
    if (lastCompleteIdx >= 0) {
      const complete = renderedPaths[lastCompleteIdx];
      if (complete) {
        penPosition = getPointAtLength(complete.path.d, complete.pathLen);
      } else {
        showPen = false;
      }
    } else {
      showPen = false;
    }
  }

  const effectiveCanvasColor: CanvasColor = canvasColor ?? animation.canvasColor;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: effectiveCanvasColor === 'white' ? '#fff' : '#000',
      }}
    >
      <svg
        width={animation.canvasWidth}
        height={animation.canvasHeight}
        viewBox={`0 0 ${animation.canvasWidth} ${animation.canvasHeight}`}
        style={{ display: 'block' }}
        // Acessibilidade: descreve a cena para leitores de tela.
        aria-label={`Animação whiteboard com ${animation.paths.length} traços vetoriais`}
      >
        {/* Paths animados: cada um desenha progressivamente via strokeDashoffset. */}
        {renderedPaths.map(({ path, visibleLength, pathLen }, i) => {
          if (visibleLength === 0) return null;
          return (
            <path
              key={i}
              d={path.d}
              fill="none"
              stroke={path.color}
              strokeWidth={path.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathLen}
              // `pathLen - visibleLength` = quanto falta desenhar (gap à frente da caneta).
              strokeDashoffset={pathLen - visibleLength}
            />
          );
        })}

        {/* Caneta SVG inline — portabilidade total dentro do mesmo <svg>. */}
        {showPen && (
          <Pencil
            x={penPosition.x}
            y={penPosition.y}
            canvasColor={effectiveCanvasColor}
          />
        )}
      </svg>
    </AbsoluteFill>
  );
});

// ---------------------------------------------------------------------------
// Pencil — versão SVG inline do `drawTool()` Canvas 2D (SpeedPaintScene.tsx:37-106)
// ---------------------------------------------------------------------------

interface PencilProps {
  /** Coordenada X da ponta do traço (em pixels SVG). */
  x: number;
  /** Coordenada Y da ponta do traço (em pixels SVG). */
  y: number;
  /** Cor do canvas — usado para escolher a paleta da caneta (contraste). */
  canvasColor: CanvasColor;
}

/**
 * Lápis animado que segue a ponta do traço vetorial.
 *
 * Versão SVG inline do `drawTool()` procedural de `SpeedPaintScene.tsx`
 * (linhas 37-106). Cada parte do Canvas 2D virou um elemento SVG:
 *
 * | Canvas 2D                          | SVG                                |
 * |------------------------------------|------------------------------------|
 * | `ctx.translate(x, y)` + `rotate()` | `transform="translate(...) rotate(-45)"` |
 * | `ctx.shadowColor/Blur/OffsetX/Y`   | `filter="drop-shadow(...)"`        |
 * | `ctx.fillStyle` + `fillRect`       | `<rect fill="..." />`              |
 * | `ctx.beginPath()` + `lineTo`       | `<polygon points="..." fill="..." />` |
 *
 * **Por que SVG inline (Premissa #3):** evita latência de fetch de sprite
 * externo, mantém o estilo visual já validado do `SpeedPaintScene`, e
 * permite que a caneta reaja dinamicamente às coordenadas dos paths.
 *
 * **Determinismo:** o efeito de "bob" (flutuação) é puramente matemático
 * (`Math.sin(x * 0.1 + y * 0.1) * 2`) — mesmo x/y → mesma flutuação.
 */
function Pencil({ x, y, canvasColor }: PencilProps): React.ReactElement {
  // Efeito de flutuação sutil — idêntico ao Canvas original.
  const bob = Math.sin(x * 0.1 + y * 0.1) * 2;

  // Em canvas preto, a caneta usa cores mais claras para contraste.
  // No canvas branco, mantém a paleta amarelo/grafite do Canvas original.
  const isInverted = canvasColor === 'black';
  const bodyColor = isInverted ? '#fbbf24' : '#eab308';

  return (
    <g
      transform={`translate(${x} ${y + bob}) rotate(-45)`}
      style={{ filter: 'drop-shadow(rgba(0,0,0,0.3) 5px 5px 5px)' }}
    >
      {/* Borracha (topo do lápis) */}
      <rect x={-8} y={-120} width={16} height={10} fill="#fca5a5" />
      {/* Banda metálica */}
      <rect x={-8} y={-110} width={16} height={10} fill="#9ca3af" />
      {/* Corpo amarelo */}
      <rect x={-8} y={-100} width={16} height={80} fill={bodyColor} />
      {/* Ponta de madeira (triângulo) */}
      <polygon points="-8,-20 8,-20 0,0" fill="#fde047" />
      {/* Grafite (triângulo menor, dentro da ponta) */}
      <polygon points="-3,-7.5 3,-7.5 0,0" fill="#374151" />
    </g>
  );
}
