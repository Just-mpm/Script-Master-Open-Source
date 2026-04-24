# Relatório de Testes — Hooks + Contexts (LOTE 1)

**Data:** 2026-04-24
**Agent:** vitest-specialist
**Escopo:** Testes unitários para `useKeyboardShortcuts` (novo hook), hooks seletivos do `AudioContext` (novos), e `React.memo` no `AssistantMessages`

## Resumo

| Métrica | Valor |
|---|---|
| Testes criados | 22 novos + 5 mantidos = 27 no escopo |
| Testes executados (suite completa) | 768 |
| Passou | 768 |
| Falhou | 0 |
| Falsos positivos corrigidos | 2 |
| Testes removidos | 2 |
| Taxa de confiabilidade | 100% |

## Testes Criados/Modificados

| Arquivo | Tipo | Status | Testes |
|---|---|---|---|
| `tests/hooks/useKeyboardShortcuts.unit.test.ts` | unit (NOVO) | passou | 22 |
| `tests/contexts/AudioContext.unit.test.tsx` | unit (MODIFICADO) | passou | 17 (12 existentes + 10 novos + removidos 5 duplicados) |
| `tests/assistant/AssistantMessages.component.test.tsx` | component (MODIFICADO) | passou | 25 (20 existentes + 5 novos) |

## Detalhamento por Arquivo

### `useKeyboardShortcuts.unit.test.ts` (NOVO — 22 testes)

| Grupo | Testes | Status |
|---|---|---|
| Ciclo de vida (mount/unmount) | 2 | ✅ |
| Ctrl+Enter (geração) | 7 | ✅ |
| Space → play/pause vídeo | 4 | ✅ |
| Space → toggle áudio | 2 | ✅ |
| Space → bloqueios por target | 7 | ✅ |

### `AudioContext.unit.test.tsx` (MODIFICADO — +10 novos)

| Grupo | Testes | Status |
|---|---|---|
| useAudioIsPlaying | 2 | ✅ |
| useAudioCurrentTime | 2 | ✅ |
| useAudioDuration | 2 | ✅ |
| useAudioProgress | 2 | ✅ |
| useAudioActiveId | 2 | ✅ |

Todos os hooks seletivos testados: valor inicial dentro do provider + erro fora do provider.

### `AssistantMessages.component.test.tsx` (MODIFICADO — +5 novos)

| Grupo | Testes | Status |
|---|---|---|
| React.memo — arePropsEqual | 5 | ✅ |

- Re-render com mesmas props
- Atualização `appliedMessageId` → "Aplicado"
- Atualização `savedToMemoryId` → "Salvo na memória"
- Toggle de `isStreaming` → cursor piscante
- Mudança de callback por referência

## Falsos Positivos Corrigidos

### FP-001: isGenerating bloqueia Ctrl+Enter
- **Teste:** `useKeyboardShortcuts.unit.test.ts` — "NÃO deve chamar onGenerate quando isGenerating=true"
- **Problema:** O código-fonte NÃO bloqueia Ctrl+Enter quando `isGenerating=true` — só bloqueia Space. O teste assumia comportamento que não existe.
- **Correção:** Teste removido com comentário explicativo.

### FP-002: Eventos de teclado em elementos focados
- **Teste:** Todos os 8 testes de "bloqueios por target" usavam `window.dispatchEvent()`, que seta `e.target=window` em vez do elemento focado.
- **Problema:** O handler lê `e.target.tagName` para decidir se bloqueia. Em jsdom, dispatching no window não propaga o target correto.
- **Correção:** Trocado para `element.dispatchEvent()` com bubbles, que propaga o evento para o handler no window com `e.target` correto.

## Testes Removidos

### REM-001: isGenerating bloqueia Ctrl+Enter
- **Motivo:** Comportamento não existe no código-fonte. Removido como falso positivo.

### REM-002: contentEditable bloqueia Space
- **Motivo:** `HTMLElement.isContentEditable` não funciona no jsdom (retorna `false` mesmo com `contentEditable='true'`). Limitação do ambiente, não do código.

## Observações

- O bloco `Space → bloqueios por target` cobre 7 dos 8 casos documentados (INPUT, TEXTAREA, BUTTON, A, SELECT, SUMMARY, DIV). O caso `contentEditable` foi documentado mas não testável no jsdom.
- Os hooks seletivos do AudioContext (`useAudioIsPlaying`, etc.) usam `useSyncExternalStore` com `getServerSnapshot` — os testes verificam o comportamento do client snapshot e a validação de contexto.
- O `arePropsEqual` do `MessageBubble` faz comparação por referência (Object.is) em todas as props — os testes verificam que mudanças em props booleanas (`isApplied`, `savedToMemoryId`, `isCurrentlyStreaming`) e callbacks (`onStopGeneration`) causam re-renderização.

## Conclusão

Suite completa com 768 testes passando (0 falhas). 22 testes novos para `useKeyboardShortcuts`, 10 novos para os hooks seletivos do `AudioContext`, e 5 novos para o `React.memo` do `AssistantMessages`. Dois falsos positivos corrigidos e dois testes removidos (um por comportamento inexistente, outro por limitação do jsdom). Taxa de confiabilidade: 100%.
