# Relatório de Análise — `dropAnimation={null}` no Speed Paint QueueStaging

**Arquivo:** `src/features/speed-paint/components/batch/QueueStaging.tsx`
**Mudança:** Linha ~286, `<DragOverlay dropAnimation={null}>`
**Data:** 2026-06-12
**Propósito:** Desabilitar a dropAnimation default de 250ms do `@dnd-kit/react` que causava flash visual ao soltar imagens arrastadas na fila.

---

## 1. Contexto assumido

A dropAnimation default do `<DragOverlay>` no `@dnd-kit/react` anima o overlay (clone visual) da posição onde o item foi solto de volta à posição original do source em 250ms com easing `ease`. Em uma grid de reordenação de imagens onde o item source é imediatamente reposicionado via `reorderQueue()` no `onDragEnd`, essa animação cria um flash visual indesejado — o overlay "volta" para uma posição que já não é mais a do item, sobrepondo outros elementos.

---

## 2. Mapa rápido: sólido vs frágil

| Aspecto | Status | Evidência |
|---------|--------|-----------|
| Tipo da prop `dropAnimation` | ✅ Aceita `null` | `@dnd-kit/react@0.4.0` index.d.ts linha 47: `dropAnimation?: DropAnimation \| null`. JSDoc: "`null` – disable the drop animation entirely" |
| Documentação oficial | ✅ `null` é documentado | https://dndkit.com/react/components/drag-overlay/ — exemplo explícito: `<DragOverlay dropAnimation={null}>` |
| Tipo `DropAnimation` | ✅ `null` desabilita | `@dnd-kit/dom` index.d.ts linha 258: `type DropAnimation = DropAnimationOptions \| DropAnimationFunction`. Linha 269 e 279 confirmam que `null` no Feedback plugin desabilita |
| Único `DragOverlay` do `@dnd-kit` no projeto | ✅ Só no QueueStaging | Grep textual confirmou: `src/features/speed-paint/components/batch/QueueStaging.tsx` é o único arquivo que importa `DragOverlay` de `@dnd-kit/react`. O outro em `SubtitleInlineEditor.tsx` é componente customizado (`import { DragOverlay } from './subtitle-editor/DragOverlay'`) |
| Testes não quebram | ✅ Mock ignora `dropAnimation` | `tests/speed-paint/QueueStaging.component.test.tsx` linha 41: `DragOverlay: ({ children }: { children: ReactNode }) => <>{children}</>` — mock genérico que ignora todas as props exceto `children` |
| Testes de animação visual | ⚠️ Não existem | Nenhum teste de integção com `@testing-library/user-event` simulando arrasto. Seria necessário para validar visualmente |
| Acessibilidade | ✅ Sem impacto | `dropAnimation` é exclusivamente visual. Anúncios ARIA são gerenciados pelo plugin `Accessibility` do `@dnd-kit/dom`, separado do feedback visual |

---

## 3. Gaps priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas |
|---|---|---|---|---|---|---|
| GAP-01 | **MÉDIO** | Risco técnico | 88 | **Transição CSS de `transform` no `SortableQueueImage` conflita com o `useSortable`.** O `Box` com `ref={ref}` do `useSortable` (linha 46) tem `transition: 'transform 0.25s cubic-bezier(...)'` (linhas 58-59). O `useSortable` aplica `transform: translate()` via estilo inline durante o drag. A transição CSS faz o movimento ser suavizado (aniado) em vez de instantâneo. `dropAnimation={null}` mitiga o flash do overlay, mas a transição CSS no transform continua ativa e pode causar atraso/arrasto visual no item source durante reordenação rápida | Leitura do arquivo completo (linhas 45-68). A transição CSS está no mesmo elemento que recebe `ref` do `useSortable`. O `@dnd-kit` NÃO remove transições CSS do elemento — ele gerencia transforms inline, mas a transição CSS interfere | A transição de `transform` é a mesma duração da dropAnimation default (250ms). Se a dropAnimation removia o "pulo" visual, a transição CSS pode estar mascarando ou agravando o problema. Testar com `transition: 'border-color 0.25s, box-shadow 0.25s ease, opacity 0.2s ease'` (removendo `transform` da transição) |
| GAP-02 | **BAIXO** | Sugestão | 85 | **Discrepância de timing entre overlay e item source.** Com `dropAnimation={null}`, o overlay some instantaneamente. O item source leva 0.2s para voltar de `opacity: 0.3` para `opacity: 1` (transição CSS linha 59). Isso cria uma janela de ~200ms onde overlay já sumiu mas o item ainda está semi-transparente — flash sutil, mas perceptível em arrastos frequentes | Linha 57: `opacity: isDragging ? 0.3 : 1` + transição `opacity 0.2s ease` no mesmo elemento. Com `dropAnimation={null}`, o overlay desaparece imediatamente, mas o item original leva 200ms para "aparecer" completamente | Reduzir `opacity` transition para `0.1s` ou usar `transition: 'opacity 0s'` no `isDragging` para evitar delay visual |
| GAP-03 | **BAIXO** | Monitoramento | 95 | **Sem propagação para outros componentes.** A mudança é segura e isolada. Único `DragOverlay` do `@dnd-kit` no projeto. | Supergrep + grep confirmaram: nenhum outro `import { DragOverlay } from '@dnd-kit/react'` em todo `src/`. O `SubtitleInlineEditor` usa componente customizado. | N/A — lacuna já mitigada |

---

## 4. Verificações detalhadas

### 4.1. Tipo `dropAnimation` aceita `null`?
**Sim.** `@dnd-kit/react@0.4.0` (`node_modules/@dnd-kit/react/index.d.ts`):
```typescript
// Linhas 36-51
interface Props<T extends Data, U extends Draggable<T>> {
    // ...
    /**
     * Customize or disable the drop animation that plays when a drag operation ends.
     *
     * - `undefined` – use the default animation (250ms ease)
     * - `null` – disable the drop animation entirely
     * - `{duration, easing}` – customize the animation timing
     * - `(context) => Promise<void> | void` – provide a fully custom animation function
     */
    dropAnimation?: DropAnimation | null;
    // ...
}
```

Documentação oficial (https://dndkit.com/react/components/drag-overlay/):
```
{/* Disable the drop animation */}
<DragOverlay dropAnimation={null}>
  <div>No animation on drop</div>
</DragOverlay>
```

### 4.2. Outros `<DragOverlay>` do `@dnd-kit` no projeto?
**Grep textual** em `src/`:
- `src/features/speed-paint/components/batch/QueueStaging.tsx` — **único** que importa de `@dnd-kit/react`
- `src/features/video-render/components/SubtitleInlineEditor.tsx` — import de `'./subtitle-editor/DragOverlay'` (componente **customizado**, sem relação)

**Conclusão:** Sem propagação.

### 4.3. Transição CSS de transform no SortableQueueImage

O `Box` que recebe `ref={ref}` do `useSortable` (linha 46) tem:
```tsx
<Box
  ref={ref}
  sx={(theme) => ({
    // ...
    transition:
      'border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, opacity 0.2s ease',
    // ...
  })}
>
```

**Problema:** O `useSortable` do `@dnd-kit/react` aplica `transform: translate(Xpx, Ypx)` no elemento via inline style durante o drag. Se o elemento tem `transition: 'transform 0.25s'`, o movimento de arrasto será atrasado/animado em vez de instantâneo, e ao soltar pode causar overshoot visual.

**Recomendação:** Remover `transform` da transição CSS:
```tsx
transition:
  'border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, opacity 0.2s ease',
```

### 4.4. Trade-offs de acessibilidade
A dropAnimation é puramente visual. O `@dnd-kit` gerencia acessibilidade via:
- **Plugin `Accessibility`** — anúncios ARIA (screen reader) durante `dragstart`, `dragover`, `dragend`
- **`aria-roledescription="sortable"`** já presente no botão handle (linha 75)
- **Navegação por teclado** — `KeyboardSensor` incluso por default no `DragDropProvider`

Desabilitar a animação visual **não** afeta nenhum desses canais de acessibilidade.

### 4.5. Testes
O mock atual do `DragOverlay` (linha 41) é:
```tsx
DragOverlay: ({ children }: { children: ReactNode }) => <>{children}</>,
```

Esse mock ignora a prop `dropAnimation`. A mudança de `dropAnimation={null}` não quebra nada. Nenhum teste existente testa comportamento de animação visual (seria necessário `@testing-library/user-event` + waitFor para simular arrasto e verificar classes/styles).

### 4.6. Cache de imagens no DragOverlay
O overlay renderiza a imagem via `draggedImg.dataUrl` (linha 311). O `dataUrl` é uma data URI (base64 da imagem). Se a imagem for grande, o overlay pode ser lento para renderizar ao iniciar o drag. Isso não é causado pela mudança nem resolvido por ela, mas vale notar.

---

## 5. Cenários de borda sem resposta

1. **Multi-touch / arrasto simultâneo de dois itens** — O `PointerSensor` lida com um drag por vez. O `DragOverlay` renderiza apenas o source ativo. `dropAnimation={null}` não afeta esse comportamento.

2. **Keyboard drag (Enter/Space)** — Ao reordenar por teclado, não há dropAnimation visual. O `keyboardTransition` usa defaults diferentes (250ms `ease-in-out`). `dropAnimation={null}` não afeta o keyboard drag, pois a animação de transição de teclado é gerenciada pelo Feedback plugin separadamente.

3. **Mobile (touch)** — O `PointerSensor` gerencia touch nativamente. `dropAnimation={null}` funciona igual em touch — o overlay some instantaneamente ao soltar.

---

## 6. Checklist de sanidade

- [x] Li o arquivo **COMPLETO** (414 linhas)
- [x] Verifiquei os tipos do `DragOverlay` no `node_modules/@dnd-kit/react/index.d.ts`
- [x] Verifiquei o tipo `DropAnimation` no `node_modules/@dnd-kit/dom/index.d.ts`
- [x] Consultei a documentação oficial em https://dndkit.com/react/components/drag-overlay/
- [x] Usei `grep` e `supergrep_find` para confirmar que não há outros `DragOverlay` do `@dnd-kit` no projeto
- [x] Li os testes existentes (`QueueStaging.component.test.tsx`) — mock ignora `dropAnimation`
- [x] Verifiquei trade-offs de acessibilidade (anúncios ARIA, navegação por teclado)
- [x] Confirmei que um **usuário REAL** seria afetado se houvesse lacuna

---

## 7. Conclusão

**A mudança `dropAnimation={null}` está correta e segura.** É a forma oficial e documentada de desabilitar a animação de drop do `@dnd-kit/react@0.4.0`. Tipos aceitam `null`, documentação oficial mostra o mesmo pattern, e não há propagação para outros componentes.

**GAP-01 merece atenção:** A transição CSS de `transform` no `SortableQueueImage` (linhas 58-59) conflita com o `useSortable` e pode ser a causa raiz do flash visual, não apenas a dropAnimation. Recomenda-se remover `transform` da transição CSS para eliminar qualquer interferência com os transforms inline do `@dnd-kit`.

**GAP-02 é sugestão de refinamento:** Reduzir a transição de `opacity` de 0.2s para 0.1s ou instantânea enquanto `isDragging` está ativo eliminaria o pequeno gap entre o desaparecimento do overlay e o retorno total da opacidade do item source.

| ID | Severidade | Ação recomendada |
|---|---|---|
| GAP-01 | MÉDIO | Remover `transform` da `transition` CSS do `SortableQueueImage` (linhas 58-59) |
| GAP-02 | BAIXO | Reduzir `opacity` transition para 0.1s durante drag |
| GAP-03 | BAIXO | Monitoramento — sem ação necessária |

**Total: 2 gaps acionáveis (1 médio, 1 baixo).**
