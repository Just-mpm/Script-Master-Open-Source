# Tracker: Consolidação do Modo "Desenho" (Vetorial) do Speed Paint

**Data de geração:** 2026-06-15
**Plano fonte:** `docs/plan/speed-paint-vetorial-completo-plano-final.md`
**Stack:** React 19 + Vite 8 + MUI v9 + Remotion 4 + Zustand + TypeScript estrito + Firebase + Vitest 4
**Scripts:** `bun run lint` · `bun run typecheck` · `bun run test` · `bun run build` · `bun run build:full`
**Versão atual:** 0.131.0 (2026-06-14) → **Versão alvo:** 0.132.0 (minor, 2026-06-15+)
**Tipo de release:** Minor — novas features + correções sem quebra de contrato
**Dependências adicionadas:** Nenhuma (`imagetracerjs@1.2.6` e `@remotion/paths@4.0.448` já cobrem tudo)

---

## Status Geral (macro)

> Marque conforme cada fase é concluída. Use o checklist detalhado por leiva na seção "TODO de Execução".

- [ ] **Fase 1 — P0** (leivas L0, L1, L2, L3): bugs que bloqueiam a experiência
- [ ] **Fase 2 — P1** (leivas L4, L5): completude de produto
- [ ] **Gate L6** — Smoke release 0.132.0-rc.1 (validação macro + decisão P2)
- [ ] **Fase 3 — P2** (leivas L7, L8, L9, L10, L11) — *condicional à aprovação do Matheus no gate L6*
- [ ] **Gate L12** — Smoke release 0.132.0 final (tag + deploy)

---

## Regras de Uso do Tracker

### Paralelismo
- **Máx 2 agents em paralelo por fase** (regra global do projeto)
- **Nunca 2 agents no mesmo arquivo no mesmo lote** — ordem sequencial
- Tarefas com dependência técnica → sequenciais; sem dependência → paralelas

### Dependências entre leivas
- A ordem proposta (L0→L12) respeita o grafo acíclico de dependências
- Toda leiva que **depende** de outra só pode iniciar após a predecessora ser mergeada
- Pular ou reordenar leivas **exige registro na seção "Desvios e Ajustes"**

### Validações obrigatórias
- **Code-validator + gap-finder** após cada fase (Fase 1, 2 e 3) — bloqueia avanço se encontrar CRITICAL ou WARNING
- **`security` adicionado** em leivas com mudança de tipos/contratos públicos (L1, L2, L5, L8)
- **Smoke manual no navegador** obrigatório em: L3, L4, L7, L10, L11, e nos 2 gates
- **Lint + type-check** após cada leiva — zero erros, zero warnings (CT-B01, CT-B02)
- **Build + testes** após cada fase — 2268+ baseline + novos testes (CT-B03, CT-B05)

### Convenções do projeto
- **Type guard real, sem `as` bypass** — usar `'paths' in animation` ou `isVetorialAnimation` (MDE-01)
- **`AbortController` em escopo de módulo** + `processingIdRef` para race protection (padrão `BatchOrchestrator.tsx:33-35`)
- **Lazy import de Remotion** para preservar bundle principal
- **`useShallow` Zustand** em seletores
- **`createLogger('contexto')`** para logging modular
- **Namespace i18n `speedPaint.*`** em 3 locales (pt-BR, en, es)
- **Proibido** `@ts-ignore`, `@ts-expect-error`, `eslint-disable` — corrigir causa raiz
- **Proibido** `as` bypass em código novo (CT-S01)
- **Imports relativos** (sem `@/`) — convenção do projeto (CT-B07)

### Notebooks do NotebookLM (consultar quando indicado)
| Notebook | ID | Quando |
|----------|----|--------|
| Remotion Guide | `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` | L2 (composições), L8, L10 (Easing), L11 (filtros SVG) |
| React Docs | `8765c786-5be2-4b46-a20c-4ef666804801` | L3 (useCallback, race condition), L7 (Zustand bridge) |
| MUI Docs | `6288089b-58c5-4a0e-a55b-5408e559ae8a` | L3 (Tooltip describeChild), L4 (Select+ListSubheader, StackedHeader), L7 |
| Motion Guide | `697b773a-32b4-43a3-8048-eb85b473176d` | L11 (motion blur SVG) |
| Vitest Guide | `6f3a1b12-a3df-4f31-9ea1-083ba644399a` | L3 (mocks async), todas (testes gerais) |

---

## Premissas e Lacunas

| # | Premissa/Lacuna | Impacto |
|---|-----------------|---------|
| 1 | **Achados N1-N4 do plano (escopo reduzido):** `PaintingJob.animation` já é união; `animationStore` já tem `renderMode`/`vetorialPreset`; `strokeCache` já discrimina por mode+preset no SHA-256; `generateStrokesFromImage` já aceita `renderMode` | M1 (Tipos/Store) está 80% pronto — escopo do L0-L2 é menor que aparenta |
| 2 | **P2 condicional ao gate L6:** leivas L7-L11 só rodam se Matheus aprovar após L5 | Plano assume defaults propostos (D02, D03, D04, D07, D08) — se reprovado no gate, mover P2 inteiro para v0.133.0 |
| 3 | **Não inferir arquitetura:** se um agente divergir do plano, voltar e perguntar; nunca inventar | Risco de divergência de MDE-01 (type guard) ou MDE-11 (default `mask`) |
| 4 | **3 locales i18n obrigatórios:** pt-BR, en, es — toda nova chave `t(...)` precisa existir nos 3 arquivos | CT-I01 automatizado; i18n drift é risco MÉDIO (plano §Riscos) |
| 5 | **Sem novas dependências:** todas as deps necessárias já estão no `package.json` | Se aparecer dependência nova, abrir issue em vez de instalar |

---

## Validações Cross-Fase

Comandos executados após cada leiva e ao final de cada fase:

| # | Comando | Esperado | Critério |
|---|---------|----------|----------|
| 1 | `bun run lint` | Exit 0, 0 warnings | CT-B01 |
| 2 | `bun run typecheck` | Exit 0 | CT-B02 |
| 3 | `bun run test` | 2268+ testes passando + novos | CT-B05, CT-C08 |
| 4 | `bun run test -- --coverage` | Coverage ≥ 80% em código novo | CT-T12 |
| 5 | `bun run build` | Exit 0, `dist/` gerado | CT-B03 |
| 6 | `bun run build:full` | Exit 0, 10 rotas pré-renderizadas | CT-B04 |
| 7 | `grep -rn "as StrokeAnimation" src/features/video-render/components/VideoComposition.tsx` | 0 matches | CT-F33, GAP-05 |
| 8 | `grep -rn ": any" src/features/speed-paint/ src/pages/ src/features/video-render/` | 0 matches em código novo | CT-S01 |
| 9 | `grep -rn "'@/" src/features/speed-paint/ src/pages/SpeedPaintPage.tsx` | 0 matches | CT-B07 |
| 10 | `git diff v0.131.0 --name-only` | Escopo restrito aos 19 arquivos da arquitetura | Escopo |

---

## Fase 1 — P0 (Bugs que bloqueiam a experiência)

### Leiva L0 — Preparação (export type guard)

**Objetivo:** Exportar `isVetorialAnimation` e `isStrokeAnimation` de `strokeCache.ts` (resolve GAP-16, destrava L2).

**RFs/RNFs:** GAP-16 (infraestrutura) · RNF-08 (TypeScript estrito)
**Módulo:** M1 (Core Types & Type Guards)
**Estimativa:** **S** (5 min)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `fixer` | Adicionar `export` nas 2 funções em `src/features/video-render/lib/strokeCache.ts:123-138` (`isVetorialAnimation` e `isStrokeAnimation`) | — | §Contexto 1.2 #8 |

> **Notas:**
> - **#1:** Mudança puramente declarativa (5 min). Validar com `grep "export function isVetorialAnimation" src/features/video-render/lib/strokeCache.ts` — 1 match esperado
> - **Crítico:** Sem este PR, L2 (VideoComposition) não compila — type guard é o destravador

**Validações obrigatórias:** `bun run lint` · `bun run typecheck`
**Critérios do contract:** CT-B01, CT-B02, CT-C10
**Comando final:** `bun run lint && bun run typecheck`

---

### Leiva L1 — Pipeline de vídeo (RF-04)

**Objetivo:** Propagar `renderMode`/`vetorialPreset` por toda a cadeia: `SpeedPaintEnhanceOptions` → `GenerateSpeedPaintOptions` → `getStrokeAnimation` → `generateStrokesFromImage`.

**RFs/RNFs:** RF-04 · RNF-04 (testes) · RNF-07 (retrocompat) · RNF-08 (TS estrito)
**Gaps cobertos:** GAP-03 (`GenerateSpeedPaintOptions` não mencionado)
**Módulo:** M2 (Pipeline de Vídeo)
**Estimativa:** **M** (3-4h + testes)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Estender `SpeedPaintEnhanceOptions` em `src/features/video-render/lib/speedPaintService.ts:26-28` com `renderMode?: SpeedPaintRenderMode` e `vetorialPreset?: VetorialPreset`. Propagar para `generateScenesWithSpeedPaint` | — | §Arquitetura M2 |
| 2 | `worker` | Estender `GenerateSpeedPaintOptions` em `src/features/video-render/lib/speedPaintRenderer.ts:36` (GAP-03). Propagar para `getStrokeAnimation(url, { mode, preset })` e `generateStrokesFromImage(url, onProgress, { renderMode, vetorialPreset, signal })` | — | §Arquitetura M2 |
| 3 | `worker` | Atualizar `src/features/video-render/hooks/useSpeedPaintEnhancer.ts` (`UseSpeedPaintEnhancerOptions`): ler `renderMode`/`preset` da `animationStore` via `useShallow` e passar para o service | — | §Arquitetura M2 |
| 4 | `test` *(paralelo a #1-3)* | Estender `tests/video-render/speedPaintRenderer.unit.test.ts`: cenários com `renderMode: 'vetorial'` + propagação para `getStrokeAnimation` e `generateStrokesFromImage` | Vitest Guide (mocks de hooks) | §Estratégia 6.2 |

> **Notas:**
> - **#1-3:** Worker implementa em **3 arquivos** (`speedPaintService.ts`, `speedPaintRenderer.ts`, `useSpeedPaintEnhancer.ts`) — pode fazer em commits separados ou 1 commit atômico
> - **#2:** `generateScenesWithSpeedPaint` DEVE passar `renderMode`/`preset` para `getStrokeAnimation` no cache lookup (CT-F28) E para `generateStrokesFromImage` em cache miss (CT-F29) — dois pontos críticos
> - **#3:** Defaults opcionais (`?`) preservam retrocompatibilidade (CT-C05): sem `renderMode` → `mask` (default)
> - **Cuidado:** Cache SHA-256 em `strokeCache.ts:143-181` já inclui `mode + preset` (N3) — **NÃO MEXER** no cache, só propagar

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · `bun run test tests/video-render/` · **code-validator** + **gap-finder** + **security**
**Critérios do contract:** CT-F25, CT-F26, CT-F27, CT-F28, CT-F29, CT-F30, CT-C05, CT-S01, CT-T03, CT-B01-B08
**Comando final:** `bun run test tests/video-render/speedPaintRenderer.unit.test.ts -- --coverage`

---

### Leiva L2 — VideoComposition (RF-05)

**Objetivo:** Discriminar `StrokeAnimation` vs `VetorialAnimation` na renderização de vídeo via type guard real, sem `as` bypass.

**RFs/RNFs:** RF-05 · RNF-08 (TS estrito)
**Gaps cobertos:** GAP-05 (type guard padronizado)
**Dependências:** L0 (type guard exportado), L1 (pipeline fornece union)
**Módulo:** M3 (Composição Remotion)
**Estimativa:** **S** (1-2h + testes)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Estender `VideoScene.strokeAnimation: StrokeAnimation \| VetorialAnimation \| undefined` em `src/features/video-render/types.ts` | Remotion Guide (composições) | §Arquitetura M3 |
| 2 | `worker` | Atualizar `src/features/video-render/components/VideoComposition.tsx:84` — remover `as StrokeAnimation`, importar `isVetorialAnimation` de `../lib/strokeCache`, branch condicional `<WhiteboardScene>` vs `<SpeedPaintScene>` | Remotion Guide (composições) | §Estratégia Técnica |
| 3 | `test` *(paralelo a #2)* | Criar/estender `tests/video-render/videoComposition.component.test.tsx` — render com `VetorialAnimation` → `WhiteboardScene`; com `StrokeAnimation` → `SpeedPaintScene` | Vitest Guide (componente) | §Estratégia 6.2 |

> **Notas:**
> - **#1:** Mudança isolada de 1 tipo
> - **#2:** Cast `as StrokeAnimation` removido (CT-F33). Branch:
>   ```tsx
>   {scene.strokeAnimation ? (
>     isVetorialAnimation(scene.strokeAnimation) ? (
>       <WhiteboardScene animation={scene.strokeAnimation} ... />
>     ) : (
>       <SpeedPaintScene animation={scene.strokeAnimation} ... />
>     )
>   ) : (
>     <SceneSequence ... />
>   )}
>   ```
> - **#3:** Usar `@testing-library/react` para renderizar `VideoComposition` com mocks de cena
> - **Crítico:** Validar com `grep "as StrokeAnimation" src/features/video-render/components/VideoComposition.tsx` — DEVE ser 0 matches (CT-F33, GAP-05)

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator**
**Critérios do contract:** CT-F31, CT-F32, CT-F33, CT-F34, CT-F35, CT-C07, CT-C10, CT-T02, CT-T09, CT-S01
**Comando final:** `bun run test tests/video-render/videoComposition.component.test.tsx`

---

### Leiva L3 — UI SpeedPaintPage parte A (RF-01, RF-02)

**Objetivo:** Corrigir tooltips duplicados (RF-01) e implementar reprocessamento ao trocar modo (RF-02) com race protection.

**RFs/RNFs:** RF-01 (tooltip individual) · RF-02 (reprocessamento) · RNF-05 (WCAG 2.1 AA) · RNF-06 (i18n 3 locales) · RNF-07 (retrocompat)
**Módulo:** M4 (UI SpeedPaintPage) + M8 (i18n & Acessibilidade)
**Estimativa:** **M** (4-5h + testes + smoke)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Reescrever `handleRenderModeChange` em `src/pages/SpeedPaintPage.tsx:299-307` com `processingIdRef` + `AbortController` + cache lookup + reprocessamento via `generateStrokesFromImage({ renderMode, vetorialPreset, signal })` | React Docs (useCallback, race condition) | §Estratégia Técnica reprocessamento |
| 2 | `ui-designer` *(paralelo a #1)* | Trocar `t('speedPaint.modeDescription')` por chaves específicas `modeClassicTooltip` e `modeVetorialTooltip` em `src/pages/SpeedPaintPage.tsx:852, 865`; adicionar `describeChild` ao `Tooltip` MUI; adicionar `aria-live="polite"` no painel do `SpeedPaintPlayer`; Snackbar de erro com `role="alert"`; loading state com `aria-label` no `<CircularProgress>` | MUI Docs (Tooltip describeChild) | §Arquitetura M4 |
| 3 | `worker` *(paralelo a #1-2)* | Adicionar chaves i18n em `src/features/i18n/locales/pt-BR.ts`, `en.ts`, `es.ts` (namespace `speedPaint`): `modeClassicTooltip`, `modeVetorialTooltip`, mensagens de erro, `processingLabel` | — | §Estratégia 6.2 |
| 4 | `test` *(paralelo a #1-3)* | Criar/estender `tests/speed-paint/SpeedPaintPage.component.test.tsx` — `handleRenderModeChange`: sucesso, erro, cache hit, race condition, abort (mínimo 6 testes — CT-T01) | Vitest Guide (mocks async) | §Estratégia 6.2 |

> **Notas:**
> - **#1:** Implementar padrão do plano §Estratégia Técnica (snippet completo disponível). Usar `useRef` para `processingIdRef` e `abortControllerRef`
> - **#1:** Em cache hit, NÃO chamar `generateStrokesFromImage` (CT-F13) — consultar `getStrokeAnimation` primeiro
> - **#1:** Em `try/catch`, validar `ac.signal.aborted` e `processingIdRef.current !== processId` antes de aplicar resultado
> - **#2:** Tooltip individual: Clássico não pode conter "vetorial"/"SVG"/"whiteboard"/"path" (CT-F02); Desenho não pode conter "máscara"/"raster"/"raspadinha"/"stroke" (CT-F03)
> - **#3:** Chaves i18n devem ter tradução real nos 3 locales, não string vazia (CT-I01, CT-I02)
> - **#4:** Smoke manual após os 4 itens: trocar Clássico→Desenho, ver loading + whiteboard; trocar Desenho→Clássico, ver raspadinha; causar erro, ver snackbar + retry
> - **Alerta:** `generateStrokesFromImage` JÁ aceita `renderMode` (N4 do plano) — só passar os parâmetros

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator** + **gap-finder** + **security** + **smoke manual no navegador**
**Critérios do contract:** CT-F01-F17, CT-A01-A10, CT-I01-I04, CT-C03, CT-T01, CT-T13, CT-S01, CT-B01-B08
**Comando final:** `bun run test tests/speed-paint/SpeedPaintPage.component.test.tsx` + smoke manual no `/app/pintura-rapida`

---

## Fase 2 — P1 (Completude de produto)

### Leiva L4 — UI SpeedPaintPage parte B (RF-03)

**Objetivo:** Adicionar seletor de `vetorialPreset` na UI (16 opções em 6 grupos), visível apenas no modo Desenho, com reprocessamento ao trocar.

**RFs/RNFs:** RF-03 (seletor de preset) · RNF-05 (WCAG) · RNF-06 (i18n) · RNF-09 (analytics)
**Gaps cobertos:** GAP-04 (i18n dos 16 presets não especificada) — resolvido por **D05**
**Decisão padrão (D05):** `speedPaint.presetGroups.{groupName}` + `speedPaint.presets.{presetName}` com tradução real
**Decisão padrão (D08):** Tooltip do `vetorialPresetLabel` com texto "Modo Desenho funciona melhor com ilustrações e line art. Fotos podem não ficar ideais."
**Módulo:** M4 (UI SpeedPaintPage) + M8 (i18n & Acessibilidade)
**Estimativa:** **M** (3-4h + i18n + testes)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `ui-designer` | Adicionar bloco condicional em `src/pages/SpeedPaintPage.tsx`: `{renderMode === 'vetorial' && <StackedHeader ... action={<Select<VetorialPreset> aria-label={t('speedPaint.vetorialPresetLabel')}>` com 16 `<MenuItem>` agrupados por 6 `<ListSubheader>` | MUI Docs (Select+ListSubheader, StackedHeader) | §Arquitetura M4 |
| 2 | `worker` *(paralelo a #1)* | Implementar `handlePresetChange(newPreset: VetorialPreset)`: `setVetorialPreset(newPreset)`, reprocessa se `job.inputImage` e `!processing`, dispara `trackAnalyticsEvent('speed_paint_preset_changed', { preset: newPreset })` | — | §Estratégia M4 |
| 3 | `worker` *(paralelo a #1-2)* | Adicionar chaves i18n em 3 locales: `vetorialPresetLabel` (com tooltip D08), 6 chaves `presetGroups.{artistic,posterized,smoothed,detailed,grayscale,sampling}`, 16 chaves `presets.{artistic1-4,posterized1-2,smoothed1-3,detailed1-3,grayscale1-2,sampling1-2}` | — | §Arquitetura M4 |
| 4 | `test` *(paralelo a #1-3)* | Estender `tests/speed-paint/SpeedPaintPage.component.test.tsx`: seletor visível em vetorial, oculto em mask, 16 opções, 6 grupos, `handlePresetChange` chama `generateStrokesFromImage` com novo preset (CT-T04, CT-T10) | Vitest Guide (componente) | §Estratégia 6.2 |

> **Notas:**
> - **#1:** Usar `StackedHeader` (já no projeto) com variant `section`, `collapsible`, `defaultCollapsed={false}`
> - **#1:** Navegação por teclado: `Tab` até o `Select`, `Enter` abre, setas navegam, `Enter` seleciona (CT-A06)
> - - **#2:** 16 valores de `VetorialPreset` em `src/features/speed-paint/types/vetorial.ts:36-45` (já definidos)
> - **#3:** Tradução real (não nome técnico): `artistic1` → "Artístico 1" (pt), "Artistic 1" (en), "Artístico 1" (es) — CT-I05
> - **#4:** Smoke manual: alternar Clássico/Desenho, verificar visibilidade do seletor; trocar preset, ver reprocessamento

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator** + **smoke manual**
**Critérios do contract:** CT-F18-F24, CT-A03, CT-A06, CT-I02-I05, CT-T04, CT-T10, CT-S01, CT-B01-B08
**Comando final:** `bun run test tests/speed-paint/SpeedPaintPage.component.test.tsx` + smoke manual

---

### Leiva L5 — BatchOrchestrator (RF-08)

**Objetivo:** Fazer `BatchOrchestrator` ler `renderMode`/`vetorialPreset` da `useAnimationStore` e propagar para `generateStrokesFromImage`.

**RFs/RNFs:** RF-08 · RNF-07 (retrocompat)
**Módulo:** M6 (Batch / Lote)
**Estimativa:** **S** (1-2h + teste)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Adicionar leitura em `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:102, 105`: `const renderMode = useAnimationStore((s) => s.renderMode); const vetorialPreset = useAnimationStore((s) => s.vetorialPreset);` — passar para `generateStrokesFromImage(dataUrl, onProgress, { signal, renderMode, vetorialPreset })` | — | §Arquitetura M6 |
| 2 | `test` *(paralelo a #1)* | Estender `tests/speed-paint/BatchOrchestrator.component.test.tsx`: `generateStrokesFromImage` recebe `renderMode`/`vetorialPreset` da store (CT-T05); trocar modo durante fila não interrompe job atual (CT-F47) | Vitest Guide (componente + store) | §Estratégia 6.2 |

> **Notas:**
> - **#1:** Mudança self-contained em 1 arquivo. Usar `useShallow` se for consumir mais de 2 campos
> - **#2:** Mockar `generateStrokesFromImage` para verificar opções passadas
> - **Cuidado:** Padrão `processingIdRef` + `AbortController` JÁ EXISTE em `BatchOrchestrator.tsx:33-35` (do plano) — aproveitar, não duplicar

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator** + **security**
**Critérios do contract:** CT-F45, CT-F46, CT-F47, CT-T05, CT-C09, CT-S01, CT-B01-B08
**Comando final:** `bun run test tests/speed-paint/BatchOrchestrator.component.test.tsx`

---

## Gate L6 — Smoke release 0.132.0-rc.1 (validação macro)

**Objetivo:** Validar UX de Fase 1 (P0) + Fase 2 (P1) **antes** de avançar para P2. Release candidate intermediária.
**Estimativa:** 30 min (apenas validações, sem código novo)
**Quem aprova:** Matheus (decisão de avançar ou cancelar P2)

### Validações obrigatórias (9 etapas do contract §14)

| # | Etapa | Comando | Esperado |
|---|-------|---------|----------|
| 1 | Lint | `bun run lint` | 0 erros, 0 warnings (CT-B01) |
| 2 | TypeCheck | `bun run typecheck` | Exit 0 (CT-B02) |
| 3 | Testes unitários | `bun run test` | 2268+ passando + novos (CT-B05) |
| 4 | Testes de integração | `bun run test tests/speed-paint/ tests/video-render/` | 0 falhas |
| 5 | Build | `bun run build` | Exit 0, `dist/` gerado (CT-B03) |
| 6 | Build completo | `bun run build:full` | Exit 0, 10 rotas pré-renderizadas (CT-B04) |
| 7 | Análise estática | `grep -rn "as StrokeAnimation\|: any\|@ts-ignore" src/features/speed-paint/ src/pages/ src/features/video-render/` | 0 matches em código novo (CT-S01, CT-F33) |
| 8 | Smoke manual no navegador | Checklist abaixo | Aprovado |
| 9 | Deploy preview | `bun run deploy:preview` | Sucesso + teste E2E em preview |

### Smoke manual no navegador

- [ ] Abrir `/app/pintura-rapida`, ver tooltips distintos em Clássico e Desenho (CT-F01-F03)
- [ ] Trocar para Desenho, ver reprocessamento com loading visível (CT-F12, CT-F14)
- [ ] Selecionar preset diferente no seletor (16 opções, 6 grupos), ver reprocessamento (CT-F18-F20)
- [ ] Trocar de volta para Clássico, ver raspadinha (CT-F16)
- [ ] Processar item na fila no modo Desenho, ver animação whiteboard (RF-08)
- [ ] Verificar que modo Clássico continua idêntico (retrocompat — CT-C01, CT-C04)
- [ ] Navegação por teclado no `ToggleButtonGroup` (setas ←→) e no `Select` (Tab/Enter) (CT-A06, CT-A07)
- [ ] Trocar i18n: pt-BR, en, es — tooltips, presets, labels em cada idioma (CT-I01)

### Escopo confirmado
- [ ] `git diff v0.131.0 --name-only` — escopo restrito a L0-L5 (não invadiu arquivos de P2)
- [ ] `QueueStaging.tsx`, `ImageUpload.tsx`, `AnimationDurationSelector.tsx` — **inalterados** (CT-C12)

### Decisão de Matheus
- [ ] **Aprovar P2** → seguir para L7-L11
- [ ] **Reprovar P2** → congelar em L0-L5, tag `0.132.0-rc.1`, abrir issues para P2 (mover para v0.133.0)
- [ ] **Reprovar P0/P1** → reabrir leiva problemática, corrigir, validar novamente

---

## Fase 3 — P2 (Melhorias visuais — CONDICIONAL ao gate L6)

> **⚠️ Não iniciar L7 sem aprovação do Matheus no gate L6.** Se reprovado, mover P2 inteiro para v0.133.0.

### Leiva L7 — UI VideoPage (RF-06) — P2

**Objetivo:** Adicionar seletor de modo (Clássico/Desenho) na `VideoPage`, propagando via `videoRenderBridge` (escopo de sessão).

**RFs/RNFs:** RF-06 · RNF-05 (WCAG) · RNF-06 (i18n)
**Gaps cobertos:** GAP-10 (`useVideoExporter.tsx`), GAP-12 (`videoRenderBridge.ts`)
**Decisões padrão (D02, D03):** `videoRenderBridge` (Zustand) + escopo de sessão (sync ao entrar, override local não afeta SpeedPaint)
**Módulo:** M5 (UI VideoPage) + M8 (i18n & Acessibilidade)
**Estimativa:** **M** (4-5h + testes + smoke)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Estender `src/features/video-render/store/videoRenderBridge.ts` (+ `renderMode: SpeedPaintRenderMode`, `vetorialPreset: VetorialPreset`, action `syncRenderMode(mode, preset)`) | React Docs (Zustand) | §Arquitetura M5 |
| 2 | `worker` *(paralelo a #1)* | Estender `src/features/video-render/hooks/useVideoExporter.tsx:41-63` — `VideoExportOptions` ganha `renderMode` e `vetorialPreset`; propagar para `videoRenderController` | — | §Arquitetura M5 |
| 3 | `ui-designer` *(paralelo a #1-2)* | Adicionar `ToggleButtonGroup` (clone do SpeedPaintPage) em `src/features/video-render/components/VideoExportPanel.tsx:255-275`, condicional a `animateScenes === true`; em `src/pages/VideoPage.tsx`, ao montar: `syncRenderMode(animationStore.renderMode, animationStore.vetorialPreset)` | MUI Docs (ToggleButtonGroup), React Docs (Zustand bridge) | §Arquitetura M5 |
| 4 | `worker` *(paralelo a #1-3)* | Adicionar chaves i18n (se necessário) em 3 locales para novo label do seletor na VideoPage | — | §Estratégia M5 |
| 5 | `test` *(paralelo a #1-4)* | Estender `tests/video-render/VideoExportPanel.unit.test.tsx` (ToggleButtonGroup aparece com `animateScenes === true`) e `tests/video-render/videoRenderBridge.unit.test.ts` (sync de `renderMode`/`vetorialPreset`) | Vitest Guide (componente + store) | §Estratégia 6.2 |

> **Notas:**
> - **#1:** `GAP-02 era falso positivo` — `videoRenderBridge` JÁ EXISTE como store Zustand (plano §Achados N3 + §Achados N3) — só estender
> - **#3:** Seletor fica **oculto** quando `animateScenes === false` (CT-F37)
> - **#3:** Escopo de sessão: ao entrar na VideoPage, sincroniza com `animationStore`; override local NÃO afeta `SpeedPaintPage` (D03)
> - **#5:** Smoke manual: abrir VideoPage, ativar `animateScenes`, ver seletor; desativar, ver ocultar; trocar modo e exportar vídeo, ver resultado

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator** + **gap-finder** + **smoke manual**
**Critérios do contract:** CT-F36-F39, CT-A07, CT-I01-I06, CT-T05, CT-S01, CT-B01-B08
**Comando final:** `bun run test tests/video-render/VideoExportPanel.unit.test.tsx` + smoke manual em `/app/video`

---

### Leiva L8 — Batch lote vetorial (RF-07) — P2

**Objetivo:** Fazer `runBatchRender` aceitar `renderMode`/`vetorialPreset` e gerar `VetorialAnimation` por item.

**RFs/RNFs:** RF-07 · RNF-07 (retrocompat)
**Decisão padrão (D04):** Lote uniforme (todas as cenas usam o mesmo modo vigente na exportação)
**Módulo:** M6 (Batch / Lote)
**Estimativa:** **M** (3-4h + testes)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Estender `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` — `SpeedPaintBatchExportOptions` ganha `renderMode?` e `vetorialPreset?` | Remotion Guide (composições lazy) | §Arquitetura M6 |
| 2 | `worker` *(paralelo a #1)* | Atualizar `src/features/speed-paint/store/speedPaintRenderController.tsx:760-768, 833` — `runBatchRender` propaga `renderMode`/`vetorialPreset` para `generateStrokesFromImage` em cada item; se `renderMode === 'vetorial'`, usar `createExportableWhiteboardComposition` por item; remover/atualizar comentário de limitação (CT-F44) | Remotion Guide (composições lazy) | §Arquitetura M6 |
| 3 | `test` *(paralelo a #1-2)* | Estender `tests/speed-paint/speedPaintRenderController.unit.test.ts` — `runBatchRender` com `renderMode: 'vetorial'` e 3+ imagens (CT-T05, CT-F41); `useSpeedPaintExporter.unit.test.tsx` — `SpeedPaintBatchExportOptions` com novos campos | Vitest Guide (integração) | §Estratégia 6.2 |

> **Notas:**
> - **#1:** 1 arquivo pequeno
> - **#2:** Toca em `runBatchRender` (760-900 linhas) — cuidado com regressão. Usar `useShallow` se ler múltiplos campos da store
> - **#2:** `MAX_PATHS_PER_SCENE = 500` + `PATHOMIT_BY_PRESET` permanecem inalterados (CT-P05, CT-P06)
> - **#3:** Validar que lote com `renderMode: 'mask'` (ou sem) MANTÉM comportamento atual (CT-F42)

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator** + **security**
**Critérios do contract:** CT-F40-F44, CT-C09, CT-T05, CT-S01, CT-B01-B08
**Comando final:** `bun run test tests/speed-paint/speedPaintRenderController.unit.test.ts`

---

### Leiva L9 — sortPaths (RF-09) — P2

**Objetivo:** Implementar função pura `sortPaths()` com 4 ordenações configuráveis (top-down, center-out, big-first, random).

**RFs/RNFs:** RF-09 (ordem de desenho) · RNF-01 (perf vetorização)
**Decisão padrão (D07):** Centro geométrico (ponto médio `width/2, height/2`)
**Módulo:** M7 (Lib Vetorização & Whiteboard)
**Estimativa:** **S** (2-3h + testes)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Adicionar tipo `VetorialPathSortOrder = 'top-down' \| 'center-out' \| 'big-first' \| 'random'` em `src/features/speed-paint/types/vetorial.ts` | — | §Arquitetura M7 |
| 2 | `worker` *(paralelo a #1)* | Adicionar função pura `sortPaths(paths, order, canvasWidth, canvasHeight): VetorialPath[]` em `src/features/speed-paint/lib/vectorizer.ts`; aplicar após `vectorizeImage` e antes de montar `VetorialAnimation` | — | §Arquitetura M7 |
| 3 | `test` *(paralelo a #1-2)* | Estender `tests/speed-paint/vectorizer.unit.test.ts` — 4 ordenações + casos de borda (paths vazios, canvas width/height), validar que `center-out` usa centro geométrico (CT-F50) | Vitest Guide (unit) | §Estratégia 6.2 |

> **Notas:**
> - **#2:** Função pura (testável isoladamente), `O(n log n)` para 3 ordenações + `O(n)` para random
> - **#2:** `random` com seed determinístico (frame + pathIndex) para preservar determinismo do Remotion
> - **#3:** Smoke manual: vetorizar imagem 1920×1080 com cada uma das 4 ordens, ver ordem visual

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator**
**Critérios do contract:** CT-F48-F52, CT-T06, CT-S01, CT-B01-B08
**Comando final:** `bun run test tests/speed-paint/vectorizer.unit.test.ts -- --coverage`

---

### Leiva L10 — Easing configurável (RF-10) — P2

**Objetivo:** Tornar easing configurável em `WhiteboardScene` (3 opções: linear, smooth, bounce), com `Easing.inOut(Easing.ease)` como default.

**RFs/RNFs:** RF-10 (easing e velocidade variável) · RNF-02 (perf Remotion)
**Decisão padrão (D06):** Duração uniforme com `Easing.inOut(Easing.ease)` (padrão InstaDoodle)
**Módulo:** M7 (Lib Vetorização & Whiteboard)
**Estimativa:** **M** (3-4h + testes + smoke)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Adicionar tipo `VetorialEasingType = 'linear' \| 'smooth' \| 'bounce'` em `src/features/speed-paint/types/vetorial.ts`; adicionar `easing: VetorialEasingType` (default `'smooth'`) em `src/features/speed-paint/store/animationStore.ts` | Remotion Guide (Easing, interpolate) | §Arquitetura M70 |
| 2 | `worker` *(paralelo a #1)* | Estender `WhiteboardSceneProps` com `easing?: EasingFunction` em `src/features/video-render/components/WhiteboardScene.tsx`; usar em `interpolate(frame, [0, dur], [0, total], { easing: props.easing ?? Easing.inOut(Easing.ease), extrapolateRight: 'clamp' })` (CT-F57) | Remotion Guide (Easing, interpolate) | §Arquitetura M70 |
| 3 | `ui-designer` *(paralelo a #1-2, condicional a L7)* | Adicionar seletor de easing na `SpeedPaintPage` (e `VideoPage` se L7 implementado) com 3 opções (linear, smooth, bounce) | MUI Docs (Select) | §Arquitetura M70 |
| 4 | `worker` *(paralelo a #1-3)* | Adicionar chaves i18n em 3 locales: `easingLabel`, `easingLinear`, `easingSmooth`, `easingBounce` (CT-I06) | — | §Estratégia M70 |
| 5 | `test` *(paralelo a #1-4)* | Criar/estender `tests/video-render/WhiteboardScene.component.test.tsx` — easing aplicado ao `interpolate`, default `Easing.inOut(Easing.ease)` (CT-T05, CT-F54) | Vitest Guide (componente) | §Estratégia 6.20 |

> **Notas:**
> - **#2:** Default `Easing.inOut(Easing.ease)` quando `easing` não fornecido (CT-F54)
> - **#3:** Se L7 (VideoPage) NÃO foi implementado, manter seletor **apenas** na SpeedPaintPage
> - **#5:** Smoke manual: vetorizar imagem, comparar animação linear vs smooth vs bounce visualmente

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator** + **gap-finder** + **smoke manual**
**Critérios do contract:** CT-F53-F57, CT-C01-C02, CT-T05, CT-S01, CT-B01-B08
**Comando final:** `bun run test tests/video-render/WhiteboardScene.component.test.tsx` + smoke manual

---

### Leiva L11 — Caneta realista + motion blur (RF-11, RF-12) — P2

**Objetivo:** Aprimorar `Pencil` (inclinação dinâmica + tremor determinístico + sombra) e aplicar motion blur proporcional à velocidade.

**RFs/RNFs:** RF-11 (caneta SVG realista) · RF-12 (motion blur na caneta) · RNF-01 (perf) · RNF-02 (Remotion FPS)
**Decisão padrão (D08):** P2 (pode adiar para v0.133.0 se preferir)
**Módulo:** M7 (Lib Vetorização & Whiteboard)
**Estimativa:** **L** (6-8h + smoke)

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Redesenhar componente `Pencil` em `src/features/video-render/components/WhiteboardScene.tsx` (SVG mais detalhado: textura de madeira, gradiente, `feDropShadow` em vez de `drop-shadow` CSS); inclinação dinâmica via `Math.atan2(p2.y - p1.y, p2.x - p1.x)` com `getPointAtLength`; tremor subpixel determinístico `Math.sin(frame * 0.5 + pathIndex) * 0.3` (NÃO `Math.random()`) | Remotion Guide (filtros SVG em Remotion), Motion Guide (motion blur SVG) | §Arquitetura M71 |
| 2 | `worker` *(paralelo a #1)* | Adicionar filtro `feGaussianBlur` no `WhiteboardScene` aplicado ao grupo `<g>` da caneta (NÃO ao `<svg>` inteiro); `stdDeviation` proporcional à velocidade entre frames (`Math.min(speed * 0.05, 3)`); ativo apenas quando `speed > BLUR_THRESHOLD = 1.5` (caneta parada sem blur) | Remotion Guide (filtros SVG), Motion Guide (motion blur) | §Arquitetura M71 |
| 3 | `worker` *(paralelo a #1-2)* | Aplicar caneta melhorada em `src/features/video-render/components/SpeedPaintScene.tsx` (drawTool Canvas 2D) — consistência visual entre modos mask e vetorial (CT-F62, MDE-08) | — | §Arquitetura M71 |
| 4 | `test` *(paralelo a #1-3)* | Testes unitários (sem snapshot de componente Remotion — CT-T13): cálculo de inclinação `Math.atan2`, tremor determinístico, `stdDeviation` clamping em 3px, threshold de 1.5px/frame; **NÃO adicionar** `toMatchSnapshot` para `WhiteboardScene` (CT-T13) | Vitest Guide (unit) | §Estratégia 6.21 |

> **Notas:**
> - **#1:** Componente `Pencil` deve ser **função pura sem hooks** (CT-F63) — sem `useEffect`, sem `useState`, sem API assíncrona (restrição do Remotion)
> - **#1:** Tremor `Math.sin(frame * 0.5 + pathIndex) * 0.3` (frame + pathIndex, determinístico) — NUNCA `Math.random()` (quebraria determinismo do Remotion)
> - **#2:** `stdDeviation` MÁX 3px para não degradar FPS (CT-F66, RNF-02)
> - **#2:** Blur só no `<g>` da caneta, NUNCA no `<svg>` inteiro (CT-F67) — afetaria renderização dos paths
> - **#3:** `SpeedPaintScene.tsx` (drawTool Canvas 2D) — GAP-11 já mapeado
> - **#4:** Testes visuais (screenshot) **não** estão no escopo do projeto (contract §18)
> - **Crítico:** L11 é a maior leiva (L = 6-8h) — considerar quebrar em 2 PRs se ultrapassar budget de tokens
> - **Performance:** Smoke test deve medir FPS do preview Remotion (CT-P03, RNF-02)

**Validações obrigatórias:** `bun run lint` · `bun run typecheck` · `bun run test` · **code-validator** + **gap-finder** + **smoke manual**
**Critérios do contract:** CT-F58-F67, CT-C09, CT-S01, CT-B01-B08
**Comando final:** `bun run test tests/video-render/` + smoke manual com DevTools Performance (FPS)

---

## Gate L12 — Smoke release 0.132.0 final

**Objetivo:** Validação final macro, tag `v0.132.0` e deploy.
**Estimativa:** 1h (validações + tag + deploy)
**Quem aprova:** Matheus (release)

### Validações obrigatórias (9 etapas do contract §14 + smoke pós-release)

| # | Etapa | Comando | Esperado |
|---|-------|---------|----------|
| 1 | Lint | `bun run lint` | 0 erros, 0 warnings (CT-B01) |
| 2 | TypeCheck | `bun run typecheck` | Exit 0 (CT-B02) |
| 3 | Testes unitários | `bun run test` | 2268+ passando + novos (CT-B05) |
| 4 | Testes de integração | `bun run test tests/speed-paint/ tests/video-render/` | 0 falhas |
| 5 | Build | `bun run build` | Exit 0 (CT-B03) |
| 6 | Build completo | `bun run build:full` | Exit 0, 10 rotas pré-renderizadas (CT-B04) |
| 7 | Análise estática | `grep -rn "as StrokeAnimation\|: any\|@ts-ignore\|console.log" src/features/speed-paint/ src/pages/ src/features/video-render/` | 0 matches em código novo (CT-S01, CT-F33, CT-B06) |
| 8 | Smoke manual no navegador | Checklist completo abaixo (P0 + P1 + P2 se aprovadas) | Aprovado |
| 9 | Deploy preview + release | `bun run deploy:preview` + smoke E2E + `git tag v0.132.0` + `bun run deploy` | Sucesso |

### Smoke manual completo

**SpeedPaintPage (P0+P1):**
- [ ] Tooltips distintos (Clássico ≠ Desenho) — CT-F01-F03
- [ ] Trocar para Desenho → loading visível → preview whiteboard — CT-F12, CT-F14
- [ ] Trocar de volta para Clássico → preview raspadinha — CT-F16
- [ ] Causar erro → snackbar com `role="alert"` + botão retry — CT-F17
- [ ] Seletor de preset visível apenas em Desenho (16 opções, 6 grupos) — CT-F18, CT-F20
- [ ] Navegação por teclado (Tab, Enter, setas) — CT-A06, CT-A07

**VideoPage (P2 — se L7 implementado):**
- [ ] Seletor aparece com `animateScenes === true` — CT-F36
- [ ] Seletor oculta com `animateScenes === false` — CT-F37
- [ ] Modo persiste ao navegar (escopo de sessão) — CT-F39

**Batch (P1+P2):**
- [ ] Processar item na fila no modo Desenho → whiteboard — RF-08
- [ ] Exportar lote no modo Desenho → vídeo whiteboard — CT-F41
- [ ] Exportar lote no modo Clássico → vídeo raspadinha — CT-F42

**P2 (se implementados):**
- [ ] L9: 4 ordenações de desenho (top-down, center-out, big-first, random) — CT-F51
- [ ] L10: 3 opções de easing (linear, smooth, bounce) — CT-F56
- [ ] L11: Caneta com inclinação dinâmica + tremor determinístico + motion blur — CT-F59-F67

**i18n:**
- [ ] pt-BR, en, es — tooltips, presets, labels em cada idioma — CT-I01
- [ ] Nenhum `console.error` ao carregar (chaves faltando) — CT-I01

**Performance (se P2):**
- [ ] DevTools Performance: vetorização < 1000ms (P95) — CT-P01
- [ ] DevTools Performance: FPS do preview vetorial vs mask (≤ 5% diferença) — CT-P03

**Acessibilidade:**
- [ ] Lighthouse Accessibility audit em `/app/pintura-rapida` — score ≥ 90
- [ ] Navegação completa por teclado (Tab por todos os controles)

### Escopo confirmado
- [ ] `git diff v0.131.0 --name-only` — escopo restrito aos **19 arquivos** da arquitetura (plano §Arquivos)
- [ ] `QueueStaging.tsx`, `ImageUpload.tsx`, `AnimationDurationSelector.tsx` — **inalterados** (CT-C12)
- [ ] `vite.config.ts` — `DISABLE_HMR` **inalterado** (CT-B08)
- [ ] `HMR` não alterado, COEP não alterado (CT-S02)

### Pós-release
- [ ] Tag `v0.132.0` criada
- [ ] `bun run deploy` (build + functions + firebase deploy)
- [ ] Métricas pós-release configuradas (contract §12):
  - Adoção do modo Desenho ≥ 20% das sessões (30 dias)
  - ≥ 5 presets diferentes usados
  - ≥ 15% de exportações no modo vetorial
  - Taxa de erro `vectorizer` ≤ 1%
  - Performance P95 < 1000ms para 1080p

---

## Pendências do Matheus (D02-D08)

> Se Matheus não responder, o plano assume os padrões sugeridos por padrão. Gate L6 permite cancelar P2 inteiro se houver problema.

| ID | Decisão | Opções | Recomendação (padrão) | Bloqueia |
|----|---------|--------|-----------------------|----------|
| **D02** | Mecanismo de propagação na VideoPage (RF-06) | (a) `videoRenderBridge` Zustand; (b) prop drilling; (c) Context React | **(a) `videoRenderBridge`** — GAP-02 era falso positivo, store existe e tem 7 imports | L7 (P2) |
| **D03** | Escopo do seletor na VideoPage | (a) Global (compartilhado com SpeedPaintPage); (b) Sessão (sync ao entrar) | **(b) Sessão** — override local não vaza para SpeedPaint | L7 (P2) |
| **D04** | Lote uniforme vs misto (RF-07) | (a) Uniforme (mesmo modo); (b) Misto (cada cena) | **(a) Uniforme** — modo vigente na exportação | L8 (P2) |
| **D07** | Algoritmo Center-Out (RF-09) | (a) Centro geométrico; (b) Centro de massa; (c) Bounding box | **(a) Centro geométrico** (`width/2, height/2`) — simples e previsível | L9 (P2) |
| **D08** | Prioridade RF-11/12 (caneta, motion blur) | (a) v0.132.0; (b) v0.133.0+ | **(a) v0.132.0 (P2)** — gate L6 permite cancelar | L11 (P2) |
| **D05** | Padrão de nomenclatura i18n dos presets | (a) Numérico; (b) Técnico; (c) Grupos + tradução real | **(c) `speedPaint.presets.{presetName}` + `speedPaint.presetGroups.{groupName}`** com tradução real | L4 |
| **D08-texto** | Texto da limitação na UI (fotos vs line art) | (a) Texto neutro; (b) "Ideal para ilustrações"; (c) Sem aviso | **(b) "Modo Desenho funciona melhor com ilustrações e line art. Fotos podem não ficar ideais."** | L4 |

**Já resolvidos por decisão padrão (não precisam de Matheus):**
| ID | Decisão | Padrão |
|----|---------|--------|
| D01 | RF-06/RF-07: P1 ou "Em discussão"? | **P2 (v0.133.0+)** |
| D06 | RF-10: "velocidade proporcional" | **Duração uniforme com ease-in-out** |

**Como Matheus deve responder:** 5 perguntas simples (múltipla escolha ou Sim/Não). Pode aprovar tudo de uma vez assumindo padrões sugeridos.

---

## Comandos de Verificação (CLI)

```bash
# Após cada leiva (mínimo)
bun run lint
bun run typecheck
bun run test

# Após leivas com novos testes
bun run test tests/speed-paint/  # ou tests/video-render/ conforme aplicável
bun run test -- --coverage       # verifica threshold ≥ 80% (CT-T12)

# Antes de L6, L12 (gates)
bun run build
bun run build:full
bun run deploy:preview          # testar em ambiente preview

# Análise estática (CT-S01, CT-F33, CT-B07, CT-B08)
grep -rn "as StrokeAnimation" src/features/video-render/components/VideoComposition.tsx
grep -rn ": any" src/features/speed-paint/ src/pages/ src/features/video-render/
grep -rn "@ts-ignore" src/features/speed-paint/ src/pages/ src/features/video-render/
grep -rn "'@/" src/features/speed-paint/ src/pages/SpeedPaintPage.tsx

# Escopo
git diff v0.131.0 --name-only
git diff v0.131.0 --stat
```

---

## Notas Operacionais (caveats, workarounds, padrões do projeto)

### Padrões de código estabelecidos (NÃO divergir)
- **Type guard real:** `'paths' in animation` (alternativa: `isVetorialAnimation` de `strokeCache.ts`)
- **AbortController em escopo de módulo:** já usado nos controllers (`videoRenderController.tsx`, `speedPaintRenderController.tsx`)
- **`processingIdRef` + race protection:** padrão do `BatchOrchestrator.tsx:33-35`
- **Lazy import de Remotion:** preserva bundle principal (`createExportableComposition()`, etc.)
- **`useShallow` Zustand:** para seletores com múltiplos campos
- **`createLogger('contexto')`:** logging modular de `src/lib/logger`
- **Namespace i18n `speedPaint.*`:** organizado em 3 locales

### Caveats do projeto
- **COEP ativo em `/app/**`:** SharedArrayBuffer é necessário para Whisper + Remotion — **NÃO remover** (CT-S02)
- **`DISABLE_HMR` em `vite.config.ts`:** usado por AI Studio — **NÃO alterar** (CT-B08)
- **HMR:** login/logout/delete fazem full reload (COEP conflict) — manter comportamento
- **StackedHeader:** componente genérico de header padronizado — usar para novos headers (já no projeto)
- **useSyncSpeedPaintRenderMode:** hook de persistência dual storage (Firestore + IndexedDB) com debounce 2s — usar para novos campos de UserSettings
- **Movimento entre rotas:** controllers Zustand singleton (`videoRenderController`, `speedPaintRenderController`) substituem hooks inline — ciclo de vida do `renderMediaOnWeb` vive fora do React
- **useEffect cleanup que aborta render:** REMOVIDO dos controllers — **NÃO reintroduzir** (causa bugs cross-route)

### Limitações conhecidas (documentar, não "consertar")
- **`imagetracerjs` com texto:** "e as" vira tracinhos — limitação documentada em D08 (UI)
- **Snapshot/render de componentes Remotion:** pioneirismo, **fora do escopo** (CT-T13)
- **Testes e2e com Playwright:** não configurado no projeto
- **Backend/Cloud Functions para vetorização:** 100% client-side, BYOK — **NÃO** chamar Genkit para vetorização
- **Modo misto mask + vetorial no mesmo lote:** lote uniforme (MDE-13)

### Workarounds para armadilhas comuns
- **Cache LRU 20 entradas** com chave SHA-256 (inclui `mode + preset`): NÃO invalidar ao trocar modo/preset — chave diferente gera cache diferente
- **`MAX_PATHS_PER_SCENE = 500`:** truncamento + `log.warn` em vetorização — manter
- **`PATHOMIT_BY_PRESET`:** heurístico por preset (presets "ricos" como `'detailed'`/`'artistic4'` têm `pathomit` maior) — manter
- **Worker inline falha em Safari:** fallback main thread JÁ EXISTE (RNF-01) — usar
- **`BLUR_THRESHOLD = 1.5px/frame`:** motion blur só quando velocidade > threshold (RF-12) — performance preservada

### Cobertura de testes (RNF-04, CT-T12)
- **Funções novas:** ≥ 80% cobertura
- **Branches condicionais:** 100%
- **Tipos:** Zero `any`, zero `@ts-ignore`, zero `as` bypass (CT-S01)
- **i18n:** 100% das novas chaves nos 3 locales (CT-I01)
- **Acessibilidade:** `aria-label` em todo ToggleButton/Select (CT-A01, CT-A03)
- **Nenhum snapshot test** para componentes Remotion (CT-T13)

---

## Branch e PRs

**Branch base:** `feature/speed-paint-vetorial-completo` (a partir de `main` na tag 0.131.0)
**Total de PRs:** 12 (1 por leiva L0-L11 + 1 release L12)

| # | PR | Título | Leiva | Branch | Merge após |
|---|----|-------|-------|--------|------------|
| 1 | PR #1 | `chore(speed-paint): export isVetorialAnimation type guard` | L0 | `feature/l0-export-type-guard` | Validações L0 + code-validator |
| 2 | PR #2 | `feat(video): propagate renderMode in speed paint pipeline` | L1 | `feature/l1-pipeline-renderMode` | Validações L1 + code-validator + gap-finder + security |
| 3 | PR #3 | `feat(video): VideoComposition supports VetorialAnimation` | L2 | `feature/l2-videocomposition` | Validações L2 + code-validator |
| 4 | PR #4 | `fix(speed-paint): individual tooltips + reprocess on mode change` | L3 | `feature/l3-ui-sppparteA` | Validações L3 + code-validator + gap-finder + smoke |
| 5 | PR #5 | `feat(speed-paint): vetorial preset selector` | L4 | `feature/l4-ui-preset-selector` | Validações L4 + code-validator + smoke |
| 6 | PR #6 | `feat(speed-paint): BatchOrchestrator propagates renderMode` | L5 | `feature/l5-batch-orchestrator` | Validações L5 + code-validator + security |
| 7 | **Gate L6** | (sem PR — validação interna + decisão Matheus) | L6 | — | Decisão de avançar ou cancelar P2 |
| 8 | PR #7 | `feat(video): mode selector in VideoPage` | L7 (P2) | `feature/l7-video-page` | Validações L7 + code-validator + gap-finder + smoke |
| 9 | PR #8 | `feat(speed-paint): batch render with vetorial mode` | L8 (P2) | `feature/l8-batch-vetorial` | Validações L8 + code-validator + security |
| 10 | PR #9 | `feat(whiteboard): configurable path sort order` | L9 (P2) | `feature/l9-sort-paths` | Validações L9 + code-validator |
| 11 | PR #10 | `feat(whiteboard): configurable easing` | L10 (P2) | `feature/l10-easing` | Validações L10 + code-validator + gap-finder + smoke |
| 12 | PR #11 | `feat(whiteboard): realistic pencil + motion blur` | L11 (P2) | `feature/l11-pencil-blur` | Validações L11 + code-validator + gap-finder + smoke |
| 13 | PR #12 | `chore(release): v0.132.0` | L12 | `feature/release-0.132.0` | Validações L12 + tag `v0.132.0` + deploy |

**Convenção de commits:** `<tipo>(<escopo>): <descrição curta>` + bullets + `Refs: RF-XX, GAP-XX`
**Convenção de mensagem PR:** incluir checklist de validações (linhas copiadas da seção "Validações obrigatórias" da leiva)

---

## TODO de Execução

> Fonte canônica para a `todowrite` do orquestrador. Crie uma task por item e sincronize.

### Fase 1 — P0

- [ ] **L0** — Export `isVetorialAnimation` e `isStrokeAnimation` de `strokeCache.ts` — `fixer` — [PR #1]
- [ ] **L0.5** — Validação: lint + typecheck
- [ ] **L1** — Pipeline de vídeo (RF-04) — `worker` + `test` (paralelo) — [PR #2]
- [ ] **L1.5** — Validação: lint + typecheck + test + code-validator + gap-finder + security
- [ ] **L2** — VideoComposition (RF-05) — `worker` + `test` (paralelo) — [PR #3]
- [ ] **L2.5** — Validação: lint + typecheck + test + code-validator
- [ ] **L3** — UI SpeedPaintPage parte A (RF-01, RF-02) — `worker` + `ui-designer` + `worker` i18n + `test` (paralelo) — [PR #4]
- [ ] **L3.5** — Validação: lint + typecheck + test + code-validator + gap-finder + security + smoke manual

### Fase 2 — P1

- [ ] **L4** — UI SpeedPaintPage parte B (RF-03, seletor de preset) — `ui-designer` + `worker` + `worker` i18n + `test` (paralelo) — [PR #5]
- [ ] **L4.5** — Validação: lint + typecheck + test + code-validator + smoke manual
- [ ] **L5** — BatchOrchestrator (RF-08) — `worker` + `test` (paralelo) — [PR #6]
- [ ] **L5.5** — Validação: lint + typecheck + test + code-validator + security

### Gate L6

- [ ] **L6** — Smoke release 0.132.0-rc.1 — validação macro 9 etapas + decisão Matheus (avançar P2 ou cancelar)

### Fase 3 — P2 (CONDICIONAL ao gate L6)

- [ ] **L7** — UI VideoPage (RF-06) — `worker` + `worker` + `ui-designer` + `worker` i18n + `test` (paralelo) — [PR #7]
- [ ] **L7.5** — Validação: lint + typecheck + test + code-validator + gap-finder + smoke manual
- [ ] **L8** — Batch lote vetorial (RF-07) — `worker` + `worker` + `test` (paralelo) — [PR #8]
- [ ] **L8.5** — Validação: lint + typecheck + test + code-validator + security
- [ ] **L9** — sortPaths (RF-09) — `worker` + `worker` + `test` (paralelo) — [PR #9]
- [ ] **L9.5** — Validação: lint + typecheck + test + code-validator
- [ ] **L10** — Easing (RF-10) — `worker` + `worker` + `ui-designer` + `worker` i18n + `test` (paralelo) — [PR #10]
- [ ] **L10.5** — Validação: lint + typecheck + test + code-validator + gap-finder + smoke manual
- [ ] **L11** — Caneta + motion blur (RF-11, RF-12) — `worker` + `worker` + `worker` + `test` (paralelo) — [PR #11]
- [ ] **L11.5** — Validação: lint + typecheck + test + code-validator + gap-finder + smoke manual

### Gate L12

- [ ] **L12** — Smoke release 0.132.0 final — validação macro 9 etapas + tag + deploy — [PR #12]

---

## Desvios e Ajustes

| # | Desvio | Motivo | Decisão |
|---|--------|--------|---------|
| - | Nenhum desvio registrado até o momento | - | - |

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Total de leivas** | 12 + 2 gates (L0-L12) |
| **Módulos lógicos** | 8 (M1-M8) |
| **Arquivos modificados** | 19 (do architecture + gaps GAP-10/11/12) |
| **RFs cobertos** | 12/12 (4 P0 + 4 P1 + 4 P2) |
| **RNFs cobertos** | 9/9 |
| **Critérios do contract** | 132 (todos cobertos em alguma leiva) |
| **Novos testes** | ~10-12 arquivos de teste estendidos/criados |
| **Novas dependências** | 0 |
| **Notebooks NotebookLM a consultar** | 5 (MUI, React, Remotion, Motion, Vitest) |
| **Agents usados** | worker, fixer, ui-designer, test, code-validator, gap-finder, security |
| **Paralelismo máximo** | 2 agents |
| **Decisões pendentes do Matheus** | 5 (D02, D03, D04, D07, D08 — todas com padrão sugerido) |
| **Versão alvo** | 0.132.0 (2026-06-15+) |
| **Branch** | `feature/speed-paint-vetorial-completo` (a partir de `main` na tag 0.131.0) |
| **Total de PRs** | 12 (L0-L11) + 1 release (L12) |

---

*Tracker gerado por tracker-generator em 2026-06-15.*
*Tracker consolidado pelo tracker-generator em 2026-06-15. Baseado no plano-final.md.*
