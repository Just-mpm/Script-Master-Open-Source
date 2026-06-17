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
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  type EasingFunction,
} from 'remotion';
import { getPointAtLength } from '@remotion/paths';
import type { VetorialAnimation, VetorialPath } from '../../speed-paint/types/vetorial';
import { createLogger } from '../../../lib/logger';

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
// Logger
// ---------------------------------------------------------------------------

const log = createLogger('WhiteboardScene');

// ---------------------------------------------------------------------------
// Helper seguro para getPointAtLength
// ---------------------------------------------------------------------------

/**
 * Wrapper à prova de falhas em torno de `getPointAtLength` do `@remotion/paths`.
 *
 * ## Por que este wrapper é necessário
 *
 * O `getPointAtLength(path.d, length)` pode lançar exceção se:
 * - O path `d` for malformado (edge case raro do `imagetracerjs`)
 * - O `length` for negativo ou exceder o comprimento do path (floating-point)
 *
 * Quando `getPointAtLength` falha síncrono dentro do componente React,
 * o erro borbulha para o ErrorBoundary do Remotion, que interrompe a
 * renderização do frame e propaga para `renderMediaOnWeb` como erro
 * de exportação. Este wrapper captura a exceção e retorna `{ x: 0, y: 0 }`
 * como fallback, preservando a renderização mesmo em caso de path inválido.
 *
 * @param d - Atributo `d` do path SVG.
 * @param length - Comprimento ao longo do path (0 = início).
 * @returns Coordenada do ponto, ou `{ x: 0, y: 0 }` em caso de erro.
 */
function safeGetPointAtLength(d: string, length: number): PathPoint {
  try {
    return getPointAtLength(d, length);
  } catch (err) {
    log.error('getPointAtLength falhou — usando fallback (0,0)', {
      d: `${d.substring(0, 80)}...`,
      length,
      error: err instanceof Error ? err.message : String(err),
    });
    return { x: 0, y: 0 };
  }
}

// ---------------------------------------------------------------------------
// Constantes de motion blur e tremor (L11, RF-11 + RF-12)
// ---------------------------------------------------------------------------

/**
 * Limite de velocidade (px/frame) para ativar o motion blur na caneta
 * (L11, RF-12). Abaixo desse valor a caneta parece "parada" e o blur
 * fica imperceptível — manter filtro inativo preserva FPS.
 */
const BLUR_THRESHOLD = 1.5;

/**
 * `stdDeviation` máximo (em pixels SVG) do `feGaussianBlur`. Limite
 * superior evita degradação visual e mantém performance aceitável
 * em frames de exportação (RF-12 + RNF-02).
 */
const MAX_BLUR_STD_DEVIATION = 3;

/**
 * Coeficiente de conversão de velocidade (px/frame) em `stdDeviation`.
 * `stdDeviation = min(speed * BLUR_COEFFICIENT, MAX_BLUR_STD_DEVIATION)`.
 */
const BLUR_COEFFICIENT = 0.05;

/**
 * Amplitude do tremor determinístico (RF-11) — em pixels SVG. Valor
 * pequeno (0.3) para parecer "mão humana" sem distrair do desenho.
 */
const PEN_TREMOR_AMPLITUDE = 0.3;

/**
 * Frequência angular do tremor — combinada com `frame` e `pathIndex`
 * para que cada path tenha tremor único, sem repetição visível.
 */
const PEN_TREMOR_FREQUENCY = 0.5;

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
  /**
   * Easing da progressão da animação (L10, RF-10). Default: `Easing.inOut(Easing.ease)`
   * (curva `smooth` estilo InstaDoodle). O consumidor pode passar `Easing.linear` para
   * velocidade constante ou `Easing.out(Easing.bounce)` para o efeito quicado.
   */
  easing?: EasingFunction;
  /**
   * Escala da caneta SVG (`Pencil`). Default derivado do `strokeWidth` do
   * primeiro path: `(animation.paths[0]?.strokeWidth ?? 2) / 4`.
   * - `strokeWidth` 8 → `penScale` 2 (caneta 2× maior)
   * - `strokeWidth` 2 → `penScale` 0.5 (caneta menor)
   * - `paths` vazio → `penScale` 0.5 (fallback)
   *
   * Ajuste manual para caneta custom (ex: `0.5` = menor, `3` = gigante).
   * A escala é aplicada a partir do **centro** do `<Pencil>` via
   * `transformBox: 'fill-box'` + `transformOrigin: 'center center'` —
   * evita que a caneta "voe" para fora da ponta do traço ao escalar.
   */
  penScale?: number;
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
  const {
    animation,
    durationInFrames,
    showDrawTool = true,
    canvasColor,
    easing,
    // `penScale` tem default calculado a partir de `strokeWidth` (abaixo) —
    // não usar destructuring default porque depende de `animation.paths[0]`.
  } = props;
  const frame = useCurrentFrame();

  // `penScale` efetivo: prop explícita do consumidor OU derivado do `strokeWidth`
  // do primeiro path (RF-19 — escala da caneta proporcional ao traço).
  // `paths[0]?.strokeWidth ?? 2` cobre o caso `paths` vazio (fallback 0.5).
  const effectivePenScale = props.penScale ?? (animation.paths[0]?.strokeWidth ?? 2) / 4;

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
  //    L10 (RF-10): `easing` opcional controla a curva de progressão.
  //    Default `smooth` = `Easing.inOut(Easing.ease)` (padrão InstaDoodle).
  const drawnLength = interpolate(
    frame,
    [0, durationInFrames - 1],
    [0, totalDrawingLength],
    {
      // `durationInFrames - 1` evita `drawnLength === totalDrawingLength`
      // prematuramente (Remotion usa range inclusivo no `interpolate`).
      easing: easing ?? Easing.inOut(Easing.ease),
      extrapolateRight: 'clamp',
    },
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
  // Posição da caneta no frame anterior — usada por L11 (RF-12) para
  // calcular a velocidade tangencial e aplicar motion blur proporcional.
  let prevPenPosition: PathPoint = { x: 0, y: 0 };
  // Índice do path ativo (em progresso). Alimenta o tremor determinístico
  // da caneta (RF-11) — diferente para cada path, evita tremor "global".
  let activePathIndex = -1;

  // Procura o path parcial (em progresso) — apenas 1 por definição.
  const activePath = renderedPaths.find(
    (p) => p.visibleLength > 0 && p.visibleLength < p.pathLen,
  );

  if (activePath) {
    const activeIndex = renderedPaths.indexOf(activePath);
    activePathIndex = activeIndex;
    penPosition = safeGetPointAtLength(activePath.path.d, activePath.visibleLength);
    // Posição "anterior" usada para calcular a tangente (delta por frame).
    // Usamos `visibleLength - delta` onde `delta = totalDrawingLength / frames`
    // é a distância percorrida estimada por frame. Se ficar negativo, fica
    // em (0, 0) — não há path visível antes do início.
    const deltaPerFrame = durationInFrames > 0 ? totalDrawingLength / durationInFrames : 0;
    const prevVisible = Math.max(0, activePath.visibleLength - deltaPerFrame);
    prevPenPosition = safeGetPointAtLength(activePath.path.d, prevVisible);
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
        activePathIndex = lastCompleteIdx;
        penPosition = safeGetPointAtLength(complete.path.d, complete.pathLen);
        // Em path completo, a caneta está parada na ponta — prev = current
        // (velocidade 0, motion blur desativado).
        prevPenPosition = penPosition;
      } else {
        showPen = false;
      }
    } else {
      showPen = false;
    }
  }

  // Velocidade tangencial (px/frame) — RF-12. Quando speed > threshold
  // (1.5px/frame), aplica motion blur na caneta. Quando speed é 0
  // (caneta parada na ponta de path completo), o filtro fica inativo.
  const speed = Math.hypot(
    penPosition.x - prevPenPosition.x,
    penPosition.y - prevPenPosition.y,
  );
  // `stdDeviation` calculado aqui (L11, RF-12) e propagado para o
  // `<Pencil>` — facilita a composição do filtro no `<defs>` do `<svg>`
  // raiz (best practice SVG) sem duplicar lógica.
  const stdDeviation =
    speed > BLUR_THRESHOLD
      ? Math.min(speed * BLUR_COEFFICIENT, MAX_BLUR_STD_DEVIATION)
      : 0;

  const effectiveCanvasColor: CanvasColor = canvasColor ?? animation.canvasColor;

  // Early return: sem paths para desenhar. Evita que `interpolate` receba
  // range `[0, totalDrawingLength]` com `totalDrawingLength = 0` e também
  // previne `<svg>` vazio de causar problemas no WebCodecs.
  if (totalDrawingLength <= 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: effectiveCanvasColor === 'white' ? '#fff' : '#000',
        }}
      />
    );
  }

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
        {/* Defs do SVG: filtros compartilhados. `<defs>` no `<svg>` raiz
            (best practice) garante que `url(#id)` resolva de qualquer
            ponto do documento. Não tem impacto visual (defs não renderiza). */}
        <defs>
          {/* Filtro composto da caneta (L11, RF-11 + RF-12): motion blur
              proporcional à velocidade + sombra suave. O `<feGaussianBlur>`
              é condicional — só é emitido quando `stdDeviation > 0` para
              evitar custo desnecessário em frames de caneta parada. */}
          <filter id="pencil-fx" x="-50%" y="-50%" width="200%" height="200%">
            {stdDeviation > 0 && (
              <feGaussianBlur in="SourceGraphic" stdDeviation={stdDeviation} />
            )}
            <feDropShadow
              dx="5"
              dy="5"
              stdDeviation="5"
              floodColor="#000000"
              floodOpacity="0.3"
            />
          </filter>
        </defs>
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

        {/* Caneta SVG inline — portabilidade total dentro do mesmo <svg>.
            Wrapper externo aplica `scale(penScale)` a partir do CENTRO do
            conteúdo (via `transformBox: 'fill-box' + transformOrigin: 'center'`)
            para que a caneta escale uniformemente sem "voar" para fora da
            ponta do traço. A transformação interna do `<Pencil>`
            (`translate(x y) rotate(-45)`) continua inalterada. */}
        {showPen && (
          <g
            transform={`scale(${effectivePenScale})`}
            style={{ transformBox: 'fill-box', transformOrigin: 'center center' }}
          >
            <Pencil
              x={penPosition.x}
              y={penPosition.y}
              canvasColor={effectiveCanvasColor}
              frame={frame}
              pathIndex={activePathIndex}
            />
          </g>
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
  /** Frame atual do Remotion (usado no tremor determinístico — RF-11). */
  frame: number;
  /** Índice do path ativo (-1 se nenhum) — usado no tremor (RF-11). */
  pathIndex: number;
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
 * | `ctx.shadowColor/Blur/OffsetX/Y`   | `<feDropShadow>` no `<defs>` (L11) |
 * | `ctx.fillStyle` + `fillRect`       | `<rect fill="..." />`              |
 * | `ctx.beginPath()` + `lineTo`       | `<polygon points="..." fill="..." />` |
 *
 * **Por que SVG inline (Premissa #3):** evita latência de fetch de sprite
 * externo, mantém o estilo visual já validado do `SpeedPaintScene`, e
 * permite que a caneta reaja dinamicamente às coordenadas dos paths.
 *
 * **Determinismo:** o efeito de "bob" (flutuação) e o tremor (RF-11) são
 * puramente matemáticos a partir de `frame`, `pathIndex`, `x` e `y`
 * — sem `Math.random()` em momento algum. Mesmos inputs → mesma saída
 * em qualquer renderização (compatível com export determinístico).
 *
 * **L11 — RF-11 (caneta realista):** tremor subpixel `Math.sin(frame * F + pathIndex) * A`
 * (F = `PEN_TREMOR_FREQUENCY`, A = `PEN_TREMOR_AMPLITUDE`). O `pathIndex`
 * faz cada path ter tremor único, evitando sincronia artificial.
 *
 * **L11 — RF-12 (motion blur):** filtro `<feGaussianBlur>` no `<g>` da
 * caneta com `stdDeviation = min(speed * 0.05, 3)`, ativo apenas quando
 * `speed > 1.5px/frame`. Mantém performance em frames de caneta parada.
 */
function Pencil({
  x,
  y,
  canvasColor,
  frame,
  pathIndex,
}: PencilProps): React.ReactElement {
  // Efeito de flutuação sutil — idêntico ao Canvas original.
  const bob = Math.sin(x * 0.1 + y * 0.1) * 2;

  // Em canvas preto, a caneta usa cores mais claras para contraste.
  // No canvas branco, mantém a paleta amarelo/grafite do Canvas original.
  const isInverted = canvasColor === 'black';
  const bodyColor = isInverted ? '#fbbf24' : '#eab308';

  // Tremor determinístico (RF-11) — quando `pathIndex >= 0`, o tremor
  // é único por path. Quando `-1` (sem path ativo), tremor é zero
  // (caneta não renderiza, mas defensivo). Combinação `frame` + `pathIndex`
  // garante que cada path tem padrão próprio, sincronizado com o
  // render mas sem repetição visível durante a animação.
  const tremor =
    pathIndex >= 0
      ? Math.sin(frame * PEN_TREMOR_FREQUENCY + pathIndex) * PEN_TREMOR_AMPLITUDE
      : 0;

  // Inclinação fixa em -45° (estável) — preserva o visual validado do
  // Canvas original. Quando evoluir para tangente dinâmica, calcular
  // `Math.atan2(dy, dx)` da tangente do path ativo aqui.
  const rotation = -45;

  return (
    <g
      transform={`translate(${x + tremor} ${y + bob}) rotate(${rotation})`}
      // Filtro SVG composto (`motion blur` + `sombra`) declarado no
      // `<defs>` do `<svg>` raiz — aplicado APENAS neste `<g>` (não no
      // `<svg>` inteiro — evita corte de sombra/blur nas bordas do canvas,
      // CT-F67). O `feGaussianBlur` interno é condicional (omitido quando
      // `stdDeviation === 0`).
      filter="url(#pencil-fx)"
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
