# Reauditoria — Correção GAP-01 e GAP-02

**Você é o agent `worker` da Koda AI Studio.** Sua tarefa é corrigir 2 issues identificados na reauditoria final do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md`.

## Contexto

O `gap-finder` (reauditoria F5.5) identificou:

- **GAP-01 (MÉDIO):** Preview quebra no modo vetorial. `SpeedPaintPage.tsx:694,744` faz `job.animation as StrokeAnimation` e passa ao `SpeedPaintPlayer` e `SpeedPaintExportPanel`, que esperam apenas `StrokeAnimation`. Quando usuário troca para "Modo Desenho", `generateStrokesFromImage` retorna `VetorialAnimation`, e o player recebe um objeto sem `strokes`/`totalFrames`, causando erro em runtime.
- **GAP-02 (BAIXO):** `useSpeedPaintExporter.tsx` tem `SpeedPaintExportOptions.animation: StrokeAnimation` apenas. O controller discrimina corretamente em runtime (`'paths' in animation`), mas a fachada pública não reflete a união real, e o cast "engana" o TypeScript.

**Decisão do Matheus (2026-06-14):** Estender o player para aceitar `VetorialAnimation` (não desabilitar o toggle).

## Stack

- React 19 + Vite 8 + Remotion 4.0.448 + TypeScript 6 + `@remotion/paths` + `imagetracerjs` + Zustand + MUI v9.
- NUNCA `any`, NUNCA `process.env` (usar `import.meta.env`), logger `createLogger` (import relativo, NUNCA `@/`), SEMPRE tipos explícitos, comentários em pt-BR.

## Estado atual

### `src/features/speed-paint/components/SpeedPaintPlayer.tsx` (existente)

Componente wrapper do `@remotion/player` que renderiza uma `StrokeAnimation`. Provavelmente tipa `animation: StrokeAnimation`.

### `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` (existente)

Interface `SpeedPaintExportOptions.animation: StrokeAnimation` (linha ~48-58).

### `src/pages/SpeedPaintPage.tsx` (modificado F4.1, F4.3, F4.5)

Cast em 2 lugares (linhas 694 e 744):
```typescript
animation={job.animation as StrokeAnimation}
```

### `src/features/video-render/components/WhiteboardScene.tsx` (criado F3.1)

Já existe e aceita `VetorialAnimation` via prop `animation: VetorialAnimation` + `durationInFrames: number`.

## Tarefas

### 1. Modificar `src/features/speed-paint/components/SpeedPaintPlayer.tsx`

Estender para aceitar união:
```typescript
import type { StrokeAnimation, VetorialAnimation } from '../types';

export interface SpeedPaintPlayerProps {
  /** Animação a ser renderizada (mask ou vetorial) */
  animation: StrokeAnimation | VetorialAnimation;
  /** ... outros props existentes (imageSource, showDrawTool, isLastScene, durationInFrames) */
}

// Dentro do componente:
const isVetorial = 'paths' in animation;
if (isVetorial) {
  // Renderizar <WhiteboardScene> em vez de <SpeedPaintScene>
  // (similar ao padrão do `WhiteboardComposition` wrapper)
  return (
    <Player ...>
      <WhiteboardScene
        animation={animation as VetorialAnimation}
        durationInFrames={...}
        showDrawTool={...}
        isLastScene={...}
        isExporting={...}  // se aplicável
      />
    </Player>
  );
}
// Fallback mask (código atual, refatorado para narrowing real)
return (
  <Player ...>
    <SpeedPaintScene
      animation={animation as StrokeAnimation}
      imageSource={...}
      durationInFrames={...}
      showDrawTool={...}
      isLastScene={...}
    />
  </Player>
);
```

**Atenção:**
- `imageSource` só é usado no mask. No vetorial, é desnecessário (paths SVG já estão na `animation`).
- Usar **type guards reais** (`'paths' in animation`) — NUNCA `as` bypass.
- O `imageSource` pode ser `undefined` no modo vetorial; o código mask atual não lida bem com isso. Considerar tornar opcional com default `''` ou validar antes do render.

### 2. Modificar `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx`

Estender `SpeedPaintExportOptions.animation`:
```typescript
import type { StrokeAnimation, VetorialAnimation } from '../types';

export interface SpeedPaintExportOptions {
  // ... outros campos
  animation: StrokeAnimation | VetorialAnimation;
  // ... outros campos
}
```

E propagar a união para o controller via `startRender` (linha do `runSingleRender`):
```typescript
startRender: (options) => {
  // ...
  // Remover o cast `as StrokeAnimation` se existir; passar `options.animation` direto
  // O controller já discrimina corretamente
}
```

### 3. Modificar `src/pages/SpeedPaintPage.tsx`

**Remover os 2 casts `as StrokeAnimation` (linhas 694 e 744):**

Antes (linha 694):
```typescript
<SpeedPaintPlayer
  animation={job.animation as StrokeAnimation}
  ...
/>
```

Depois:
```typescript
<SpeedPaintPlayer
  animation={job.animation}  // tipo: StrokeAnimation | VetorialAnimation | undefined
  ...
/>
```

**Verificar** se `job.animation` é tipado como `StrokeAnimation | VetorialAnimation | undefined` em `src/features/speed-paint/types.ts` (deve estar — F2.1 já fez isso). Se sim, a prop agora aceita a união sem cast.

**Linha 744** (provavelmente `<SpeedPaintExportPanel animation={...}>`): mesma correção.

### 4. Verificar `SpeedPaintExportPanel.tsx`

Localizar o componente e verificar se ele propaga `animation` para o `useSpeedPaintExporter`. Se sim, o tipo já vai fluir corretamente pela união. Se ele faz algum cast próprio, remover.

### 5. Validação obrigatória

- `bun run typecheck` — 0 erros.
- `bun run lint` — 0 erros/warnings.
- `bun run test` (suite completa) — 2264/2264 + os novos testes do player se houver.
- `bun run test tests/speed-paint/animationStore.unit.test.ts` — passa.
- `bun run test tests/pages/SpeedPaintPage.component.test.tsx` — passa.

## Restrições CRÍTICAS

- **NÃO** usar `as` bypass (apenas narrowing real via `'paths' in animation`).
- **NÃO** quebrar consumidores existentes do `SpeedPaintPlayer` (que sempre passam `StrokeAnimation`).
- **NÃO** modificar `WhiteboardScene.tsx`, `SpeedPaintScene.tsx`, ou outros componentes Remotion.
- **NÃO** introduzir regressão no mask (modo padrão).
- **NÃO** quebrar o ciclo de vida do `useSpeedPaintExporter` (hooks cleanup, abort signal, etc.).
- Comentários em pt-BR.

## Detalhes de implementação

### Sobre `imageSource` opcional

No mask, `imageSource` é obrigatório (raspadinha usa imagem de fundo). No vetorial, é desnecessário. Decisões:

**Opção A:** Tornar `imageSource?: string` no player. No ramo mask, se `imageSource` for `undefined`, mostrar placeholder ou erro.
**Opção B:** Manter `imageSource: string` obrigatório. No ramo vetorial, passar `''` (string vazia é falsy mas tipo bate).
**Opção C:** Discriminar no nível do tipo via função helper.

**Decisão recomendada: Opção A** (`imageSource?: string`) — mais typesafe, evita passar `''` fake.

```typescript
export interface SpeedPaintPlayerProps {
  animation: StrokeAnimation | VetorialAnimation;
  /** URL da imagem (obrigatório no modo mask; ignorado no modo vetorial) */
  imageSource?: string;
  // ... outros
}
```

### Sobre o `useShallow` no `SpeedPaintPage`

Verificar se algum `useShallow` selector ou destruturação está restringindo o tipo de `job.animation`. Se sim, ajustar para `StrokeAnimation | VetorialAnimation | undefined`.

## Notebooks

- Remotion Docs — `@remotion/player` Player, `Props` genéricos. Padrão conhecido do projeto.
- React Docs — discriminated union narrowing.

## Validação (pronto quando)

- `SpeedPaintPlayer.tsx` estendido para aceitar união.
- `useSpeedPaintExporter.tsx` tem `animation: StrokeAnimation | VetorialAnimation`.
- `SpeedPaintPage.tsx` sem cast `as StrokeAnimation` (ou cast justificado por narrowing real).
- 2/2 testes manuais (smoke test):
  - Modo mask: preview ainda funciona idêntico.
  - Modo vetorial: preview agora renderiza `WhiteboardScene` em vez de quebrar.
- `bun run typecheck` / `bun run lint` / `bun run test` passam.
- Retorne mensagem final com: (a) resumo das mudanças, (b) saída dos 3 comandos, (c) decisões de implementação relevantes, (d) impacto em latência do preview.
