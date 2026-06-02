# Relatório de Lacunas — PR1 v2: Video Render Survive Navigation (Script Master)

**Data da análise:** 2026-06-02 (rodada 2 — pós-correção)
**Escopo:** Diff que move a renderização de vídeo (M1) e speed paint (M2) para controllers singleton Zustand, com `ExportCrossRouteToast` (M6), `useCrossRouteRenderGuard` (M5), dot indicators (M7 parciais), refatoração de `useVideoExporter` (M3) e `useSpeedPaintExporter` (M4) em fachadas finas.
**Método:** Leitura completa dos arquivos novos (8) + arquivos modificados críticos (10) + diff contra plano/auditoria/gap-finder anterior. Validação por `grep` e `supergrep_find` para confirmar ausência/presença de símbolos. Confidence gate numérico aplicado.
**Contexto histórico:** análise anterior (rodada 1) identificou 11 gaps, sendo 1 CRÍTICO (speed paint não sobrevive à navegação), 1 ALTO (sidebar sem dot), 3 ALTOS, 3 MÉDIOS, 3 BAIXOS. Esta rodada valida quais gaps foram RESOLVIDOS, quais PERMANECEM, e quais novos foram introduzidos.

---

## 1. Contexto assumido

O PR1 declara entregar M1, M2, M3, M4, M5, M6, M7, M9 do plano "video-render-survive-navigation" (M8 explicitamente fora). A Stack é React 19 + Vite 8 + TypeScript 6 + MUI v9 + Zustand 5 + Remotion 4.0.448. O objetivo central é: **a renderização de vídeo E speed paint sobreviver à navegação entre rotas**, com feedback cross-route (toast + dot + document.title + beforeunload) e cancelamento explícito em qualquer rota.

A rodada anterior identificou `speedPaintRenderController` como stub e `useSpeedPaintExporter` com `useEffect` cleanup que abortava o render no unmount (bug que o PR1 supostamente corrigiria). Esta rodada confirma que ambos foram corrigidos: o controller agora é real (801 linhas) e o hook virou fachada fina (293 linhas).

A paridade entre vídeo e speed paint foi PARCIALMENTE atingida: vídeo cobre dot + bridge + consumidores legados; speed paint cobre dot só no toast (parcial), sem bridge, sem consumidores legados no ActionBar.

---

## 2. Mapa rápido: sólido vs. frágil

### ✅ Sólido (validado por leitura completa + busca estrutural)

| Camada | Estado | Evidência |
|---|---|---|
| **M1 (videoRenderController)** | ✅ Sólido | Store singleton (549 linhas), AbortController em escopo de módulo, validações **antes** de criar controller (linhas 213-223), `currentRenderId` previne race, `reportProgress` sincroniza Zustand + bridge, 7 testes. |
| **M2 (speedPaintRenderController)** | ✅ Sólido (era stub) | Store singleton (801 linhas), mesma arquitetura de M1, `startRender` + `startBatchRender` com `AbortController` em escopo de módulo, `currentRenderId` previne race, validado por 7 testes. |
| **M3 (useVideoExporter fachada)** | ✅ Sólido | 212 linhas (era 714), delega para o controller, contrato público preservado (`VideoExporter`, `VideoExportOptions`, `VideoExporterState`). |
| **M4 (useSpeedPaintExporter fachada)** | ✅ Sólido | 293 linhas (era 714), delega para o controller, contrato público preservado. 7 testes. |
| **M5 (useCrossRouteRenderGuard)** | ✅ Sólido | Centraliza `beforeunload` + `visibilitychange` + `document.title` (1s polling). Cobre vídeo + speed paint + áudio. 9 testes. |
| **M6 (ExportCrossRouteToast)** | 🟠 Parcial (ver GAP-01) | Lê de AMBOS controllers (5 slices vídeo + 3 slices speed paint). `handleCancel` delega corretamente (linhas 107-112). Mas `handleDownload`/`handleCloseCompleted`/`handleCloseFailed` **só operam em vídeo** (linhas 115, 130, 140) — bug crítico para speed paint. |
| **AudioGenerationHandler** | ✅ Sólido | `beforeunload` inline removido (linhas 159-163) — centralização no guard, sem listener duplicado. |
| **Tipos compartilhados (M9)** | ✅ Sólido | `RenderKind` (2 valores), `RenderStatus` (6 valores), `RenderControllerPublicState`, `RenderControllerActions<O>` parametrizado. |
| **Toast cross-route cobre vídeo + speed paint** | 🟠 Parcial | `isActive = videoIsRendering \|\| spIsRendering` (linha 86), `toastKind` derivado de ambos (linha 90-95). |
| **i18n** | ✅ Consistente | 11 chaves em 3 locales (pt-BR/en/es), 10 usadas. 1 órfã (`beforeUnloadMessage`). |
| **Analytics** | ✅ Sólido | `video_export_completed_offroute` (linha 79 do `AnalyticsEventMap`) emitido condicionalmente se path ≠ `/app/video` e ≠ `/app/pintura-rapida` (linhas 409-416 do controller). Speed paint tem `speed_paint_export_started`/`_completed`/`_cancelled`/`_failed` (linhas 420, 527, 537, 777). |

### ⚠️ Frágil (risco real)

| Camada | Estado | Comentário |
|---|---|---|
| **M7 dot indicator (paridade vídeo vs speed paint)** | 🔴 **QUEBRADO** | Sidebar (linhas 84-85 do `Sidebar.tsx`) e MobileBottomNav (linhas 90-91 do `MobileBottomNav.tsx`) só leem `useVideoRenderController`. Item `/app/pintura-rapida` existe na Sidebar (linha 96) e no drawer mobile (linha 109) mas **SEM dot**. Speed paint renderizado em background não tem dot pulsante em lugar nenhum. |
| **`ExportCrossRouteToast` handlers de download/close** | 🔴 **QUEBRADO** | `handleDownload` (linha 114-127), `handleCloseCompleted` (linha 129-131) e `handleCloseFailed` (linha 139-141) **só operam em `useVideoRenderController`**. Speed paint completed/failed não consegue fechar o toast nem baixar. |
| **ActionBar sem feedback de speed paint** | 🟠 Frágil | ActionBar recebe `isExportingVideo`/`videoExportProgress` via props do App (linhas 279-280 do `App.tsx`), lidos do bridge (linhas 164-165 do `AudioGenerationHandler`). Speed paint **não escreve no bridge** (decisão documentada, `speedPaintRenderController.tsx:27-30`). Usuário em `/app/estudio` com speed paint rodando em background não vê indicação na ActionBar. |
| **M8 (RenderSnapshot + persistência)** | ❌ **NÃO IMPLEMENTADO** | `RenderSnapshot` declarado em `types/renderController.ts:45-62` (schemaVersion: 1) mas **0 usos** em src/ e 0 em tests/. Não há persistência localStorage. Não há detecção de render interrompido após F5/reload. |
| **`lastProgressUpdateAt` morto** | 🟠 Frágil | 8 escritas (4 vídeo + 4 speed paint) + 1 declaração. **0 leituras**. Era para stall detection ("render travado"), não implementado. |
| **`resetBridge` morto** | 🟠 Frágil | 2 declarações (`videoRenderBridge.ts:29, 57`), 0 callsites em produção. Legado da arquitetura anterior. |
| **`setState` direto no `ExportCrossRouteToast:140`** | 🟠 Code smell | Bypassing action layer. Decisão documentada (linhas 133-138), mas é inconsistência arquitetural. |
| **Cobertura de testes** | 🟠 Parcial | 22 testes novos (7 controller + 9 guard + 6 toast). Gaps: `useVideoExporter` fachada sem teste dedicado; `videoRenderController` não cobre `onProgress` (sync bridge), `saveWarning`, `video_export_completed_offroute`; `useCrossRouteRenderGuard` não cobre `setInterval(updateTitle, 1000)` (apenas chamada inicial) nem `mockSpeedPaintState.isRendering = true`. |

---

## 3. Gaps priorizados

### 🔴 CRÍTICOS

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-01** | 🔴 CRÍTICO | Bug de paridade (speed paint vs vídeo) | **97%** | **`ExportCrossRouteToast` ignora `useSpeedPaintRenderController` em 3 handlers críticos.** (1) `handleDownload` (linhas 114-127) lê SÓ de `useVideoRenderController.getState().outputUrl` — se speed paint completar, `outputUrl` é `null` e `if (!url) return;` (linha 117) sai cedo: **usuário clica "Baixar" e nada acontece**. (2) `handleCloseCompleted` (linhas 129-131) chama `useVideoRenderController.getState().reset()` que reseta vídeo (que já estava idle) mas **NÃO afeta speed paint** — o `toastKind` continua `'completed'` porque `spStatus === 'completed'` ainda é verdadeiro: **toast fica permanentemente aberto**. (3) `handleCloseFailed` (linhas 139-141) usa `useVideoRenderController.setState({ status: 'idle', error: null })` que **NÃO afeta speed paint**: **toast de falha também não fecha**. Esse gap anula o propósito central do PR1 para speed paint — o usuário vê o toast, mas não consegue baixar, fechar ou receber sucesso. | (1) `ExportCrossRouteToast.tsx:115` `const state = useVideoRenderController.getState();` (apenas vídeo); (2) `ExportCrossRouteToast.tsx:130` `useVideoRenderController.getState().reset();`; (3) `ExportCrossRouteToast.tsx:140` `useVideoRenderController.setState({...})`. | `handleCancel` (linhas 106-112) **delega corretamente** para o controller certo via if/else. Os 3 handlers quebrados seguem o mesmo padrão, mas com hardcode no controller de vídeo. | **CRÍTICO: bloquear merge.** Refatorar os 3 handlers para detectar qual controller está ativo (mesmo padrão de `handleCancel`) e delegar para o correto. O `handleViewVideo` (linha 102-104) também pode precisar de paridade — para speed paint, navegar para `/app/pintura-rapida`? Ou manter `/app/video`? Decisão de UX. |
| **GAP-02** | 🔴 CRÍTICO | UX — indicador visual ausente | **95%** | **Dot indicator de speed paint NÃO existe em lugar nenhum** (nem Sidebar desktop, nem MobileBottomNav). M7 declara "dot pulsante durante render" e o usuário que renderizar speed paint em `/app/pintura-rapida` e navegar para outra rota `/app/*` **não vê nenhum dot** em lugar nenhum — só o `ExportCrossRouteToast` (snackbar top-center) sinaliza, e esse tem o bug do GAP-01. Resultado: speed paint é "invisível" durante render cross-route, contradizendo o plano M7. | (1) `Sidebar.tsx:84-85` lê SÓ `useVideoRenderController`; (2) `Sidebar.tsx:240` `item.to === '/app/video'` filtra o dot só para vídeo (speed paint item está na linha 96 sem dot); (3) `MobileBottomNav.tsx:90-91` lê SÓ vídeo; (4) `MobileBottomNav.tsx:232` `isVideoItem = item.to === '/app/video'` filtra o dot; speed paint item está no drawer (linha 109) sem dot. | O `ExportDot` componente em `SidebarNavItem.tsx:166-191` é genérico (aceita `videoIsRendering?: boolean`) — pode ser reaproveitado com semântica similar. | **CRÍTICO: bloquear merge.** Adicionar leitura de `useSpeedPaintRenderController` (2 slices: `isRendering` + `status`) em ambos os componentes. No `Sidebar.tsx`, criar dot para `item.to === '/app/pintura-rapida'` quando `spIsRendering \|\| spStatus === 'completed'`. No `MobileBottomNav.tsx`, o speed paint está no drawer, não na bottom nav principal — decidir: adicionar à bottom nav (substituindo algum item), ou adicionar dot inline no drawer, ou aceitar que no mobile o feedback fica só no toast. |
| **GAP-03** | 🔴 CRÍTICO | Código morto / escopo não entregue | **99%** | **`RenderSnapshot` (M8) declarado mas nunca consumido.** Tipo completo com `schemaVersion: 1` em `types/renderController.ts:45-62` projetado para "detectar render interrompido após F5 e exibir banner informativo". **0 usos em src/ e 0 em tests/**. M8 (persistência localStorage) está explicitamente fora do PR1 (decisão P5), mas o tipo foi mantido — e está sendo confundido com código vivo. | `grep "RenderSnapshot" src/` retorna 1 match (declaração). `grep "RenderSnapshot" tests/` retorna 0. `analyze_aitool_find "RenderSnapshot"` retorna 1 definição + 0 imports + 0 usos. | JSDoc do tipo explica a intenção. Decisão P5 de manter o tipo como contrato para M8 futuro está documentada no plano. | **DECISÃO DE PRODUTO:** (a) Remover o tipo agora (YAGNI) para limpar o contrato; (b) Manter o tipo e adicionar `@deprecated` JSDoc com link para issue de M8; (c) Manter o tipo e implementar M8 imediatamente. Se o PR1 não implementa M8, o tipo "polui" o relatório de cobertura de tipos. **Recomendação: (b)** — adicionar `@deprecated` para deixar claro que é contrato futuro, não código vivo. |

### 🟡 ALTOS

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-04** | 🟡 ALTO | Inconsistência arquitetural (UX quebrada) | **90%** | **ActionBar não mostra progresso de speed paint (sem bridge).** `ActionBar.tsx:71-72` recebe `isExportingVideo` e `videoExportProgress` via props. `App.tsx:279-280` passa esses valores lidos do `useVideoRenderBridge` (linhas 164-165 do `AudioGenerationHandler`). Como o speed paint **não escreve no bridge** (decisão documentada em `speedPaintRenderController.tsx:27-30`), o ActionBar não tem como saber se há speed paint em andamento. **Cenário real:** usuário em `/app/estudio` enquanto speed paint está renderizando em background (iniciado em `/app/pintura-rapida`) — ActionBar **não mostra nada**. Usuário acha que precisa ir para /pintura-rapida para ver o status. | (1) `speedPaintRenderController.tsx:27-30` comentário explica "M2 não escreve em bridge"; (2) `videoRenderBridge.ts:10-30` tem apenas `isExportingVideo`/`videoExportProgress` (sem campo de speed paint); (3) `ActionBar.tsx:447` mostra CircularProgress baseado APENAS em `isExportingVideo`. | Decisão documentada na linha 27: "Diferente de M1 (que escreve em `videoRenderBridge` para consumidores legados como `ActionBar`), M2 não escreve em bridge. O `ExportCrossRouteToast` (M6) consome este controller diretamente via `useStore(useSpeedPaintRenderController, ...)`." | **DECISÃO:** (a) Adicionar campos `isExportingSpeedPaint`/`speedPaintProgress` ao `videoRenderBridge` (manualmente sincronizados pelo `useCrossRouteRenderGuard` ou pelo `ExportCrossRouteToast`); (b) Estender o `ActionBar` para ler diretamente do `useSpeedPaintRenderController` via `useStore`; (c) Aceitar a inconsistência (ActionBar é feature de /video e /estudio, não cobre speed paint por design). **Recomendação: (b)** é o mais clean — segue o padrão do `ExportCrossRouteToast` que lê diretamente. |
| **GAP-05** | 🟡 ALTO | Código morto (campo) | **95%** | **`lastProgressUpdateAt` é escrito em 8 lugares (4 vídeo + 4 speed paint) + 1 declaração no tipo, mas 0 leituras.** O JSDoc do tipo (linha 94) diz "Date.now() do último update de progresso (para detectar render travado)". O `useCrossRouteRenderGuard` faz polling de `document.title` a cada 1s lendo `status` apenas — **não usa o timestamp para stall detection**. | (1) `grep "lastProgressUpdateAt" src/` retorna 11 matches, todos de write/declare. **0 reads**. (2) `useCrossRouteRenderGuard.ts:81-92` `updateTitle()` usa `status` direto. (3) `grep "stall"` no código retorna 0. | Campo está semanticamente correto para futura detecção. O PR1 apenas não usa. | Vale implementar stall detection no PR1 (mudar title para "⚠️ Render travado" se `Date.now() - lastProgressUpdateAt > 60s`)? Decisão de produto: stall detection é feature separada, pode ser PR de polimento. Alternativa: remover o campo agora (YAGNI). |
| **GAP-06** | 🟡 ALTO | Código morto (função) | **95%** | **`resetBridge` é declarado e definido mas nunca chamado em produção.** `videoRenderBridge.ts:29` declara, `:57` define, mas `grep "resetBridge" src/` retorna apenas os 2 matches de declaração/definição. Era invocado no cleanup do `useEffect` em `VideoPage` (removido neste PR). | `grep "resetBridge" src/` → 2 matches (declaração + definição), 0 callsites. | Bridge é simples Zustand store — vazamento mínimo (4 campos primitivos). O `useCrossRouteRenderGuard` poderia chamá-lo no cleanup se houver render ativo. | Adicionar `useVideoRenderBridge.getState().resetBridge()` no cleanup do `useCrossRouteRenderGuard` quando `!isAnyRendering()` para garantir estado limpo entre sessões? Ou aceitar como legado? |

### 🟠 MÉDIOS

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-07** | 🟠 MÉDIO | i18n órfão | **95%** | **`exportCrossRoute.beforeUnloadMessage` declarado nos 3 locales (pt-BR/en/es) mas nunca lido no código.** O guard usa `event.preventDefault()` puro (padrão W3C correto — browsers ignoram a string customizada). A chave i18n é lixo de tradução. | (1) `grep "exportCrossRoute.beforeUnloadMessage" src/` → 0 matches. (2) `useCrossRouteRenderGuard.ts:65-70` faz só `event.preventDefault()`. (3) Chave existe em `pt-BR.ts:145-146`, `en.ts:139`, `es.ts:139`. | Decisão técnica correta (spec W3C para `beforeunload`). | Remover a chave dos 3 locales? É dívida técnica de tradução. |
| **GAP-08** | 🟠 MÉDIO | Comportamento em edge case | **85%** | **`handleViewVideo` no `ExportCrossRouteToast:102-104` sempre navega para `/app/video`**, mesmo quando o `completed` é de speed paint. Speed paint completed → usuário clica "Ver Vídeo" → vai para `/app/video` (rota errada). Speed paint normalmente é visto em `/app/pintura-rapida`. | `ExportCrossRouteToast.tsx:102-104` `navigate('/app/video')` hardcoded. | Em `/app/video` o usuário pode ver o vídeo via `VideoLibrary` (biblioteca), mas não é o local canônico para speed paint. | Adicionar if/else: `if (spStatus === 'completed') navigate('/app/pintura-rapida') else navigate('/app/video')`? Ou aceitar (decisão de UX unificada — vídeo sempre vai para /app/video). |
| **GAP-09** | 🟠 MÉDIO | Cobertura de testes | **85%** | **Buracos na cobertura de testes:**<br>(a) `useCrossRouteRenderGuard.unit.test.ts` (9 testes) **NÃO cobre `mockSpeedPaintState.isRendering = true`** (apenas vídeo e áudio).<br>(b) `useCrossRouteRenderGuard` não testa o `setInterval(updateTitle, 1000)` (apenas a chamada inicial).<br>(c) `videoRenderController.unit.test.ts` (7 testes) **NÃO cobre:**<br>  • `onProgress` callback → `useVideoRenderBridge.syncExportState(true, percent)` (linha 161 do controller)<br>  • Falha de `saveVideoToProject` → `saveWarning` populado (linhas 438-443 do controller)<br>  • Emissão de `video_export_completed_offroute` (linhas 409-416 do controller)<br>(d) `useVideoExporter` (fachada fina, 212 linhas) **NÃO tem teste dedicado**. Testes do controller são proxy.<br>(e) `speedPaintRenderController` (801 linhas) **NÃO tem teste de unidade dedicado**. Cobertura vem apenas do teste da fachada `useSpeedPaintExporter.unit.test.tsx` (7 testes, com mock de `useSpeedPaintRenderController.getState()` via `vi.mock` na linha 185). | (1) `useCrossRouteRenderGuard.unit.test.ts:84-224` (9 testes) — nenhum muda `mockSpeedPaintState.isRendering`; (2) `useCrossRouteRenderGuard.ts:97` `setInterval(updateTitle, 1000)` sem teste; (3) `videoRenderController.unit.test.ts:1-291` (7 testes) — nenhum testa `onProgress`, `saveWarning` ou `offroute`; (4) `glob "tests/**/useVideoExporter*"` → 0 matches. | Cobertura existente é razoável para o core. Os pontos (a), (b) e (d) são test gaps reais; (c) é mais fácil (testes do controller). | Adicionar pelo menos 4 testes prioritários: (a) `mockSpeedPaintState.isRendering = true`; (b) `setInterval` com `vi.useFakeTimers().advanceTimersByTime(1000)`; (c) `onProgress` chamando `useVideoRenderBridge.syncExportState`; (d) teste de unidade para `useVideoExporter` fachada (smoke test + delegação). |
| **GAP-10** | 🟠 MÉDIO | Decisão arquitetural / API layering | **80%** | **`ExportCrossRouteToast.tsx:140` usa `useVideoRenderController.setState({ status: 'idle', error: null })` direto, bypassing a action layer.** O controller tem actions públicas (`dismissSaveWarning`) mas nenhuma para "dismiss failed". O comentário (linhas 133-138) explica a decisão: usar `reset()` revogaria o blob URL e chamaria `clearStrokeCache()`. Mas `setState` direto é um code smell — qualquer lógica adicional em `reset()` no futuro não será aplicada aqui, e ações concorrentes podem ficar dessincronizadas. | (1) `videoRenderController.tsx:540-542` existe `dismissSaveWarning` mas não `dismissFailed`; (2) `ExportCrossRouteToast.tsx:140` usa `setState` direto. | O comentário documenta a decisão e referencia "GAP-06 do relatório de auditoria" — não é descuido, é escolha deliberada. | Adicionar action `dismissFailed()` (que faz só `{ status: 'idle', error: null }`) no controller e refatorar o toast. Pequeno mas consistente com `dismissSaveWarning`. |

### 💡 BAIXOS

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-11** | 💡 BAIXO | Edge case de race condition teórica | **75%** | **`handleDownload` no `ExportCrossRouteToast:120` chama `state.reset()` que revoga `outputUrl` via `URL.revokeObjectURL` imediatamente após `downloadFile(url, ...)` (síncrono anchor.click).** Browsers modernos processam o download imediatamente, mas em casos de race (download lento), a revogação pode quebrar o download. | `ExportCrossRouteToast.tsx:120-127`: `void downloadFile(url, ...)` (síncrono), `trackAnalyticsEvent(...)`, `state.reset()` (revoga `outputUrl`). | Teórico — em prática, `URL.revokeObjectURL` apenas sinaliza que a URL pode ser coletada; o download já capturou o blob. | (Defensiva) Envolver `state.reset()` em `setTimeout(..., 1000)` ou aguardar evento `onbeforeunload`. |
| **GAP-12** | 💡 BAIXO | Variável de módulo mutável | **90%** | **`currentExportFileName` é variável de módulo mutável** em ambos os controllers (vídeo: linha 78, speed paint: linha 177). O JSDoc (speed paint linha 176) reconhece: "específico do M1; M2 (speed paint) terá sua própria versão". Funciona, mas é namespace global implícito. | `videoRenderController.tsx:78`, `speedPaintRenderController.tsx:177`. | Encapsulamento em closure do controller é a saída clean. | Migrar para campo do state do controller (`fileName: string`) no PR2 ou refactor futuro? Ou aceitar como está? |
| **GAP-13** | 💡 BAIXO | Performance marginal | **75%** | **`useCrossRouteRenderGuard` escreve `document.title` a cada 1s sem comparar com o último valor.** O browser ignora escrita idêntica em `document.title`, mas é desperdício mínimo. | `useCrossRouteRenderGuard.ts:97` `setInterval(updateTitle, 1000)`. | O comentário linhas 94-96 reconhece: "polling é o padrão mais simples e suficiente". | Cachear último status em `useRef` e só escrever se mudou? Ganho marginal. Manter como está é defensável. |
| **GAP-14** | 💡 BAIXO | Comportamento de erro em codepath não-testado | **70%** | **`useCrossRouteRenderGuard.ts:73-78` `handleVisibilityChange` é no-op (apenas marca intenção)**. O comentário diz "Re-leitura é automática via subscribe do Zustand nos consumidores". Mas se o browser suspender a aba e voltar, o polling de `setInterval` foi pausado pelo browser (timers throttling em background) — `document.title` pode ficar stale até o próximo tick. Edge case: usuário suspende laptop com speed paint 50% → acorda 5min depois → title ainda diz "Renderizando 50%" mesmo se completou em background. | (1) `useCrossRouteRenderGuard.ts:73-78`; (2) Browsers throttling de timers em background. | Title é secundário — o `ExportCrossRouteToast` é o feedback primário. | Adicionar listener explícito que chama `updateTitle()` em `visibilitychange === 'visible'`? Pequeno, mas defensivo. |

---

## 4. Cenários de borda sem resposta

1. **Speed paint completed + usuário clica "Fechar" no toast cross-route**: 
   - GAP-01 afeta: `handleCloseCompleted` reseta SÓ o vídeo; speed paint continua `status: 'completed'`.
   - **Comportamento atual:** toast permanece aberto indefinidamente até F5/reload.
   - Mitigação temporária: usuário pode ir para `/app/pintura-rapida` e usar o painel local para fechar.

2. **Speed paint failed + usuário clica "Fechar" no toast cross-route**: 
   - GAP-01 afeta: `handleCloseFailed` usa `setState` direto SÓ no vídeo.
   - **Comportamento atual:** toast de erro permanece aberto.

3. **Speed paint completed + usuário clica "Baixar" no toast cross-route**: 
   - GAP-01 afeta: `handleDownload` lê SÓ do vídeo; `outputUrl` é null; sai cedo.
   - **Comportamento atual:** nada acontece. Usuário precisa ir para `/app/pintura-rapida` para baixar.

4. **Dois renders em paralelo (vídeo + speed paint simultaneamente)**: 
   - Vídeo: `useVideoRenderController` é singleton.
   - Speed paint: `useSpeedPaintRenderController` é singleton separado.
   - Teoricamente possível (UX: usuário inicia vídeo, depois speed paint, ou vice-versa).
   - **Comportamento atual:** ambos rodam em paralelo. `useCrossRouteRenderGuard` detecta qualquer um ativo. `ExportCrossRouteToast` mostra o de maior prioridade (vídeo primeiro via `videoIsRendering || spIsRendering` na linha 86 e `toastKind` na linha 91).
   - Edge case: vídeo completa enquanto speed paint ainda roda → toast muda para "Vídeo pronto!" mas speed paint continua. Usuário pode ficar confuso.
   - **Confirmar com UX:** o que é mais importante mostrar no toast quando ambos estão ativos?

5. **Login mid-render**: usuário em `/app/video` com render 60%, clica "Sair" (logout). O `AuthContext` faz `full reload` (comentário no AGENTS.md). Render é perdido silenciosamente — não há aviso no `LogoutConfirmDialog` nem no `useCrossRouteRenderGuard` (que só captura `beforeunload`, não logout intencional).

6. **Browser crash mid-render**: AbortController em escopo de módulo é perdido. Estado é perdido. M8 (RenderSnapshot) seria a solução — não implementado.

7. **Service Worker (PWA) suspende aba**: O PWA está habilitado (`vite-plugin-pwa`). Se o usuário suspender o laptop, o SW não pausa Web Workers. `renderMediaOnWeb` provavelmente não suporta `freeze`/`resume`. **Confirmar com `vite-plugin-pwa` docs se a estratégia de caching atual pode interferir no ciclo de vida do `AbortController`.**

8. **Speed paint completed → usuário navega para `/app/video` (não /pintura-rapida)**: o `toast` ainda mostra "completed" (porque `spStatus === 'completed'`), mas o usuário está numa rota onde normalmente o vídeo de speed paint não está acessível. O `handleViewVideo` (linha 102) sempre navega para `/app/video`, então clicar "Ver Vídeo" manda para lá, onde o speed paint não está.

---

## 5. Resumo executivo

### Gaps que devem ser corrigidos ANTES do merge (3 CRÍTICOS)

| ID | Título | Esforço | Bloqueador? |
|---|---|---|---|
| **GAP-01** | `ExportCrossRouteToast` ignora speed paint em 3 handlers | ~30 min (refatorar 3 handlers com if/else espelhando `handleCancel`) | **SIM** — anula propósito do PR1 para speed paint |
| **GAP-02** | Dot indicator ausente para speed paint (Sidebar + Mobile) | ~30 min (estender `Sidebar.tsx` + decidir estratégia mobile) | **SIM** — quebra paridade vídeo vs speed paint |
| **GAP-03** | `RenderSnapshot` morto (M8 não implementado) | 5 min (adicionar `@deprecated` JSDoc OU remover tipo) | **NÃO** se documentado; **SIM** se for seguir YAGNI |

### Gaps que podem ser aceitos como limitação/tech debt (3 ALTOS + 4 MÉDIOS + 4 BAIXOS)

- **GAP-04** (ActionBar sem speed paint): decisão de UX pendente. Recomendo aceitar como "ActionBar cobre vídeo apenas" e seguir.
- **GAP-05, GAP-06** (campos/funções mortos): dívida técnica, podem ser endereçadas em PR de polimento.
- **GAP-07** (`beforeUnloadMessage` órfão): trivial, deletar chave.
- **GAP-08** (`handleViewVideo` hardcoded): decisão de UX. Aceitar como unificado.
- **GAP-09** (cobertura de testes): pode ser feito em PR de polimento.
- **GAP-10** (`setState` direto): decisão documentada, defensável.
- **GAP-11, 12, 13, 14**: edge cases teóricos, melhorar se houver tempo.

### Falsos positivos (problemas que NÃO são gaps reais)

- **GAP-01 da rodada 1** (Speed paint inteiro fora do escopo): **RESOLVIDO**. O `speedPaintRenderController.tsx` agora é real (801 linhas) e o `useSpeedPaintExporter.tsx` virou fachada fina (293 linhas) que delega para o controller. O `useEffect` cleanup que abortava o render foi removido. O `useEffect` de `useSpeedPaintExporter.tsx:179-184` apenas sincroniza `codec`/`container` do `useCodecSupport` local para o controller — não aborta.
- **Warning do `AbortController` órfão no `videoRenderController`**: **RESOLVIDO**. As validações `if (!audioUrl || scenes.length === 0) return;` (linha 213) e `if (durationInFrames <= 0)` (linha 214-223) agora vêm ANTES da criação do `AbortController` (linha 233). O `currentRenderId` (linha 210) previne race conditions.
- **Speed paint NÃO escrever no `videoRenderBridge`**: **DECISÃO ARQUITETURAL INTENCIONAL** (documentada em `speedPaintRenderController.tsx:27-30`). Consumers legados como `ActionBar` foram desenhados para vídeo; speed paint usa consumers diretos via `useStore`. Não é gap — é padrão estabelecido. **ATENÇÃO:** isso causa o GAP-04 (ActionBar sem speed paint), que é consequência dessa decisão e merece atenção separada.
- **`setState` direto no `ExportCrossRouteToast:140`**: **DECISÃO DOCUMENTADA** (comentário linhas 133-138). É code smell mas é escolha deliberada. Pode ser refatorado para `dismissFailed()` action.
- **M8 (persistência localStorage) fora do escopo**: **DECISÃO DE PRODUTO EXPLÍCITA** (P5 do plano). Mas o tipo `RenderSnapshot` ficou declarado e órfão — isso é o GAP-03.
- **`ResetWarning`/`resetBridge` morto**: **LEGADO** da arquitetura anterior (quando `VideoPage` instanciava o hook e limpava no unmount). O PR removeu o cleanup mas a função ficou. Pode ser morta ou reutilizada (GAP-06).

---

## 6. Checklist de sanidade

- [x] Li por completo: `videoRenderController.tsx` (549 linhas), `speedPaintRenderController.tsx` (801 linhas), `useVideoExporter.tsx` (212 linhas), `useSpeedPaintExporter.tsx` (293 linhas), `ExportCrossRouteToast.tsx` (236 linhas), `useCrossRouteRenderGuard.ts` (113 linhas), `Sidebar.tsx` (259 linhas), `SidebarNavItem.tsx` (192 linhas), `MobileBottomNav.tsx` (572 linhas), `App.tsx` (301 linhas), `AudioGenerationHandler.tsx` (380 linhas), `VideoPage.tsx` (597 linhas), `SpeedPaintPage.tsx` (837 linhas), `ActionBar.tsx` (586 linhas), `renderController.ts` (140 linhas), `videoRenderBridge.ts` (58 linhas), testes (22 testes novos).
- [x] Verifiquei handling no parent: `useCrossRouteRenderGuard` cobre 3 fontes (vídeo + speed paint + áudio). `ExportCrossRouteToast` lê de ambos controllers para `isActive`/`toastKind`/`progress` (linhas 70-79, 86-98), mas os 3 handlers de ação (download/close) operam só no vídeo (linhas 114-127, 129-131, 139-141).
- [x] Confirmei ausência de símbolos: `RenderSnapshot` (0 usos em src/ + 0 em tests/), `lastProgressUpdateAt` (8 writes, 0 reads), `resetBridge` (2 declares, 0 callsites em produção), `setState` direto em 1 lugar (`ExportCrossRouteToast:140`), `beforeUnloadMessage` (3 declares, 0 reads).
- [x] Verifiquei comentários/docs: `speedPaintRenderController.tsx:27-30` documenta decisão de não usar bridge; `speedPaintRenderController.tsx:44-69` documenta imports e arquitetura; `useSpeedPaintExporter.tsx:1-29` documenta o que mudou; `ExportCrossRouteToast.tsx:133-138` documenta decisão de `setState` direto; `useCrossRouteRenderGuard.ts:9-13` documenta decisão de centralização (P3=A); `videoRenderController.tsx:212-213` documenta validações antes do controller.
- [x] Confirmei impacto em usuários reais:
  - GAP-01 afeta 100% dos speed paint completados (toast não fecha, download não funciona) — **CRÍTICO**
  - GAP-02 afeta 100% dos speed paint em background no desktop/mobile — **CRÍTICO**
  - GAP-03 afeta manutenibilidade (tipo morto) — **CRÍTICO** se for seguir YAGNI
  - GAP-04 afeta 100% dos speed paint em background visíveis na ActionBar — **ALTO**
  - GAP-05, 06 afetam manutenibilidade — **ALTOS**
  - GAP-07-14 afetam qualidade/polimento
- [x] Não consultei NotebookLM porque os gaps não dependem de API/convenção de tecnologia externa — são lógica interna React/Zustand/MUI e decisões de produto da equipe.
- [x] Severidades respeitam a regra "loading/empty/error state ausente ≤ MÉDIO" (GAP-07 é i18n órfão, não estado de UI; GAP-08 é edge case de UX).
- [x] Confidence Gate: maior nota = 99% (GAP-03), 97% (GAP-01), 95% (GAP-02, 05, 06, 07), 90% (GAP-04, GAP-12), 85% (GAP-08, 09), 80% (GAP-10), 75% (GAP-11, 13), 70% (GAP-14). Todas ≥ 70%.

---

## 7. Recomendação final

**BLOQUEAR MERGATE até corrigir GAP-01 e GAP-02** (3 CRÍTICOS, ~1h de trabalho combinado).

**GAP-01** é o bug mais grave porque anula o propósito central do PR1 para speed paint (toast cross-route não funciona nem para download nem para fechar). A correção é simples: refatorar os 3 handlers (`handleDownload`, `handleCloseCompleted`, `handleCloseFailed`) para detectar qual controller está ativo e delegar para o correto, espelhando o padrão de `handleCancel` (linhas 106-112).

**GAP-02** quebra a paridade vídeo vs speed paint do M7. Sem dot indicator, o speed paint em background fica invisível. A correção requer decidir a estratégia mobile (adicionar à bottom nav principal? dot no drawer?).

**GAP-03** é decisão de produto: ou remove o tipo `RenderSnapshot` (YAGNI) ou adiciona `@deprecated` para deixar claro que é contrato futuro. ~5 min.

**Pode seguir em PR de polimento** (GAP-04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14) — todos são melhorias de qualidade/dívida técnica que podem ser endereçadas em PRs subsequentes sem bloquear o release do PR1.

**O PR1 é sólido para vídeo (escopo M1, M3, M5, M6, M9).** Speed paint foi implementado (M2, M4) mas a integração com o resto da UI (toast, dot, ActionBar) ficou parcial, com 3 bugs críticos a corrigir antes do merge.
