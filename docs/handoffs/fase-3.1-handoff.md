# Fase 3.1 — Handoff: Criar `WhiteboardScene.tsx`

**Você é o agent `worker` da Koda AI Studio.** Sua tarefa é a Fase 3.1 do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`).

## Objetivo

Criar `src/features/video-render/components/WhiteboardScene.tsx` — componente Remotion que renderiza animação vetorial (whiteboard-style) com `strokeDashoffset` + caneta SVG seguindo a ponta do traço. **Determinístico** (sem estado, sem effects, sem DOM refs) — apenas matemática pura derivada de `useCurrentFrame()`.

## Contexto do projeto

- **Stack:** React 19 + Vite 8 + Remotion 4.0.448 + TypeScript 6 + `@remotion/paths` + `imagetracerjs` + MUI v9.
- **Regras:** NUNCA `any`, NUNCA `process.env` (usar `import.meta.env`), logger `createLogger` (import relativo, NUNCA `@/`), comentários em pt-BR, MUI v9 (sem Tailwind).
- **Restrição crítica (Premissa #6 do tracker):** NUNCA usar `ref.current.getTotalLength()` no Remotion. SEMPRE `getLength(pathData)` do `@remotion/paths` — síncrono, sem DOM, sem flickering. O `code-validator` da Fase 3.5 audita isso especificamente.

## Estado atual

### Tipo `VetorialPath` e `VetorialAnimation` (Fase 1.1)

```typescript
export type SpeedPaintRenderMode = 'mask' | 'vetorial';
export interface VetorialPath {
  d: string;          // path data: "M 10 10 L 90 90..."
  length: number;     // comprimento pré-calculado
  color: string;      // cor do traço
  strokeWidth: number;
}
export interface VetorialAnimation {
  id: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasColor: 'white' | 'black';
  paths: VetorialPath[];
  totalLength: number;
  fps: number;
  totalDurationMs: number;
  sourcePreset: VetorialPreset;
  resizedImage?: string;
}
```

### API do `@remotion/paths` (v4.0.448)

```typescript
import { getLength, getPointAtLength, getTangentAtLength } from '@remotion/paths';

getLength(path: string): number;
getPointAtLength(path: string, length: number): { x: number; y: number };
getTangentAtLength(path: string, length: number): { x: number; y: number };
```

### `drawTool()` atual (SpeedPaintScene.tsx linhas 37-106)

Lógica Canvas 2D procedural para desenhar lápis ou marcador. **Portar para SVG inline dentro do mesmo `<svg>` do `WhiteboardScene`** (Premissa #3 do tracker — decisão Matheus 2026-06-14).

Estrutura:
- **Lápis (`'pencil'`):** corpo amarelo (`#eab308`), ponta de madeira (`#fde047`), grafite (`#374151`), banda metálica (`#9ca3af`), borracha (`#fca5a5`).
- **Marcador (`'brush'`):** corpo azul (`#3b82f6`), base da ponta (`#1d4ed8`), ponta feltro rosa (`#ec4899`), tampa (`#1e3a8a`).
- Rotação: `-Math.PI / 4` (-45°) — ponta em (0,0), corpo vai para cima-direita.
- Sombra projetada: `rgba(0,0,0,0.3)`, blur 5, offset (5, 5).
- Efeito de flutuação (bob): `Math.sin(x * 0.1 + y * 0.1) * 2`.

**Portar para SVG:** cada parte vira um `<rect>` ou `<polygon>` SVG com mesma cor. A rotação vira `transform="rotate(-45)"` em um `<g>` que contém a caneta. A posição da caneta (que estava em `ctx.translate(x, y)`) vira o transform do `<g>`: `transform="translate(x, y) rotate(-45)"`. Sombra via `filter="drop-shadow(...)"`. Flutuação pode ser incorporada no translate Y.

## Tarefas

### 1. Criar `src/features/video-render/components/WhiteboardScene.tsx`

**Estrutura base (do plano §5.3:229-340, ADAPTADA):**

```typescript
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { getLength, getPointAtLength } from '@remotion/paths';
import type { VetorialAnimation, VetorialPath } from '../../speed-paint/types/vetorial';

export interface WhiteboardSceneProps {
  /** Dados da animação vetorial */
  animation: VetorialAnimation;
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Se é a última cena — sem fade-out */
  isLastScene?: boolean;
  /** Se está em modo exportação */
  isExporting?: boolean;
  /** Se deve exibir a caneta animada seguindo a ponta do traço */
  showDrawTool?: boolean;
  /** Cor de fundo do canvas (já está em animation.canvasColor, mas permite override) */
  canvasColor?: 'white' | 'black';
}

export const WhiteboardScene = React.memo(function WhiteboardScene({
  animation,
  durationInFrames,
  isLastScene = false,
  isExporting,
  showDrawTool = true,
  canvasColor,
}: WhiteboardSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Calcular comprimento total de todos os paths (síncrono, estático)
  // IMPORTANTE: getLength() é chamado uma única vez por path durante a renderização
  // (não há mutação — mesma entrada → mesma saída)
  const pathLengths = React.useMemo(
    () => animation.paths.map((p) => p.length), // length já está pré-calculado (Fase 1.2)
    [animation.paths],
  );
  const totalDrawingLength = animation.totalLength; // pré-calculado

  // 2. Qual comprimento já foi desenhado neste frame?
  const drawnLength = interpolate(
    frame,
    [0, durationInFrames],
    [0, totalDrawingLength],
    { extrapolateRight: 'clamp' },
  );

  // 3. Determinar quais paths estão completos, parciais ou não começados
  let accumulatedLength = 0;
  const renderedPaths = animation.paths.map((path, i) => {
    const pathLen = pathLengths[i] ?? 0;
    const pathStart = accumulatedLength;
    const pathEnd = accumulatedLength + pathLen;
    accumulatedLength = pathEnd;

    let visibleLength: number;
    if (drawnLength <= pathStart) {
      visibleLength = 0;
    } else if (drawnLength >= pathEnd) {
      visibleLength = pathLen;
    } else {
      visibleLength = drawnLength - pathStart;
    }

    return { path, visibleLength, pathLen };
  });

  // 4. Posição da caneta:
  // - Path parcial (em progresso): ponta do path parcial
  // - Path completo (último completo): ponta final
  // - Gap entre paths: fim do último path completo
  // - Antes do primeiro path: nada (caneta escondida)
  let penX = 0;
  let penY = 0;
  let showPen = showDrawTool && totalDrawingLength > 0;
  const lastCompleteIndex = (() => {
    for (let i = renderedPaths.length - 1; i >= 0; i--) {
      if (renderedPaths[i]?.visibleLength === renderedPaths[i]?.pathLen) {
        return i;
      }
    }
    return -1;
  })();

  const activePath = renderedPaths.find(
    (p) => p.visibleLength > 0 && p.visibleLength < p.pathLen,
  );
  if (activePath) {
    const point = getPointAtLength(activePath.path.d, activePath.visibleLength);
    penX = point.x;
    penY = point.y;
  } else if (lastCompleteIndex >= 0) {
    const complete = renderedPaths[lastCompleteIndex];
    if (complete) {
      const point = getPointAtLength(complete.path.d, complete.pathLen);
      penX = point.x;
      penY = point.y;
    } else {
      showPen = false;
    }
  } else {
    showPen = false;
  }

  const effectiveCanvasColor = canvasColor ?? animation.canvasColor;

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
      >
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
              strokeDashoffset={pathLen - visibleLength}
            />
          );
        })}
        {/* Caneta SVG inline (portada de drawTool() do SpeedPaintScene) */}
        {showPen && (
          <Pencil
            x={penX}
            y={penY}
            canvasColor={effectiveCanvasColor}
          />
        )}
      </svg>
    </AbsoluteFill>
  );
});
```

### 2. Componente `Pencil` (SVG inline, portado de `drawTool()`)

```typescript
/**
 * Lápis animado que segue a ponta do traço.
 * Versão SVG do `drawTool()` procedural de `SpeedPaintScene.tsx` linhas 37-106.
 *
 * Diferenças do Canvas 2D → SVG:
 * - Sombra via `filter="drop-shadow(...)"` (não `ctx.shadowColor`)
 * - Rotação via `transform="rotate(-45)"` (não `ctx.rotate()`)
 * - Cores via atributos `fill` (não `ctx.fillStyle`)
 */
function Pencil({ x, y, canvasColor }: { x: number; y: number; canvasColor: 'white' | 'black' }): React.ReactElement {
  // Efeito de flutuação (bob) — idêntico ao Canvas
  const bob = Math.sin(x * 0.1 + y * 0.1) * 2;
  const inverted = canvasColor === 'black';
  // Em canvas preto, a caneta deve ser mais clara (lápis com cor diferente)
  // Para simplicidade, mantém cores originais — o contraste contra preto ainda é OK
  return (
    <g transform={`translate(${x} ${y + bob}) rotate(-45)`} style={{ filter: 'drop-shadow(rgba(0,0,0,0.3) 5px 5px 5px)' }}>
      {/* Banda metálica */}
      <rect x={-8} y={-110} width={16} height={10} fill="#9ca3af" />
      {/* Corpo amarelo */}
      <rect x={-8} y={-100} width={16} height={80} fill={inverted ? '#fbbf24' : '#eab308'} />
      {/* Ponta de madeira */}
      <polygon points="-8,-20 8,-20 0,0" fill="#fde047" />
      {/* Grafite */}
      <polygon points="-3,-7.5 3,-7.5 0,0" fill="#374151" />
      {/* Borracha */}
      <rect x={-8} y={-120} width={16} height={10} fill="#fca5a5" />
    </g>
  );
}
```

### 3. Validação obrigatória (rodar no fim)

- `bun run typecheck` — 0 erros.
- `bun run lint` — 0 erros/warnings.

## Restrições CRÍTICAS

- **NUNCA** usar `ref.current.getTotalLength()`. SEMPRE `getLength(pathData)` do `@remotion/paths` (já está pré-calculado em `VetorialPath.length`, mas `getPointAtLength` requer o `d` como string).
- **NUNCA** usar `useEffect` ou `useState` no caminho de render — tudo deve ser matemática pura de `useCurrentFrame()`.
- **NUNCA** usar `dangerouslySetInnerHTML` — path data é renderizado via JSX React (escapa automaticamente, confirmado pela auditoria de segurança da Fase 2.5).
- **NUNCA** importar `imagetracerjs` ou `vectorizer.ts` neste componente — vetorização já foi feita na Fase 2.1.
- **NÃO** usar `any` (regra do projeto).
- **NÃO** usar `process.env` (regra do projeto).
- **NÃO** modificar `SpeedPaintScene.tsx` ou outros arquivos.
- **NÃO** criar sprite externo (Premissa #3 — decisão Matheus).
- Comentários em pt-BR.
- Função principal `WhiteboardScene` deve ser `React.memo` (performance).
- Componente `Pencil` deve ser definido no mesmo arquivo (helper privado).

## Detalhes de implementação (decisões técnicas)

1. **`pathLengths` via `useMemo` com `animation.paths` como dep:** Os `length` já estão pré-calculados (Fase 1.2 — `vectorizeImage` chama `getLength()` em cada path). Então `pathLengths` é apenas um map. Mas ainda assim, `useMemo` evita re-extrair em cada frame.

2. **NÃO chamar `getLength(path.d)` no render** — isso seria custoso. Use `path.length` (pré-calculado).

3. **`getPointAtLength(path.d, length)` é chamado APENAS para o path ativo (1 chamada por frame)** — não itera sobre todos os paths. Custos aceitáveis.

4. **Fallback da caneta (Premissa #13):** quando `drawnLength` está no gap entre dois paths completos, posicionar a caneta no final do último path completo (calculado no loop reverso `lastCompleteIndex`).

5. **Canvas color override (Premissa #14):** aceitar `canvasColor?: 'white' | 'black'` permite override futuro. Default usa `animation.canvasColor`.

6. **Bob effect mantido:** mesmo do Canvas (`Math.sin(x * 0.1 + y * 0.1) * 2`) para preservar a sensação validada.

## Notebooks

- **Remotion Docs** — `getCurrentFrame`, `interpolate`, `AbsoluteFill`, `useVideoConfig`. API já conhecida do projeto.
- **React Docs** — `React.memo`, hooks patterns.

## Validação (pronto quando)

- Arquivo `src/features/video-render/components/WhiteboardScene.tsx` criado.
- `bun run typecheck` passa com 0 erros.
- `bun run lint` passa com 0 erros/warnings.
- Nenhum `ref.current.getTotalLength()` no arquivo (auditoria manual + code-validator Fase 3.5).
- Componente `WhiteboardScene` é determinístico (mesmo frame → mesmo output).
- `Pencil` é renderizado dentro do mesmo `<svg>` que os paths (portabilidade Premissa #3).
- Retorne mensagem final com: (a) resumo da implementação, (b) saída do `bun run typecheck` e `bun run lint`, (c) decisões de implementação relevantes.
