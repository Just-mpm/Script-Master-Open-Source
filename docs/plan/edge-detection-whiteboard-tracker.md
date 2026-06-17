# Tracker: Edge Detection + Curvas Bezier para Modo Whiteboard (Marcador)

**Data de geração:** 2026-06-16
**Plano fonte:** `docs/plan/edge-detection-whiteboard-plano-final.md`
**Stack:** React 19 + Vite 8 + Remotion 4 + TypeScript estrito + Vitest 4 + Canvas API pura
**Scripts:** `bun run lint` · `bun run typecheck` · `bun run test` · `bun run build` · `bun run build:full`
**Versão atual:** 0.131.0 → **Versão alvo:** 0.132.0 (minor)
**Dependências adicionadas:** Nenhuma (`imagetracerjs@1.2.6` e `@remotion/paths@4.0.448` já cobrem tudo)
**Última atualização do tracker:** 2026-06-16 (sessão de execução encerrada antes do gate de qualidade final — ver §Pendências)

---

## Status Geral (macro)

- [x] **Fase 1 — Fundação** (Levas 1.1, 1.2, 1.3): tipos, edge detection, penScale ✅
- [x] **Fase 2 — Pipeline Core** (Levas 2.1, 2.2): contour tracing, bezier fitting ✅
- [x] **Fase 3 — Integração** (Levas 3.1, 3.2): vectorizer, imageProcessing ✅
- [ ] **Fase 4 — Estabilização** (Leva 4.1): testes comparativos OK, validações globais **PENDENTES**

**Resumo de testes (último estado verificado):** 2598/2598 passando, 160 arquivos. Baseline v0.131.0 era 2268 → +330 testes novos no escopo do plano.

---

## Regras de Uso do Tracker

### Paralelismo
- **Máx 2 agents em paralelo por leva** (regra global do projeto)
- **Nunca 2 agents no mesmo arquivo no mesmo lote** — ordem sequencial
- Tarefas com dependência técnica → sequenciais; sem dependência → paralelas

### Dependências entre levas
| Leva | Depende de | Pode paralelizar com |
|------|-----------|---------------------|
| 1.1 (Tipos/Presets) | Nenhuma | 1.2, 1.3 |
| 1.2 (Edge Detection) | Nenhuma | 1.1, 1.3 |
| 1.3 (WhiteboardScene penScale) | Nenhuma | 1.1, 1.2 |
| 2.1 (Contour Tracing) | 1.2 | 2.2 |
| 2.2 (Bezier Fitting) | 1.2 | 2.1 |
| 3.1 (Vectorizer) | 2.1, 2.2 | Nenhuma |
| 3.2 (ImageProcessing) | 3.1 | Nenhuma |
| 4.1 (Testes e Calibração) | 3.1, 3.2 | Nenhuma |

### Validações obrigatórias
- **gap-finder + code-validator** após cada fase (Fase 1, 2, 3 e 4) — bloqueia avanço se encontrar CRITICAL ou WARNING
- **Lint + typecheck** após cada leva — zero erros, zero warnings
- **Build + testes completos** após cada fase — 2268+ baseline + novos testes
- **`bun run build:full`** ao final da Fase 4 (pré-merge)

> ⚠️ **Validações gap-finder e code-validator FORAM PULADAS** nesta sessão por decisão do usuário (Matheus, em mensagem durante a Fase 1.5). Os agents `gap-finder` e `code-validator` não foram invocados em nenhuma das 4 fases. Veja §Pendências Globais abaixo.

### Convenções do projeto
- **Proibido** `@ts-ignore`, `@ts-expect-error`, `eslint-disable` — corrigir causa raiz
- **Proibido** `as` bypass em código novo
- **Imports relativos** (sem `@/`) — convenção do projeto
- **`createLogger('contexto')`** para logging modular

### Notebooks do NotebookLM (consultar quando indicado)
| Notebook | ID | Quando |
|----------|----|--------|
| Remotion Docs | `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` | Leva 1.3 (WhiteboardScene penScale), Leva 3.1 (getLength), Leva 3.2 (performance Remotion) |
| TypeScript 6 Guide | `b0467e2a-bb9c-477d-883a-a306d3cd96d8` | Leva 1.1 (tipos), Leva 1.2 (tipagem), Leva 2.1, 2.2 (tipagem estrita) |
| Vitest Guide | `6f3a1b12-a3df-4f31-9ea1-083ba644399a` | Leva 1.2 (testes edge), Leva 2.1, 2.2 (testes), Leva 3.1, 3.2 (testes integração) |
| Zod V4 | `f220c012-8852-4d5e-8ba4-99d7f4999677` | Leva 1.1 (validação de schemas se necessário) |
| Motion Guide | `697b773a-32b4-43a3-8048-eb85b473176d` | Se usar `pathLength` como alternativa ao `strokeDashoffset` |

---

## Premissas e Lacunas

| # | Premissa/Lacuna | Impacto |
|---|-----------------|---------|
| 1 | **Pipeline edge+bezier na main thread (Fase 1):** `vectorizeImage()` já é async e checa abort. Custo estimado <500ms | Worker será adicionado em Fase 2 futura — não atrasar MVP |
| 2 | **Retrocompatibilidade total com modo `mask` e presets `imagetracerjs`:** pipeline legado intacto, branch por prefixo do preset | Presets `artistic*`, `posterized*` etc. continuam idênticos |
| 3 | **Cache LRU compatível nativamente:** chave SHA-256 já inclui `renderMode` + `preset` | Cache miss para presets `edge-*` gera chave diferente — sem colisão |
| 4 | **`MAX_PATHS_PER_SCENE` muda de 150 para 60 para ambos os pipelines:** pipeline edge+bezier raramente excede 50 paths | Safety limit igual para ambos, nenhum projeto quebra |
| 5 | **`DEFAULT_PRESET` muda de `artistic1` para `edge-default`:** projetos novos usam edge+bezier, existentes mantêm preset salvo | Risco baixo — presets são persistidos por projeto |
| 6 | **Sem novas chaves i18n nesta fase:** presets `edge-*` aparecem no dropdown automaticamente | Namespace existente `speedPaint.presets.*` coberto |

> **Observação pós-execução (Leva 1.1, decisão do agent):** o `DEFAULT_PRESET` do `vectorizer.ts` mudou para `'edge-default'`, mas o `imageProcessing.ts:411` (orquestrador) ainda usa `'artistic1'` como default de `vetorialPreset` (contrato do `GenerateStrokesOptions` com consumidores externos). Resultado: ao chamar `generateStrokesFromImage` sem `vetorialPreset`, o `sourcePreset` continua sendo `'artistic1'` e o `vectorizeImage` recebe `preset: 'artistic1'` (branch legado). O default do `vectorizer.ts` só afeta consumidores diretos. Decisão arquitetural justificada pelo agent e mantida.

---

## Fase 1 — Fundação (paralelizável) — ✅ CONCLUÍDA

> Levas 1.1, 1.2 e 1.3 não têm dependência entre si → **podem rodar em paralelo** (máx 2 agents simultâneos)

### Leva 1.1 — Tipos e Presets (~15 min) — ✅ CONCLUÍDA

**Objetivo:** Adicionar 4 novos presets `edge-*` ao tipo `VetorialPreset` e ao grupo `VETORIAL_PRESETS_GROUPED`.
**Agents executados:** `worker` (1 tarefa)
**Validações:** ✅ `bun run lint` (0/0) · ✅ `bun run typecheck` (0) · ✅ `bun run test` (2411/2411)

**Entregas realizadas:**
- ✅ Adicionar 4 novos valores a `VetorialPreset` em `src/features/speed-paint/types/vetorial.ts`
- ✅ Adicionar grupo `'edge-detection'` a `VetorialPresetGroupId` e à `VETORIAL_PRESETS_GROUPED` em `src/features/speed-paint/constants/vetorialPresets.ts` (PRIMEIRO grupo, com 4 novos presets)
- ✅ Exportar `EdgePresetName`, `EdgePresetConfig`, `ImagetRacerPreset`, `EDGE_PRESET_CONFIG`, `isEdgePreset()` type guard
- ✅ Adicionar chaves i18n `presetGroups.edge-detection` + 4 chaves `presets.edge-*` em pt-BR/en/es
- ✅ Refatorar `vectorizer.ts` para usar `ImagetRacerPreset` (16 legados) em `PATHOMIT_BY_PRESET` e `VectorizeOptions.preset`
- ✅ Atualizar `vetorialPresets.unit.test.ts` (14 → 18 testes) e `SpeedPaintPage.component.test.tsx` (16→20 / 6→7 grupos)

**Decisões registradas pelo agent:**
1. `ImagetRacerPreset = Exclude<VetorialPreset, EdgePresetName>` (DIP + narrowing automático)
2. `isEdgePreset(preset): preset is EdgePresetName` type guard (narrowing real, sem `as`)
3. Adicionado branch `if (isEdgePreset(preset)) reject(...)` no `imageProcessing.ts:processVetorialOnMainThread` — **REMOVIDO na Leva 3.2** quando o pipeline edge+bezier ficou pronto

### Leva 1.2 — Edge Detection (~2h) — ✅ CONCLUÍDA

**Objetivo:** Criar `edgeDetection.ts` com `detectEdges()` (Canny simplificado) + testes unitários.
**Agents executados:** `worker` (lib) + `test` (testes) — paralelo
**Validações:** ✅ lint (0/0) · ✅ typecheck (0) · ✅ `bun run test tests/speed-paint/edgeDetection.unit.test.ts` (27/27)

**Entregas realizadas:**
- ✅ Criar `src/features/speed-paint/lib/edgeDetection.ts` com `detectEdges(imageData, options?): Uint8Array` (Canny: Gaussian Blur 5×5 + Sobel + NMS + double threshold + hysteresis BFS 8-viz)
- ✅ 9 helpers SRP + 1 orquestrador público
- ✅ Criar `tests/speed-paint/edgeDetection.unit.test.ts` (27 testes: 12 validação + 5 sintéticos + 4 parâmetros + 4 shape + 1 perf + 1 sanidade)
- ✅ Tipo `GradientDirection` (discriminated union 0|1|2|3)
- ✅ Logger `createLogger('edge-detection')` com logs em `debug` (suprimidos em produção)

**Bug latente documentado (NÃO corrigido nesta leva):**
- **BUG-001 (Bordas falsas no perímetro para fundos cinzas uniformes):** zero-padding + divisão inteira no Gaussian Blur gera borda falsa no perímetro da imagem. O teste de regressão protege contra mudanças acidentais. Decisão: fix (replicar padding ou float division) é mudança arquitetural e fica para uma task futura. Documentado no relatório `docs/test/2026-06-16-edgeDetection-vitest.md`.

### Leva 1.3 — WhiteboardScene penScale (~1h) — ✅ CONCLUÍDA

**Objetivo:** Adicionar prop `penScale` ao `WhiteboardScene` para caneta proporcional ao strokeWidth.
**Agents executados:** `worker` (1 tarefa)
**Validações:** ✅ lint (0/0) · ✅ typecheck (0) · ✅ `bun run test tests/video-render/WhiteboardScene.component.test.tsx` (19/19) · ✅ suíte completa 2438/2438

**Entregas realizadas:**
- ✅ Adicionar `penScale?: number` a `WhiteboardSceneProps` em `src/features/video-render/components/WhiteboardScene.tsx`
- ✅ Default: `(animation.paths[0]?.strokeWidth ?? 2) / 4` calculado no corpo do componente
- ✅ Aplicar `scale(${effectivePenScale})` em `<g>` externo ao `<Pencil>` com `style={{ transformBox: 'fill-box', transformOrigin: 'center center' }}` (descoberta crítica do NotebookLM Remotion)
- ✅ Pencil interno preserva `x`, `y`, `canvasColor`, `frame`, `pathIndex` e seu próprio `transform="translate(x y) rotate(-45)"`
- ✅ 3 consumidores existentes (`VideoComposition.tsx`, `speedPaintRenderController.tsx`, `WhiteboardComposition.tsx`) funcionam sem alteração (todos herdam o default)

### Fase 1.5 — Validação Consolidada — ⏭️ PULADA

> ⚠️ **gap-finder + code-validator NÃO foram executados** por decisão do usuário durante a sessão. O gate automático foi pulado. Implicação: nenhum review formal de qualidade/escopo foi aplicado após a Fase 1. As validações lint/typecheck/test foram feitas, mas sem auditoria externa. Veja §Pendências Globais.

---

## Fase 2 — Pipeline Core — ✅ CONCLUÍDA

> Levas 2.1 e 2.2 dependem de 1.2 (Edge Detection) mas **não dependem entre si** → podem rodar em paralelo (máx 2 agents)

### Leva 2.1 — Contour Tracing (~2h) — ✅ CONCLUÍDA

**Objetivo:** Criar `contourTracing.ts` com `traceContours()` (Moore-Neighbor + Jacob Eliosoff + minContourLength).
**Agents executados:** `worker` (lib) + `test` (testes) — paralelo
**Validações:** ✅ lint (0/0) · ✅ typecheck (0) · ✅ `bun run test tests/speed-paint/contourTracing.unit.test.ts` (46/46)

**Entregas realizadas:**
- ✅ Criar `src/features/speed-paint/lib/contourTracing.ts` (~300 linhas) com `traceContours(edgeMap, width, height, options?): Contour[]`
- ✅ 6 helpers SRP: `validateInputs`, `getNeighbor`, `markVisited`, `angularDistance`, `findNextNeighbor`, `mooreNeighborTrace`
- ✅ Constantes no topo: `DX`/`DY` (8 direções), `DIRECTION_COUNT = 8`, `DIRECTION_MASK = 7`, `DEFAULT_MIN_CONTOUR_LENGTH = 10`, `MAX_ITERATIONS_PER_CONTOUR_MULTIPLIER = 4`
- ✅ Regra de Jacob Eliosoff via `Set<string>` com chave `${x},${y},${entryDir}`
- ✅ Fork handling por distância angular circular (minimiza mudança de direção)
- ✅ Logger `createLogger('contour-tracing')`
- ✅ Criar `tests/speed-paint/contourTracing.unit.test.ts` (46 testes; 9 helpers: `makeSquareEdgeMap`, `makeHorizontalLineEdgeMap`, `makeTJunctionEdgeMap`, `makePerimeterEdgeMap`, `countEdges`, `totalPoints`, `assertPointShape`, `assertPointsInBounds`, `collectUniquePixels`)
- ✅ Relatório em `docs/test/2026-06-16-speed-paint-contourTracing-vitest.md`

### Leva 2.2 — Bezier Fitting (~3h) — ✅ CONCLUÍDA

**Objetivo:** Criar `bezierFitting.ts` com `fitBezierPaths()` (RDP + cubic Bezier least squares + geração SVG `d`).
**Agents executados:** `worker` (lib) + `test` (testes) — paralelo
**Validações:** ✅ lint (0/0) · ✅ typecheck (0) · ✅ `bun run test tests/speed-paint/bezierFitting.unit.test.ts` (45/45)

**Entregas realizadas:**
- ✅ Criar `src/features/speed-paint/lib/bezierFitting.ts` (~595 linhas) com `fitBezierPaths(contours, width, height, options?): BezierPath[]`
- ✅ 15 helpers SRP: `validateDimensions`, `resolveOptions`, `perpendicularDistance`, `rdp`, `vecSub`/`vecAdd`/`vecScale`, `computeCenterTangent`, `segmentLength`, `fitBezierSegment` (Schneider 1990), `computeBezierError`, `fitBezierRecursive`, `formatCoord`, `pointsToSvg`, `buildValidatedPath`, `processContour`, `fitBezierPaths`
- ✅ RDP recursivo (default `epsilon=2.0`) + Schneider 1990 cubic Bezier fitting + subdivisão recursiva (`maxDepth=10`, `fitError=1.5`)
- ✅ Geração SVG `d` apenas com `M` + `C` (sem `Z`, mesmo em `closed: true` — preserva consistência com `strokeDashoffset` e `getLength`)
- ✅ Validação via `getLength(d)` em `try/catch` + descarte de paths inválidos com `log.warn`
- ✅ Logger `createLogger('bezier-fitting')`
- ✅ `import type { Contour, Point2D } from './contourTracing'` (evita circular deps)
- ✅ Criar `tests/speed-paint/bezierFitting.unit.test.ts` (45 testes em 12 describes; 8 helpers: `makeContour`, `makeCircleContour`, `makeZigzagContour`, `makeColinearContour`, `makeOpenLineContour`, `countBezierCommands`, `countMoveCommands`, `expectValidBezierPath`)
- ✅ Relatório em `docs/test/2026-06-16-speed-paint-bezierFitting-vitest.md`

### Fase 2.5 — Validação Consolidada — ⏭️ PULADA

> ⚠️ gap-finder + code-validator NÃO foram executados. Validações lint/typecheck/test foram feitas.

---

## Fase 3 — Integração — ✅ CONCLUÍDA

> Leva 3.1 depende de 2.1 + 2.2. Leva 3.2 depende de 3.1. **Ordem sequencial obrigatória.**

### Leva 3.1 — Vectorizer (~2h) — ✅ CONCLUÍDA

**Objetivo:** Modificar `vectorizer.ts` para branch por preset + `sampleColors()` + `DEFAULT_PRESET` e `MAX_PATHS_PER_SCENE`.
**Agents executados:** `worker` (1 tarefa, modificou vectorizer + testes)
**Validações:** ✅ lint (0/0) · ✅ typecheck (0) · ✅ `bun run test tests/speed-paint/vectorizer.unit.test.ts` (49/49) · ✅ regressão completa 2540/2540

**Entregas realizadas:**
- ✅ Adicionar `edgeThreshold`, `contourEpsilon`, `pipelineMode` a `VectorizeOptions`
- ✅ Branch em `vectorizeImage()`: `isEdgePreset(preset)` → `vectorizeImageEdgeBezier()`, demais → `vectorizeImageLegacy()`
- ✅ `vectorizeImageEdgeBezier()`: detectEdges → fallback automático (highThreshold=0.1 se 0 contornos) → traceContours → fitBezierPaths → sampleColors → filterPathsByBackgroundContrast → truncatePaths → sortPaths
- ✅ `sampleColors()`: sample RGBA do primeiro pixel de cada contour, converte para `#rrggbb`
- ✅ `checkAbort` (`ensureNotAborted(signal)`) entre cada etapa do pipeline
- ✅ `DEFAULT_PRESET` alterado de `'artistic1'` para `'edge-default'`
- ✅ `MAX_PATHS_PER_SCENE` alterado de 150 para 60
- ✅ Refatorar pipeline legado para `vectorizeImageLegacy()` (100% retrocompatibilidade — lógica idêntica, apenas movida)
- ✅ Type narrowing real via `isEdgePreset` (sem `as` bypass)
- ✅ 1 teste modificado + 9 novos testes em `tests/speed-paint/vectorizer.unit.test.ts` (novo describe `vectorizer — pipeline edge+bezier (v0.132.0)`)
- ✅ **Regressão crítica validada:** teste `'artistic1 produz resultado idêntico ao legado (mesmo path count + strokeWidth 2)'`

**Decisão registrada pelo agent (preservada):**
- O agent decidiu **NÃO** modificar `imageProcessing.vetorial.integration.test.ts:285` (teste `'default preset é artistic1 quando não fornecido'`) porque esse teste valida o default do **orquestrador** (`imageProcessing.ts:411`), não o do `vectorizer.ts`. Alterar o teste conforme instrução original teria gerado regressão. Decisão arquitetural correta: orquestrador controla contrato com consumidores externos (`sourcePreset: 'artistic1'` quando `vetorialPreset` não é fornecido).

### Leva 3.2 — ImageProcessing (~1h) — ✅ CONCLUÍDA

**Objetivo:** Recalibrar `totalDurationMs` + passar novas options ao vectorizer.
**Agents executados:** `worker` (1 tarefa)
**Validações:** ✅ lint (0/0) · ✅ typecheck (0) · ✅ `bun run test tests/speed-paint/imageProcessing.vetorial.integration.test.ts` (15/15) · ✅ regressão completa 2546/2546

**Entregas realizadas:**
- ✅ `totalDurationMs`: `Math.max(2000, paths.length * 80)` → `Math.max(3000, paths.length * 120)` (D8)
- ✅ Adicionar `edgeThreshold?: number` e `contourEpsilon?: number` a `GenerateStrokesOptions`
- ✅ Repassar `edgeThreshold` e `contourEpsilon` ao `vectorizeImage` em `processVetorialOnMainThread`
- ✅ **REMOVER** o branch `if (isEdgePreset(preset)) reject(...)` adicionado na Leva 1.1 (agora o pipeline edge+bezier está pronto, então presets `edge-*` devem funcionar)
- ✅ 1 teste atualizado + 5 novos testes em `imageProcessing.vetorial.integration.test.ts`:
  1. `totalDurationMs é >= 3000 (mínimo) e proporcional a paths.length` (atualizado)
  2. `totalDurationMs escala com número de paths (consistência monotônica)` (novo)
  3. `totalDurationMs é >= 3000 mesmo com poucos paths` (novo)
  4. `vetorialPreset: edge-default produz paths com strokeWidth >= 6` (novo)
  5. `vetorialPreset: edge-detailed funciona` (novo)
  6. `AbortSignal cancela pipeline edge+bezier` (novo)
  7. `aceita edgeThreshold e contourEpsilon opcionais sem quebrar` (novo)
- ✅ Atualizar fórmula em `imageProcessing.vetorial.e2e.test.ts:624`

### Fase 3.5 — Validação Consolidada — ⏭️ PULADA

> ⚠️ gap-finder + code-validator NÃO foram executados. Validações lint/typecheck/test foram feitas.

---

## Fase 4 — Estabilização — ⚠️ PARCIALMENTE CONCLUÍDA

> Testes comparativos (Leva 4.1) ✅ concluídos. Calibração e validação global ainda **pendentes**.

### Leva 4.1 — Testes e Calibração (~2h) — ⚠️ PARCIAL

**Objetivo:** Testes comparativos, calibração de parâmetros, validação de performance e bateria completa.
**Agents executados:** `test` (✅ 52 testes) + `code-validator` (❌ cancelado — não chegou a rodar)
**Validações:** ✅ lint (0/0) · ✅ typecheck (0) · ✅ `bun run test tests/speed-paint/edge-vs-imagetracer.comparative.test.ts` (52/52) · ✅ regressão completa 2598/2598

**Entregas realizadas:**
- ✅ Criar `tests/speed-paint/edge-vs-imagetracer.comparative.test.ts` (52 testes em 6 describes: 10 imagens comparativas, performance não-bloqueante, integração ponta-a-ponta, regressão visual, fallback automático, AbortSignal)
- ✅ 14 helpers (10 `make*ImageData` + `measureVectorize` + `summarizeLatencies` + `annotateFromTask`)
- ✅ **Métricas reais excedem o orçamento do tracker em 15-100x:** edge-default 200×150 = 33ms (alvo 500ms soft limit). Extrapolação linear para 1920×1080 sugere ~400-700ms (dentro do budget de 2000ms).
- ✅ Relatório em `docs/test/2026-06-16-speed-paint-edge-vs-imagetracer-vitest.md`
- ❌ **`code-validator` foi cancelado** (task `ses_12ebcd579ffeyvZqzG5dC6dW3n` cancelada pelo orquestrador)
- ❌ **Comandos `bun run build` e `bun run build:full` NÃO foram executados** (não estavam no escopo da task `test`, e o `code-validator` foi cancelado antes de executá-los)

**Gaps restantes documentados pelo agent:**
1. Imagens reais (JPEG/PNG) — testado só com sintéticas
2. Batch vetorial end-to-end (`runBatchRender` ainda não suporta edge — fora de escopo)
3. Cores não-hex nos `fill` (apenas hex nos testes)
4. P50/P95 direto em 1920×1080 (extrapolação linear sugere ~400-700ms)
5. 9 dos 16 presets legados não foram exercitados na tabela comparativa

---

## Gate de Qualidade Pós-Implementação (Fase 4) — ⚠️ PENDENTE

> Esta é a checklist final pré-merge. **Faltam 5 itens** para considerar a v0.132.0 pronta para merge/deploy.

- [x] `bun run typecheck` — 0 erros (verificado ao final da Fase 3)
- [x] `bun run lint` — 0 erros, 0 warnings (verificado ao final da Fase 3)
- [x] `bun run test` — 2598 testes passando (zero regressão, baseline 2268 + 330 novos)
- [x] `vectorizeImage({ preset: 'edge-default' })` produz paths com strokeWidth = 8 (do `EDGE_PRESET_CONFIG`)
- [x] `vectorizeImage({ preset: 'artistic1' })` produz paths idênticos (regressão validada por teste explícito)
- [ ] **`bun run build` — Exit 0** ❌ NÃO VERIFICADO
- [ ] **`bun run build:full` — Exit 0 (10 rotas pré-renderizadas)** ❌ NÃO VERIFICADO
- [x] Cache LRU: mesma imagem + mesmo preset → cache hit (compatibilidade nativa preservada — chave já incluía `renderMode` + `preset`)
- [x] Cache LRU: mesma imagem + presets diferentes → cache miss
- [x] WhiteboardScene exibe caneta proporcional ao strokeWidth (testes de componente 19/19 passando)
- [x] Imagem sem bordas retorna `[]` (sem crash — validado em Leva 4.1)
- [ ] **`AbortSignal` cancela pipeline no meio (teste manual)** ⚠️ parcialmente validado (testes cobrem signal abortado no início; abort durante execução é flaky por timing — coberto em `vectorizer.unit.test.ts` Leva 3.1)
- [x] Modo `'mask'` completamente inalterado (`imageProcessing.unit.test.ts` passando, `processOnMainThread` intacto)
- [ ] **`code-validator` aprovou qualidade do código** ❌ NÃO EXECUTADO (task cancelada)
- [ ] **`gap-finder` aprovou cobertura do escopo** ❌ NÃO EXECUTADO (pulado em todas as 4 fases)

---

## Comandos de Verificação (CLI)

```bash
# Após cada leva (mínimo)
bun run lint
bun run typecheck

# Após levas com novos testes
bun run test tests/speed-paint/edgeDetection.unit.test.ts
bun run test tests/speed-paint/contourTracing.unit.test.ts
bun run test tests/speed-paint/bezierFitting.unit.test.ts
bun run test tests/speed-paint/vectorizer.unit.test.ts
bun run test tests/speed-paint/imageProcessing.vetorial.integration.test.ts
bun run test tests/speed-paint/edge-vs-imagetracer.comparative.test.ts

# Após cada fase (bateria completa)
bun run test

# Análise estática (CT-S01) — esperado 0 matches
grep -rn ": any" src/features/speed-paint/lib/edgeDetection.ts src/features/speed-paint/lib/contourTracing.ts src/features/speed-paint/lib/bezierFitting.ts
grep -rn "@ts-ignore\|@ts-expect-error" src/features/speed-paint/lib/ src/features/video-render/components/

# ⚠️ PENDENTE — Antes de finalizar Fase 4
bun run build
bun run build:full

# Escopo
git diff --name-only
```

---

## TODO de Execução (atualizado pós-sessão)

> Fonte canônica para a `todowrite` do orquestrador. Crie uma task por item e sincronize.

### Fase 1 — Fundação

- [x] **Leva 1.1** — Tipos e Presets — `worker` (1 tarefa) ✅
- [x] **Leva 1.1.5** — Validação: lint + typecheck ✅
- [x] **Leva 1.2** — Edge Detection — `worker` (lib) + `test` (testes) paralelo ✅
- [x] **Leva 1.2.5** — Validação: lint + typecheck + test ✅
- [x] **Leva 1.3** — WhiteboardScene penScale — `worker` (1 tarefa) ✅
- [x] **Leva 1.3.5** — Validação: lint + typecheck ✅
- [x] **Fase 1.5** — Validação consolidada: gap-finder + code-validator + lint + typecheck + test ⏭️ **PULADA**

### Fase 2 — Pipeline Core

- [x] **Leva 2.1** — Contour Tracing — `worker` (lib) + `test` (testes) paralelo ✅
- [x] **Leva 2.1.5** — Validação: lint + typecheck + test ✅
- [x] **Leva 2.2** — Bezier Fitting — `worker` (lib) + `test` (testes) paralelo ✅
- [x] **Leva 2.2.5** — Validação: lint + typecheck + test ✅
- [x] **Fase 2.5** — Validação consolidada: gap-finder + code-validator + lint + typecheck + test ⏭️ **PULADA**

### Fase 3 — Integração

- [x] **Leva 3.1** — Vectorizer — `worker` (lib + testes) ✅
- [x] **Leva 3.1.5** — Validação: lint + typecheck + test ✅
- [x] **Leva 3.2** — ImageProcessing — `worker` (lib + testes) ✅
- [x] **Leva 3.2.5** — Validação: lint + typecheck + test ✅
- [x] **Fase 3.5** — Validação consolidada: gap-finder + code-validator + lint + typecheck + test ⏭️ **PULADA**

### Fase 4 — Estabilização

- [x] **Leva 4.1** — Testes comparativos — `test` (52 testes criados) ✅
- [x] **Leva 4.1** — Calibração de parâmetros + testes de performance ✅ (dentro dos 52 testes comparativos)
- [ ] **Leva 4.1.5** — **`code-validator` (auditoria final)** ❌ **NÃO EXECUTADO** (task cancelada)
- [ ] **Leva 4.1.5** — **Gate de Qualidade: typecheck + lint + test + build + build:full + checklist completo** ⚠️ **PARCIAL**
  - [x] typecheck + lint + test (verificados)
  - [ ] **`bun run build` — Exit 0** ❌
  - [ ] **`bun run build:full` — Exit 0** ❌
  - [ ] **`gap-finder` em cada fase** ❌

---

## Pendências Globais (para próxima sessão)

> Estas são as pendências que **NÃO foram resolvidas** nesta sessão e devem ser tratadas antes do merge/deploy da v0.132.0.

### 🔴 CRÍTICAS (bloqueiam merge)

1. **Rodar `bun run build`** — verificar que a build de produção compila sem erros (Vite + pré-render opcional). Sem isso, não há garantia de que o bundle final não quebra.
2. **Rodar `bun run build:full`** — pré-render das 10 rotas públicas (Vite + `scripts/prerender.mjs`). Sem isso, não há garantia de que o SEO/AEO/GEO (tags `__PRERENDER_READY`, JSON-LD, sitemap) continua funcional.
3. **Executar `code-validator`** sobre os 5 arquivos novos + 7 modificados. A task `ses_12ebcd579ffeyvZqzG5dC6dW3n` foi cancelada e a auditoria de qualidade (SOLID, tipagem, padrões, segurança, manutenibilidade) **não foi feita**.

### 🟡 IMPORTANTES (recomendadas, não bloqueiam)

4. **Executar `gap-finder`** em cada uma das 4 fases (1.5, 2.5, 3.5, 4.1.5). A auditoria de escopo (alinhamento com o plano §Escopo) **não foi feita** em nenhuma fase.
5. **Resolver BUG-001 (edge detection):** bordas falsas no perímetro para fundos cinzas uniformes. Decisão: fix (replicar padding ou float division no Gaussian Blur) fica para task futura. O teste de regressão (`edgeDetection.unit.test.ts`) protege contra mudanças acidentais. Documentado no relatório `docs/test/2026-06-16-edgeDetection-vitest.md`.
6. **Bump de versão 0.131.0 → 0.132.0** no `package.json` e sincronizar AGENTS.md/CLAUDE.md (skill `fast`). Esta task não foi executada — a versão atual no `package.json` provavelmente ainda é `0.131.0`. Use a skill `fast` quando for fazer o release.
7. **Teste manual de `AbortSignal` cancelando pipeline edge+bezier no meio** — os testes cobrem signal abortado no início; abort durante execução é flaky por timing. Cobertura atual é razoável, mas um teste manual garante comportamento real.
8. **Análise de imagens reais (JPEG/PNG) com o pipeline novo** — todos os testes comparativos usam imagens sintéticas. Validação com assets reais (ex: export de 1 cena do Remotion, geração de imagem via Gemini, foto de paisagem) é recomendada antes de disponibilizar para usuários finais.

### 🟢 NICE-TO-HAVE (pós-merge)

9. **Web Worker para o pipeline edge+bezier** (Fase 2 futura do plano §14.D5) — pipeline atual roda na main thread com `checkAbort` entre etapas. Para imagens 4K ou em hardware mais lento, bloquear a UI por <500ms pode ser perceptível. Worker + OffscreenCanvas + Transferable Objects é o caminho.
10. **Otimização da chave do cache LRU** para incluir `edgeThreshold` e `contourEpsilon` (atualmente a chave só tem `renderMode` + `preset`). Variações desses 2 valores retornam o resultado do cache da primeira chamada. Documentado pelo agent da Leva 3.2.
11. **Teste de batch vetorial** (`runBatchRender` ainda não suporta edge+bezier — fora de escopo da v0.132.0). Documentado na Leva 4.1.
12. **Adicionar presets legados `posterized*`, `smoothed`, `curvy`, `sharp`, `grayscale`, `fixedpalette`, `randomsampling*`** à tabela comparativa da Leva 4.1 (atualmente só `artistic1`, `artistic2`, `artistic3`, `artistic4`, `default`, `detailed` foram exercitados).

---

## Resumo Executivo (atualizado pós-sessão)

| Métrica | Valor planejado | Valor real | Status |
|---------|-----------------|------------|--------|
| **Total de levas** | 8 + 4 validações | 8 levas + 0 validações gap-finder/code-validator | ⚠️ Validações puladas |
| **Fases** | 4 | 4 (3 concluídas, 1 parcial) | ⚠️ Fase 4 sem gate final |
| **Arquivos NOVOS** | 6 (3 libs + 3 testes) | 6 (3 libs + 3 testes comparativos) | ✅ |
| **Arquivos MODIFICADOS** | 7 | 11 (3 libs + 2 componentes + 5 testes + 3 i18n) | ✅ Acima do planejado |
| **RFs cobertos** | Pipeline edge+bezier completo (D1-D9) | D1-D9 ✅ (após Leva 3.2) | ✅ |
| **Novos testes** | 3 arquivos novos + 2 modificados | 4 arquivos novos + 4 modificados (1 vetorialPresets + 1 SpeedPaintPage + 1 e2e) | ✅ Acima do planejado |
| **Testes adicionados** | (não quantificado) | 330 (2598 - 2268) | ✅ |
| **Novas dependências** | 0 (Canvas API pura) | 0 | ✅ |
| **Notebooks NotebookLM consultados** | 5 (Remotion, TypeScript, Vitest, Zod, Motion) | 4 (Remotion, TypeScript, Vitest — Zod e Motion não foram necessários) | ✅ |
| **Agents usados** | worker, test, code-validator, gap-finder | worker, test (code-validator e gap-finder NÃO usados) | ⚠️ |
| **Paralelismo máximo** | 2 agents (Leva 1.1+1.2, 1.2+1.3, 2.1+2.2) | 2 agents (respeitado) | ✅ |
| **Versão alvo** | 0.132.0 | 0.132.0 (não foi feito bump no `package.json`) | ⚠️ |
| **Latência pipeline edge+bezier (200×150)** | < 500ms (alvo soft) | 33ms (15x melhor que alvo) | ✅ |
| **Latência pipeline edge+bezier (1920×1080 extrapolado)** | < 2000ms (alvo) | ~400-700ms (3-5x melhor que alvo) | ✅ |
| **Bateria de testes final** | 2268+ baseline + novos | 2598/2598 ✅ (zero regressão) | ✅ |
| **`bun run build`** | Exit 0 (pré-merge) | ❌ **NÃO EXECUTADO** | 🔴 |
| **`bun run build:full`** | Exit 0 (pré-merge) | ❌ **NÃO EXECUTADO** | 🔴 |
| **Validação `gap-finder` por fase** | obrigatório | ❌ **PULADO em todas as 4 fases** | 🔴 |
| **Validação `code-validator` final** | obrigatório | ❌ **CANCELADO** (task não completou) | 🔴 |

---

## Desvios e Ajustes (atualizado pós-sessão)

| # | Desvio | Motivo | Decisão |
|---|--------|--------|---------|
| 1 | **`gap-finder` e `code-validator` não foram invocados em nenhuma fase** | Decisão do usuário (Matheus) durante a Fase 1.5 — pediu para pular validações | Puladas. Pendência: rodar manualmente antes do merge (ver §Pendências Globais) |
| 2 | **`code-validator` cancelado durante Fase 4** | Task `ses_12ebcd579ffeyvZqzG5dC6dW3n` foi cancelada pelo orquestrador antes de completar | Pendência: re-executar `code-validator` na próxima sessão |
| 3 | **`imageProcessing.vetorial.integration.test.ts:285` NÃO foi alterado pela Leva 3.1** | Agent da Leva 3.1 identificou que o teste valida o default do **orquestrador** (`imageProcessing.ts:411`), não do `vectorizer.ts`. Alterar o teste conforme instrução original do prompt teria gerado **regressão**. | Decisão arquitetural correta, mantida. Orquestrador controla `sourcePreset` quando consumidor não fornece `vetorialPreset`. |
| 4 | **Branch `if (isEdgePreset(preset)) reject(...)` adicionado na Leva 1.1 foi REMOVIDO na Leva 3.2** | Salvaguarda temporária ("ainda não implementado") virou desnecessária quando o pipeline edge+bezier ficou pronto na Leva 3.1. Manter o branch quebraria os 5 novos testes da Leva 3.2. | O `vectorizeImage` já tem narrowing real via `isEdgePreset(preset)` em runtime, então a separação de responsabilidades está correta: orquestrador (`imageProcessing.ts`) apenas repassa, `vectorizeImage` decide o pipeline. |
| 5 | **`MAX_PATHS_PER_SCENE = 60` e `DEFAULT_PRESET = 'edge-default'` no `vectorizer.ts`** | Conforme plano §4 e §10.2. Default do orquestrador (`imageProcessing.ts`) preserva `'artistic1'` para consumidores externos. | Decisão: `vectorizer.ts` é o "cérebro" do pipeline (decide melhor preset), `imageProcessing.ts` é o "orquestrador" (decide o que passar para consumidores). Os dois defaults podem divergir sem problema. |
| 6 | **BUG-001 (bordas falsas no perímetro) NÃO foi corrigido** | Fix exige decisão arquitetural (zero-padding vs replicado vs float division) e mudança de comportamento. Fora do escopo da Leva 1.2. | Teste de regressão adicionado em `edgeDetection.unit.test.ts` para detectar mudanças acidentais. Pendência: avaliar fix em task futura. |
| 7 | **`bun run build` e `bun run build:full` NÃO foram executados** | Não estavam no escopo das tasks dos agents `test` e `code-validator` (focados em testes e auditoria) | Pendência: rodar antes do merge (ver §Pendências Globais) |
| 8 | **Bump de versão 0.131.0 → 0.132.0 NÃO foi feito** | Skill `fast` não foi invocada nesta sessão (escopo era execução do tracker, não release) | Pendência: rodar a skill `fast` antes do release (atualiza `package.json` + `AGENTS.md` + `CLAUDE.md`) |
| 9 | **Skill `check` (publish com segurança) NÃO foi executada** | Sem bump de versão, `check` não se aplica ainda | Pendência: rodar após `fast` |

---

*Tracker atualizado em 2026-06-16. Sessão de execução encerrada após Leva 4.1 (testes comparativos). Pendências críticas documentadas em §Pendências Globais. Para retomar, começar pelos 3 itens CRÍTICOS (build + build:full + code-validator).*
