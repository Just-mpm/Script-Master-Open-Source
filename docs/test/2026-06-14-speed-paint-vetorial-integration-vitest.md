# Relatório de Testes — Speed Paint · Integração Vetorial (Fase 5.1)
**Data:** 2026-06-14
**Agent:** test
**Escopo:** Testes de integração do pipeline vetorial end-to-end via `generateStrokesFromImage()` com `renderMode: 'vetorial'`. Cobre o caminho `dataUrl` → `Image` → canvas → `ImageData` → `vectorizeImage` → `VetorialAnimation` (via `processVetorialOnMainThread`).

## Resumo

| Métrica | Valor |
|---|---|
| Testes criados | 9 |
| Testes executados | 9 |
| Passou | 9 |
| Falhou | 0 |
| Falsos positivos corrigidos | 2 (ajuste de `vi.useFakeTimers` nos 2 testes de mask) |
| Testes removidos | 0 |
| Bugs reais confirmados | 0 |
| Taxa de confiabilidade | 100% |

## Testes Criados

| Arquivo | Tipo | Status |
|---|---|---|
| `tests/speed-paint/imageProcessing.vetorial.integration.test.ts` | integration | ✅ 9/9 passou |

### Cobertura por caso do handoff

| # | Caso | Coberto por |
|---|---|---|
| 1 | Tipo discriminado `VetorialAnimation` (tem `paths`, não tem `strokes`) | "retorna VetorialAnimation quando renderMode é vetorial" |
| 2 | Preset customizado (`'detailed'`) | "respeita vetorialPreset customizado" |
| 3 | Default do preset (`'artistic1'`) | "default preset é artistic1 quando não fornecido" |
| 4 | `onProgress` chamado com valores 0..1 e termina em 1 | "chama onProgress com valores 0..1 e termina em 1" |
| 5 | `AbortSignal` abortado rejeita com `AbortError` | "respeita AbortSignal — rejeita com AbortError se já abortado" |
| 6 | Retrocompatibilidade do modo mask (sem `renderMode` → `StrokeAnimation`) | "modo mask (default) retorna StrokeAnimation (retrocompatibilidade)" |
| 7 | `renderMode: 'mask'` explícito → `StrokeAnimation` | "modo mask com renderMode: 'mask' explícito também retorna StrokeAnimation" |
| 8 | `totalLength` = soma dos `length` de cada path | "totalLength é igual à soma dos length de cada path" |
| 9 | `totalDurationMs` = `max(2000, paths.length * 80)` | "totalDurationMs é >= 2000 (mínimo) e proporcional a paths.length" |

## Bugs Reais Confirmados

Nenhum. Todos os 9 testes passaram após o ajuste de `vi.useFakeTimers()` nos 2 testes de mask (ver "Falsos Positivos Corrigidos" abaixo).

## Falsos Positivos Corrigidos

### FP-001: testes de mask falhavam com "timers APIs are not mocked"

- **Testes afetados:**
  - "modo mask (default) retorna StrokeAnimation (retrocompatibilidade)"
  - "modo mask com renderMode: 'mask' explícito também retorna StrokeAnimation"
- **Problema:** os 2 testes de mask chamavam `vi.advanceTimersByTimeAsync(200)` para avançar o `setTimeout(50)` do `processOnMainThread` (sketch + reveal). Sem `vi.useFakeTimers()` ativo, o Vitest lançava `A function to advance timers was called but the timers APIs are not mocked`.
- **Correção:** adicionado `vi.useFakeTimers({ shouldAdvanceTime: true })` no início de cada teste de mask, com `vi.useRealTimers()` ao final — mesmo padrão usado em `imageProcessing.unit.test.ts:197,215,235,...`.

## Decisões Técnicas

### 1. Mock do canvas com pixels reais (fundo branco + quadrado preto)

O `imageProcessing.unit.test.ts` (mask) usa `MockImageData` com `Uint8ClampedArray` zerado. Isso funciona para o mask porque o `processOnMainThread` faz edge detection sintético + grade de paint dabs que **sempre** gera strokes, mesmo com imagem vazia.

Para o modo vetorial, isso seria fatal: o `imagetracerjs` precisa de contraste (pixels diferentes) para produzir paths. Com imagem totalmente branca ou preta, o vetorizador retorna 0 paths, fazendo os testes 8 e 9 (`totalLength`, `totalDurationMs`) ficarem flakies.

**Decisão:** o `MockImageData` deste arquivo espelha o `makeTestImageData` do `vectorizer.unit.test.ts` — fundo branco opaco + quadrado preto central. O `MockCanvasRenderingContext2D.getImageData()` retorna esse `MockImageData` enriquecido. Garante que `imagetracerjs` produza paths detectáveis em todos os testes.

### 2. Decisão Premissa #15 respeitada: testar pipeline, não componente Remotion

O plano original da Fase 5.1 previa "testes de snapshot/render do `WhiteboardScene`". Após auditoria (Premissa #15 do tracker), o `code-validator` confirmou que o projeto não tem testes de componentes Remotion — seria pioneirismo arriscado.

**Decisão:** o escopo foi reduzido para testar apenas o pipeline `processOnMainThreadVetorial`, mesmo padrão de `imageProcessing.unit.test.ts` (mask) e `vectorizer.unit.test.ts` (vectorizer). Os 9 testes deste arquivo cobrem o pipeline de ponta a ponta: dataUrl → Image → canvas → ImageData → vectorizeImage → VetorialAnimation.

### 3. Mocks de `Image` + `createElement('canvas')` (mesmo padrão do mask)

Reaproveitado o padrão de mock do `imageProcessing.unit.test.ts:96-152`:
- `vi.stubGlobal('Image', ...)` — controla `onload`/`onerror`/`width`/`height`/`src`
- `vi.spyOn(document, 'createElement')` — retorna `MockCanvas` para `tag === 'canvas'`, usa o jsdom real para outros

Isso evita o `Worker is not defined` do jsdom (o modo vetorial nem tenta criar Worker, mas o modo mask sim e cai no fallback `processOnMainThread`).

### 4. Modo mask usa `vi.useFakeTimers({ shouldAdvanceTime: true })` (não o modo vetorial)

O `processVetorialOnMainThread` é puramente assíncrono via `await vectorizeImage()` — sem `setTimeout`. Os testes do modo vetorial **não precisam** de fake timers.

Já o `processOnMainThread` (fallback do mask) usa `setTimeout(50)` para dar tempo da UI atualizar entre sketch e reveal. Os 2 testes de mask precisam de `vi.useFakeTimers({ shouldAdvanceTime: true })` para avançar esses timers sem esperar tempo real.

### 5. `shouldAdvanceTime: true` é importante

Sem essa flag, `vi.useFakeTimers()` congela `setTimeout`/`setInterval` mas permite que eles executem conforme o tempo real avança. Com `shouldAdvanceTime: true`, os timers falsos avançam junto com o tempo real — necessário porque o `setTimeout(50)` do `processOnMainThread` é acionado em `setTimeout(sketch, 50)` e `setTimeout(reveal, 50)`, e o teste precisa esperar esses callbacks executarem.

### 6. Validação dupla: `toHaveProperty` + type narrowing

Para os testes que validam o tipo discriminado (1, 6, 7, 8, 9), usei `toHaveProperty('paths')` e `not.toHaveProperty('strokes')` como guards primários. Quando o tipo precisa ser confirmado em runtime (8 e 9), usei `if ('paths' in animation) { ... } else { throw }` — type narrowing do TypeScript valida que `paths` está disponível dentro do bloco, e o `else` lança erro explícito se o tipo discriminado falhar.

### 7. `Math.max(2000, paths.length * 80)` validado

O teste 9 verifica tanto o piso absoluto (`>= 2000`) quanto a fórmula exata (`Math.max(2000, paths.length * 80)`). Isso garante que se a constante de 80ms por path mudar no futuro, o teste captura a mudança imediatamente.

## Execução

### Test focado
```bash
$ bun run test tests/speed-paint/imageProcessing.vetorial.integration.test.ts
✓ tests/speed-paint/imageProcessing.vetorial.integration.test.ts (9 tests) 247ms
Test Files  1 passed (1)
Tests       9 passed (9)
Duration    1.70s
```

### Typecheck
```bash
$ bun run typecheck
$ tsc -b
# 0 erros, 0 warnings
```

### Lint
```bash
$ bun run lint
$ eslint src eslint.config.js vite.config.ts
# 0 erros, 0 warnings
```

### Suíte completa (regressão zero)
```bash
$ bun run test
Test Files  149 passed (149)
Tests       2262 passed (2262)
Duration    107.82s
```

**Comparativo com a Fase 2.2 (vectorizer.unit.test.ts):**
- Antes: 148 test files, 2253 tests
- Depois: 149 test files (+1), 2262 tests (+9)

Suite cresceu exatamente 9 testes (= quantidade adicionada), sem regressões.

## Conclusão

Suite permanente de 9 testes de integração criada, 100% verde, sem bugs reais encontrados, sem regressões na suíte completa (2262/2262). O pipeline vetorial end-to-end (`generateStrokesFromImage` → `processVetorialOnMainThread` → `vectorizeImage` → `VetorialAnimation`) está validado nos 9 casos exigidos pelo handoff da Fase 5.1. Pronto para a Fase 5.2 (refactor de performance com `MAX_PATHS_PER_SCENE = 500`).
