# Relatório de Auditoria: Correção do Flash no Speed Paint (QueueStaging)

**Data:** 2026-06-12
**Auditor:** Code Validator
**Tipo:** Revisão de mudança pós-correção
**Veredito:** ✅ Aprovado — sem ressalvas

---

## Escopo da revisão

- Arquivo modificado: `src/features/speed-paint/components/batch/QueueStaging.tsx`
- Mudança: `dropAnimation={null}` adicionado ao `<DragOverlay>` (linha 286)
- Stack: `@dnd-kit/react@0.4.0`, `@dnd-kit/dom@0.4.0`, React 19, TypeScript
- Focos cobertos: qualidade do código, tipagem, riscos (acessibilidade, regressão, performance), testes, outros usos de `DragOverlay` no projeto

## Achados

Nenhum achado negativo. A mudança é limpa, tipada e segura.

### [SUGGESTION] Nenhum outro DragOverlay do @dnd-kit precisa da mesma correção

- **Arquivo:** `src/features/speed-paint/components/batch/QueueStaging.tsx:286` (único)
- **Confidence:** 100/100
- **Categoria:** Architecture
- **Problema:** Verificar se havia outros `DragOverlay` do `@dnd-kit/react` no projeto que pudessem ter o mesmo flash.
- **Evidência:** Dois arquivos usam `DragOverlay` mas são componentes **custom** do projeto (`src/features/video-render/components/subtitle-editor/DragOverlay.tsx` e `src/features/video-render/components/SubtitleInlineEditor.tsx`), não o do `@dnd-kit/react`. A importação em `SubtitleInlineEditor.tsx` é `import { DragOverlay } from './subtitle-editor/DragOverlay'`.
- **Impacto:** Nenhum — não há outros locais que precisam da correção.
- **Sugestão:** Nenhuma ação necessária.

## Análise Detalhada

### 1. Qualidade do código

✅ **A mudança é limpa.** Exatamente 1 linha adicionada (`dropAnimation={null}`) no `<DragOverlay>` existente. Sem side effects, sem refatoração extra, sem imports adicionados ou removidos. Segue o princípio KISS e a mínima intervenção possível para corrigir o problema.

### 2. Tipagem

✅ **Perfeitamente tipado.** O JSDoc no `@dnd-kit/react/index.d.ts` (linhas 39-46) documenta explicitamente:

```typescript
/**
 * Customize or disable the drop animation that plays when a drag operation ends.
 *
 * - `undefined` – use the default animation (250ms ease)
 * - `null` – disable the drop animation entirely
 * - `{duration, easing}` – customize the animation timing
 * - `(context) => Promise<void> | void` – provide a fully custom animation function
 */
dropAnimation?: DropAnimation | null;
```

O campo `dropAnimation` é opcional e aceita `DropAnimation | null`. O valor `null` desabilita a animação — uso **intencional e documentado pela API**.

`bun run typecheck` e `bun run lint` passaram limpos, confirmando a compatibilidade.

### 3. Riscos

#### Acessibilidade

✅ **Sem impacto.** A `dropAnimation` é uma animação visual CSS que mostra o item "caindo" na posição final após o drop. Ela:

- Não afeta atributos ARIA — `aria-label`, `aria-roledescription="sortable"` e `aria-label` nos botões continuam intactos
- Não afeta o plugin `Accessibility` do `@dnd-kit/dom` (sistema ortogonal ao `Feedback` plugin que gerencia a dropAnimation)
- Não afeta o `KeyboardSensor` — navegação por teclado (Space/Enter para iniciar, Escape para cancelar, setas para mover) continua funcionando
- Usuários de screen reader não percebem animações visuais

A remoção da animação visual **não remove nenhum feedback essencial** — o `DragOverlay` continua renderizado (mostrando a imagem sendo arrastada) e o reordenamento no DOM acontece via `OptimisticSortingPlugin`.

#### Regressão em outros fluxos

✅ **Nenhum risco.** O único `DragOverlay` do `@dnd-kit/react` no projeto está neste arquivo (`QueueStaging.tsx`). Os outros usos de `DragOverlay` no projeto são:

| Arquivo | Origem | Risco |
|---------|--------|-------|
| `src/features/video-render/components/subtitle-editor/DragOverlay.tsx` | Componente custom MUI, não @dnd-kit | Nenhum |
| `src/features/video-render/components/SubtitleInlineEditor.tsx` | Importa o componente custom acima | Nenhum |

#### Performance

✅ **Melhora positiva.** A mudança:

- **Elimina o flash visual** — a `dropAnimation` default de 250ms criava inconsistência entre o snap-back do `OptimisticSortingPlugin` (instantâneo) e o re-render do React (após animação)
- **Remove delay desnecessário** — o `OptimisticSortingPlugin` já reposiciona os itens no DOM instantaneamente, então a animação de 250ms estava em conflito direto
- **Melhora performance percebida** — o usuário vê o resultado imediato do drop sem esperar a animação

### 4. Testes

✅ **Nenhum teste precisa ser atualizado.** O mock do `DragOverlay` no arquivo de testes (`tests/speed-paint/QueueStaging.component.test.tsx`, linha 41):

```typescript
DragOverlay: ({ children }: { children: ReactNode }) => <>{children}</>,
```

O mock atual:
- Ignora a prop `dropAnimation` (não a valida nem usa)
- Apenas renderiza `children` (stub funcional)
- Os 15 testes existentes cobrem comportamento (renderização, callbacks, reordenação), não animação visual

A mudança não altera o comportamento funcional do componente, portanto os testes continuam válidos e passando.

---

## O que parece saudável

- Documentação inline da API (`@dnd-kit/react/index.d.ts`) explicitamente suporta `null` para desabilitar animação
- Projeto tem 1 único ponto de uso do `DragOverlay` do @dnd-kit, facilitando auditoria
- `typecheck` e `lint` foram executados e passaram antes do merge
- Testes existentes mockam o `DragOverlay` de forma que a mudança não impacta
- Correção de 1 linha sem efeitos colaterais — intervenção cirúrgica

---

## Limites da revisão

- Não foram executados testes de integração com drag-and-drop real (mouse events simulados). O comportamento visual livre de flash só pode ser confirmado em ambiente de desenvolvimento com interação manual.
- A análise de acessibilidade foi feita por leitura de código e conhecimento da API do @dnd-kit, não por teste com leitor de tela real.
- Não há notebook do @dnd-kit no NotebookLM para consulta — a fonte autoritativa usada foi o próprio código-fonte dos tipos (node_modules).
