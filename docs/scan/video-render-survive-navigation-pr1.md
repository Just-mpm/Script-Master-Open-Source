# Relatório de Lacunas — PR1: Video Render Survive Navigation (Script Master)

**Data da análise:** 2026-06-02
**Escopo:** Diff que move a renderização de vídeo do hook `useVideoExporter` (instanciado em `VideoPage`) para o controller singleton Zustand `videoRenderController` (vive no `App.tsx`).
**Método:** Leitura completa dos 13 arquivos do diff + 9 arquivos relacionados (consumidores, bridge, testes, i18n, analytics). Validação por `grep` e `supergrep_find` para confirmar ausência/presença de símbolos.

---

## 1. Contexto assumido

O PR1 declara entregar os módulos M1, M2, M3, M5, M6, M9 do plano "video-render-survive-navigation" (9 módulos totais). O objetivo central é: **a renderização de vídeo sobreviver à navegação entre rotas** da SPA. Fica entendido que:

- M1 = controller de vídeo (✅)
- M2 = controller de speed paint (⚠️ stub, ver GAP-01)
- M3 = refactor de `useVideoExporter` em fachada fina (✅)
- M4 = refactor de `useSpeedPaintExporter` em fachada fina (❌ NÃO implementado, ver GAP-01)
- M5 = guard cross-route (`useCrossRouteRenderGuard`) (✅)
- M6 = toast cross-route (`ExportCrossRouteToast`) (✅)
- M7 = indicador visual na Sidebar/Mobile (⚠️ parcial, ver GAP-02)
- M8 = persistência localStorage com `RenderSnapshot` (❌ NÃO implementado, ver GAP-04)
- M9 = tipos compartilhados (✅)

---

## 2. Mapa rápido: sólido vs. frágil

### ✅ Sólido (validado por leitura completa + busca estrutural)

- **Bridge como retrocompatibilidade**: `videoRenderController` chama `useVideoRenderBridge.getState().syncExportState(...)` em 10 pontos (linhas 159, 235, 245, 256, 338, 408, 469, 491, 517, 542). O consumidor `AudioGenerationHandler.tsx:164-165` continua lendo `isExportingVideo`/`videoExportProgress` da bridge sem alteração. **ActionBar.tsx:447-466** recebe via prop e mostra CircularProgress. Cadeia intacta.
- **Contrato público de `useVideoExporter` preservado**: `VideoExporter`, `VideoExportOptions`, `VideoExporterState` mantêm a mesma forma. `VideoExportPanel.tsx` (linha 18) consome o mesmo tipo via `exporter: VideoExporter`. Zero breaking change.
- **Singleton Zustand + AbortController em escopo de módulo**: padrão correto para sobreviver a unmount. `currentRenderId` (linha 72) protege contra race entre renders paralelos. `lastReportedPercentRef` (linha 76) throttla updates para evitar re-render 30×/s.
- **Lazy import do Remotion** preserva code-splitting (linhas 89-94).
- **i18n `exportCrossRoute.*`**: 10 chaves em 3 locales (pt-BR/en/es) — todas consistentes.
- **Analytics `video_export_completed_offroute`**: tipo declarado em `AnalyticsEventMap` (linha 79) e emitido no momento correto (linha 419 do controller, APÓS `set()` e ANTES do salvamento).
- **Guard centralizado**: `useCrossRouteRenderGuard` cobre vídeo + speed paint + áudio (linhas 49-52) — decisão P3=A documentada e validada por teste (regressão GAP-09).
- **`AudioGenerationHandler` enxugado**: `beforeunload` inline removido (linha 159-163) — listener não duplicado, cleanup garantido.
- **Testes novos**: 22 testes (7 controller + 9 guard + 6 toast) cobrem o core do PR.

### ⚠️ Frágil (risco real)

- **Speed paint inteiro está fora do escopo do PR1 sem aviso claro** — o stub é silencioso, então qualquer importador recebe no-op sem feedback.
- **`useEffect` cleanup do `useSpeedPaintExporter` (linhas 277-286) ABORTA o render no unmount** — o bug que o PR1 supostamente corrige para vídeo continua 100% intacto para speed paint. Usuário no `/app/pintura-rapida` que navegar perde o render.
- **Sidebar (desktop) sem dot indicator** — apenas MobileBottomNav tem. Usuário em desktop durante render cross-route fica sem indicação visual no menu.
- **API `setState` direto** no `ExportCrossRouteToast:140` — bypassing action layer, sem action pública equivalente no controller.
- **Tipos/declarações órfãs**: `RenderSnapshot` (M8) e `lastProgressUpdateAt` (render travado) são declarados/escritos mas não consumidos — dívida técnica.
- **Cobertura de testes tem gaps relevantes**: `onProgress`, `saveWarning`, evento offroute, integração `useVideoExporter` (fachada) sem teste dedicado.

---

## 3. Gaps priorizados

### CRÍTICOS

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-01** | CRÍTICO | Funcionalidade core quebrada (escopo declarado) | 95% | **Speed paint NÃO sobrevive à navegação** — M4 não foi implementado. `useSpeedPaintExporter.tsx` (714 linhas) mantém toda a lógica de render com `useState`/`useRef` local, e o `useEffect` cleanup (linhas 277-286) **aborta o render no unmount** — exatamente o bug que o PR1 corrige para vídeo. `SpeedPaintPage.tsx:27,68` continua usando o hook antigo. O `speedPaintRenderController.ts` é um stub com `startRender` no-op (linhas 77-82) que nunca é chamado pela página. Consequências: (1) `ExportCrossRouteToast` lê `useSpeedPaintRenderController` e nunca vê o render; (2) `MobileBottomNav` dot lê `useVideoRenderController` — idem; (3) `ActionBar.isExportingVideo` lê da bridge, e speed paint **nunca escreve** na bridge (0 matches de `syncExportState` em `useSpeedPaintExporter.tsx`). Resultado: speed paint é o "render que morre ao navegar" — o objetivo central do PR está 50% quebrado. | (1) `useSpeedPaintExporter.tsx:277-286` `useEffect(() => () => { ... abortControllerRef.current?.abort(); }, [])`; (2) `SpeedPaintPage.tsx:68` `const speedPaintExporter = useSpeedPaintExporter();`; (3) `speedPaintRenderController.ts:78` `log.warn('startRender() chamado, mas speed paint ainda não está implementado neste PR')`. | Comentário no stub (linhas 11-14) reconhece que "implementação real virá no PR2". Scope statement no prompt do usuário confirma M4 está fora. | Vale tornar isso explícito no PR description / changelog como "fora do escopo, speed paint ainda quebra"? Ou implementar pelo menos o esqueleto (remover o abort do cleanup) como hotfix? |
| **GAP-02** | ALTO rebaixado de CRÍTICO | Indicador visual ausente | 90% | **Sidebar (desktop) sem dot indicator de export de vídeo.** O plano M7 declara "indicador visual na Sidebar"; apenas `MobileBottomNav.tsx` (linhas 230-297) tem o dot. `Sidebar.tsx` (246 linhas, lido completo) não tem nenhuma lógica condicional baseada em `useVideoRenderController`. Usuário em desktop em `/app/biblioteca`, `/app/assistente` ou `/app/estudio` durante render não vê nenhum indicador visual no menu — só o `document.title` (emoji na aba) e o `ExportCrossRouteToast` (flutuante no top-center). | (1) `Sidebar.tsx` lido completo: 0 referências a `useVideoRenderController`, `isRendering`, `isExportingVideo`; (2) `MobileBottomNav.tsx:230-296` implementa o dot APENAS em mobile. | M7 diz "indicador visual" sem especificar mobile-only. O `document.title` é um fallback cross-device. | Dot na Sidebar é viável (espaço vertical de 40-64px por item), mas precisa de decisão de UX (cor, animação, posição). Vale criar issue de tracking? |

### ALTOS

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-03** | ALTO | Decisão de design / API layering | 90% | **`ExportCrossRouteToast.tsx:140` usa `useVideoRenderController.setState({ status: 'idle', error: null })` direto, bypassing a action layer.** O controller tem actions públicas (`startRender`, `cancelRender`, `reset`, `dismissSaveWarning`) mas nenhuma para "dismiss failed". O comentário no código (linhas 133-138) explica a decisão: usar `reset()` revogaria o blob URL e chamaria `clearStrokeCache()`. Mas o `setState` direto é um code smell — qualquer lógica adicional em `reset()` no futuro não será aplicada aqui, e ações concorrentes podem ficar dessincronizadas. | (1) `videoRenderController.tsx:548-550` existe `dismissSaveWarning` mas não `dismissFailed`/`dismissError`; (2) `ExportCrossRouteToast.tsx:140` usa `setState` direto. | O comentário documenta a decisão e referencia "GAP-06 do relatório de auditoria" — não é descuido, é escolha deliberada. | Adicionar action `dismissFailed()` (que faz só `{ status: 'idle', error: null }`) no controller e refatorar o toast? Pequeno mas consistente com `dismissSaveWarning`. |
| **GAP-04** | ALTO | Dívida técnica (tipo declarado, feature ausente) | 95% | **`RenderSnapshot` (M8) declarado em `types/renderController.ts:45-62` mas nunca usado em código de produção.** O tipo foi desenhado para "detectar render interrompido após F5 e exibir banner informativo" — `schemaVersion: 1` indica que migração futura já foi pensada. **0 matches** em `src/` (`grep "RenderSnapshot"` retorna 1 match, a própria declaração). | (1) `renderController.ts:45-62` declara o tipo completo; (2) `grep -r "RenderSnapshot" src/` retorna apenas a declaração. | JSDoc do tipo explica a intenção. Não é bug — é feature futura documentada. | Remover o tipo do PR1 (YAGNI) ou manter como contrato declarado para M8? Se mantiver, o tipo `RenderControllerPublicState` deveria referenciá-lo? |
| **GAP-05** | ALTO | Dívida técnica (campo declarado, sem uso) | 95% | **`lastProgressUpdateAt` é escrito em 3 lugares (`videoRenderController.tsx:157,233,405`) e declarado no tipo (linha 95), mas nunca é lido para o propósito declarado** ("detectar render travado"). O `useCrossRouteRenderGuard` faz polling de `document.title` a cada 1s lendo `status` apenas — não compara timestamps. | (1) 3 writes, 0 reads produtivos; (2) `useCrossRouteRenderGuard.ts:81-92` `updateTitle()` usa `status` direto, ignora timestamps. | O campo está semanticamente correto para futura detecção de stall — o PR1 apenas não usa. | Vale implementar stall detection no PR1 (mudar title para "⚠️ Render travado" se `Date.now() - lastProgressUpdateAt > 60s`)? |
| **GAP-06** | MÉDIO rebaixado de ALTO | Chave i18n órfã | 95% | **`exportCrossRoute.beforeUnloadMessage` declarado nos 3 locales (pt-BR/en/es) mas nunca lido no código.** O guard usa `event.preventDefault()` puro (correto — browsers modernos ignoram a string e usam `preventDefault` como gatilho). A chave i18n é lixo de tradução. | (1) `useCrossRouteRenderGuard.ts:65-70` faz só `event.preventDefault()`; (2) `grep "beforeUnloadMessage" src/` retorna 3 matches, todos nos locales. | Decisão técnica correta (spec W3C para `beforeunload`). | Remover a chave dos 3 locales? |

### MÉDIOS

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-07** | MÉDIO | Estado não limpo | 90% | **`useVideoRenderBridge.resetBridge()` exportado e testado, mas nunca chamado em código de produção.** Era invocado no cleanup do `useEffect` em `VideoPage` (removido neste PR). A bridge ainda é escrita pelo controller (`syncExportState`) e por transcrição/player (`syncTranscriptionState`, `syncCurrentFrame`, `syncIsPlaying`), mas acumula estado stale em campos não-sincronizados. Não causa bug visível (transcrição e player sobrescrevem a cada sessão), mas é dívida. | (1) `grep "resetBridge" src/` retorna 2 matches (declaração + definition em `videoRenderBridge.ts`); (2) 0 callsites em produção. | `useVideoRenderBridge` é simples Zustand store — vazamento de memória mínimo (apenas 4 campos primitivos). | Chamar `resetBridge()` em `useCrossRouteRenderGuard` cleanup? Ou aceitar como legado? |
| **GAP-08** | MÉDIO | Comportamento em edge case | 80% | **`ExportCrossRouteToast` aparece em rotas públicas** se houver render ativo. O check é `if (isVideoPage || isSpeedPaintPage) hide` — sem verificar se a rota é pública (visitante). Cenário real: usuário logado inicia export em `/app/video`, navega para `/contato` (público). O toast aparece com branding de app interno em página que visitantes veem. Na prática, **visitantes não autenticados não conseguem iniciar export** (rotas `/app/*` são protegidas) — então o bug só ocorre se o usuário fizer logout com render em andamento (improvável mas possível). | (1) `ExportCrossRouteToast.tsx:83-87` `isVideoPage` / `isSpeedPaintPage` checks; (2) `App.tsx:187` `<ExportCrossRouteToast />` sempre renderizado. | Visitantes não têm como chegar a esse estado exceto via logout mid-render. | Adicionar `if (!isAppRoute) return null` antes do return JSX? Ou aceitar como edge case de baixa probabilidade? |
| **GAP-09** | MÉDIO | Cobertura de testes | 85% | **Buracos relevantes na cobertura dos novos testes:**<br>**(a)** `videoRenderController.unit.test.ts` (7 testes) NÃO cobre:<br>  • `onProgress` callback → bridge sync (10ª linha de produção crítica)<br>  • Falha de `saveVideoToProject` → `saveWarning` populado (linhas 446-451)<br>  • Emissão de `video_export_completed_offroute` (linhas 417-425)<br>  • `reportProgress` throttling (igual inteiro não atualiza)<br>**(b)** `useVideoExporter` (fachada fina) não tem teste dedicado — testes do controller são proxy.<br>**(c)** `useCrossRouteRenderGuard` testa listeners mas NÃO testa:<br>  • Cleanup do `setInterval(updateTitle, 1000)` (timers vazam)<br>  • Comportamento quando o `setInterval` dispara (avanço de tempo via fake timers) | (1) `videoRenderController.unit.test.ts` lido completo (291 linhas); (2) `useCrossRouteRenderGuard.unit.test.ts` lido completo (225 linhas); (3) `grep "useVideoExporter.*test" tests/` retorna 0. | Cobertura é razoável para o core (estado, render paralelo, validação), mas o `onProgress` é o que mantém a UI atualizada — sem teste, regressão silenciosa. | Adicionar (pelo menos) teste de `onProgress` chamando `useVideoRenderBridge.syncExportState`? |

### BAIXOS

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-10** | BAIXO | Code smell | 90% | **`currentExportFileName` é variável de módulo mutável** (`videoRenderController.tsx:556`). O JSDoc (linha 553-555) reconhece: "específico do M1; M2 (speed paint) terá sua própria versão". Funciona, mas é namespace global implícito. Se M2 também precisar, vai precisar de convenção. | `videoRenderController.tsx:556` `let currentExportFileName = '';` (modulo-level). | Encapsulamento em closure do controller é a saída clean — M2 vai precisar do próprio. | Migrar para campo do state do controller (`fileName: string`) no PR2? |
| **GAP-11** | BAIXO | Stub silencioso | 85% | **`speedPaintRenderController.startRender` é no-op silencioso** com `log.warn`. Se alguém (em código futuro, teste, ou caminho indireto) importar e chamar, nada acontece visivelmente. Não há feedback para o usuário, nem `status: 'failed'`, nem `error` populado. | `speedPaintRenderController.ts:77-82` `startRender: async () => { log.warn(...); }` (sem set nem return). | Decisão documentada (linhas 78-80): "no-op silencioso: não altera `status` para 'failed' (esporro de toast vermelho) nem `isRendering` (consumidores já verificam)". | Mínimo: adicionar `set({ status: 'not_implemented' as RenderStatus })` se esse status for adicionado ao union? Ou deixar como está (consumidores que verificam `isRendering` recebem `false` e seguem)? |

---

## 4. Cenários de borda sem resposta

1. **Login mid-render**: usuário está em `/app/video`, render a 60% de progresso, clica em "Sair" (logout) sem cancelar. O que acontece?
   - `useCrossRouteRenderGuard` continua registrado (hook está no `App.tsx`).
   - O `AuthContext` faz `full reload` (comentário no AGENTS.md linha "Login/logout/delete fazem full reload (COEP conflict)").
   - Render é perdido silenciosamente — não há aviso no `LogoutConfirmDialog`.
   - **Confirmar se o guard cobre este caso ou se o reload já aborta tudo.**

2. **Dois renders em paralelo no mesmo controller (não é caso real)**: o controller é por `kind: 'video'`. Se o usuário disparar um segundo render, o primeiro é abortado (linhas 211-215 do controller). Se SpeedPaintPage e VideoPage dispararem simultaneamente (impossível por UX), um cancelaria o outro. **Edge case irreal mas o contrato é claro.**

3. **Render trava por OOM/erro não-capturado pelo Remotion**: o `try/catch` cobre erros do `renderMediaOnWeb` (linhas 352-451), mas se o callback `onProgress` lançar (Remotion não lança, mas hipotético), o erro não é capturado. Status fica em `preparing` ou `rendering` para sempre. `lastProgressUpdateAt` (GAP-05) serviria para detectar isso — não implementado.

4. **Estado sujo em testes paralelos**: o `videoRenderController` é singleton Zustand, sobrevive a `unmount` de `VideoPage` mas também sobrevive a `unmount` do `App` inteiro (em testes, isso pode vazar entre testes). `beforeEach: reset()` no teste mitiga, mas é frágil.

5. **Comportamento do `AbortController` em service worker (PWA)**: o PWA está habilitado (`vite-plugin-pwa`). Se o usuário suspender o laptop durante render, o SW não pausa Web Workers (só o JS principal). O `renderMediaOnWeb` provavelmente não suporta `freeze`/`resume`. **Confirmar com `vite-plugin-pwa` docs se a estratégia de caching atual do service worker pode interferir no ciclo de vida do `AbortController`.**

---

## 5. Checklist de sanidade

- [x] Li por completo: `videoRenderController.tsx`, `useVideoExporter.tsx`, `VideoPage.tsx`, `AudioGenerationHandler.tsx`, `MobileBottomNav.tsx`, `ToastProvider.tsx`, `ExportCrossRouteToast.tsx`, `useCrossRouteRenderGuard.ts`, `speedPaintRenderController.ts`, `renderController.ts`, `Sidebar.tsx`, `useSpeedPaintExporter.tsx`, `VideoExportPanel.tsx`.
- [x] Verifiquei handling no parent: bridge é alimentada pelo controller (10 callsites); consumers legados (ActionBar, AudioGenerationHandler, ToastManager) continuam funcionando.
- [x] Confirmei ausência de símbolos: `RenderSnapshot` (0 usos), `lastProgressUpdateAt` (0 leituras), `resetBridge` (0 callsites em produção), `setState` direto só em `ExportCrossRouteToast:140`, `useSpeedPaintExporter` ainda tem `abort` no cleanup.
- [x] Verifiquei comentários/docs: `speedPaintRenderController.ts` documenta que é stub para M2; `videoRenderController.tsx:153-160` documenta `reportProgress`; `ExportCrossRouteToast.tsx:133-138` documenta decisão de `setState` direto; `useCrossRouteRenderGuard.ts:9-13` documenta decisão de centralização (P3=A).
- [x] Confirmei impacto em usuários reais: GAP-01 afeta 50% do escopo (speed paint), GAP-02 afeta 100% dos usuários desktop durante render cross-route, GAP-08 afeta cenários de logout mid-render.
- [x] Não consultei NotebookLM porque os gaps não dependem de API/convenção de tecnologia externa — são lógica interna React/Zustand/MUI e decisões de produto da equipe.
- [x] Severidades respeitam a regra "loading/empty/error state ausente ≤ MÉDIO".
- [x] Confidence Gate: maior nota = 95% (GAP-01, GAP-04, GAP-05, GAP-06), nenhuma < 80%.

---

## Resumo

**11 gaps identificados:** 1 CRÍTICO (speed paint), 1 ALTO rebaixado (Sidebar dot), 3 ALTOS (setState direto, RenderSnapshot morto, lastProgressUpdateAt morto), 3 MÉDIOS (resetBridge, toast em rota pública, cobertura), 3 BAIXOS (currentExportFileName, stub silencioso, etc).

**O PR1 é sólido para vídeo (escopo M1/M3/M5/M6/M9). Speed paint está explicitamente fora do escopo (GAP-01), mas a falta de aviso claro pode levar usuários a achar que está funcionando. Sidebar dot está parcial (GAP-02). Tipos `RenderSnapshot` e `lastProgressUpdateAt` foram declarados mas M8 não foi implementado (GAP-04, GAP-05) — dívida técnica reconhecida.**
