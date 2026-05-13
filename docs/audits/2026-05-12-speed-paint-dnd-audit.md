# Auditoria Técnica — Drag-and-Drop Reordering (Speed Paint)

**Data:** 2026-05-12  
**Escopo:** `@dnd-kit/react` v0.4.0 + `@dnd-kit/helpers` v0.4.0  
**Arquivos auditados:**
- `src/features/speed-paint/store/animationStore.ts`
- `src/features/speed-paint/components/batch/QueueStaging.tsx`
- `src/features/speed-paint/components/batch/BatchOrchestrator.tsx`
- `src/pages/SpeedPaintPage.tsx`
- `tests/speed-paint/animationStore.unit.test.ts`
- `tests/speed-paint/QueueStaging.component.test.tsx`

---

## Overall Verdict

**Needs fixes** — A implementação funciona para o caminho feliz, mas há bugs reais em edge cases (fila vazia, remoção durante staging) e gaps de acessibilidade que devem ser corrigidos antes do merge para produção. Nenhum crash crítico em operação normal.

---

## Findings

### 1. [WARNING] `arrayMove` com fila vazia corrompe estado silenciosamente

- **Arquivo:** `src/features/speed-paint/store/animationStore.ts:94`  
- **Confidence:** 95/100  
- **Categoria:** Bug  

**Problema:**  
A função `arrayMove` do `@dnd-kit/helpers` não faz bounds-checking. Quando chamada com uma fila vazia (`[]`) e índices fora dos limites (`0`, `1`), ela não lança erro, mas retorna `[undefined]`:

```js
// Implementação real do @dnd-kit/helpers@0.4.0
function arrayMove(array, from, to) {
  if (from === to) return array;
  const newArray = array.slice();
  newArray.splice(to, 0, newArray.splice(from, 1)[0]);
  // [] -> splice(0,1) -> [] ; splice(1,0,undefined) -> [undefined]
  return newArray;
}
```

O teste unitário afirma que "não quebra com fila vazia", mas na prática o estado `queue` fica poluído com `[undefined]`, o que causa falhas de renderização downstream (tentativas de acessar `img.id` em `undefined`).

**Evidência:**
```ts
// animationStore.ts:94
reorderQueue: (oldIndex, newIndex) =>
  set((state) => ({ queue: arrayMove(state.queue, oldIndex, newIndex) })),

// tests/speed-paint/animationStore.unit.test.ts:274-277
it('não quebra com fila vazia', () => {
  useAnimationStore.getState().clearQueue();
  expect(() => useAnimationStore.getState().reorderQueue(0, 1)).not.toThrow();
});
```

**Impacto:**  
Estado corrompido em edge case. Pode quebrar o grid de imagens ou o `BatchOrchestrator` em interações subsequentes.

**Recomendação:**
```ts
reorderQueue: (oldIndex, newIndex) =>
  set((state) => {
    if (state.queue.length === 0) return state;
    if (oldIndex < 0 || oldIndex >= state.queue.length) return state;
    if (newIndex < 0 || newIndex >= state.queue.length) return state;
    return { queue: arrayMove(state.queue, oldIndex, newIndex) };
  }),
```

E atualizar o teste para validar que a fila permanece `[]`, e não apenas que não dá throw.

---

### 2. [WARNING] `currentIndex` fica stale após remoção de itens no staging

- **Arquivo:** `src/features/speed-paint/components/batch/QueueStaging.tsx:189-191`  
- **Confidence:** 90/100  
- **Categoria:** Bug  

**Problema:**  
`handleRemove` filtra a `queue` sem ajustar `currentIndex`. Se o usuário remove itens da fila enquanto `currentIndex` aponta para uma posição que deixa de existir, o `BatchOrchestrator` encontra `queue[currentIndex] === undefined` e aborta o batch imediatamente.

**Evidência:**
```tsx
// QueueStaging.tsx:189-191
const handleRemove = (id: string) => {
  setQueue((prev) => prev.filter((img) => img.id !== id));
  // currentIndex não é ajustado
};
```

Cenário de reprodução:
1. Fila com 3 itens. Usuário processa o batch parcialmente (currentIndex = 2).
2. Batch para (volta para `idle`).
3. Usuário remove o item do meio.
4. `currentIndex` continua `2`, mas `queue.length` agora é `2`.
5. Ao iniciar um novo batch, `BatchOrchestrator.tsx:39` lê `queue[2]` → `undefined`, seta `batchMode` para `idle` e nada acontece.

**Impacto:**  
Batch falha silenciosamente após remoção de itens, mesmo com itens restantes válidos na fila.

**Recomendação:**  
Ajustar `currentIndex` no `handleRemove` (ou na action do store):
```ts
const handleRemove = (id: string) => {
  setQueue((prev) => {
    const index = prev.findIndex((img) => img.id === id);
    if (index === -1) return prev;
    const newQueue = prev.filter((img) => img.id !== id);
    const { currentIndex } = useAnimationStore.getState();
    if (currentIndex >= newQueue.length) {
      useAnimationStore.getState().setCurrentIndex(Math.max(0, newQueue.length - 1));
    } else if (index < currentIndex) {
      useAnimationStore.getState().setCurrentIndex(currentIndex - 1);
    }
    return newQueue;
  });
};
```
Alternativa mais limpa: encapsular a lógica de remoção no store (SRP):
```ts
removeFromQueue: (id: string) => set((state) => {
  const index = state.queue.findIndex((img) => img.id === id);
  if (index === -1) return state;
  const newQueue = state.queue.filter((img) => img.id !== id);
  const newIndex =
    state.currentIndex >= newQueue.length
      ? Math.max(0, newQueue.length - 1)
      : index < state.currentIndex
        ? state.currentIndex - 1
        : state.currentIndex;
  return { queue: newQueue, currentIndex: newIndex };
}),
```

---

### 3. [WARNING] Drag handle sem atributos ARIA adequados

- **Arquivo:** `src/features/speed-paint/components/batch/QueueStaging.tsx:71-93`  
- **Confidence:** 90/100  
- **Categoria:** Bug (Acessibilidade)  

**Problema:**  
O `IconButton` usado como drag handle não possui `aria-label`, `aria-roledescription` nem `tabIndex` explícito. O `handleRef` do dnd-kit v0.4.0 aplica atributos internos, mas sem um rótulo acessível o leitor de tela anuncia apenas "botão" sem contexto.

**Evidência:**
```tsx
<IconButton
  ref={handleRef}
  size="small"
  sx={{ ... }}
>
  <DragIndicatorIcon />
</IconButton>
```

**Impacto:**  
Violação WCAG 2.1 (4.1.2 Name, Role, Value). Usuários de leitor de tela não conseguem identificar o propósito do controle.

**Recomendação:**
```tsx
<IconButton
  ref={handleRef}
  size="small"
  aria-label={`Reordenar ${img.filename}`}
  aria-roledescription="sortable"
  sx={{ ... }}
>
  <DragIndicatorIcon />
</IconButton>
```

---

### 4. [SUGGESTION] Teste de DnD valida comportamento incorreto no caso vazio

- **Arquivo:** `tests/speed-paint/animationStore.unit.test.ts:274-277`  
- **Confidence:** 95/100  
- **Categoria:** Test Quality  

**Problema:**  
O teste `não quebra com fila vazia` verifica apenas a ausência de exceção (`not.toThrow()`), mas não valida o estado resultante. Como demonstrado no Finding 1, o estado fica corrompido com `[undefined]`.

**Evidência:**
```ts
it('não quebra com fila vazia', () => {
  useAnimationStore.getState().clearQueue();
  expect(() => useAnimationStore.getState().reorderQueue(0, 1)).not.toThrow();
});
```

**Impacto:**  
Falsa sensação de segurança. O teste passa enquanto o estado está inválido.

**Recomendação:**
```ts
it('não altera fila vazia', () => {
  useAnimationStore.getState().clearQueue();
  useAnimationStore.getState().reorderQueue(0, 1);
  expect(useAnimationStore.getState().queue).toEqual([]);
});
```

---

### 5. [SUGGESTION] Mock completo do dnd-kit testa apenas implementação, não integração

- **Arquivo:** `tests/speed-paint/QueueStaging.component.test.tsx:16-32`  
- **Confidence:** 85/100  
- **Categoria:** Test Quality  

**Problema:**  
O teste mocka 100% das APIs do `@dnd-kit/react` e `@dnd-kit/react/sortable`. O único comportamento real validado é que `onDragEnd` chama `reorderQueue` com os índices esperados. Não há teste de que os itens realmente mudam de posição visualmente, nem de que o `DragOverlay` renderiza corretamente.

**Evidência:**
```ts
vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children, onDragEnd }) => { ... },
  DragOverlay: ({ children }) => <>{children}</>,
}));

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({ ref: () => {}, handleRef: () => {}, ... }),
  isSortable: () => true,
}));
```

**Impacto:**  
Regressões na integração real com dnd-kit (ex: atualização de versão, mudança de API, quebra de comportamento de acessibilidade) não serão detectadas pelos testes atuais.

**Recomendação:**
Adicionar pelo menos um teste de integração leve usando `@testing-library/user-event` para simular drag-and-drop real (mouse down → move → mouse up) sem mockar o dnd-kit, ou usar a estratégia de `fireEvent` com os eventos nativos que o `PointerSensor` do dnd-kit espera. Se isso for complexo demais para o escopo atual, documentar a decisão técnica no arquivo de teste.

---

### 6. [SUGGESTION] `onDragEnd` sem tipagem explícita e `tsconfig.json` sem `strict`

- **Arquivo:** `src/features/speed-paint/components/batch/QueueStaging.tsx:199-209`, `tsconfig.json`  
- **Confidence:** 80/100  
- **Categoria:** TypeScript  

**Problema:**  
O handler `onDragEnd` é uma arrow function inline sem tipo explícito no parâmetro `event`. O `tsconfig.json` do projeto não habilita `strict: true`, o que reduz a segurança de tipos. O mock do teste usa `unknown` para o evento, sinalizando incerteza sobre o contrato real.

**Evidência:**
```tsx
<DragDropProvider
  onDragEnd={(event) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (isSortable(source)) {
      const { initialIndex, index } = source;
      ...
    }
  }}
>
```

**Impacto:**  
Atualizações futuras do `@dnd-kit/react` podem mudar a forma do evento sem que o TypeScript reclame. Risco de runtime errors após upgrade de dependência.

**Recomendação:**
Importar e usar o tipo `DragEndEvent` (se exportado) ou criar uma interface local:
```tsx
import type { DragEndEvent } from '@dnd-kit/react';

<DragDropProvider
  onDragEnd={(event: DragEndEvent) => { ... }}
>
```
E considerar adicionar `"strict": true` ao `tsconfig.json` (fora do escopo desta PR, mas crítico para o projeto).

---

## Notas de Arquitetura (não-bloqueantes)

1. **Proteção contra race condition em reorder durante batch:**  
   O `QueueStaging` só renderiza quando `batchMode === 'idle'` (`SpeedPaintPage.tsx:252`), o que impede que o usuário reordene a fila durante o processamento. Isso é uma proteção de UI, não de dados. Se a condição de renderização mudar no futuro, o `BatchOrchestrator` precisará de guardas adicionais.

2. **Cleanup de listeners do dnd-kit:**  
   O `DragDropProvider` é desmontado junto com o `QueueStaging` quando a fila esvazia ou o batch inicia. Não há indícios de memory leaks de event listeners. O `useSortable` retorna refs que são limpas pelo React unmount.

3. **Performance de re-render:**  
   O `QueueStaging` usa selectors atômicos do Zustand (bom). O `SortableQueueImage` recebe `index` como prop, que naturalmente muda para todos os itens durante reorder. Para filas pequenas (<50 itens), o impacto é negligenciável.

---

## Checklist de Correção

- [ ] Adicionar bounds-check em `reorderQueue` (fila vazia, índices inválidos)
- [ ] Criar action `removeFromQueue` no store que sincroniza `currentIndex`
- [ ] Adicionar `aria-label` e `aria-roledescription` no drag handle
- [ ] Corrigir teste de fila vazia para validar estado `[]`
- [ ] Tipar `onDragEnd` com `DragEndEvent`
- [ ] Adicionar comentário no teste de DnD explicando que é mock de implementação

---

*Auditor realizada com base no código real dos arquivos modificados. Nenhum bug crítico de crash em operação normal foi identificado.*
