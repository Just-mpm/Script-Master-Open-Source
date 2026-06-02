# Plano Base — `video-render-survive-navigation`

> Renderização de vídeo (e speed paint) precisa sobreviver à navegação entre rotas. Hoje o `useEffect` cleanup do `useVideoExporter`/`useSpeedPaintExporter` aborta o `renderMediaOnWeb()` e o blob é perdido. O plano migra o ciclo de vida da renderização para **singleton stores Zustand** (escopo de aplicação), mantém os hooks atuais como **fachadas finas** com o mesmo contrato público, e adiciona **listeners globais + UI cross-route** em `App.tsx`.

**Slug:** `video-render-survive-navigation`
**Versão do projeto:** 0.122.0
**Status:** plano base (sem código) — pronto para o `gap-finder` e o `architecture`.

---

## 1. Objetivo

Fazer com que uma renderização de vídeo iniciada em `/app/video` (ou speed paint em `/app/pintura-rapida`) **continue executando** enquanto o usuário navega para qualquer outra rota da SPA, e a **UI apropriada** (toast/indicador) o avise disso, com:

- ✅ `outputBlob` e `outputUrl` preservados (download disponível em qualquer rota)
- ✅ Progresso atualizado em tempo real para `ActionBar` e `ToastManager` (que já consomem o `videoRenderBridge`)
- ✅ Cancelamento explícito funcionando em qualquer rota (botão no toast)
- ✅ `beforeunload` avisando se o usuário tentar fechar a aba
- ✅ Screen lock / aba em background **não** aborta (WebCodecs roda via hardware)

**Fora deste plano (deliberado, ver §2):**
- ❌ Mover render para Cloud Functions / FFmpeg
- ❌ Background Sync API / Service Worker retomando render
- ❌ Trocar Zustand por outra lib
- ❌ Alterar contrato `VideoExporter` / `SpeedPaintExporter` / `VideoExportOptions` / `SpeedPaintExportOptions`
- ❌ `outputTarget: 'web-fs'` (OPFS) — trade-off para plano futuro de médio prazo
- ❌ Novas dependências `@remotion/*`, libs de estado ou de UI

---

## 2. Premissas e Fora de Escopo

### Premissas validadas (com fontes)

| Premissa | Fonte | Implicação |
|---|---|---|
| `renderMediaOnWeb` 4.0.448: `AbortSignal` é destrutivo. Sem pause/resume/checkpoint. `outputBlob` é perdido se o signal for abortado antes do `result.getBlob()` resolver. | NotebookLM — Remotion Docs (2026-04) | A única forma de sobreviver à navegação é **mover a Promise para fora do ciclo de vida do componente** (singleton store). |
| `outputTarget: 'web-fs'` existe conceitualmente no `@remotion/webcodecs` (`webFsWriter`) mas **não há documentação** específica para `renderMediaOnWeb` (alpha). Não há garantia de checkpoint, OPFS ou persistência cross-unload. | NotebookLM — Remotion Docs | Não usar como base deste plano. Já é não-objetivo do handoff. |
| React 19: para trabalho de longa duração que deve sobreviver a unmount, mover ciclo de vida para **módulo externo** ou **singleton store**. `useSyncExternalStore` é o padrão para leitura reativa de store externa. | NotebookLM — React Docs | Controller em Zustand singleton + `useSyncExternalStore`-equivalente (`useStore` com `useShallow`) na fachada. |
| Zustand 5: `create<T>()(...)` é a sintaxe obrigatória. `useShallow` é mandatório para seletores que retornam objetos/arrays (identity issue → loop infinito). `getState()` para acesso imperativo. | NotebookLM — Zustand Docs | Replicar o padrão já usado em `videoRenderBridge.ts` e `useStudioStore`. |
| `useCodecSupport` (hook de detecção de codec) **não tem AbortController que aborta render**. Só guarda estado de `canRender`, `resolvedVideoCodec`, `resolvedContainer`, `resolvedAudioCodec`. Pode permanecer como hook com state local sem mudanças. | Leitura direta de `useCodecSupport.ts` | Esse hook **não precisa** migrar para singleton. |
| `videoRenderBridge.ts` **já** propaga `isExportingVideo` + `videoExportProgress` para `ActionBar` (via `useAudioGenerationHandler`) e `ToastManager` (via `App.tsx`). A reatividade cross-route está **pronta**; só falta a fonte não ser abortada. | Leitura de `videoRenderBridge.ts`, `ActionBar.tsx`, `App.tsx`, `AudioGenerationHandler.tsx` | O novo controller **escreve** nesse bridge (ou o absorve — ver decisão D1). |
| Padrão de `beforeunload` durante operação longa: `AudioGenerationHandler.tsx:163-173` já implementa para `isGenerating \|\| isExportingVideo`. | Leitura direta | Mover o listener para `App.tsx` (visão global), ler do controller. |
| Padrão de `visibilitychange`/`focus`: `ProtectedRoute.tsx:84-97` implementa polling + listener. | Leitura direta | Reutilizar padrão para re-hidratar progresso do controller quando o usuário volta de aba em background. |
| `VideoExportPanel.tsx` consome `VideoExporter` **via props** (passado pelo `VideoPage` pai). O type `VideoExporter` é o **contrato** que precisa permanecer. | Leitura de `VideoExportPanel.tsx:18, 68` | A fachada deve exportar `VideoExporter` com a mesma forma. |
| `useTranscription.ts` (Whisper WASM) tem o **mesmo problema** mas com dependência muito maior (`@remotion/whisper-web` ~XX MB) e trade-offs próprios (modelo de 39 MB). | Leitura de `useTranscription.ts` | **Fora do escopo** deste PR. Listado como follow-up em §7. |

### Fora de escopo explícito

- **Backend / Lambda** — não é viável agora (custo, dependência externa, time-to-market). Trade-off: persistência após F5 fica perdida (ver risco R4).
- **Service Worker retomando render** — mover Remotion para SW é inviável (precisa de DOM, WebCodecs, mediabunny).
- **`outputTarget: 'web-fs'`** — trade-off para plano de médio prazo, requer validação experimental.
- **`useTranscription` (Whisper)** — mesmo padrão, mas modelo pesado + cache próprio. PR separado após este.
- **Persistência do `outputBlob` em IndexedDB/OPFS** — não sobreviver a F5 nesta entrega. Documentado em R4.

---

## 3. Módulos

> 9 módulos. Cada um com **responsabilidade única** (SRP). Tabela: `Módulo | Escopo | Arquivos | Agent executor sugerido`.

### M1 — `videoRenderController` (NOVO, store Zustand singleton)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Abrigar o ciclo de vida da renderização de **vídeo completo** (com áudio): `AbortController`, `outputBlob`, `outputUrl`, `isRendering`, `renderProgress`, `renderStatusText`, `error`, `saveWarning`, `speedPaintWarnings`, `resolvedVideoCodec`, `resolvedContainer`, `lastOptions`, `startedAt`. Expõe ações: `startRender`, `cancelRender`, `reset`, `subscribe`, `getState`. |
| **Arquivos** | **NOVO:** `src/features/video-render/store/videoRenderController.ts` |
| **Testes** | **NOVO:** `tests/video-render/videoRenderController.unit.test.ts` (singleton: paralelismo de render, abort preserva estado intermediário, cancel preserva `outputBlob` se já completo, reset limpa blob URL) |
| **Agent executor** | `frontend-engineer` (Zustand 5 + singleton pattern) |
| **Depende de** | M9 (tipos) |
| **Consumidores** | M3, M5, M6, M7, `videoRenderBridge` (escrita em `isExportingVideo`/`videoExportProgress`) |

### M2 — `speedPaintRenderController` (NOVO, store Zustand singleton)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Espelha M1 para speed paint: `AbortController` único (compartilhado entre `startRender` e `startBatchRender`), `outputBlob`, `outputUrl`, `isRendering`, `renderProgress`, `renderStatusText`, `error`, `wasCancelled`, `resolvedVideoCodec`, `resolvedContainer`, `lastBatchOptions`, `currentBatchIndex`, `startedAt`. |
| **Arquivos** | **NOVO:** `src/features/speed-paint/store/speedPaintRenderController.ts` |
| **Testes** | **NOVO:** `tests/speed-paint/speedPaintRenderController.unit.test.ts` (batch não aborta ao navegar, currentBatchIndex preservado, conflito batch vs single resolve com cancel) |
| **Agent executor** | `frontend-engineer` |
| **Depende de** | M9 (tipos) |
| **Consumidores** | M4, M5, M6, M7 |

### M3 — `useVideoExporter` (REFATORADO, fachada fina ~80 linhas)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Fachada que consome M1 via `useStore` + `useShallow`. Preserva o **contrato público** (`VideoExporter` type, `VideoExportOptions`). Mantém `useCodecSupport` (que é state-local). Expõe `startRender`, `handleCancel`, `handleDownload`, `reset`, `dismissSaveWarning`, `checkSupport`, `supportsHtmlInCanvas`. **Remove** o `useEffect` cleanup que aborta (linhas 178-186 do original). |
| **Arquivos** | **EDIT:** `src/features/video-render/hooks/useVideoExporter.tsx` (523 → ~150 linhas: 80 fachada + imports + reexports) |
| **Testes** | **MANTÉM** (após mockar o controller): `tests/video-render/useVideoExporter-speedpaint.unit.test.tsx` (ajustar imports do mock) |
| **Agent executor** | `frontend-engineer` |
| **Depende de** | M1, M9 |
| **Consumidores** | `VideoPage.tsx`, `VideoExportPanel.tsx` (via prop) |

### M4 — `useSpeedPaintExporter` (REFATORADO, fachada fina ~120 linhas)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Espelha M3 para speed paint. Fachada de M2. Preserva `SpeedPaintExporter` type, `SpeedPaintExportOptions`, `SpeedPaintBatchExportOptions`. Mantém `useCodecSupport({ muted: true })`. Expõe `startRender`, `startBatchRender`, `handleCancel`, `handleDownload`, `reset`, `checkSupport`, `supportsHtmlInCanvas`. **Remove** o `useEffect` cleanup. |
| **Arquivos** | **EDIT:** `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` (714 → ~200 linhas) |
| **Testes** | **MANTÉM:** `tests/speed-paint/useSpeedPaintExporter.unit.test.tsx` (ajustar mock) |
| **Agent executor** | `frontend-engineer` |
| **Depende de** | M2, M9 |
| **Consumidores** | `SpeedPaintPage.tsx`, `SpeedPaintExportPanel.tsx`, `BatchOrchestrator.tsx` |

### M5 — `useCrossRouteRenderGuard` (NOVO, hook utilitário)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Centraliza os listeners **globais** (`beforeunload`, `visibilitychange`, `focus`) que protegem contra fechamento de aba e abas em background. Lê de M1 e M2 (não dos hooks). Ativado em `App.tsx` (escopo raiz). **Substitui** o equivalente inline em `AudioGenerationHandler.tsx:163-173` (generaliza para vídeo + speed paint). |
| **Arquivos** | **NOVO:** `src/features/video-render/hooks/useCrossRouteRenderGuard.ts` (também usado por speed-paint — ou `src/hooks/useCrossRouteRenderGuard.ts` se preferir fora das features) |
| **Testes** | **NOVO:** `tests/lib/useCrossRouteRenderGuard.unit.test.ts` (mockar `addEventListener`, validar disparo por render ativo) |
| **Agent executor** | `frontend-engineer` |
| **Depende de** | M1, M2 |
| **Consumidores** | `App.tsx` (chamado uma vez) |

### M6 — `ExportCrossRouteToast` (NOVO, componente ~120 linhas)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Componente que renderiza um Snackbar/Dialog MUI quando há export em andamento **e o usuário está em uma rota diferente** de `/app/video` ou `/app/pintura-rapida`. Mostra progresso, botão "Voltar para o vídeo" e botão "Cancelar". Posicionado em `App.tsx` (sempre montado). |
| **Arquivos** | **NOVO:** `src/components/app/ExportCrossRouteToast.tsx` |
| **Testes** | **NOVO:** `tests/components/ExportCrossRouteToast.component.test.tsx` (aparece em `/app/assistente` durante export, não aparece em `/app/video`) |
| **Agent executor** | `frontend-engineer` |
| **Depende de** | M1, M2, M3, M4 |
| **Consumidores** | `App.tsx` (substitui/convive com `ToastManager`) |

### M7 — `ExportSurviveIndicator` (NOVO, componente ~80 linhas)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Banner/Alert no topo de `VideoPage` e `SpeedPaintPage` quando o componente remonta e o controller já tem `isRendering=true`. Mostra "Renderização em andamento — X% (iniciada há Y minutos)". Oferece ações: continuar, baixar parcial, cancelar. |
| **Arquivos** | **NOVO:** `src/features/video-render/components/ExportSurviveIndicator.tsx` (e variante `SpeedPaintExportSurviveIndicator.tsx` ou componente unificado com prop `kind`) |
| **Testes** | **NOVO:** `tests/video-render/ExportSurviveIndicator.component.test.tsx` |
| **Agent executor** | `frontend-engineer` |
| **Depende de** | M1, M2, M9 |
| **Consumidores** | `VideoPage.tsx`, `SpeedPaintPage.tsx` |

### M8 — `lib/cross-route-persistence` (NOVO, utilitário ~80 linhas)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Persistência leve do **snapshot do controller** em `localStorage` (chave `s2a_active_render`) para sobreviver a **F5/reload** e a múltiplas abas. NÃO persiste o `outputBlob` (em memória). Schema versionado: `{ kind, startedAt, lastProgress, codec, container, status }`. API: `saveActiveRender(snapshot)`, `loadActiveRender()`, `clearActiveRender()`. |
| **Arquivos** | **NOVO:** `src/lib/cross-route-persistence.ts` |
| **Testes** | **NOVO:** `tests/lib/cross-route-persistence.unit.test.ts` (save/load/clear, schema migration, JSON inválido) |
| **Agent executor** | `frontend-engineer` |
| **Depende de** | M9 |
| **Consumidores** | M1, M2, M5 (hidrata `beforeunload` apenas se persistência diz "ativo") |

### M9 — `renderController.types` (NOVO, types ~40 linhas)
| Campo | Valor |
|---|---|
| **Responsabilidade** | Tipos compartilhados entre M1, M2, M8: `RenderKind` (`'video' \| 'speed-paint-single' \| 'speed-paint-batch'`), `RenderStatus` (`'idle' \| 'preparing' \| 'rendering' \| 'completed' \| 'cancelled' \| 'failed'`), `RenderPhase` (`'speed-paint' \| 'composition' \| 'finalizing'`), `RenderSnapshot`, `RenderControllerState` (campos públicos read-only). |
| **Arquivos** | **NOVO:** `src/features/video-render/types/renderController.ts` |
| **Testes** | N/A (apenas tipos) |
| **Agent executor** | `frontend-engineer` |
| **Depende de** | — |
| **Consumidores** | M1, M2, M8, M7 |

---

## 4. Grafo de Dependências

```
                    M9 (types)
                   /    |    \
                  ↓     ↓     ↓
                M1     M2     M8
              (video) (sp)   (persist)
                │  \   │  \   /
                │   \  │   \ /
                │    \ │    X
                ↓     ↓↓    ↓
                M3    M4   M5 (guard)
                │     │    │
                ↓     ↓    ↓
              M6 (toast) M7 (indicator)

M1/M2 → videoRenderBridge (escrita em isExportingVideo/progress)
M3 → VideoPage → VideoExportPanel (consumidor final)
M4 → SpeedPaintPage → SpeedPaintExportPanel/BatchOrchestrator
M5/M6 → App.tsx (montagem única)
M7 → VideoPage, SpeedPaintPage (montagem condicional)
```

**Tabela de dependências explícitas** (quem importa quem):

| Módulo | Importa | Importado por |
|---|---|---|
| M9 | — | M1, M2, M7, M8 |
| M1 | M9 | M3, M5, M6, M7, M8, `videoRenderBridge` |
| M2 | M9 | M4, M5, M6, M7, M8 |
| M3 | M1, M9 | `VideoPage`, `VideoExportPanel` |
| M4 | M2, M9 | `SpeedPaintPage`, `SpeedPaintExportPanel`, `BatchOrchestrator` |
| M5 | M1, M2 | `App.tsx` |
| M6 | M1, M2, M3, M4 (somente para tipos de opções) | `App.tsx` |
| M7 | M1, M2, M9 | `VideoPage`, `SpeedPaintPage` |
| M8 | M9 | M1, M2, M5 |

**Sem ciclos.** M9 é a folha (zero deps). M1, M2, M8 são "núcleo". M3–M7 são "periferia".

---

## 5. Prioridade

| Módulo | Prioridade | Justificativa |
|---|---|---|
| M9 | **P0** | Tipos base. Sem ele, nada compila. |
| M1 | **P0** | Núcleo do fix. O `useVideoExporter` continua sendo o caminho quente (mais usado que speed paint). |
| M3 | **P0** | Sem a fachada, M1 não tem consumidor dentro do `VideoPage` (sem quebrar contrato). |
| M5 | **P1** | Necessário **antes** de testar navegação (para `beforeunload` não vazar abort). Pode ser paridade com o inline atual de `AudioGenerationHandler`. |
| M6 | **P1** | Necessário para o usuário ver o progresso em outras rotas (parte do objetivo). |
| M2 | **P1** | Espelha M1 mas com escopo de speed paint. Pode vir **depois** de M1, ou em paralelo. |
| M4 | **P1** | Espelha M3. |
| M7 | **P2** | Banner que aparece ao voltar. Pode entrar em PR subsequente se o tempo apertar. |
| M8 | **P2** | Persistência cross-F5. Útil mas não crítico para o objetivo central (sobreviver a navegação). **Risco R4** se não entrar. |

**Recomendação:** M9 + M1 + M3 + M5 + M6 em um PR; M2 + M4 + M7 + M8 em PR seguinte (segue mesma arquitetura, mas é trabalho novo).

**Decisão D6 (ver §8):** product decide se speed paint entra no mesmo PR ou não.

---

## 6. Ordem Recomendada

Cada passo tem um **critério de "pronto"** (testável) para o time parar de implementar e seguir.

### Passo 1 — M9: Tipos compartilhados
**Agente:** `frontend-engineer` • **Estimativa:** ~30 min • **PR:** 1º commit isolado
- [ ] `RenderKind`, `RenderStatus`, `RenderPhase`, `RenderSnapshot`, `RenderControllerState` exportados
- [ ] Tipos cobertos por `tsc -b` (sem `any`)

**Pronto quando:** `bun run typecheck` passa; tipos usados em `M1` e `M2` sem `// @ts-expect-error`.

### Passo 2 — M1: `videoRenderController` (singleton)
**Agente:** `frontend-engineer` • **Estimativa:** ~4h • **PR:** 2º commit (ou 1º se M9 mergeado antes)
- [ ] Store com `create<VideoRenderControllerState>()((set, get) => ({...}))`
- [ ] `startRender(options)`: cria `AbortController` em escopo de **módulo** (não de componente), chama `renderMediaOnWeb`, atualiza store via `set` (NÃO via setState de hook)
- [ ] `cancelRender()`: chama `abortController.abort()`, **mas só limpa o blob se o render ainda não estava completo**
- [ ] `reset()`: revoga `outputUrl`, limpa refs
- [ ] Seletores usam valor primitivo (evitar objetos sem `useShallow`)
- [ ] Throttle de progresso: inteiros 0-100, não float

**Pronto quando:** `bun test tests/video-render/videoRenderController.unit.test.ts` passa com ≥ 5 casos (inicial, startRender mockado, cancelRender preserva blob já pronto, reset limpa URL, paralelismo de 2 renders).

### Passo 3 — M3: Fachada `useVideoExporter` refatorada
**Agente:** `frontend-engineer` • **Estimativa:** ~3h
- [ ] Hook consome `videoRenderController` via `useStore` com `useShallow` para slices
- [ ] **NÃO** tem `useEffect` cleanup que aborta (linhas 178-186 do original removidas)
- [ ] Preserva type export `VideoExporter = ReturnType<typeof useVideoExporter>`
- [ ] Preserva interface `VideoExportOptions`
- [ ] `useCodecSupport` permanece como hook local
- [ ] `VideoExportPanel` renderiza idêntico (sem mudar props)

**Pronto quando:** `bun test tests/video-render/` passa; `bun run typecheck` passa; teste manual em `/app/video` mostra que ir para `/app/assistente` e voltar **NÃO** aborta o render (verificar `outputBlob` preservado no DevTools Zustand).

### Passo 4 — M5: `useCrossRouteRenderGuard`
**Agente:** `frontend-engineer` • **Estimativa:** ~1h
- [ ] Hook com assinatura `useCrossRouteRenderGuard(): void`
- [ ] `useEffect` único: registra `beforeunload` se `M1.isRendering || M2.isRendering`
- [ ] `useEffect` único: registra `visibilitychange` + `focus` (re-hidrata `lastUpdated` em M1/M2)
- [ ] Limpa listeners no cleanup
- [ ] **Substitui** o equivalente inline em `AudioGenerationHandler.tsx:163-173` (após migration)

**Pronto quando:** `bun test tests/lib/useCrossRouteRenderGuard.unit.test.ts` passa; tentar fechar aba com render ativo mostra prompt nativo do browser.

### Passo 5 — M6: `ExportCrossRouteToast`
**Agente:** `frontend-engineer` • **Estimativa:** ~2h
- [ ] Componente lê `M1.isRendering` + `M1.renderProgress` + `M1.renderStatusText` via seletores Zustand
- [ ] Renderiza Snackbar MUI fixo (top-center) em `App.tsx`
- [ ] Mostra: ícone, "Renderizando vídeo", `progress%`, `statusText`, botão "Voltar" (navega para `/app/video`), botão "Cancelar" (chama `M1.cancelRender`)
- [ ] Esconde quando `!isRendering` ou `pathname === '/app/video' || '/app/pintura-rapida'`
- [ ] Internacionalização (chaves novas: `exportCrossRoute.title`, `backToVideo`, `cancel` — pode reusar `common.cancel`)

**Pronto quando:** teste manual: iniciar render em `/app/video`, navegar para `/app/assistente`, ver toast com progresso subindo, clicar "Voltar" retorna para `/app/video` com render em andamento, clicar "Cancelar" aborta.

### Passo 6 — M2: `speedPaintRenderController` (singleton)
**Agente:** `frontend-engineer` • **Estimativa:** ~3h
- [ ] Espelha M1 com tipos de speed paint
- [ ] `startRender` e `startBatchRender` compartilham o mesmo `AbortController` (abortar um cancela o outro)
- [ ] `currentBatchIndex` exposto para "renderizando imagem 3 de 7"
- [ ] Conflito single vs batch: batch tem prioridade (cancela single em andamento)

**Pronto quando:** testes unitários do controller passam; teste manual em `/app/pintura-rapida` mostra que ir para `/app/estudio` e voltar **NÃO** aborta o render.

### Passo 7 — M4: Fachada `useSpeedPaintExporter` refatorada
**Agente:** `frontend-engineer` • **Estimativa:** ~2h
- [ ] Espelha M3 para speed paint
- [ ] `useCodecSupport({ muted: true })` mantido
- [ ] Preserva `SpeedPaintExporter` type, `SpeedPaintExportOptions`, `SpeedPaintBatchExportOptions`
- [ ] `startBatchRender` delega para `M2.startBatchRender`
- [ ] `SpeedPaintPage` e `SpeedPaintExportPanel` funcionam idênticos

**Pronto quando:** `bun test tests/speed-paint/` passa; teste manual: iniciar batch em speed paint, navegar, voltar, ver `currentBatchIndex` preservado.

### Passo 8 — M7: `ExportSurviveIndicator` + M8: Persistência
**Agente:** `frontend-engineer` • **Estimativa:** M7 ~1.5h, M8 ~1h
- [ ] M7: Banner no topo de `VideoPage`/`SpeedPaintPage` quando `M1.isRendering && lastStartedAt < Date.now() - 1000` (i.e., render estava em andamento antes do mount)
- [ ] M8: `saveActiveRender` chamado em cada `set` de M1/M2 (debounce 1s); `loadActiveRender` no `App.tsx` init; `clearActiveRender` em `reset`/`cancelRender`/conclusão
- [ ] M8: schema versionado com `SCHEMA_VERSION: 1`
- [ ] M8: NÃO persiste `outputBlob` (apenas metadados)

**Pronto quando:** teste manual: F5 durante render mostra toast/indicator "renderização em andamento" (mas sem outputBlob — documentado em R4); após conclusão, M8 limpa o snapshot.

---

## 7. Riscos Iniciais (sem mitigação aprofundada — papel do `gap-finder`)

### R1 — `useEffect` cleanup roda mesmo com `beforeunload` (recarregamento de página)
**Descrição:** o `useEffect` do `VideoPage`/`SpeedPaintPage` ainda dispara o cleanup ao desmontar, mesmo se o usuário der F5. O novo controller (M1/M2) **não tem** esse problema (não está em `useEffect`), mas o `useVideoExporter`/`useSpeedPaintExporter` refatorados podem ter cleanup **legado** que ainda chama `abortControllerRef.current?.abort()` em cleanup.
**Magnitude:** Média. Não quebra o objetivo central (M1/M2 não são afetados), mas pode gerar cancelamentos espúrios.
**Detecção:** o `useEffect` que **removeremos** é o das linhas 178-186 (`useVideoExporter.tsx`) e 277-286 (`useSpeedPaintExporter.tsx`). A fachada (M3, M4) **não deve** re-adicionar cleanup que aborte — verificar em code review.

### R2 — Múltiplas instâncias do `useVideoExporter` chamadas em paralelo
**Descrição:** hoje só `VideoPage` chama `useVideoExporter()`. Após a refatoração, se algum outro ponto da app começar a chamar (e.g., um botão flutuante de "export rápido" no `ActionBar`), cada instância terá o seu próprio `useCodecSupport` mas **compartilhará** o mesmo controller singleton. Não há conflito de estado, mas há acoplamento implícito.
**Magnitude:** Baixa. Controlada pelo design (singleton + fachada).
**Detecção:** ao introduzir M1, deixar claro que o `useCodecSupport` é **local** à fachada; o controller apenas herda os valores.

### R3 — Re-render excessivo de ActionBar/ToastManager
**Descrição:** o progresso atualiza 30x/s durante o render. Se a ActionBar selecionar o objeto inteiro, há re-render 30x/s.
**Magnitude:** Média. Já mitigada parcialmente pelo `useShallow` no `videoRenderBridge.ts` (linhas 25-27). Pode se agravar ao adicionar o `ExportCrossRouteToast` (M6) sem `useShallow`.
**Detecção:** auditar todos os `useStore` que retornam objetos — wrap com `useShallow`.

### R4 — Perda do `outputBlob` em F5/reload (não é objetivo deste plano, mas é UX)
**Descrição:** o `outputBlob` está em memória (no singleton Zustand). F5 mata a página → perde. M8 persiste metadados mas **não o blob** (decisão deliberada — persistir blob exigiria `IndexedDB` ou `OPFS`, fora de escopo).
**Magnitude:** Média. O usuário pode achar estranho que o indicador aparece pós-F5 mas não há vídeo para baixar.
**Detecção:** após F5, M8 diz "render estava em andamento" mas o `outputBlob` é `null`. UI precisa mostrar "renderização interrompida — reiniciar" (não "download disponível"). Documentar em §2 fora de escopo.

### R5 — Conflito entre `startRender` e `startBatchRender` (speed paint)
**Descrição:** speed paint tem dois fluxos concorrentes (single e batch) que compartilham o mesmo `AbortController` em M2. Se o usuário iniciar single, depois batch (ou vice-versa), o primeiro precisa ser cancelado de forma limpa.
**Magnitude:** Baixa. Mesmo padrão do hook atual (linhas 487-490 de `useSpeedPaintExporter.tsx`).
**Detecção:** teste explícito em `speedPaintRenderController.unit.test.ts` cobrando `startBatchRender` durante `startRender` em andamento.

---

## 8. Decisões Abertas

> Estas 4 decisões **bloqueiam** o início da arquitetura fina. Pedir sign-off de `product` e `architecture` antes do passo 1.

### D1 — Coexistência ou fusão do `videoRenderBridge` com o novo `videoRenderController`?
**Estado atual:** o `videoRenderBridge` carrega `isExportingVideo`, `videoExportProgress` (export), `isTranscribing`, `transcriptionProgress`, `transcriptionStatusText` (transcrição), `currentFrame`, `isPlaying` (player).
**Opções:**
- **D1.a (recomendada):** M1 **escreve** em `videoRenderBridge` (chamando `syncExportState(isRendering, progress)` no `set`). Bridge mantém o que é puramente cross-cutting (transcrição, player). **Prós:** bridge já existe, é testado, é consumido por ActionBar/ToastManager. **Contras:** dois pontos de verdade sobre `isRendering`.
- **D1.b:** M1 **absorve** o estado de export do bridge; bridge só mantém transcrição + player. **Prós:** fonte única. **Contras:** muda 6 imports (App.tsx, ActionBar, AudioGenerationHandler, VideoPreview, CaptionEditorPanel, VideoPage).
- **D1.c:** Manter bridge paralelo (M1 não escreve nele), bridge vira "view derivada" de M1 via `subscribe`. **Prós:** zero acoplamento. **Contras:** adiciona indireção.

### D2 — UX ao voltar à rota com render em andamento
**Opções:**
- **D2.a (recomendada):** Mostrar M7 (`ExportSurviveIndicator`) **bloqueando** o formulário de novas opções até o render terminar ou ser cancelado. Usuário vê progresso, "Voltar" e "Cancelar".
- **D2.b:** Permitir editar opções de export enquanto render está em andamento; ao clicar "Exportar", perguntar "Cancelar render atual e iniciar nova?" via `window.confirm` (nada elegante).
- **D2.c:** Mostrar indicador **passivo** (sem bloquear). Usuário pode iniciar nova render e o sistema cancela a anterior silenciosamente (pior UX — usuário perde trabalho).

### D3 — Posicionamento do `ExportCrossRouteToast` (M6)
**Opções:**
- **D3.a (recomendada):** Snackbar MUI global em `App.tsx`, posição `top-center` (igual ao `Toaster` do `react-hot-toast` em `App.tsx:149-167`).
- **D3.b:** Integrar no `ToastManager` existente (que já consome `isExportingVideo`/`videoExportProgress`). **Prós:** menos componente novo. **Contras:** `ToastManager` tem lifecycle diferente (toasts efêmeros, M6 é persistente).
- **D3.c:** Snackbar dentro da `ActionBar` (que é `position: fixed` no bottom). **Prós:** reaproveita o container. **Contras:** `ActionBar` só renderiza em `/app/estudio` e `/app/video` (`App.tsx:238`), então não cobre as outras rotas.

### D4 — Speed paint no mesmo PR ou PR separado?
**Opções:**
- **D4.a (recomendada para um único produto coeso):** Mesmo PR. Mesma arquitetura, mesmo padrão, mesmos testes. Tempo: ~6-8h adicionais (M2 + M4 + testes + smoke test manual).
- **D4.b (recomendada para um PR menor e focado):** PR 1: M1, M3, M5, M6, M7, M8 (apenas vídeo). PR 2: M2, M4 (speed paint, herda padrão). Tempo: ~4h no PR 1, ~5h no PR 2.

**Recomendação do plano:** D4.b se o time prefere PRs < 300 linhas diff; D4.a se prioriza consistência arquitetural.

---

## 9. Próximo Passo

1. **Sign-off de D1–D4** com `product` e `architecture` (30 min).
2. **`gap-finder`**: auditar o plano contra o código real, identificar gaps técnicos que não foram cobertos (especialmente em `useTranscription`, `useSpeedPaintEnhancer` e nos efeitos colaterais de `audioSegments` no `useAudioGenerator` que afetam o `useVideoExporter`).
3. **`architecture`**: detalhar M1 e M2 (assinaturas, slices, throttling), M3 e M4 (fachadas), M5/M6/M7 (UX), M8 (schema). Gerar diagrama de sequência do fluxo `startRender → navigate → return → continue`.
4. **`frontend-engineer`**: executar passos 1–5 do §6 (M9, M1, M3, M5, M6). Validar manualmente com teste de navegação real (Chrome DevTools throttling 4x para simular).

**Handoff pronto para colar no `gap-finder`:**
```
Plano base de video-render-survive-navigation salvo em
docs/plan/video-render-survive-navigation-base.md.

9 módulos: M1/M2 (controllers), M3/M4 (fachadas), M5 (guard),
M6 (toast), M7 (indicator), M8 (persist), M9 (types).
Foco em P0: M9 → M1 → M3 → M5 → M6.

Bloqueios: 4 decisões abertas (D1-D4) — produto + arquitetura.
Validação crítica via NotebookLM confirmada:
- renderMediaOnWeb: AbortSignal destrutivo, sem pause/resume (Remotion 4.0.448)
- React 19: ciclo de vida fora do componente via singleton (React Docs)
- Zustand 5: useShallow mandatório para seletores com objetos (Zustand Docs)

Fora de escopo (do handoff): Cloud Functions, BG Sync, troca de lib,
quebrar VideoExporter, outputTarget: web-fs, deps novas.
Fora de escopo (decidido neste plano): persistência do outputBlob
em F5 (R4 documentado).
```
