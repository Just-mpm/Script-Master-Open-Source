# Relatório de Lacunas — PR1 R2-Pós-Correção: Video Render Survive Navigation (Script Master)

**Data da análise:** 2026-06-02 (rodada 2 — validação pós-correção dos 3 gaps críticos)
**Escopo:** Validar se os 3 gaps CRÍTICOS reportados em `docs/scan/video-render-survive-navigation-pr1-r2.md` foram realmente corrigidos e se a correção não introduziu novos problemas.
**Método:** Leitura completa dos 3 arquivos centrais (`ExportCrossRouteToast.tsx`, `Sidebar.tsx`, `types/renderController.ts`), arquivo de teste atualizado (`ExportCrossRouteToast.component.test.tsx`), speed paint controller, MobileBottomNav, useCrossRouteRenderGuard, hooks fachada. Validação por `grep` para confirmar ausência/presença de símbolos (`RenderSnapshot`, `RenderPhase`, `RenderPhase`, `spIsRendering`/`spStatus` em tests, `showExportDot` em tests, `lastProgressUpdateAt`, `resetBridge`, `videoRenderBridge`).
**Contexto histórico:** R1 original (em `docs/scan/video-render-survive-navigation-pr1.md`) identificou 11 gaps. R2 pré-correção (`docs/scan/video-render-survive-navigation-pr1-r2.md`) apontou 3 CRÍTICOS pendentes. Esta R2 valida a correção e identifica gaps residuais.

---

## 1. Contexto assumido

O PR1 declara entregar M1, M2, M3, M4, M5, M6, M7, M9 do plano "video-render-survive-navigation" (M8 explicitamente fora). Stack: React 19 + Vite 8 + TypeScript 6 + MUI v9 + Zustand 5 + Remotion 4.0.448.

Após a R2 pré-correção, **3 gaps CRÍTICOS** foram marcados como bloqueadores de merge:
1. **GAP-01** — `ExportCrossRouteToast` ignorava `useSpeedPaintRenderController` em 3 handlers (`handleDownload`, `handleCloseCompleted`, `handleCloseFailed`).
2. **GAP-02** — Dot indicator de speed paint ausente em Sidebar (e MobileBottomNav, com decisão de design registrada).
3. **GAP-03** — `RenderSnapshot` (M8) declarado como código morto.

Esta R2 lê o código atual e valida cada um.

---

## 2. Mapa rápido: sólido vs. frágil

### ✅ Sólido (validado por leitura completa + busca estrutural)

| Camada | Estado | Evidência |
|---|---|---|
| **GAP-01 (ExportCrossRouteToast × speed paint)** | ✅ **CORRIGIDO** | `ExportCrossRouteToast.tsx:39-42` importa `useSpeedPaintRenderController` + `getCurrentExportFileName as getSpeedPaintExportFileName`. Linhas 80-84 têm 5 seletores (`spIsRendering`, `spStatus`, `spProgress`, `spError`, `spStatusText`). `handleViewVideo` (107-113) branch para `/app/pintura-rapida`. `handleCancel` (115-121) branch correto. **`handleDownload` (123-153) branch COMPLETO** com `downloadFile`, `trackAnalyticsEvent('speed_paint_downloaded', ...)`, `state.reset()`. `handleCloseCompleted` (155-161) branch para `useSpeedPaintRenderController.getState().reset()`. `handleCloseFailed` (169-175) branch para `useSpeedPaintRenderController.setState({ status: 'idle', error: null })`. Mensagem de erro usa `spError` (linha 269). |
| **GAP-02 (Dot indicator × speed paint)** | ✅ **CORRIGIDO** (Sidebar) | `Sidebar.tsx:26` importa `useSpeedPaintRenderController`. Linhas 90-91 leem `spIsRendering` e `spStatus`. Cálculo de `showExportDot` em 245-252 cobre speed paint (`item.to === '/app/pintura-rapida' && (spIsRendering \|\| spStatus === 'completed') && location.pathname !== '/app/pintura-rapida'`). `videoIsRendering` prop é passada corretamente para o item de speed paint (linha 254). |
| **GAP-03 (RenderSnapshot removido)** | ✅ **CORRIGIDO** | `types/renderController.ts` reescrito de 140 para 112 linhas. **Nenhuma referência a `RenderSnapshot`** em `src/` ou `tests/` (`grep "RenderSnapshot" .` retorna apenas 14 matches em `docs/`). |
| **Toast cross-route cobre vídeo + speed paint** | ✅ Sólido | `isActive = videoIsRendering \|\| spIsRendering` (91), `toastKind` derivado de ambos (95-100), exclusão de `/app/video` e `/app/pintura-rapida` (88-89), progress consolidado (103). |
| **Speed paint controller** | ✅ Sólido | `speedPaintRenderController.tsx` (801 linhas) é singleton Zustand com AbortController em escopo de módulo, `currentRenderId` previne race, 4 escritas em `lastProgressUpdateAt`. |
| **Video controller** | ✅ Sólido | `videoRenderController.tsx` (548 linhas) sincroniza Zustand + bridge, validações antes do `AbortController` (linhas 213-223). |
| **useCrossRouteRenderGuard** | ✅ Sólido | Cobre vídeo + speed paint + áudio. `isAnyRendering` (linha 49) e `anyStatus` (linha 55) leem de ambos controllers + `audioGeneratorStore`. 9 testes em `tests/hooks/useCrossRouteRenderGuard.unit.test.ts`. |
| **Hooks fachada sem cleanup problemático** | ✅ Sólido | `useVideoExporter.tsx` (225 linhas) e `useSpeedPaintExporter.tsx` (293 linhas) delegam para controllers. **Sem `useEffect` cleanup que aborte render no unmount** (confirmado por leitura completa). |
| **MobileBottomNav justifica ausência de dot para speed paint** | ✅ Decisão documentada | `MobileBottomNav.tsx:94-99` lista os 4 navItems principais: `/app/biblioteca`, `/app/video`, `/app/assistente`, `/app/estudio`. Speed paint está no drawer (linha 109). Dot só aparece no item "Vídeo" (linha 232). Decisão: speed paint no drawer não tem dot — toast cobre o feedback. |

### ⚠️ Frágil (risco real, novo ou residual)

| Camada | Estado | Comentário |
|---|---|---|
| **Teste do `ExportCrossRouteToast` não cobre speed paint** | 🟠 Frágil | Após corrigir GAP-01, **o teste `tests/components/ExportCrossRouteToast.component.test.tsx` mocka `useSpeedPaintRenderController` (linhas 89-93) e define `mockSpeedPaintState` (64-70), mas a única cobertura de speed paint é o teste "NÃO aparece em /app/pintura-rapida" (linhas 197-207)**. Faltam testes de: rendering, completed, failed, download, cancel, close, view, branch entre vídeo e speed paint. **Regressão silenciosa possível em PRs futuros.** |
| **`RenderPhase` declarado mas não usado** | 🟠 Frágil (NOVO) | `types/renderController.ts:31-34` declara `RenderPhase` (valores: `'speed-paint'`, `'composition'`, `'finalizing'`). JSDoc diz "Fase interna do render (informa Toast/Title o que está acontecendo)". **0 usos em src/ e 0 em tests/** (`grep "RenderPhase" .` retorna 1 match, a própria declaração). R1/R2 pré-correção **não detectaram** que `RenderPhase` é o novo código morto (substituiu o `RenderSnapshot` na mesma função de "tipo para futuro"). |
| **Sem teste do `showExportDot` no Sidebar** | 🟠 Frágil (NOVO) | Após corrigir GAP-02, **não há cobertura de teste** para o dot indicator. `grep "showExportDot" tests/` retorna 0 matches. Tanto vídeo quanto speed paint ficam sem proteção contra regressão. |
| **Prop `videoIsRendering` em SidebarNavItem usado para speed paint** | 💡 Cosmético (NOVO) | `SidebarNavItem.tsx:34, 56, 166` define `videoIsRendering?: boolean`. `Sidebar.tsx:254` passa `item.to === '/app/pintura-rapida' ? spIsRendering : videoIsRendering`. **O nome é enganoso** — está carregando `spIsRendering` quando o item é speed paint. Não causa bug, mas é acoplamento conceitual confuso. |
| **ExportDot `aria-label` hardcoded em pt-BR** | 💡 Cosmético (NOVO) | `SidebarNavItem.tsx:170` define `aria-label={videoIsRendering ? 'Renderização em andamento' : 'Vídeo pronto para ver'}` — strings literais. MobileBottomNav usa i18n (`t('exportCrossRoute.mobileDotActive')` / `mobileDotCompleted`). Inconsistência entre os 2 locais. |
| **`setState` direto no handleCloseFailed** | 💡 Cosmético | `ExportCrossRouteToast.tsx:171, 173` ainda usa `useVideoRenderController.setState({ status: 'idle', error: null })` e `useSpeedPaintRenderController.setState({ status: 'idle', error: null })` direto, bypassando a action layer. Comentário nas linhas 163-167 documenta a decisão (GAP-10 da R1). Consistente com decisão registrada. |
| **Gaps ALTOS R1 não corrigidos** | 🟠 Resíduo | `lastProgressUpdateAt` (8 writes, 0 reads), `resetBridge` (2 declares, 0 callsites), `beforeUnloadMessage` i18n órfão (3 declares, 0 reads), ActionBar sem speed paint. Todos reconhecidos como aceitos na R2 pré-correção (P5/P4 do plano). |
| **MobileBottomNav sem dot para speed paint no drawer** | 🟠 Resíduo | Item speed paint está no drawer (linha 109), mas o drawer (411-450) **não tem dot indicator**. Decisão de design registrada (speed paint no drawer é secundário, toast cobre feedback), mas é lacuna de paridade com vídeo. |

---

## 3. Gaps priorizados

### Validação dos 3 gaps CRÍTICOS da R1

| ID R1 | Status | Evidência da correção | Veredito |
|---|---|---|---|
| **GAP-01** (ExportCrossRouteToast ignora speed paint) | ✅ **CORRIGIDO** | `handleDownload` 123-153, `handleCloseCompleted` 155-161, `handleCloseFailed` 169-175, `handleViewVideo` 107-113 — todos com branch para `useSpeedPaintRenderController`. Download inclui `getSpeedPaintExportFileName()`, extensão (`webm`/`mp4`), `trackAnalyticsEvent('speed_paint_downloaded', ...)`, e `state.reset()`. Mensagem de erro usa `spError`. | **Confidence 98%** — não há caminho de speed paint completado/failed que escape do tratamento. |
| **GAP-02** (Dot indicator sem speed paint) | ✅ **CORRIGIDO** (parcialmente) | `Sidebar.tsx` linhas 26, 90-91, 245-254 cobrem speed paint. `MobileBottomNav` mantém decisão documentada de não ter dot no drawer para speed paint. | **Confidence 95%** — Sidebar corrigido; MobileBottomNav é decisão de produto, não bug. |
| **GAP-03** (RenderSnapshot morto) | ✅ **CORRIGIDO** | `RenderSnapshot` removido de `types/renderController.ts` (140 → 112 linhas). 0 usos em src/ e tests/ (apenas em docs/). | **Confidence 99%** — tipo removido por completo. |

### 🟠 NOVOS gaps encontrados (pós-correção)

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|---|---|---|---|---|---|---|---|
| **GAP-11-R2** | 🟠 MÉDIO | Cobertura de teste ausente | **95%** | **Teste do `ExportCrossRouteToast` não cobre speed paint após GAP-01 corrigido.** O mock `useSpeedPaintRenderController` existe (linhas 89-93 do teste), `mockSpeedPaintState` é definido (64-70), mas a única asserção de speed paint é "NÃO aparece em /app/pintura-rapida" (197-207). **Faltam testes para:** (a) toast rendering de speed paint em `/app/assistente`; (b) handleDownload com `spStatus === 'completed'`; (c) handleCancel com `spIsRendering === true`; (d) handleCloseCompleted com speed paint; (e) handleCloseFailed com speed paint; (f) handleViewVideo roteando para `/app/pintura-rapida`; (g) texto do body usando `spStatusText` em vez de `videoStatusText`. | (1) `tests/components/ExportCrossRouteToast.component.test.tsx:197-207` única cobertura; (2) 7 cenários possíveis de speed paint não testados. | Risco de regressão em PRs futuros. O contrato foi documentado no JSDoc (ExportCrossRouteToast:1-25) mas não há guard automatizado. | Adicionar pelo menos 5 testes: rendering/completed/failed de speed paint + 2 testes de branch (download, view). ~30 min. |
| **GAP-12-R2** | 🟠 MÉDIO | Código morto (NOVO) | **98%** | **`RenderPhase` declarado em `types/renderController.ts:31-34` mas com 0 usos.** JSDoc diz "Fase interna do render (informa Toast/Title o que está acontecendo)". Valores: `'speed-paint'`, `'composition'`, `'finalizing'`. **R1 e R2 pré-correção não detectaram** — o foco foi em `RenderSnapshot`, mas `RenderPhase` ficou órfão no mesmo arquivo. | (1) `grep "RenderPhase" .` → 1 match em `src/`, 0 em `tests/`; (2) `RenderPhase` é exportado mas não importado em lugar nenhum; (3) R1/R2 docs não mencionam este tipo. | JSDoc explica a intenção. | Remover o tipo agora (YAGNI) ou adicionar `@deprecated`? Decisão de produto análoga ao GAP-03 anterior. |
| **GAP-13-R2** | 💡 BAIXO | Cobertura de teste ausente | **90%** | **Sem teste do `showExportDot` no Sidebar para vídeo nem para speed paint.** Após corrigir GAP-02, o dot indicator não tem proteção contra regressão. `grep "showExportDot" tests/` → 0 matches. Os 14 testes do Sidebar (`Sidebar.features.test.tsx` + `Sidebar.component.test.tsx`) cobrem links, aria-current, toggle, dialog — **nenhum** testa o dot. | (1) `tests/components/Sidebar.features.test.tsx:1-309` (sem dot); (2) `tests/components/Sidebar.component.test.tsx:1-320` (sem dot); (3) `showExportDot` calculado em `Sidebar.tsx:245-252` sem teste. | O componente `ExportDot` em `SidebarNavItem.tsx:166-191` é testável isoladamente. | Adicionar 3 testes: (a) dot aparece quando `videoIsRendering === true`; (b) dot aparece quando `spIsRendering === true`; (c) dot NÃO aparece em `/app/video` ou `/app/pintura-rapida`. ~15 min. |
| **GAP-14-R2** | 💡 BAIXO | Acoplamento confuso (cosmético) | **95%** | **Prop `videoIsRendering` em `SidebarNavItem` é usado para speed paint.** `SidebarNavItem.tsx:34, 56` define `videoIsRendering?: boolean`. `Sidebar.tsx:254` passa `spIsRendering` quando `item.to === '/app/pintura-rapida'`. **Nome do prop é enganoso.** O `ExportDot` (166-191) usa `videoIsRendering` para decidir cor (azul pulsante vs verde estático), e o tooltip `aria-label` é "Renderização em andamento" vs "Vídeo pronto para ver" — texto hardcoded em pt-BR. | (1) `SidebarNavItem.tsx:34` `videoIsRendering?: boolean`; (2) `Sidebar.tsx:254` ternário confuso; (3) `aria-label` linha 170 hardcoded. | Não causa bug. O ternário está documentado visualmente. | Renomear `videoIsRendering` para `isRendering` (genérico) e usar i18n no `aria-label`. Pequeno refactor cosmético. |
| **GAP-15-R2** | 💡 BAIXO | Inconsistência i18n | **90%** | **ExportDot em `SidebarNavItem.tsx:170` usa strings hardcoded em pt-BR para `aria-label`.** MobileBottomNav (`MobileBottomNav.tsx:273-275`) usa `t('exportCrossRoute.mobileDotActive')` / `mobileDotCompleted`. **Inconsistência entre os 2 locais** que renderizam o mesmo conceito. | (1) `SidebarNavItem.tsx:170` literal `'Renderização em andamento'` / `'Vídeo pronto para ver'`; (2) `MobileBottomNav.tsx:273-275` usa `t(...)`. | Chave i18n `exportCrossRoute.mobileDotActive`/`mobileDotCompleted` já existe nos 3 locales (pt-BR/en/es). | Usar `t('exportCrossRoute.mobileDotActive')` / `mobileDotCompleted` no SidebarNavItem. ~5 min. |
| **GAP-16-R2** | 💡 BAIXO | Code smell (residual) | **90%** | **`setState` direto no `handleCloseFailed` (linhas 171, 173) ainda bypassa a action layer.** O comentário linhas 163-167 documenta a decisão (mesma justificativa do GAP-10 da R1: usar `reset()` revogaria o blob URL). Consistente com decisão registrada. | (1) `ExportCrossRouteToast.tsx:171` `useSpeedPaintRenderController.setState({ status: 'idle', error: null })`; (2) `:173` `useVideoRenderController.setState({ status: 'idle', error: null })`. | Decisão documentada. | Adicionar `dismissFailed()` action em ambos controllers para consistência. Pequeno. |

### Gaps ALTOS da R1 — status verificado (não modificados por este PR)

| ID R1 | Título | Status pós-correção |
|---|---|---|
| **GAP-04** | ActionBar sem speed paint (sem bridge) | 🟠 Não corrigido (aceito na R2 pré-correção, decisão P5) |
| **GAP-05** | `lastProgressUpdateAt` morto (8 writes, 0 reads) | 🟠 Não corrigido (aceito, feature de stall detection fora do escopo) |
| **GAP-06** | `resetBridge` morto (2 declares, 0 callsites) | 🟠 Não corrigido (aceito, legado) |
| **GAP-07** | `beforeUnloadMessage` i18n órfão (3 declares, 0 reads) | 🟠 Não corrigido (dívida técnica) |
| **GAP-08** | `handleViewVideo` hardcoded para `/app/video` | ✅ **CORRIGIDO** (linhas 109-111: `spIsRendering \|\| spStatus === 'completed' \|\| spStatus === 'failed'` → `/app/pintura-rapida`) |
| **GAP-10** | `setState` direto em `handleCloseFailed` | 🟠 Parcialmente persistido (linhas 171, 173 — GAP-16-R2) |

---

## 4. Cenários de borda sem resposta (revisitados)

1. **Speed paint completed + usuário clica "Fechar" no toast cross-route** (atualizado da R1):
   - **GAP-01 corrigido**: `handleCloseCompleted` agora reseta AMBOS os controllers corretamente via if/else. Speed paint completed → user clica Fechar → toast fecha.
   - **Confidence 98%** — verificado por leitura das linhas 155-161.

2. **Speed paint failed + usuário clica "Fechar" no toast cross-route**:
   - **GAP-01 corrigido**: `handleCloseFailed` agora usa `useSpeedPaintRenderController.setState` (linha 171).
   - **Confidence 95%** — bypassa action layer, mas é decisão documentada.

3. **Speed paint completed + usuário clica "Baixar" no toast cross-route**:
   - **GAP-01 corrigido**: `handleDownload` agora lê de `useSpeedPaintRenderController.getState()` (linha 126), usa `getSpeedPaintExportFileName()` (130), extensão correta (webm/mp4), e analytics (132-135).
   - **Confidence 98%** — fluxo completo coberto.

4. **Dois renders em paralelo (vídeo + speed paint simultaneamente)**:
   - Impossível na prática: 2ª render cancela 1ª (videoRenderController.tsx:226-230, speedPaintRenderController.tsx:390-394, :588-592).
   - `useCrossRouteRenderGuard.isAnyRendering()` (linha 49) detecta qualquer um ativo. `ExportCrossRouteToast.toastKind` (95-100) prioriza `rendering` > `completed` > `failed`.
   - **Edge case residual**: vídeo completa enquanto speed paint ainda roda → toast muda para "Vídeo pronto!" mas speed paint continua. Documentado na R1, ainda válido.

5. **Login mid-render** (não tratado):
   - `useCrossRouteRenderGuard` só captura `beforeunload`, não logout intencional.
   - `AuthContext` faz `full reload` no logout (comentário no AGENTS.md).
   - Render é perdido silenciosamente. Sem aviso no `LogoutConfirmDialog`.
   - **Não corrigido** — fora do escopo do PR1.

6. **Browser crash mid-render** (não tratado):
   - M8 (`RenderSnapshot`) seria a solução. Não implementado.
   - **Não corrigido** — decisão P5 do plano, fora do PR1.

7. **Service Worker (PWA) suspende aba**:
   - `vite-plugin-pwa` habilitado. Timers em background são throttled pelo browser.
   - `document.title` pode ficar stale até o próximo tick (R1 GAP-14).
   - **Não corrigido** — edge case teórico.

8. **Speed paint completed → usuário navega para `/app/video` (não /pintura-rapida)**:
   - `handleViewVideo` agora roteia corretamente para `/app/pintura-rapida` quando speed paint (linha 110).
   - **GAP-08 corrigido**.

---

## 5. Checklist de sanidade

- [x] Li por completo: `ExportCrossRouteToast.tsx` (275 linhas), `Sidebar.tsx` (270 linhas), `types/renderController.ts` (112 linhas), `ExportCrossRouteToast.component.test.tsx` (245 linhas), `speedPaintRenderController.tsx` (801 linhas), `videoRenderController.tsx` (548 linhas), `useCrossRouteRenderGuard.ts` (113 linhas), `MobileBottomNav.tsx` (572 linhas), `SidebarNavItem.tsx` (192 linhas), `useVideoExporter.tsx` (225 linhas), `useSpeedPaintExporter.tsx` (293 linhas), `useCrossRouteRenderGuard.unit.test.ts` (225 linhas), `Sidebar.features.test.tsx` (309 linhas), `Sidebar.component.test.tsx` (320 linhas), R2 pré-correção (186 linhas), R1 original (124 linhas).
- [x] Verifiquei handling no parent: `useCrossRouteRenderGuard` cobre 3 fontes (vídeo + speed paint + áudio). `ExportCrossRouteToast` lê de ambos controllers para todas as ações. `Sidebar` lê de ambos para o dot indicator.
- [x] Confirmei ausência/presença de símbolos:
  - `RenderSnapshot` — **0 em src/, 0 em tests/** (apenas docs)
  - `RenderPhase` — **1 em src/ (declaração), 0 em tests/** ⚠️
  - `spIsRendering` / `spStatus` em tests — **0 matches** ⚠️
  - `showExportDot` em tests — **0 matches** ⚠️
  - `lastProgressUpdateAt` — 8 writes, 0 reads (residual R1)
  - `resetBridge` — 2 declares, 0 callsites (residual R1)
  - `beforeUnloadMessage` — 3 declares, 0 reads (residual R1)
- [x] Verifiquei comentários/docs: `speedPaintRenderController.tsx:27-30` documenta decisão de não usar bridge; `ExportCrossRouteToast.tsx:163-167` documenta decisão de `setState` direto em `handleCloseFailed`; `MobileBottomNav.tsx:88` documenta "só ícone Vídeo" para dot.
- [x] Confirmei impacto em usuários reais:
  - GAP-01 corrigido: speed paint completed/failed agora tem UX completa (download, close, view, cancel).
  - GAP-02 corrigido: dot pulsante no item "Speed Paint" do Sidebar durante render.
  - GAP-03 corrigido: tipo morto removido, contrato mais limpo.
  - GAP-11-R2: risco de regressão silenciosa em speed paint (MÉDIO, ~30 min para corrigir).
  - GAP-12-R2: tipo morto novo `RenderPhase` (MÉDIO, decisão análoga a GAP-03).
  - GAP-13-R2, 14, 15, 16: BAIXOS, melhoramentos de qualidade.
- [x] Não consultei NotebookLM porque os gaps não dependem de API/convenção de tecnologia externa — são lógica interna React/Zustand/MUI e decisões de produto da equipe.
- [x] Severidades respeitam a regra "loading/empty/error state ausente ≤ MÉDIO" (GAP-11 é cobertura de teste, não estado de UI; GAP-13 idem).
- [x] Confidence Gate: maior nota = 99% (GAP-03), 98% (GAP-01, GAP-12-R2), 95% (GAP-02, GAP-11-R2, GAP-14-R2, GAP-16-R2), 90% (GAP-13-R2, GAP-15-R2), 85% (edge cases de race). Todas ≥ 80% (exceto edge cases teóricos não reportados).

---

## 6. Resumo executivo

### Gaps CRÍTICOS da R1 (validação)

| ID R1 | Status | Bloqueador? |
|---|---|---|
| **GAP-01** (ExportCrossRouteToast × speed paint) | ✅ **CORRIGIDO** | Não — speed paint cross-route funciona |
| **GAP-02** (Dot indicator × speed paint) | ✅ **CORRIGIDO** (Sidebar) | Não — MobileBottomNav é decisão de design |
| **GAP-03** (RenderSnapshot morto) | ✅ **CORRIGIDO** | Não — tipo removido |

### Novos gaps encontrados (pós-correção)

| ID | Severidade | Esforço | Bloqueador? |
|---|---|---|---|
| **GAP-11-R2** | 🟠 MÉDIO | ~30 min (5 testes novos) | **NÃO** (regressão silenciosa, não bug funcional) |
| **GAP-12-R2** | 🟠 MÉDIO | 5 min (remover ou `@deprecated`) | **NÃO** (decisão de produto análoga a GAP-03) |
| **GAP-13-R2** | 💡 BAIXO | ~15 min (3 testes novos) | NÃO (regressão) |
| **GAP-14-R2** | 💡 BAIXO | ~10 min (renomear prop) | NÃO (cosmético) |
| **GAP-15-R2** | 💡 BAIXO | ~5 min (usar `t(...)`) | NÃO (i18n) |
| **GAP-16-R2** | 💡 BAIXO | ~10 min (action `dismissFailed`) | NÃO (consistência) |

### Veredito

**APTO PARA MERGE** — todos os 3 gaps CRÍTICOS da R1 foram corretamente corrigidos:
- **GAP-01**: Speed paint tem UX completa no toast cross-route (download, close, cancel, view, error).
- **GAP-02**: Dot indicator funciona no Sidebar para speed paint.
- **GAP-03**: `RenderSnapshot` removido, contrato mais limpo.

Os 6 novos gaps encontrados são todos de severidade MÉDIO (2) ou BAIXO (4) — polimento que pode ser endereçado em PR de testes/i18n subsequente sem bloquear o release.

**Atenção especial para GAP-12-R2**: ao corrigir GAP-03 (remover `RenderSnapshot`), o time deixou passar `RenderPhase` no mesmo arquivo, que tem o mesmo problema de ser tipo morto. Vale a pena remover ou marcar como `@deprecated` na mesma PR de polimento — analogia direta com GAP-03, decisão de YAGNI vs contrato futuro.

**Atenção especial para GAP-11-R2**: o teste do `ExportCrossRouteToast` mocka o speed paint controller mas não testa o fluxo corrigido. Isso significa que a correção do GAP-01 (a mais crítica do PR1) está sem guard automatizado. Adicionar pelo menos 3-4 testes do fluxo de speed paint no toast é fortemente recomendado antes do próximo PR que mexer nesse arquivo.

### Gaps ALTOS da R1 que permanecem (não corrigidos por este PR)

- **GAP-04** (ActionBar sem speed paint): aceito como limitação, decisão P5.
- **GAP-05** (`lastProgressUpdateAt` morto): aceito, stall detection fora do escopo.
- **GAP-06** (`resetBridge` morto): aceito, legado.
- **GAP-07** (`beforeUnloadMessage` i18n órfão): aceito, dívida técnica trivial.

Todos já estavam marcados como "aceitar" na R2 pré-correção e continuam válidos.

---

## 7. Recomendação final

**MERGE LIBERADO.** Os 3 gaps CRÍTICOS foram corrigidos corretamente. O PR1 entrega:
- ✅ Vídeo sobrevive à navegação (M1 + M3 + M5 + M6 + M7 + M9)
- ✅ Speed paint sobrevive à navegação (M2 + M4 + M5 + M6 + M7 — sem dot mobile por design)
- ✅ Dot indicator paritário no Sidebar desktop
- ✅ Contrato de tipos limpo (RenderSnapshot removido)

**Para PR de polimento** (sugestão, não bloqueador):
1. Remover ou marcar como `@deprecated` o `RenderPhase` (GAP-12-R2) — 5 min.
2. Adicionar 5 testes de speed paint no `ExportCrossRouteToast.component.test.tsx` (GAP-11-R2) — 30 min.
3. Adicionar 3 testes do `showExportDot` no Sidebar (GAP-13-R2) — 15 min.
4. Renomear `videoIsRendering` → `isRendering` em `SidebarNavItem` (GAP-14-R2) — 10 min.
5. Trocar strings hardcoded por `t(...)` no `ExportDot.aria-label` (GAP-15-R2) — 5 min.
6. Adicionar `dismissFailed()` action em ambos controllers (GAP-16-R2) — 10 min.
7. Decidir estratégia mobile para dot de speed paint (drawer vs nav principal) — UX pendente.

**Total de polimento:** ~1h15, distribuível em PR de qualidade/QA.
