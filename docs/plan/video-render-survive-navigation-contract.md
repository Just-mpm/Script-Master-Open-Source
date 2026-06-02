# Contract — Video Render Survive Navigation

**Slug:** `video-render-survive-navigation`
**Versão do projeto:** 0.122.0
**Data:** 2026-06-02
**Arquivos-fonte:** `base.md` + `product.md` + `requirements.md` + `architecture.md` + código real

---

## ⚠️ Decisões Abertas (bloqueiam execução)

Estas 4 decisões precisam de sign-off **antes** do worker começar a implementar:

| # | Decisão | Opções | Recomendação do plano |
|---|---------|--------|----------------------|
| D1 | M1 ↔ videoRenderBridge: coexistência ou fusão? | (a) M1 escreve no bridge / (b) M1 absorve / (c) bridge virá view derivada | **D1.a** — M1 escreve no bridge via `syncExportState()` |
| D2 | UX ao voltar com render ativo | (a) Banner bloqueante / (b) permitir editar / (c) indicador passivo | **D2.a** — Banner bloqueante com ações |
| D3 | Posicionamento do ExportCrossRouteToast | (a) Snackbar MUI global / (b) integrado ToastManager / (c) ActionBar | **D3.a** — Snackbar MUI em App.tsx, top-center |
| D4 | Speed paint no mesmo PR ou PR separado? | (a) mesmo PR / (b) PR separado | **D4.b** — PR separado (menos risco) |

> Se D4.b: PR1 = M9+M1+M3+M5+M6 (vídeo), PR2 = M2+M4+M7+M8 (speed paint + persistência).

---

## 1. Critérios por Módulo (M1–M9)

Cada módulo tem critérios binários. Marcar `[x]` só quando o comando especificado passa sem erros.

### M9 — Tipos Compartilhados (~40 linhas, P0)

| # | Critério | Como verificar |
|---|----------|----------------|
| M9-1 | `RenderKind`, `RenderStatus`, `RenderPhase`, `RenderSnapshot`, `RenderControllerPublicState`, `RenderControllerActions` exportados em `src/features/video-render/types/renderController.ts` | `bun run typecheck` sem erros |
| M9-2 | Nenhum tipo usa `any` | `grep -r "any" src/features/video-render/types/renderController.ts` → 0 matches |
| M9-3 | `RenderStatus` cobre exatamente: `'idle' \| 'preparing' \| 'rendering' \| 'completed' \| 'cancelled' \| 'failed'` | Leitura do arquivo |
| M9-4 | `RenderKind` cobre exatamente: `'video' \| 'speed-paint'` | Leitura do arquivo |
| M9-5 | `RenderSnapshot` tem `schemaVersion: 1` como literal | Leitura do arquivo |
| M9-6 | Tipos são importáveis por M1, M2, M7, M8 sem `// @ts-expect-error` | `bun run typecheck` |

### M1 — videoRenderController (~250 linhas, P0)

| # | Critério | Como verificar |
|---|----------|----------------|
| M1-1 | Store Zustand singleton criado com `create<VideoRenderControllerStore>()()` | Leitura de `src/features/video-render/store/videoRenderController.ts` |
| M1-2 | `startRender(options)` cria `AbortController` em escopo de módulo (fora de componente) | Leitura: `let abortController: AbortController \| null = null` no closure |
| M1-3 | `cancelRender()` chama `abortController.abort()`, mas NÃO descarta `outputBlob` se render já completou | `bun test tests/video-render/videoRenderController.unit.test.ts` — caso "cancelRender preserva blob completo" |
| M1-4 | `reset()` revoga `outputUrl` via `URL.revokeObjectURL()` | Leitura + `bun test` — caso "reset limpa URL" |
| M1-5 | Progresso é inteiro (throttle: `lastReportedPercentRef` impede setState se mesmo valor) | Leitura: `Math.round(progress.progress * 100)` + `if (percent === lastReportedPercentRef.current) return` |
| M1-6 | 2ª chamada a `startRender()` com render ativo cancela a 1ª silenciosamente | `bun test` — caso "paralelismo de 2 renders" |
| M1-7 | Escreve `syncExportState(isRendering, progress)` no `videoRenderBridge` a cada `set()` | Leitura |
| M1-8 | `@remotion/web-renderer` é lazy-imported (NÃO está no bundle principal) | Verificação RNF-003 |
| M1-9 | `getBlob()` edge case: se `currentRenderId !== renderId`, revoga URL e retorna sem setar estado | Leitura + `bun test` |

**Comando de verificação:** `bun test tests/video-render/videoRenderController.unit.test.ts --run` — 5+ casos verdes.

### M2 — speedPaintRenderController (~250 linhas, P1)

| # | Critério | Como verificar |
|---|----------|----------------|
| M2-1 | Espelha M1 para speed paint: mesma estrutura, tipos adaptados | Leitura de `src/features/speed-paint/store/speedPaintRenderController.ts` |
| M2-2 | Expõe `currentBatchIndex: number` e `totalBatchItems: number` | Leitura |
| M2-3 | `startRender` e `startBatchRender` compartilham o mesmo `AbortController` | Leitura |
| M2-4 | Conflito single vs batch: batch tem prioridade (cancela single) | `bun test tests/speed-paint/speedPaintRenderController.unit.test.ts` — caso "conflito batch vs single" |
| M2-5 | `currentBatchIndex` preservado após navegação (não reseta) | `bun test` — caso "currentBatchIndex preservado" |

**Comando de verificação:** `bun test tests/speed-paint/speedPaintRenderController.unit.test.ts --run` — 3+ casos verdes.

### M3 — useVideoExporter refatorado (523 → ~150 linhas, P0)

| # | Critério | Como verificar |
|---|----------|----------------|
| M3-1 | Hook consome M1 via `useStore(videoRenderController, (s) => s.isRendering)` — seletores primitivos, NÃO `useShallow` no objeto inteiro | Leitura |
| M3-2 | **NÃO** tem `useEffect` cleanup que chama `abortControllerRef.current?.abort()` | `grep -n "abort" src/features/video-render/hooks/useVideoExporter.tsx` → só deve aparecer em `handleCancel` |
| M3-3 | Preserva type export `VideoExporter` com mesma forma | `bun run typecheck` |
| M3-4 | Preserva `VideoExportOptions` | `bun run typecheck` |
| M3-5 | `useCodecSupport` permanece como hook local (NÃO migra para controller) | Leitura |
| M3-6 | `handleDownload` lê `outputUrl` do controller | Leitura |
| M3-7 | Testes existentes continuam passando após mock do controller | `bun test tests/video-render/useVideoExporter-speedpaint.unit.test.tsx --run` |

### M4 — useSpeedPaintExporter refatorado (714 → ~200 linhas, P1)

| # | Critério | Como verificar |
|---|----------|----------------|
| M4-1 | Espelha M3 para speed paint: consome M2, preserva `SpeedPaintExporter` type | `bun run typecheck` |
| M4-2 | Expõe `startBatchRender` que delega para `M2.startBatchRender` | Leitura |
| M4-3 | Mantém `useCodecSupport({ muted: true })` | Leitura |
| M4-4 | **NÃO** tem `useEffect` cleanup que aborta | `grep -n "abort" src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` → só em `handleCancel` |

### M5 — useCrossRouteRenderGuard (~80 linhas, P1)

| # | Critério | Como verificar |
|---|----------|----------------|
| M5-1 | Assinatura: `useCrossRouteRenderGuard(): void` | Leitura |
| M5-2 | Registra `beforeunload` com `event.preventDefault()` se `M1.isRendering \|\| M2.isRendering` | `bun test tests/hooks/useCrossRouteRenderGuard.unit.test.ts` — caso "beforeunload registrado" |
| M5-3 | Registra `visibilitychange` + `focus` para re-hidratar estado | Leitura |
| M5-4 | Limpa listeners no cleanup | `bun test` — caso "removido sem render" |
| M5-5 | `document.title` muda para `"🎥 Renderizando — Script Master"` durante render | `bun test` — caso "título atualizado" |
| M5-6 | `document.title` muda para `"✅ Vídeo pronto! — Script Master"` ao completar | `bun test` |
| M5-7 | `document.title` muda para `"❌ Falha na exportação — Script Master"` em falha | `bun test` |
| M5-8 | NÃO conflita com o `beforeunload` existente em `AudioGenerationHandler.tsx:163-173` (são complementares) | Code review |

**Comando de verificação:** `bun test tests/hooks/useCrossRouteRenderGuard.unit.test.ts --run` — 4+ casos verdes.

### M6 — ExportCrossRouteToast (~120 linhas, P1)

| # | Critério | Como verificar |
|---|----------|----------------|
| M6-1 | Componente lê `M1.isRendering`, `M1.renderProgress`, `M1.status`, `M1.error` via seletores primitivos | Leitura |
| M6-2 | Renderiza Snackbar MUI em `App.tsx`, posição `top-center`, sem auto-dismiss | Leitura |
| M6-3 | **Não aparece** quando `pathname === '/app/video'` ou `pathname === '/app/pintura-rapida'` | `bun test tests/components/ExportCrossRouteToast.component.test.tsx — caso "não aparece em /app/video" |
| M6-4 | **Aparece** em qualquer outra rota durante render ativo | `bun test` — caso "aparece em /app/assistente" |
| M6-5 | Estado **Rendering**: ícone spinner + progresso + botões "Ver Vídeo" + "Cancelar" | Leitura |
| M6-6 | Estado **Completed**: ícone verde + "Vídeo pronto!" + botões "Ver Vídeo" + "Baixar" + "Fechar" | `bun test` — caso "estados rendering/completed/failed" |
| M6-7 | Estado **Failed**: ícone vermelho + mensagem de erro + botão "Ver detalhes" + "Fechar" | `bun test` |
| M6-8 | `slotProps.content={{ role: 'alert' }}` e `aria-live="polite"` presentes | Leitura |
| M6-9 | Botão "Cancelar" chama `videoRenderController.getState().cancelRender()` | Leitura |
| M6-10 | Botão "Ver Vídeo" navega para `/app/video` via `useNavigate()` | `bun test` |
| M6-11 | Toast de "Completed" persiste até usuário clicar "Fechar", "Baixar" ou "Ver Vídeo" | Leitura: `autoHideDuration={null}` |
| M6-12 | Toast de "Failed" persiste até dismiss manual | Leitura |
| M6-13 | Navegação durante cancelamento não causa erro | `bun test` |
| M6-14 | Cobertura i18n: todas as 19 chaves do namespace `exportCrossRoute` presentes nos 3 locales | Ver RNF-005 |

**Comando de verificação:** `bun test tests/components/ExportCrossRouteToast.component.test.tsx --run` — 3+ casos verdes.

### M7 — ExportSurviveIndicator (~80 linhas, P2)

| # | Critério | Como verificar |
|---|----------|----------------|
| M7-1 | Banner `Alert` MUI no topo de `VideoPage` / `SpeedPaintPage` quando `status === 'rendering'` e `startedAt < Date.now() - 1000` | `bun test tests/video-render/ExportSurviveIndicator.component.test.tsx` — caso "banner aparece" |
| M7-2 | **Não aparece** quando `startedAt === null` | `bun test` — caso "não aparece sem render" |
| M7-3 | Mostra progresso + botões "Continuar" (navega p/ `/app/video`) + "Cancelar" | Leitura |
| M7-4 | Desaparece ao cancelar ou completar (reatividade do store) | `bun test` |
| M7-5 | Usa chave i18n `exportCrossRoute.*` para textos | Leitura |

**Comando de verificação:** `bun test tests/video-render/ExportSurviveIndicator.component.test.tsx --run` — 2+ casos verdes.

### M8 — cross-route-persistence (~80 linhas, P2)

| # | Critério | Como verificar |
|---|----------|----------------|
| M8-1 | `saveActiveRender(snapshot)` persiste em `localStorage` com chave `s2a_active_render` | `bun test tests/lib/cross-route-persistence.unit.test.ts` — caso "save/load/clear" |
| M8-2 | `loadActiveRender()` retorna `RenderSnapshot` ou `null` se schema inválido | `bun test` — caso "schema versionado" |
| M8-3 | Schema inválido ou JSON corrompido retorna `null` silenciosamente | `bun test` — caso "JSON inválido" |
| M8-4 | `clearActiveRender()` limpa `localStorage` | `bun test` |
| M8-5 | NÃO persiste `outputBlob` — apenas metadados | Leitura |
| M8-6 | `SCHEMA_VERSION = 1` | Leitura |
| M8-7 | Todas as operações com `try/catch` para `QuotaExceededError` / `SecurityError` | Leitura |
| M8-8 | Salvo a cada `set()` de M1/M2 (debounce 1s via ref) | Code review |
| M8-9 | Limpo em `cancelRender()`, `reset()` e ao completar | Leitura |

**Comando de verificação:** `bun test tests/lib/cross-route-persistence.unit.test.ts --run` — 3+ casos verdes.

---

## 2. Critérios por RF (RF-001 a RF-013)

### RF-001: Renderização sobrevive à navegação (P0)

**Verificação manual:**
1. Abrir `/app/video`, iniciar exportação
2. Navegar para `/app/assistente`
3. Aguardar 5s, voltar para `/app/video`
4. ✅ Progresso avançou (não reiniciou de 0)
5. Quando completar, ✅ `outputBlob` está disponível para preview/download

**Verificação automatizada:**
- `bun test tests/video-render/videoRenderController.unit.test.ts` — casos 1-5 passam
- `bun test tests/video-render/useVideoExporter-speedpaint.unit.test.tsx` — mock do controller, não aborta
- `grep -n "abortControllerRef.current?.abort" src/features/video-render/hooks/useVideoExporter.tsx` → 0 matches

**Se falhar:** `videoRenderController.ts` não está preservando a promise; `useVideoExporter.tsx` ainda tem cleanup que aborta.

### RF-002: Progresso atualizado em tempo real (P0)

**Verificação manual:**
1. Iniciar exportação
2. Navegar para `/app/assistente`
3. ✅ Toast mostra progresso subindo em tempo real
4. ✅ ActionBar (se visível) mostra progresso

**Verificação automatizada:**
- Teste de integração: `videoRenderBridge.isExportingVideo === true` durante render
- `videoRenderBridge.videoExportProgress` avança de 0 a 100
- Throttle: `lastReportedPercentRef` impede setState se valor não mudou

### RF-003: Speed paint batch preserva índice (P1)

**Verificação manual:**
1. Em `/app/pintura-rapida`, iniciar batch de 5 imagens
2. Navegar para `/app/assistente`
3. ✅ Toast mostra "imagem 3 de 7"
4. Voltar para `/app/pintura-rapida`
5. ✅ `currentBatchIndex` preservado

**Verificação automatizada:**
- `bun test tests/speed-paint/speedPaintRenderController.unit.test.ts` — caso "currentBatchIndex preservado"

### RF-004: `outputBlob` e `outputUrl` preservados (P0)

**Verificação manual:**
1. Exportação completa (esperar)
2. Navegar para `/app/assistente`
3. Voltar para `/app/video`
4. ✅ Preview do vídeo disponível
5. ✅ Download funciona

**Verificação automatizada:**
- `videoRenderController.getState().outputBlob !== null` após conclusão
- `outputUrl` começa com `blob:`
- Reset limpa: `outputUrl === null` após `reset()`

### RF-005: `useEffect` cleanup removido (P0)

**Verificação automatizada:**
- `grep -rn "abortControllerRef.current?.abort()" src/features/video-render/hooks/useVideoExporter.tsx` → 0
- `grep -rn "abortControllerRef.current?.abort()" src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` → 0
- `bun run typecheck` passa
- Testes existentes passam

### RF-006: Toast cross-route (M6) (P0)

**Verificação manual:** Ver cenários do plano de QA (seção 4).

**Verificação automatizada:**
- `bun test tests/components/ExportCrossRouteToast.component.test.tsx --run`

### RF-007: Cancelamento em qualquer rota (P0)

**Verificação manual:**
1. Iniciar exportação, navegar para `/app/assistente`
2. Clicar "Cancelar" no Toast
3. ✅ Toast progresso SOME
4. ✅ Toast amarelo "Renderização cancelada" aparece (4s)
5. ✅ Ao voltar para `/app/video`, painel em idle

**Verificação automatizada:**
- `bun test tests/video-render/videoRenderController.unit.test.ts` — caso "cancelRender preserva blob completo"
- `outputUrl === null` após cancelamento (se blob incompleto)

### RF-008: Erro notificado cross-route (P1)

**Verificação manual:**
1. Injetar erro (codec inválido)
2. Navegar para `/app/assistente`
3. ✅ Toast vermelho aparece
4. Clicar "Ver detalhes" → navega para `/app/video` com erro no painel
5. ✅ Botão "Tentar novamente" presente

**Verificação automatizada:**
- Testar se `status === 'failed'` → `error !== null` no controller
- Toast exibe `failedTitle` + `failedDescription`

### RF-009: Painel ao retornar para `/app/video` (P1)

**Verificação manual:** Ver cenário 12 do QA (seção 4).

**Verificação automatizada:**
- `bun test tests/video-render/ExportSurviveIndicator.component.test.tsx --run`

### RF-010: 2ª exportação cancela a 1ª (P0)

**Verificação manual:**
1. Iniciar 1ª exportação
2. Imediatamente iniciar 2ª
3. ✅ Toast reflete progresso da 2ª
4. ✅ 1ª foi abortada

**Verificação automatizada:**
- `bun test tests/video-render/videoRenderController.unit.test.ts` — caso "paralelismo de 2 renders"
- `currentRenderId` incrementa; render obsoleto não escreve estado

### RF-011: Dot indicator mobile (P1)

**Verificação manual:**
1. Abrir app no celular (ou DevTools viewport mobile)
2. Iniciar exportação
3. ✅ Dot pulsante azul no ícone "Vídeo" da Bottom Nav
4. Exportação concluída: ✅ dot verde estático
5. Abrir `/app/video`: ✅ dot some

**Verificação automatizada:**
- `MobileBottomNav` lê `videoRenderController.getState().isRendering`
- `aria-label` dinâmico: "Renderização em andamento" / "Vídeo pronto para ver"
- Dot NÃO aparece em desktop (`mdDown` check)

### RF-012: `document.title` e `beforeunload` (P1)

**Verificação manual:**
1. Iniciar exportação
2. ✅ Aba da página mostra "🎥 Renderizando — Script Master"
3. Tentar fechar a aba → ✅ prompt nativo
4. Exportação completa → ✅ "✅ Vídeo pronto! — Script Master"

**Verificação automatizada:**
- `bun test tests/hooks/useCrossRouteRenderGuard.unit.test.ts --run`
- `document.title` verificado com spies

### RF-013: Snapshot localStorage (M8) (P2)

**Verificação manual:**
1. Iniciar exportação
2. F5 (recarregar)
3. ✅ Banner "Renderização interrompida — reiniciar" aparece em `/app/video`
4. ✅ Em outras rotas, banner não aparece
5. Após concluir/cancelar, snapshot é limpo

**Verificação automatizada:**
- `bun test tests/lib/cross-route-persistence.unit.test.ts --run`

---

## 3. Critérios por RNF (RNF-001 a RNF-007)

### RNF-001: Performance — Re-render mínimo (P0)

| Métrica | Budget | Como medir |
|---------|--------|------------|
| Re-renders do `ExportCrossRouteToast` por exportação | ≤ 100 (1 por ponto percentual) | Chrome DevTools Profiler → React DevTools → count renders |
| `ActionBar` re-renders | Mantém comportamento atual (sem regressão) | Comparar com branch `main` |
| Progresso é inteiro e throttled | `set()` chamado no máximo 1 vez por valor inteiro | Leitura do código: `lastReportedPercentRef` |

### RNF-002: Performance — Memória (P1)

| Métrica | Budget | Como medir |
|---------|--------|------------|
| Heap durante exportação (720p, 30s) | +50 MB máximo acima do baseline | Chrome DevTools Memory → Heap Snapshot antes/durante/depois |
| Blob URLs não revogadas | 0 após `reset()` | Chrome DevTools → `URL.revokeObjectURL()` chamado em reset/cancel |
| Blobs órfãos | Máximo 1 por sessão | Leitura: `reset()` revoga anterior antes de criar nova |

### RNF-003: Bundle size — `main-*.js` (P0)

| Métrica | Budget | Como medir |
|---------|--------|------------|
| `main-*.js` gzipped | ≤ +10 KB vs branch `main` | `bun run build && du -sh dist/assets/main-*.js` |
| `@remotion/web-renderer` no bundle principal | 0 KB (lazy) | `bun run build && ls dist/assets/` — não deve ter chunk `render` explícito no bundle principal |
| Chunks lazy de `VideoPage`/`useCodecSupport`/`mediabunny-*` | Mantidos como lazy | `bun run build && grep -l "VideoPage" dist/assets/*.js` — apenas em chunk separado |

### RNF-004: Acessibilidade (P1)

| Métrica | Budget | Como medir |
|---------|--------|------------|
| Lighthouse Accessibility | ≥ 90 | Chrome DevTools → Lighthouse → Acessibilidade (rota `/app/video` + `/app/assistente`) |
| `role="alert"` no toast | Presente | Inspeção do DOM: `<div role="alert" ...>` no `ExportCrossRouteToast` |
| `aria-live="polite"` | Herdado do Alert MUI | Inspeção |
| Navegação por teclado no toast | Tab navigates through all buttons | Teste manual com Tab/Shift+Tab |
| Foco automático ao toast | **Não** mover foco | Verificar que `autoFocus` não está presente |

### RNF-005: Internacionalização (P1)

| Métrica | Budget | Como medir |
|---------|--------|------------|
| Chaves do namespace `exportCrossRoute` | 19 chaves idênticas em pt-BR, en, es | `node -e "const a=require('./src/features/i18n/locales/pt-BR.ts');console.log(Object.keys(a.exportCrossRoute).length)"` (adaptar para TS) |
| Nenhuma chave sem tradução | 0 | Script de diff entre os 3 locale files |
| `bun run typecheck` | Passa com novos tipos de namespace | `bun run typecheck` |

Chaves obrigatórias (19 + 2 mobile dot = 21 no total):
`renderingTitle`, `renderingProgress`, `renderingStatusTextPreparing`, `renderingStatusTextSpeedPaint`, `renderingStatusTextRender`, `renderingStatusTextFinalizing`, `completedTitle`, `completedDescription`, `failedTitle`, `failedDescription`, `failedHint`, `cancelledMessage`, `actionViewVideo`, `actionDownload`, `actionCancel`, `actionClose`, `actionSeeDetails`, `actionTryAgain`, `beforeUnloadMessage`, `mobileDotActive`, `mobileDotCompleted`.

### RNF-006: Testes automatizados (P1)

| Métrica | Budget | Como medir |
|---------|--------|------------|
| Testes existentes | 0 falhas | `bun test` |
| Novos testes | Todos verdes | `bun test` |
| Cobertura novos arquivos (linhas) | ≥ 80% | `bun test --coverage` para os 6 novos arquivos de teste |

Arquivos de teste novos (6):
- `tests/video-render/videoRenderController.unit.test.ts` — 5+ casos
- `tests/speed-paint/speedPaintRenderController.unit.test.ts` — 3+ casos
- `tests/components/ExportCrossRouteToast.component.test.tsx` — 3+ casos
- `tests/hooks/useCrossRouteRenderGuard.unit.test.ts` — 4+ casos
- `tests/video-render/ExportSurviveIndicator.component.test.tsx` — 2+ casos
- `tests/lib/cross-route-persistence.unit.test.ts` — 3+ casos

Arquivos de teste mantidos (com mock ajustado):
- `tests/video-render/useVideoExporter-speedpaint.unit.test.tsx`
- `tests/speed-paint/useSpeedPaintExporter.unit.test.tsx`

### RNF-007: Telemetria (P2)

| Métrica | Budget | Como medir |
|---------|--------|------------|
| Evento `video_export_completed_offroute` emitido | Exatamente 1 vez por conclusão off-route | Verificar `trackAnalyticsEvent` chamado com nome correto |
| Parâmetros do evento | `{ source, quality, codec, container, scene_count }` | Leitura do código em `videoRenderController.ts` |
| `AnalyticsEventMap` atualizado | `video_export_completed_offroute: ExportParams & { source: string }` | Leitura de `src/lib/analytics.ts` |

---

## 4. Plano de QA Manual (17 Cenários do Product)

### Cenário 1: Inicia exportação em `/app/video`
1. Navegar para `/app/video`
2. Ajustar qualidade (ex: 720p)
3. Clicar "Exportar Vídeo"
4. ✅ Painel mostra progresso de 0% a 100%
5. ✅ `ActionBar` (se visível) mostra indicador
6. ✅ `document.title` muda para "🎥 Renderizando — Script Master"

### Cenário 2: Navega para outra rota durante render
1. Iniciar exportação (Cenário 1)
2. Clicar no link do Assistente (`/app/assistente`)
3. ✅ Toast Snackbar aparece no topo com progresso
4. ✅ Progresso atualiza em tempo real
5. ✅ Botões "Ver Vídeo" e "Cancelar" presentes

### Cenário 3: Navega para `/app/video` durante render
1. A partir do Cenário 2, clicar "Ver Vídeo" no Toast
2. ✅ Toast some (está na rota de vídeo)
3. ✅ Painel de exportação mostra progresso contínuo
4. ✅ Progresso não reiniciou de 0

### Cenário 4: Render completa em outra rota
1. Iniciar exportação, navegar para `/app/assistente`
2. Aguardar conclusão
3. ✅ Toast muda para "✅ Vídeo pronto!" (verde)
4. ✅ Botões "Ver Vídeo", "Baixar" e "Fechar" presentes
5. ✅ `document.title` muda para "✅ Vídeo pronto! — Script Master"

### Cenário 5: "Ver Vídeo" no Toast (completo)
1. Cenário 4 → clicar "Ver Vídeo"
2. ✅ Navega para `/app/video`
3. ✅ Preview do vídeo disponível para reprodução
4. ✅ Botões "Baixar" e "Exportar novamente" presentes

### Cenário 6: "Baixar" no Toast (completo)
1. Cenário 4 → clicar "Baixar"
2. ✅ Download inicia
3. ✅ Toast some
4. ✅ Resultado ainda disponível em `/app/video`

### Cenário 7: "Fechar" no Toast (completo)
1. Cenário 4 → clicar "Fechar"
2. ✅ Toast some
3. ✅ Navegar para `/app/video`: resultado ainda disponível

### Cenário 8: Cancelar pelo Toast
1. Cenário 2 (render ativo em `/app/assistente`)
2. Clicar "Cancelar" no Toast
3. ✅ Toast de progresso SOME IMEDIATAMENTE
4. ✅ Toast amarelo "Renderização cancelada" (4s) via `react-hot-toast`
5. ✅ Navegar para `/app/video`: painel em idle

### Cenário 9: Cancelar pelo painel em `/app/video`
1. Iniciar exportação
2. Em `/app/video`, clicar "Cancelar" no painel
3. ✅ Mesmo comportamento do Cenário 8
4. ✅ `outputBlob === null`, `outputUrl === null`

### Cenário 10: Falha durante render em outra rota
1. Forçar codec inválido (ou simular erro no mock)
2. Navegar para `/app/assistente`
3. ✅ Toast vermelho "Falha na exportação: [motivo]" aparece
4. ✅ Botões "Ver detalhes" e "Fechar" presentes
5. ✅ `document.title` muda para "❌ Falha na exportação — Script Master"

### Cenário 11: Volta após falha
1. Cenário 10 → clicar "Ver detalhes"
2. ✅ Navega para `/app/video`
3. ✅ Painel mostra erro + botão "Tentar novamente"

### Cenário 12: Volta após cancelamento
1. Cenário 8 (cancelado)
2. Navegar para `/app/video`
3. ✅ Painel em idle (resetado)

### Cenário 13: 2ª exportação cancela a 1ª
1. Iniciar 1ª exportação
2. Imediatamente iniciar 2ª
3. ✅ Toast reflete progresso da 2ª (deve pular de ~5% para 0%)
4. ✅ 1ª foi abortada — não há erro, apenas transição silenciosa

### Cenário 14: F5 durante render
1. Iniciar exportação
2. F5 (recarregar página)
3. ✅ Em `/app/video`: banner "Renderização interrompida — reiniciar"
4. ✅ Em `/app/assistente`: NENHUM banner
5. ✅ `beforeunload` NÃO trava (página recarregou)
6. ✅ `outputBlob` é `null` (perdido — comportamento esperado)

### Cenário 15: Fechar aba com render ativo
1. Iniciar exportação
2. Tentar fechar a aba
3. ✅ Prompt nativo: "Há uma renderização de vídeo em andamento. Se sair agora, perderá o progresso."
4. Clicar "Cancelar" no prompt → ✨ render continua
5. ✅ Após conclusão, fechar a aba NÃO mostra prompt

### Cenário 16: Mobile — render em andamento
1. DevTools → viewport mobile (iPhone/Android)
2. Iniciar exportação em `/app/video`
3. ✅ Toast aparece no topo
4. ✅ Dot pulsante azul no ícone "Vídeo" da Bottom Nav
5. Concluir → ✅ dot verde estático
6. Abrir `/app/video` → ✅ dot some
7. ✅ `aria-label` no dot: "Renderização em andamento" / "Vídeo pronto para ver"

### Cenário 17: Troca de app / aba em background
1. Iniciar exportação
2. Trocar para outra aba (ou outro app)
3. Aguardar 10s
4. Voltar para a aba do Script Master
5. ✅ Progresso avançou (render continuou em background)
6. ✅ Toast reflete estado atual (não congelou)

---

## 5. Plano de Testes Automatizados

### Arquivos novos a criar (6 arquivos, ~19 casos no total)

| Arquivo | Casos | Comando para rodar |
|---------|-------|-------------------|
| `tests/video-render/videoRenderController.unit.test.ts` | 5+ | `bun test tests/video-render/videoRenderController.unit.test.ts --run` |
| `tests/speed-paint/speedPaintRenderController.unit.test.ts` | 3+ | `bun test tests/speed-paint/speedPaintRenderController.unit.test.ts --run` |
| `tests/components/ExportCrossRouteToast.component.test.tsx` | 3+ | `bun test tests/components/ExportCrossRouteToast.component.test.tsx --run` |
| `tests/hooks/useCrossRouteRenderGuard.unit.test.ts` | 4+ | `bun test tests/hooks/useCrossRouteRenderGuard.unit.test.ts --run` |
| `tests/video-render/ExportSurviveIndicator.component.test.tsx` | 2+ | `bun test tests/video-render/ExportSurviveIndicator.component.test.tsx --run` |
| `tests/lib/cross-route-persistence.unit.test.ts` | 3+ | `bun test tests/lib/cross-route-persistence.unit.test.ts --run` |

### Arquivos existentes a ajustar (2 arquivos)

| Arquivo | Mudança | Comando |
|---------|---------|---------|
| `tests/video-render/useVideoExporter-speedpaint.unit.test.tsx` | Ajustar mock: `videoRenderController` em vez de `useVideoExporter` interno | `bun test tests/video-render/useVideoExporter-speedpaint.unit.test.tsx --run` |
| `tests/speed-paint/useSpeedPaintExporter.unit.test.tsx` | Ajustar mock: `speedPaintRenderController` | `bun test tests/speed-paint/useSpeedPaintExporter.unit.test.tsx --run` |

### Padrões de mock a usar (confirmados pelo NotebookLM — Vitest Guide)

```typescript
// Mock do controller Zustand para tests de componente
vi.mock('../../features/video-render/store/videoRenderController', () => ({
  videoRenderController: {
    getState: vi.fn(() => ({
      isRendering: false,
      renderProgress: 50,
      status: 'rendering',
      // ... demais campos
    })),
  },
}));

// Mock de lazy import do remotion
vi.mock('@remotion/web-renderer', () => ({
  renderMediaOnWeb: vi.fn(() => Promise.resolve({ getBlob: () => Promise.resolve(new Blob()) })),
}));

// Spy de addEventListener para guard
const addSpy = vi.spyOn(window, 'addEventListener');
const removeSpy = vi.spyOn(window, 'removeEventListener');

// Mock de localStorage para persistence
const localStorageMock = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
vi.stubGlobal('localStorage', localStorageMock);
```

---

## 6. Gate de Release (Checklist Final)

### 🔴 Bloqueante (tudo precisa estar verde)

- [ ] **D1–D4 respondidos** pelo product/architecture
- [ ] `bun run build` — 0 erros, 0 warnings
- [ ] `bun run typecheck` — sem erros
- [ ] `bun run lint` — sem erros
- [ ] `bun run test` — todos os testes (146+ existentes + novos) verdes
- [ ] Testes novos específicos:
  - [ ] `bun test tests/video-render/videoRenderController.unit.test.ts --run` — 5+ casos verdes
  - [ ] `bun test tests/components/ExportCrossRouteToast.component.test.tsx --run` — 3+ casos verdes
  - [ ] `bun test tests/hooks/useCrossRouteRenderGuard.unit.test.ts --run` — 4+ casos verdes
  - [ ] `bun test tests/lib/cross-route-persistence.unit.test.ts --run` — 3+ casos verdes
- [ ] Bundle size: `bun run build && du -sh dist/assets/main-*.js` ≤ +10 KB gzipped vs `main`
- [ ] Chunks lazy mantidos: `bun run build && grep -l "useCodecSupport" dist/assets/*.js` — deve estar em chunk separado

### 🟡 QA Manual (mínimo 5 cenários obrigatórios)

- [ ] **Cenário 1** — Inicia exportação, vê progresso
- [ ] **Cenário 2** — Navega para `/app/assistente`, vê Toast
- [ ] **Cenário 4** — Render completa em outra rota, Toast "Vídeo pronto!"
- [ ] **Cenário 8** — Cancelar pelo Toast
- [ ] **Cenário 10** — Falha com Toast vermelho
- [ ] **Cenário 13** — 2ª exportação cancela 1ª
- [ ] **Cenário 15** — `beforeunload` ao fechar aba
- [ ] **Cenário 16** — Mobile dot indicator
- [ ] **Cenário 17** — Background/volta com progresso atualizado

### 🟢 Code Review

- [ ] `useVideoExporter.tsx` e `useSpeedPaintExporter.tsx` **não** têm `useEffect` que aborta (confirmar remoção linhas 178-186)
- [ ] `VideoPage.tsx` **removeu** `syncExportState()` e `resetBridge()` do `useEffect`
- [ ] `ToastManager` manteve apenas ErrorToast/WarningToast/SuccessToast (Snackbar de exportação removido)
- [ ] Nenhum `any` em código novo
- [ ] Nenhuma dependência nova (`@remotion/*`, lib de estado, lib de UI)
- [ ] `exportCrossRoute` namespace adicionado nos 3 locale files

### 🔵 Deploy

- [ ] `bun run build:full` (com pre-render) passa
- [ ] `bun run deploy:preview` — deploy em preview channel do Firebase Hosting
- [ ] Teste de smoke no preview: navegar por todas as rotas, iniciar export, cancelar, concluir

---

## 7. Critérios de Rollback

### Como reverter

**Opção A — Revert simples (recomendado):**
```bash
git revert HEAD --no-edit
git push origin main
bun run deploy
```

**Opção B — Feature flag (se implementado):**
- Se o PR incluir uma flag `VITE_RENDER_SURVIVE_NAVIGATION_ENABLED`, setar para `false` no `.env.production` e redeployar.
- ⚠️ Nota: o plano **não** especifica feature flag. Se o time quiser adicionar, deve ser critério extra.

### Gatilhos de rollback

| Condição | Ação |
|----------|------|
| `beforeunload` dispara quando **não** há render ativo | Rollback imediato (UX catastrófica) |
| `bun run build` quebra em CI/CD | Não mergear; corrigir antes |
| Toast de progresso **não aparece** em rota diferente | Hotfix ou rollback |
| `outputBlob` perdido mesmo sem navegação (regressão) | Rollback |
| Testes existentes quebram | Bloqueia merge |
| Bundle cresce > +10 KB gzipped | Otimizar ou rollback |

### Monitoramento pós-release

- Nas primeiras 24h: verificar `errorLogs` no Firestore para erros relacionados a `renderMediaOnWeb`, `getBlob`, `AbortError`
- Verificar logger para `video_export_completed_offroute` (RNF-007) — se não aparecer, a telemetria não está funcionando (mas rollback não é obrigatório — é P2)
- Verificar `video_export_failed` — se aumentar significativamente, pode ser regressão

---

## Resumo de Entregáveis

| Módulo | Arquivo | Status | Prioridade |
|--------|---------|--------|-----------|
| M9 | `src/features/video-render/types/renderController.ts` | NOVO | P0 |
| M1 | `src/features/video-render/store/videoRenderController.ts` | NOVO | P0 |
| M3 | `src/features/video-render/hooks/useVideoExporter.tsx` | EDIT (523→150) | P0 |
| M5 | `src/hooks/useCrossRouteRenderGuard.ts` | NOVO | P1 |
| M6 | `src/components/app/ExportCrossRouteToast.tsx` | NOVO | P1 |
| M2 | `src/features/speed-paint/store/speedPaintRenderController.ts` | NOVO | P1 |
| M4 | `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` | EDIT (714→200) | P1 |
| M7 | `src/features/video-render/components/ExportSurviveIndicator.tsx` | NOVO | P2 |
| M8 | `src/lib/cross-route-persistence.ts` | NOVO | P2 |

**Arquivos com edições menores:**
- `src/pages/VideoPage.tsx` — remover `syncExportState` + `resetBridge` (-6 linhas)
- `src/components/toast/ToastProvider.tsx` — remover Snackbar de exportação (-43 linhas)
- `src/lib/analytics.ts` — +1 evento (`video_export_completed_offroute`)
- Locales (3 arquivos) — +21 chaves cada

---

## Bloqueios Conhecidos

| Bloqueio | Quem desbloqueia | Urgência |
|----------|-----------------|----------|
| D1–D4 (decisões arquiteturais) | Product + Architecture | **Crítico** — sem isso, worker não começa |
| P5: speed paint mesmo PR ou separado? | Product | **Crítico** — define escopo do PR1 |
| R1: beforeEach do `AudioGenerationHandler` conflita com M5? | Code review | Baixo — já mitigado (são complementares) |
| R2: `resetBridge()` no unmount de `VideoPage` | Implementação | Médio — removido conforme architecture |
| R5: `@remotion/web-renderer` lazy import falha (COEP) | Teste manual | Alto — testar em preview channel |
