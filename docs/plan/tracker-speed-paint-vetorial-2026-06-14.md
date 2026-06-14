# Tracker: Speed Paint Vetorial (Máscara → Path Animation)

**Data de geração:** 2026-06-14
**Última atualização:** 2026-06-14 (auditoria 2 explorers + decisão Matheus)
**Plano fonte:** docs/plano-speed-paint-vetorial-2026-06-14.md
**Stack:** React 19 + Remotion 4.0.448 + `@remotion/paths` + `imagetracerjs` + Zustand + MUI v9 + Vitest 4
**Scripts:** `bun run lint` · `bun run typecheck` · `bun run test` · `bun run build`

> **Nota 2026-06-14:** A **Fase 0 (spike experimental)** do plano original foi **removida** por decisão do Matheus. O plano agora começa direto pela Fase 1. Risco aceito: se o resultado visual não convencer, trabalho será refeito.

---

## Checklist de Validação (TODAS as fases)

- [ ] lint: 0 erros, 0 warnings (`bun run lint`)
- [ ] typecheck: 0 erros, 0 warnings (`bun run typecheck`)
- [ ] test: todos passando (`bun run test`)
- [ ] Máx 3 ciclos de correção respeitado por fase
- [ ] gap-finder: sem gaps bloqueadores
- [ ] code-validator: sem CRITICALs
- [ ] security: sem vulnerabilidades em superfícies sensíveis
- [ ] Modo máscara atual (`renderMode: 'mask'`) permanece 100% funcional como fallback
- [ ] Notebooks consultados nas fases relevantes
- [ ] build de produção sem erros (`bun run build`)

---

## Premissas e Lacunas

> **Auditoria executada em 2026-06-14 com 2 agents `explore` em paralelo.** Resultados:
> - Agent 1: Auditoria de 6 premissas do tracker + 7 lacunas extras
> - Agent 2: Análise de viabilidade técnica do código de referência + 10 riscos

| # | Premissa/Lacuna | Status | Impacto / Decisão |
|---|-----------------|--------|-------------------|
| 1 | **Caminho do controller diverge do plano.** O plano (§7:469) referencia `src/features/video-render/controllers/speedPaintRenderController.tsx`, mas o arquivo real está em `src/features/speed-paint/store/speedPaintRenderController.tsx`. Não existe diretório `controllers/` em `video-render/`. | ✅ **CORRETA** (confirmado por auditoria) | Todas as tarefas da Fase 3 que integram com o controller devem usar o caminho real `src/features/speed-paint/store/speedPaintRenderController.tsx`. |
| 2 | **Local de `WhiteboardComposition.tsx`.** O plano (§7:456) indica `src/features/video-render/components/`, mas a composição análoga atual (`SpeedPaintComposition.tsx`) vive em `src/features/speed-paint/components/`. `WhiteboardScene.tsx` em `video-render/components/` está correto (segue `SpeedPaintScene.tsx`). | 🟡 **PARCIAL** | `WhiteboardComposition.tsx` deve ir em `src/features/speed-paint/components/` (consistente com `SpeedPaintComposition.tsx` — confirmado: 62 linhas, wrapper fino). `WhiteboardScene.tsx` em `video-render/components/` (consistente com `SpeedPaintScene.tsx` — 467 linhas, lógica real). |
| 3 | **Sprite da caneta.** O plano cita `/hand-pencil.png` (§5.1:210) no código de referência mas lista `src/assets/speed-paint/hand-pencil.svg` (§7:458) nos arquivos novos. | ❌ **INCORRETA** (auditoria desmentiu) | **`drawTool()` atual do `SpeedPaintScene.tsx` (linhas 37-106) é Canvas 2D procedural, NÃO sprite reutilizável.** Pasta `src/assets/speed-paint/` não existe. **Decisão Matheus (2026-06-14):** Portar lógica de `drawTool()` para SVG inline dentro do `WhiteboardScene` (elimina latência de fetch, mantém estilo visual validado, permite rotação seguindo tangente via `getTangentAtLength()`). **NÃO criar `hand-pencil.svg` estático** — substituir por componente SVG inline. |
| 4 | **Preset default.** O plano (§10:513) deixa o preset default em aberto. Candidatos: `'artistic1'`, `'detailed'`, `'posterized2'`. | 🟡 **PARCIAL** | **Decisão Matheus (2026-06-14):** Default = `'artistic1'` (sweet spot para flat/cartoon). Outros presets disponíveis via seletor na UI (Fase 4). Campo `sourcePreset` será adicionado em `VetorialAnimation` quando criado (afirmação do tracker sobre "já acomoda" era incorreta — tipo não existe). |
| 5 | **`@remotion/paths` já instalado** (v4.0.448). Não requer instalação — apenas import. | 🟡 **PARCIAL** | **CORRETO** que está em `node_modules/` (v4.0.448), mas apenas como **dependência transitiva** de `@remotion/shapes` e `@remotion/transitions`. **NÃO está no `package.json` como dependência direta.** **Ação:** Adicionar como dependência explícita (`bun add @remotion/paths@4.0.448`) para evitar quebra futura se deps transitivas mudarem. |
| 6 | **Aviso crítico do notebook Remotion:** NUNCA usar `ref.current.getTotalLength()` — causa atraso de 1 frame e flickering na exportação. Sempre `getLength()` do `@remotion/paths` (§4.1:118). | ✅ **CORRETA** | O executor da Fase 3 deve seguir esta regra rigorosamente. `code-validator` (Fase 3.5) audita especificamente: zero `ref.current.getTotalLength()` no código de `WhiteboardScene.tsx`. `getLength()` e `getPointAtLength()` do `@remotion/paths` são síncronos (confirmado por leitura do código fonte do pacote). |
| 7 | **🆕 `imagetracerjs` não está instalado** (lacuna do Agent 1) | NÃO EXISTE | **Ação:** `bun add imagetracerjs@1.2.6` na Fase 1.0. |
| 8 | ~~**Fase 0 (spike experimental) não foi executada** (lacuna do Agent 1)~~ | ~~NÃO EXECUTADA~~ | ~~**Decisão Matheus (2026-06-14):** Pular spike. Ir direto para Fase 1. Risco aceito: se o resultado visual não convencer, trabalho será refeito.~~ **REMOVIDA POR DECISÃO DO MATHEUS EM 2026-06-14.** A Fase 0 (spike experimental) foi suprimida do tracker — o plano começa direto pela Fase 1. |
| 9 | **🆕 `animationStore.ts` é volátil** (sem `persist` middleware) — preferência de modo seria perdida no reload (lacuna do Agent 2) | SIM | **Decisão Matheus (2026-06-14):** Persistir `renderMode` em `UserSettings` (dual storage Firestore/IndexedDB — padrão do projeto). NÃO adicionar `persist` no `animationStore`. |
| 10 | **🆕 `strokeCache.ts` vai colidir** se mesma imagem for processada em modos diferentes (chave SHA-256 só tem URL) (risco #1 do Agent 2) | SIM | **Ação (Fase 1.4 preemptiva):** Generalizar `strokeCache.ts` para incluir `renderMode` + `vetorialPreset` na chave do hash antes de qualquer cache de vetorial. Discriminated union: `{ kind: 'mask', animation: StrokeAnimation } \| { kind: 'vetorial', animation: VetorialAnimation }`. |
| 11 | **🆕 Vectorizer (~281 KB) + Worker inline** (risco #2 do Agent 2) | AVALIADO | **Decisão Matheus (2026-06-14):** Manter no Worker inline + criar `processOnMainThreadVetorial()` como fallback (mesmo padrão do mask). Custo: parse de 290 KB por vetorização, mas cacheia resultado. Aceitável porque vetorização acontece 1x por imagem (não por frame). |
| 12 | **🆕 SVG com 500+ paths trava Remotion** (risco #3 do Agent 2) | SIM | **Ação (Fase 5.2):** Adicionar `MAX_PATHS_PER_SCENE = 500` no `vectorizer.ts` com warning via `createLogger('vectorizer')`. Usar `pathomit` do `imagetracerjs` para reduzir paths. |
| 13 | **🆕 Caneta desaparece entre paths** no código de referência (risco #5 do Agent 2) | SIM | **Ação (Fase 3.1):** Fallback — posicionar caneta no final do último path completo (via `getPointAtLength(path, pathLen)`) quando `drawnLength` está no gap entre dois paths. |
| 14 | **🆕 `canvasColor` ignorado no código de referência** (risco #10 do Agent 2) | SIM | **Ação (Fase 3.1):** Adicionar prop `canvasColor: 'white' \| 'black'` em `WhiteboardSceneProps` e usar no `backgroundColor` do SVG. |
| 15 | **🆕 Sem testes unitários para componentes Remotion no projeto** (risco #6 do Agent 2) | SIM | **Decisão:** Testar `WhiteboardScene` via fallback `processOnMainThreadVetorial()` (mesmo padrão do mask em `imageProcessing.unit.test.ts`). Snapshot/render de componente Remotion fica fora do escopo (seria pioneirismo). |
| 16 | **🆕 Worker inline + `imagetracerjs` em batch (múltiplas cenas)** (risco #9 do Agent 2) | SIM | Worker efêmero (criado/terminado por chamada) — mas em batch com N imagens, são N parses de 290 KB. **Mitigação Fase 5.2:** Considerar pré-vetorizar batch em paralelo na main thread antes de enviar ao Worker. |

---

## Fases

### Fase 1: Fundação (Tipos, Store, Feature Flag)

**Objetivo:** Criar tipos vetoriais, wrapper do vectorizer e feature flag `renderMode` — sem mudar comportamento visual. Tudo é aditivo; o modo máscara continua funcionando.

**Duração estimada:** 2 dias

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Criar `src/features/speed-paint/types/vetorial.ts` com interfaces `VetorialPath` (`d`, `length`, `color`, `strokeWidth`) e `VetorialAnimation` (`id`, `canvasWidth`, `canvasHeight`, `paths`, `totalLength`, `fps`, `resizedImage`, `sourcePreset`). Tipos explícitos, sem `any`. Arquivo: `src/features/speed-paint/types/vetorial.ts` (novo) | TypeScript 6 Guide | `§6 Fase 1:372-391` |
| 2 | `worker` | Criar `src/features/speed-paint/lib/vectorizer.ts`: wrapper assíncrono em torno de `imagetracerjs.imagedataToSVG()` que recebe `ImageData` + preset, retorna `VetorialPath[]`. Filtro de paths pequenos (`pathomit`). Pré-calcular `length` de cada path via `@remotion/paths.getLength()` durante a vetorização. Arquivo: `src/features/speed-paint/lib/vectorizer.ts` (novo) | Remotion Docs | `§6 Fase 1:392-395` · `§5.1:186-215` |

> **Notas:**
> - **#1 → #2 são sequenciais:** `vectorizer.ts` importa os tipos de `vetorial.ts`. Task 1 deve terminar antes da Task 2 começar.
> - **#2:** O parsing do SVG string retornado pelo `imagetracerjs` deve extrair cada `<path d="...">` individualmente. Usar parser XML nativo (`DOMParser`) ou regex robusta. Considerar `evolvePath`/`cutPath` do `@remotion/paths` para paths muito longos.
> - **Após #2, na próxima fase da tabela (paralelo):**

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 3 | `worker` | Estender `src/features/speed-paint/types.ts` (re-exportar tipos vetoriais) e adicionar campo `renderMode: 'mask' \| 'vetorial'` (default `'mask'`) + `vetorialPreset: string` no `AnimationState` de `src/features/speed-paint/store/animationStore.ts`. Manter 100% do comportamento atual. Arquivos: `src/features/speed-paint/types.ts`, `src/features/speed-paint/store/animationStore.ts` | — | `§6 Fase 1:397-398` · `§7:464-466` |

> **Notas:**
> - **#3:** O `renderMode` default DEVE ser `'mask'` — retrocompatibilidade com projetos existentes. O `'vetorial'` só vira default após Fase 5 validada (decisão de produto separada).
> - **#3:** `animationStore.ts` importa de `../types` — o re-export em `types.ts` evita import circular.

#### Fase 1.5: Validação

1. Rodar `gap-finder` + `code-validator` em paralelo → auditar tipos criados, feature flag e wrapper
2. Se encontrar Critical ou Warning → corrigir com `fixer` antes de seguir
3. Rodar `bun run lint && bun run typecheck && bun run test` → deve passar com 0 erros e 0 warnings
4. `code-validator` deve confirmar: zero uso de `any`, tipos explícitos, `renderMode` default `'mask'`, comportamento atual inalterado

---

### Fase 2: Vetorização no Worker

**Objetivo:** Integrar o vectorizer no pipeline de processamento (Web Worker) com branch por `renderMode`. Atualizar cache para suportar `VetorialAnimation`.

**Duração estimada:** 2 dias · **Depende de:** Fase 1

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Modificar `src/features/speed-paint/lib/imageProcessing.ts`: quando `renderMode === 'vetorial'`, chamar `vectorizer.ts` em vez de `processSketch()`/`processReveal()`. Adaptar o Web Worker inline (Blob URL) para importar e executar `imagetracerjs`. Manter branch `renderMode === 'mask'` com código atual intacto (fallback). Arquivo: `src/features/speed-paint/lib/imageProcessing.ts` | — | `§6 Fase 2:405-408` · `§Apêndice B:552-560` |
| 2 | `worker` | Atualizar `src/features/video-render/lib/strokeCache.ts` para cachear `VetorialAnimation` além de `StrokeAnimation`. Generalizar `CacheEntry` para aceitar ambos os tipos (união ou discriminated union por `renderMode`). Manter cache LRU existente (20 entradas, SHA-256). Arquivo: `src/features/video-render/lib/strokeCache.ts` | — | `§6 Fase 2:410` · `§7:467` |

> **Notas:**
> - **#1 e #2 são paralelos** — tocam arquivos diferentes sem dependência direta.
> - **#1:** O Worker atual é inline via Blob URL (ver `createImageProcessingWorker()`). `imagetracerjs` é JS puro síncrono — pode rodar dentro do Worker sem adaptação. Considerar fallback para main thread (já existe `processOnMainThread`) no modo vetorial também.
> - **#2:** O cache é compartilhado entre mask e vetorial. A chave (SHA-256 da URL) deve incluir o `renderMode` + `preset` no hash para evitar colisão entre animações dos dois modos da mesma imagem.
> - **#2:** `strokeCache.ts` importa `StrokeAnimation` de `../../speed-paint/types` — adicionar import de `VetorialAnimation` do mesmo local.

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 3 | `test` | Criar testes unitários para `vectorizer.ts`: (a) vetorização básica de ImageData retorna `VetorialPath[]` válido; (b) filtro de `pathomit` remove paths pequenos; (c) `length` pré-calculado é positivo; (d) preset diferentes geram outputs diferentes; (e) erro graceful para ImageData inválido. Arquivo: `tests/speed-paint/vectorizer.unit.test.ts` (novo) | Vitest Guide | `§6 Fase 2:411` |

> **Notas:**
> - **#3 roda após #1 e #2** — precisa do vectorizer integrado para testar o caminho completo. Pode rodar em paralelo com a Fase 2.5 se #1/#2 já estiverem validados.

#### Fase 2.5: Validação

1. Rodar `gap-finder` + `code-validator` em paralelo → auditar integração do worker, branch de fallback e cache
2. Se encontrar Critical ou Warning → corrigir com `fixer` antes de seguir
3. Rodar `bun run lint && bun run typecheck && bun run test` → deve passar
4. `security` → auditar Worker (validação de input de ImageData, sanitização de SVG parseado)
5. `code-validator` deve confirmar: branch mask inalterada, Worker não trava main thread, cache sem vazamento de memória

---

### Fase 3: Composição Remotion Vetorial

**Objetivo:** Criar o componente `WhiteboardScene` que renderiza paths animados com `strokeDashoffset` + caneta seguindo a ponta do traço. Integrar como composição lazy no controller.

**Duração estimada:** 2 dias · **Depende de:** Fase 2

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Criar `src/features/video-render/components/WhiteboardScene.tsx` baseado EXATAMENTE no código de referência do plano (§5.3:229-340). Componente determinístico: `useCurrentFrame()` → `interpolate` → `drawnLength` → `strokeDashoffset` + posição da caneta via `getPointAtLength()`. Props: `paths: VetorialPath[]`, `durationInFrames`, `canvasWidth`, `canvasHeight`. Arquivo: `src/features/video-render/components/WhiteboardScene.tsx` (novo) | Remotion Docs · React Docs | `§5.3:229-340` · `§6 Fase 3:418` |
| 2 | `worker` | Criar composição wrapper `WhiteboardComposition.tsx` (seguir padrão de `SpeedPaintComposition.tsx`). **NÃO criar sprite externo** (Premissa #3 — decisão Matheus: `drawTool()` será portado para SVG inline dentro do `WhiteboardScene` na task #1). Integrar no controller criando `createExportableWhiteboardComposition()` (lazy async, mesmo padrão de `createExportableSpeedPaintComposition()`). Controller seleciona composição por `renderMode`. Arquivos: `src/features/speed-paint/components/WhiteboardComposition.tsx` (novo), `src/features/speed-paint/store/speedPaintRenderController.tsx` (modificar — ver Premissa #1) | Remotion Docs | `§6 Fase 3:419-421` · `§7:455-456` · `§7:469` |

> **Notas:**
> - **#1 → #2 sequenciais:** `WhiteboardComposition` envolve `WhiteboardScene`. Task 1 primeiro.
> - **#1:** **REGRA CRÍTICA** (Premissa #6): NUNCA usar `ref.current.getTotalLength()`. Sempre `getLength(pathData)` do `@remotion/paths` — síncrono, sem DOM, sem flickering. code-validator audita isto especificamente.
> - **#1:** O cálculo de `drawnLength` e acumulação de paths (completo/parcial/não começado) deve seguir o algoritmo do §5.3:251-281 exatamente. Sem estado, sem effects, sem DOM refs — matemática pura derivada de `useCurrentFrame()`.
> - **#1:** **Portar lógica de `drawTool()` (SpeedPaintScene.tsx linhas 37-106) para SVG inline** (Premissa #3 — decisão Matheus). A caneta vira um componente SVG dentro do mesmo `<svg>` do `WhiteboardScene`, usando `getPointAtLength()` para posição e `getTangentAtLength()` para rotação opcional.
> - **#1:** Adicionar prop `canvasColor: 'white' \| 'black'` em `WhiteboardSceneProps` e usar no `backgroundColor` do SVG (Premissa #14).
> - **#1:** Implementar fallback da caneta entre paths: quando `drawnLength` está no gap entre um path completo e o próximo, posicionar caneta no final do último path completo (Premissa #13).
> - **#2:** O controller está em `src/features/speed-paint/store/speedPaintRenderController.tsx` (NÃO em `video-render/controllers/` — Premissa #1). As composições lazy existentes são `createExportableSpeedPaintComposition()` e `createExportableBatchSpeedPaintComposition()` — seguir o mesmo padrão async.

#### Fase 3.5: Validação (Gate obrigatório — code-validator na composição Remotion)

1. Rodar `code-validator` → **foco específico** na composição Remotion: determinismo por frame, uso correto de `getLength()` (não `ref.getTotalLength()`), sem estado mutável, sem effects com side-effects na renderização
2. Rodar `gap-finder` em paralelo → validar se `WhiteboardScene` cobre todas as características visuais do §3.2:89-96 (linha cresce, caneta segue, traço contínuo, ordem lógica)
3. Se encontrar Critical ou Warning → corrigir com `fixer` antes de seguir
4. Rodar `bun run lint && bun run typecheck && bun run test` → deve passar
5. `code-validator` deve confirmar: determinismo (mesmo frame = mesmo output sempre), zero `useEffect`/`useState` no caminho de render, props tipadas com `VetorialPath[]`

---

### Fase 4: UI e Integração

**Objetivo:** Usuário consegue escolher o modo de renderização (Clássico/Desenho) no SpeedPaintPage. Persistência + i18n + analytics.

**Duração estimada:** 1 dia · **Depende de:** Fase 3

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `worker` | Adicionar seletor de modo no `SpeedPaintPage.tsx`: "Modo Clássico" (mask — atual) e "Modo Desenho" (vetorial — novo). Persistir `renderMode` na store Zustand (já adicionado na Fase 1). Usar componente MUI v9 (ToggleButtonGroup ou RadioGroup), padrão visual do projeto. Arquivo: `src/pages/SpeedPaintPage.tsx` | React Docs · MUI | `§6 Fase 4:429-431` |
| 2 | `worker` | Adicionar 4 chaves i18n × 3 locales (`pt-BR`, `en`, `es`) no namespace `speedPaint`: `modeLabel`, `modeClassic`, `modeVetorial`, `modeDescription`. Adicionar evento analytics `speed_paint_mode_changed` em `src/lib/analytics.ts` (tipar no `AnalyticsEventMaps`). Arquivos: `src/locales/pt-BR/speedPaint.json`, `src/locales/en/speedPaint.json`, `src/locales/es/speedPaint.json`, `src/lib/analytics.ts` | — | `§6 Fase 4:432-434` |

> **Notas:**
> - **#1 e #2 paralelos** — tocam arquivos diferentes. Mas #1 depende conceitualmente de #2 (rótulos i18n). Executar #2 primeiro ou garantir que #1 use as chaves i18n corretas.
> - **#1:** O seletor deve respeitar o padrão visual MUI v9 do projeto (sem Tailwind). Considerar `StackedHeader` (§AGENTS.md) se houver contexto de seção colapsável. Keyboard accessible.

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 3 | `ui-designer` | Refinar aparência, layout e acessibilidade do seletor de modo no `SpeedPaintPage.tsx`. Garantir feedback visual claro do modo ativo, labels descritivas, aria-labels, contraste e responsividade mobile. Manter padrão visual do projeto (MUI v9, tema dark, tokens brand/glow). Arquivo: `src/pages/SpeedPaintPage.tsx` | MUI | `§6 Fase 4:429-431` |

> **Notas:**
> - **#3 roda após #1** — refina o que #1 implementou. Mesmo arquivo → obrigatoriamente sequencial.

#### Fase 4.5: Validação

1. Rodar `gap-finder` + `code-validator` em paralelo → auditar seletor, persistência e i18n
2. Se encontrar Critical ou Warning → corrigir com `fixer` antes de seguir
3. Rodar `bun run lint && bun run typecheck && bun run test` → deve passar
4. `security` → auditar evento analytics (não vazar dados sensíveis no payload)
5. Confirmar: i18n completo nos 3 locales, persistência funciona após reload, analytics dispara corretamente

---

### Fase 5: Validação e Polish

**Objetivo:** Testar com imagens diversas, otimizar performance, cobrir edge cases e revisão final antes de release.

**Duração estimada:** 1-2 dias · **Depende de:** Fase 4

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 1 | `test` | Criar testes de snapshot/render comparando frames da composição vetorial em pontos-chave (0%, 25%, 50%, 75%, 100%). Testar edge cases: imagens transparentes, muito escuras, muito claras, com poucos paths, com muitos paths. Arquivos: `tests/video-render/WhiteboardScene.component.test.tsx` (novo), `tests/speed-paint/vectorizer.integration.test.ts` (novo) | Vitest Guide · React Docs | `§6 Fase 5:439-443` |
| 2 | `refactor` | Otimizar performance da vetorização para imagens 1920×1080 sem travar a UI. Implementar: (a) **`MAX_PATHS_PER_SCENE = 500`** com warning via `createLogger('vectorizer')` ao exceder (Premissa #12); (b) ajuste de `pathomit` do `imagetracerjs` ao preset default para controlar complexidade; (c) redimensionamento pré-vetorização se >1080p; (d) para batch, considerar pré-vetorizar em paralelo na main thread antes de enviar ao Worker (Premissa #16); (e) Worker mantém main thread livre (já garantido por Premissa #11). Arquivos: `src/features/speed-paint/lib/vectorizer.ts`, `src/features/speed-paint/lib/imageProcessing.ts` | — | `§6 Fase 5:441` · `§8:482-484` |

> **Notas:**
> - **#1 e #2 paralelos** — #1 cria testes (novos arquivos), #2 otimiza arquivos existentes. Atenção: se #2 mudar assinaturas de `vectorizer.ts`, #1 pode quebrar. Coordenar para que #2 não mude a API pública.
> - **#2:** Risco documentado (§8:482): SVG com muitos paths trava o Remotion. Mitigação: definir `MAX_PATHS_PER_SCENE` (ex: 500) e logar warning (`createLogger`) ao exceder. Considerar simplificar paths via `imagetracerjs` options (`numberofcolors`, `pathomit`).

| # | Agent | Tarefa | Notebooks | Plano |
|---|-------|--------|-----------|-------|
| 3 | `worker` | Testar com 10 imagens diversas (Gemini flat design, logos, fotos) end-to-end no app real. Validar: (a) renderização exporta vídeo corretamente; (b) caneta segue traço com precisão; (c) fallback mask ainda funciona; (d) cache diferencia modos. Otimizar preset default baseado nos resultados. Validar com `bun run build` (build de produção sem erros). | Remotion Docs | `§6 Fase 5:439-440` |

> **Notas:**
> - **#3 roda após #1 e #2** — precisa dos testes e otimizações prontos para validar end-to-end.

#### Fase 5.5: Validação Final (Gate de Release — gap-finder + code-validator em paralelo)

1. Rodar `gap-finder` + `code-validator` **em paralelo** → auditoria completa de todo o trabalho das Fases 1-5 contra o plano fonte
2. `gap-finder` deve validar: todos os 6 arquivos novos criados, todos os 9 arquivos modificados cobertos, feature flag funcional, fallback mask preservado, critérios do §3.2 atendidos
3. `code-validator` deve confirmar: SOLID respeitado, zero `any`, tipagem explícita, determinismo Remotion, padrões do projeto (logger `createLogger`, MUI v9, sem Tailwind, `import.meta.env`)
4. `security` → auditoria final: Worker input validation, sanitização SVG, sem injeção de path data malicioso
5. Se encontrar Critical ou Warning → corrigir com `fixer` (correção pontual) ou `worker` (implementação faltante) antes de release
6. Rodar `bun run lint && bun run typecheck && bun run test && bun run build` → tudo deve passar com 0 erros
7. **Gate humano (Matheus):** aprovar release da versão `0.131.0`

---

## TODO de Execução

> Fonte canônica para a `todowrite` do orquestrador. Crie uma task por item e sincronize.
>
> ~~Fase 0: Spike experimental — REMOVIDA por decisão do Matheus em 2026-06-14~~

- [ ] **Fase 1.0**: Instalar dependências — `bun add imagetracerjs@1.2.6 @remotion/paths@4.0.448` (Premissas #5 e #7)
- [ ] **Fase 1.1**: Criar `src/features/speed-paint/types/vetorial.ts` — `worker`
- [ ] **Fase 1.2**: Criar `src/features/speed-paint/lib/vectorizer.ts` — `worker` (após 1.1)
- [ ] **Fase 1.3**: Estender `types.ts` + `animationStore.ts` com `renderMode` + `vetorialPreset` — `worker` (após 1.1)
- [ ] **Fase 1.4**: Generalizar `strokeCache.ts` para `VetorialAnimation` (preemptivo, Premissa #10) — `worker` (após 1.1, paralelo a 1.2/1.3)
- [ ] **Fase 1.5**: Validação — gap-finder + code-validator + lint/typecheck/test
- [ ] **Fase 2.1**: Integrar vectorizer no Worker (`imageProcessing.ts`) — `worker`
- [ ] **Fase 2.2**: Testes unitários do `vectorizer.ts` — `test` (após 2.1)
- [ ] **Fase 2.5**: Validação — gap-finder + code-validator + security + lint/typecheck/test
- [ ] **Fase 3.1**: Criar `WhiteboardScene.tsx` (com `drawTool()` portado para SVG, Premissas #3, #13, #14) — `worker`
- [ ] **Fase 3.2**: Criar `WhiteboardComposition` + integrar no controller — `worker` (após 3.1)
- [ ] **Fase 3.5**: Validação [Gate] — code-validator (foco Remotion) + gap-finder + lint/typecheck/test
- [ ] **Fase 4.1**: Adicionar seletor de modo no `SpeedPaintPage.tsx` — `worker`
- [ ] **Fase 4.2**: Adicionar chaves i18n + evento analytics + persistência em `UserSettings` (Premissa #9) — `worker` (paralelo a 4.1)
- [ ] **Fase 4.3**: Refinamento UI/UX do seletor — `ui-designer` (após 4.1)
- [ ] **Fase 4.5**: Validação — gap-finder + code-validator + security + lint/typecheck/test
- [ ] **Fase 5.1**: Testes de snapshot/render do `WhiteboardScene` + integração `vectorizer` — `test`
- [ ] **Fase 5.2**: Refactor de performance (`MAX_PATHS_PER_SCENE = 500`, Premissas #12, #16) — `refactor` (paralelo a 5.1)
- [ ] **Fase 5.3**: Teste end-to-end com 10 imagens — `worker` (após 5.1 e 5.2)
- [ ] **Fase 5.5**: Validação Final [Gate de Release] — gap-finder + code-validator + security (paralelo) + lint/typecheck/test/build + aprovação Matheus

---

## Desvios e Ajustes

| # | Desvio | Motivo | Decisão |
|---|--------|--------|---------|
| 1 | Caminho do controller diverge do plano (§7:469) | Plano referencia `video-render/controllers/` mas arquivo real está em `speed-paint/store/` | Usar caminho real `src/features/speed-paint/store/speedPaintRenderController.tsx` em todas as tarefas |
| 2 | Local de `WhiteboardComposition.tsx` diverge do plano (§7:456) | Plano indica `video-render/components/` mas `SpeedPaintComposition.tsx` análoga vive em `speed-paint/components/` | Colocar em `src/features/speed-paint/components/` para consistência (executor confirma padrão) |
| 3 | **Fase 0 (spike experimental) removida do plano** (2026-06-14) | Decisão do Matheus: ir direto para Fase 1 sem validar visualmente o `imagetracerjs` primeiro. Risco aceito. | Plano agora começa na Fase 1.0 (instalação de dependências). TODO de Execução atualizado. |
| 4 | **`hand-pencil.svg` removido dos arquivos novos** (2026-06-14) | Decisão do Matheus: portar lógica de `drawTool()` (Canvas 2D procedural) para SVG inline dentro do `WhiteboardScene.tsx` | Premissa #3 atualizada. Arquivo `src/assets/speed-paint/hand-pencil.svg` deixa de ser criado. |
| 5 | **Persistência de `renderMode` movida para `UserSettings`** (2026-06-14) | Decisão do Matheus: seguir padrão dual storage (Firestore/IndexedDB) do projeto, em vez de `persist` middleware no `animationStore` | Premissa #9 atualizada. Fase 4.2 inclui hook de leitura/escrita no `UserSettings`. |

---

## Referências Rápidas

| Recurso | Onde |
|---------|------|
| Plano fonte completo | `docs/plano-speed-paint-vetorial-2026-06-14.md` |
| Código de referência WhiteboardScene | §5.3:229-340 do plano |
| API `@remotion/paths` | §4.1:103-120 do plano · Notebook Remotion Docs |
| API `imagetracerjs` | §4.4:144-181 do plano |
| Riscos e mitigações | §8:476-486 do plano |
| Renderer atual (máscara) | `src/features/video-render/lib/speedPaintRenderer.ts` — `renderSpeedPaintFrame()` |
| Worker atual | `src/features/speed-paint/lib/imageProcessing.ts` — `generateStrokesFromImage()` |
| Controller (real) | `src/features/speed-paint/store/speedPaintRenderController.tsx` |
| Store | `src/features/speed-paint/store/animationStore.ts` |
| Tipos (mask) | `src/features/speed-paint/types.ts` |
| Tipos (vetorial, novo) | `src/features/speed-paint/types/vetorial.ts` |
| Vectorizer (novo) | `src/features/speed-paint/lib/vectorizer.ts` |
| Cache | `src/features/video-render/lib/strokeCache.ts` |
| Composição (mask) | `src/features/speed-paint/components/SpeedPaintComposition.tsx` |
| Composição (vetorial, nova) | `src/features/speed-paint/components/WhiteboardComposition.tsx` |
| Cena (mask) | `src/features/video-render/components/SpeedPaintScene.tsx` |
| Cena (vetorial, nova) | `src/features/video-render/components/WhiteboardScene.tsx` |
| `drawTool()` a portar | `src/features/video-render/components/SpeedPaintScene.tsx` linhas 37-106 |
| `UserSettings` (persistência) | `src/features/user-settings/` (padrão dual storage) |
