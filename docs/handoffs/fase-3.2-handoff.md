# Fase 3.2 — Handoff: WhiteboardComposition + integração no controller

**Você é o agent `worker` da Koda AI Studio.** Sua tarefa é a Fase 3.2 do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`).

## Objetivo

Criar `src/features/speed-paint/components/WhiteboardComposition.tsx` (wrapper análogo ao `SpeedPaintComposition.tsx`) e integrar no `speedPaintRenderController.tsx` como **composição lazy** (`createExportableWhiteboardComposition()`), selecionada quando `renderMode === 'vetorial'`.

## Contexto do projeto

- **Stack:** React 19 + Vite 8 + Remotion 4.0.448 + TypeScript 6 + `@remotion/paths` + `imagetracerjs` + Zustand.
- **Regras:** NUNCA `any`, NUNCA `process.env`, logger `createLogger` (import relativo, NUNCA `@/`), comentários em pt-BR.

## Estado atual

### `src/features/speed-paint/components/SpeedPaintComposition.tsx` (62 linhas — JÁ EXISTE)

Wrapper Remotion para uma única cena. Usa `useVideoConfig` para obter `durationInFrames` e repassa ao `SpeedPaintScene`:

```typescript
export const SpeedPaintComposition = React.memo(function SpeedPaintComposition({
  animation,
  imageSource,
  showDrawTool,
  timingMode = 'duration-based',
  isLastScene = true,
}: SpeedPaintCompositionProps) {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
      <SpeedPaintScene
        animation={animation}
        imageSource={imageSource}
        durationInFrames={durationInFrames}
        isLastScene={isLastScene}
        showDrawTool={showDrawTool}
        timingMode={timingMode}
      />
    </AbsoluteFill>
  );
});
```

### `src/features/speed-paint/store/speedPaintRenderController.tsx` (833+ linhas — JÁ EXISTE)

Controller singleton. Tem 2 composições lazy já implementadas:
- `createExportableSpeedPaintComposition()` (linha 106): `Promise<ComponentType<ExportableSpeedPaintProps>>` — single
- `createExportableBatchSpeedPaintComposition()` (linha 137): `Promise<ComponentType<ExportableBatchSpeedPaintProps>>` — batch

**Padrão das composições existentes (lazy async):**

```typescript
async function createExportableSpeedPaintComposition(): Promise<ComponentType<ExportableSpeedPaintProps>> {
  const [{ AbsoluteFill, useVideoConfig }, { SpeedPaintScene }] = await Promise.all([
    import('remotion'),
    import('../../video-render/components/SpeedPaintScene'),
  ]);

  return function ExportableSpeedPaintComposition(props: ExportableSpeedPaintProps): ReactNode {
    const { animation, imageSource, showDrawTool } = props;
    const { durationInFrames } = useVideoConfig();

    return (
      <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
        <SpeedPaintScene
          animation={animation}
          imageSource={imageSource}
          durationInFrames={durationInFrames}
          showDrawTool={showDrawTool}
          isLastScene
          isExporting
          timingMode="duration-based"
        />
      </AbsoluteFill>
    );
  };
}
```

### `src/features/video-render/components/WhiteboardScene.tsx` (298 linhas — JÁ EXISTE, criado na Fase 3.1)

Interface `WhiteboardSceneProps`:
```typescript
export interface WhiteboardSceneProps {
  animation: VetorialAnimation;
  durationInFrames: number;
  isLastScene?: boolean;
  isExporting?: boolean;
  showDrawTool?: boolean;
  canvasColor?: 'white' | 'black';
}
```

### Estado Zustand (Fase 1.3)

`useAnimationStore` tem `renderMode: 'mask' | 'vetorial'` e `vetorialPreset: VetorialPreset`.

## Tarefas

### 1. Criar `src/features/speed-paint/components/WhiteboardComposition.tsx`

Wrapper análogo ao `SpeedPaintComposition.tsx`, mas usando `WhiteboardScene`. Props: `animation: VetorialAnimation`, `showDrawTool?: boolean`, `isLastScene?: boolean`. **NÃO precisa de `imageSource`** (modo vetorial não usa imagem de fundo).

```typescript
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { WhiteboardScene } from '../../video-render/components/WhiteboardScene';
import type { VetorialAnimation } from '../types/vetorial';

export interface WhiteboardCompositionProps {
  animation: VetorialAnimation;
  showDrawTool?: boolean;
  isLastScene?: boolean;
}

export const WhiteboardComposition = React.memo(function WhiteboardComposition({
  animation,
  showDrawTool = true,
  isLastScene = true,
}: WhiteboardCompositionProps) {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
      <WhiteboardScene
        animation={animation}
        durationInFrames={durationInFrames}
        isLastScene={isLastScene}
        showDrawTool={showDrawTool}
      />
    </AbsoluteFill>
  );
});
```

### 2. Modificar `src/features/speed-paint/store/speedPaintRenderController.tsx`

Adicionar:

#### 2.1. Nova prop de composição vetorial

```typescript
import { WhiteboardComposition } from '../components/WhiteboardComposition';
import type { VetorialAnimation } from '../types';

interface WhiteboardCompositionProps {
  animation: VetorialAnimation;
  showDrawTool: boolean;
}

type ExportableWhiteboardProps = WhiteboardCompositionProps & { [key: string]: unknown };
```

#### 2.2. Composição lazy `createExportableWhiteboardComposition()`

```typescript
async function createExportableWhiteboardComposition(): Promise<ComponentType<ExportableWhiteboardProps>> {
  const [{ AbsoluteFill, useVideoConfig }, { WhiteboardScene }] = await Promise.all([
    import('remotion'),
    import('../../video-render/components/WhiteboardScene'),
  ]);

  return function ExportableWhiteboardComposition(props: ExportableWhiteboardProps): ReactNode {
    const { animation, showDrawTool } = props;
    const { durationInFrames } = useVideoConfig();

    return (
      <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
        <WhiteboardScene
          animation={animation}
          durationInFrames={durationInFrames}
          isLastScene
          isExporting
          showDrawTool={showDrawTool}
        />
      </AbsoluteFill>
    );
  };
}
```

#### 2.3. Estender tipo de opções do controller

Procurar `SpeedPaintExportOptions` (em `useSpeedPaintExporter`) e estender com `renderMode?: SpeedPaintRenderMode`. OU — mais simples — ler `renderMode` do store diretamente no controller (já que é Zustand). **Decisão recomendada:** ler do store no controller para evitar duplicação:

```typescript
import { useAnimationStore } from './animationStore';

// Dentro de runSingleRender(), ANTES de criar a composição:
const renderMode = useAnimationStore.getState().renderMode;
```

#### 2.4. Modificar `runSingleRender` e `runBatchRender` para escolher composição baseada em `renderMode`

No `runSingleRender`, ANTES de chamar `createExportableSpeedPaintComposition()`:

```typescript
// Lê renderMode do store para decidir composição
const renderMode = useAnimationStore.getState().renderMode;
let ExportableComposition: ComponentType<ExportableSpeedPaintProps | ExportableWhiteboardProps>;
let compositionId: string;
let inputProps: ExportableSpeedPaintProps | ExportableWhiteboardProps;

if (renderMode === 'vetorial' && 'paths' in animation) {
  // Tipo narrow: animation é VetorialAnimation
  inputProps = {
    animation: animation as VetorialAnimation,
    showDrawTool,
  };
  compositionId = 'script-master-speed-paint-vetorial-export';
  ExportableComposition = await createExportableWhiteboardComposition();
} else {
  // Modo mask (default)
  inputProps = {
    animation: animation as StrokeAnimation,
    imageSource,
    showDrawTool,
  };
  compositionId = 'script-master-speed-paint-export';
  ExportableComposition = await createExportableSpeedPaintComposition();
}
```

**MAS** — o tipo `animation` em `SpeedPaintExportOptions` é `StrokeAnimation` (linha 67 do controller). Precisa estender:

```typescript
import type { StrokeAnimation, VetorialAnimation } from '../types';

interface SpeedPaintExportOptions {
  // ... campos existentes
  animation: StrokeAnimation | VetorialAnimation;
  renderMode?: SpeedPaintRenderMode;  // opcional, se quiser passar explicitamente
}
```

E em `useSpeedPaintExporter.tsx` (hook fachada), passar a opção adiante.

**Decisão técnica:** para minimizar escopo, ler `renderMode` do store no controller. Se o consumidor quiser override explícito, o `SpeedPaintExportOptions.renderMode` tem prioridade. Documentar isso.

#### 2.5. Atualizar `runBatchRender` (multi-cena)

No batch, CADA cena pode ter `renderMode` diferente (mas improvável na prática). Decisão:
- Se TODAS as cenas têm o mesmo `renderMode`, usar a composição correspondente.
- Se misturadas, fallback para `SpeedPaintComposition` (mask) — mas documentar limitação.

**Implementação simplificada:** assumir que todas as cenas do batch usam o mesmo `renderMode` (lê uma vez no início). Documentar com comentário:

```typescript
// Batch assume que todas as cenas usam o mesmo renderMode.
// Modos misturados não são suportados nesta versão — fallback para mask.
const batchRenderMode = useAnimationStore.getState().renderMode;
```

#### 2.6. Atualizar tipo do controller e tipos auxiliares

`SpeedPaintCompositionProps` (linha 74) precisa ser renomeado ou estendido. Como o controller usa `ExportableSpeedPaintProps` (linha 99) que é um alias, **criar** `ExportableWhiteboardProps` separado é OK (são uniões no uso).

#### 2.7. **NÃO modificar** `useSpeedPaintExporter.tsx` (hook fachada) nesta task

Manter escopo limitado. A integração com o seletor de modo (Fase 4) vai ler o `renderMode` do store e o controller vai usar automaticamente.

## Restrições CRÍTICAS

- **NÃO** modificar `SpeedPaintComposition.tsx` ou `SpeedPaintScene.tsx` (análogos do mask).
- **NÃO** usar `any`.
- **NÃO** usar `process.env`.
- **NÃO** usar `dangerouslySetInnerHTML`.
- Comentários em pt-BR.
- **NÃO** criar nova instância Zustand — ler do `useAnimationStore` existente via `useAnimationStore.getState()`.
- **NÃO** quebrar consumidores existentes (modo mask continua idêntico).
- **NÃO** modificar `useSpeedPaintExporter.tsx` (manter escopo).
- Garantir que `compositionId` seja único para o Remotion (não pode ser igual ao mask).

## Detalhes de implementação

1. **Lazy composition pattern** — siga EXATAMENTE o padrão de `createExportableSpeedPaintComposition()`:
   - `await Promise.all([import('remotion'), import('...componente...')])`
   - Retorna `ComponentType<Props>` (função que renderiza o componente)

2. **Discriminação por `renderMode`**:
   - `'mask'` (default) → `createExportableSpeedPaintComposition()`
   - `'vetorial'` → `createExportableWhiteboardComposition()`

3. **`compositionId` único:**
   - mask: `'script-master-speed-paint-export'` (existente, linha 494)
   - vetorial: `'script-master-speed-paint-vetorial-export'` (novo)
   - batch mask: `'script-master-speed-paint-batch-export'` (existente, linha 744)
   - batch vetorial: pode ser `'script-master-speed-paint-vetorial-batch-export'` se quiser, mas se o batch assume mesmo `renderMode` para todas as cenas, pode-se reusar o `batch-export` existente. Decisão: **NÃO criar batch vetorial nesta task** — manter batch apenas mask. Documentar limitação.

4. **Type narrowing**:
   - `animation` é `StrokeAnimation | VetorialAnimation` (Fase 2.1).
   - Usar `'paths' in animation` para discriminar (campo exclusivo de `VetorialAnimation`).

## Notebooks

- **Remotion Docs** — `useVideoConfig`, `AbsoluteFill`. Já bem conhecido do projeto.
- Não precisa consultar para esta task.

## Validação (pronto quando)

- Arquivo `src/features/speed-paint/components/WhiteboardComposition.tsx` criado.
- `src/features/speed-paint/store/speedPaintRenderController.tsx` modificado.
- `bun run typecheck` passa com 0 erros.
- `bun run lint` passa com 0 erros/warnings.
- Modo mask continua funcionando idêntico (consumidores sem `renderMode`).
- `createExportableWhiteboardComposition()` é uma composição lazy análoga à mask.
- `compositionId` único para o Remotion.
- Retorne mensagem final com: (a) resumo das mudanças, (b) saída do `bun run typecheck` e `bun run lint`, (c) decisões de implementação relevantes (especialmente sobre batch e type narrowing).
