# Auditoria de Código — Fase 3: Composição Remotion Vetorial

**Data:** 2026-06-14
**Agent:** `code-validator` (Fase 3.5 — Gate obrigatório)
**Plano fonte:** `docs/plan/plano-speed-paint-vetorial-2026-06-14.md`
**Tracker:** `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`
**Stack:** React 19 + Remotion 4.0.448 + `@remotion/paths` + TypeScript 6

---

## Escopo da Revisão

| Arquivo | Status | Linhas |
|---------|--------|--------|
| `src/features/video-render/components/WhiteboardScene.tsx` | Novo (Fase 3.1) | 298 |
| `src/features/speed-paint/components/WhiteboardComposition.tsx` | Novo (Fase 3.2) | 66 |
| `src/features/speed-paint/store/speedPaintRenderController.tsx` | Modificado (Fase 3.2) | 1006 (adição ~50 linhas) |

**Focos auditados:** Determinismo Remotion, regra `getLength`, hooks React, tipagem, padrões do projeto, riscos técnicos do controller.

---

## Veredito

**✅ Aprovado — Sem issues críticas ou warnings.**

O código da Fase 3 segue rigorosamente as regras de determinismo do Remotion, utiliza `getLength`/`getPointAtLength` do `@remotion/paths` corretamente (sem `ref.current.getTotalLength()`), tem tipagem explícita sem `any`, e a integração com o controller é segura com type narrowing adequado.

---

## Confirmação dos Critérios

### 1. Determinismo por frame (FOCO)

| Critério | Status | Evidência |
|----------|--------|-----------|
| `useCurrentFrame()` como única fonte de tempo | ✅ | Linha 107: `const frame = useCurrentFrame()`; todo estado visual deriva daqui |
| `useMemo`/`useCallback` com deps estáveis | ✅ | Único `useMemo` com `[animation.paths]` — referência estável (Zustand + React.memo); zero `useCallback` |
| Nenhum `Math.random()` ou `Date.now()` no render | ✅ | `Math.sin()` no `Pencil` (linha 274) é determinístico (mesmo x/y → mesmo bob); `Date.now()` ausente |
| Nenhum `setTimeout`/`setInterval` no render | ✅ | Zero ocorrências nos 3 arquivos |
| Nenhuma mutação de ref durante render | ✅ | Zero `useRef` em WhiteboardScene e WhiteboardComposition |
| Props serializáveis para `renderMediaOnWeb` | ✅ | Props são objetos planos (`VetorialAnimation` + primitivos) — sem funções, símbolos ou classes |

**Algoritmo de render** (WhiteboardScene.tsx:109-236):
```
frame → interpolate(0..totalLength) → drawnLength
  → for each path: classifica (completo/parcial/não começado)
  → strokeDashoffset = pathLen - visibleLength
  → getPointAtLength() para posição da caneta
```

**Derivação:** `drawnLength`, `strokeDashoffset` e posição da caneta derivam da mesma fonte (`useCurrentFrame()`). Sem estado, sem effects, sem DOM refs — matemática pura.

### 2. Regra `getLength` (CRÍTICA)

| Critério | Status | Evidência |
|----------|--------|-----------|
| `ref.current.getTotalLength()` nos 3 arquivos | ✅ **ZERO** | Supergrep + grep confirmam 0 ocorrências em todo `src/` |
| `getLength()` do `@remotion/paths` no render? | ✅ **NÃO chamado** | Comentário na linha 20 explica a regra; `path.length` (pré-calculado) é usado |
| `getPointAtLength()` chamado corretamente | ✅ | Linha 33: `import { getPointAtLength } from '@remotion/paths'`; chamado 1-2x por frame apenas para path(s) ativo(s) (linhas 166, 182) |
| `getLength()` usado no vectorizer (Fase 1.2) | ✅ | Fora do escopo desta auditoria, mas confirmado via types — `VetorialPath.length` é pré-calculado |

### 3. Hooks React (caminho de render)

| Hook | WhiteboardScene | WhiteboardComposition | Controller (adições) |
|------|----------------|----------------------|----------------------|
| `useState` | ❌ Zero | ❌ Zero | ❌ Zero |
| `useEffect` | ❌ Zero | ❌ Zero | ❌ Zero |
| `useLayoutEffect` | ❌ Zero | ❌ Zero | ❌ Zero |
| `useRef` | ❌ Zero | ❌ Zero | ❌ Zero |
| `useReducer` | ❌ Zero | ❌ Zero | ❌ Zero |
| `useMemo` | ✅ 1x (pathLengths) | ❌ Zero | ❌ Zero |
| `useCallback` | ❌ Zero | ❌ Zero | ❌ Zero |
| `React.memo` | ✅ Envolve componente | ✅ Envolve componente | ❌ N/A |

### 4. Tipagem

| Critério | Status | Evidência |
|----------|--------|-----------|
| Zero `any` | ✅ | Grep confirmou 0 ocorrências nos 3 arquivos |
| Props com `animation: VetorialAnimation` | ✅ | `WhiteboardSceneProps` (linha 53-66), `WhiteboardCompositionProps` (linha 22-29) |
| Props com `paths: VetorialPath[]` | ✅ | Via `VetorialAnimation.paths` |
| `Pencil` tipado com `PencilProps` | ✅ | Interface `PencilProps` (linha 243-250) |
| `PathPoint` local | ✅ | Interface `PathPoint` (linha 41-44) — corresponde ao `Point` do `@remotion/paths` |
| `CanvasColor` | ✅ | `type CanvasColor = 'white' \| 'black'` (linha 47) |
| Controller `any` | ✅ **Zero** | `unknown` em index signatures (linhas 108-110), não `any` |

### 5. Padrões do projeto

| Padrão | Status | Observação |
|--------|--------|------------|
| Comentários em pt-BR | ✅ | Todos os JSDoc e comentários inline em português |
| Imports relativos (nunca `@/`) | ✅ | Todos os imports usam caminhos relativos `../../` |
| `createLogger` | ✅ | Controller usa (linha 263); WhiteboardScene não precisa (componente puro) |
| Types separados | ✅ | `src/features/speed-paint/types/vetorial.ts` já auditado na Fase 1.5 |

---

## Achados Detalhados

Nenhum achado do tipo CRITICAL ou WARNING foi encontrado. Seguem observações informativas:

### [SUGGESTION] `Pencil` usa `Math.sin()` para efeito de flutuação (não-determinístico por design)

- **Arquivo:** `src/features/video-render/components/WhiteboardScene.tsx:274`
- **Confidence:** 95/100
- **Categoria:** Architecture
- **Problema:** O efeito de "bob" (flutuação) usa `Math.sin(x * 0.1 + y * 0.1) * 2`, que é determinístico (mesmo x/y → mesmo resultado), mas depende das coordenadas da caneta — que por sua vez dependem de `getPointAtLength()`. Em teoria, se `getPointAtLength` retornar valores com pequenas diferenças de ponto flutuante entre renderizações (ex: emulador vs produção), o `Pencil` poderia ter posicionamentos sutilmente diferentes.
- **Evidência:**
  ```typescript
  const bob = Math.sin(x * 0.1 + y * 0.1) * 2;
  ```
- **Impacto:** Extremamente baixo — `getPointAtLength` do `@remotion/paths` é deterministicamente síncrono e retorna valores idênticos para os mesmos inputs. O efeito de flutuação é parte do estilo visual portado do `drawTool()` original do `SpeedPaintScene`.
- **Sugestão:** Manter como está. O efeito visual é intencional e matematicamente determinístico. Se houver problemas de consistência entre emulador e exportação, remover o `bob` ou usar `interpolate()` com `useCurrentFrame()` no lugar do `Math.sin()`.

### [SUGGESTION] `pathLengths` `useMemo` com `[animation.paths]` — otimização marginal

- **Arquivo:** `src/features/video-render/components/WhiteboardScene.tsx:112-115`
- **Confidence:** 85/100
- **Categoria:** Performance
- **Problema:** O `useMemo` de `pathLengths` com dependência `[animation.paths]` é tecnicamente correto, mas a computação que ele protege (`map(p => p.length)`) é O(N) com N sendo o número de paths (~50-500). Cada acesso a `p.length` é apenas leitura de propriedade numérica — custo irrelevante comparado ao resto da renderização.
- **Evidência:**
  ```typescript
  const pathLengths = React.useMemo<readonly number[]>(
    () => animation.paths.map((p) => p.length),
    [animation.paths],
  );
  ```
- **Impacto:** Desprezível. O `useMemo` não causa dano e mantém a intenção clara. Se o React Compiler estiver ativo (o que não é o caso neste projeto), o compilador faria esta otimização automaticamente.
- **Sugestão:** Manter. Documenta a intenção e previne recálculo se `animation.paths` for referencialmente estável (que é o caso via Zustand + React.memo).

### [INFO] Controller — `Date.now()` usado apenas fora do caminho de render

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:570, 697, 718`
- **Confidence:** 100/100
- **Categoria:** Architecture
- **Problema:** O controller usa `Date.now()` para timestamps de estado (`startedAt`, `lastProgressUpdateAt`) e nome de arquivo. Isso é esperado — estas chamadas estão no gerenciamento de estado do controller, **não no caminho de renderização do Remotion**.
- **Evidência:**
  - Linha 570: `startedAt: Date.now()` — estado de preparação
  - Linha 697: `` `speed-paint-${Date.now()}` `` — nome de arquivo do download (pós-render)
  - Linha 718: `lastProgressUpdateAt: Date.now()` — progresso do export
- **Impacto:** Nenhum. O render do Remotion (`invokeRenderMediaOnWeb`) não é afetado — recebe props puras e renderiza frames independentemente destes timestamps.

---

## O que Parece Saudável

- **WhiteboardScene.tsx** é um componente Remotion exemplar: determinístico, sem state/effects/refs, com JSDoc cobrindo o algoritmo, a regra de `getLength` e a procedência de cada parte.
- **Portabilidade do `drawTool()`** para SVG inline dentro do `<svg>` é elegante — elimina latência de sprite externo e mantém o mesmo estilo visual validado do `SpeedPaintScene`.
- **Estrutura de fallback da caneta** (Premissa #13): busca o último path completo para evitar que a caneta desapareça entre paths. Implementação O(N) no pior caso, mas tipicamente O(1) porque o último path processado é o último completo.
- **Controller** refatorado com a função genérica `invokeRenderMediaOnWeb<P>` que preserva o tipo concreto de Props e evita uniões problemáticas no `composition.component`.
- **Documentação** do batch mode vetorial não suportado (linhas 753-761) evita comportamento inesperado.

---

## Limites da Revisão

- Não foi verificado se os types `VetorialPath`, `VetorialAnimation` são importados corretamente pelo `vectorizer.ts` (Fase 1.2) — fora do escopo da Fase 3.
- Não foi verificado se `path.length` está sendo pré-calculado em `vectorizer.ts` — assumido correto pela Fase 1.5.
- Não foi verificado se o `WhiteboardComposition` é registrado como composição no Remotion Studio (fora do escopo da Fase 3).
- Não foi verificado o `canvasColor` default no `animationStore` — fora do escopo (Fase 1.3).
- Não foram executados `bun run lint`, `bun run typecheck` ou `bun run test` — a tarefa é estritamente análise estática.

---

## Gate de Saída

- [x] Li o contexto mínimo real ou reuni evidência suficiente?
- [x] Cada achado passou pela validação anti-falso-positivo?
- [x] Cada achado passou pelo confidence gate numérico?
- [x] Achados com confidence < 80 foram descartados?
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`?
- [x] Existe motivo real para escalar? **Não.**

---

**Status final:** ✅ Aprovado — pode prosseguir para Fase 4 (UI e Integração) e Fase 5 (Validação e Polish).
