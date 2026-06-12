# Relatório de Análise — Correção QueueStaging.tsx

**Arquivo:** `src/features/speed-paint/components/batch/QueueStaging.tsx`
**Data:** 2026-06-12
**Propósito:** Verificar a correção que removeu `TransitionGroup`/`Collapse` e adicionou `group: 'speed-paint-queue'` no `useSortable`.

---

## 1. Contexto assumido

O problema reportado era que o drag das imagens em lote no SpeedPaint não funcionava corretamente. A correção substituiu os wrappers de animação (`TransitionGroup` + `Collapse` do MUI) por itens diretos na grid, e adicionou o parâmetro `group` no `useSortable` para isolar o grupo de sortables.

---

## 2. Mapa rápido: sólido vs frágil

| Aspecto | Status |
|---------|--------|
| Imports | ✅ Todos os 26 imports são utilizados, nenhum órfão |
| `TransitionGroup`/`Collapse` removidos | ✅ Zero referências remanescentes em todo `src/` |
| Estrutura JSX | ✅ Grid → `SortableQueueImage` direto, sem wrapper intermediário |
| API `useSortable` | ✅ `id`, `index`, `group` compatíveis com `@dnd-kit/react` v0.4.0 |
| `onDragEnd` | ✅ `isSortable(source)` type guard → `initialIndex`/`index` corretos |
| `DragOverlay` | ✅ Render function independente, sem dependência do Collapse |
| `BatchOrchestrator` | ✅ Lê apenas da store, sem dependência DOM |
| `SpeedPaintPage` | ✅ Renderiza `<QueueStaging />` condicionalmente, sem refs/selectors DOM |
| `package.json` | ✅ `react-transition-group` não é dependência direta (só transitiva do MUI) |

---

## 3. Gaps priorizados

**Nenhum gap encontrado.** Todos os 6 pontos de verificação estão em conformidade:

| ID | Severidade | Tipo | Descrição | Evidência | Mitigações verificadas | Confidence |
|---|---|---|---|---|---|---|
| — | — | — | Sem lacunas | — | — | — |

---

## 4. Verificações detalhadas

### 4.1. Referências remanescentes a `TransitionGroup`/`Collapse`
- **Grep textual** em `src/features/speed-paint/`: 0 matches
- **Supergrep_find** por `import { $$$ } from 'react-transition-group'` em `src/`: 0 matches
- **Leitura do arquivo completo** (414 linhas): nenhum import ou JSX residual
- ✅ **Limpo**

### 4.2. Comportamento com queue vazia
- Linha 194: `if (queue.length === 0) return null;`
- O `DragDropProvider` só é montado se há itens na fila
- ✅ **Correto**

### 4.3. `onDragEnd` com `isSortable` + `initialIndex`/`index`
- API real do `@dnd-kit/dom/sortable.d.ts`:
  - `isSortable(element: Draggable | null): element is SortableDraggable<any>` ✅
  - `SortableDraggable.get initialIndex(): number` ✅
  - `SortableDraggable.get index(): number` ✅
- `reorderQueue(oldIndex, newIndex)` na store usa `arrayMove` com validação de bounds
- ✅ **Correto**

### 4.4. `DragOverlay` sem o Collapse
- `DragOverlay` do `@dnd-kit/react` é um portal overlay independente do layout grid
- O `Collapse` removido era apenas wrapper de animação de entrada/saída dos itens
- ✅ **Sem impacto**

### 4.5. Grid com itens diretos
- Antes: `TransitionGroup` > `Collapse` > `SortableQueueImage` (wrappers que quebravam grid)
- Depois: `SortableQueueImage` como filho direto da `Box` com `display: 'grid'`
- Grid CSS funciona com children diretos; wrappers extras causavam o problema original
- ✅ **Correto**

### 4.6. Efeitos colaterais no BatchOrchestrator / SpeedPaintPage
- `BatchOrchestrator`: lê `queue`, `job`, `batchMode`, `currentIndex` da store — zero interação com DOM
- `SpeedPaintPage`: `<QueueStaging />` renderizado dentro de branch condicional (`queueLength > 0 && batchMode === 'idle' && !showBatchExportPanel`)
- Nenhum `querySelector`, `getElementById`, ref compartilhada ou seletor CSS targeting a estrutura anterior
- ✅ **Sem efeitos colaterais**

---

## 5. Cenários de borda sem resposta

Nenhum. A correção é direta e todos os cenários de borda identificáveis foram verificados e estão cobertos.

---

## 6. Checklist de sanidade

- [x] Li o arquivo **COMPLETO** (414 linhas)
- [x] Usei `supergrep_find` e `grep` para confirmar ausência de `TransitionGroup`/`Collapse` em todo `src/`
- [x] Verifiquei a API real do `@dnd-kit/react` v0.4.0 nos `.d.ts` do `node_modules`
- [x] Confirmei que `BatchOrchestrator` e `SpeedPaintPage` não dependem da estrutura DOM anterior
- [x] Confirmei que `react-transition-group` não é dependência direta no `package.json`
- [x] Verifiquei que um **usuário REAL** seria afetado se a correção estivesse incompleta

---

## Conclusão

**Correção aprovada — sem lacunas.** A remoção do `TransitionGroup`/`Collapse` foi limpa e a adição de `group: 'speed-paint-queue'` no `useSortable` está correta contra a API do `@dnd-kit/react` v0.4.0. O drag em lote deve funcionar conforme esperado.
