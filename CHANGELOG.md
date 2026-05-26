# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.52.1] - 2026-05-26

### Alterado

- **Copy das páginas públicas (último commit não documentado):** revisão completa do tom das páginas públicas para estilo casual-confiante em pt-BR, en e es — landing page (hero title, subtitle, CTA, feature cards, social proof), seção de métricas, FAQ do beta, depoimentos, casos de uso. Textos mais diretos e conversacionais em todas as 3 traduções (`src/features/i18n/locales/`)
- **`src/components/public/PublicFooter.tsx`:** novo grupo "Recursos" com links para Roadmap, Changelog e Comunidade — chaves `resourcesGroup`, `roadmap`, `changelog`, `community` adicionadas nos 3 dicionários i18n
- **`src/data/metrics.ts`, `src/data/pricingFaq.ts`, `src/data/testimonials.ts`, `src/data/useCases.ts`:** textos atualizados para tom mais direto e confiante em todos os 3 idiomas
- **`src/components/public/CTASection.tsx`:** `fontSize` responsivo (`xs: 1.875rem → md: 3rem`) e `maxWidth` responsivo no título
- **`src/components/public/FeatureCard.tsx`:** `fontSize: '0.875rem'` explícito no `Typography variant="body2"`
- **`src/components/public/FeatureShowcase.tsx`:** `fontSize` responsivo (`xs: 0.9375rem → md: 1rem`) no `Typography variant="body1"`
- **`src/pages/public/FuncionalidadesPage.tsx`:** padding (`pt`) e margin (`mt`) responsivos nos containers das seções
- **`src/pages/public/LandingPage.tsx`:** padding (`pt`) e margin (`mt`) responsivos nos containers da hero e feature showcases

---

## [0.52.0] - 2026-05-26 — tipos `CloudRunJobConfig`, `CloudRunRunApiResponse`, `CloudRunOperationResponse`, `CloudRunExecutionResponse`. Permite disparar jobs assíncronos no Cloud Run via API REST da Google, substituindo chamadas HTTP diretas ao serviço para renderização de vídeo

- **`functions/src/flows/on-video-job-terminal.ts`**: nova Cloud Function `onDocumentWritten` (+153 linhas) que monitora mudanças na subcoleção `users/{uid}/video_jobs/{jobId}` e executa ações quando um job atinge status terminal (completed/failed/cancelled) — inclui `inferResolutionLabel()` para inferir label de resolução a partir dos inputs do job

- **`functions/src/flows/delete-job.ts`**: nova Cloud Function callable (+72 linhas) para deletar jobs manuais (safety valve) — recebe `jobId` e `jobType`, remove o documento da subcoleção correspondente no Firestore

- **`functions/src/flows/job-cancel-helpers.ts`**: novo módulo compartilhado (+207 linhas) com funções `cancelQueuedSubJobNow()` e tipo `SubJobType` — extrai lógica de cancelamento cooperativo de sub-jobs para reuso entre `cancel-pipeline.ts` e `cleanup-old-jobs.ts`

- **`cloud-run/src/renderer.ts`**: novas funções exportadas `loadRenderRequestFromJob()` e `renderVideoJob()` — a primeira carrega um `RenderRequest` a partir de um job doc do Firestore; a segunda orquestra a renderização completa incluindo polling de cancelamento e upload do resultado

- **`cloud-run/src/types.ts`**: interface `RenderJobExecutionRequest` com parâmetros de execução de job (jobId, userId, projectId, storageBucket, storagePath, downloadPath)

- **`cloud-run/src/index.ts`**: função `isSupportedCodec()` — validação tipada de codec suportado (`RenderRequest['codec']`) para renderização

- **`cloud-run/scripts/deploy.ps1`**: deploy do Cloud Run Job `remotion-renderer-job` (60min timeout, 1 task, 0 retries, service-account) ao lado do service auxiliar existente — o job é o worker oficial de renderização, o service continua como auxiliar

- **`cloud-run/package.json`**: script `start:job` para executar o entry point de job (`node dist/run-render-job.js`)

- **`functions/.env.example`**: variáveis `CLOUD_RUN_JOB_NAME`, `CLOUD_RUN_JOB_REGION`, `CLOUD_RUN_VIDEO_ENABLED` documentadas para configuração de Cloud Run Jobs

- **`functions/src/usage/video-jobs.ts`**: interface `VideoSpeedPaintSummary` — tipagem para sumário estatístico de speed paint no job de vídeo

- **`src/features/video-render/components/SpeedPaintScene.tsx`**: função `fetchStrokeAnimation()` para carregar animações de stroke armazenadas no servidor (Cloud Run) — quando `strokeAnimationUrl` está disponível, busca no Storage em vez de gerar localmente, reduzindo latência e processamento no frontend

- **`src/features/video-render/types.ts`**: campos `strokeAnimationUrl`, `speedPaintStatus`, `speedPaintError` nas interfaces de cena — permitem que o frontend exiba status diagnóstico da animação gerada server-side

- **`src/features/jobs/components/JobList.tsx`**: tipos `JobMutationInput`/`JobMutationOutput` e integração com `react-hot-toast` para feedback ao cancelar/deletar jobs

- **`src/features/jobs/components/JobProgressBar.tsx`**: função `normalizeProgressLabel()` — normaliza labels de progresso do Firestore para exibição amigável, capitalizando e removendo hífens

- **`src/hooks/useJobsStore.ts`**: tipo `PipelineJobRecord` e função `mapPipelineJob()` — mapeamento de pipeline jobs para o formato `AnyJob` unificado da store, permitindo que apareçam na lista geral de jobs

- **`src/features/video-render/hooks/useVideoExporter.tsx`**: tratamento de erro para quando a renderização continua no servidor (Cloud Run) — exibe mensagem amigável informando que o job continua processando em background

- **`src/features/video-render/lib/exportUtils.ts`**: detecção de mensagens "renderização continua no servidor" e "timeout aguardando renderização de vídeo" para feedback contextual ao usuário, com fallback para mensagem original

- **`package.json`**: script `deploy:storage:cors` — atualiza configuração CORS do Storage bucket via gcloud CLI

- **`src/components/ActionBar.tsx`**: uso da constante `RADIUS_SM` do tema em vez de valor hardcoded `8` — alinhamento com sistema de design

### Alterado

- **`functions/src/flows/start-video-job.ts`**: verificação de env var alterada — agora usa `CLOUD_RUN_URL` como gate direto em vez de checagem inline; comentários explicativos redundantes removidos

- **`functions/src/flows/process-video-job.ts`**: refatorado para usar o novo módulo `cloud-run-jobs.ts` — removidos `CloudRunRenderPayload`, `getCloudRunUrl()`, `getIdentityToken()`, `buildRenderPayload()`, `finishVideoAiRequest()`. Adicionados tipos `ErrorDetails`, função `getErrorDetails()` e progresso granular no Firestore com stage e label

- **`cloud-run/src/logger.ts`**: nível `info` não é mais suprimido em produção — apenas `debug` permanece oculto, permitindo logs de operação visíveis no Cloud Run para diagnóstico

- **`cloud-run/remotion/index.tsx`**: funções `fetchStrokeAnimation` e `loadStrokeAnimations` removidas (migradas para `SpeedPaintScene.tsx`) — props de entrada simplificadas, reduzindo acoplamento do módulo Remotion

- **`functions/src/flows/cancel-job.ts`**: importa e utiliza `cancelPipelineNow` do módulo `cancel-pipeline` para propagar cancelamento de forma consistente entre pipelines e jobs individuais

- **`functions/src/flows/cancel-pipeline.ts`**: exporta `cancelPipelineNow()` como função separada — reutilizável por `cancel-job.ts` e `cleanup-old-jobs.ts`; refatorada para usar `SubJobType` do `job-cancel-helpers.ts`

- **`functions/src/flows/cleanup-old-jobs.ts`**: nova função `reconcileQueuedCancelledJobs()` — reconcilia jobs que ficaram em `queued` após cancelamento de pipeline; constantes `FIFTEEN_MINUTES_MS` e `SUB_JOB_TYPE_BY_COLLECTION` para mapeamento de coleções

- **`functions/src/flows/on-sub-job-completed.ts`**: campos `estimatedCredits` e `resolutionLabel` adicionados aos metadados do sub-job — melhora rastreamento de créditos e qualidade de vídeo no pipeline

- **`functions/src/index.ts`**: exporta `onVideoJobTerminal` e `deleteJob` — total: 26 Cloud Functions de IA

- **`cloud-run/src/renderer.ts`**: removidas funções `confirmCredits` e `revertCredits` (lógica de créditos centralizada nas Cloud Functions); imports para `./types.js` refatorados

- **`src/lib/generic-jobs.ts`**: `subscribeToJobs` modificado para incluir campo `input` nos pipeline jobs durante a assinatura do Firestore

---

## [0.51.0] - 2026-05-25

### Adicionado

- **`cloud-run/src/storageDownload.ts`**: novo módulo dedicado com funções `createDownloadToken()`, `buildStorageDownloadUrl()`, `getPrimaryDownloadToken()` — extraídas do `renderer.ts` e `cache.ts` para responsabilidade única e reuso centralizado. Usa `node:crypto` (randomUUID) para geração de tokens

- **`cloud-run/src/renderer.ts`**: interfaces `SpeedPaintScenePayload` (cenas com status de speed paint) e `SpeedPaintRenderSummary` (sumário estatístico de animação com `requestedSceneCount`, `animatedSceneCount`, `staticFallbackCount`, `inlineFallbackCount`, `partialSuccess`, `degraded`, `statusCounts`). Speed paint summary persistido no job doc do Firestore ao finalizar. Stage progresso com label `speed-paint` e contagem de cenas animadas. Fallback com `statusCounts: { 'generation-failed': scenes.length }`. Removidos imports de `node:crypto`, `./speed-paint/cache.js`, `createDownloadToken` e `buildStorageDownloadUrl` (agora em `storageDownload.ts`)

- **`cloud-run/src/speed-paint/cache.ts`**: interface `CachedAnimationRecord` (animation + storagePath + downloadToken + downloadUrl). Função `ensureDownloadToken()` que verifica e regenera token de download no Storage se ausente. `saveToCache()` agora retorna `Promise<CachedAnimationRecord>` com URL autenticada. `readFromCache()` retorna `CachedAnimationRecord | undefined`. Inclui `metadata` com timestamp no cache. Importa `buildStorageDownloadUrl`, `createDownloadToken`, `getPrimaryDownloadToken` do novo módulo `storageDownload.js`

- **`cloud-run/src/speed-paint/imageProcessing.ts`**: função `appendStrokes(target, source)` para concatenar arrays de `Stroke` — substitui `push` manual no `generateStrokesFromPixels` e `processSketch`

- **`cloud-run/src/speed-paint/speedPaintStrokes.ts`**: tipo `SpeedPaintSceneStatus` (`'generated' | 'cached' | 'storage-upload-failed' | 'fetch-url-unavailable' | 'generation-failed'`). Interface `ProcessSceneResult`. Interface `SceneWithAnimation` com campos `speedPaintStatus` e `speedPaintError`. Funções `processScene()` e `generateStrokesForScenes()` agora retornam status detalhado por cena, incluindo erros de upload e cache

- **`cloud-run/remotion/index.tsx`**: campos `speedPaintStatus?: string` e `speedPaintError?: string` adicionados à interface `SceneWithStrokeUrl`. Mapeamento de scenes com `strokeAnimation: undefined` quando `strokeAnimationUrl` está disponível (evita serialização inline massiva)

- **`tests/cloud-run/imageProcessing.unit.test.ts`**: testes unitários para a função `appendStrokes` do módulo `imageProcessing`

- **`tests/cloud-run/storageDownload.unit.test.ts`**: testes unitários para `createDownloadToken`, `buildStorageDownloadUrl` e `getPrimaryDownloadToken` do módulo `storageDownload`

### Alterado

- **`cloud-run/src/speed-paint/cache.ts`**: `saveToCache` convertido de síncrono para assíncrono (`Promise<CachedAnimationRecord>`) — agora gera token de download e persiste metadados no Storage durante o salvamento. `readFromCache` agora retorna `CachedAnimationRecord` com URL de download autenticada em vez de apenas `StrokeAnimation`. Algoritmo de hash SHA-256 mantido via `node:crypto` (createHash) importado diretamente

- **`cloud-run/src/speed-paint/speedPaintStrokes.ts`**: `generateStrokesForScenes` agora retorna cenas com status detalhado (`SpeedPaintSceneStatus`) e mensagens de erro por cena, permitindo rastreamento granular de falhas no pipeline

- **`cloud-run/src/renderer.ts`**: progresso durante speed paint agora inclui stage `speed-paint` com label descritivo. `finalizeJobSuccess` aceita `speedPaintSummary?: SpeedPaintRenderSummary` e persiste no job doc. `finalizeJobError` agora usa `errorCode` também no fallback de speed paint

---

## [0.50.3] - 2026-05-25

### Corrigido

- **`src/features/video-render/components/WaveformOverlay.tsx`**: dependência `fps` adicionada ao array de dependências do `useMemo` que calcula `sceneDurationFrames` — sem `fps` no array, o valor memoizado não era recalculado quando o frame rate mudava, resultando em durações incorretas de cena durante reprodução

### Alterado

- **`cloud-run/remotion/index.tsx`**: função `getVideoMetadata` removida e substituída por duas novas funções — `getVideoCompositionMetadata()` (retorna `VideoMetadataResult` com duração, dimensões, fps + cenas com strokes) e `loadStrokeAnimations()` (orquestra carregamento de animações de stroke via `fetchStrokeAnimation()`). Nova interface `SceneWithStrokeUrl` para tipagem de cenas com URL de stroke. A refatoração separa a extração de metadados do carregamento de animações, melhorando a testabilidade e a responsabilidade única

- **`cloud-run/src/renderer.ts`**: adicionado import de `hashImageUrl` do módulo `./speed-paint/cache.js` — necessário para validação de cache de strokes durante renderização server-side

- **`cloud-run/src/speed-paint/cache.ts`**: implementação de `hashImageUrl` modificada internamente — ajuste no algoritmo de hash para compatibilidade com o novo fluxo de metadados de composição

---

## [0.50.2] - 2026-05-25

### Corrigido

- **`src/features/video-render/components/SpeedPaintScene.tsx`**: adicionada flag `hasCalledContinueRender` para evitar chamada duplicada de `continueRender(handle)` durante o cleanup do `useEffect` — o comentário anterior afirmava que a chamada era um "no-op seguro", mas a correção elimina o falso positivo e garante que o `delayRender` seja liberado exatamente uma vez por montagem

- **`cloud-run/src/speed-paint/speedPaintStrokes.ts`**: extraída a lógica de verificação de cancelamento (`aborted`) para fora do loop `for` — a checagem do `cancelSignal` agora ocorre uma vez antes da iteração (em vez de re-registrar o callback a cada cena), eliminando possibilidade de stale closure e reduzindo overhead

### Alterado

- **`cloud-run/src/speed-paint/speedPaintStrokes.ts`**: adicionado `sharp.cache(false)` no topo do módulo — desabilita o cache interno do sharp para evitar `Out of Memory` durante processamento pesado de múltiplas cenas no Cloud Run

- **`cloud-run/scripts/deploy.ps1`**: memória do serviço Cloud Run aumentada de `8Gi` para `16Gi` — necessário para suportar cargas de trabalho com múltiplas cenas em altas resoluções durante a renderização de vídeo Remotion. BOM UTF-8 removida do início do arquivo

---

## [0.50.1] - 2026-05-25

### Adicionado

- **Interface `GenerateStrokesOptions`** (`cloud-run/src/speed-paint/speedPaintStrokes.ts`): novo tipo que agrupa parâmetros opcionais `cancelSignal` e `targetWidth` para a função `generateStrokesForScenes()`, melhorando a tipagem e extensibilidade do módulo server-side de speed paint

- **Componente `SceneItem` memoizado** (`src/features/video-render/components/VideoComposition.tsx`): novo componente `React.memo` (+75 linhas líquidas) que encapsula a renderização de cada cena individualmente com memoização, reduzindo re-renders durante a composição de vídeo com múltiplas cenas

- **Constante `TIMEOUT_MS`** (`src/features/video-render/lib/strokeWorker.ts`): timeout de 60.000ms (60s) para operações do Web Worker de strokes — previne travamentos permanentes quando o processamento de uma cena excede o limite

- **Relatório de auditoria** (`docs/audits/audit-target-closed-speedpaint.md`): documento de 236 linhas com diagnóstico do erro "Target Closed" durante exportação de vídeo Speed Paint no Cloud Run, cobrindo ciclo de vida do browser Remotion, cancelamento cooperativo, memory pressure e Stage 0 do renderer

### Alterado

- **`cloud-run/src/renderer.ts`**: `generateStrokesForScenes()` agora aceita segundo parâmetro opcional `{ cancelSignal, targetWidth }` — integração com o sistema de cancelamento cooperativo do `makeCancelSignal`. Removida opção `concurrency: 4` do `renderMedia` (configuração desnecessária para single-instância)

- **`cloud-run/src/speed-paint/speedPaintStrokes.ts`**: funções `downloadAndDecode()` e `processScene()` modificadas para aceitar `cancelSignal` e `targetWidth` via `GenerateStrokesOptions` — propagação do cancelamento cooperativo para o pipeline de geração de strokes

- **`src/features/video-render/components/WaveformOverlay.tsx`**: `sceneDurationFrames` e `fadeFrames` migrados de cálculos diretos para `useMemo` — elimina recálculos desnecessários a cada frame durante a reprodução de vídeo

- **`src/features/video-render/lib/strokeWorker.ts`**: adicionada constante `TIMEOUT_MS (60s)` com verificação de timeout no worker — falha graceful com `postMessage({ error })` quando o processamento excede o limite

- **`src/features/video-render/components/SceneSequence.tsx`**: imports ajustados para alinhamento com a refatoração do `VideoComposition`

---

## [0.50.0] - 2026-05-25

### Adicionado

- **Módulo speed-paint no Cloud Run** (`cloud-run/src/speed-paint/`): 5 novos arquivos — `index.ts` (barrel), `types.ts` (tipos `Stroke`/`StrokeAnimation` espelhados do frontend), `cache.ts` (cache SHA-256 para strokes), `imageProcessing.ts` (edge detection + BFS clustering via sharp), `speedPaintStrokes.ts` (geração de strokes server-side). Permite que o pipeline de vídeo no Cloud Run gere animações speed paint sem depender do frontend, eliminando o `ERR_HTTP2_PROTOCOL_ERROR` causado pelo `resizedImage` base64 no payload de vídeo

- **Dependência `sharp`** no Cloud Run (`cloud-run/package.json`): `^0.33.5` — processamento de imagens server-side para edge detection e geração de strokes

- **Regras de Storage para cache de speed paint** (`storage.rules`): novo pattern `/speed-paint-cache/{allPaths=**}` com acesso exclusivo admin (leitura + escrita), permitindo cache persistente de strokes gerados server-side

- **Geração de strokes integrada ao renderer** (`cloud-run/src/renderer.ts`): novo Stage 0 no fluxo de renderização — `generateStrokesForScenes()` é chamado antes do bundling, processando cenas com `animateScenes: true`. Falha degrada gracefulmente (cenas seguem sem animação, sem bloquear o vídeo)

- **Limite de body Express aumentado** (`cloud-run/src/index.ts`): de `10mb` para `50mb` — necessário para payloads de vídeo com múltiplas cenas em altas resoluções

### Alterado

- **`start-video-job.ts`** (`functions/src/flows/`): verificação de env var alterada de `CLOUD_RUN_VIDEO_ENABLED !== 'true'` para `!CLOUD_RUN_URL` — a autorização de renderização agora usa diretamente a URL do Cloud Run como gate, simplificando a lógica de deploy e rollback

- **`useVideoExporter.tsx`** (`src/features/video-render/hooks/`): removidas funções não utilizadas `useCloudRun` e estado `speedPaintWarnings` — alinhamento com a migração da geração speed paint para o service centralizado (`speedPaintService`)

---

## [0.49.3] - 2026-05-25

### Adicionado

- **Chave i18n `generateScenes`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): label "Gerar cenas" / "Generate scenes" / "Generar escenas" para uso no estúdio — preenche lacuna de cobertura nas labels de opções de cena

- **`speedPaintWarnings`** no estado do `useVideoExporter` (`src/features/video-render/hooks/useVideoExporter.tsx`): novo array de strings (`useState<string[]>`) que acumula avisos quando a geração de speed paint falha durante a exportação de vídeo, melhorando o feedback ao usuário sobre falhas parciais

### Removido

- **`beforeunload` listener no `AudioGenerationHandler.tsx`**: removido o `useEffect` que registrava um aviso de navegação durante geração, exportação ou pipeline ativo. O evento `beforeunload` tem suporte limitado nos navegadores modernos (não permite mensagens customizadas desde Chrome 51+) e não bloqueava efetivamente o fechamento da aba, gerando apenas confusão com o prompt genérico do navegador

---

## [0.49.2] - 2026-05-25

### Adicionado

- **`useSpeedPaintEnhancer`** (`src/features/video-render/hooks/useSpeedPaintEnhancer.ts`): novo hook (+140 linhas) que centraliza a geração de speed paint, extraindo a lógica de `VideoComposition.tsx` e `useVideoExporter.tsx` para um único ponto de entrada. Prepara o terreno para resolver a geração triplicada de speed paint (bug de timeout de 28s do Remotion `delayRender`)

- **`speedPaintService`** (`src/features/video-render/lib/speedPaintService.ts`): novo módulo service (+134 linhas) que abstrai a chamada a `speedPaintRenderer`, provendo uma API limpa de `enhanceScenesWithSpeedPaint()` consumida por `useVideoExporter` e `useSpeedPaintEnhancer`

- **Plano de arquitetura** (`docs/plan-speed-paint-centralizado.md`): documento de 600 linhas com diagnóstico completo do bug de geração triplicada de speed paint, comparação arquitetura atual vs proposta e roteiro de implementação

### Alterado

- **`VideoPreview.tsx`**: importa e utiliza `useSpeedPaintEnhancer` em vez de gerenciar geração localmente — alinhamento com a nova arquitetura centralizada
- **`VideoComposition.tsx`**: import de `speedPaintRenderer` removido — a composição não gera mais speed paint internamente, eliminando fonte do bug de `delayRender` não liberado
- **`useVideoExporter.tsx`**: migrado de `speedPaintRenderer` (remoção de import) para `speedPaintService` (`enhanceScenesWithSpeedPaint`) — lógica de geração extraída para o service

### Corrigido

- **Testes de texto/i18n** (7 arquivos): ajustes de strings em `AssistantMessages.component.test.tsx` (mensagem de erro do assistente), `CreditIndicator.component.test.tsx` ("Atualizando saldo..." mais conciso), `PublicFooter.component.test.tsx` e `i18n-integration.test.tsx` ("Feito com IA" simplificado), `FuncionalidadesPage.component.test.tsx` (features renomeadas), `LandingPage.component.test.tsx` (showcases realinhados)
- **`studio.defaults.unit.test.ts`**: expectation de `generateScenes` ajustada de `false` para `true` — reflete o comportamento real do sistema
- **`SpeedPaintControls.unit.test.tsx`**: novas chaves i18n de speed paint adicionadas ao mock de locale para cobertura de teste
- **`VideoExportPanel.unit.test.tsx`**: textos de exportação atualizados para alinhamento com i18n

---

## [0.49.1] - 2026-05-24

### Adicionado

- **Novos namespaces i18n** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): `dataMigration` (labels de migração de dados) e `transcription` (labels de transcrição) — +155–161 linhas por locale, preenchendo lacunas de cobertura do assistente e migração

### Alterado

- **Internacionalização de 18 componentes** que ainda usavam texto hardcoded em pt-BR — `Header.tsx` (subtitle via `t('studio.header.subtitle')`), `NetworkStatusIndicator.tsx`, `PricingCard.tsx`, `VideoLibrary.tsx` (`t('common.tryAgain')`), `AssistantHeader.tsx` (label `"Gemini"` → `"IA"`), `UsageIndicator.tsx` (`storage_mb` via i18n), `JobCard.tsx` (`Pipeline` → `t('jobs.filter.pipeline')`), `SpeedPaintPlayerControls.tsx` (helperText via i18n), `CaptionEditorPanel.tsx` (Tooltip via `t('video.ajustarSincronizacao')`), `SpeedPaintControls.tsx` (labels sketch/reveal via i18n), `VideoExportPanel.tsx`, `TranscriptionPanel.tsx`, `ExportProgressBar.tsx`, `SpeedPaintExportPanel.tsx`, `LoginPage.tsx`, `RegisterPage.tsx` (logo alt via `t('nav.logoAlt')`)

- **`ExportResultActions.tsx`**: props simplificadas — `container` e `labelDownload` removidos, agora usa apenas `label` com tradução inline via `t('common.download')`. Impacta `SpeedPaintPage.tsx` que usava `container={speedPaintExporter.resolvedContainer}`

- **`SpeedPaintExportPanel.tsx`**: informações de codec/resolução removidas do card de exportação (eram exibidas como `caption` fixo) — layout mais limpo e responsivo. `helperText` do `AnimationDurationSelector` agora vem de `t('speedPaint.durationHelperText')`

### Corrigido

- **`start-image-job.ts`**: mensagem de erro corrigida de `"batch"` para `"lote"` (português) — alinhamento com idioma do projeto
- **`DataMigrationDialog.tsx`**: refatorado com mensagens de erro mais descritivas e tratamento de estados durante migração (removido `aria-label` redundante e texto hardcoded substituído por variáveis de estado)

---

## [0.49.0] - 2026-05-24

### Adicionado

- **`PIPELINE_SUCCESS_VISIBILITY_MS`** (`src/components/ActionBar.tsx`): nova constante (12s) que controla o tempo de exibição do estado de sucesso do pipeline antes do auto-dismiss

- **`SettingsSnapshot` e `buildSettingsSnapshot()`** (`src/components/Configuracoes.tsx`): nova interface e função para captura de snapshot das configurações do estúdio, permitindo visualização compacta do estado atual

- **`compactSummary()`** (`src/components/Configuracoes.tsx`, `src/components/Inspector.tsx`): nova função utilitária compartilhada que trunca texto longo com ellipsis para visualização em cards e painéis

- **`buildScriptPreview()`** (`src/components/Library.tsx`): nova função que gera preview do roteiro com limite de 180 caracteres para exibição na biblioteca

- **`isJobConsideredActive()` e `ACTIVE_JOB_STALE_AFTER_MS`** (`src/features/jobs/hooks/useActiveJobs.ts`): nova função de staleness detection para jobs — jobs com status `running`/`queued` atualizados há mais de 2h são considerados inativos, prevenindo travamentos na UI

- **`AudioJobsPanel` refatorado** (`src/features/studio/components/AudioJobsPanel.tsx`): +317 linhas — migrado para layout Accordion com `JobRow` (componente extraído), `RECENT_TERMINAL_WINDOW_MS` (10min), `HISTORY_PANEL_MAX_HEIGHT` (420px), `getTerminalCardStyles()` para estilização por status. Seções colapsáveis para jobs recentes e histórico completo

- **Novas chaves i18n nos 3 locales** (`en.ts`, `es.ts`, `pt-BR.ts`): namespaces `loadingPageSubtitle`, `workspace`, `summaryPanel`, `librarySection`, `steps` (3 passos), `active`, `completed`, `failed`, `filters` — ~130 novas chaves por locale

- **`useScrollTrigger`** (`src/components/Header.tsx`): integração com hook de scroll para comportamentos adaptativos do AppBar

- **SEO na JobsPage** (`src/pages/JobsPage.tsx`): integração de `DocumentHead` + `getPageSeo()` para SEO dinâmico; import de `Chip`, `Grid`, `Paper`, `glassSurfaceSx`

- **Sticky layout no StudioPage e VideoPage**: `position: sticky` e `top` adicionados ao Inspector (StudioPage, lg: 84px) e painel lateral (VideoPage, md: 96px) para navegação contínua durante scroll

- **Fallback de loading no Router** (`src/router/routes.tsx`): Suspense fallback enriquecido com `Skeleton`, `Chip`, `Paper` e `alpha` do tema MUI — experiência visual melhorada durante carregamento lazy

### Alterado

- **Configuracoes.tsx** (+396/-117): refatorado com seções colapsáveis (`maxHeight: 560` com scroll), `overflowY` responsivo, snapshot compacto de configurações, padding adaptativo. Novos imports: `Box`, `Chip`
- **ScriptEditor.tsx** (+77/-54): padding (`py`), alinhamento (`alignItems`) e largura de ações (`width`) responsivos por breakpoint
- **Library.tsx** (+108/-29): largura (`width: 100% md: auto`), alinhamento (`alignItems`) e largura máxima (`maxWidth: 440`) responsivos na seção de áudio
- **GalleryCard.tsx**: sombras de hover refinadas com `alpha()` do tema — glow primary 32% → 38% quando selecionado, sombra base 22% → 30%
- **JobCard.tsx**: layout otimizado — Stack horizontal simplificado, Chip com ícone de status, flex refinado
- **JobList.tsx** (+154/-104): integração com `glassPanelSx` e `Paper`; sticky header com `top: 84`; padding e border-radius responsivos
- **VideoPage.tsx** (+286/-101): layout reorganizado com `Accordion`, `Chip` e ícones temáticos (`AutoAwesomeOutlined`, `ChecklistRounded`, `ExpandMoreRounded`, `MovieOutlined`, `SubtitlesOutlined`, `VideoLibraryOutlined`). Sidebar com sticky, padding e border-radius responsivos
- **Testes**: Header — `getByText` migrado para `getAllByText` (robustez contra duplicação de labels em tela); ScriptEditor — query strategy corrigida para `closest` fallback

### Corrigido

- **ConfiguracoesPage.component.test.tsx**: labels duplicados (`getByText` → `getAllByText`) para `Aoede`, `Zephyr`, `Puck`, `Descontraída`, `Brilhante` — evitava TimeoutError quando componente renderizava múltiplas instâncias

---

## [0.48.0] - 2026-05-24

### Adicionado

- **`animateScenes` e `includeSubtitles` como opções do pipeline** (`functions/src/genkit/schemas/common.ts`, `functions/src/usage/pipeline-jobs.ts`, `functions/src/flows/start-pipeline.ts`, `src/hooks/usePipelineOrchestrator.ts`, `src/components/app/AudioGenerationHandler.tsx`): novos campos opcionais no pipeline server-side que controlam animação de cenas (speed paint) e inclusão de legendas no vídeo final. Defaults: `animateScenes: true`, `includeSubtitles: false`. Schemas Zod, tipos de pipeline e frontend atualizados para propagar os novos parâmetros

- **`VideoComposition` integrado com `generateScenesWithSpeedPaint`** (`src/features/video-render/components/VideoComposition.tsx`): a composição Remotion do pipeline de vídeo agora importa e utiliza o renderizador speed paint para animação de cenas quando `animateScenes` está ativo

- **Nova biblioteca de legendas** (`functions/src/lib/video-captions.ts`, +358 linhas): módulo compartilhado com tipos `CaptionWord`, `AudioSegmentData`, `TextSegment` e constantes `PUNCTUATION_PAUSES` para construção programática de legendas no backend do pipeline

- **`buildPipelineCaptions()`** (`functions/src/flows/on-sub-job-completed.ts`): nova função que constrói legendas do pipeline utilizando a biblioteca `video-captions`. Importada no `onSubJobCompleted` para gerar legendas durante a montagem do payload de vídeo

- **`getResolutionFromRatioAndQuality()`** (`functions/src/flows/on-sub-job-completed.ts`): nova função para resolução de vídeo baseada na proporção + qualidade, substituindo `getResolutionFromQuality` com suporte a aspect ratio

- **`getVideoMetadata()` e `asPositiveNumber()`** (`cloud-run/remotion/index.tsx`): novas funções utilitárias no módulo Remotion do Cloud Run para extração e validação de metadados de composição

- **Suporte a `FIREBASE_STORAGE_BUCKET` via env var** (`cloud-run/src/firebase.ts`, `cloud-run/scripts/deploy.ps1`): o storage bucket agora pode ser configurado via variável de ambiente, com fallback para `${projectId}.firebasestorage.app` (substitui o antigo `.appspot.com`)

### Alterado

- **`WaveformOverlay.tsx`** (`src/features/video-render/components/`): implementação refinada para compatibilidade com o novo fluxo de pipeline de vídeo

- **`useVideoExporter.tsx`** (`src/features/video-render/hooks/`): destructuring de scenes ajustado para suportar scenes com e sem animação

- **`cloud-run/src/renderer.ts`**: import não utilizado de `firebase-admin/auth` removido

- **Testes**: `remotion-components.component.test.tsx` — parâmetros `frame` removidos de chamadas de componente; `usePipelineOrchestrator.unit.test.ts` — campos `animateScenes` e `includeSubtitles` adicionados ao mock de input

---

## [0.47.0] - 2026-05-23

### Adicionado

- **`processVideoJob`** (`functions/src/flows/process-video-job.ts`, +176 linhas): nova Cloud Function `onTaskDispatched` para processamento de jobs de vídeo via Cloud Tasks. Tipos `VideoJobTaskPayload` e `CloudRunRenderPayload`. Substitui chamada HTTP direta ao Cloud Run por fila assíncrona gerenciada
- **`persistProjectImage()`** (`functions/src/flows/process-image-job.ts`): nova função para salvar imagens do pipeline na subcoleção `projects/{id}/images` com `storagePath`, `downloadUrl`, `prompt` e dimensões
- **`buildVideoScenes()`** e **`clampSceneTimestamp()`** (`functions/src/flows/on-sub-job-completed.ts`): funções para montar o payload de cenas do vídeo do pipeline e ajustar timestamps contra a duração total do áudio
- **`getSubJobRequestId()`** (`functions/src/flows/cancel-pipeline.ts`): função auxiliar para resolução precisa do `requestId` de cada sub-job durante cancelamento de pipeline
- **`sceneTimestamps`** opcional em `ImageJobRecord` (`functions/src/usage/image-jobs.ts`): campo para preservar timestamps das cenas e manter ordem cronológica no projeto
- **`projectId`** em `pipeline-jobs.ts` e `start-pipeline.ts`: campo obrigatório que vincula o pipeline ao projeto desde a criação
- **`VideoLibraryVideo`** (`src/components/video-library/types.ts`): nova interface que estende `ProjectVideo` com `resolvedUrl` para exibição de vídeos salvos na biblioteca
- **Chaves i18n de vídeo** nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`): `library.video`, `library.savedVideos`, `library.noVideos`, `library.videoItem`, `library.videoCount`
- **Download de vídeos no lote** (`useBatchDownload.ts`): `downloadFile()` agora inclui vídeos do projeto no download em lote (áudio + cenas + vídeos)

### Alterado

- **Cloud Run renderer (`cloud-run/src/`)**: migrado de resposta assíncrona (202 Accepted + background render) para resposta síncrona (status `completed`/`error`). Adicionados `createDownloadToken()` e `buildStorageDownloadUrl()` para URLs de download persistentes com token (substitui signed URLs temporárias de 7 dias)
- **Cloud Run deploy (`cloud-run/scripts/deploy.ps1`)**: `MIN_INSTANCES` alterado de 0 para 1, adicionado `--no-cpu-throttling` para estabilidade em produção
- **Pipeline de vídeo migrado para Cloud Tasks**: `start-video-job.ts` substitui chamadas HTTP diretas ao Cloud Run por `VIDEO_JOB_QUEUE` (Cloud Tasks via `firebase-admin/functions`). Removidas `getCloudRunUrl()` e `getIdentityToken()` de chamada HTTP direta
- **`on-sub-job-completed.ts`**: refatorado com `buildVideoScenes()` e `clampSceneTimestamp()` para construção correta do payload de vídeo do pipeline
- **`Library.tsx`** (+154 linhas): expandido com exibição de vídeos salvos no projeto (importa `Movie` icon, tipo `ProjectVideo`)
- **`GalleryCard.tsx`**: exibe contagem de vídeos no card do projeto
- **`useProjectGallery.ts`**: mapeia `resolvedUrl` para vídeos do projeto
- **`functions/src/index.ts`**: exporta nova `processVideoJob` — total: 24 flows de IA

### Corrigido

- **Cloud Run types (`cloud-run/src/types.ts`)**: `RenderResponse.status` corrigido de `'accepted' | 'error'` para `'completed' | 'error'` — alinhado com o novo comportamento síncrono do renderer

---

## [0.45.2] - 2026-05-23

### Corrigido

- **`cancel-job.ts`: suporte a cancelamento de pipeline jobs (`functions/src/flows/cancel-job.ts`)** — adicionados os tipos `PipelineJobRecord` (especialização de `BaseJobRecord` com campos de pipeline) e `AnyJobRecord` (union type `BaseJobRecord | PipelineJobRecord`). O `JobType` agora inclui `pipeline` como caso válido no switch de cancelamento. Antes, pipeline jobs não podiam ser cancelados via `cancelJob` callable genérica — agora o cancelamento cooperativo funciona também para pipelines

- **`cleanup-old-jobs.ts`: pipeline jobs incluídos na limpeza automática (`functions/src/flows/cleanup-old-jobs.ts`)** — adicionado `'pipeline_jobs'` ao array de coleções varridas pela função agendada diária (03:00 BRT). Pipeline jobs completed >30d, failed >7d, cancelled >3d agora são removidos automaticamente, e jobs presos em running/queued >24h são marcados como failed

- **`useJobsStore.ts`: filtro de pipeline jobs na UI regular (`src/hooks/useJobsStore.ts`)** — o listener unificado de jobs agora filtra `'pipeline'` da lista de tipos (`jobTypes.filter(jt => jt !== 'pipeline')`). Pipeline jobs têm UI própria (`PipelineCard`) e não devem aparecer na lista geral de jobs para evitar duplicação visual

- **`firestore.rules`: regras faltantes para `transcriptions` e `pipeline_jobs`** — adicionada regra de leitura/escrita exclusiva para admin na coleção `transcriptions/{docId}` (alinhamento com política de dados apenas IndexedDB); adicionada regra de leitura pelo próprio usuário e escrita apenas admin para `pipeline_jobs/{jobId}` (consistente com as demais coleções de jobs)

### Alterado

- **`JobList.tsx` e `src/features/jobs/types.ts`** — `FILTER_OPTIONS` e `JobType` atualizados para refletir o novo tipo `pipeline`, garantindo que os filtros da página de jobs estejam sincronizados com os tipos reais

---

## [0.45.1] - 2026-05-23

### Corrigido

- **`removeUndefinedFields` recursivo em `generic-jobs.ts` e `pipeline-jobs.ts`** — a função utilitária de limpeza de campos `undefined` foi migrada de remoção superficial (shallow) para recursiva. Agora percorre objetos aninhados e arrays recursivamente, prevenindo erros de serialização no Firestore quando `undefined` aparece em níveis profundos (Firestore rejeita `undefined` como valor em qualquer nível de aninhamento). A assinatura mudou de `removeUndefinedFields<T extends object>(obj: T): T` para `removeUndefinedFields<T>(value: T): T`, aceitando qualquer tipo como entrada e preservando a estrutura original

---

## [0.45.0] - 2026-05-23

### Adicionado

- **Pipeline Server-Side (Fase 1)** — orquestrador de pipeline migrado do frontend para Cloud Functions. 3 novas Cloud Functions: `startPipeline` (callable), `cancelPipeline` (callable), `onSubJobCompleted` (`onDocumentWritten`). O pipeline de produção (áudio → scene prompts → imagens → vídeo) agora é gerenciado inteiramente no backend, com sub-jobs monitorados via Firestore + `onSubJobCompleted`
- **Schemas de pipeline** (`functions/src/genkit/schemas/common.ts`): `PipelineStepStatusSchema`, `PipelineVoiceConfigSchema`, `PipelineMultiSpeakerConfigSchema`, `StartPipelineInputSchema`, `StartPipelineOutputSchema`, `CancelPipelineInputSchema`, `CancelPipelineOutputSchema` + tipos inferidos correspondentes
- **`functions/src/flows/start-pipeline.ts`** (+315 linhas): Cloud Function callable que cria o pipeline com steps iniciais (audio, scene_prompts, images, video) e dispara o primeiro sub-job (áudio)
- **`functions/src/flows/cancel-pipeline.ts`** (+156 linhas): Cloud Function callable que cancela pipeline e propaga cancelamento para todos os sub-jobs ativos
- **`functions/src/flows/on-sub-job-completed.ts`** (+914 linhas): Cloud Function `onDocumentWritten` que escuta conclusão de sub-jobs e avança o pipeline automaticamente para a próxima etapa
- **`functions/src/usage/pipeline-jobs.ts`** (+292 linhas): módulo utilitário com CRUD de pipeline jobs — tipos `PipelineStepName`, `PipelineStepStatus`, `PipelineStatus`, `PipelineStepRecord`, `PipelineVoiceConfig`, `PipelineMultiSpeakerConfig`, `PipelineInput`, `PipelineAudioResult`, `PipelineScenePromptsResult`, `PipelineImagesResult`, `PipelineVideoResult`, `PipelineResults`, `PipelineJobRecord`
- **`pipelineId`** em `generic-jobs.ts` (`functions/src/usage/`): campo opcional que vincula sub-jobs ao pipeline pai
- **Coleção `pipeline_jobs`** — subcollection `users/{uid}/pipeline_jobs` com index COLLECTION_GROUP (`status ASC, updatedAt ASC`) em `firestore.indexes.json`
- **`JobType.pipeline`** em `src/lib/generic-jobs.ts` — `JobType` estendido para 5 tipos, `PipelineJobRecord` adicionado
- **Ícone `AutoAwesome`** para pipeline em `src/features/jobs/components/JobCard.tsx` — pipeline jobs agora têm ícone próprio
- **Toast de pipeline** em `src/features/jobs/hooks/useJobToasts.ts` — case `'pipeline'` retorna chave i18n `'pipelineCompleted'`
- **5 novas chaves i18n** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): `jobs.sortOldestFirst`, `jobs.sortNewestFirst`, `jobs.generation`, `jobs.project`, `jobs.toasts.pipelineCompleted`

### Alterado

- **`usePipelineOrchestrator.ts`** (+264/-636): refatorado para chamar `startPipeline` (Cloud Function) em vez de `startJob` individuais para cada etapa. Agora usa `StartPipelineInput`/`StartPipelineOutput` como tipos de entrada/saída. Removidos tipos legados (`BaseJobRecord`, `AudioJobInput`, `ImageJobInput`, etc.) — ~372 linhas a menos. `INITIAL_STEPS`, `voiceConfig`, `multiSpeakerConfig` refatorados
- **`functions/src/index.ts`**: exporta 3 novas Cloud Functions — `startPipeline`, `cancelPipeline`, `onSubJobCompleted`. Total: 23 flows de IA
- **`functions/src/usage/index.ts`**: barrel exports expandidos com 13 novos tipos de pipeline
- **`src/components/app/AudioGenerationHandler.tsx`**: removido `loadPipelineAudio()` — lógica antiga de carregamento de áudio do pipeline substituída pelo fluxo server-side
- **Testes**: `usePipelineOrchestrator.unit.test.ts` (+191/-85) refatorado para mockar `startPipeline` em vez de `startJob`; `generic-jobs.test.ts` valida 5 tipos de job em vez de 4

### Removido

- **Tipos legados do pipeline no frontend** (`usePipelineOrchestrator.ts`): `BaseJobRecord`, `AudioJobInput`, `AudioJobOutput`, `ScenePromptJobInput`, `ScenePromptJobOutput`, `ImageJobInput`, `ImageJobOutput`, `VideoJobInput`, `VideoJobOutput`, `CancelJobOutput`, `isTerminalStatus`, `stepFromIndex`, `collectionForStep`, `waitForJobCompletion`, `CallableRef`, `inputProps` — substituídos pelos tipos server-side
