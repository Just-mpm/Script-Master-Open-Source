# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.24.1] - 2026-04-25

### Corrigido

- **`useVideoExporter`**: `exportFileName` removido do estado e gravado diretamente na ref antes de qualquer reset, evitando perda do nome do arquivo durante renderização
- **`useVideoExporter`**: feedback visual de renderização exibido imediatamente (antes do mapeamento de cenas), reduzindo latência percebida
- **`useVideoExporter`**: segundo `setState` agora preserva estado anterior via `prev` em vez de resetar com `INITIAL_STATE`, evitando perda de `speedPaintWarnings` coletadas
- **`estimateFileSize`**: bitrate base realinhado de 8 Mbps para 3 Mbps (corresponde ao mediabunny Quality "medium"), com escala não-linear `pow(pixels/ref, 0.95)` e multiplicadores de codec atualizados (adicionados `avc`, `hevc`, `av1`; removido `h265`)
- **`VideoPage`**: `showCaptionToggle` definido como `true` fixo em vez de depender de `includeSubtitles`, garantindo que o toggle de legenda esteja sempre acessível

### Removido

- **`exportFileName`** de `VideoExporterState` e `INITIAL_STATE` (agora gerenciado apenas via ref)

---

## [0.24.0] - 2026-04-25

### Adicionado

- **`SpeedPaintMultipliers`** (`types.ts`): interface com multiplicadores separados para sketch e reveal (0.25–4.0x cada), permitindo controle granular da velocidade de cada fase do speed paint no vídeo
- **`DEFAULT_SPEED_PAINT_MULTIPLIERS`** (`types.ts`): constantes padrão (sketch: 1.0, reveal: 1.0), exportada no barrel `video-render/index.ts`
- **`SpeedPaintControls`** (`components/SpeedPaintControls.tsx`): componente de controle dedicado com sliders independentes para sketch e reveal, collapse/expand, reset e presets; integrado ao `VideoExportPanel`
- **`SpeedPaintPhaseBadge`** (`SpeedPaintScene.tsx`): badge de fase sobreposto no preview do player indicando "Desenhando" ou "Colorindo" durante speed paint
- **30 testes novos** (total: 1185): `types.unit.test.ts` (+11), `speedPaintRenderer.unit.test.ts` (+8), `videoComposition.component.test.tsx` (+3), `useVideoExporter-speedpaint.unit.test.tsx` (+3), `VideoExportPanel.unit.test.tsx` (+5)

### Alterado

- **`VideoComposition`**: prop `speedPaintMultipliers` opcional para multiplicadores granulares; quando fornecido, passa `drawSpeed` e `paintSpeed` ao `SpeedPaintScene`; sem fallback para `SPEED_PAINT_MULTIPLIERS`
- **`speedPaintRenderer`**: `renderSpeedPaintFrame()` aceita `SpeedPaintMultipliers` em `SpeedPaintFrameOptions`, calculando progresso de sketch e reveal separadamente
- **`VideoExportPanel`**: integração do `SpeedPaintControls` no painel de exportação de vídeo
- **`useVideoExporter`**: propaga `speedPaintMultipliers` nas opções de composição
- **CHANGELOG.md**: versões antigas (0.8.0–0.17.0) movidas para `docs/CHANGELOG-COMPLETE.md`

### Removido

- Entradas antigas do CHANGELOG (0.8.0–0.17.0) compactadas em arquivo dedicado

---

## [0.23.0] - 2026-04-25

### Adicionado

- **Exclusão de conta (LGPD)** (`src/lib/db/account-cleanup.ts`): pipeline de limpeza completa — remove projetos + subcoleções (audios, images, videos), gerações flat, gerações de imagem, chats, memórias, user settings e objetos do Storage; estratégia best-effort com log de erros parciais
- **`deleteAccount()`** no `AuthContext`: executa `deleteAllUserData(userId)` → `deleteUser(currentUser)` → redirect para `/login`; novo erro pt-BR `auth/requires-recent-login` para sessão expirada
- **Dialog de confirmação de exclusão** no Header: campo de texto "EXCLUIR" obrigatório, estado `isDeleting` com loading, integrado no drawer mobile e disponível via ícone DeleteForever
- **Verificação de email pós-cadastro**: `sendEmailVerification()` enviada automaticamente após `createUserWithEmailAndPassword()`; falha na verificação não bloqueia o cadastro
- **`sendEmailVerification` e `deleteUser`** exportados de `src/lib/firebase.ts`
- **UI centralizada do assistente** (`assistantUi.ts`): 13 estilos exportados — `assistantDrawerPaperSx`, `assistantDrawerHeaderSx`, `assistantInsetSx`, `assistantBubbleModelSx`, `assistantBubbleUserSx`, `assistantComposerInputSx`, `assistantComposerContainerSx`, `assistantTypingIndicatorSx`, `assistantMarkdownSx`, `assistantMessagesContainerSx`, `assistantHistoryItemSx`, `assistantEmptyStateSx`, `assistantAttachmentChipSx`, `assistantSendButtonSx`
- **`EmptyChatState`** no AssistantMessages: estado vazio do chat com ícone e call-to-action
- **Chips de anexo** no AssistantMessages: anexos exibidos como `Chip` MUI com estilo premium
- **2 novos tokens de tema** (`tokens.ts`): `WARNING_BORDER`, `WARNING_GLOW`
- **`WarningAlert` override** no `appTheme.ts`: variante `filled` + `warning` com estilo customizado
- **`pulse` keyframe** no `index.css`: animação de pulso para indicador de desconexão
- **Firestore composite index**: `projects` por `userId` ASC + `createdAt` DESC

### Alterado

- **Header**: redesign da navegação desktop (glass surface no nav), avatar com glass panel, drawer mobile com opção "Excluir conta"; remoção de import de `tokens.ts` (substituído por `glassSurfaceSx` + tokens individuais)
- **AuthContext**: interface `AuthContextType` com novo método `deleteAccount`; `signup()` agora envia verificação de email
- **NotFoundPage**: redesign com ícone `TravelExplore`, glass surface, backdrop-filter responsivo, tipografia responsiva (80px/120px)
- **ErrorBoundary**: glass surface com backdrop-filter responsivo, border-radius responsivo
- **Toasts** (Error, Success, Warning): `minWidth` responsivo `min(92vw, 320px)` / `sm:400`
- **AssistantMessages**: remoção de import de `assistantUi` e `tokens` (refatorados); novo `EmptyChatState`; anexos como `Chip`
- **AssistantComposer**: ícone `Stop` para parar geração; remoção de import de `tokens`, `px`, `py`
- **AssistantHeader**: responsividade refinada (display, width, minWidth); remoção de import de `tokens`
- **AssistantHistoryPanel**, **AssistantSettingsPanel**, **AssistantMemoriesPanel**: remoção de import de `tokens` (centralizado em `assistantUi.ts`)
- **CaptionEditorPanel**: transições refinadas (cubic-bezier), estilos de ícones atualizados
- **TranscriptionPanel**: tipografia e ícones refinados
- **VideoExportPanel**: tipografia, ícones e progress bar refinados
- **Componentes públicos**: PageLayout (padding refinado), PublicHeader/PublicFooter (remoção de APP_BORDER hardcoded), HeroSection (BRAND_PRIMARY_GLOW), FeatureCard (cubic-bezier), FeatureShowcase (py refinado), FAQAccordion (timing), StepCard (alpha), SocialProofBar (letter-spacing, position relative), CTASection (pseudo-elemento decorativo), PricingCard (Tooltip)
- **Inspector**: border-radius refinado; imports de `tokens.ts` ajustados
- **ActionBar**: borda superior accent `rgba(46, 117, 182, 0.15)`
- **ScriptEditor**, **ImageStudio**, **Library**, **VideoLibrary**: imports de `tokens.ts` ajustados
- **NetworkStatusIndicator**: animação `pulse` no ícone WifiOff, letter-spacing
- **StatusPage**: novo componente `IncidentHistory` com Timeline, dados de incidentes recentes, `LAST_CHECK` atualizado
- **ContactPage**: validação de email via regex (`EMAIL_REGEX`), `Alert` para feedback
- **PricingPage**: `Alert` para feedback
- **LoginPage**, **RegisterPage**: border sutil nos botões, transições refinadas
- **AboutPage**, **LandingPage**, **FuncionalidadesPage**, **FaqPage**, **PrivacyPage**, **TermsPage**, **CookiesPage**: tipografia refinada (letter-spacing, lineHeight)
- **Speed Paint**: SpeedSelector com imports de tokens; BatchOrchestrator, QueueStaging, AnimationControls, ImageUpload — remoção de imports hardcoded de `tokens.ts`
- **`studio.utils.ts`**: helpers de localStorage simplificados
- **`tests/setup.ts`**: `MockResizeObserver` adicionado para testes que dependem de ResizeObserver
- **Testes existentes**: mocks de tokens atualizados em 25 arquivos de teste (BRAND_GRADIENT, BRAND_PRIMARY_GLOW, etc.)

### Removido

- **`docs/plan/refactor-studio-state-to-zustand-c2.md`**: plano concluído na v0.22.0

### Testes

- 91 testes novos (total: 1155):
  - `ErrorBoundary.component.test.tsx` (92 linhas) — renderização com glass surface, children, erro
  - `ProtectedRoute.component.test.tsx` (63 linhas) — redirect sem autenticação, renderização com user
  - `useTranscription.unit.test.ts` (429 linhas) — pipeline completo de transcrição Whisper
  - `NotFoundPage.component.test.tsx` (84 linhas) — renderização, link para home
  - `CaptionEditorPanel.unit.test.tsx` (285 linhas) — edição de legendas
  - `SubtitleInlineEditor.unit.test.tsx` (275 linhas) — editor inline de estilo
  - `VideoExportPanel.unit.test.tsx` (382 linhas) — painel de exportação
  - AuthContext: testes de signup e deleteAccount adicionados

---

## [0.22.0] - 2026-04-25

### Alterado

- **useStudioState → useStudioStore (Zustand)**: hook `useStudioState()` (364 linhas) substituído por store Zustand em `src/features/studio/store/` — elimina re-renders em cascata ao digitar no roteiro ou trocar configurações; consumidores (App.tsx, StudioPage, VideoPage, AssistantPage) migram para `useStudioStore` com `useShallow` para seletores otimizados

### Adicionado

- **`useStudioStore`** (`src/features/studio/store/studioStore.ts`): store Zustand flat gerenciando 14 preferências + `referenceImage` (session-only); `applySettings(patch)` para patch parcial; `reset()` para restaurar padrões; `subscribe` com `PERSIST_MAP` para sync automático com localStorage (sem middleware persist)
- **`useCurrentStudioState()`**: hook derivado com `useShallow` que retorna `StudioDraftState` para consumo seguro sem re-renders excessivos
- **`buildGenerateOptions()`** (`src/features/studio/store/studio.utils.ts`): construtor DRY de opções de geração, usado por App.tsx e StudioPage (elimina duplicação)
- **`studio.utils.ts`**: helpers puros de localStorage extraídos — `STORAGE_KEYS`, `SCENE_RATIOS`, `VIDEO_FPS`, `getStoredValue`, `getStoredBoolean`, `getStoredNumber`, `isSceneRatio`, `getStoredSceneRatio`, `getInitialStudioConfig`, `safeSetItem`
- **`useAudioGenerator.scenesData`**: novo campo `scenesData` no retorno da geração

### Corrigido

- **`getStoredNumber`**: validação corrigida — rejeita `NaN` e valores negativos (`Number.isFinite && >= 0`)
- **Audit findings**: `useShallow` adicionado em StudioPage e VideoPage para seletores Zustand; barrel `store/index.ts` limpo sem re-exports duplicados

### Removido

- **`useStudioState.ts`**: hook monolítico (364 linhas) removido, funcionalidade migrada para store
- **`ScriptEditorController`** type: removido de `src/features/studio/types.ts`
- **Relatórios de teste/docs**: `docs/test/2026-04-25-auth-vitest.md`, `docs/plan/firebase-hosting-setup.md` removidos

### Testes

- 24 testes novos (total: 1064):
  - `studioStore.unit.test.ts` (212 linhas) — store Zustand completo (estado inicial, setters, applySettings, reset, subscribe localStorage)
  - `studio.utils.unit.test.ts` (189 linhas) — helpers de localStorage, getStoredNumber, buildGenerateOptions
  - `useStudioState.unit.test.ts` (274 linhas) removido — funcionalidade testada via store

---

## [0.21.1] - 2026-04-25

### Alterado

- **VideoExportPanel**: state lifting invertido — `quality`, `fileName`, `animateScenes` e `speedPaintSpeed` movidos de props para state local do componente, eliminando re-renders em cascata no VideoPage; `React.memo` adicionado
- **VideoPage**: removido state local de opções de exportação (agora gerenciado internamente pelo VideoExportPanel); `VideoPreview` memoizado com `useMemo` para evitar nova referência a children a cada render
- **Assistant.tsx**: 12 handlers convertidos de funções inline para `useCallback` com deps corretas (`handleSaveSettings`, `handleDocumentUpload`, `handleAddMemory`, `handleDeleteMemory`, `handleDeleteHistory`, `handleSaveMessageToMemory`, `handleSelectSession`, `handleSubmit`, `handleFileChange`, `handleApply`, `handleRemoveFile`, `handleDismiss*` e `handleOpen*/Close*`)
- **useVideoExporter**: retorno do hook memoizado com `useMemo` para estabilizar referência do objeto

### Alterado (React.memo em componentes)

- `Inspector`, `CaptionEditorPanel`, `SubtitleInlineEditor`, `TranscriptionPanel`, `VideoExportPanel`, `AssistantComposer`, `AssistantHeader`, `AssistantHistoryPanel`, `AssistantMemoriesPanel`, `AssistantSettingsPanel` — envolvidos em `React.memo` para evitar re-renders desnecessários quando props não mudam

---

## [0.21.0] - 2026-04-25

### Adicionado

- **RegisterPage** (`/cadastro`): página de cadastro com Google + email/senha, validação de campos, grid 2 colunas (benefícios + formulário), SEO via `react-helmet-async`, skip-to-content link
- **Autenticação email/senha** no `AuthContext`: `signup(email, password)`, `loginWithEmail(email, password)`, `resetPassword(email)`, `clearAuthError()` — todos com mensagens pt-BR por código Firebase
- **LoginPage reformulada**: grid 2 colunas (benefícios + formulário), formulário email/senha, dialog de reset de senha (`openResetDialog`, `handleResetSubmit`), estilos compartilhados com RegisterPage (`authTextFieldSx`, `authLinkSx`)
- **Biblioteca de error mapping** (`src/lib/error-mapping.ts`): `createErrorMapper(config)` genérico, `sharedErrorRules` (quota, API key, unavailable), `ErrorMappingRule` e `ErrorMapperConfig` types
- **Firebase Hosting completo**: `.firebaserc` (project ID), `public/404.html` (fallback estilizado), `cleanUrls`, 8 redirects 301, cache immutable para assets estáticos
- **Headers de segurança** no `firebase.json`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, cache `no-cache` para `/cadastro`, `/sw.js`, `/manifest.webmanifest`
- **Scripts de deploy** no `package.json`: `bun run deploy` (produção), `bun run deploy:preview` (canal preview)
- **`firebase-tools`** como devDependency (`^15.3.0`)

### Alterado

- **AuthContext**: de Google-only para Google + email/senha + reset de senha; novos códigos de erro pt-BR (`email-already-in-use`, `user-not-found`, `wrong-password`, `invalid-credential`, `weak-password`)
- **`useAudioGenerator`**: substituída `toUserFriendlyError()` por `createErrorMapper()` + `sharedErrorRules`
- **`useImageGenerator`**: substituída `toUserFriendlyImageError()` por `createErrorMapper()` + `sharedErrorRules`
- **`useAssistant`**: substituída `toUserFriendlyAssistantError()` por `createErrorMapper()` + `sharedErrorRules`
- **`rate-limiter.ts`**: null safety — `lastError ?? new Error('withRetry: todas as tentativas esgotadas')`
- **`useVoicePreviews`**: adicionado `clearError()` para limpar estado de erro
- **`robots.txt`**: bloqueia `/login` e `/cadastro` dos crawlers
- **`firestore.rules`**: adicionado `allow update` para admin na coleção de gerações
- **`vite.config.ts`**: `coepPlugin` atualizado com exceção `/cadastro` (sem COEP para popup Firebase)

### Corrigido

- **a11y**: aria-labels em VideoLibrary (ordenar), PricingPage (ciclo de pagamento)
- **ImageStudio**: estado de erro (`imagesError`) no carregamento de imagens salvas
- **Library**: estado de erro (`detailError`) no carregamento de detalhes do projeto

### Removido

- `InspectorController` type de `src/features/studio/types.ts`
- Funções `toUserFriendlyError`, `toUserFriendlyImageError`, `toUserFriendlyAssistantError` (substituídas por `createErrorMapper`)

### Testes

- 68 testes novos (total: 1040)
  - AuthContext: signup, loginWithEmail, resetPassword, clearAuthError, Google login (regressão)
  - RegisterPage: renderização, validação, cadastro Google + email, erros, redirect
  - LoginPage: renderização, login Google + email, reset dialog, erros, redirect
  - Library: mock atualizado (signup, loginWithEmail, resetPassword)

---

## [0.20.0] - 2026-04-24

### Adicionado

- **Speed Paint pipeline completo** (`video-render/lib/speedPaintRenderer.ts`): `generateScenesWithSpeedPaint()` com suporte a Web Worker inline (Blob URL + OffscreenCanvas) para >5 cenas, fallback automático para main thread
- **SpeedPaintScene** (`video-render/components/SpeedPaintScene.tsx`): componente Remotion nativo para renderização de Speed Paint no vídeo, com suporte a multi-velocidade
- **Stroke cache** (`video-render/lib/strokeCache.ts`): cache LRU com máximo de 20 entradas, chave SHA-256, funções `getStrokeAnimation()`, `setStrokeAnimation()`, `clearStrokeCache()`, `getStrokeCacheStats()`
- **Stroke worker** (`video-render/lib/strokeWorker.ts`): `createStrokeWorker()`, `terminateStrokeWorker()`, `processSceneInWorker()`, `supportsStrokeWorker()` — Web Worker inline para processamento de strokes via OffscreenCanvas
- **Transitions modularizadas** (`video-render/lib/transitions.ts`): `SPRING_TRANSICAO`, `computeSafeFadeFrames()`, `springFadeIn()`, `springFadeOut()` extraídas de SceneSequence
- **SpeedPaintSpeed type** (`video-render/types.ts`): tipo `'slow' | 'normal' | 'fast'` com `SPEED_PAINT_MULTIPLIERS`
- **Controle de velocidade no VideoExportPanel**: toggle Speed Paint + seletor de velocidade (0.5x/1x/1.5x)
- **speedPaintWarnings** no estado do exporter: array para capturar avisos durante renderização de Speed Paint
- **renderSpeedPaintFrame()** exportado no barrel de `video-render/index.ts`

### Alterado

- **VideoLibrary refatorada** (700→216 linhas, -69%): componente monolítico dividido em 8 módulos em `src/components/video-library/`:
  - `GalleryCard.tsx` — card individual com thumbnail, metadata pills e ações
  - `DeleteConfirmationDialog.tsx` — dialog de confirmação de exclusão
  - `MetadataPill.tsx` — pill de metadado (duração, data)
  - `extractVideoThumbnail.ts` — extração de thumbnail com timeout
  - `useProjectGallery.ts` — hook de busca, ordenação e carregamento de vídeos
  - `useBatchDownload.ts` — hook de download em lote
  - `types.ts` — tipos `VideoLibraryItem`, `VideoLibraryProps`, `VideoLibraryScene`
  - `index.ts` — barrel exports
- **SubtitleInlineEditor refatorada** (1006→401 linhas, -60%): subcomponentes extraídos para `subtitle-editor/`:
  - `EditorToolbar.tsx`, `EditorButton.tsx`, `FontSizeControls.tsx`, `PositionToggle.tsx`, `StyleSlider.tsx`, `ToolbarActions.tsx`, `SubtitlePreview.tsx`, `DragOverlay.tsx`
  - `constants.ts` — constantes centralizadas (DRAG_SNAP, BASE_PADDING_BOTTOM, FONT_SIZE_STEP, etc.)
  - `utils.ts` — `clamp()`, `calculatePreviewBottom()`
  - `index.ts` — barrel exports
- **useVideoExporter**: integração com Speed Paint pipeline (`generateScenesWithSpeedPaint()`), limpeza de cache via `clearStrokeCache()`, fase de peso Speed Paint (SPEED_PAINT_PHASE_WEIGHT = 50)
- **VideoComposition**: integração com `SpeedPaintScene` e `SPEED_PAINT_MULTIPLIERS`
- **SceneSequence**: transições importadas de `../lib/transitions` (removidas definições locais duplicadas)
- **VideoExportPanel**: opções de Speed Paint (`SPEED_OPTIONS`) e toggle group estilizado

### Removido

- **Relatório de auditoria** (`docs/audits/1.md`): relatório temporário de audit removido
- **Definições duplicadas de transição** (`SceneSequence`): `SPRING_TRANSICAO`, `springFadeIn`, `springFadeOut` removidas do componente e centralizadas em `transitions.ts`

### Testes

- 61 testes novos (total: 972):
  - `speedPaintRenderer.unit.test.ts` (499 linhas) — pipeline completo de renderização
  - `strokeCache.unit.test.ts` (154 linhas) — cache LRU
  - `strokeWorker.unit.test.ts` (206 linhas) — Web Worker inline
  - `transitions.unit.test.ts` (37 linhas) — funções de transição
  - `useVideoExporter-speedpaint.unit.test.tsx` (296 linhas) — integração Speed Paint no exporter
  - `videoComposition.component.test.tsx` (223 linhas) — componente de composição
  - `types.unit.test.ts` atualizado — novas assertions para SpeedPaintSpeed e multipliers

---

## [0.19.0] - 2026-04-24

### Adicionado

- **Export quality selector** (`VideoExportPanel`): seletor de resolução 720p/1080p/1440p/4k com `VideoExportQuality` type e `getResolutionFromQuality()` em `videoUtils.ts`
- **Estimativa de tamanho de arquivo** (`estimateFileSize()`): calcula tamanho estimado do vídeo exportado baseado em duração, resolução e codec (H.264, VP8, VP9, H.265)
- **Posição de legendas** (`SubtitlePosition`): novo tipo `'bottom' | 'center' | 'top'` com toggle no SubtitleInlineEditor e propagação para VideoComposition
- **Extração de thumbnail de vídeo** (`extractVideoThumbnail()`): gera thumbnail via canvas a partir de blob de vídeo, usado na VideoLibrary
- **Busca e ordenação na VideoLibrary**: campo de busca por nome e ordenação por data (recent/oldest) na galeria de vídeos
- **Tokens de tema** (`tokens.ts`): 9 novos tokens — `SUCCESS_BG_SUBTLE`, `SUCCESS_BG_MEDIUM`, `SUCCESS_BORDER`, `SUCCESS_BORDER_HOVER`, `SUCCESS_GLOW`, `ERROR_BG_SUBTLE_2`, `ERROR_BORDER`, `ERROR_BORDER_HOVER`, `ERROR_GLOW`
- **Progress semântico** (`VideoExportPanel`): progress bar usa `<progress>` HTML nativo com `aria-valuenow/valuemin/valuemax` para acessibilidade
- **Teste**: assertion atualizada para 8 keys no type de legendas (incluindo `position`)

### Corrigido

- **Blob URL revogação seletiva** (`VideoLibrary`): ao excluir um vídeo, apenas o blob URL do item excluído é revogado (antes revogava todos)
- **`estimateFileSize` VP9/H265**: multiplicadores adicionados para VP9 (~0.6) e H.265 (~0.5) (antes só VP8)
- **Guard dupla renderização** (`useVideoExporter`): `startRender` agora verifica `isRendering` antes de iniciar, previne duplo clique
- **Thumbnail timeout** (`extractVideoThumbnail`): Promise rejeita após 10s se vídeo não carregar (previne hang)
- **A11y slider** (`SubtitleInlineEditor`): sliders com `aria-label` e `aria-valuetext` descritivos
- **useEffect deps** (`VideoPreview`, `SubtitleInlineEditor`, `VideoExportPanel`): arrays de dependência corrigidos
- **Tokens hardcoded** (`SubtitleInlineEditor`): valores hardcoded de cor substituídos por tokens de tema (`SLIDER_SHARED_SX`, `THUMBNAIL_GLOW_SHADOW`)
- **Slider styles duplicados** (`SubtitleInlineEditor`): estilos compartilhados extraídos para `SLIDER_SHARED_SX`
- **Default duplicado** (`videoUtils`): `DEFAULT_EXPORT_QUALITY` centralizado como constante exportável

---

## [0.18.1] - 2026-04-24

### Removido

- **ChangelogPage** (`/novidades`): página de changelog dedicada removida — histórico de versões permanece disponível no `CHANGELOG.md` do repositório
- **`framesToSeconds`** (`src/features/video-render/lib/videoUtils.ts`): função duplicada removida, mantida em `formatTimestamp.ts`
- **Relatórios de teste** (`docs/test/`): 2 relatórios consolidados removidos (public-components, public-pages)
- **Entrada `/novidades`** do `sitemap.xml` e da lista de `navigateFallbackDenylist` no Vite config
- **Link "Novidades"** do PublicFooter

### Alterado

- **PublicHeader**: links de navegação corrigidos para rotas em português (`/pricing` → `/precos`, `/faq` → `/perguntas-frequentes`)
- **FaqPage**: 5 respostas do FAQ atualizadas com conteúdo revisado
- **PricingPage**: adicionada navegação via `useNavigate` do react-router-dom
- **AboutPage**: roadmap atualizado — status `planned`/`current` → `done` com descrição de páginas públicas
- **StatusPage**: `LAST_CHECK` atualizado; componente `Alert` importado do MUI
- **useVoicePreviews**: implementação do hook ajustada
- **audio-analysis.ts**: decodificação de áudio refatorada com `AudioBuffer` tipado
- **db/chats.ts**: `estimateDocumentSize` e `FIRESTORE_MAX_DOC_SIZE_BYTES` ajustados
- **db/migration.ts**: importação explícita de `estimateDocumentSize` e `FIRESTORE_MAX_DOC_SIZE_BYTES` de `./chats`
- **db/projects.ts**: importação de `deleteTranscription` adicionada
- **AGENTS.md**: remoção de referências a ChangelogPage, atualização de redirects e contagem de URLs no sitemap
- **index.css**: comentário alinhado (removida referência a CYAN_GLOW)

### Corrigido

- **videoUtils.unit.test.ts**: import de `frameToSeconds` corrigido para `formatTimestamp.ts`

---

## [0.18.0] - 2026-04-24

### Adicionado

- **9 novas páginas públicas** (`src/pages/public/`): PricingPage (`/precos`), FaqPage (`/perguntas-frequentes`), ContactPage (`/contato`), AboutPage (`/sobre`), TermsPage (`/termos`), PrivacyPage (`/privacidade`), CookiesPage (`/cookies`), ChangelogPage (`/novidades`), StatusPage (`/status`) — todas com layout responsivo, SEO per-page via react-helmet-async e navegação consistente via PageLayout
- **2 novos componentes públicos**: `PricingCard` (card de plano com features, toggle mensal/anual, badge "Popular"), `FAQAccordion` (accordion expansível com animação controlada)
- **SEO per-page** (`react-helmet-async`): `HelmetProvider` no `main.tsx`, helper `getPageSeo()` em `src/lib/seo.ts` com OG, Twitter Cards e canonical URL dinâmicos por página
- **robots.txt** e **sitemap.xml** (`public/`): sitemap com 11 URLs públicas priorizadas, robots bloqueia `/app/` e referencia sitemap
- **Redirects de compatibilidade**: rotas antigas em inglês (`/features`, `/pricing`, `/faq`, `/contact`, `/changelog`) redirecionam via `Navigate replace` para equivalentes em português
- **Testes**: 66 testes novos para páginas públicas (PricingPage 6, FaqPage 4, ContactPage 5, AboutPage 5, ChangelogPage 4, StatusPage 4, TermsPage 3, PrivacyPage 4, CookiesPage 4, FuncionalidadesPage 11, PricingCard 11, FAQAccordion 8)

### Alterado

- **Tradução completa de rotas**: rotas do app migradas para português — `/app/image` → `/app/imagens`, `/app/speed-paint` → `/app/pintura-rapida`, `/app/assistant` → `/app/assistente`, `/app/library` → `/app/biblioteca` (redirects de compatibilidade mantidos)
- **FeaturesPage → FuncionalidadesPage**: rota `/features` → `/funcionalidades`, componente reescrito com Helmet SEO
- **LandingPage**: SEO migrado de meta tags estáticas em `index.html` para `<Helmet>` dinâmico via `getPageSeo()`
- **PublicFooter**: reestruturado em 3 grupos (Produto, Empresa, Legal) com links atualizados para rotas em português
- **PublicHeader**: link Features → Funcionalidades

### Removido

- `src/pages/public/FeaturesPage.tsx` (substituída por `FuncionalidadesPage.tsx`)
- `docs/public-pages-plan.md` (plano concluído)
- `docs/test/2026-04-24-hooks-contexts-vitest.md` (relatório consolidado)
