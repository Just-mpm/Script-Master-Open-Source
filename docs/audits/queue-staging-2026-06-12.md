# Auditoria: QueueStaging.tsx

**Arquivo:** `src/features/speed-paint/components/batch/QueueStaging.tsx`  
**Data:** 2026-06-12  
**Versão do @dnd-kit/react:** 0.4.0  
**Status:** ✅ Aprovado

---

## Escopo da revisão

Leitura completa do arquivo (414 linhas), verificação de todos os imports contra o uso real, análise do JSX tree (abertura/fechamento), validação da lógica `onDragEnd` contra a API do `@dnd-kit/react` v0.4.0 (incluindo leitura dos `.d.ts` de `@dnd-kit/react`, `@dnd-kit/dom/sortable` e `@dnd-kit/abstract`), verificação dos parâmetros de `useSortable`, verificação da remoção de `TransitionGroup`/`Collapse`, consulta ao barrel de i18n e store de animação.

---

## Veredito

**Aprovado** — Nenhum problema crítico, warning ou bug encontrado. O componente segue corretamente a API do `@dnd-kit/react` v0.4.0 e a migração de `TransitionGroup`/`Collapse` foi concluída de forma limpa.

---

## Achados

### Nenhum achado crítico ou warning

Todos os 6 pontos da auditoria estão em conformidade.

---

## Verificações detalhadas

### 1. Imports — ✅ Corretos

| Import | Uso | Status |
|--------|-----|--------|
| `Box` | Linhas 46, 98, 117, 152, 265, 292, 309, 315 | ✅ |
| `Button` | Linhas 356, 373, 392 | ✅ |
| `Stack` | Linhas 218, 344 | ✅ |
| `Typography` | Linhas 162, 230, 233, 236, 326 | ✅ |
| `Paper` | Linha 209 | ✅ |
| `IconButton` | Linhas 71, 126 | ✅ |
| `Tooltip` | Linha 124 | ✅ |
| `Alert` | Linha 240 | ✅ |
| `PlayArrowIcon` | Linha 377 | ✅ |
| `VideocamIcon` | Linha 396 | ✅ |
| `CancelIcon` | Linha 358 | ✅ |
| `DeleteIcon` | Linha 147 | ✅ |
| `DragIndicatorIcon` | Linha 94 | ✅ |
| `alpha` | Linhas 49, 61, 76, 84, 89, 99, 104, 141, 159, 252, 295, 298, 306, 322, 367, 386 | ✅ |
| `DragDropProvider` | Linha 197 | ✅ |
| `DragOverlay` | Linha 286 | ✅ |
| `useSortable` | Linha 38 | ✅ |
| `isSortable` | Linha 201 | ✅ |
| `useAnimationStore` | Linhas 37, 182–187 | ✅ |
| `QueuedImage` | Linha 31 (type-only) | ✅ |
| `useLocale` | Linhas 36, 181 | ✅ |
| `pluralKey` | Linhas 234, 238, 242 | ✅ |
| Tokens (`ERROR_MAIN`, etc.) | 12 referências espalhadas | ✅ |
| `glassPanelSx` | Linha 212 | ✅ |
| `AnimationDurationSelector` | Linha 257 | ✅ |

**Nenhum import órfão.** Todos os 26 imports são utilizados.

### 2. JSX — ✅ Consistente

Estrutura de aninhamento verificada:
```
DragDropProvider (197–412)
 └─ Paper (209–411)
     ├─ Stack horizontal (218–263)
     │   ├─ Box com título + descrição + alerta (229–246)
     │   └─ Box com AnimationDurationSelector (248–262)
     ├─ Box grid de imagens (265–284)
     │   └─ SortableQueueImage × N (277–283)
     ├─ DragOverlay com render function (286–342)
     └─ Stack de botões (344–410)
         ├─ Button "Cancelar" (356–372)
         ├─ Button "Preview" (373–391)
         └─ Button "Exportar" (392–409)
```

Todos os pares de abertura/fechamento conferem. Nenhum fragmento solto ou tag não fechada.

### 3. Lógica `onDragEnd` — ✅ Correta (API v0.4.0)

```typescript
onDragEnd={(event) => {
    if (event.canceled) return;                        // ✅ cancelado: sai cedo
    const { source } = event.operation;                // ✅ DragOperationSnapshot.source
    if (isSortable(source)) {                          // ✅ type guard → SortableDraggable
        const { initialIndex, index } = source;        // ✅ getters do SortableDraggable
        if (initialIndex !== index) {                  // ✅ só reordena se mudou
            reorderQueue(initialIndex, index);         // ✅ chamada à store
        }
    }
}}
```

Contra a API real (`@dnd-kit/abstract` + `@dnd-kit/dom/sortable`):

- `DragEndEvent` = `{ operation: DragOperationSnapshot, canceled: boolean, ... }` ✅
- `DragOperationSnapshot.source` = `T | null` (onde T extends `Draggable`) ✅
- `isSortable(element: Draggable | null): element is SortableDraggable<any>` — type guard correto ✅
- `SortableDraggable.get initialIndex(): number` e `get index(): number` — ambos existem ✅
- `reorderQueue` na store recebe `(oldIndex: number, newIndex: number)` e usa `arrayMove` ✅

### 4. `DragDropProvider` + `useSortable` + `DragOverlay` — ✅ API correta

**`DragDropProvider`:**
- Envolve todo o conteúdo sortável ✅
- `onDragEnd` tem a assinatura `(event: DragEndEvent, manager?) => void` ✅
- Só renderiza quando `queue.length > 0` (early return na linha 194) ✅

**`useSortable`:**
```typescript
const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id: img.id,
    index,
    group: 'speed-paint-queue',
});
```
- `id: UniqueIdentifier` ✅ (img.id é `string`)
- `index: number` ✅ (obrigatório em `SortableInput`)
- `group: UniqueIdentifier` ✅ (opcional, string literal)
- Retorno: `{ ref, handleRef, isDragging, isDropTarget, ... }` — todos existem na interface `UseSortableInput` ✅
- `ref` no `Box` raiz e `handleRef` no `IconButton` de drag handle ✅

**`DragOverlay`:**
```typescript
<DragOverlay>
  {(source) => {
    if (!source) return null;
    const draggedImg = queue.find((img) => img.id === source.id);
    ...
  }}
</DragOverlay>
```
- `children` aceita `ReactNode | ((source: U) => ReactNode)` ✅
- `source` é do tipo `Draggable<T>`, com `.id: UniqueIdentifier` ✅
- Acesso a `source.id` e find no array `queue` por `img.id` (ambos strings) ✅

### 5. `group: 'speed-paint-queue'` — ✅ Correto

- `SortableInput.group` é `UniqueIdentifier | undefined` (`UniqueIdentifier = string | number`) ✅
- O valor `'speed-paint-queue'` agrupa todos os itens desta queue para ordenação isolada (não interfere com outros sortables na página) ✅
- O parâmetro é opcional, mas explicitamente definido — boa prática para evitar colisão com outros grupos de sortable ✅

### 6. Remoção de `TransitionGroup` + `Collapse` — ✅ Limpa

**Antes (removido):**
```typescript
// imports removidos:
// import Collapse from '@mui/material/Collapse';
// import { TransitionGroup } from 'react-transition-group';
```

**Depois (atual):**
```typescript
{queue.map((img, index) => (
    <SortableQueueImage key={img.id} img={img} index={index} />
))}
```

- Sem remnants de `TransitionGroup`, `<Collapse>`, `<CSSTransition>` ou `transitionGroup` no JSX ✅
- Sem props ou lógicas residuais referentes a animação de entrada/saída dos itens ✅
- A store `useAnimationStore` lida com `removeFromQueue` por id — a UI apenas some da grid sem animação de saída (padrão aceitável e intencional dado o drag-and-drop substituir a necessidade de animações de transição) ✅

---

## Sugestões

Nenhuma sugestão obrigatória. Apenas observações opcionais:

1. **`letterSpacing: 0` ausente em um dos Typography** — O `Typography` que exibe `img.filename` (linha 162–174, variante `caption`) não tem `letterSpacing: 0`, enquanto o título `queueTitle` (linha 230) tem. Não quebra funcionalidade, e a variante `caption` pode herdar do tema. Consistência cosmética opcional.

2. **`DragOverlay` sem `dropAnimation` explícito** — Usa o default (250ms ease). Se em testes o comportamento de drop parecer estranho, pode-se passar `dropAnimation={null}` para desabilitar ou customizar. Não é um problema agora.

---

## O que parece saudável

- Store `useAnimationStore` com validação de bounds no `reorderQueue` (protege contra índices fora do range)
- Tipagem forte: `QueuedImage` tem `id: string`, `useSortable` recebe `id` como `UniqueIdentifier` (compatível)
- `isSortable()` type guard garante tipo correto antes de acessar `initialIndex`/`index`
- Early return `if (queue.length === 0) return null` evita renderizar `DragDropProvider` vazio
- `handleRef` separado do `ref` para drag handle explícito (não arrasta pelo click em qualquer lugar do card)
- `stopPropagation()` no botão de remover item evita conflito com drag

---

## Limites da revisão

- Não foi possível verificar comportamento runtime (renderização, drag real, eventos de touch/pointer)
- Não foi testado o TypeScript build (`tsc -b`) — assume-se que a inferência genérica de `DragOverlay` funciona
- A remoção de `TransitionGroup`/`Collapse` foi confirmada por leitura de código e diff, mas o histórico de versões intermediárias não foi verificado
- `BatchOrchestrator.tsx` (parent) não foi lido para verificar como `QueueStaging` é montado/desmontado
