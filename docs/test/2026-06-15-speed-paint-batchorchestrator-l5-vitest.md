# Relatório de Testes — Speed Paint (L5 / RF-08 BatchOrchestrator)

**Data:** 2026-06-15
**Agent:** test
**Escopo:** Cobertura de testes para a propagação de `renderMode` + `vetorialPreset` no `BatchOrchestrator` (Leiva L5 do plano `docs/plan/speed-paint-vetorial-completo-plano-final.md`).

## Resumo

| Métrica | Valor |
|---|---|
| Testes criados | 3 |
| Testes executados | 19 (16 existentes + 3 novos) |
| Passou | 19 |
| Falhou | 0 |
| Falsos positivos corrigidos | 0 |
| Testes removidos | 0 |
| Taxa de confiabilidade | 100% |

### Validação obrigatória

| Comando | Resultado |
|---|---|
| `bun x vitest run tests/speed-paint/BatchOrchestrator.component.test.tsx` | ✅ 19/19 passando |
| `bun x tsc -b` | ✅ exit 0 |
| `bun x eslint tests/speed-paint/BatchOrchestrator.component.test.tsx src/features/speed-paint/components/batch/BatchOrchestrator.tsx` | ✅ exit 0 |

## Testes Criados

| Arquivo | Tipo | Status |
|---|---|---|
| `tests/speed-paint/BatchOrchestrator.component.test.tsx` (3 testes adicionados) | component | ✅ passou |

### Cenários cobertos

#### Bloco A — Propagação

| Teste | Cenário | Asserção principal |
|---|---|---|
| `CT-T05: propaga renderMode "vetorial" + vetorialPreset para generateStrokesFromImage` | Store tem `renderMode: 'vetorial'` e `vetorialPreset: 'artistic1'` quando o efeito processa o item | `expect.objectContaining({ renderMode: 'vetorial', vetorialPreset: 'artistic1', signal: AbortSignal })` |
| `propaga renderMode "mask" e força vetorialPreset=undefined mesmo se store tiver preset definido` | Store tem `renderMode: 'mask'` e `vetorialPreset: 'detailed'` (preset deve ser descartado quando modo é mask) | `expect.objectContaining({ renderMode: 'mask', vetorialPreset: undefined })` |

#### Bloco B — Race protection

| Teste | Cenário | Asserção principal |
|---|---|---|
| `CT-F47: trocar renderMode durante o processamento NÃO interrompe o job atual (race protection)` | Inicia com `vetorial` + `artistic1`, troca para `mask` + `curvy` via `setRenderMode` / `setVetorialPreset` durante o processamento | (1) chamada inicial tem valores ORIGINAIS (`vetorial`/`artistic1`); (2) chamada NÃO é refeita após a troca; (3) chamada continua com valores ORIGINAIS; (4) store realmente mudou (`renderMode: 'mask'`, `vetorialPreset: 'curvy'`) — race protection é apenas sobre o job em voo |

## Bugs Reais Confirmados

Nenhum. O código de produção (L5 já implementado) está correto e os testes confirmam o comportamento esperado.

## Falsos Positivos Corrigidos

Nenhum. Os 3 testes passaram de primeira na implementação (após alinhamento com a estratégia do plano: `useAnimationStore.setState({...})` para `renderMode`/`vetorialPreset` e setters para `setQueue`/`setBatchMode` — consistência com a base existente).

## Testes Removidos

Nenhum. Todos os 16 testes existentes continuam intactos e passando.

## Observações Técnicas

1. **Padrão de mocking:** `vi.mock('../../src/features/speed-paint/lib/imageProcessing')` no topo do arquivo intercepta `generateStrokesFromImage` (já existia). O `mockGenerateStrokesFromImage` é resetado em `beforeEach` e configurado com `() => new Promise(() => {})` por padrão — promise pendente que permite verificar a chamada sem resolver.

2. **Estratégia de store:** `useAnimationStore.setState({...})` (Zustand) para definir `renderMode`/`vetorialPreset` em lote. `useAnimationStore.getState().setQueue(...)` e `setBatchMode(...)` mantidos no padrão dos testes existentes. `setState` aceita `Partial<AnimationState>` via shallow merge (Zustand v5), type-safe sem `as`.

3. **Race protection validada:** o componente **NÃO** se inscreve em `renderMode` ou `vetorialPreset` (apenas em `job`, `queue`, `currentIndex`, `batchMode` e setters). Trocar esses campos não causa re-render nem re-execução do effect. O effect já capturou `renderMode`/`vetorialPreset` via `useAnimationStore.getState()` síncrono (linhas 102-108 do `BatchOrchestrator.tsx`).

4. **Warnings de `act`:** os 6 warnings de `An update to BatchOrchestrator inside a test was not wrapped in act(...)` que aparecem no stderr são de **testes existentes** (`renderiza erro quando job.status é failed...`, `mostra mensagem de avançar...`, `mostra mensagem de pulagem...`, `tem role="alert"...`, `ignora resultado atrasado...`, `limpar a fila neutraliza...`). **Nenhum dos 3 testes novos gera warnings** — todos os `setState` externos são wrapped em `act()`.

5. **Type safety:** `useAnimationStore.setState({ renderMode: 'vetorial', vetorialPreset: 'artistic1' })` compila sem `as` — TypeScript infere os literais a partir do tipo `SpeedPaintRenderMode` / `VetorialPreset`.

6. **Sem regressão em `clearQueue()`:** o `beforeEach` chama `useAnimationStore.getState().clearQueue()` que reseta `renderMode` → `'mask'` e `vetorialPreset` → `'artistic1'`. Os testes configuram os valores DEPOIS do `beforeEach`, dentro do body — sem dependência de ordem entre testes.

## Conclusão

Os 3 testes adicionados fixam o comportamento da L5 (RF-08) com 100% de confiabilidade. O `BatchOrchestrator` propaga corretamente `renderMode` e `vetorialPreset` da store, descarta o preset quando o modo é `mask`, e mantém o job em voo imune a trocas de modo durante o processamento (race protection via `processingIdRef` + leitura síncrona via `getState()`).

Suite de testes do `BatchOrchestrator`: **19/19 passando** em 2.73s.

## Próximo Passo

- (Opcional) Endurecer os 6 testes existentes que geram warnings de `act` envolvendo as mutações de store (`useAnimationStore.getState().setJob(...)` + `rerender(...)`) em `act()`. Não bloqueia a L5; melhoria de saúde de suite.
- Prosseguir com L6 (GATE) ou próximas leivas (L7-L11 do P2 — VideoPage selector + runBatchRender).
