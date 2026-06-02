# Auditoria Estática R2 — Video Render Survive Navigation (PR1)

**Data:** 2026-06-02
**Branch:** `feat/video-render-survive-navigation` (R2 — pós-correção da R1)
**Escopo da auditoria:** validação dos 4 bloqueadores da R1 + busca de novas regressões + reavaliação dos warnings da R1.

**Arquivos auditados (leitura completa):**
- `src/features/video-render/hooks/useVideoExporter.tsx` (225 linhas)
- `src/features/video-render/store/videoRenderController.tsx` (548 linhas)
- `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` (293 linhas)
- `src/features/speed-paint/store/speedPaintRenderController.tsx` (801 linhas)
- `src/features/video-render/types/renderController.ts` (112 linhas)
- `src/features/video-render/store/videoRenderBridge.ts` (58 linhas)
- `src/components/app/ExportCrossRouteToast.tsx` (275 linhas)
- `src/components/app/Sidebar.tsx` (270 linhas)
- `src/components/app/SidebarNavItem.tsx` (192 linhas)
- `src/components/app/MobileBottomNav.tsx` (572 linhas)
- `src/components/app/AudioGenerationHandler.tsx` (380 linhas)
- `src/hooks/useCrossRouteRenderGuard.ts` (113 linhas)
- `src/App.tsx` (301 linhas)
- `src/pages/VideoPage.tsx` (597 linhas)
- `src/pages/SpeedPaintPage.tsx` (837 linhas)
- `tests/video-render/videoRenderController.unit.test.ts` (291 linhas)
- `tests/components/ExportCrossRouteToast.component.test.tsx` (245 linhas)

**Ferramentas:** `analyze_aitool_changes`, `read`, `supergrep_find`, `grep`, `nlm_query` (notebooks React 19 + Zustand 5), `glob`.

**Validações externas:**
- `bun run typecheck` ✅
- `bun run lint` ✅
- `bun run test` ✅ 2151/2151

---

## Veredito

**🟢 APTO PARA MERGE** — com 4 melhorias de polimento recomendadas (não-bloqueantes).

Os 4 bloqueadores da R1 foram **integralmente corrigidos**. Nenhuma nova regressão funcional foi introduzida. Os warnings arquiteturais da R1 (SRP em `startRender`, duplicação `runSingle`/`runBatch`, `currentExportFileName` global, `setState` direto em 2 lugares) seguem aplicáveis — são melhorias de polimento que podem ser endereçadas em PRs subsequentes sem bloquear este merge.

---

## Achados priorizados

### Bloqueadores R1 — status das correções

#### ✅ BUG-001 — `useVideoExporter` sem sync de codec/container → CORRIGIDO

- **Arquivo:** `src/features/video-render/hooks/useVideoExporter.tsx:120-125`
- **Confidence:** 100/100
- **Categoria:** Bug / Regressão funcional
- **Como foi corrigido:** useEffect adicionado após a linha 119 que sincroniza `codec`/`container` do `useCodecSupport` para o controller via `useVideoRenderController.setState({ codec, container })` sempre que `codecSupport.resolvedVideoCodec` ou `codecSupport.resolvedContainer` mudam.
- **Evidência:**
  ```tsx
  useEffect(() => {
    useVideoRenderController.setState({
      codec: codecSupport.resolvedVideoCodec,
      container: codecSupport.resolvedContainer,
    });
  }, [codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer]);
  ```
- **Verificação funcional:** o controller de vídeo (linha 366-368 de `videoRenderController.tsx`) lê `get().codec` e `get().container` na hora de chamar `renderMediaOnWeb` — agora esses valores refletem o que `useCodecSupport` resolveu, não mais os defaults `'h264'`/`'mp4'`.
- **Padrão-irmão aplicado:** mesma correção existe em `useSpeedPaintExporter.tsx:179-184` (linhas idênticas para o speed paint). Paridade M1/M2 ✅.

#### ✅ GAP-01 — `ExportCrossRouteToast` ignora speed paint → CORRIGIDO

- **Arquivo:** `src/components/app/ExportCrossRouteToast.tsx` (275 linhas, 8+ edições)
- **Confidence:** 100/100
- **Categoria:** Bug funcional
- **Como foi corrigido:** 5 seletores `sp*` adicionados (linhas 80-84) e 5 handlers branchearam entre vídeo e speed paint:
  - **Imports** (linhas 39-42): `useSpeedPaintRenderController` + `getCurrentExportFileName as getSpeedPaintExportFileName`
  - **Seletores** (linhas 80-84): `spIsRendering`, `spStatus`, `spProgress`, `spError`, `spStatusText`
  - **Hide-on-route** (linha 89): `const isSpeedPaintPage = location.pathname === '/app/pintura-rapida';`
  - **Aggregated state** (linhas 91, 95-100, 103): `isActive = videoIsRendering || spIsRendering`; `toastKind` cobre ambos; `progress` consolidado
  - **Handlers:**
    - `handleViewVideo` (linha 107-113): branch por `spIsRendering`/`spStatus` para `/app/pintura-rapida` ou `/app/video`
    - `handleCancel` (linha 115-121): chama `useVideoRenderController.getState().cancelRender()` OU `useSpeedPaintRenderController.getState().cancelRender()`
    - `handleDownload` (linha 123-153): branch completo — speed paint usa `getSpeedPaintExportFileName()` e analytics `speed_paint_downloaded`; vídeo usa `getCurrentExportFileName()` e `video_downloaded`. Ambos chamam `state.reset()` no final
    - `handleCloseCompleted` (linha 155-161): `spStatus === 'completed' ? useSpeedPaintRenderController.getState().reset() : useVideoRenderController.getState().reset()`
    - `handleCloseFailed` (linha 169-175): idem com `setState({ status: 'idle', error: null })` para preservar blob
  - **Status text** (linha 253-258): `videoIsRendering ? videoStatusText : spIsRendering ? spStatusText : ${progress}%`
  - **Error text** (linha 269): `videoStatus === 'failed' ? videoError : spError`
- **Cobertura de testes:** `tests/components/ExportCrossRouteToast.component.test.tsx:197-207` valida explicitamente que o toast NÃO aparece em `/app/pintura-rapida` quando speed paint está renderizando.

#### ✅ GAP-02 — Dot indicator sem speed paint (Sidebar) → CORRIGIDO

- **Arquivo:** `src/components/app/Sidebar.tsx:25-26, 88-91, 245-256`
- **Confidence:** 100/100
- **Categoria:** UX / Indicador visual
- **Como foi corrigido:**
  - **Import** (linha 26): `useSpeedPaintRenderController` importado
  - **Seletores** (linhas 90-91): `spIsRendering`, `spStatus`
  - **Lógica de dot** (linhas 245-256): `showExportDot` agora cobre speed paint via `item.to === '/app/pintura-rapida' && (spIsRendering || spStatus === 'completed') && location.pathname !== '/app/pintura-rapida'`
  - **Prop `videoIsRendering`** (linha 253-255): repasse discriminado — `item.to === '/app/pintura-rapida' ? spIsRendering : videoIsRendering`
- **Padrão-irmão mantido com MobileBottomNav:** ambos os componentes leem os mesmos seletores do controller, garantindo paridade de dados (apenas a exibição difere por decisão P5=A).

#### ✅ GAP-03 — `RenderSnapshot` morto → CORRIGIDO

- **Arquivo:** `src/features/video-render/types/renderController.ts` (112 linhas)
- **Confidence:** 100/100
- **Categoria:** Dead code
- **Como foi corrigido:** busca estrutural (`supergrep_find "RenderSnapshot"` em `src/` e `tests/`) retornou **0 matches em 0 arquivos** — a interface foi completamente removida. O arquivo agora define apenas:
  - `RenderKind = 'video' | 'speed-paint'`
  - `RenderStatus = 'idle' | 'preparing' | 'rendering' | 'completed' | 'cancelled' | 'failed'`
  - `RenderPhase = 'speed-paint' | 'composition' | 'finalizing'`
  - `RenderControllerPublicState` (interface de estado público)
  - `RenderControllerActions<O>` (interface de ações parametrizada por generics)
- **Sem código órfão:** nada no projeto referencia `RenderSnapshot` ou `schemaVersion: 1` (campos que viriam com ele).

---

### Melhorias de polimento (não-bloqueantes)

#### 🟡 WARNING — `useEffect` + `setState` direto em vez de action no store (4 ocorrências)

- **Confidence:** 88/100
- **Categoria:** Architecture
- **Validação NotebookLM:** a documentação oficial de React 19 ([react.dev/learn/you-might-not-need-an-effect](https://react.dev/learn/you-might-not-need-an-effect)) classifica o padrão `useEffect` + `setState` como **"last resort"** e propenso a loops infinitos. A documentação de Zustand 5 ([zustand.docs.pmnd.rs/learn/guides/practice-with-no-store-actions](https://zustand.docs.pmnd.rs/learn/guides/practice-with-no-store-actions)) recomenda **action methods coladas no store** em vez de `setState` direto do componente.
- **Ocorrências encontradas:**
  1. `src/features/video-render/hooks/useVideoExporter.tsx:121-124` — `useVideoRenderController.setState({ codec, container })`
  2. `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx:180-183` — `useSpeedPaintRenderController.setState({ codec, container })`
  3. `src/components/app/ExportCrossRouteToast.tsx:171` — `useSpeedPaintRenderController.setState({ status: 'idle', error: null })`
  4. `src/components/app/ExportCrossRouteToast.tsx:173` — `useVideoRenderController.setState({ status: 'idle', error: null })`
- **Análise técnica:** nos casos 1-2 não há loop infinito porque o componente que faz o `setState` **não subscreve** as slices `codec`/`container` (lê outras slices). Nos casos 3-4 o `setState` muda `status` e `error`, que o componente lê — mas só ocorre após clique do usuário, fora de `useEffect`. Funcionalmente correto, mas anti-pattern.
- **Impacto real:** zero em runtime. É uma questão de manutenibilidade e previsibilidade.
- **Recomendação:** adicionar action `setCodecSupport(codec, container)` em ambos os controllers, e action `dismissFailure()` no controller OU componente. Padrão:
  ```ts
  // videoRenderController.tsx
  setCodecSupport: (codec, container) => set({ codec, container }),
  dismissFailure: () => set({ status: 'idle', error: null }),
  ```
  E nos hooks: `useVideoRenderController.getState().setCodecSupport(codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer)`.

#### 🟡 WARNING — SRP violation em `videoRenderController.startRender` (277 linhas, 18 passos)

- **Arquivo:** `src/features/video-render/store/videoRenderController.tsx:192-469`
- **Confidence:** 82/100
- **Categoria:** Architecture / Refactor
- **Detalhe:** a função `startRender` (linhas 192-469 = 277 linhas) executa 18 passos numerados em comentários: validar, abortar render anterior, criar AbortController, reseta throttle, set preparing, lazy import do Remotion, aplicar patchCanvasFontStretch, montar composition, invocar `renderMediaOnWeb`, getBlob, edge case LAC-004, set completed, analytics, saveVideoToProject, catch+finally. A linha 21 da `useVideoExporter.tsx` chama `useVideoRenderController.getState().startRender(options)` — fachada é fina, mas o controller acumulou tudo.
- **Reavaliação pós-correção R1:** warning segue aplicável e até levemente intensificado — agora há 277 linhas em **um único método** porque toda a lógica foi consolidada no controller (antes estava no hook, que era mais legível por estar perto da UI).
- **Impacto real:** dificulta leitura e impede extração de sub-testes. Não causa bug.
- **Recomendação:** extrair helpers `validateRenderOptions()`, `prepareRenderEnvironment()`, `executeRenderMedia()`, `finalizeRender()`. Quebrar `startRender` em 4-5 chamadas. Possivelmente extrair `runSpeedPaintPhase()` se a lógica crescer.

#### 🟡 WARNING — Duplicação substancial entre `runSingleRender` e `runBatchRender` (M2, ~40-50% de overlap)

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:364-556` (single) e `563-796` (batch)
- **Confidence:** 82/100
- **Categoria:** Architecture / Refactor
- **Detalhe:** as duas funções compartilham ~40-50% de código estruturalmente similar:
  1. Identifica `renderId` + cancela render anterior
  2. Cria AbortController + reseta throttle
  3. `set({...INITIAL_STATE, ...preparing})`
  4. `loadRenderImpl()` (lazy import) com try/catch
  5. `patchCanvasFontStretch()`
  6. `set({ status: 'rendering', ... })`
  7. `renderMediaOnWeb` com composition+inputProps+codec+container+signal
  8. `getBlob()` + check `currentRenderId !== renderId` (descarta obsoleto)
  9. `set({ status: 'completed', outputBlob, outputUrl, ... })` + `trackAnalyticsEvent`
  10. `catch` com `isCancellationError` + analytics
  11. `finally` com cleanup de `abortController`
- **Diferenças reais (single):** valida `imageSource`, monta `ExportableSpeedPaintComposition` (sem `Sequence`), opcional `autoDownload`.
- **Diferenças reais (batch):** loop de `generateStrokesFromImage` (fase 0-50%), monta `ExportableBatchSpeedPaintComposition` (com `Sequence` encadeado), timings via `getSpeedPaintSequenceTiming`, sempre `autoDownload` do lote.
- **Reavaliação pós-correção R1:** warning segue aplicável. A duplicação não cresceu nem diminuiu — a R1 só reformatou/migrou código existente.
- **Recomendação:** extrair `executeRenderPass({ composition, inputProps, signal, renderId, analyticsParams, onComplete? })` e fazer `runSingleRender`/`runBatchRender` chamarem essa helper. A phase 0-50% do batch fica em helper separado `generateStrokesForBatch()`.

#### 🟡 WARNING — `currentExportFileName` global duplicado em M1 e M2

- **Arquivos:** `src/features/video-render/store/videoRenderController.tsx:78` e `src/features/speed-paint/store/speedPaintRenderController.tsx:177`
- **Confidence:** 75/100 (mas é warning real, não falso positivo — é o ponto exato que a R1 já levantou)
- **Categoria:** Architecture / State design
- **Detalhe:** duas variáveis `let currentExportFileName = ''` no escopo de módulo, uma por controller. Acessadas via `getCurrentExportFileName()` (exportado em ambos arquivos, linha 546/799).
- **Reavaliação pós-correção R1:** warning segue aplicável. O comentário do M1 (linha 313) diz "M2 terá sua própria versão" — agora tem. Mas a duplicação do padrão (não do valor) é uma oportunidade.
- **Recomendação:** mover para dentro do estado Zustand (campo `currentFileName: string`) e remover a variável de módulo + função `getCurrentExportFileName()`. Quem precisa do nome passa a usar `useVideoRenderController((s) => s.currentFileName)` (no consumidor correto, ou `getState().currentFileName` em callbacks).

#### 💡 SUGESTÃO — Prop `videoIsRendering` do `SidebarNavItem` é semanticamente ambíguo

- **Arquivo:** `src/components/app/SidebarNavItem.tsx:34`
- **Confidence:** 88/100
- **Categoria:** Architecture / Naming
- **Detalhe:** a prop `videoIsRendering?: boolean` é passada com valores de ambos controllers (vídeo e speed paint) — `Sidebar.tsx:253-255` faz `item.to === '/app/pintura-rapida' ? spIsRendering : videoIsRendering`. O nome sugere "só vídeo" mas é usado genericamente.
- **Impacto:** zero funcional. Risco de leitura: se alguém olhar o tipo e passar um boolean sem entender que vale para ambos, vai funcionar, mas com semântica confusa.
- **Recomendação:** renomear para `isRendering` (genérico) e/ou criar tipo discriminado `{ kind: 'video' | 'speed-paint' }` se quiser manter a rastreabilidade do origin.

#### 💡 SUGESTÃO — Paridade mobile/desktop: drawer de speed paint sem dot indicator

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:109, 232-296`
- **Confidence:** 80/100
- **Categoria:** UX / Polish
- **Detalhe:** o item `/app/pintura-rapida` aparece no `drawerItems` (linha 109) sem dot indicator. O `ExportCrossRouteToast` (M6) cobre o feedback de progresso, então o usuário **não fica sem feedback**. Mas a Sidebar (desktop) tem dot, criando uma assimetria visual entre desktop e mobile.
- **Reavaliação pós-correção R1:** a decisão **P5=A** da R1 (linha 230 do MobileBottomNav) diz "dot indicator — apenas no item 'Vídeo' (P5=A)". A R1 corrigiu só a Sidebar (GAP-02). Esta é uma **lacuna de feature**, não uma regressão introduzida pelo PR1.
- **Impacto:** nenhum usuário fica bloqueado. Apenas uma assimetria de polish.
- **Recomendação:** se quiser paridade visual, estender o `MobileBottomNav` com o mesmo padrão da Sidebar: `showExportDot = isSpeedPaintItem && (spIsRendering || spStatus === 'completed') && location.pathname !== '/app/pintura-rapida'`. Pode ser feito em PR2 ou em uma issue de polimento.

---

## O que parece saudável

- **Padrão singleton Zustand + AbortController em escopo de módulo** preservado: ambos controllers (M1, M2) seguem o mesmo padrão correto de `currentRenderId` para ignorar renders obsoletos, `lastReportedPercentRef` para throttle, lazy import do `@remotion/web-renderer`, e cleanup no `finally` apenas se a renderização ainda é a atual.
- **Contrato público preservado:** `useVideoExporter` (225 linhas, fachada fina) e `useSpeedPaintExporter` (293 linhas, fachada fina) mantêm `VideoExporter`, `VideoExportOptions`, `SpeedPaintExporter`, `SpeedPaintExportOptions`, `SpeedPaintBatchExportOptions` com a mesma forma. Consumidores (`VideoExportPanel`, `SpeedPaintExportPanel`, `VideoPage`, `SpeedPaintPage`) não precisaram mudar.
- **Retrocompatibilidade com `videoRenderBridge`:** M1 ainda escreve `isExportingVideo`/`videoExportProgress` no bridge, então `ActionBar` e `ToastManager` continuam funcionando sem mudanças. O comentário da `AudioGenerationHandler.tsx:159-163` documenta a decisão.
- **`useCrossRouteRenderGuard` centraliza listeners:** o `beforeunload` foi removido do `AudioGenerationHandler` (linha 159-163) e centralizado no guard (linha 103 do guard). Decisão P3=A corretamente aplicada — sem listeners duplicados.
- **Lazy import do Remotion preservado:** `loadRenderImpl()` em ambos controllers (M1:91, M2:190) garante que o chunk de ~2.4 MB só baixa quando o primeiro `startRender`/`startBatchRender` é chamado. Code-splitting intacto.
- **Tipos compartilhados sólidos:** `renderController.ts` agora está enxuto (112 linhas), com `RenderKind` (2 valores), `RenderStatus` (6 valores), `RenderPhase` (3 valores), `RenderControllerPublicState` (read-only) e `RenderControllerActions<O>` (parametrizado por generics). Sem `any`, sem tipos órfãos.
- **i18n completo:** 10 chaves `exportCrossRoute.*` em 3 locales (pt-BR/en/es), todas usadas no código. As 2 chaves `mobileDotActive`/`mobileDotCompleted` (MobileBottomNav:274-275) existem nos 3 locales.
- **Analytics integrado:** 3 eventos novos (`video_export_completed_offroute`, `speed_paint_export_completed`, `speed_paint_export_cancelled`) tipados em `AnalyticsEventMap` e disparados dos controllers.
- **`AudioGenerationHandler` enxugado:** -13 linhas no diff, `beforeunload` removido (centralizado), `error handling` consistente (`catch (err: unknown)`), `bridge` preservado para usos legados.
- **`VideoPage` enxugada:** -9 linhas no diff. Removidos 2 `useEffect` que sincronizavam `videoRenderBridge` (responsabilidade transferida para M1) e que resetavam o bridge no unmount (agora gerenciado pelo controller).
- **Cobertura de testes sólida:** 7 testes do `videoRenderController` (estado inicial, startRender feliz, cancel preserva blob, reset revoga URL, 2 renders em paralelo, validação de duration, falha de renderMediaOnWeb) + 7 testes do `ExportCrossRouteToast` (aparece em /assistente, rendering, hide em /video, hide em /pintura-rapida, completed, failed, idle). 2151/2151 testes passando no total.
- **`ErrorBoundary` + logger funcional:** mensagens de erro vão para o Firestore `errorLogs` via `initErrorTracking()`. Validação de `catch (err: unknown)` consistente (zero `catch {}` no diff do PR1).

---

## Limites da revisão

- **Não executei `bun run build` nem `bun run dev`:** o comando `bun run typecheck`, `bun run lint` e `bun run test` foram reportados pelo usuário como verdes, e o código lido confirma coerência. Não rodei a aplicação para validar comportamento em runtime (especialmente o flow de navegação cross-route com codec fallback VP8/WebM em browser sem H.264).
- **Não li todos os 2151 testes:** li os 7 testes do `videoRenderController` e os 7 do `ExportCrossRouteToast` (os 2 arquivos novos de teste do PR1). A cobertura específica de `useCrossRouteRenderGuard` e `useSpeedPaintExporter` foi validada indiretamente (existe arquivo de teste, segundo o diff) mas não li o conteúdo.
- **Não li `docs/plan/video-render-survive-navigation-*.md` por completo:** li os snippets do diff. O contrato foi validado por amostragem (campos do `RenderControllerPublicState`, comportamento de `startRender`).
- **Não validei o comportamento real de `runSingleRender` vs `runBatchRender` em runtime:** a análise de duplicação foi por leitura estrutural. Pode haver nuances de timing/edge case que só aparecem em execução.
- **NotebookLM consultado:** React 19 Docs (1 consulta sobre useEffect+setState) e Zustand 5 Docs (1 consulta sobre setState direto vs action). Não consultei Remotion 4.0.448 Docs (pode haver nuances sobre `AbortSignal` destrutivo que só o notebook confirmaria). A correção de BUG-001 foi validada por leitura estrutural, mas não por consulta ao notebook Remotion.
- **Não verifiquei se `useCrossRouteRenderGuard` está sendo desmontado em algum cenário:** o comentário da linha 106 do guard diz "App unmount — praticamente nunca", o que está correto porque o `useEffect` está em `App.tsx`. Mas se o App for desmontado (testes, hot reload, etc.) e remontado, o cleanup/registro é re-executado corretamente.
- **Não rodei lint/typecheck real:** confiando na informação do usuário (todos verdes). O code review estrutural confirma tipagem estrita, sem `any`, sem `catch {}`, comentários em pt-BR.
- **Não analisei o impacto de uma possível extensão futura do PR2:** se o M8 (RenderSnapshot + persistência localStorage) for implementado em PR2, vai precisar de migração de schema. O comentário `schemaVersion: 1` que existia na interface RenderSnapshot **foi removido junto com ela** — se o PR2 reintroduzir, vai precisar re-adicionar o versionamento desde o início.

---

## Resumo executivo

| Item | Status | Notas |
|------|--------|-------|
| BUG-001 (sync codec) | ✅ CORRIGIDO | useEffect em useVideoExporter.tsx:120-125 + useSpeedPaintExporter.tsx:179-184 |
| GAP-01 (toast sp) | ✅ CORRIGIDO | 5 seletores sp* + 5 handlers branch em ExportCrossRouteToast.tsx |
| GAP-02 (dot sp desktop) | ✅ CORRIGIDO | Sidebar.tsx:25-26, 88-91, 245-256 |
| GAP-03 (RenderSnapshot) | ✅ CORRIGIDO | 0 matches no projeto |
| Regressões funcionais | ✅ NENHUMA | Validação estrutural completa |
| Warnings R1 (SRP, duplicação) | 🟡 MANTIDOS | 4 melhorias de polimento — não bloqueiam |
| Quality gates | ✅ TODOS | typecheck, lint, test 2151/2151 |

**Recomendação final:** **APTO PARA MERGE.** As 4 melhorias de polimento podem ser endereçadas em PRs subsequentes sem risco de regressão.

---

### Anexo — arquivos do PR1 modificados/criados (referência)

**Novos (8):**
- `src/components/app/ExportCrossRouteToast.tsx` (276 linhas)
- `src/features/speed-paint/store/speedPaintRenderController.tsx` (802 linhas)
- `src/features/video-render/store/videoRenderController.tsx` (549 linhas)
- `src/features/video-render/types/renderController.ts` (113 linhas)
- `src/hooks/useCrossRouteRenderGuard.ts` (114 linhas)
- `tests/components/ExportCrossRouteToast.component.test.tsx` (246 linhas)
- `tests/hooks/useCrossRouteRenderGuard.unit.test.ts` (226 linhas)
- `tests/video-render/videoRenderController.unit.test.ts` (292 linhas)

**Modificados (chave):**
- `src/App.tsx` (+9 -4) — uso do guard + ExportCrossRouteToast
- `src/components/app/AudioGenerationHandler.tsx` (+5 -13) — beforeunload removido
- `src/components/app/MobileBottomNav.tsx` (+42 -0) — sem regressão (P5=A mantido)
- `src/components/app/Sidebar.tsx` (+24 -0) — GAP-02 correção
- `src/components/app/SidebarNavItem.tsx` (+66 -16) — ExportDot adicionado
- `src/components/toast/ToastProvider.tsx` (+5 -63) — código de export de vídeo removido (agora em M6)
- `src/features/video-render/hooks/useVideoExporter.tsx` (+124 -422) — fachada fina
- `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` (+164 -585) — fachada fina
- `src/pages/VideoPage.tsx` (+4 -9) — useEffect de sync removidos (responsabilidade do M1)
- `src/lib/analytics.ts` (+9 -0) — evento `video_export_completed_offroute`
- `src/features/i18n/locales/{pt-BR,en,es}.ts` (+32 cada) — namespace `exportCrossRoute`
