# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.136.0] - 2026-08-04

### Resumo da versão

Versão **MINOR** por introduzir novas capacidades **opt-in** (alert UX de divergência de `canvasColor`, tooltip explicativo de batch com modos mistos, propagação completa de `easing`/`canvasColor` no pipeline de export, novo módulo público `easingConverter.ts`) combinadas com correções críticas de robustez (falsos positivos de log em `useVoicePreviews`, Promise não settle no Worker vetorial, Worker timeout matando lote inteiro, `reset()` zerando codec fallback). Todas as mudanças são retrocompatíveis — campos novos são opcionais com defaults que preservam o comportamento atual.

### Adicionado

- **Novo módulo `easingConverter.ts`** (`src/features/video-render/lib/easingConverter.ts`, novo arquivo — 74 linhas): converte `VetorialEasingType` (literal serializável da store) em `EasingFunction` do Remotion no boundary entre estado e composição. Resolve o problema de "controle morto": o seletor "Linear / Smooth / Bounce" do Speed Paint já existia na store e na UI (v0.132.0), mas a escolha não chegava ao `WhiteboardScene` até a propagação completa do easing (gap que vinha desde v0.132.0). O conversor usa tabela de lookup hoisted em escopo de módulo (`LINEAR_EASING`, `BOUNCE_EASING`, `SMOOTH_EASING` alocadas 1× no carregamento) — referência estável para `React.memo` e deps de hooks. Testes em `tests/video-render/easingConverter.unit.test.ts` (67 linhas, 7 testes) fixam a referência estável como contrato (S4+S6 da auditoria).

- **Alert UX de divergência de `canvasColor`** (`src/pages/SpeedPaintPage.tsx`, novo bloco condicional — ~35 linhas): quando o usuário troca `canvasColor` na store mas o `job.animation` atual foi gerado com a cor anterior, mostra `<Alert severity="info" role="status">` com texto `"A cor do canvas mudou de {from} para {to}. Reprocesse a imagem..."` e ação "Reprocessar" (delega para `reprocessInMode`). Resolve a divergência silenciosa entre background visual (`AbsoluteFill` da composição) e paths filtrados por `filterPathsByBackgroundContrast` — sem o alerta, o usuário via paths fantasma no preview até a próxima regeneração. Padrão do `modeProcessingError` Alert (não auto-trigger — exige clique para confirmar custo de reprocessamento). i18n (3 locales): `canvasColorReprocessHint`, `canvasColorReprocessAction`. Testes em `tests/speed-paint/CanvasColorAlert.component.test.tsx` (210 linhas, 5 testes).

- **Tooltip explicativo de batch uniforme** (`src/features/speed-paint/components/batch/QueueStaging.tsx`, novo `<title>` no botão "Gerar 1 vídeo final" — ~7 linhas + i18n): detecta `hasMixedModes` na fila (itens com `renderMode` próprio diferente do global) e mostra `queueExportMixedModeBadge` ("Lote com modos mistos — exportação uniforme usará o modo global"); senão, mostra `queueExportUniformTooltip` ("O vídeo final usa o mesmo modo/estilo para todas as cenas"). Documenta o comportamento da exportação em lote (D04: lote uniforme, não misto) que antes era implícito. i18n (3 locales): 2 novas chaves.

- **Limites de segurança no pipeline vetorial** (`src/features/speed-paint/lib/vectorizer.ts`, ~170 linhas): reintroduzido `MAX_PATHS_PER_SCENE = 500` e adicionado `MAX_D_BYTES_PER_SCENE = 250_000` (UTF-16, ≈375KB base64) — protege `renderMediaOnWeb` contra o erro `Failed to convert SVG to image` ao decodificar SVGs excessivamente grandes. `applyVetorialSafetyLimits` aplica 3 camadas: (1) sanitização numérica via `sanitizePathOrNull` (descarta `d` inválido, `length === 0` ou NaN, normaliza `strokeWidth` inválido para 1), (2) limite de quantidade com log único, (3) limite de bytes acumulado E defesa em profundidade para path individual oversized. Exportado via namespace `__testing` para testes determinísticos (`applyVetorialSafetyLimits`, `sanitizePathOrNull`, `MAX_PATHS_PER_SCENE`, `MAX_D_BYTES_PER_SCENE`, `SVG_PATH_DATA_REGEX`). Aplicado em ambos os pipelines (`vectorizeImageLegacy` e `vectorizeImageEdgeBezier`). Testes em `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts` (315 linhas, 17 testes) cobrem os 3 limites, sanitização e regex de validação (que exclui `e`/`E`/`+`/`NaN`/`%` para fechar vetor de paths malformados upstream).

- **`MAX_PATHS_PER_SCENE=500` reintroduzido** — alinhado com o teste e2e `imageProcessing.vetorial.e2e.test.ts:608`. Documentado em `docs/plan/edge-detection-whiteboard-architecture.md §8.5` (origem do valor). A v0.133.0 havia removido esse limite confiando apenas no filtro de compacidade; a reintrodução é defesa em profundidade contra regressões do vetorizador upstream.

- **`contourIndex` em `BezierPath`** (`src/features/speed-paint/lib/bezierFitting.ts`, novo campo opcional): marca o índice do `Contour` de origem em cada `BezierPath` produzido por `fitBezierPaths`. Usado por `sampleColors` em `vectorizer.ts` para parear path↔contour mesmo após `fitBezierPaths` descartar contornos degenerados — sem isso, a cor sampleada trocava quando havia descarte (`bezierPaths[i]` deixava de corresponder a `contours[i]`). Opcional para retrocompatibilidade com testes que constroem `BezierPath` manualmente (`sampleColors` faz fallback posicional). Testes atualizados em `tests/speed-paint/bezierFitting.unit.test.ts`.

- **`canvasColor` em `GetStrokeAnimation`/`SetStrokeAnimation`** (`src/features/video-render/lib/strokeCache.ts`): adicionado como discriminador no cache LRU em **ambos** os modos (vetorial filtra paths invisíveis; mask determina background da cena). Sem isso, alternar o fundo após cache HIT devolvia a animação com fundo antigo (W2). Chave SHA-256 inclui agora `mode + preset + sortOrder + canvasColor` — 4 dimensões, evita colisão total.

- **`fitMode` prop em `WhiteboardScene`** (`src/features/video-render/components/WhiteboardScene.tsx`): aceita `'contain' | 'cover' | 'fill' | 'none'` para ajuste do SVG ao container do Remotion. Default `'contain'` (escala para caber, preserva proporção). Espelha o `fitMode` que `SpeedPaintScene` (modo mask) já aceitava no batch. Resolve bug onde cenas com proporção diferente da composição no batch ficavam desalinhadas no canto superior esquerdo (F4). `VetorialBatchSceneWrapper` em `speedPaintRenderController.tsx` propagou `fitMode="contain"` por padrão.

- **`VetorialEasingType` no pipeline de export** (`src/features/speed-paint/hooks/useSpeedPaintExporter.tsx`, `src/features/speed-paint/store/speedPaintRenderController.tsx`): novas opções `easing?: VetorialEasingType` em `SpeedPaintExportOptions` e `SpeedPaintBatchExportOptions`. Propagação completa: UI (`SpeedPaintPage.startBatchRender`, `SpeedPaintExportPanel.handleStartExport`) → hook fachada → controller → composições (`WhiteboardComposition` recebe, `WhiteboardScene` aplica via `interpolate(... , { easing })`). Fecha o gap do "controle morto" do seletor de easing.

- **`canvasColor` no pipeline de export** (`hooks/useSpeedPaintExporter.tsx`, `store/speedPaintRenderController.tsx`, `lib/imageProcessing.ts`): novas opções `canvasColor?: 'white' | 'black'` em `SpeedPaintExportOptions` e `SpeedPaintBatchExportOptions`. Propagação completa: store → hook fachada → controller → `generateStrokesFromImage` (F2 da auditoria). Antes desta propagação, o pipeline hardcodava `'white'` em 4 lugares, ignorando a escolha do usuário no seletor `useAnimationStore.canvasColor`. `VetorialAnimation.canvasColor`/`StrokeAnimation.canvasColor` agora refletem a preferência.

- **`useVoicePreviews` — proteção contra falsos positivos pós-navegação** (`src/hooks/useVoicePreviews.ts`, +119/-22 linhas vs versão v0.135.0): 5 mecanismos adicionados que blindam o hook contra falsos positivos de log (Chrome dispara `onerror` ao abortar/limpar `<audio>`):
  1. `sessionTokenRef` (contador incremental) — callbacks de áudio (`play().catch`, `onerror`, `onended`) verificam `isStale()` antes de aplicar efeito colateral; eventos atrasados de áudio antigo são descartados
  2. Cleanup de unmount em `useEffect` — zera `onerror`/`onended` e revoga `src` antes do garbage collector coletar o `<audio>`, evita log pós-navegação e warning React de `setState-after-unmount`
  3. Lógica condicional `code === 4 && audio.src === ''` — silencia o caso degenerado onde Chrome dispara `onerror` com code 4 ao limpar `src=''` + `load()` (decisão consciente rodada 6, restauração do ramo condicional que o round 5 removeu)
  4. `setErrorId(null)` em `stop()` — evita que o indicador de erro persista indefinidamente após `stop()` quando o seletor do Inspector tem auto-clear de 3s mas o de Configurações não (S7)
  5. `clearError` exposto no retorno do hook — consumidores podem resetar erro programaticamente

  Cobertura de testes: `tests/hooks/useVoicePreviews.unit.test.ts` (+424/-5, MockAudio com helpers de rejeição controlada, 14 testes totais — 12 novos nesta release) — valida cada `MediaError.code` (0/1/2/3/4) e o caminho `isStale()` do `play().catch` assíncrono tardio.

- **`pencilFxId` via `useId()` no `WhiteboardScene`** (`src/features/video-render/components/WhiteboardScene.tsx`): antes hardcoded `id="pencil-fx"` — em cenários com múltiplos `<WhiteboardScene>` renderizados juntos (batch com várias cenas em paralelo durante scrubbing no Remotion Studio), o filtro do `<defs>` da segunda cena era ignorado porque `url(#pencil-fx)` resolvia para o primeiro `<defs>` do documento SVG (resolução por documento, não por árvore React). Agora cada cena tem ID único via `useId` do React 19 — `pencil-fx-{useId()}`. `Pencil` interno recebe `pencilFxId` via prop. F7 da auditoria.

- **4 novas chaves i18n** (3 locales: pt-BR/en/es): `canvasColorReprocessHint` (com placeholders `{from}` e `{to}`), `canvasColorReprocessAction`, `queueExportUniformTooltip`, `queueExportMixedModeBadge`. Total adicionado: 4 chaves × 3 locales = 12 entries.

### Alterado

- **`SpeedPaintPage` propaga `easing`/`canvasColor` para o batch** (`src/pages/SpeedPaintPage.tsx`, +30 linhas): o efeito de "iniciar exportação em lote" lê `renderMode`/`vetorialPreset`/`vetorialSortOrder`/`canvasColor`/`easing` da store via `useAnimationStore.getState()` e passa para `startBatchRender`. Antes, o batch sempre re-exportava em mask e o `sortOrder`/`canvasColor`/`easing` caíam no default — divergência silenciosa entre preview e export reproduzida nas auditorias W2 + W-B. A infra-estrutura no controller já aceitava a propagação desde a v0.133.0 — bastava a UI passar.

- **`BatchOrchestrator` propaga `vetorialSortOrder` no preview** (`src/features/speed-paint/components/batch/BatchOrchestrator.tsx`, +20 linhas): a chamada `generateStrokesFromImage` agora inclui `vetorialSortOrder` (lido via `getState()` no momento da chamada, não via subscription — ver W3 abaixo) e `canvasColor` do store. Antes, o preview watch caía na ordem natural (varredura raster) enquanto o record exportava na ordem do seletor — divergência silenciosa que reproduzia a classe de bug do W-B.

- **`BatchOrchestrator` usa seletor granular `s.job.status`** (`src/features/speed-paint/components/batch/BatchOrchestrator.tsx`): antes lia `s.job` (objeto inteiro) e re-renderizava 30×/s durante processamento porque `setJob({progress: 0.5})` cria nova referência do objeto `job`. Agora só re-renderiza quando `status` muda (`idle → processing → completed → failed`) — o callback de progresso muta o store, mas o seletor retorna o mesmo primitivo. Validação via `React.Profiler` em novo teste de `tests/speed-paint/BatchOrchestrator.component.test.tsx` (S5).

- **`canvasColor` lido via `getState()` no momento da chamada** (`BatchOrchestrator.tsx`, `SpeedPaintPage.reprocessCurrentImage`): em vez de subscription + dep no `useEffect`, `canvasColor` é lido via `useAnimationStore.getState()`. Incluir nas deps faria o cleanup do useEffect abortar o processamento em curso SEM reiniciar (o corpo só reinicia com novo `currentImgId`), deixando o job eternamente em `'processing'`. Mesmo padrão aplicado a `vetorialSortOrder` (W3 da auditoria).

- **`reset()` do `speedPaintRenderController` preserva `codec`/`container`** (`src/features/speed-paint/store/speedPaintRenderController.tsx`, ~3 linhas): antes zerava para os defaults `'h264'`/`'mp4'` ao chamar `...INITIAL_STATE`, sobrescrevendo o fallback VP8/WebM que `useCodecSupport` resolveu para browsers sem H.264 (ex: Firefox Linux). Agora lê `get().codec` e `get().container` antes do set, preserva os valores resolvidos. F1 da auditoria.

- **F1 — falhas de validação em `runSingleRender`/`runBatchRender` setam `status: 'failed'` em vez de `return;` silencioso** (`speedPaintRenderController.tsx`, 3 sites): `imageSource` ausente no modo mask, `items.length === 0` no batch, e `firstAnimation` undefined após loop de geração. Antes, a UI ficava eternamente em estado idle após validação inválida — sem feedback. Agora a UI mostra o motivo em `<Alert severity="error">` (F14).

- **`runSingleRender`/`runBatchRender` propagam `canvasColor` para `generateStrokesFromImage`** (`speedPaintRenderController.tsx`, +3 linhas): o `imageData` enviado ao pipeline vetorial agora carrega a cor de fundo da preferência — antes hardcodava `'white'` no `filterPathsByBackgroundContrast` interno.

- **Defesa em profundidade em `strokeWorker.ts` (F6)** (`src/features/video-render/lib/strokeWorker.ts`, +30 linhas): `createStrokeWorker` agora captura a exceção do construtor `new Worker(url)` (CSP restritivo, sandbox sem permissão para Blob workers, navegadores que honram COEP sem instanciar o worker) com try/catch — revoga a Blob URL e relança com mensagem clara `"Falha ao criar Web Worker: ..."` + `cause` (ES2022) para preservar stack traces. Sem o try/catch, a exceção vira unhandled rejection no caller e o fallback main-thread não é acionado de forma limpa. Espelha o padrão de `processVetorialInWorker` em `imageProcessing.ts` (F10).

- **Timeout de `processSceneInWorker` NÃO chama `terminateStrokeWorker`** (`strokeWorker.ts`): o worker é compartilhado entre múltiplas cenas do lote (`speedPaintRenderer.ts` cria 1 worker por lote e reusa) — terminá-lo mataria as cenas seguintes. Agora apenas remove os listeners desta cena específica e marca como timed out local. Caller decide se quer recriar o worker (já tem fallback para main-thread por cena no caso de falha). W5.

- **`sampleColors` usa `path.contourIndex ?? i`** (`src/features/speed-paint/lib/vectorizer.ts`): pareamento path↔contour agora usa `path.contourIndex` quando presente (setado por `fitBezierPaths` desde a v0.133.0), fallback para índice posicional `i` para retrocompatibilidade com callers que constroem `BezierPath` manualmente. Sem isso, cores trocavam quando `fitBezierPaths` descartava contornos degenerados.

- **`getMinY`/`distFromCenter` migrados para `matchAll` com grupos capturados** (`vectorizer.ts`, +5 linhas): antes usavam `String.match` + `split(/\s+/)` que quebrava em paths com coords negativas adjacentes à letra (`M-5 10` virava `['M-5', '10']` → `parts[2]` undefined → Y=0 silencioso, reverter ordem do `top-down`). Agora `matchAll` com flag `g` preserva os grupos `[1]`/`[2]` (X, Y) — narrowing real, sem split frágil. S1 da auditoria.

- **`svg` com `maxWidth`/`maxHeight` quando `fitMode !== 'none'`** (`WhiteboardScene.tsx`): quando `fitMode !== 'none'`, o SVG preenche o container (que é o `AbsoluteFill` = 100% do frame). Combinado com `preserveAspectRatio` acima, produz o fit esperado (F4).

- **`SVG_PATH_DATA_REGEX` excluindo `e`/`E`/`+`** (`vectorizer.ts`): proteção contra `NaN`/`Infinity` injetados por libs upstream. Regex cobre os 16 comandos SVG padrão (`MmLlHhVvCcSsQqTtAaZz`), dígitos, separadores e whitespace válido em XML 1.0. Trocar `\s` por `[ \t\r\n]` explícito fecha o vetor de vertical tab/form feed (ilegais em XML 1.0).

- **`maxW=1920`/`maxH=1080` consistente entre imageProcessing principal + fallback main-thread** (`imageProcessing.ts`): antes do fix W3 da auditoria, o catch global não estava presente — qualquer throw síncrono (`canvas.getContext('2d')` retornando null, `getImageData` lançando, exceção em `processVetorialOnMainThread`) virava unhandled rejection e a Promise nunca settle — o job ficava eternamente em 'processing'.

### Corrigido

- **Falsos positivos de log de erro em `useVoicePreviews`** (`src/hooks/useVoicePreviews.ts`): o Chrome dispara `onerror` com code 4 ao atribuir `src = ''` num `<audio>` ativo ou ao abortar um `Audio` em reprodução (ver `MediaError.code = MEDIA_ERR_SRC_NOT_SUPPORTED`). Sem a guarda, o hook logava `"Não foi possível carregar o preview de voz X"` falso + setava `errorId`, exibindo o indicador de erro indefinidamente até o próximo `playPreview`. Solução: tokens de sessão + cleanup de unmount + condicional `code === 4 && audio.src === ''` (decisão consciente da rodada 6 da auditoria interna). 12 novos testes em `tests/hooks/useVoicePreviews.unit.test.ts` (+424 linhas, MockAudio + helpers de rejeição controlada).

- **Promise não settle em `processVetorialInWorker` quando `new Worker(url, {type:'module'})` lança** (`imageProcessing.ts`): o construtor lança `Error` em Safari <15, Chrome <80 e CSPs com `worker-src` restritivo. Sem try/catch, a exceção vira unhandled rejection e a Promise externa nunca settle — o job fica travado em `'processing'` no `BatchOrchestrator`, sem log, sem fallback. Solução: try/catch + delegação para `processVetorialOnMainThread` (espelhando padrão do `mask` Worker nas linhas 468-475). Teste em `tests/speed-paint/imageProcessing.workerFallback.unit.test.ts` (175 linhas) simula CSP restritivo e valida fallback.

- **`BatchOrchestrator` travado em 'processing' por throw síncrono no `onload` handler** (`imageProcessing.ts`): o `img.onload` async handler agora tem try/catch global — qualquer throw (canvas.getContext retornando null, getImageData lançando, exceção no vetorizador) vira `rejectOnce` da Promise do executor. Antes, exceção não capturada virava unhandled rejection e o job ficava eternamente em 'processing' no BatchOrchestrator. W3.

- **Worker timeout matando lote inteiro** (`strokeWorker.ts`): `processSceneInWorker` timeout (60s) chamava `terminateStrokeWorker(worker)` — mas o worker é compartilhado entre múltiplas cenas do lote (`speedPaintRenderer.ts` cria 1 por lote e reusa). Terminá-lo matava as cenas seguintes. Agora apenas remove os listeners desta cena e marca como timed out local. W5.

- **`useEffect` cleanup no `BatchOrchestrator` abortava processamento ao trocar `canvasColor`** (`BatchOrchestrator.tsx`): `canvasColor` agora é lido via `getState()` no momento da chamada, NÃO via subscription + dep no `useEffect`. Incluir nas deps fazia o cleanup do useEffect abortar o processamento em curso SEM reiniciar (o corpo só reinicia com novo `currentImgId`), deixando o job eternamente em `'processing'`. W3.

- **Re-render 30×/s no `BatchOrchestrator` durante progresso** (`BatchOrchestrator.tsx`): seletor `s.job` (objeto inteiro) re-renderizava a cada `setJob({progress: 0.5})` (nova referência). Trocado por `s.job.status` (primitivo) — só re-renderiza quando `status` muda. S5.

- **`sortPaths('top-down'|'center-out')` quebrando com coords negativas** (`vectorizer.ts`): `String.match` + `split(/\s+/)` interno quebrava em `M-5 10` (`M-5` ficava inteiro em `parts[0]`, Y caía em fallback `?? '0'`). Migrado para `matchAll` com flag `g` (preserva grupos `[1]`/`[2]`). Testes de regressão em `tests/speed-paint/vectorizer.unit.test.ts` (S1).

- **`reset()` do controller zerando codec fallback** (`speedPaintRenderController.tsx`): `...INITIAL_STATE` zerava `codec`/`container` para `'h264'`/`'mp4'` padrão, sobrescrevendo o fallback VP8/WebM que `useCodecSupport` resolveu para browsers sem H.264. F1.

- **`reset` quebrando fallback de codec em Firefox Linux** (`speedPaintRenderController.tsx`): usuário exporta com sucesso em Firefox (VP8/WebM) → chama reset → tenta re-exportar → volta para H.264/MP4 → falha. F1.

- **Alert UX ausente para divergência de `canvasColor`**: usuário trocava o seletor de cor no SpeedPaintPage mas o `job.animation.canvasColor` ficava desatualizado até a próxima regeneração — paths fantasma no preview. S2 da auditoria — agora alert info com ação de reprocessar.

### Validação

- `bun run lint` → EXITCODE=0 ✅
- `bun run typecheck` → EXITCODE=0 ✅
- `bun run test` → suíte completa passando ✅ (delta estimado: +~1500 linhas de teste entre 4 arquivos novos `vectorizer.safetyLimits`, `imageProcessing.workerFallback`, `CanvasColorAlert`, `easingConverter` e modificações em `useVoicePreviews`, `BatchOrchestrator`, `bezierFitting`, `imageProcessing.vetorial`, `vectorizer`, `WhiteboardScene`, `strokeWorker`)

---

## [0.135.0] - 2026-07-28

### Adicionado

- **Helper `appDrawerBackdropSx` em `theme/surfaces.ts`** (+21 linhas): novo helper `SxProps<Theme>` exportado de `src/theme/surfaces.ts` (`appDrawerBackdropSx`) — centraliza o estilo do `Backdrop` (fundo escurecido) dos Drawers laterais temporários (`MobileBottomNav`, `GuestMobileNav`, `PublicHeader`). Padroniza `backdropFilter: blur(8px)` (com prefixo `-webkit-` para Safari iOS) e `backgroundColor: BLACK_40` (40% preto). Antes, apenas o `MobileBottomNav` tinha backdrop blur; os outros 2 Drawers usavam o backdrop default do MUI (sem blur, inconsistente visualmente). Padrão oficial MUI v9 confirmado via NotebookLM: `BackdropProps` foi removido na v9 em favor de `slotProps.backdrop`. JSDoc extensivo documenta o padrão de uso (`slotProps={{ backdrop: { sx: appDrawerBackdropSx } }}`) e o motivo da inconsistência anterior.

- **4 testes para `appDrawerBackdropSx`** (`tests/theme/surfaces.unit.test.ts`): valida que o helper é um `SxProps<Theme>` (objeto literal, não função), aplica blur 8px consistente, define `WebkitBackdropFilter` para compatibilidade Safari iOS, e usa o token `BLACK_40` literal `rgba(0, 0, 0, 0.40)` (teste de contrato — detecta mudanças no token).

### Alterado

- **3 Drawers laterais migrados para `slotProps.backdrop`** (`MobileBottomNav.tsx`, `GuestMobileNav.tsx`, `PublicHeader.tsx`): o `MobileBottomNav` migrou do padrão legado `sx={{ '& .MuiBackdrop-root': {...} }}` (seletor descendente CSS, considerado menos idiomático na v9) para `slotProps={{ backdrop: { sx: appDrawerBackdropSx } }}`. Os outros 2 Drawers (`GuestMobileNav`, `PublicHeader`) ganharam `slotProps.backdrop` (antes não tinham backdrop blur — agora têm blur 8px consistente). O `MobileBottomNav` deixou de importar `BLACK_40` de `tokens.ts` (encapsulado no helper).

- **Sidebar migrada para spread de `appDrawerPaperSx`** (`src/components/app/Sidebar.tsx`): o `Drawer` permanente da Sidebar (variante `variant="permanent"`) usava inline `backgroundColor: APP_SURFACE`, `backgroundImage: linear-gradient(180deg, ...)`, `borderRight: 1px solid APP_BORDER` — exatamente os mesmos 3 valores do helper `appDrawerPaperSx` criado na v0.134.0. Agora usa `{ ...appDrawerPaperSx, width, boxSizing, transition, overflowX, backdropFilter, height, zIndex }` via spread. Tokens `APP_SURFACE`, `WHITE_05`, `WHITE_015` removidos dos imports (não mais usados). Ganhou `WebkitBackdropFilter: 'blur(22px)'` no `backdropFilter` adicional (era preexistente sem o prefixo Safari).

- **Webkit prefix adicionado em 18 ocorrências preexistentes** (`backdropFilter: 'blur(...)'` sem o prefixo `-webkit-`): correção cross-browser Safari iOS aplicada em 14 arquivos (`Configuracoes.tsx`, `Assistant.tsx`, `FeedbackDialog.tsx`, `StudioPage.tsx`, `GalleryCard.tsx` 3x, `AssistantComposer.tsx` 2x, `CaptionEditorPanel.tsx`, `SpeedPaintScene.tsx`, `SubtitlePreview.tsx`, `ManualProjectForm.tsx`, `QueueStaging.tsx` 2x, `assistantUi.ts`, `subtitle-editor/constants.ts`). Além disso, o `glassPanelSx` em `surfaces.ts` e o Paper da bottom nav em `MobileBottomNav.tsx` ganharam `WebkitBackdropFilter` (ambos eram preexistentes sem prefixo). Também o `ScriptEditor.tsx:302` ganhou `WebkitBackdropFilter: 'none'` (override defensivo — antes só desabilitava a propriedade padrão, não a prefixada). Total: **20 propriedades `backdropFilter` agora com `WebkitBackdropFilter` emparelhado** (1:1 em todos os arquivos do projeto, incluindo o CSS `index.css` que já tinha ambos os prefixes).

- **5 escape hatches de mock documentados** (`assistantUi.unit.test.ts`, `ConfiguracoesPage.component.test.tsx`, `SpeedPaintControls.unit.test.tsx`, `CaptionEditorPanel.unit.test.tsx`, `VideoExportPanel.unit.test.tsx`): cada teste agora tem um comentário explícito listando quais exports de `src/theme/surfaces` ele importa (`insetPanelSx`, `glassPanelSx`, `glassSurfaceSx`, `appDrawerPaperSx` em combinações diferentes) e declarando quais NÃO importa (`searchFieldSx`, `appDrawerBackdropSx`). Documenta o risco de drift: se o componente sob teste passar a importar um export não-stubbed, o teste quebra e o desenvolvedor sabe exatamente o que adicionar. Padrão recomendado para mocks inline parciais.

### Corrigido

- **JSDoc do `appDrawerBackdropSx`** (`src/theme/surfaces.ts:70-77`): o exemplo de uso tinha dois `slotProps={{...}}` separados (segundo sobrescrevia o primeiro — código JSX inválido). Agora mostra um único `slotProps={{ backdrop: { sx: appDrawerBackdropSx }, paper: { sx: appDrawerPaperSx } }}`. Bug introduzido na implementação inicial da v0.135.0, corrigido na auditoria subsequente.

### Validação

- `bun run lint` → EXITCODE=0 ✅
- `bun run typecheck` → EXITCODE=0 ✅
- `bun run test` → **2617/2617 testes passando** ✅ (3 rodadas, ~3min cada)

---

## [0.134.0] - 2026-07-28

### Adicionado

- **Helper compartilhado `animations.ts`** (`src/theme/animations.ts`, novo arquivo — 31 linhas): `exportDotPulseKeyframes` extraído como `SxProps<Theme>` reutilizável, contendo o `@keyframes exportDotPulse` usado pelo indicador pulsante de export de vídeo na bottom nav. Consumido por `SidebarNavItem.tsx` e `MobileBottomNav.tsx` via **array syntax** do MUI v9 (`sx={[exportDotPulseKeyframes, {...}]}`) — padrão recomendado pelo notebook MUI v9, que adverte contra spread de `SxProps` por poder quebrar silenciosamente se a constante for refatorada para callback function no futuro. Elimina duplicação de ~10 linhas de keyframes que existia inline nos 2 componentes.

- **Helper `appDrawerPaperSx` em `theme/surfaces.ts`** (+16 linhas): novo helper `SxProps<Theme>` exportado de `src/theme/surfaces.ts` (`appDrawerPaperSx`) — centraliza `backgroundColor`, `backgroundImage` (gradiente vertical sutil) e `borderRight` para que os Drawers laterais de navegação (`MobileBottomNav`, `GuestMobileNav`, `PublicHeader`) tenham exatamente a mesma aparência de superfície. Drawers que precisam de personalização adicional (ex: `MobileBottomNav` define `width: 280`) estendem o objeto via spread. JSDoc extensivo documenta o padrão de uso.

- **Factory mock compartilhado de `surfaces` em testes** (`tests/__mocks__/surfacesMock.ts`, novo arquivo — 36 linhas): objeto literal `surfacesMock` exportado com stubs idênticos para todos os 5 helpers de `src/theme/surfaces.ts` (`glassPanelSx`, `insetPanelSx`, `glassSurfaceSx`, `appDrawerPaperSx`, `searchFieldSx`). Documentação inline explica o motivo do helper existir e por que usa **import dinâmico dentro do factory `vi.mock`** (não helper externo) — padrão oficial do Vitest 4 confirmado por NotebookLM: o `vi.mock` é hoisted antes dos `import` estáticos, então QUALQUER função importada externamente fica `undefined` no momento da execução do factory. JSDoc explica o uso canônico.

### Alterado

- **33 testes migrados para o factory `surfacesMock`** (33 arquivos): `vi.mock('../../src/theme/surfaces', () => ({...stubs...}))` substituído por `vi.mock(path, async () => { const { surfacesMock } = await import('../../__mocks__/surfacesMock'); return surfacesMock; })`. 5 testes mantêm mocks inline (escape hatch documentado): `assistantUi.unit.test.ts` (depende de `insetPanelSx` customizado com `backgroundColor`+`borderRadius`), `ConfiguracoesPage.component.test.tsx`, `SpeedPaintControls.unit.test.tsx`, `CaptionEditorPanel.unit.test.tsx`, `VideoExportPanel.unit.test.tsx` (valores `p: 2`/`borderRadius: 3` arbitrários mas mantidos como estão para evitar regressão não verificada). Benefício: adicionar novo export a `surfaces.ts` requer atualizar **1 arquivo** (`surfacesMock.ts`) em vez de descobrir via teste quebrado em 33 lugares. Suíte completa: 2613/2613 passando.

- **`vitest.config.ts` configurado contra flakies de carga**: `pool: 'forks'` (default do Vitest 4, explicitado para documentar a intenção), `testTimeout: 15000` (era 5000ms), `hookTimeout: 20000` e `maxWorkers: '50%'`. Resolve 4 flakies pré-existentes (`SpeedPaintPage`, `ScriptEditor`, `lib-data`) que excediam 5s sob carga da suíte completa (~4min, 2.5k testes disputando CPU/disco). Sintaxe do Vitest 4: `poolOptions` foi removido nesta versão; `maxWorkers` substitui os antigos `maxThreads`/`maxForks`.

- **`MobileBottomNav.tsx` simplificado** (+64/-54): 7 `useCallback` redundantes removidos — `handleMoreClick`, `closeDrawer`, `handleOpenLogoutDialog`, `handleCloseLogoutDialog`, `handleConfirmLogout`, `handleOpenDeleteAccountDialog`, `handleCloseDeleteAccountDialog`. Todos seguem o mesmo padrão do `handleNavigate`: passados como `onClick`/`onClose`/`onConfirm` para componentes MUI não-memo. Notebook React 19 confirma: `useEvent` não existe; `useEffectEvent` só pode ser chamado dentro de `useEffect`. A recomendação oficial é função simples ou `useCallback` com propósito real — escolhemos função simples. Import de `useCallback` removido. Suíte completa: 2613/2613 passando sem regressão.

- **`SidebarNavItem.tsx` e `MobileBottomNav.tsx` consomem `exportDotPulseKeyframes` via array syntax**: conforme recomendação oficial do MUI v9. Antes usavam spread `...exportDotPulseKeyframes`, que pode quebrar silenciosamente se o helper for refatorado para callback function no futuro.

### Limitado (documentado, fora do escopo)

- **Escopo expandido em ondas anteriores** (pacote de melhorias, 3 ondas): além dos 4 itens explicitamente solicitados, foram entregues também: extração de `appDrawerPaperSx` para 3 Drawers, migração de `ModalProps={{ keepMounted: true }}` para padrão MUI 9 (default `false`), fix de a11y do drawer mobile (`aria-controls`/`aria-expanded`/`aria-label` consistente), `DeleteAccountDialog` migrado de evento global (`open-delete-account-dialog`) para estado local no `MobileBottomNav` (cada nav cuida do seu dialog — SRP), `AnalyticsConsentPrompt.actionPlacement` corrigido de `'stack'` para `'bottom'` (stack só funciona em column direction), `Sidebar.tsx` removido listener dead code, JSDoc de `DeleteAccountDialog` atualizado. Cada onda foi autorizada explicitamente pelo usuário em iterações anteriores.

---

## [0.133.0] - 2026-07-24

### Adicionado

- **Web Worker para pipeline vetorial** (`src/features/speed-paint/lib/vetorialWorker.ts`, novo arquivo — 139 linhas): Worker dedicado para o pipeline edge+bezier do modo vetorial no Speed Paint. Processa Canny edge detection, Moore-Neighbor contour tracing e cubic Bézier fitting off the main thread, eliminando bloqueio da UI em roteiros com muitas cenas. Integrado via `useEdgeWorker` em `imageProcessing.ts` com guardas de runtime (`supportsVetorialWorker`) e fallback para processamento no thread principal.
- **`SceneRenderModePanel`** (`src/features/video-render/components/SceneRenderModePanel.tsx`, novo arquivo — 226 linhas): painel de seleção de modo de renderização por cena no editor de vídeo. Exportado barrel de `src/features/video-render/index.ts`. Utilizado em `VideoPage.tsx`. Suporta `sceneRenderMode` i18n nos 3 locales.
- **Utilitários de geometria em `vectorizer.ts`**: `polygonArea()`, `polygonPerimeter()`, `filterContoursByCompactness()` — usados pelo pipeline edge+bezier para filtrar e classificar contornos por compactidade antes da vetorização.
- **Namespace i18n `sceneRenderMode`** adicionado aos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`): chaves para o seletor de modo de renderização de cena no editor de vídeo.
- **`useEdgeWorker`** em `imageProcessing.ts` — hook que verifica suporte do navegador a Web Workers e direciona o processamento vetorial para o worker dedicado quando o preset é do tipo edge.
- **`processVetorialInWorker`** em `imageProcessing.ts` — função que envia requisições de vetorização para o Web Worker e retorna a Promise com o resultado.
- **`SceneWithRenderMode`** interface em `speedPaintRenderer.ts` — tipo que propaga `renderMode`/`vetorialPreset` por cena para o renderer.

### Alterado

- **Presets vetoriais — remoção de presets legados** (`src/features/speed-paint/types/vetorial.ts`): presets clássicos removidos (`posterized1`, `posterized2`, `posterized3`, `curvy`). `VetorialPreset` reduzido para valores compatíveis com o pipeline edge+bezier e legado imagetracerjs.
- **`VetorialPresetGroupId`** redefinido em `vetorialPresets.ts` — agrupamento dos presets atualizado para refletir os presets remanescentes.
- **`DEFAULT_MIN_CONTOUR_LENGTH`** em `contourTracing.ts` — valor de implementação alterado para otimizar a detecção de contornos no pipeline edge+bezier.
- **`DEFAULT_VETORIAL_PRESET`** em `animationStore.ts` e `strokeCache.ts` — padrão alterado para `'edge-default'` (era `'artistic1'`), refletindo o novo edge+bezier como preset inicial.
- **`videoRenderBridge.ts`** — preset padrão de vetorial alterado para `'edge-default'` como `'vetorialPreset'`.
- **`speedPaintService.ts`** — propagação de `renderMode`/`vetorialPreset` por cena para o renderer, documentado com comentário de versão (v0.133.0). Cena sem esses campos cai no fallback global (`options`).
- **`speedPaintRenderer.ts`** — removida exportação `scenes` (substituída por `SceneWithRenderMode`); adicionada interface `SceneWithRenderMode` para tipagem explícita da cena com modo de renderização.
- **`SceneSequence.tsx`** — removido handler `onError` do componente `<Img>` (simplificação do tratamento de erros).
- **`SpeedPaintScene.tsx`** — tratamento de erro melhorado com `try/catch` ao redor de `cancelRender`.
- **`WhiteboardScene.tsx`** — adicionada constante `TRANSITION_FRACTION` (0.05) para transição suave entre strokes na animação da caneta.
- **Tests de speed-paint e video-render** — todos os fixtures de preset atualizados de `'artistic1'`/`'detailed'`/`'curvy'` para `'edge-default'`/`'edge-bold'`.
- **`firestore.rules`** — removida função `isValidProjectVideo` (16 linhas) que validava subcoleção de vídeos com campos específicos.

### Corrigido

- **Tratamento de erro no SpeedPaintScene** — `cancelRender` agora envolto em `try/catch` para evitar propagação de exceções não tratadas quando o render já foi cancelado.
- **`MAX_PATHS_PER_SCENE` e `truncatePaths`** — removidos de `vectorizer.ts` (funções obsoletas cuja lógica de compactação foi absorvida por `filterContoursByCompactness`).

---

## [0.132.0] - 2026-06-16

### Adicionado

- **Pipeline edge+bezier — novo motor de vetorização para o modo Desenho** (`src/features/speed-paint/lib/`):
  - `edgeDetection.ts` (+580 linhas): detecção de bordas Canny simplificada com suporte a 6 presets de borda (`EdgePresetName` — `low`, `medium`, `high`, `fine`, `thick`, `custom`)
  - `contourTracing.ts` (+412 linhas): Moore-Neighbor contour tracing com regra de Jacob Eliosoff — rastreia contornos a partir da imagem de bordas
  - `bezierFitting.ts` (+584 linhas): ajuste de curvas Bézier cúbicas para contornos — produz paths SVG (`d` attributes) suaves e com menos pontos
  - `vectorizer.ts` (+650/-63 linhas): reestruturado — `vectorizeImageEdgeBezier()` (novo pipeline), `vectorizeImageLegacy()` (imagetracerjs preservado), `sortPaths()` com 4 estratégias (`top-down`, `center-out`, `big-first`, `natural`), `filterPathsByBackgroundContrast()` (filtro heurístico de paths de fundo)
  - O pipeline edge+bezier coexiste com o legado `imagetracerjs` — o seletor de preset decide qual motor usar (`edge-*` family → edge+bezier, demais → imagetracerjs)
  - `constants/vetorialPresets.ts` (+143 linhas): 20 valores de `VetorialPreset` agrupados em 7 grupos para a UI (Clássico, Posterizado, Artístico, Detalhado, Borda-fina, Borda-média, Borda-grossa)
  - Novos tipos: `EdgePresetName`, `VetorialPathSortOrder` (`'top-down' | 'center-out' | 'big-first' | 'natural'`), `VetorialEasingType` (`'linear' | 'smooth' | 'bounce'`)

- **Controles UI do modo Desenho expandidos** (`SpeedPaintPage.tsx`, +545 linhas):
  - **Seletor de preset** (`<Select>` com `ListSubheader`): 20 presets em 7 grupos — Label + descrição, ícone temático (AutoAwesome, Shuffle, SportsBaseball, Water, Timeline, CenterFocusStrong, KeyboardArrowDown)
  - **Seletor de ordem de desenho** (`VetorialPathSortOrder`): `<Select>` com 4 opções — `top-down` (cima pra baixo), `center-out` (centro pra fora), `big-first` (maiores primeiro), `natural` (ordem de tracing)
  - **Seletor de easing** (`VetorialEasingType`): `<Select>` com 3 opções — `linear`, `smooth`, `bounce`
  - `handleRenderModeChange` reescrito com race protection, cache lookup antes de generate e reprocessamento automático
  - Guardas de runtime (`isVetorialPreset`, `isVetorialSortOrder`, `isVetorialEasingType`) para validar valores de selects
  - Acessibilidade: `aria-describedby` com helper text descritivo, labels nos selects

- **Persistência da ordem de desenho** (dual storage):
  - Campo `speedPaintVetorialSortOrder` em `UserSetting` (types.ts) e `StudioUserSettings` (user-settings.ts)
  - `loadSpeedPaintVetorialSortOrder()` / `saveSpeedPaintVetorialSortOrder()` em `userSettings.ts`
  - `useSyncSpeedPaintVetorialSortOrder.ts` (+73 linhas): hook em `App.tsx` com debounce 2s
  - `animationStore.ts`: defaults `DEFAULT_EASING`, `DEFAULT_VETORIAL_SORT_ORDER`

- **Batch vetorial suportado** (L5, RF-08):
  - `BatchOrchestrator.tsx` (+13/-1): lê `renderMode`/`vetorialPreset` da store via `getState()` com race protection (`processingIdRef`)
  - `speedPaintRenderController.tsx`: comentário de limitação de batch vetorial removido — batch agora aceita ambos os modos
  - `speedPaintRenderer.ts` (+105/-19): `context` estendido com `renderMode` e `vetorialPreset`

- **Propagação de modo+preset no pipeline de vídeo** (L1+L7, RF-04+RF-06):
  - `videoRenderBridge.ts` (+19 linhas): estado `renderMode`/`vetorialPreset` sincronizado
  - `videoRenderController.tsx` (+7 linhas): propagação do bridge para o pipeline
  - `videoExportPanel.tsx` (+144 linhas): toggle de modo de renderização integrado
  - `speedPaintService.ts` (+10/-2): aceita `context` com renderMode/vetorialPreset
  - `speedPaintRenderer.ts`: geração condicional baseada em modo
  - `useSpeedPaintEnhancer.ts` (+12/-2): tipos estendidos
  - `useVideoExporter.tsx` (+9 linhas): `SpeedPaintRenderMode` e `VetorialPreset` nos tipos

- **WhiteboardScene aprimorado** (`src/features/video-render/components/WhiteboardScene.tsx`, +262/-18):
  - `safeGetPointAtLength()`: fallback seguro para `getPointAtLength` (retorna `{x:0, y:0}` se path for inválido)
  - **Motion blur** no caneta: gaussian blur da ponta baseado na velocidade do traço (`computeBlurStdDev`)
  - **Tremor orgânico**: `Math.sin(frame * 0.5 + seed * 100) * 0.3` na ponta da caneta para efeito de mão humana
  - Easing function plugável: `getEasing(type)` suporta `linear`, `smooth`, `bounce`
  - Logger `createLogger('WhiteboardScene')` integrado

- **3 novos eventos analytics** (`src/lib/analytics.ts`):
  - `speed_paint_preset_changed: { preset: string }`
  - `speed_paint_sort_order_changed: { sortOrder: string }`
  - `speed_paint_easing_changed: { easing: string }`

- **i18n** (3 locales, +56-57 cada):
  - `speedPaint.presetGroups`: labels dos 7 grupos (`classic`, `posterized`, `artistic`, `detailed`, `edgeFine`, `edgeMedium`, `edgeHeavy`)
  - `speedPaint.presets`: labels individuais para cada um dos 20 presets
  - Namespace `speedPaint` expandido com chaves `sortOrder*` e `easing*`

- **Testes** (14 novos arquivos, +5417 linhas líquidas):
  - `tests/speed-paint/edgeDetection.unit.test.ts` (+495 linhas): Canny edge detection
  - `tests/speed-paint/contourTracing.unit.test.ts` (+755 linhas): Moore-Neighbor tracing
  - `tests/speed-paint/bezierFitting.unit.test.ts` (+716 linhas): Bézier curve fitting
  - `tests/speed-paint/vectorizer.unit.test.ts` (+447 linhas): 22 testes expandidos
  - `tests/speed-paint/SpeedPaintPage.component.test.tsx` (+1019 linhas): L3 (RF-01 + RF-02)
  - `tests/speed-paint/edge-vs-imagetracer.comparative.test.ts` (+1070 linhas): comparação pipelines
  - `tests/speed-paint/vectorizer.backgroundFilter.test.ts` (+310 linhas): filtro de fundo
  - `tests/speed-paint/vectorizer.landscape.regression.test.ts` (+248 linhas): regressão landscape
  - `tests/speed-paint/vetorialPresets.unit.test.ts` (+271 linhas): presets agrupados
  - `tests/speed-paint/BatchOrchestrator.component.test.tsx` (+129 linhas): batch vetorial
  - `tests/speed-paint/animationStore.unit.test.ts` (+130 linhas): easing + sort order na store
  - `tests/video-render/WhiteboardScene.component.test.tsx` (+420 linhas): caneta, blur, easing
  - `tests/video-render/VideoExportPanel.unit.test.tsx` (+72 linhas): toggle de modo
  - `tests/video-render/speedPaintRenderer.unit.test.ts` (+558 linhas): contexto estendido
  - `tests/video-render/videoComposition.component.test.tsx` (+253 linhas): branch vetorial
  - `tests/video-render/videoRenderBridge.unit.test.ts` (+51 linhas): bridge state
  - Testes existentes atualizados: `useSpeedPaintExporter.unit.test.tsx` (+7), `VideoPage.component.test.tsx` (+1), `imageProcessing.vetorial.e2e.test.ts` (fórmula de duração atualizada de 80→120ms, mínimo 2000→3000ms), `imageProcessing.vetorial.integration.test.ts` (asserções atualizadas)

- **Documentação técnica** (15+ novos arquivos):
  - `docs/plan/edge-detection-whiteboard-architecture.md` (+1002 linhas): arquitetura completa do pipeline edge+bezier com diagramas, trade-offs e análise de complexidade
  - `docs/audits/`: 10+ relatórios de auditoria — code-validator (L1, L2, L3, L5, holístico), gap-finder (holístico), security (L1, L3, holístico)

### Alterado

- **`SpeedPaintPlayer`** (`SpeedPaintPlayer.tsx`): type guard real `'paths' in animation` expandido para novos modos — `showDrawTool` e `fileName` agora obrigatórios (não mais opcionais)
- **`useSpeedPaintExporter.tsx`** (+13/-3): props `showDrawTool` e `fileName` tornadas obrigatórias (`required: true`) — eliminam `undefined` no tipo
- **`imageProcessing.ts`** (+63/-6): `renderMode`/`vetorialPreset` propagados para o pipeline; import de `VetorialPathSortOrder`
- **`strokeCache.ts`** (+41/-24): `isVetorialAnimation`/`isStrokeAnimation` type guards atualizados; `speedPaintVetorialSortOrder` incluído nas assinaturas
- **`videoComposition.tsx`** (+24/-12): branch triplo real — `WhiteboardScene` / `SpeedPaintScene` / legado, sem `as` bypass, com type guard `isVetorialAnimation`
- **`exportUtils.ts`** (+13/-3): log de erro de exportação detalhado (nome + stack + mensagem)
- **Testes de duração do vetorial**: fórmula `totalDurationMs` alterada de `max(2000, length * 80)` para `max(3000, length * 120)` — reflete maior custo do pipeline edge+bezier

### Corrigido

- **Bug "landscape sem traços"** (Teoria 1): `filterPathsByBackgroundContrast()` adicionado em `vectorizer.ts` — filtra paths de fundo com base em contraste de cor, com fallback `EDGE_FALLBACK_COLOR` se >50% dos paths forem filtrados
- **Race condition no batch**: `BatchOrchestrator.tsx` agora lê `renderMode`/`vetorialPreset` via `getState()` em vez de closure — elimina stale closure quando o usuário troca de modo durante o processamento do batch

### Limitado (documentado, fora do escopo)

- **UI de easing não exposta na interface do Speed Paint** (RF-10): easing está implementado no motor (`WhiteboardScene.getEasing()`) e na store (`animationStore`), mas o seletor de easing não foi adicionado à `SpeedPaintPage.tsx`. O easing default `smooth` é usado em todas as animações. Pendência documentada no gap-finder holístico da release.

---

## [0.131.0] - 2026-06-14

### Adicionado

- **Modo "Desenho" (vetorial) no Speed Paint** (`/app/pintura-rapida`): novo modo de renderização que substitui a revelação por máscara (raspadinha) por uma animação whiteboard — paths SVG crescendo sequencialmente com `strokeDashoffset` e caneta SVG seguindo a ponta do traço via `getPointAtLength()`. Vetorização via `imagetracerjs@1.2.6` (16 presets disponíveis) + `getLength()` do `@remotion/paths@4.0.448` para pré-cálculo determinístico. Retrocompatível: `renderMode: 'mask'` é default; projetos existentes continuam no modo "Clássico" sem alteração.
- **Seletor de modo na UI** (`SpeedPaintPage.tsx`): `ToggleButtonGroup` com ícones distintos (`FormatPaintOutlined` para Clássico, `GestureOutlined` para Desenho), glow no estado ativo, `aria-label` + `aria-describedby` + `Tooltip describeChild` para acessibilidade WCAG 2.1 AA. Troca de modo dispara `trackAnalyticsEvent('speed_paint_mode_changed', { mode })`.
- **Persistência do modo de renderização** em `UserSettings` (dual storage Firestore/IndexedDB): novo campo `speedPaintRenderMode: 'mask' | 'vetorial'` em `UserSetting` e `StudioUserSettings`; hook `useSyncSpeedPaintRenderMode` em `App.tsx` sincroniza com debounce 2s, mesmo padrão de `useAutoSaveStudioSettings`.
- **`WhiteboardScene.tsx`** (`src/features/video-render/components/`): componente Remotion determinístico que renderiza paths SVG animados + caneta SVG inline (portada de `drawTool()` Canvas 2D). Usa `useCurrentFrame` + `interpolate` + matemática pura — zero `useState`/`useEffect`/`useRef` no caminho de render. Caneta cai no fim do último path completo durante gaps entre paths (Premissa #13). Suporta `canvasColor: 'white' | 'black'` (Premissa #14).
- **`WhiteboardComposition.tsx`** (`src/features/speed-paint/components/`): wrapper Remotion do `WhiteboardScene`, análogo ao `SpeedPaintComposition`. Composição lazy `createExportableWhiteboardComposition()` no `speedPaintRenderController.tsx` selecionada automaticamente quando `renderMode === 'vetorial'`, com `compositionId` único (`'script-master-speed-paint-vetorial-export'`) para constraint do Remotion.
- **`SpeedPaintPlayer` estendido**: aceita `animation: StrokeAnimation | VetorialAnimation` e discrimina em runtime via type guard real (`'paths' in animation`) — sub-componentes `MaskPlayer`/`VetorialPlayer` com SRP; `imageSource` tornado opcional com fallback `''` no mask. `SpeedPaintExportPanel` e `useSpeedPaintExporter.tsx` (`SpeedPaintExportOptions.animation`) também estendidos para a união.
- **`vectorizer.ts`** (`src/features/speed-paint/lib/`): wrapper assíncrono de `imagetracerjs.imagedataToSVG()` com parser regex (compatível com Web Worker — sem `DOMParser`), pré-cálculo de `getLength()` por path, `AbortSignal` cooperativo (checagem a cada 50 paths), `PATHOMIT_BY_PRESET` heurístico (presets "ricos" como `'detailed'`/`'artistic4'` têm `pathomit` mais alto), `MAX_PATHS_PER_SCENE = 500` com truncamento e `log.warn` para prevenir travamento do Remotion.
- **Tipos `vetorial.ts`**: `SpeedPaintRenderMode` (discriminated union `'mask' | 'vetorial'`), `VetorialPreset` (16 valores), `VetorialPath` (d, length, color, strokeWidth) e `VetorialAnimation` (id, canvasWidth/Height, paths, totalLength, fps, sourcePreset, etc.). Re-exportados de `types.ts` para evitar import circular.
- **Cache LRU generalizada** (`strokeCache.ts`): chave SHA-256 agora inclui `{ mode, preset }` para evitar colisão entre animações mask e vetorial da mesma imagem (Premissa #10). Discriminated union `CachedAnimation` com type guards `isVetorialAnimation`/`isStrokeAnimation`. Function overloads em `getStrokeAnimation`/`setStrokeAnimation` correlacionando `mode` com tipo de retorno.
- **i18n** (3 locales, 4 chaves no namespace `speedPaint`): `modeLabel`, `modeClassic`, `modeVetorial`, `modeDescription` em pt-BR, en e es.
- **Eventos analytics** (`src/lib/analytics.ts`): `speed_paint_mode_changed: { mode: 'mask' | 'vetorial' }` adicionado ao `AnalyticsEventMap`.
- **33 novos testes** (4 arquivos): `tests/speed-paint/vectorizer.unit.test.ts` (22 testes: vetorização básica, pathomit, presets, validação, AbortSignal, defaults), `tests/speed-paint/imageProcessing.vetorial.integration.test.ts` (9 testes: pipeline end-to-end), `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` (2 testes: 10 imagens diversas + fallback mask), `tests/speed-paint/SpeedPaintPlayer.component.test.tsx` (4 testes: mask render, vetorial render, type guard, fallback). Cobertura: 2268/2268 testes passando, 151 arquivos.
- **Dependências adicionadas**: `imagetracerjs@1.2.6` e `@remotion/paths@4.0.448` (ambas em `dependencies`).
- **Declarações de tipo** (`src/types/imagetracerjs.d.ts`): tipagem mínima da API `ImageTracer.imagedataToSVG()` com subset de opções e preset enum.
- **Documentação do plano e auditorias** (15+ arquivos em `docs/plan/`, `docs/audits/`, `docs/scan/`, `docs/test/`, `docs/handoffs/`): plano fonte, tracker de execução, 8 relatórios de auditoria dos agents (gap-finder, code-validator, security — F1, F2, F3, F4, F5 + 3 reauditorias), 5 handoffs de execução, 1 documento de ideia relacionada (Superfícies & Estilos de Mão).

### Alterado

- **`imageProcessing.ts`**: novo branch `renderMode === 'vetorial'` em `generateStrokesFromImage()` chama `processVetorialOnMainThread()` (vetorização na main thread com yields via `async` + `AbortSignal` cooperativo — `imagetracerjs` é lib de 290 KB, inviável em Blob URL de Web Worker inline). Retorno da função pública agora é `Promise<StrokeAnimation | VetorialAnimation>`.
- **`speedPaintRenderController.tsx`**: seleção automática de composição baseada em `renderMode` lido do `useAnimationStore` via `getState()`. Discriminação por `'paths' in animation` para narrow de tipo. Constantes `COMPOSITION_ID_MASK`/`COMPOSITION_ID_VETORIAL`/`COMPOSITION_ID_BATCH` para constraint do Remotion.
- **`PaintingJob.animation`** (`types.ts`): estendido de `StrokeAnimation | undefined` para `StrokeAnimation | VetorialAnimation | undefined` (consumidor discrimina por propriedades presentes).
- **`animationStore.ts`**: novos campos `renderMode: 'mask' | 'vetorial'` (default `'mask'`) e `vetorialPreset: VetorialPreset` (default `'artistic1'`), com setters correspondentes. Defaults respeitados por `resetJob()` e `clearQueue()`.
- **`VideoComposition.tsx`**: import de `StrokeAnimation` adicionado em uso.
- **`speedPaintRenderer.ts`**: tipagem alinhada com `types.ts` atualizado.
- **`types/vetorial.ts` (video-render)`: atualizado para suportar o novo tipo.

### Limitado (documentado, fora do escopo)

- **Batch vetorial não suportado** nesta versão: `runBatchRender()` no controller documenta explicitamente que apenas mask é suportado. Casos mistos caem no fallback mask. Pendência: criar `createExportableBatchWhiteboardComposition()` em versão futura se houver demanda.
- **Snapshot/render de componente Remotion fora do escopo** (Premissa #15): testes do `WhiteboardScene` cobrem o pipeline (`processVetorialOnMainThread`) mas não renderizam frames específicos. Pioneirismo no projeto.
- **`loadSpeedPaintRenderMode` sem runtime validation** (sugestão LOW do security): valor inválido do Firestore cai em fallback mask seguro, mas validação runtime explícita poderia ser adicionada em fase futura.

---

## [0.130.3] - 2026-06-12

### Corrigido

- **Flash visual no DragOverlay ao soltar imagem no SpeedPaint** (`QueueStaging.tsx`): `dropAnimation={null}` adicionado ao `<DragOverlay>` do `@dnd-kit/react` — desabilita a animação default de 250ms que reposicionava o overlay com `transform`, causando um salto visual indesejado ao soltar o item. Transição CSS alterada de `transform` para `box-shadow` para consistência com a ausência de animação de drop.
- **Botão "Escolher arquivos" do ImageUpload não abria o seletor de arquivos** (`ImageUpload.tsx`): o uso simultâneo de `<Button component="label">` e a zona de clique do `react-dropzone` (`noClick: false`) criava um conflito onde o evento de clique no botão era engolido pelo dropzone sem abrir o seletor. Corrigido extraindo `open()` do `useDropzone` com `noClick: true` e `noKeyboard: true`, substituindo `<Button component="label">` + `<input hidden>` por `<Button onClick={open}>` — o drag-and-drop continua funcional pela zona do dropzone.

### Alterado

- **Testes do ImageUpload** (`ImageUpload.component.test.tsx`): mock do `useDropzone` atualizado para expor `open`, `noClick` e `noKeyboard`; 5 novos testes adicionados — 4 de acessibilidade (role `button`, `tabIndex={0}`, `aria-label`, atalhos de teclado Enter/Espaço) e 1 de clique no botão "Escolher arquivos". Teste de renderização ajustado para usar data-testid.

### Adicionado

- **Docs de auditoria e análise** (4 arquivos): `docs/audits/image-upload-2026-06-12.md` (code-validator), `docs/audits/speed-paint-flash-correction-2026-06-12.md` (code-validator), `docs/scan/dropanimation-flash-speedpaint-2026-06-12.md` (gap-finder), `docs/scan/imageupload-correcao-vs-problema-2026-06-12.md` (gap-finder) — documentação completa das correções com vereditos, verificações de tipo, análise de lacunas e gaps priorizados.

---

## [0.130.2] - 2026-06-12

### Corrigido

- **Drag-and-drop de imagens em lote no SpeedPaint** (`QueueStaging.tsx`): wrappers `<TransitionGroup>` + `<Collapse>` ao redor de cada `SortableQueueImage` removidos — o `OptimisticSortingPlugin` do `@dnd-kit` usa `insertAdjacentElement` para mover fisicamente os elementos DOM durante o drag, mas os wrappers extras do Collapse (3 divs aninhadas) faziam com que o plugin arrancasse o `<Box>` de dentro do Collapse, quebrando o layout e a estrutura do grid. Agora os itens são filhos diretos da grid, permitindo o funcionamento correto do sorting visual. Adicionado `group: 'speed-paint-queue'` no `useSortable` para explicitar o escopo sortável. Imports de `@mui/material/Collapse` e `react-transition-group` removidos.

### Adicionado

- **Docs de auditoria**: `docs/audits/queue-staging-2026-06-12.md` (code-validator) e `docs/scan/queue-staging-correcao-2026-06-12.md` (gap-finder) — documentação da correção com vereditos, verificações detalhadas e análise de lacunas

---

## [0.130.1] - 2026-06-06

---

## [0.130.0] - 2026-06-06

### Adicionado

- **Modelo BYOK (Bring Your Own Key)**: usuário fornece sua própria API key do Gemini, persistida apenas em IndexedDB local (nunca em Firestore). Backend com `googleAI({ apiKey: false })` — sem chave global. Helpers `extractApiKey`, `withApiKey`, `maskApiKeyForLog` em `functions/src/genkit/utils/byok.ts`. ProviderAuth injetado em cada chamada via `config: { apiKey }`.
- **`testApiKey` flow** (`functions/src/flows/test-api-key.ts`): validação de API key do Gemini via chamada mínima (`gemini-3.1-flash-lite`)
- **`ProviderSettingsSection`** no frontend (`src/features/provider-settings/`): UI para salvar/testar/remover a API key com integração no Configuracoes
- **`ProviderAuthSchema`**, **`TestApiKeyInputSchema`**, **`TestApiKeyOutputSchema`** em `functions/src/genkit/schemas/common.ts` — schemas Zod para autenticação por provedor
- **`PROVIDER_SETTINGS_STORE`** em `src/lib/db/shared.ts` — novo store name para persistência das settings de provedor (DB_VERSION 10 → 11)
- **`hydrateProviderSettings()`** em `src/contexts/AuthContext.tsx` — carregamento automático das provider settings ao autenticar
- **`getProviderAuthFromStore()`** em `src/features/provider-settings` — função utilitária para hooks obterem a API key
- **`AudioInputByokSchema`**, **`AssistantInputByokSchema`**, **`ChunkingInputByokSchema`**, **`ImageInputByokSchema`**, **`InlineAssistantInputByokSchema`**, **`ScenePromptsInputByokSchema`** — schemas BYOK estendidos para cada flow
- **Rota `/open-source`** com `OpenSourcePage` — substitui a rota `/precos` (PricingPage)
- **Redirecionamentos de compatibilidade**: `/pricing` → `/open-source`, `/precos` → `/open-source` (9 rotas no total)
- **Namespace i18n `openSource`** e **`providerSettings`** nos 3 locales — substituem o namespace `pricing`
- **Arquivos open source** para governança do repositório: `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, templates `.github/` (issue templates, PR template)
- **Metadados no `package.json`**: campos `repository`, `bugs`, `homepage` para integração com GitHub
- **FAQ sobre BYOK** (`src/data/byokFaq.ts`): perguntas frequentes sobre BYOK e open source — substitui `pricingFaq.ts`
- **Link do GitHub** no `PublicFooter.tsx` e `ContactPage.tsx` (`GitHubIcon`)

### Alterado

- **Migração para BYOK finalizada**: backend sem Stripe/billing/créditos — cada flow extrai a key via `extractApiKey(input)` e injeta via `withApiKey(apiKey)` no `config` de `ai.generate()`. Logs usam `maskApiKeyForLog(apiKey)` (mostra apenas primeiros/últimos 4 caracteres).
- **Namespace i18n `pricing` → `openSource`**: todas as chaves de tradução renomeadas em pt-BR, en e es. Namespaces `credits`, `billing`, `usage` removidos dos 3 locales.
- **`.firebaserc`** apontado para placeholder `your-firebase-project-id`
- **`serviceAccount`** em `functions/src/index.ts` tornado opcional com comentário
- **Rotas e navegação pública**: links "Preços" removidos de `PublicHeader`, `PublicFooter`, `GuestMobileNav`, `FuncionalidadesPage` — substituídos por "Open Source" e "GitHub"
- **`ProductDemoSection.tsx`**: texto "Sem cartão de crédito" alterado para "Open source e gratuito (sua API key)"
- **`metrics.ts`**: métricas renomeadas — "Créditos mensais" → "Open source", "Bônus por feedback" → "BYOK", "Sem cartão" → "Privacidade"
- **`seo.ts`**: JSON-LD `SoftwareApplication` sem `offers` (modelo gratuito/open source)
- **`prerender.mjs`**: rota `/precos` substituída por `/open-source` na pre-renderização
- **`export-error-logs.ts`**: categoria `billing` → `byok`
- **`AccountContext.tsx`**: `useBillingInit` removido, `hydrateProviderSettings` adicionado no login
- **`Sidebar.tsx`**, **`SidebarFooter.tsx`**, **`MobileBottomNav.tsx`**: `CreditIndicator` removido — sidebar simplificada sem indicador de créditos
- **`FeedbackBanner.tsx`**, **`FeedbackFormFields.tsx`**, **`FeedbackDialog.tsx`**, **`FeedbackFab.tsx`**: toda lógica de bônus de créditos removida — feedback é apenas coleta de opinião
- **`AudioPreflightDialog.tsx`**: seção de estimativa de créditos removida
- **`AudioGenerationHandler.tsx`**: chamada de `preflight` removida
- **`AssistantComposer.tsx`**: prop `creditsBlocked` removida
- **`useAudioGenerator.ts`**, **`useImageGenerator.ts`**, **`useAssistant.ts`**, **`useInlineAssistant.ts`**: integração com `getProviderAuthFromStore()` — removidas dependências de `useCredits`
- **`lib/env.ts`**: funções `getStripePublishableKey`, `isBillingEnabled`, `isOpenBetaEnabled` removidas
- **`lib/callable-errors.ts`**: `isCreditCallableError` removido
- **`lib/analytics.ts`**: eventos `upgrade_dialog_opened`, `begin_checkout` removidos
- **`lib/logger/`**: contexto `billing` removido de `interceptor.ts`, `filters.ts`, `types.ts`, `index.ts`
- **`lib/logger/sanitization.ts`**: `stripe_token` removido dos padrões de sanitização
- **`StackedHeader.tsx`**: textos de bônus de feedback removidos dos comentários
- **`account-cleanup.ts`**: cleanup de subscription do Stripe removido
- **`ImageStudio.tsx`**: `CreditBlockedMessage` removido
- **`InlineAIWidget.tsx`**: `CreditBlockedMessage` removido
- **`Assistant.tsx`**: `CreditBlockedMessage` removido
- **`FounderMessageDialog.tsx`**: texto de bônus de créditos → texto sobre BYOK
- **`llms.txt`**, **`llms-full.txt`**, **`robots.txt`**, **`sitemap.xml`**: conteúdo atualizado — referências a "preços"/"créditos" removidas, foco em open source/BYOK
- **`styles.scss` / surfaces / authStyles**: refinamentos de texto (premium → refinado) em comentários e descrições
- **Testes de integração**: `i18n-integration.test.tsx`, `i18n.unit.test.ts`, `locales.completeness.unit.test.ts` — chaves `pricing`, `credits`, `billing` removidas; chaves `openSource`, `providerSettings` adicionadas
- **Testes de páginas**: `AboutPage`, `FaqPage`, `LandingPage`, `FuncionalidadesPage`, `LoginPage`, `ProductDemoSection`, `PublicFooter`, `PublicHeader`, `MetricsSection` — textos e asserções atualizados de "créditos"/"beta"/"preços" para "open source"/"BYOK"
- **Testes de dados**: `data.unit.test.ts`, `lib-data.unit.test.ts`, `shared.unit.test.ts` — referências a `/precos` → `/open-source`, DB_VERSION 10 → 11
- **Testes de hooks**: `useAssistant.unit.test.tsx`, `useAudioGenerator.unit.test.ts`, `useImageGenerator.unit.test.ts`, `useAssistant.persistent-chat.unit.test.tsx`, `useAudioGenerator.unit.test.ts` — mocks de `useCredits` removidos
- **Testes de componentes**: `Sidebar.component.test.tsx`, `Sidebar.features.test.tsx`, `FeedbackController.component.test.tsx`, `FeedbackFab.component.test.tsx`, `AssistantMessages.component.test.tsx`, `audioGenerationHandler.unit.test.tsx` — mocks e referências a créditos removidos
- **Testes de libs**: `callable-errors.unit.test.ts` — `isCreditCallableError` removido; `env.unit.test.ts` — env vars de billing removidas; `gemini.unit.test.ts` — mocks simplificados
- **Teste de i18n**: `locale-completeness.unit.test.ts`, `i18n-integration.test.tsx` — `pricing` → `openSource`, `Beta` → `Open Source`
- **Testes de redirects**: `redirects.unit.test.tsx` — novo redirect `/precos` → `/open-source`, contagem 8 → 9

### Removido

- **Sistema de billing/créditos/Stripe completo**:
  - Frontend: `src/features/billing/` (8+ arquivos — PlanBadge, UpgradeDialog, UsageIndicator, plans, store, types, usageUtils, hooks)
  - Hooks: `src/hooks/useCredits.ts` (504 linhas — store Zustand com lógica de créditos)
  - Componentes: `src/components/CreditIndicator.tsx`, `src/components/CreditBlockedMessage.tsx`
  - Lib: `src/lib/stripe.ts` (integração Stripe.js)
  - Backend: `functions/src/usage/` (credit-metering.ts, credit-service.ts, credit-policy.ts, credit-events.ts, period.ts, audio-preflight.ts, credit-estimator.ts, index.ts)
  - Backend flows: `functions/src/flows/credit-snapshot.ts`
  - Backend middlewares: `functions/src/genkit/middlewares/credit-metering.ts`
  - Testes: `tests/billing/` (3 arquivos), `tests/hooks/useCredits.unit.test.tsx`, `tests/components/CreditIndicator.component.test.tsx`, `tests/pages/public/PricingPage.component.test.tsx`, `tests/components/public/PricingCard.component.test.tsx`, `tests/functions/credit-service.unit.test.ts`, `tests/functions/test-promo-bug.ts`
- **Página de Preços**: `src/pages/public/PricingPage.tsx`, `src/components/public/PricingCard.tsx`, `src/data/pricingFaq.ts`
- **`.firebaserc`**: resetado para placeholder (requer configuração do projeto Firebase)
- **`cors.json`**: removido da raiz (configuração migrada para `functions/src/config/cors.ts`)
- **`public/llms.txt`**, **`public/llms-full.txt`**, **`public/robots.txt`**, **`public/sitemap.xml`**: removidos e regerados com conteúdo atualizado

### Corrigido

- **Feedback flow**: comentário e lógica de bônus de 250 créditos removidos — feedback agora é apenas coleta de opinião, sem incentivo financeiro

---

## [0.129.1] - 2026-06-05

### Alterado

- **ManualProjectStepName.tsx**, **ManualProjectStepAudio.tsx**, **ManualProjectStepImages.tsx**: Removidos parágrafos de descrição redundantes nos 3 steps do wizard de Projeto Manual — UI mais limpa e direta, redução de 16 linhas

---

## [0.129.0] - 2026-06-05

### Adicionado

- **Projeto Manual — wizard de upload de áudio e imagens** (`src/features/manual-project/`, 14 novos arquivos + 3 testes, ~2500 linhas líquidas):
  - **Rota nova** `/app/projeto/novo` (lazy-loaded, `ProtectedRoute`) com wizard de 4 passos: Nome+Roteiro → Áudio → Imagens → Sucesso
  - **Upload de áudio** (mp3, wav, m4a, ogg, webm; ≤50MB) com validação MIME + `decodeAudioData` + duração mínima. Componentes: `ManualProjectStepAudio.tsx` (+188 linhas), `ManualProjectAudioPreview.tsx` (+143 linhas) — player inline com play/pause e visualização de forma de onda
  - **Upload de imagens** (jpg, png, webp; ≤10MB cada, ≤30 por projeto) com validação MIME + `Image.decode()` + dimensões máximas (4096px). Componentes: `ManualProjectStepImages.tsx` (+151 linhas), `ManualProjectImageGrid.tsx` (+216 linhas)
  - **Reordenação de imagens** via drag-and-drop (`@dnd-kit/react` sortable) + botões ↑↓ (fallback mobile) com `aria-*` labels
  - **Persistência dual** via funções existentes: `saveProject` (Project doc no Firestore/IDB), `saveAudioToProject` (AudioSource no Storage/IDB), `saveImageToProject` (ProjectImage[] no Storage/IDB)
  - **Tela de sucesso** (`ManualProjectSuccess.tsx`, +183 linhas) com 4 CTAs: Speed Paint (fila pré-carregada), Vídeo, Library, Criar outro projeto
  - **Hook central** `useManualProject.ts` (+387 linhas): gerenciamento de estado do wizard via `useReducer`, `ManualProjectDraft` com 11 ações, ciclo de vida de blob URLs (previewUrl com revogação controlada), save sequencial com rollback parcial em caso de falha
  - **Validação modular** (`manualProjectValidation.ts`, +192 linhas): `validateAudioFile()`, `validateImageFile()`, `validateName()`, `validateDraft()` — cobertura completa com `ValidationErrorKind` (7 tipos: `INVALID_MIME`, `FILE_TOO_LARGE`, `TOO_MANY_IMAGES`, `AUDIO_TOO_SHORT`, `NAME_TOO_SHORT`, `INVALID_DIMENSIONS`, `DECODE_FAILED`)
  - **Integração com Library**: botão "Criar projeto manualmente" (`variant="contained"`, ícone `Add`) no header da Library + card de empty state com CTA
  - **Campo `script: string | null`** no `useAudioGeneratorStore` para transporte do roteiro entre wizard e páginas de vídeo/speed paint — **sem poluir** `useStudioStore`
  - **CORS do Firebase Storage** configurado (`storage-cors.json`): `Cross-Origin-Resource-Policy` adicionado aos `responseHeader` — necessário para COEP `credentialless`
  - **9 novos eventos analytics** em `AnalyticsEventMap` (snake_case): `manual_project_started`, `manual_project_audio_uploaded`, `manual_project_audio_upload_failed`, `manual_project_image_uploaded`, `manual_project_image_upload_failed`, `manual_project_images_reordered`, `manual_project_saved`, `manual_project_save_failed`, `manual_project_cta_clicked`
  - **i18n** nos 3 locales: namespace `manualProject.*` com ~10 subseções (meta, steps: 4 passos, stepName, stepAudio, stepImages, errors, success, liveRegion, cta)
  - **Testes Vitest** (5 arquivos, 61 testes): `manualProjectHelpers.unit.test.ts` (21 testes — validação de arquivo, helpers), `manualProjectReducer.unit.test.ts` (16 testes — 10 ações do reducer), `useManualProject.unit.test.ts` (12 testes — hook com mocks), `ManualProjectImageGrid.component.test.tsx` (9 testes — drag-and-drop + teclado), `analytics.unit.test.ts` (3 testes — type-level para 9 eventos)

### Alterado

- **`src/components/Library.tsx`** (+34/-1): botão "Criar projeto manualmente" adicionado ao header (ao lado de "Projetos") com ícone `Add` e `onClick` → `navigate('/app/projeto/novo')`
- **`src/features/studio/store/audioGeneratorStore.ts`** (+31/-4): novo campo `script: string | null` com getter/setter no estado; `loadProjectData` agora aceita `script?: string | null` — documentação JSDoc atualizada para refletir o novo campo
- **`src/pages/VideoPage.tsx`** (+13/-5): integração com `script` do projeto manual — `loadProjectData` recebe `projectScript` do `audioGeneratorStore` em vez de `setScript` do `useStudioStore`
- **`src/router/routes.tsx`** (+6/-0): nova rota `<Route path="/app/projeto/novo" element={<ManualProjectPage />} />` dentro de `ProtectedRoute` — lazy loading com `React.lazy`
- **`src/lib/analytics.ts`** (+41/-0): 9 novos eventos adicionados ao `AnalyticsEventMap` com tipagem completa e comentários semânticos
- **`src/features/i18n/locales/{en,es,pt-BR}.ts`** (+97 cada): namespace `manualProject.*` adicionado nos 3 locales com paridade de chaves
- **Testes atualizados** (`tests/hooks/useAudioGenerator.unit.test.ts`, `tests/hooks/useImageGenerator.unit.test.ts`, `tests/lib/env.unit.test.ts`): `storageBucket` alterado de `*.appspot.com` para `*.firebasestorage.app` (novo domínio do Firebase Storage)

### Corrigido

- **Bug crítico de ciclo de vida de blob URL no `useManualProject.ts`**: `audioUrl` criado via `URL.createObjectURL` não era mais adicionado ao `blobUrlsRef` (a linha foi removida) — o `audioGeneratorStore.loadProjectData` agora gerencia seu próprio ciclo de vida, eliminando revogação prematura ao navegar para outra rota

### Documentado

- **13 novos documentos** em `docs/audits/`, `docs/plan/`, `docs/scan/`:
  - Arquitetura da feature (`upload-manual-projeto-architecture.md`, 1500 linhas)
  - Plano base, plano de produto, plano final e contrato de validação
  - Análise de lacunas (gap-finder) em 3 versões (inicial, cobertura, final)
  - Auditoria estática + final pós-correções
  - Code validator com vereditos e achados
  - Gap analysis entre plano e implementação
  - Próximas ações manuais (CORS + smoke test E2E)

---

## [0.128.0] - 2026-06-05

### Adicionado

- **Migração de vídeos do Storage para IndexedDB local** (`src/lib/db/`, `firestore.rules`, `storage.rules`, +253 linhas líquidas):
  - `src/lib/db/projects.ts`: novo tipo `ProjectDetails`, novas funções `getOrCreateProjectDetails()` e `upsertProjectVideo()` — gerenciamento de metadados de vídeo localmente
  - `src/lib/db/videos.ts`: 6 novas funções — `sortVideos()`, `mergeLocalAndLegacyVideos()`, `isVisibleLocalVideo()`, `getLocalProjectVideos()`, `getLocalVideosForUser()`, `getLegacyFirestoreVideos()` — camada completa de acesso a vídeos com fallback legado
  - `src/lib/db/shared.ts`: nova função `getIndexedDbItemsByIndex()`, `DB_VERSION` incrementado
  - `src/lib/db/migration.ts`: migração refatorada — remoção do step de vídeos da migração do IndexedDB (agora gerenciados localmente)
  - `storage.rules`: regras reestruturadas — áudio (`150MB`, `audio/*`) e imagem (`10MB`, `image/*`) com validação refinada; vídeos bloqueados para escrita (`allow create, update: if false`) — apenas leitura/deleção de legados preservada
  - `firestore.rules`: subcoleção `videos` bloqueada para criação/atualização (`allow create, update: if false`)
  - **Testes expandidos:** `shared.unit.test.ts` (+33 linhas), `migration.unit.test.ts` (+75 linhas), `persistence.dual-storage.test.ts` (+161 linhas), `videoRenderController.unit.test.ts` (+32 linhas), `Library.component.test.tsx` (+87 linhas)

- **Lazy loading de composições Remotion nos controllers de renderização** (`src/features/video-render/store/videoRenderController.tsx`, `src/features/speed-paint/store/speedPaintRenderController.tsx`):
  - `videoRenderController.tsx` (+41/-35): `ExportableComposition` migrado de exportação direta para `async function createExportableComposition()` — import lazy da composição real, removendo dependência direta de `VideoComponent`
  - `speedPaintRenderController.tsx` (+79/-57): `ExportableSpeedPaintComposition` e `ExportableBatchSpeedPaintComposition` migrados para `async function createExportable*Composition()` — lazy loading de `SpeedPaintScene` e `remotion`, removendo imports diretos

### Alterado

- **Padronização visual — `letterSpacing: 0` em ~50 componentes**: remoção global de `letterSpacing` negativo (`-0.02em`, `-0.035em`, `-0.04em`, `-0.025em`, `-0.01em`) em favor de `letterSpacing: 0` em toda a árvore de componentes. Afeta: `appTheme.ts` (todos os variants de heading), `HeroSection`, `FeatureCard`, `FeatureShowcase`, `MetricsSection`, `ProductDemoSection`, `SocialProofBar`, `StepCard`, `TestimonialsSection`, `UseCasesSection`, `CTASection`, `LegalPageTemplate`, `ScrollToTop`, `AboutPage`, `FaqPage`, `FuncionalidadesPage`, `LandingPage`, `PricingPage`, `NotFoundPage`, `LoginPage`, `RegisterPage`, `StudioPage`, `VideoPage`, `SpeedPaintPage`, `AuthActionPage`, `AssistantHeader`, `AssistantHistoryPanel`, `AssistantMemoriesPanel`, `AssistantMessages`, `AssistantSettingsPanel`, `SpeedPaintPlayerControls`, `BatchOrchestrator`, `QueueStaging`, `ImageUpload`, `CaptionEditorPanel`, `TranscriptionPanel`, `ExportProgressBar`, `ExportQualitySelector`, `ExportResultActions`, `FounderMessageDialog`, `ErrorBoundary`, `Library`, `CreditIndicator`, `ImageStudio` e outros

- **UI responsiva de Login e Cadastro** (`LoginPage.tsx`, `RegisterPage.tsx`, `PublicHeader.tsx`):
  - `LoginPage.tsx` (+26/-22): `maxWidth` responsivo (xs:360, sm:420) no container do formulário; `width` e `height` do ícone vazio adaptáveis
  - `RegisterPage.tsx` (+29/-20): mesmo padrão do Login — maxWidth, ícone responsivo; import de `useMediaQuery` e `useTheme` para detecção de breakpoint
  - `PublicHeader.tsx` (+21/-8): `gap`, `flexBasis`, `maxWidth`, `minWidth` responsivos para melhor adaptação em telas intermediárias

- **i18n — Biblioteca** (`src/features/i18n/locales/{en,es,pt-BR}.ts`): texto `noVideos` alterado de "Nenhum vídeo encontrado neste projeto." para "Nenhum vídeo salvo neste navegador." (reflete migração para IndexedDB); nova chave `openVideoExporter` adicionada nos 3 locales

- **Scroll suave pós-navegação** (`ScrollToTop.tsx`): `window.scrollTo(0, 0)` substituído por `window.requestAnimationFrame()` com scroll no `#main-content` — elimina jump visual em navegações entre páginas públicas

- **AnalyticsConsentPrompt refatorado** (`AnalyticsConsentPrompt.tsx`, +41/-38): import de `Box` adicionado, estrutura de layout alterada para melhor encapsulamento de conteúdo

### Corrigido

- **Template literals aninhados corrigidos em 3 arquivos**: `${...}` dentro de template strings com crases (`) convertidos para `${...}` concatenado — `Sidebar.tsx` (scrollbarColor), `MarketingDemoComposition.tsx` (borderBottom), `CaptionEditorPanel.tsx` (boxShadow) — elimina warnings de sintaxe e possíveis breaks em runtime

### Removido

- **Auditoria de Product Design** (`docs/audits/product-design-2026-06-04/README.md`, -174 linhas): documento de auditoria do fluxo público concluída e arquivada

---

## [0.127.0] - 2026-06-04

### Adicionado

- **Marketing Demo Video — player Remotion na LandingPage** (`src/features/public-demo-video/`, +826 linhas, 3 arquivos):
  - `MarketingDemoComposition.tsx` (+659 linhas): composição Remotion com layout responsivo (desktop/mobile), tipografia estilizada com gradiente e superfície, exibição de funcionalidades em timeline animada
  - `MarketingDemoPlayer.tsx` (+165 linhas): wrapper do `@remotion/player` com breakpoint responsivo (`useMediaQuery`), fallback via `React.lazy` + `Suspense`, ícone de play central
  - `index.ts`: barrel export do `MarketingDemoPlayer`
- `LandingPage.tsx` (+30/-16): lazy loading do `MarketingDemoPlayer` com `React.lazy` + `Suspense` + `HeroDemoFallback`; `aspectRatio` responsivo adicionado ao container; ajuste de `maxWidth`

- **StackedHeader — Onda 4 de migração** (+117/-139 linhas):
  - `SpeedPaintPage.tsx` (+24/-62): seção de controles do speed paint migrada de `<Box><Collapse>` + `ExpandMore`/`ExpandLess` para `<StackedHeader collapsible>` + `useCollapsibleSection`
  - `VideoExportPanel.tsx` (+27/-27): painel de exportação de vídeo migrado para `StackedHeader` — import adicionado, `Collapse` removido
  - `SpeedPaintExportPanel.tsx` (+70/-73): painel de exportação speed paint migrado para `StackedHeader` — import adicionado, colapso inline substituído

### Alterado

- **Tokens de borda arredondada adotados em 20+ componentes**: valores inline `borderRadius: 2` / `borderRadius: 3` substituídos por `RADIUS_XS` e `RADIUS_SM` do sistema de tokens. Arquivos migrados: `GuestMobileNav`, `MobileBottomNav`, `PwaInstallPrompt`, `PwaUpdatePrompt`, `Sidebar`, `SidebarNavItem`, `WizardContainer`, `AnimationDurationSelector`, `BatchOrchestrator`, `ImageUpload`, `AboutPage`, `PricingPage`, `FeatureCard`, `QueueStaging`, `Inspector`, `Configuracoes`, `ImageStudio`, `AssistantComposer`, `AssistantSettingsPanel`, `CallbackPage`, `LocaleSelector` e outros (+14 tokens importados em 8 novos arquivos)

- **Mocks de tokens migrados para `async (importOriginal)` em 30+ arquivos de teste**: `vi.mock('../../src/theme/tokens', () => ({...}))` substituído por `vi.mock('../../src/theme/tokens', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, ...overrides } })`. Isso elimina valores hardcoded frágeis e garante que os testes sempre reflitam os tokens reais do tema. Arquivos: `AssistantComposer`, `AssistantHistoryPanel`, `AssistantMemoriesPanel`, `AssistantMessages`, `AssistantSettingsPanel`, `assistantUi`, `ScriptEditor`, `VideoPreview`, `FAQAccordion`, `HeroSection`, `PageLayout`, `PricingCard`, `ProductDemoSection`, `PublicHeader`, `TestimonialsSection`, `UseCasesSection`, `marketingCards`, `AudioContext`, `AuthActionPage`, `LoginPage`, `OnboardingPage`, `RegisterPage`, `SpeedPaintPage`, `CookiesPage`, `FaqPage`, `PrivacyPage`, `TermsPage`, `BatchOrchestrator`, `ImageUpload`, `CaptionEditorPanel`, `remotion-components` e outros

- **`tests/__mocks__/tokensMock.ts` simplificado** (+17/-58): mock refatorado — tokens obsoletos removidos (`APP_BORDER`, `GLASS_BG`, `SUCCESS_*`, `ERROR_*`, `WARNING_*`, `ICON_SIZE_MD`, `BRAND_SECONDARY_GLOW_SOFT`, `GAP_*`, etc), tipo `TokensModule` exportado, `createTokensMock` e `defaultTokensMock` removidos

- **StackedHeader.tsx** (+19/-4): tokens de densidade `collapsePx` e `collapsePb` agora responsivos (`xs`/`md`) — padding horizontal e inferior do conteúdo colapsado se adaptam ao breakpoint

- **`docs/audits/product-design-2026-06-04/`** — nova auditoria de design de produto para o fluxo público de descoberta e conversão

### Removido

- **`docs/scan/stacked-header-gaps-audit.md`** (-421 linhas): auditoria de lacunas do StackedHeader concluída e arquivada — todas as ações corretivas endereçadas nas ondas 3-4

### Corrigido

- **Consistência de espaçamento em template literals**: `attempt + 1/${total}` → `attempt + 1 }/${total}` em 10+ arquivos (`interceptor.ts`, `rate-limiter.ts`, `useAudioGenerator.ts`, `speedPaintRenderController.tsx`, `speedPaintService.ts`, `projectQueueAdapter.ts`, `SubtitlePreview.tsx`, `ScrollingPhrase.tsx`, `useBatchDownload.ts`, `ThinkingShimmer.tsx`) — formatação uniforme de expressões `${expr }` com trailing space

---

## [0.126.1] - 2026-06-03

### Alterado

- **Conteúdo editorial das páginas públicas reescrito — foco em clareza e benefício direto** (7 arquivos em `src/data/`, +93/-93 linhas líquidas):
  - `authBenefits.ts`: textos dos 4 benefícios reescritos para tom mais direto ("Narração sem gravar", "Vídeo montado no navegador", "Cenas com IA", "Assistente criativo") — chaves renomeadas de `b*Title`/`b*Desc` para os 3 locales
  - `metrics.ts`: métricas renomeadas para conceitos mais relevantes ao beta ("Fluxo em 3 etapas", "Créditos mensais", "Bônus por feedback", "Sem cartão") — chaves `metric*Label`/`metric*Desc` renomeadas
  - `pricingFaq.ts`: resposta da FAQ sobre créditos não utilizados ajustada ("expiram" em vez de linguagem anterior)
  - `testimonials.ts`: todos os 6 depoimentos reescritos com linguagem mais natural e casos de uso específicos — chaves `t*Text`/`t*UseCase` renomeadas
  - `useCases.ts`: todos os 6 casos de uso reescritos com descrições mais diretas — chaves `uc*Title`/`uc*Desc` renomeadas, novo anchor `images` adicionado

- **Arquivos de tradução reestruturados** (`src/features/i18n/locales/{en,es,pt-BR}.ts`, +198/-197, +200/-199, +200/-199 linhas respectivamente):
  - Namespace `images` adicionado nos 3 locales com chave `images.alt` para alt text de imagens
  - Chaves `landingShowcases.*.alt` reorganizadas e renomeadas para consistência
  - Chaves de feature items (`featureItems.*`) e showcase sections reestruturadas
  - Chave `of` removida do locale EN

- **Descrições SEO reescritas** (`public/llms-full.txt` +36/-32, `public/llms.txt` +16/-16):
  - Tom reformulado de descrição de "plataforma SaaS" para "ferramenta web para criadores"
  - Seções reestruturadas em `llms-full.txt`: "Principal Promessa", "Para Quem É" (detalhamento por perfil), seções de features renomeadas ("Texto para Narração", "Cenas e Imagens", "Vídeo e Legendas", "Assistente de Criação")
  - `llms.txt`: resumo simplificado com links focados em "Criar vídeos para YouTube com IA", seção "Tecnologia" simplificada (sem detalhes de stack — foco em o que faz, não como)
  - Descrições longas e curtas alinhadas entre llms.txt e llms-full.txt

- **Alt texts de imagens migrados para i18n** (`src/pages/public/FuncionalidadesPage.tsx`, +3/-3): 3 alt texts de showcases (TTS, vídeo, imagens) movidos de strings literais para `t('landingShowcases.audio.alt')`, `t('landingShowcases.video.alt')`, `t('landingShowcases.images.alt')` — consistência com LandingPage que já usava i18n para alt texts

- **Labels do roadmap na AboutPage** (`src/pages/public/AboutPage.tsx`, +2/-2): versões de `'0.17', '0.20', '0.22', '0.23', '0.24', 'next'` para `'01', '02', '03', '04', '05', '06'` — label do chip alterada de `v{item.version}` para `item.version` (exibe o número sem prefixo)

### Melhorado

- **HeroSection com `sx` function-based** (`src/components/public/HeroSection.tsx`, +9/-3): `sx` migrado de objeto estático para arrow function `(theme) => ({...})` — permite acesso direto ao tema e evita warnings de TypeScript sobre tipos de tema não resolvidos

- **maxWidth na LandingPage** (`src/pages/public/LandingPage.tsx`, +6/-3): ajuste de largura máxima do container visual do hero para melhor responsividade em telas grandes

---

## [0.126.0] - 2026-06-03

### Adicionado

- **StackedHeader expandido — 5 novas props de layout responsivo** (`src/components/ui/StackedHeader.tsx`, +327/-12 linhas):
  - `direction` (`'vertical' | 'horizontal' | 'responsive'`): controla eixo do layout interno. `default` deriva da variant via `DIRECTION_DEFAULTS` (`alert` → vertical, `glass`/`plain` → responsive). `'responsive'` alterna de horizontal (mdUp) para vertical (xs)
  - `actionAlign` (`'start' | 'end' | 'center' | 'stretch'`): alinhamento do slot de ação. Default deriva do eixo efetivo (vertical → `'end'`, horizontal → `'center'`)
  - `controlAlign` (`'start' | 'end' | 'center'`): alinhamento do slot de controle (chip/switch). Default deriva do eixo efetivo
  - `actionPlacement` (`'inline' | 'stack' | 'bottom'`): posição do slot de ação relativo ao conteúdo. Default: `'inline'` para `alert`, `'stack'` para `section`
  - `density` (`'compact' | 'standard' | 'comfortable'`): densidade visual com tokens `DENSITY_TOKENS` (padding, gap). Default: `'standard'`
  - 8 novos tipos públicos exportados: `StackedHeaderAxis`, `StackedHeaderBreakpoint`, `StackedHeaderResponsiveAxis`, `StackedHeaderDirection`, `StackedHeaderActionAlign`, `StackedHeaderControlAlign`, `StackedHeaderActionPlacement`, `StackedHeaderDensity`
  - 3 helpers internos: `resolveDirection`, `resolveAlignItems`, `getEffectiveAxis`
  - Constantes `DIRECTION_DEFAULTS` e `DENSITY_TOKENS`
  - Barrel export em `src/components/ui/index.ts` expandido com os novos tipos

- **`useCollapsibleSection` adotado em SpeedPaintControls** (`src/features/video-render/components/SpeedPaintControls.tsx`, +85/-134): seção de controles colapsável migrada de `<Box><Collapse>` + `useState` manual + `useId` para `<StackedHeader collapsible>` + `useCollapsibleSection`. Remove imports de `Collapse`, `ExpandMore`, `ExpandLess`, `ButtonBase`. 2 seções (Paint Settings + Layers) usando o hook centralizado

- **`setGlobalOptions` para Cloud Functions** (`functions/src/index.ts`, +21 linhas): nova configuração global de memória via `firebase-functions/v2/options`. Import de `setGlobalOptions` adicionado

- **Testes do StackedHeader expandido** (`tests/components/StackedHeader.component.test.tsx`, +482 linhas): 6 describe blocks específicos — `direction`, `actionAlign`, `controlAlign`, `actionPlacement`, `density`, `defaults inteligentes por variant` + 3 testes de retrocompatibilidade. Cobre combinações responsivas, valores de densidade e interação entre props

- **Constantes de densidade em mock de tokens** (`tests/__mocks__/tokensMock.ts`, +4 linhas): `GAP_COMPACT` (0.75), `GAP_DEFAULT` (1)

- **Documentação técnica:** `docs/scan/stacked-header-gaps-audit.md` (422 linhas) — auditoria estática do componente StackedHeader com 18 call sites analisados

### Alterado

- **Limite de caracteres reduzido para 25.000** (`src/lib/constants.ts`, `public/llms-full.txt`, i18n FAQ nos 3 idiomas): `MAX_CHARS` alterado de 50.000 para 25.000 caracteres por roteiro. Atualiza a documentão de SEO (`llms-full.txt`) e as respostas da FAQ em pt-BR, en e es. Teste unitário `constants.unit.test.ts` atualizado para refletir o novo valor

- **Timestamp dos error logs migrado de `serverTimestamp()` para `Date.now()`** (`src/lib/logger/types.ts`, `src/lib/logger/interceptor.ts`, `firestore.rules`):
  - `types.ts`: tipo `timestamp` alterado de `unknown` (sentinel opaco) para `number` — documenta a decisão (correlação com horário local do usuário é mais útil para debug, elimina edge cases do sentinela em regras v2)
  - `interceptor.ts`: default `null` substituído por `Date.now()` — cada log já chega com timestamp do cliente
  - `firestore.rules`: validação do campo `timestamp` em `errorLogs` alterada de `is timestamp` para `is number` — comentário explicativo adicionado (9 linhas)
  - `src/lib/logger/index.ts`: import de `firebase/firestore` removido (não mais necessário — não usa `serverTimestamp`)

- **Memória das Cloud Functions aumentada para 512MiB** (`functions/src/flows/audio.ts`, +5/-0): default de 256 MiB estourava para roteiros grandes (273 MiB observado em produção em 2026-06-03 — scripts longos geram dezenas de buffers PCM mantidos simultaneamente). Configurado via `setGlobalOptions` + `memory: '512MiB'` no flow de áudio

- **Migração de 9 call sites para novas props do StackedHeader**: `Configuracoes.tsx` (+2), `Library.tsx` (+10, 5 call sites), `ImageStudio.tsx` (+2), `VideoLibrary.tsx` (+2), `AnalyticsConsentPrompt.tsx` (+3, `density="compact"` incluso), `FeedbackBanner.tsx` (+2), `Assistant.tsx` (+2) — todos recebem `actionPlacement="stack" actionAlign="end"` para posicionamento de ação consistente

- **CreditBlockedMessage.tsx**: refatoração (+12/-14) com novas props — `actionAlign="start"` intencional para alinhamento à esquerda do CTA "Ver planos"

### Corrigido

- **Bug de referência circular no logger** (`src/lib/logger/index.ts`): import de `firebase/firestore` removido — o módulo não usava diretamente funções do Firestore (`serverTimestamp` foi substituído por `Date.now()`). Elimina warning de import não utilizado e potencial ciclo em ambiente de teste

- **Testes SpeedPaintControls**: atualizados (+41/-30) para refletir a migração de Collapse/ButtonBase para StackedHeader — asserções de padding, ícones e estado de colapso ajustados para a nova implementação

---

## [0.125.0] - 2026-06-03

### Adicionado

- **PWA Install Prompt** — novo sistema de instalação customizada do PWA via captura do evento nativo `beforeinstallprompt`:
  - `src/types/pwa.d.ts` (+32 linhas): type augmentation para `BeforeInstallPromptEvent` (interface com `prompt()` e `userChoice`)
  - `src/lib/pwa/install-prompt-store.ts` (+385 linhas): store singleton de módulo que gerencia o `deferredPrompt`, cooldown de 7 dias, 4 estados (`available`, `dismissed`, `installed`, `cooldown`), persistência local com prefixo `s2a_pwa_*`, serialização com AnalyticsConsentPrompt e PwaUpdatePrompt (1 prompt por vez)
  - `src/hooks/usePwaInstallPrompt.ts` (+131 linhas): hook reativo que registra listener de `beforeinstallprompt` no `window`, sincroniza com a store, expõe `canInstall`, `install()`, `dismiss()` e `isStandalone` (detecta se já está instalado via `matchMedia('display-mode: standalone')`)
  - `src/components/app/PwaInstallPrompt.tsx` (+282 linhas): UI Snackbar MUI glass com `InstallMobile` icon, ações "Agora não" (ativa cooldown de 7 dias) e "Instalar app", serialização automática (aguarda vez se outro prompt estiver visível)
  - `src/components/app/PwaUpdatePrompt.tsx`: exporta `PWA_UPDATE_VISIBILITY_EVENT` para coordenação visibilidade com install prompt
  - `src/App.tsx`: `<PwaInstallPrompt />` montado no shell (após `<AnalyticsConsentPrompt />`)
  - Namespace `pwaInstall.*` nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`, +8 linhas cada): `title` (2 variantes: disponível e disponível_mobile), `actionInstall`, `actionDismiss`, `ariaInstallButton`, `ariaDismissButton`
  - Testes: `install-prompt-store.unit.test.ts` (+565 linhas, 27+ cenários), `usePwaInstallPrompt.unit.test.ts` (+443 linhas, 18+ cenários), `pwa-install-prompt.component.test.tsx` (+400 linhas, 16+ cenários)

- **StackedHeader — componente genérico de header padronizado (Ondas 1-3)**:
  - `src/components/ui/StackedHeader.tsx` (+508 linhas): componente que unifica 3 famílias de UI: (1) Banners com ação (substitui `<Alert action={<Button>}>` em 8+ componentes), (2) Headers de seção colapsáveis com animação Motion, (3) Títulos de seção simples. Props: `collapsible` (com `defaultCollapsed` + `onToggle`), `action` (botão opcional no canto), `severity` (`success`/`warning`/`error`/`info`), variantes `section`/`banner`. Acessibilidade: `role="button"`, `aria-expanded`, `aria-controls`, `aria-label` via i18n
  - `src/hooks/useCollapsibleSection.ts` (+50 linhas): hook que encapsula `useState<boolean>` + `useId()` para estado de colapso controlado + `aria-controls`/`aria-labelledby` — reduz boilerplate em consumidores que usam StackedHeader colapsável
  - `src/components/ui/index.ts`: barrel export de `StackedHeader` e `StackedHeaderProps`
  - Namespace `stackedHeader.*` nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`): `collapseAriaLabel`
  - `tests/components/StackedHeader.component.test.tsx` (+502 linhas): 20+ cenários — renderização, colapso, severidade, ação, acessibilidade, interação do usuário

- **Migração de ~12 componentes para StackedHeader (Ondas 2-3)**:
  - `src/components/Inspector.tsx` (+336/-404): Alert do assistente + 2 CollapsibleSection (voz, cenas) migrados para StackedHeader
  - `src/components/Configuracoes.tsx` (+37/-69): 5 CollapsibleSection (Voz, Persona & Direção, Cenas & Imagens, Multi-locutor, Idioma da interface) usando `useCollapsibleSection` + StackedHeader
  - `src/components/Library.tsx` (+57/-38): 4 StackedHeader (offline, cena, batch speed paint, card generator)
  - `src/components/ImageStudio.tsx` (+26/-9): StackedHeader de erro de geração
  - `src/components/VideoLibrary.tsx` (+8/-5): StackedHeader de erro de reprodução
  - `src/components/CreditBlockedMessage.tsx` (+28/-22): migrado de `Alert` para StackedHeader
  - `src/components/feedback/FeedbackBanner.tsx` (+25/-27): migrado de `Alert` para StackedHeader
  - `src/components/feedback/FeedbackFormFields.tsx` (+10/-3): usa StackedHeader para título
  - `src/components/app/AnalyticsConsentPrompt.tsx` (+39/-33): migrado de `Paper`/`Stack` para StackedHeader
  - `src/features/assistant/Assistant.tsx` (+30/-19): StackedHeader no lugar de `Alert`
  - `src/features/studio/components/StockMediaPicker.tsx` (+8/-4): StackedHeader de erro
  - `src/features/video-render/components/TranscriptionPanel.tsx` (+20/-16): StackedHeader de erro de transcrição
  - `tests/__mocks__/tokensMock.ts` (+63 linhas): mock centralizado de tokens do tema (inclui tokens do StackedHeader) para todos os testes

- **Flag `feedbackPromoSeen` — momento zero do bônus de feedback**:
  - `functions/src/genkit/schemas/common.ts`: campo `feedbackPromoSeen: z.boolean()` no `UserSettingsSchema`
  - `functions/src/usage/credit-service.ts` (+24/-2): lógica que ativa `feedbackPromoSeen = true` quando o saldo do usuário zera pela primeira vez (transição `availableCredits` > 0 → 0)
  - `src/hooks/useCredits.ts` (+11/-0): propagação do campo no `CreditState` e `CreditSnapshot`, valor padrão `false`
  - `src/components/feedback/FeedbackFab.tsx` (+4/-2): FAB só aparece quando `feedbackPromoSeen = true` (vitrine no "momento zero", sem bônus concedido)
  - `src/components/feedback/FeedbackBanner.tsx`: lógica de visibilidade integrada com a flag
  - `src/components/app/Sidebar.tsx` (+7/-4): item "Feedback" sempre presente (exceto créditos ilimitados) — CTA simplificado, sem condição de bônus
  - `src/components/app/MobileBottomNav.tsx` (+17/-4): mesmo padrão — feedback CTA sempre disponível no drawer
  - `src/features/assistant/components/AssistantMessages.tsx` (+5/-3): chip de feedback sempre presente para usuários autenticados (exceto ilimitados), label muda após bônus concedido
  - Testes: `FeedbackFab.component.test.tsx` — 1 cenário novo (não renderiza quando `feedbackPromoSeen = false`); `credit-service.unit.test.ts` (+175 linhas) — 3 testes de ativação `feedbackPromoSeen` (reserva zera saldo, confirmação mantém, reversão restaura)

- **`stopSwipePropagation()`** (`src/hooks/useSwipeTabs.ts`, +16/-1): nova função utilitária exportada que chama `event.stopPropagation()` em `onPointerDownCapture` — padrão da doc oficial do Motion para evitar que gestos de swipe em elementos interativos propaguem para o container pai de swipe de tabs. 33 elementos protegidos no total (Inspector: 18, VoiceCard: 2, ScriptEditor: 4, EmotionSelector: 2, AIModeToggle: 1, InlineAIWidget: 5, +1 definição)

### Alterado

- **firestore.rules** (+2/-0): campo `timestamp` adicionado como obrigatório na validação da collection `errorLogs` (validação de tipo `is timestamp`)
- **functions/src/flows/audio.ts** (+8/-6): lógica de validação PCM simplificada — retries esgotados tratados como `revert` direto sem condicional extra (`if (pcmBuffer)` removido)
- **functions/src/genkit/middlewares/skills.ts** (+4/-1): comentário e constância da inicialização única do `use_skill` tool (garantida por `const` no escopo)

### Corrigido

- **Bug de ToolInterruptError no fluxo Interview** (`functions/src/flows/assistant.ts`, +14/-2): `interviewInterrupt` movido para antes de `genkitResume` — corrige `ReferenceError` em cenários onde o interrupt era usado antes de ser definido no escopo. Verificado via análise do código-fonte do Genkit (`ToolInterruptError` definido em `@genkit-ai/ai/src/tool.ts:498`)

### Melhorado

- **Condições de visibilidade do CTA de feedback unificadas**: Sidebar, MobileBottomNav e AssistenteMessages agora mostram o item/chip de feedback para todos os usuários autenticados (exceto créditos ilimitados), independentemente de já terem recebido o bônus — simplifica a lógica de "atalho permanente"

### Removido

- **Header.tsx** (`src/components/Header.tsx`, -670 linhas): componente de cabeçalho AppBar removido (substituído pela Sidebar e GuestMobileNav desde v0.123.0). Imports associados removidos de `App.tsx`
- **Testes de app shell obsoletos**: `tests/app/app-shell.test.tsx` (-238 linhas), `tests/app/routes-configuracoes.unit.test.tsx` (-224 linhas), `tests/app/routing.test.tsx` (-289 linhas) — testes do Header/AppBar removidos

### Documentado

- **docs/audits/**: 9 novos documentos — `feedback-promoseen-flag-audit.md` (478 linhas), `pwa-install-prompt-audit.md` (247 linhas), `stacked-header-onday-2-3-audit.md` (907 linhas), `interview-interrupt-toolinterrupterror-fix.md` (178 linhas), `gap-01-swipe-propagation-fix-validation.md` (159 linhas), `onday-2-3-validator-2026-06-03.md` (279 linhas), `working-tree-full-audit-2026-06-03.md` (169 linhas), `use-swipe-tabs-pointerdown-capture-fix.md` (115 linhas)
- **docs/plan/**: 3 novos planos — `pwa-install-prompt-base.md` (263 linhas), `pwa-install-prompt-plano-final.md` (367 linhas), `pwa-install-prompt-product.md` (399 linhas)

---

## [0.124.1] - 2026-06-02

### Adicionado

- **Middleware `toolValidationRecovery` no assistente IA** (`functions/src/flows/assistant.ts`): novo middleware Genkit via `generateMiddleware` que intercepta `ValidationError` do Genkit (input de tool não passa no schema) e converte em `toolResponse` amigável — o modelo se auto-corrige no próximo turno em vez de quebrar o tool loop. Import `generateMiddleware` adicionado. Substitui a função local `toolErrorResponse` e os try/catch individuais de 5 tools (`getStudioState`, `getUserMemories`, `updateStudio`, `webSearch`), agora protegidas centralizadamente pelo middleware
- **`.describe()` em todos os schemas Zod do assistente** (`functions/src/genkit/schemas/common.ts`): `AssistantSubtaskSchema`, `AssistantTaskSchema`, `AssistantPlanSchema`, `UpdatePlanInputSchema`, `WebSearchInputSchema`, `UpdateStudioInputSchema`, `InterviewOptionSchema`, `InterviewQuestionSchema`, `InterviewInputSchema`, `RespondSuggestedActionSchema`, `RespondMediaSchema`, `RespondInputSchema` — todos os campos agora têm descrições semânticas em português para guiar o LLM a gerar JSON válido, reduzindo erros de validação
- **Testes de regressão para layout mobile iOS Safari** (`tests/assistant/assistantUi.unit.test.ts`, +43 linhas): verifica que `assistantMessagesContainerSx` tem `flex: 1` + `minHeight: 0`, que `assistantEmptyStateSx` NÃO tem `minHeight`, e que a centralização via flex continua funcional
- **Documentação técnica:** `docs/audits/safetool-wrapper-and-zod-describe.md` (auditoria estática do wrapper `safeTool` e `.describe()`) e `docs/scan/tool-validation-retry-gaps.md` (scan de lacunas para retry robusto de validação)

### Corrigido

- **Bug de layout no chat mobile iOS Safari** (`src/features/assistant/components/assistantUi.ts`): `assistantMessagesContainerSx` agora usa `flex: 1` + `minHeight: 0` em vez de depender de `minHeight: '100%'` no `EmptyChatState`. Isso elimina o ciclo de altura no iOS Safari quando o teclado virtual abre ao focar o textarea — o composer `sticky` não perdia mais a referência e a área de chat não "vazava" para fora da viewport

### Melhorado

- **Robustez do tool loop do assistente:** erros de validação de schema (Camada 2) agora são interceptados centralizadamente pelo middleware `toolValidationRecovery`, que extrai mensagens de erro legíveis e as retorna como `toolResponse` — o modelo Gemini pode se auto-corrigir sem interromper a conversa. Erros de runtime continuam sendo capturados com o mesmo padrão de `toolResponse` com `{ error: true }`

---

## [0.124.0] - 2026-06-02

### Adicionado

- **Renderização Cross-Route (PR1 "Video Render Survive Navigation")** — renderização de vídeo e speed paint agora sobrevivem à navegação entre rotas:
  - `src/features/video-render/store/videoRenderController.tsx` (+548 linhas): controller Zustand singleton que gerencia o ciclo de vida do `renderMediaOnWeb` do Remotion fora do ciclo de vida React. `AbortController` em escopo de módulo, lazy import de `@remotion/web-renderer`, progresso com throttle (inteiro, `lastReportedPercentRef`), bridge legado (`videoRenderBridge`), cancelamento idempotente, reset com revogação de blob URL. Action `setCodecContainer()` para sincronização de codec/container
  - `src/features/speed-paint/store/speedPaintRenderController.tsx` (+801 linhas, substitui stub de 103 linhas): controller Zustand singleton equivalente ao de vídeo. Suporta render single + batch, composições React (ExportableSpeedPaintComposition, ExportableBatchSpeedPaintComposition), lazy import Remotion, mesmo padrão de AbortController/throttle/cancelamento. Action `setCodecContainer()`
  - `src/features/video-render/types/renderController.ts` (+112 linhas): tipos compartilhados entre controllers — `RenderKind`, `RenderStatus`, `RenderPhase`, `RenderControllerPublicState`, `RenderControllerActions<O>` com interface genérica
  - `src/hooks/useCrossRouteRenderGuard.ts` (+113 linhas): hook guard que centraliza `beforeunload` (aviso ao fechar aba com render ativo), `visibilitychange`/`focus` (pausa/retoma), `document.title` dinâmico durante rendering
  - `src/components/app/ExportCrossRouteToast.tsx` (+275 linhas): Snackbar MUI global de progresso cross-route — ícone spinner/check/erro, botões Ver Vídeo/Cancelar/Baixar/Fechar, roteia entre `/app/video` e `/app/pintura-rapida`. Handlers estáveis via `useCallback` + objetos constantes em escopo de módulo (otimizado para 30×/s durante render)
  - `src/components/app/SidebarNavItem.tsx`: subcomponente `ExportDot` com animação pulsante — azul durante render, verde estático ao concluir
  - `src/components/app/Sidebar.tsx`: dot indicator estendido para speed paint (`spIsRendering`/`spStatus` do speed paint controller)
  - `src/components/app/MobileBottomNav.tsx`: dot indicator de exportação de vídeo no item "Vídeo"
  - Namespace i18n `exportCrossRoute.*` nos 3 locales: actionViewVideo, actionCancel, actionDownload, actionClose, actionSeeDetails, renderingTitle, completedTitle, failedTitle, mobileDotActive, mobileDotCompleted — 10 chaves por locale
  - Evento analytics `video_export_completed_offroute` em `src/lib/analytics.ts`: telemetria de exportação concluída em rota diferente da página de origem

### Alterado

- **src/features/video-render/hooks/useVideoExporter.tsx** (+150/-429): refatorado para fachada fina — lógica pesada migrada para `videoRenderController`. Agora lê estado via `useStore` (seletores primitivos, `useShallow` para `speedPaintWarnings`). `useEffect` cleanup que abortava render no unmount **removido** (controller gerencia seu AbortController). Return object split em `actions` (estável) + state (reativo). Codec/container sincronizados via `setCodecContainer()` action nomeada
- **src/features/speed-paint/hooks/useSpeedPaintExporter.tsx** (+173/-586): refatorado para fachada fina — mesmo padrão do hook de vídeo. Lógica de composições Remotion, lazy import, download, analytics migrada para controller. AbortController cleanup no unmount removido. Codec/container sincronizados via `setCodecContainer()`
- **src/App.tsx** (+9/-4): `useCrossRouteRenderGuard` e `ExportCrossRouteToast` adicionados ao shell
- **src/components/app/AudioGenerationHandler.tsx** (+5/-13): `beforeunload` removido (migrado para `useCrossRouteRenderGuard`)
- **src/pages/VideoPage.tsx** (+4/-9): `useEffect` de sincronização bridge removido (controller faz via `reportProgress`)
- **src/features/i18n/locales/en.ts, es.ts, pt-BR.ts** (+32 cada): namespace `exportCrossRoute`
- **src/components/toast/ToastProvider.tsx** (+5/-63): toast de exportação de vídeo removido (substituído por ExportCrossRouteToast)
- **src/features/video-render/types/renderController.ts**: `setCodecContainer` adicionado à interface `RenderControllerActions`
- **tests/video-render/videoRenderController.unit.test.ts** (+292 linhas): novos testes do controller
- **tests/components/ExportCrossRouteToast.component.test.tsx** (+246 linhas): novos testes do toast cross-route
- **tests/hooks/useCrossRouteRenderGuard.unit.test.ts** (+226 linhas): novos testes do guard
- **tests/speed-paint/useSpeedPaintExporter.unit.test.tsx** (+35/-19): 4 testes atualizados para fachada fina (status text, cancelamento, resetSupport)
- **tests/video-render/useVideoExporter-speedpaint.unit.test.tsx** (-425 linhas): removido (lógica migrada para controller)

### Melhorado

- **ExportCrossRouteToast.tsx**: 5 handlers envolvidos em `useCallback` + 6 objetos extraídos para constantes de módulo (`TOAST_ANCHOR_ORIGIN`, `TOAST_SLOT_PROPS`, `ALERT_SX`, `PROGRESS_STACK_SX`, `TITLE_SX`, `MONO_SX`) — elimina recriação de objetos a cada render no hot path (30×/s durante progresso)
- **useVideoExporter.tsx**: `speedPaintWarnings` usa `useShallow` para comparação shallow — re-render apenas quando conteúdo do array muda; `useEffect` + `setState` substituído por action nomeada `setCodecContainer()`
- **useSpeedPaintExporter.tsx**: `useEffect` + `setState` substituído por action nomeada `setCodecContainer()`

### Removido

- **RenderSnapshot** interface de `src/features/video-render/types/renderController.ts` — código morto (declarado mas nunca consumido)
- **docs/plan/ e docs/scan/**: 11 documentos de planejamento/auditoria da versão antiga (arquivados como conclusos)

---

## [0.123.0] - 2026-06-02

### Adicionado

- **Sidebar de Navegação Colapsável** — novo sistema de navegação lateral que substitui o `Header` nas rotas `/app/*`:
  - `src/components/app/Sidebar.tsx` (+247 linhas): componente Sidebar com dois estados — collapsed (68px, apenas ícones) e expanded (264px, ícones + labels). Drawer `permanent` customizado com `MuiDrawer-paper` estilizado, toggle animado via Motion, 7 itens de navegação, destaque visual da rota ativa, persistência do estado colapsado em `localStorage` via `s2a_sidebar_collapsed`
  - `src/components/app/SidebarHeader.tsx` (+113 linhas): header da Sidebar com logo Koda AI Studio, botão de toggle colapsar/expandir (ícones `ChevronLeft`/`ChevronRight`), animação Motion fade
  - `src/components/app/SidebarFooter.tsx` (+271 linhas): footer com avatar do usuário (nome + email), créditos (`CreditIndicator`), menu de acesso rápido (Perfil, Gerenciar Cookies, Logout com `LogoutConfirmDialog`)
  - `src/components/app/SidebarNavItem.tsx` (+143 linhas): item de navegação individual com `ListItemButton`, tooltip no estado collapsed, ícone + label no estado expanded, Motion para micro-animações
  - `src/components/app/SidebarNetworkBanner.tsx` (+39 linhas): banner de conectividade de rede posicionado no topo da Sidebar
  - `src/components/app/GuestMobileNav.tsx` (+203 linhas): drawer mobile para visitantes não autenticados (extraído da lógica anterior do Header) — avatar genérico, links de navegação, botão "Abrir App"
  - `src/components/app/DeleteAccountDialog.tsx` (+118 linhas): dialog de exclusão de conta com confirmação textual (`CONFIRM_KEYWORD` = "EXCLUIR"), validação de input, feedback de erro/sucesso, integração com `useAuth().deleteAccount()`
  - `src/features/sidebar/store.ts` (+28 linhas): store Zustand com `create<SidebarState>()(...)`, estado `collapsed: true`, actions `toggle()` e `setCollapsed()`, middleware `persist` com `s2a_sidebar_collapsed` no localStorage
  - `src/theme/tokens.ts` (+21 linhas): novos tokens `SIDEBAR_WIDTH_COLLAPSED` (68), `SIDEBAR_WIDTH_EXPANDED` (264), `SIDEBAR_TRANSITION_DURATION` (250ms)
  - `src/App.tsx` (+38/-8): `Header` removido, `Sidebar`, `GuestMobileNav` e `SidebarNetworkBanner` adicionados; keep alive do `MobileBottomNav` em mdDown

- **Sistema de Feedback Global** — 8 novos arquivos em `src/components/feedback/` (~818 linhas no total):
  - `FeedbackController.tsx` (+81 linhas): controller global que escuta evento customizado `OPEN_FEEDBACK_EVENT` e renderiza o `FeedbackDialog`
  - `FeedbackDialog.tsx` (+178 linhas): dialog modal com título, campos de formulário, submissão via Cloud Function, feedback visual de sucesso/erro
  - `FeedbackFab.tsx` (+145 linhas): floating action button no canto inferior direito das rotas `/app/*` — visível apenas para usuários autenticados, abre o dialog de feedback
  - `FeedbackBanner.tsx` (+83 linhas): banner informativo no Assistente IA — sugere envio de feedback com bônus de 250 créditos (desaparece após envio)
  - `FeedbackFormFields.tsx` (+242 linhas): campos de formulário reutilizáveis (categoria, assunto, descrição) — compartilhados entre `FeedbackDialog` e `ContactPage`
  - `useFeedbackDialog.ts` (+36 linhas): hook imperativo `useFeedbackDialog()` que retorna função `openFeedback(source)` — dispara evento `OPEN_FEEDBACK_EVENT` no `window`
  - `constants.ts` (+28 linhas): `FEEDBACK_CATEGORIES` com 5 categorias (bug, sugestão, elogio, dúvida, outro), enum `FeedbackCategory`
  - `index.ts` (+25 linhas): barrel exports de todos os componentes e hooks
  - Namespace `feedback.*` nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`, +61 linhas cada): `dialog.*` (title, category, subject, description, submit, success, error), `fab.*` (label, ariaLabel), `banner.*` (title, description, button), `emptyState.*`, `navItem.*` (label, ariaLabel), `sidebar.*` (label, ariaLabel), `toggle.*`, `user.*`, `groups.*`
  - Integração em `Assistant.tsx`: `FeedbackBanner` adicionado abaixo do chat
  - Integração em `AssistantMessages.tsx`: botão "Feedback (+250)" com `RateReviewIcon` e `useFeedbackDialog`
  - Integração em `MobileBottomNav.tsx`: item "Feedback (+250)" no drawer com `action='feedback'` (corrigido para passar `item.action` no `onClick`)
  - Integração em `App.tsx`: `FeedbackController` e `FeedbackFab` renderizados no shell

- **ContactPage refatorada** (`src/pages/public/ContactPage.tsx`, +11/-161 linhas): formulário de contato local substituído por `FeedbackFormFields` reutilizável — elimina duplicação de ~160 linhas de formulário. Ícone `RateReviewIcon` adicionado. Import do `firebase/functions` e `callable-utils` removidos (submissão agora via componente compartilhado)

- **Testes** (+969 linhas líquidas):
  - `tests/components/Sidebar.component.test.tsx` (+321 linhas): 19 testes — larguras collapsed/expanded, toggle, itens de navegação (7), acessibilidade (aria-labels), user null (sem avatar/logout), delete account dialog
  - `tests/components/Sidebar.features.test.tsx` (+310 linhas): 18 testes — links de navegação (hrefs corretos), active state por rota, persistência do toggle, logout dialog, feedback dialog, locale selector
  - `tests/features/sidebar/store.test.ts` (+126 linhas): 12 testes — estado inicial, toggle, setCollapsed, persistência localStorage
  - `tests/components/feedback/FeedbackController.component.test.tsx` (+211 linhas): testes do controller com evento customizado
  - `tests/components/feedback/FeedbackFab.component.test.tsx` (+200 linhas): testes do FAB com visibilidade condicional

### Alterado

- **App.tsx** (+38/-8): Header removido, Sidebar adicionado com 6 novos imports; MobileBottomNav preservado em mobile; GuestMobileNav para visitantes; FeedbackController e FeedbackFab integrados
- **ContactPage.tsx** (+11/-161): refatoração para usar `FeedbackFormFields` compartilhado — formulário de contato reutilizável, remove dependências diretas de Cloud Functions
- **MobileBottomNav.tsx** (+35/-10): item "Feedback (+250)" no drawer com `action='feedback'`; import de `RateReviewIcon`, `useCredits`, `useFeedbackDialog`; correção do `onClick` para passar `item.action`
- **Assistant.tsx** (+4/-0): FeedbackBanner adicionado abaixo do chat do assistente
- **AssistantMessages.tsx** (+36/-0): botão "Feedback (+250)" com `RateReviewIcon`, integração com `useFeedbackDialog` e `useAuth`
- **StudioPage.tsx** (+2/-2): ajustes internos de implementação
- **tokens.ts** (+21/-0): novos tokens de largura e transição da Sidebar

### Removido

- **Header.tsx** (removido de `App.tsx`): componente de cabeçalho AppBar substituído pela Sidebar lateral — `GuestMobileNav` extraído para componente próprio; `LogoutConfirmDialog`, `CreditIndicator` e `LocaleSelector` movidos para `SidebarFooter`
- **Testes do Header**: `tests/components/Header.component.test.tsx` (-183 linhas) e `tests/components/Header.features.test.tsx` (-183 linhas) — removidos junto com o componente
- **Formulário de contato local** (ContactPage.tsx, -160 linhas): formulário inline substituído por `FeedbackFormFields` compartilhado

---

## [0.122.0] - 2026-06-01

### Adicionado

- **AuthActionPage** (`src/pages/AuthActionPage.tsx`, +694 linhas): nova página pública dedicada ao tratamento customizado de ações de email do Firebase Auth — verificação de email, reset de senha e recuperação de email. Suporta 3 fluxos completos com estados de loading/sucesso/erro, animações Motion (AnimatePresence + fade), mapeamento de error codes Firebase → chaves i18n (8 códigos mapeados), formulário de nova senha com validação (mínimo 6 caracteres + confirmação), layout com PublicHeader/PublicFooter e glass panel MUI. SEO via `DocumentHead` com title/description dinâmicos por locale. Rota pública `/auth/action` sem COEP
- **authActionCodeSettings** (`src/lib/auth-action-settings.ts`, +12 linhas): utilitário que exporta `ActionCodeSettings` compartilhado com `handleCodeInApp: true` — faz links de ações de email (verificação, reset, recuperação) apontarem para `/auth/action` em vez do handler padrão do Firebase. Importado por `AuthContext`, `ProtectedRoute` e `LoginPage`
- **Chaves i18n `authAction.*`** nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`, +56 linhas cada): namespace completo com SEO (seoTitle, seoDesc), verificação (verifyEmail.*), reset de senha (resetPassword.*, validation.*), recuperação de email (recoverEmail.*), erros mapeados (8 error codes → chaves i18n)
- **Testes do AuthActionPage** (`tests/pages/AuthActionPage.component.test.tsx`, +412 linhas): 20+ testes cobrindo verificação de email, reset de senha, recuperação de email, tratamento de erros, navegação e validação de formulário
- **Rota `/auth/action`** no router (`routes.tsx`): lazy loading com `AuthActionPage`, rota pública sem restrição de auth
- **Pre-render** (`vite.config.ts`): `/auth/action` adicionado à lista de rotas pré-renderizadas

### Alterado

- **AuthContext** (`src/contexts/AuthContext.tsx`): `sendEmailVerification` agora recebe `authActionCodeSettings` como segundo argumento — link de verificação aponta para `/auth/action`
- **ProtectedRoute** (`src/components/ProtectedRoute.tsx`): import de `authActionCodeSettings` para reenvio de verificação com link customizado
- **LoginPage** (`src/pages/LoginPage.tsx`): atualizada para usar `authActionCodeSettings` no fluxo de recuperação de senha
- **firebase.ts** (`src/lib/firebase.ts`): novos exports de tipo — `User`, `ActionCodeInfo`, `ActionCodeSettings`
- **Testes existentes**: `ProtectedRoute.component.test.tsx` e `AuthContext.unit.test.tsx` atualizados para refletir `authActionCodeSettings` nos asserts

### Removido

- **Documento obsoleto** (`docs/scan/auditoria-ux-4-melhorias.md`, -151 linhas): auditoria de UX concluída e arquivada

---

## [0.121.0] - 2026-06-01

### Adicionado

- **Sistema de logging modular com error tracking** (`src/lib/logger/`, 8 módulos: `types`, `config`, `console`, `filters`, `sanitization`, `interceptor`, `batch-processor`, `index` — ~1300 linhas no total): substitui o arquivo único `src/lib/logger.ts` por uma arquitetura modular com rastreamento de erros em produção via Firestore (`errorLogs` collection). 26 exports públicos — `createLogger()` (compatível com API anterior), `initErrorTracking()` (chamada em `main.tsx` na inicialização), `setLoggerUserId()` (vincula logs ao usuário autenticado via `AuthContext`), `flushLogs()` (envio forçado de pendentes), sanitização automática de dados sensíveis (tokens, emails, senhas), batch processor para envio em lote ao Firestore, interceptação global de erros (`window.onerror`, `unhandledrejection`). Configurado via 3 env vars: `VITE_LOGGER_ENABLED`, `VITE_LOGGER_MIN_LEVEL`, `VITE_LOGGER_SEND_IN_DEV`
- **LogoutConfirmDialog** (`src/components/LogoutConfirmDialog.tsx`, +56 linhas): novo componente reutilizável de confirmação de logout com Dialog MUI e i18n completo (4 chaves `studio.header.logout.*` nos 3 locales). Integrado em `Header.tsx`, `PublicHeader.tsx` e `MobileBottomNav.tsx`
- **Seção "Idioma da interface" nas Configurações** (`Configuracoes.tsx`): novo seletor de locale da UI persistido em `UserSettings` via dual storage (Firestore + IndexedDB). Import de `Language` icon e `LOCALE_CONFIGS` do módulo i18n
- **MobileBottomNav expandido** (`MobileBottomNav.tsx`, +100/-5 linhas): menu mobile com seletor de idioma (`Menu`/`MenuItem` MUI), gerenciamento de cookies (analytics consent via `openAnalyticsConsentDialog`) e dialog de confirmação de logout. Novos imports: `Language`, `Cookie`, `Menu`, `MenuItem`, `Locale`, `AnalyticsConsentPrompt`, `LogoutConfirmDialog`
- **Script de exportação de error logs** (`scripts/export-error-logs.ts`, +459 linhas): ferramenta CLI para exportar e analisar logs de erros do Firestore com filtros por data, nível e categoria. Script registrado em `package.json` como `export-error-logs`
- **Regras Firestore para `errorLogs`** (`firestore.rules`, +29 linhas): collection com validação estrita — apenas `create` por usuários autenticados, campos obrigatórios validados (`id`, `level`, `category`, `context`, `message`, `payload`, `userId`, `sessionId`, `pageUrl`, `userAgent`, `viewport`, `stackTrace`, `occurrenceCount`, `environment`). Leitura/atualização/exclusão bloqueadas para clientes
- **Variáveis de ambiente do logger** em `.env.example`: `VITE_LOGGER_ENABLED`, `VITE_LOGGER_MIN_LEVEL`, `VITE_LOGGER_SEND_IN_DEV`
- **Chaves i18n** nos 3 locales: `studio.header.logout.*` (dialogTitle, dialogDescription, dialogCancel, dialogConfirm), `configuracoes.interfaceLocaleLabel`, quick actions renomeadas (`howItWorks`, `createScript`, `whichVoice`)

### Alterado

- **Logger**: `src/lib/logger.ts` (arquivo único, ~142 linhas) → `src/lib/logger/` (8 módulos, ~1300 linhas). API pública `createLogger()` mantida totalmente compatível via re-export do `index.ts`. Novo `initErrorTracking()` chamado em `main.tsx` na inicialização
- **ErrorBoundary**: movido de `main.tsx` (inline) para `src/components/ErrorBoundary.tsx` — integrado com o novo logger e importado em `routes.tsx`
- **Header.tsx** (+32/-4): `LogoutConfirmDialog` substitui logout direto — botão "Sair" agora abre dialog de confirmação antes de efetuar logout
- **PublicHeader.tsx** (+22/-1): `LogoutConfirmDialog` integrado para logout de usuários autenticados pela área pública
- **Quick actions do assistente** (3 locales): `adjustPace`/`suggestScene` → `howItWorks`/`createScript`/`whichVoice` — sugestões contextuais mais relevantes para novos usuários
- **Brand**: "Estúdio de Produção" → "AI Studio" em `ProductDemoSection.tsx` e chaves i18n dos 3 locales (`studio.header.subtitle`, `studio.header.title`)
- **LocaleSelector.tsx**: refatorado para usar theme tokens (`ICON_SIZE_LG`, `APP_BORDER`, `WHITE_05`, `WHITE_015`) em vez de valores inline
- **Error handling consistente** (~15+ arquivos): `catch {}` → `catch (err: unknown)` com `log.warn()` incluindo contexto e `String(err)`. Arquivos: `useProjectGallery.ts`, `useTranscription.ts`, `strokeCache.ts`, `analytics.ts`, `account-cleanup.ts`, `chats.ts`, `user-settings.ts`, `wizardStore.ts`, `audio.ts` (backend), `assistant.ts` (backend), `credit-service.ts` (backend)
- **Backend (Cloud Functions)**: todos os 8 flows migrados para `createLogger` de `genkit/utils/logger.js` — `credit-snapshot.ts`, `feedback.ts`, `ping.ts`, `scene-prompts.ts`, `genkit.ts`, `index.ts`, `ai-requests.ts`, `credit-service.ts`. Tratamento de erros com `err: unknown` e logging contextual
- **`main.tsx`** (+16/-24): `ErrorBoundary` movido para arquivo próprio; novo `initErrorTracking()` na inicialização; remoção do import `RoutableErrorBoundary`
- **`routes.tsx`** (+10/-4): `ErrorBoundary` importado de `../components/ErrorBoundary` e aplicado como wrapper das rotas autenticadas

### Corrigido

- **Testes** (30+ arquivos): `setLoggerUserId: vi.fn()` adicionado ao mock do logger em todos os testes. Testes de `Header` atualizados para refletir dialog de logout (não mais logout direto). Testes de `ProductDemoSection` e `LandingPage` atualizados para novo brand "AI Studio". Teste de `Configuracoes` atualizado para múltiplos selects de locale. Novos mocks de Firebase em `imageProcessing.unit.test.ts` e `speedPaintRenderer.unit.test.ts`. Novo teste `imageTextLanguage.unit.test.ts` (+40 linhas)
