# Requisitos — Video Render Survive Navigation

**Slug:** `video-render-survive-navigation`
**Versão do projeto:** 0.122.0
**Status:** Requirements ready — aguardando sign-off de decisões abertas (P5)
**Arquivo gerado a partir de:** `base.md` (plano técnico) + `product.md` (especificação de produto)

---

## 1. Escopo e Objetivo

Permitir que renderizações de vídeo (em `/app/video`) e speed paint (em `/app/pintura-rapida`) **continuem executando** quando o usuário navega para qualquer outra rota da SPA. O sistema notifica o progresso via Toast global cross-route, preserva o resultado (`outputBlob`/`outputUrl`) para download em qualquer rota, e permite cancelamento explícito sem necessidade de retornar à página de origem.

---

## 2. Atores e Premissas

### Atores

| Ator | Descrição |
|---|---|
| **Usuário autenticado** | Matheus (power user). Pode iniciar exportação em `/app/video` ou `/app/pintura-rapida` e navegar para qualquer outra rota autenticada. |
| **Sistema** | SPA React + Zustand. Gerencia ciclo de vida da renderização via singleton stores (M1/M2). |

### Premissas validadas

1. `renderMediaOnWeb` (Remotion 4.0.448): `AbortSignal` é destrutivo. Sem pause/resume/checkpoint. `outputBlob` perdido se signal for abortado antes do `result.getBlob()` resolver.
2. `outputTarget: 'web-fs'` existe conceitualmente no `@remotion/webcodecs` mas **não tem documentação estável** — não usar como base.
3. React 19: trabalho de longa duração que sobrevive a unmount exige ciclo de vida em **módulo externo** ou **singleton store**.
4. Zustand 5: `create<T>()(...)` sintaxe obrigatória. `useShallow` mandatório para seletores que retornam objetos/arrays. `getState()` para acesso imperativo.
5. `videoRenderBridge.ts` **já** propaga `isExportingVideo` + `videoExportProgress` para `ActionBar` e `ToastManager`. A reatividade cross-route está pronta; só falta a fonte não ser abortada.
6. Padrão de `beforeunload` já existe em `AudioGenerationHandler.tsx:163-173` — será generalizado.

---

## 3. Requisitos Funcionais (RF)

### 3.1 Renderização Cross-Route

#### RF-001: Renderização sobrevive à navegação

| Campo | Valor |
|---|---|
| **Descrição** | Ao navegar de `/app/video` ou `/app/pintura-rapida` para qualquer outra rota autenticada, o render **não é abortado**. A promise `renderMediaOnWeb` continua executando no singleton store (M1/M2), fora do ciclo de vida do componente. |
| **Prioridade** | P0 |
| **Complexidade** | M |
| **Módulo** | M1, M2, M3, M4 |
| **Critérios de verificação** | 1) Iniciar exportação em `/app/video`, navegar para `/app/assistente`, aguardar 5s, voltar para `/app/video` — o progresso deve ter avançado e o `outputBlob` deve estar disponível ao completar. 2) `useVideoExporter`/`useSpeedPaintExporter` **não** possuem `useEffect` cleanup que chama `abortControllerRef.current?.abort()` — verificar remoção das linhas 178-186 do `useVideoExporter.tsx`. 3) Teste: `bun test tests/video-render/` passa com mocks do controller. |
| **Exceções** | F5/reload ainda perde o blob (RF-013). Navegação para rota pública desloga o usuário — o render é perdido. |

#### RF-002: Progresso atualizado em tempo real durante navegação

| Campo | Valor |
|---|---|
| **Descrição** | O progresso da renderização (0-100%) é atualizado no singleton store (M1/M2) e escrito no `videoRenderBridge` via `syncExportState(isRendering, progress)`. Qualquer componente que consuma `useVideoRenderBridge` recebe atualizações em tempo real. |
| **Prioridade** | P0 |
| **Complexidade** | M |
| **Módulo** | M1, M2 |
| **Critérios de verificação** | 1) `videoRenderBridge.isExportingVideo === true` durante render. 2) `videoRenderBridge.videoExportProgress` avança de 0 a 100. 3) `ActionBar` (já existente) reflete o progresso em qualquer rota. 4) Throttle: progresso é inteiro (0-100), não float — não atualiza estado se o percentual não mudou. |
| **Exceções** | Speed paint batch reporta `currentBatchIndex` separadamente (RF-003). |

#### RF-003: Speed paint batch preserva índice e progresso

| Campo | Valor |
|---|---|
| **Descrição** | O speed paint batch (múltiplas imagens) expõe `currentBatchIndex` (ex: "imagem 3 de 7") no singleton M2. Navegar para outra rota e voltar preserva o índice atual. |
| **Prioridade** | P1 |
| **Complexidade** | M |
| **Módulo** | M2, M4 |
| **Critérios de verificação** | 1) `speedPaintRenderController.currentBatchIndex` reflete a imagem atual durante batch. 2) Navegar para `/app/assistente` e voltar mantém o mesmo índice. 3) Conflito single vs batch: batch tem prioridade — inicia batch cancela single em andamento. |
| **Exceções** | N/A |

#### RF-004: `outputBlob` e `outputUrl` preservados no singleton store

| Campo | Valor |
|---|---|
| **Descrição** | O blob resultante e sua URL são armazenados no singleton Zustand (M1/M2). Ficam acessíveis via `getState()` de qualquer rota. **Não** são perdidos ao navegar entre rotas. |
| **Prioridade** | P0 |
| **Complexidade** | M |
| **Módulo** | M1, M2 |
| **Critérios de verificação** | 1) Após conclusão, `videoRenderController.getState().outputBlob` e `outputUrl` estão preenchidos. 2) Navegar para `/app/assistente` e voltar: `outputUrl` ainda é válida (não revogada). 3) Download funciona de qualquer rota. |
| **Exceções** | F5 perde o blob (RF-013). `outputUrl` é revogada em `reset()` e em `cancelRender()` (se blob incompleto). |

#### RF-005: `useEffect` cleanup removido dos hooks fachada

| Campo | Valor |
|---|---|
| **Descrição** | Os hooks `useVideoExporter` (M3) e `useSpeedPaintExporter` (M4) **não** possuem `useEffect` com cleanup que aborte o render ao desmontar. As linhas 178-186 de `useVideoExporter.tsx` e equivalentes em `useSpeedPaintExporter.tsx` são removidas. O cleanup é responsabilidade do singleton store (M1/M2). |
| **Prioridade** | P0 |
| **Complexidade** | S |
| **Módulo** | M3, M4 |
| **Critérios de verificação** | 1) `useVideoExporter.tsx` não tem `useEffect` com `return () => { abortControllerRef.current?.abort(); }`. 2) `bun run typecheck` passa. 3) Testes existentes continuam passando após mockar o controller. |
| **Exceções** | O hook mantém `useEffect` para sincronizar `codecSupport` e refs — apenas o cleanup de abort é removido. |

---

### 3.2 Notificação de Conclusão

#### RF-006: Toast de progresso e conclusão cross-route (M6 — `ExportCrossRouteToast`)

| Campo | Valor |
|---|---|
| **Descrição** | Um Snackbar MUI fixo (top-center) aparece **apenas quando** `isRendering === true` **e** o usuário não está em `/app/video` nem `/app/pintura-rapida`. Estados: **Rendering** (spinner + progresso + "Ver Vídeo" + "Cancelar"), **Completed** (ícone verde + "Vídeo pronto!" + "Ver Vídeo" + "Baixar" + "Fechar"), **Failed** (ícone vermelho + mensagem de erro + "Ver detalhes" + "Fechar"). O toast **some** automaticamente quando o usuário volta para a rota de vídeo/speed paint. |
| **Prioridade** | P0 |
| **Complexidade** | L |
| **Módulo** | M6 |
| **Critérios de verificação** | 1) Toast não aparece em `/app/video` ou `/app/pintura-rapida`. 2) Toast aparece imediatamente ao navegar para `/app/assistente` com render ativo. 3) Toast de "Completed" persiste até o usuário clicar "Fechar", "Baixar" ou "Ver Vídeo". 4) Toast de "Failed" persiste até dismiss manual. 5) Toast é Snackbar MUI sem auto-dismiss. 6) `role="alert"` e `aria-live="polite"` presentes. 7) `bun test tests/components/ExportCrossRouteToast.component.test.tsx` passa. |
| **Exceções** | Fechar o toast **não** descarta o resultado — ele permanece disponível em `/app/video`. |

---

### 3.3 Cancelamento

#### RF-007: Cancelamento do render em qualquer rota

| Campo | Valor |
|---|---|
| **Descrição** | Três pontos de cancelamento: **1)** Botão "Cancelar" no Toast cross-route (M6). **2)** Botão "Cancelar" no painel de exportação (`VideoExportPanel`/`SpeedPaintExportPanel`) em `/app/video` ou `/app/pintura-rapida`. **3)** Botão "Cancelar" no `ExportSurviveIndicator` (M7) ao retornar para a rota de vídeo. Em todos os casos, `controller.cancelRender()` é chamado, que: (a) chama `abortController.abort()`, (b) descarta o blob parcial se o render não estava completo, (c) revoga a `outputUrl`, (d) reseta `isRendering` para `false`, (e) mostra toast amarelo "Renderização cancelada" (4s, `react-hot-toast`). |
| **Prioridade** | P0 |
| **Complexidade** | M |
| **Módulo** | M1, M2, M3, M4, M6, M7 |
| **Critérios de verificação** | 1) Cancelar pelo Toast: progresso some imediatamente, toast amarelo aparece por 4s. 2) Cancelar pelo painel: mesmo comportamento. 3) Após cancelamento, `outputBlob === null`, `outputUrl === null`. 4) Voltar para `/app/video` mostra painel em idle. 5) Navegação durante cancelamento não causa erro. |
| **Exceções** | Se o render já completou (blob existe), o cancelamento **não** descarta o blob — apenas redefine `isRendering`. |

---

### 3.4 Erro de Render

#### RF-008: Erro de render notificado cross-route

| Campo | Valor |
|---|---|
| **Descrição** | Se o render falha enquanto o usuário está em outra rota: **1)** Toast vermelho persistente (M6) aparece com mensagem de erro + botão "Ver detalhes" (navega para `/app/video` com erro no painel) + "Fechar". **2)** Em `/app/video`, o painel de exportação mostra o erro + botão "Tentar novamente". **3)** O `outputBlob` permanece `null`. **4)** Evento `video_export_failed` é emitido. |
| **Prioridade** | P1 |
| **Complexidade** | M |
| **Módulo** | M1, M3, M6 |
| **Critérios de verificação** | 1) Simular falha (codec inválido): em `/app/assistente`, toast vermelho aparece. 2) Clicar "Ver detalhes" navega para `/app/video` e mostra o erro no painel. 3) Clicar "Fechar" no toast de erro descarta apenas o toast. 4) Erro é legível e acionável pelo usuário. |
| **Exceções** | Erro de crédito já coberto pelo fluxo existente — fora de escopo. |

---

### 3.5 Volta para `/app/video`

#### RF-009: Estados do painel de exportação ao retornar para `/app/video`

| Campo | Valor |
|---|---|
| **Descrição** | Ao navegar de volta para `/app/video` ou `/app/pintura-rapida`, o painel de exportação reflete o estado atual do controller singleton: **Idle** (sem render), **Rendering** (progresso contínuo), **Completed** (preview + download), **Failed** (erro + "Tentar novamente") ou **Cancelled** (idle). Um banner `ExportSurviveIndicator` (M7) aparece no topo se o render estava em andamento antes do mount da página (> 1s atrás), informando "Renderização em andamento — X%" com ações "Continuar" e "Cancelar". |
| **Prioridade** | P1 |
| **Complexidade** | M |
| **Módulo** | M7, M3, M4 |
| **Critérios de verificação** | 1) Render em andamento → painel mostra progresso contínuo (não reinicia de 0). 2) Render completo → painel mostra preview com botões "Baixar" e "Exportar novamente". 3) Render cancelado → painel em idle. 4) Banner (M7) aparece **apenas** se o render estava em andamento **antes** do mount. 5) Banner desaparece ao cancelar ou completar. |
| **Exceções** | Se o usuário inicia nova exportação com uma concluída, a anterior é descartada (RF-010). |

---

### 3.6 Múltiplas Exportações

#### RF-010: Segunda exportação cancela a primeira

| Campo | Valor |
|---|---|
| **Descrição** | O sistema permite no máximo **1 exportação ativa por vez** (por tipo: vídeo e speed paint são independentes). Ao chamar `startRender()` ou `startBatchRender()` com uma renderização já em andamento, a anterior é cancelada silenciosamente (abortada) e a nova inicia. **Não há fila.** O usuário não pode iniciar 2 exportações simultâneas do mesmo tipo. |
| **Prioridade** | P0 |
| **Complexidade** | S |
| **Módulo** | M1, M2 |
| **Critérios de verificação** | 1) Iniciar 1ª exportação, iniciar 2ª: 1ª é abortada, progresso da 2ª aparece. 2) Toast reflete a 2ª exportação. 3) `outputBlob` da 1ª é descartado (se incompleto). 4) Teste: `videoRenderController.unit.test.ts` cobre paralelismo de renders. |
| **Exceções** | Vídeo e speed paint são independentes — podem rodar simultaneamente. |

---

### 3.7 Mobile

#### RF-011: Dot indicator na Bottom Navigation

| Campo | Valor |
|---|---|
| **Descrição** | No `MobileBottomNav`, o ícone da aba "Vídeo" exibe um **pequeno ponto indicador** (badge, 4px) **apenas** no celular (`mdDown`). O dot tem 3 estados: **Render ativo** (ponto azul/ciano pulsante), **Render concluído** (ponto verde estático — até o usuário abrir a rota), **Render inativo** (sem dot). O dot reflete o estado de `videoRenderController`/`speedPaintRenderController`. |
| **Prioridade** | P1 |
| **Complexidade** | S |
| **Módulo** | M6 (ou novo componente `MobileRenderDot` dentro de `MobileBottomNav`) |
| **Critérios de verificação** | 1) Iniciar exportação em desktop: dot não aparece (fora de mobile). 2) Em mobile, iniciar exportação: dot pulsante azul aparece no ícone "Vídeo". 3) Exportação concluída: dot muda para verde estático. 4) Abrir `/app/video`: dot some. 5) `aria-label` informativo: "Renderização em andamento" / "Vídeo pronto para ver". |
| **Exceções** | Speed paint ativo também acende o dot no ícone "Vídeo" (é o mesmo indicador — resultado está na rota de vídeo). |

---

### 3.8 Indicadores Passivos

#### RF-012: `document.title` e `beforeunload` dinâmicos

| Campo | Valor |
|---|---|
| **Descrição** | `document.title` reflete o estado do render: **Render ativo** → `"🎥 Renderizando — Script Master"` (com emoji de claquete), **Render completo** → `"✅ Vídeo pronto! — Script Master"`, **Falha** → `"❌ Falha na exportação — Script Master"`, **Idle** → `"Script Master"` (título original). `beforeunload` dispara **apenas** quando `isRendering === true` em M1 ou M2, com mensagem: "Há uma renderização de vídeo em andamento. Se sair agora, perderá o progresso." Ambos gerenciados por `useCrossRouteRenderGuard` (M5). |
| **Prioridade** | P1 |
| **Complexidade** | S |
| **Módulo** | M5 |
| **Critérios de verificação** | 1) `document.title` muda para "🎥 Renderizando — Script Master" durante render. 2) `document.title` muda para "✅ Vídeo pronto! — Script Master" ao completar. 3) Fechar aba com render ativo dispara prompt do navegador. 4) `beforeunload` removido após cancelamento/conclusão. 5) Favicon não muda (mantém o padrão). |
| **Exceções** | `beforeunload` mensagem customizada pode ser substituída pelo texto padrão do navegador em alguns browsers por razões de segurança — é aceitável. |

---

### 3.9 Persistência Cross-F5

#### RF-013: Snapshot de metadados em `localStorage` (M8)

| Campo | Valor |
|---|---|
| **Descrição** | Um snapshot leve do controller é persistido em `localStorage` (chave `s2a_active_render`) com schema versionado (`SCHEMA_VERSION: 1`). Contém apenas metadados: `kind` (video/speed-paint), `startedAt`, `lastProgress`, `codec`, `container`, `status`. **Não persiste o `outputBlob`** (está em memória). O snapshot é salvo a cada atualização de progresso (debounce 1s) e limpo ao concluir/cancelar/reiniciar. Ao carregar a página, se um snapshot ativo existir, exibe banner em `/app/video`: "Renderização interrompida — reiniciar". |
| **Prioridade** | P2 |
| **Complexidade** | S |
| **Módulo** | M8 |
| **Critérios de verificação** | 1) F5 durante render: snapshot aparece em `localStorage`. 2) Ao recarregar, banner "Renderização interrompida" aparece **apenas** em `/app/video`. 3) Em outras rotas, o snapshot serve apenas para proteger `beforeunload`. 4) Após conclusão/cancelamento, snapshot é limpo. 5) Schema inválido ou corrompido é ignorado silenciosamente. |
| **Exceções** | **Não é possível retomar o render pós-F5** — o blob foi perdido. O banner é informativo, não operacional (o usuário precisa reiniciar). |

---

## 4. Requisitos Não-Funcionais (RNF)

#### RNF-001: Performance — Re-render mínimo

| Campo | Valor |
|---|---|
| **Descrição** | Componentes que consomem progresso (Toast M6, ActionBar, `ExportSurviveIndicator` M7) **não** devem re-renderizar mais que uma vez por ponto percentual (máx 100 re-renders por renderização completa). O progresso é inteiro e throttled: `lastReportedPercentRef` impede setState se o valor não mudou. |
| **Métrica/Critério** | Profiling DevTools: `ExportCrossRouteToast` renderiza no máximo 100 vezes durante uma exportação completa. `ActionBar` mantém comportamento atual. |
| **Prioridade** | P0 |
| **Módulo** | M1, M2, M6 |

#### RNF-002: Performance — Memória

| Campo | Valor |
|---|---|
| **Descrição** | `outputUrl` (blob URL) é a única referência ao blob em memória. URLs são revogadas em: `reset()`, `cancelRender()` (blob incompleto), e ao iniciar nova exportação (a URL anterior é revogada). No máximo 1 blob órfão por sessão. O heap do navegador não deve crescer mais que ~50 MB além do baseline durante uma exportação típica (720p, 30s). |
| **Métrica/Critério** | Uso de heap (Chrome DevTools Memory) antes/durante/depois da exportação: aumento máximo de 50 MB. Blob URL não vaza — contagem de `blob:` URLs no DevTools após reset igual a 0. |
| **Prioridade** | P1 |
| **Módulo** | M1, M2, M3, M4 |

#### RNF-003: Bundle size — Crescimento máximo de `main-*.js`

| Campo | Valor |
|---|---|
| **Descrição** | O bundle principal `main-*.js` (atualmente ~1,3 MB) **não** pode aumentar mais que **+10 KB gzipped** com os novos módulos (M9 tipos ~1 KB, M1 videoRenderController ~8 KB, M3 fachada ~3 KB, M5 guard ~2 KB, M6 toast ~5 KB, M8 persistência ~2 KB = ~21 KB brutos, ~7 KB gzipped). O `@remotion/web-renderer` (~2,4 MB) continua lazy-loaded via `import()` dinâmico na primeira chamada a `startRender()` — não entra no bundle principal. |
| **Métrica/Critério** | `bun run build && du -sh dist/assets/main-*.js`: diff < +10 KB gzipped vs branch main. `bun run build` (que executou lint + typecheck) não reporta erro. |
| **Prioridade** | P0 |
| **Módulo** | M1, M3, M5, M6, M8, M9 |

#### RNF-004: Acessibilidade

| Campo | Valor |
|---|---|
| **Descrição** | Todos os novos componentes de UI devem seguir diretrizes de acessibilidade: `ExportCrossRouteToast` (M6) com `role="alert"` e `aria-live="polite"` para que leitores de tela anunciem as transições de estado. Botões com `aria-label` descritivos. Dot indicator mobile (RF-011) com `aria-label` informando o estado. Foco não é automaticamente movido ao toast (evitar desorientação). |
| **Métrica/Critério** | Inspeção manual com Chrome Lighthouse > 90 em acessibilidade. Leitores de tela (NVDA/VoiceOver): transições de estado do toast são anunciadas. |
| **Prioridade** | P1 |
| **Módulo** | M6, M5 |

#### RNF-005: Internacionalização (i18n)

| Campo | Valor |
|---|---|
| **Descrição** | Todos os textos novos devem ter tradução em **pt-BR** (padrão), **en** e **es**. Um novo namespace `exportCrossRoute` será criado nos 3 locales com as seguintes chaves (19 no total): `renderingTitle`, `renderingProgress`, `renderingStatusTextPreparing`, `renderingStatusTextSpeedPaint`, `renderingStatusTextRender`, `renderingStatusTextFinalizing`, `completedTitle`, `completedDescription`, `failedTitle`, `failedDescription`, `failedHint`, `cancelledMessage`, `actionViewVideo`, `actionDownload`, `actionCancel`, `actionClose`, `actionSeeDetails`, `actionTryAgain`, `beforeUnloadMessage`, `mobileDotActive`, `mobileDotCompleted`. |
| **Métrica/Critério** | `Object.keys(exportCrossRoute).length` igual nos 3 arquivos de locale (`pt-BR.ts`, `en.ts`, `es.ts`). Nenhuma chave sem tradução. `bun run typecheck` passa com os novos tipos de namespace. |
| **Prioridade** | P0 |
| **Módulo** | M6, M5 |

#### RNF-006: Testes automatizados

| Campo | Valor |
|---|---|
| **Descrição** | Testes novos (Vitest) devem cobrir os seguintes cenários mínimos, além de manter todos os testes existentes verdes: |
| **Cobertura mínima** | **1)** `videoRenderController.unit.test.ts`: 5+ casos (inicial, startRender mockado, cancelRender preserva blob completo, reset limpa URL, paralelismo de 2 renders). **2)** `speedPaintRenderController.unit.test.ts`: 3+ casos (batch não aborta, currentBatchIndex preservado, conflito batch vs single). **3)** `ExportCrossRouteToast.component.test.tsx`: 3+ casos (aparece em outra rota, não aparece em `/app/video`, estados rendering/completed/failed). **4)** `useCrossRouteRenderGuard.unit.test.ts`: 3+ casos (beforeunload registrado com render ativo, removido sem render, mensagem customizada presente). **5)** `ExportSurviveIndicator.component.test.tsx`: 2+ casos (banner aparece ao montar com render em andamento > 1s, não aparece sem render). **6)** `cross-route-persistence.unit.test.ts`: 3+ casos (save/load/clear, schema versionado, JSON inválido). |
| **Métrica/Critério** | `bun test` executa todos os testes (147+ existentes + novos) sem falhas. `bun test --coverage` para novos arquivos: > 80% de cobertura de linhas. |
| **Prioridade** | P1 |
| **Módulo** | M1, M2, M5, M6, M7, M8 |

#### RNF-007: Telemetria e Analytics

| Campo | Valor |
|---|---|
| **Descrição** | Eventos de analytics já existentes (`video_export_started`, `_completed`, `_cancelled`, `_failed`) são mantidos nos hooks fachada (M3/M4). **NOVO**: evento `video_export_completed_offroute` deve ser emitido **quando** a exportação completa enquanto o usuário está fora de `/app/video` e `/app/pintura-rapida`. O parâmetro `source` indica a rota onde o usuário estava (ex: `"/app/assistente"`). |
| **Métrica/Critério** | `trackAnalyticsEvent('video_export_completed_offroute', { source: '/app/assistente', quality, codec })` é chamado exatamente 1 vez por conclusão off-route. Verificar no console do Analytics DebugView. |
| **Prioridade** | P2 |
| **Módulo** | M1, M5, M6 |
| **Chaves novas** | `AnalyticsEventMap` ganha `video_export_completed_offroute: ExportParams & { source: string }` |

---

## 5. Restrições

| # | Restrição | Origem |
|---|---|---|
| R1 | `@remotion/web-renderer` continua lazy-loaded via `import()` dinâmico. O bundle principal não importa Remotion. | Handoff + RNF-003 |
| R2 | Nenhuma nova dependência `@remotion/*`, lib de estado ou lib de UI. | Plano base §2 |
| R3 | Contrato público `VideoExporter` e `SpeedPaintExporter` permanecem idênticos. | Plano base §3 (M3, M4) |
| R4 | `outputTarget: 'web-fs'` está fora de escopo. | Handoff (não-objetivo) |
| R5 | Mover render para Cloud Functions está fora de escopo. | Handoff (não-objetivo) |
| R6 | Background Sync / Service Worker está fora de escopo. | Handoff (não-objetivo) |
| R7 | `useTranscription` (Whisper WASM) está fora de escopo — PR separado. | Plano base §2 |
| R8 | COEP permanece ativo em `/app/**`. O `SharedArrayBuffer` não deve ser afetado. | AGENTS.md |
| R9 | Sem `any` em TypeScript — `tsc -b` strict mode. | Stack principal |

---

## 6. Essencial vs Opcional

### Essencial (P0 — bloqueia o objetivo central)

| RF | Nome | Depende de |
|---|---|---|
| RF-001 | Renderização sobrevive à navegação | M1, M2, M3, M4 |
| RF-002 | Progresso atualizado em tempo real | M1, M2 |
| RF-004 | outputBlob preservado no singleton | M1, M2 |
| RF-005 | useEffect cleanup removido | M3, M4 |
| RF-006 | Toast cross-route (M6) | M1, M2, M6 |
| RF-007 | Cancelamento em qualquer rota | M1, M2, M3, M4, M6, M7 |
| RF-010 | 2ª exportação cancela 1ª | M1, M2 |
| RF-012 | `document.title` e `beforeunload` | M5 |

### Opcional (P1/P2 — pode ser PR separado)

| RF | Nome | Justificativa |
|---|---|---|
| RF-003 | Speed paint batch preserva índice | Speed paint é menos usado que vídeo; M2 pode vir em PR2 |
| RF-008 | Erro notificado cross-route | P1 — importante mas aceita delay |
| RF-009 | Painel ao retornar + banner M7 | P1 — UX refinada, não essencial |
| RF-011 | Dot indicator mobile | P1 — mobile enhancement |
| RF-013 | Snapshot localStorage (M8) | P2 — F5 é raro durante render |

---

## 7. Tabela de Cobertura RF × Módulo (Base Plan)

| Módulo | RF-001 | RF-002 | RF-003 | RF-004 | RF-005 | RF-006 | RF-007 | RF-008 | RF-009 | RF-010 | RF-011 | RF-012 | RF-013 |
|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|
| M1 (videoRenderController) | ✅ | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | — | — | ✅ |
| M2 (speedPaintRenderController) | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | — | ✅ | — | — | ✅ |
| M3 (useVideoExporter refactor) | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | — | — | — | — |
| M4 (useSpeedPaintExporter refactor) | ✅ | — | ✅ | — | ✅ | — | ✅ | — | ✅ | — | — | — | — |
| M5 (useCrossRouteRenderGuard) | — | — | — | — | — | — | — | — | — | — | — | ✅ | — |
| M6 (ExportCrossRouteToast) | — | — | — | — | — | ✅ | ✅ | ✅ | — | — | ✅ | — | — |
| M7 (ExportSurviveIndicator) | — | — | — | — | — | — | ✅ | — | ✅ | — | — | — | — |
| M8 (cross-route-persistence) | — | — | — | — | — | — | — | — | — | — | — | — | ✅ |
| M9 (types) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Observação:** O módulo M9 (types) é base para todos os outros — marcado como ✅ por fornecer contratos que todos consomem.

---

## 8. Tabela de Cobertura RNF × Módulo

| Módulo | RNF-001 Perf | RNF-002 Memória | RNF-003 Bundle | RNF-004 Acessib. | RNF-005 i18n | RNF-006 Testes | RNF-007 Analytics |
|--------|--------------|-----------------|----------------|-------------------|--------------|----------------|-------------------|
| M1 | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| M2 | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| M3 | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| M4 | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| M5 | — | — | ✅ | — | ✅ | ✅ | ✅ |
| M6 | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| M7 | — | — | — | — | — | ✅ | — |
| M8 | — | — | ✅ | — | — | ✅ | — |
| M9 | — | — | ✅ | — | — | — | — |

---

## 9. Pendências para o Usuário Decidir

### P5 (do product spec): Speed paint no mesmo PR ou separado?

**Contexto:** O base plan recomenda PR separado (D4.b): PR1 = M1, M3, M5, M6 (vídeo apenas); PR2 = M2, M4, M7, M8 (speed paint + persistência). A arquitetura é a mesma, apenas espelhada.

**Decisão necessária:** Speed paint entra no mesmo PR ou em PR separado?

**Impacto:**
- **Mesmo PR:** ~6-8h adicionais, consistência arquitetural garantida, entrega única.
- **PR separado:** PR1 foca em 4 módulos (P0/P1), entrega mais rápida do core. PR2 herda padrão comprovado. Menos risco de regressão.

### P9 (do product spec): Banner pós-F5 — todas as rotas ou só /app/video?

**Recomendação técnica:** Banner post-F5 aparece **apenas** em `/app/video`. Em outras rotas, o snapshot serve apenas para proteger `beforeunload` (não mostra toast/banner). A razão: o usuário não pode fazer nada em outra rota — só em `/app/video` ele pode reiniciar.

**Decisão necessária:** Confirmar que banner pós-F5 aparece **só em `/app/video`**?

### Persistência cross-F5: toast "quer retomar?" está dentro ou fora?

**Contexto:** Handoff pergunta se vale a pena persistir estado mínimo só para mostrar toast "Renderização interrompida — quer retomar?" pós-F5.

**Análise técnica:** Retomar é **impossível** tecnicamente porque:
1. O `outputBlob` não sobrevive a F5 (está em memória RAM).
2. O `renderMediaOnWeb` não suporta checkpoint/retomada (AbortSignal destrutivo, confirmação no NotebookLM Remotion 4.0.448).
3. `outputTarget: 'web-fs'` (OPFS) é experimental e fora de escopo.
4. M8 (snapshot localStorage) persiste apenas metadados, não o blob.

**Decisão necessária:** Confirmar que o banner pós-F5 (RF-013) é **informativo** ("Renderização interrompida — reiniciar"), não operacional. O toast "quer retomar?" **não** será implementado porque é tecnicamente inviável.

### Dot indicator: apenas no ícone "Vídeo" ou também no "Speed Paint"?

**Recomendação:** Apenas no ícone "Vídeo", pois tanto vídeo quanto speed paint produzem vídeo. Um dot extra para speed paint poluiria a interface (são 5 abas apenas).

**Decisão necessária:** Confirmar dot **apenas** no ícone "Vídeo"?

---

## 10. Critérios de Aceite de Alto Nível (Resumo)

| RF | Resumo (1 linha) |
|----|------------------|
| RF-001 | Render não morre ao navegar — o blob sobrevive. |
| RF-002 | Progresso visível em tempo real em qualquer rota (via Toast + ActionBar). |
| RF-004 | `outputBlob` e `outputUrl` disponíveis em qualquer rota até reset/cancel. |
| RF-005 | Hooks fachada não abortam ao desmontar — removido o `useEffect` cleanup. |
| RF-006 | Toast Snackbar cross-route com 3 estados: rendering / completed / failed. |
| RF-007 | Cancelamento possível no Toast, no painel e no banner de retorno. |
| RF-008 | Erro mostrado em Toast vermelho persistente + painel com "Tentar novamente". |
| RF-009 | Painel `/app/video` reflete estado correto ao retornar (idle/rendering/completed/failed). |
| RF-010 | 2ª exportação cancela a 1ª — sem fila, 1 ativo por vez. |
| RF-011 | Dot indicador pulsante no ícone "Vídeo" da Bottom Nav mobile. |
| RF-012 | `document.title` muda conforme estado; `beforeunload` protege contra fechamento acidental. |
| RF-013 | Snapshot localStorage de metadados sobrevive a F5 (mas blob não). Banner informativo em `/app/video`. |

---

## 11. Resumo de Entregáveis

| Módulo | Prioridade | Agente | Est. tamanho | Depende de |
|--------|-----------|--------|-------------|------------|
| M9 (types) | P0 | frontend-engineer | ~40 linhas | — |
| M1 (videoRenderController) | P0 | frontend-engineer | ~250 linhas | M9 |
| M3 (useVideoExporter refactor) | P0 | frontend-engineer | ~150 linhas (−370) | M1, M9 |
| M5 (useCrossRouteRenderGuard) | P1 | frontend-engineer | ~80 linhas | M1, M2 |
| M6 (ExportCrossRouteToast) | P1 | frontend-engineer | ~120 linhas | M1, M2 |
| M2 (speedPaintRenderController) | P1 | frontend-engineer | ~250 linhas | M9 |
| M4 (useSpeedPaintExporter refactor) | P1 | frontend-engineer | ~200 linhas (−514) | M2, M9 |
| M7 (ExportSurviveIndicator) | P2 | frontend-engineer | ~80 linhas | M1, M2, M9 |
| M8 (cross-route-persistence) | P2 | frontend-engineer | ~80 linhas | M9 |

---

## 12. Próximo Passo

1. **Usuário:** Responder às pendências da §9 (P5, P9, toast retomar, dot indicator).
2. **Gap-finder:** Auditar o plano contra código real (especialmente `VideoPage.tsx`, `ToastProvider.tsx`, `SpeedPaintPage.tsx`).
3. **Architecture:** Detalhar M1 e M2 (assinaturas, slices, interface de `RenderControllerState`). Gerar diagrama de sequência do fluxo `startRender → navigate → return → complete`.
4. **Frontend-engineer:** Executar PR1 (M9 → M1 → M3 → M5 → M6) após sign-off.

---

**Handoff criado em:** 2026-06-02
**Total de RFs:** 13 (P0: 8, P1: 4, P2: 1)
**Total de RNFs:** 7 (P0: 3, P1: 3, P2: 1)
**Pendências:** 4 (P5, P9, toast retomar, dot indicator — ver §9)
