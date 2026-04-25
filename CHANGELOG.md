# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

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

---

## [0.17.0] - 2026-04-24

### Adicionado

- **Páginas públicas** (`src/pages/public/`, `src/components/public/`): LandingPage (`/`) com hero, social proof, feature cards, showcases e CTA; FeaturesPage (`/features`) com 6 seções categorizadas; 10 componentes públicos reutilizáveis (PublicHeader, PublicFooter, PageLayout, HeroSection, FeatureCard, FeatureShowcase, CTASection, StepCard, SocialProofBar, barrel index)
- **Paleta de marca** (`src/theme/tokens.ts`): nova identidade visual — azul `#2E75B6` (primary) + laranja `#F7941E` (secondary) substituem cyan/purple; novos tokens: `BRAND_PRIMARY_GLOW`, `BRAND_PRIMARY_GLOW_SOFT`, `BRAND_SECONDARY_GLOW_SOFT`; 15 tokens de marca atualizados
- **PWA base** (`vite-plugin-pwa`): service worker com Workbox, manifest com ícones 192/512, runtime caching para assets estáticos e Google Fonts, `navigateFallbackDenylist` para `/login` (sem COEP), registro apenas em produção
- **SEO** (`index.html`): meta tags Open Graph, Twitter Cards, Schema.org Organization, canonical URL, theme-color e color-scheme; título atualizado para "Script Master — Roteiros em Áudio com IA"
- **Keyboard shortcuts** (`src/hooks/useKeyboardShortcuts.ts`): hook global para Ctrl+Enter (gerar áudio), Space (play/pause vídeo e toggle áudio), com proteção contra inputs focados e blocos editáveis
- **AudioContext selectors** (`src/contexts/AudioContext.tsx`): 5 hooks seletivos otimizados — `useAudioIsPlaying()`, `useAudioCurrentTime()`, `useAudioDuration()`, `useAudioProgress()`, `useAudioActiveId()` — evitam re-renders desnecessários
- **LoginPage redesign** (`src/pages/LoginPage.tsx`): layout de conversão com benefícios em grid, ícones de features, PublicHeader/Footer e padding vertical generoso
- **Assets visuais**: 8 imagens geradas em `public/images/public/` para landing, features e CTA
- **Testes**: 77 testes novos (total: 857 passando) — hooks (useKeyboardShortcuts 22, AudioContext +10), componentes públicos (PublicHeader, PublicFooter, PageLayout, HeroSection, marketingCards, LandingPage, FeaturesPage), páginas (pages.component.test atualizado), AssistantMessages (React.memo arePropsEqual), Library (useGlobalAudioActions mock)

### Alterado

- **Prefixo `/app/`**: todas as rotas autenticadas migradas de `/estudio` para `/app/estudio`, `/video` para `/app/video`, etc. — rotas públicas (`/`, `/features`, `/login`) desocupam o namespace raiz
- **COEP simplificado** (`firebase.json`): headers COOP/COEP consolidados em `/app/**` (uma regra) e `/404.html`, substituindo 7 regras individuais por rota
- **AuthContext**: redirect pós-login atualizado de `/estudio` para `/app/estudio`
- **Tokens de tema**: 15 tokens de marca atualizados (primary, secondary, contrast, glow, gradients); testes de tema ajustados para nova paleta blue/orange
- **AssistantMessages**: `React.memo` com `arePropsEqual` customizado evita re-render de mensagens quando props irrelevantes mudam
- **VideoPage**: `sceneList` tipada (imageUrl + timestamp) passada ao VideoPreview
- **Speed Paint**: seletores Zustand otimizados em StrokeRenderer e SpeedPaintPage (selector individual em vez de destruturação)
- **ActionBar**: adaptação aos novos tokens de glow (brand blue)

---

## [0.16.1] - 2026-04-24

### Adicionado

- **`frameToSeconds()` / `secondsToFrame()`** (`src/features/video-render/lib/formatTimestamp.ts`): utilitários de conversão entre frames e segundos com parâmetro `fps`
- **Testes**: novo teste de legenda com sticky fallback para gaps entre frases (`remotion-components.component.test.tsx`); testes do `videoRenderBridge` para `syncCurrentFrame`/`syncIsPlaying`; testes de `frameToSeconds`/`secondsToFrame` no `formatTimestamp.unit.test.ts`

### Alterado

- **`videoRenderBridge`** (`src/features/video-render/store/videoRenderBridge.ts`): estado do player (`currentFrame`, `isPlaying`) movido para o bridge com `syncCurrentFrame()`/`syncIsPlaying()` — centralização do estado de reprodução
- **`ActionBar.tsx`**: consome `currentFrame`/`isPlaying` via `useVideoRenderBridge` em vez de props, simplificação (-40/+11)
- **`VideoPreview.tsx`**: mesma simplificação via bridge
- **`CaptionEditorPanel.tsx`**: consome `currentFrame`/`isPlaying` via bridge diretamente; ajustes em PhraseCard e formatação de timestamps
- **`VideoPage.tsx`**: remoção de estado local `currentPlayerFrame` — agora gerenciado pelo bridge
- **`SubtitleOverlay.tsx`**: refatoração interna do scroll de legendas (+37/-21), documentação JSDoc atualizada

---

## [0.16.0] - 2026-04-24

### Adicionado

- **Suite de testes completa** (62 arquivos, `tests/`): cobertura com Vitest + @testing-library/react + fake-indexeddb + jsdom — testes unitários e de componentes cobrindo todas as áreas do projeto (assistant, components, contexts, hooks, lib, pages, speed-paint, studio, theme, video-render)
- **`vitest.config.ts`**: configuração do runner com jsdom, path aliases (`@/`) e setup file (`tests/setup.ts`)
- **`tests/setup.ts`**: setup global com fake-indexeddb/auto e stub de `import.meta.env.PROD` para `false` em todos os testes
- **Scripts**: `test` (vitest run) e `test:watch` (vitest) adicionados ao package.json
- **Dependências de dev**: vitest ^4.1.5, @testing-library/react ^16.3.2, @testing-library/user-event ^14.6.1, @testing-library/jest-dom ^6.9.1, @vitest/coverage-v8 ^4.1.5, fake-indexeddb ^6.2.5, jsdom ^29.0.2

### Corrigido

- **logger** (`src/lib/logger.ts`): correção da lógica de comparação de níveis de log em produção — condição invertida de `>=` para `<=`, que causava supressão incorreta de níveis (debug/info eram exibidos, warn/error eram suprimidos)
- **subtitleUtils** (`src/features/video-render/lib/subtitleUtils.tsx`): normalização de palavras com markdown bold (`**texto**`) antes de comparação com `boldWords` — evita falsos negativos em palavras marcadas como bold no texto de legenda

---

## [0.15.0] - 2026-04-24

### Adicionado

- **Header** (`src/components/Header.tsx`): navigation drawer responsivo para mobile com MUI Drawer, List, ListItemButton e menu hamburger — navegação lateral em telas pequenas via `useMediaQuery`
- **ScriptEditor** (`src/components/ScriptEditor.tsx`): botão copiar roteiro com feedback visual (ícone ContentCopy → Check) e Tooltip
- **AssistantMessages** (`src/features/assistant/components/AssistantMessages.tsx`): componente dedicado com botão copiar mensagem e botão parar geração (stop) com AbortController — interação independente por mensagem
- **CaptionEditorPanel** (`src/features/video-render/components/CaptionEditorPanel.tsx`): redesign completo com PhraseCard, AddPhraseButton, `PhraseCardProps`/`AddPhraseButtonProps` tipados — edição visual de frases de legenda com hover transitions e ícones (Add, Delete, Undo, Expand)
- **`CaptionPhrase`** (`src/features/video-render/types.ts`): interface tipada para representar uma frase de legenda (grupo de palavras com timing)
- **`formatTimestamp`** (`src/features/video-render/lib/formatTimestamp.ts`): utilitário extraído para formatação de timestamps de legenda
- **`stopGeneration`** (`src/hooks/useAssistant.ts`): método público para interromper geração em andamento via AbortController
- **`wordsToPhrases`** (`src/features/video-render/lib/subtitleUtils.tsx`): conversão de array de palavras para array de frases de legenda
- **`phrasesToWords`** (`src/features/video-render/lib/subtitleUtils.tsx`): conversão inversa — array de frases de legenda de volta para palavras
- **`MAX_STYLE_NOTES`** (`src/components/Inspector.tsx`): limite de 500 caracteres para notas de estilo com feedback visual via InputAdornment + ícone Warning
- **VideoLibrary** (`src/components/VideoLibrary.tsx`): diálogo de confirmação para exclusão de vídeos com MUI Dialog
- **Assistant** (`src/features/assistant/Assistant.tsx`): diálogo de confirmação para limpar sessão do assistente

### Alterado

- **CaptionEditorPanel** (`src/features/video-render/components/CaptionEditorPanel.tsx`): refatoração completa — remoção de `PhraseRow`/`PhraseRowProps`/`CaptionPhrase` (movidos para types.ts e subtitleUtils.tsx); remoção de ícones CallSplitOutlined/MergeOutlined; novo layout com cards, hover transitions e constantes de UI (`PHRASE_LIST_MAX_HEIGHT`, `ADD_BUTTON_HEIGHT`, `HOVER_TRANSITION_DURATION`, etc.)
- **Header** (`src/components/Header.tsx`): +214/-62 linhas — reestruturação completa do header com suporte a drawer mobile e responsividade
- **ScriptEditor** (`src/components/ScriptEditor.tsx`): +80/-48 linhas — melhoria de UX com botão copiar e estilos refinados
- **Library** (`src/components/Library.tsx`): +96/-23 linhas — melhoria de estilos e experiência visual
- **VideoLibrary** (`src/components/VideoLibrary.tsx`): +99/-7 linhas — adição de diálogo de exclusão e melhoria de estilos
- **video-render/index.ts**: exportação de `CaptionPhrase` adicionada ao barrel
- **subtitleUtils.tsx**: funções `parseBoldMarkdown` existentes mantidas, novas funções `wordsToPhrases`/`phrasesToWords` adicionadas

---

## [0.14.2] - 2026-04-23

### Adicionado

- **WaveformOverlay** (`src/features/video-render/components/WaveformOverlay.tsx`): prop `isExporting` — quando `true`, pula renderização do SVG pesado durante exportação para economizar CPU
- **VideoComposition** (`src/features/video-render/components/VideoComposition.tsx`): prop `isExporting` repassada para WaveformOverlay durante exportação
- **CompositionConfig** (`src/features/video-render/types.ts`): campo `isExporting?: boolean` — indica modo exportação, desabilita overlays pesados

### Alterado

- **useVideoExporter** (`src/features/video-render/hooks/useVideoExporter.tsx`): throttle de percentual de progresso via `lastReportedPercentRef` — evita re-renders desnecessários quando o inteiro não muda; reset automático no início de nova renderização
- **canvasFontStretchPatch** (`src/features/video-render/lib/canvasFontStretchPatch.ts`): refatoração — extração de `patchPrototype()` com tipo `CanvasPrototype` (suporta canvas regular e OffscreenCanvas); integração com `createLogger` no lugar de `console.log`
- **SubtitleInlineEditor** (`src/features/video-render/components/SubtitleInlineEditor.tsx`): import de `Collapse` adicionado (preparação para colapsar seções)

---

## [0.14.1] - 2026-04-23

### Corrigido

- **SubtitleInlineEditor** (`src/features/video-render/components/SubtitleInlineEditor.tsx`): limites de `verticalOffset` agora são dinâmicos com base na resolução da composição (margem de 10% em relação ao topo e fundo) em vez de constantes estáticas `MIN_VERTICAL_OFFSET`/`MAX_VERTICAL_OFFSET` (-300 a 300), evitando offsets inválidos em resoluções menores como 1080x1920 (9:16); `enterEditMode` agora aplica `clamp` ao valor inicial
- **Docstring de `verticalOffset`** (`src/features/video-render/types.ts`): correção na documentação — positivo sobe, negativo desce (antes dizia o oposto)

### Alterado

- **Modelo Whisper** (`src/features/video-render/hooks/useTranscription.ts`): downgrade de `base` (~75MB) para `tiny` (~39MB) — menor tamanho de download, sincronização de timing adequada para fala; mensagem de progresso atualizada

### Removido

- **`MIN_VERTICAL_OFFSET` / `MAX_VERTICAL_OFFSET`** (`src/features/video-render/components/SubtitleInlineEditor.tsx`): constantes estáticas removidas em favor de limites dinâmicos calculados pela resolução

---

## [0.14.0] - 2026-04-23

### Adicionado

- **SubtitleInlineEditor** (`src/features/video-render/components/SubtitleInlineEditor.tsx`): editor inline de estilo de legendas integrado ao VideoPage via portal React — controles para fontSize, paddingX/Y, borderRadius, backgroundOpacity, gap e verticalOffset com sliders, chips de preset e preview em tempo real; toggles de posição (bottom/center/top) e visibilidade
- **`SubtitleStyle`** (`src/features/video-render/types.ts`): interface tipada para personalização visual de legendas no vídeo (fontSize, paddingX, paddingY, borderRadius, backgroundOpacity, gap, verticalOffset)
- **`DEFAULT_SUBTITLE_STYLE`** (`src/features/video-render/types.ts`): constantes padrão para estilo de legendas, exportada no barrel `src/features/video-render/index.ts`
- **`getAlignment()`** (`src/features/video-render/components/SubtitleOverlay.tsx`): função utilitária para posicionar legendas (bottom/center/top) com offset padding e gap entre frases visíveis
- **`shouldAppendToPreviousWord()`** (`src/features/video-render/lib/subtitleUtils.tsx`): função auxiliar para tratamento de pontuação na concatenação de palavras

### Alterado

- **SubtitleOverlay** (`src/features/video-render/components/SubtitleOverlay.tsx`): suporte a `subtitleStyle` prop para personalização visual; novo sistema de alinhamento com `getAlignment`; remoção do tipo legado `VisiblePhrase`; posições bottom/center/top refatoradas
- **VideoComposition** (`src/features/video-render/components/VideoComposition.tsx`): propaga `subtitleStyle` para `SubtitleOverlay` via `useMemo`
- **VideoPage** (`src/pages/VideoPage.tsx`): integração do `SubtitleInlineEditor` e `DEFAULT_SUBTITLE_STYLE`; estado local para `subtitleStyle` passado ao player e exportador
- **VideoExportPanel** (`src/features/video-render/components/VideoExportPanel.tsx`): suporte a `subtitleStyle` nas opções de exportação
- **useVideoExporter** (`src/features/video-render/hooks/useVideoExporter.tsx`): propaga `subtitleStyle` para o render
- **ScrollingPhrase** (`src/features/video-render/components/ScrollingPhrase.tsx`): ajuste de imports de tokens de tema
- **CaptionEditorPanel** (`src/features/video-render/components/CaptionEditorPanel.tsx`): `aria-label` adicionado ao campo de edição de frase
- **useTranscription** (`src/features/video-render/hooks/useTranscription.ts`): simplificação — remoção de `processWhisperCaptions` inline, ajustes em `INVALID_TOKEN`/`VALID_WORD`
- **TranscriptionPanel** (`src/features/video-render/components/TranscriptionPanel.tsx`): remoção de import não utilizado (`react`)

### Removido

- **`SubtitleMode`** (`src/features/video-render/types.ts`): tipo legado não mais utilizado — legendas agora usam `SubtitleStyle` para configuração visual
- **`AnimatedWord` / `WordState` / constantes de karaoke** (`src/features/video-render/lib/subtitleUtils.tsx`): código morto removido — karaoke palavra-a-palavra substituído por texto contínuo na v0.13.3
- **`VisiblePhrase`** (`src/features/video-render/components/SubtitleOverlay.tsx`): tipo legado — substituído por sistema de alinhamento com `getAlignment`

---

## [0.13.3] - 2026-04-23

### Alterado

- **ScrollingPhrase** (`src/features/video-render/components/ScrollingPhrase.tsx`): reescrita — modo karaoke palavra-a-palavra (`AnimatedWord`, `WordState`, `useVideoConfig`) substituído por texto contínuo com 2 variantes visuais (`active` com fade in + translateY, `previous` com transição de opacidade 1.0→0.5 + fade out); estilos inline extraídos para `baseStyle`; suporte a **bold** via `parseBoldMarkdown`
- **SubtitleOverlay** (`src/features/video-render/components/SubtitleOverlay.tsx`): scroll de legendas agora exibe frase ATIVA (opacidade 1.0) + frase ANTERIOR (opacidade 0.5) em vez de ativa + próxima; novo tipo `VisiblePhrase`; container com `flexDirection: column` e gap para empilhamento vertical correto

---

## [0.13.2] - 2026-04-23

### Adicionado

- **Galeria de imagens no ImageStudio** (`src/components/ImageStudio.tsx`): exibe imagens salvas com loading skeleton, dialog de confirmação de exclusão e atualização automática após salvar/deletar
- **Busca na Biblioteca** (`src/components/Library.tsx`): campo de busca por nome de projeto com ícone, botão de limpar e estado vazio contextual
- **Busca no histórico do assistente** (`src/features/assistant/components/AssistantHistoryPanel.tsx`): campo de busca por título de sessão com estado vazio e filtragem client-side
- **`deleteGeneration(id, userId?)`** (`src/lib/db/generations.ts`): exclusão de geração de áudio do Firestore, Storage (áudio + imagens de cena) e/ou IndexedDB conforme o modo do usuário

### Alterado

- **Audio segments — dual storage** (`src/lib/db/audio-segments.ts`): `saveAudioSegments` e `loadAudioSegments` agora suportam Firestore (via `userId`) + IndexedDB (fallback). `saveAudioSegments` recebe `audioId` em vez de `projectId` para keypath correto
- **Bug fix: ordem de persistência de segmentos** (`src/hooks/useAudioGenerator.ts`): `saveAudioSegments` agora é chamado APÓS `saveAudioToProject` para garantir que o documento exista (corrigia key mismatch GAP-001)
- **`useTranscription` recebe `userId`** (`src/features/video-render/hooks/useTranscription.ts`, `src/pages/VideoPage.tsx`): propaga `userId` para `loadAudioSegments` no dual storage

---

## [0.13.1] - 2026-04-23

### Alterado

- **AGENTS.md reestruturado**: documentação por domínio consolidada inline (12 seções) em vez de referenciar guias externos; adições: seções "Anti-patterns" e "Rotas" com tabela de rotas/proteção

### Removido

- **12 guias externos** (`docs/guides/`): `assistant.md`, `audio.md`, `auth.md`, `environment.md`, `gemini-integration.md`, `image-generation.md`, `library.md`, `persistence.md`, `speed-paint.md`, `studio.md`, `ui-design-system.md`, `video-render.md` — conteúdo migrado para AGENTS.md

---

## [0.13.0] - 2026-04-23

### Adicionado

- **6 novos guias** em `docs/guides/` — `assistant.md`, `speed-paint.md`, `studio.md`, `library.md`, `auth.md`, `gemini-integration.md`; todas as áreas do projeto agora possuem documentação
- **`deleteImageGeneration(id, userId?)`** (`src/lib/db/images.ts`): exclusão de geração de imagem do Firestore + Storage e/ou IndexedDB
- **`countIndexedDbItems(storeName)`** (`src/lib/db/shared.ts`): conta itens de uma store sem carregar dados
- **`estimateDocumentSize()` / `sumAttachmentSize()`** (`src/lib/db/chats.ts`): estimativa de tamanho de documento para proteção contra limite do Firestore
- **`errorId` no retorno de `useVoicePreviews`** (`src/hooks/useVoicePreviews.ts`): identificador da voz com erro de preview WAV
- **Blob URL cleanup** (`src/components/Library.tsx`): registro e limpeza de blob URLs criados durante navegação na Biblioteca

### Alterado

- **`saveChatSession`** (`src/lib/db/chats.ts`): adicionado fallback para IndexedDB quando documento excede `FIRESTORE_MAX_DOC_SIZE_BYTES` (900 KB)
- **`migration.ts`** (`src/lib/db/migration.ts`): novas funções `trackMigration` e `cleanupMigratedItems` para rastreamento de migrações
- **`AnimationPlayer.tsx`**: remoção de `hasAutoPlayed` ref (tech debt eliminado do store)
- **`animationStore.ts`**: remoção de comentário TECH DEBT sobre `hasAutoPlayed`
- **`useTranscription.ts`**: mensagem de download do modelo Whisper agora inclui tamanho (~75 MB)
- **`gemini.ts`**: ajustes de implementação em contents, responseSchema, timestamp e prompt

### Documentação

- **4 guias corrigidos** (`docs/guides/`) — 22 inconsistências corrigidas entre números de linha, funções omitidas, tipos incorretos e descrições de comportamento
- **Tabela "Documentação por Domínio"** no AGENTS.md expandida de 7 para 12 entradas (100% das áreas cobertas)

---

## [0.12.0] - 2026-04-22

### Adicionado

- **LoginPage** (`src/pages/LoginPage.tsx`): página de login dedicada com autenticação Google, layout visual com branding e redirecionamento pós-login para `/estudio`
- **ProtectedRoute** (`src/components/ProtectedRoute.tsx`): wrapper de rota que redireciona usuários não-autenticados para `/login`, aplicado em todas as rotas autenticadas
- **Headers COOP/COEP em produção** (`firebase.json`): 7 rotas com Cross-Origin headers (`/estudio**`, `/video**`, `/image**`, `/assistant**`, `/library**`, `/speed-paint**`, `/404.html`) + cache `no-cache` para `/login`

### Alterado

- **`src/App.tsx`**: rota `/` do Estúdio movida para `/estudio`; `/` agora faz redirect para `/estudio`; LoginPage carregada via lazy loading; ProtectedRoute envolve rotas autenticadas; Header oculto na rota `/login`
- **`src/components/Header.tsx`**: botão "Login" agora navega para `/login` via href em vez de chamar `login()` diretamente; `useAuth()` destruturado sem `login`; rota do Estúdio atualizada de `/` para `/estudio`
- **`src/contexts/AuthContext.tsx`**: `login()` refatorado — `isLoginActive` flag para rastrear popup ativo; `login()` exportado para uso pela LoginPage
- **`vite.config.ts`**: plugin COEP simplificado — `coepPlugin()` middleware ativo por padrão (sem query param), exceção para `/login` (Firebase Auth precisa de iframes cross-origin); remoção de `conditionalCoepPlugin`
- **`src/components/VideoLibrary.tsx`**, **`src/components/VideoPreview.tsx`**, **`src/pages/NotFoundPage.tsx`**: navegação atualizada de `/` para `/estudio`

### Documentação

- **5 guias atualizados** (`docs/guides/`) — 26 inconsistências corrigidas entre números de linha, fórmulas, funções, constantes, tabela de ownership e descrições de comportamento

---

## [0.11.2] - 2026-04-22

### Alterado

- **`vite.config.ts`**: headers COOP/COEP removidos da configuração estática de build e movidos para plugin condicional `conditionalCoepPlugin` — ativa via query param `?coep=1` no dev/preview server, eliminando o conflito entre Firebase Auth (iframes cross-origin) e `SharedArrayBuffer` (Whisper WASM, Remotion)
- **`src/components/Header.tsx`**: adicionado `referrerPolicy: 'no-referrer'` no Avatar para evitar leaks de referência
- **`src/contexts/AuthContext.tsx`**: mensagens de erro de auth corrigidas (encoding)

---

## [0.11.1] - 2026-04-22

### Adicionado

- **5 novos tokens** em `src/theme/tokens.ts`: `ERROR_BG_SUBTLE`, `ERROR_BG_MEDIUM`, `WARNING_BG_SUBTLE`, `WHITE_01`, `GLASS_BG` — substituem valores hardcoded de cor em 8 componentes

### Alterado

- **12 componentes** migrados de cores hardcoded para tokens de tema: `Header`, `NetworkStatusIndicator`, `ScriptEditor`, `VideoLibrary`, `assistantUi`, `StrokeRenderer`, `ScrollingPhrase`, `TranscriptionPanel`, `VideoExportPanel`, `subtitleUtils`
- **`src/index.css`**: comentário de alinhamento entre variáveis CSS e tokens.ts

### Documentação

- **6 guias atualizados** (`docs/guides/`) para refletir o código-fonte real — 47 inconsistências corrigidas entre números de linha, tipos, funções, constantes e descrições de comportamento

---

## [0.11.0] - 2026-04-22

### Adicionado

- **Logger centralizado** (`src/lib/logger.ts`): `logger` singleton e `createLogger(namespace)` factory com níveis (debug/info/warn/error), supressão automática em produção, integração em ~20 componentes, hooks e módulos da lib
- **CaptionEditorPanel** (`src/features/video-render/components/CaptionEditorPanel.tsx`): painel MUI dedicado para edição manual de legendas — split de palavras em timers independentes, merge de timers, edição inline de timestamps, pré-visualização visual dos gaps, integração com CaptionSource
- **Persistência de segmentos de áudio** (`src/lib/db/audio-segments.ts`): `saveAudioSegments`/`loadAudioSegments` persistem o mapeamento texto→tempo gerado pelo TTS em IndexedDB, tipo `AudioSegment` em `src/lib/db/types.ts`
- **Detecção de silêncio** (`src/lib/audio-analysis.ts`): análise de amplitude RMS via Web Audio API para identificar transições de cena em áudio WAV, calibração automática de threshold, `detectSceneBoundaries` exportada
- **Hash de roteiro** (`src/lib/crypto-utils.ts`): `hashScript` via SHA-256 (Web Crypto API) para staleness detection — detecta quando o roteiro mudou e as legendas salvas ficaram desatualizadas
- **Alinhamento script→legendas** (`src/features/video-render/lib/subtitleUtils.ts`): `splitIntoWordsWithTiming` e `alignScriptToSegments` — alinham as palavras do roteiro aos segmentos de áudio TTS para timing preciso sem depender de Whisper, com suporte a sílabas e pausas por pontuação
- **CaptionSource** (`src/features/video-render/types.ts`): tipo unificado para fonte de legendas (whisper-aligned, script-segments, manual)
- **Exportação** de `CaptionEditorPanel` no barrel `src/features/video-render/index.ts`

### Alterado

- **useTranscription** (`src/features/video-render/hooks/useTranscription.ts`): pipeline v3 — integração com `loadAudioSegments` e `hashScript` para detecção de staleness, `processWhisperAlignedCaptions` refinado, `ScriptWord` type para marcação bold por palavra
- **useAudioGenerator** (`src/hooks/useAudioGenerator.ts`): persiste `audioSegments` via `saveAudioSegments` após geração TTS, detecção de boundaries via `detectSceneBoundaries`
- **VideoPreview** (`src/components/VideoPreview.tsx`): integração com `createLogger`, refatoração do render
- **VideoPage** (`src/pages/VideoPage.tsx`): integração com `CaptionEditorPanel` e tipo `AudioSegment`
- **TranscriptionPanel** (`src/features/video-render/components/TranscriptionPanel.tsx`): uso de `CaptionSource` type
- **Módulos de persistência** (`migration.ts`, `shared.ts`, `transcriptions.ts`): integração com `createLogger`
- **useStudioState** (`src/features/studio/useStudioState.ts`): integração com `createLogger`

---

## [0.10.1] - 2026-04-22

### Adicionado

- **WarningToast** (`src/components/WarningToast.tsx`): snackbar de aviso para falhas parciais (ex: cenas que falharam na geração), integrado ao App shell
- **Loading states** nos painéis do assistente: skeletons em `AssistantMemoriesPanel` e estado `isLoading` em `AssistantHistoryPanel` durante carregamento de dados

### Alterado

- **useAssistant** (`src/hooks/useAssistant.ts`): auto-save de sessão agora respeita `isStreaming`, evitando centenas de saves por segundo durante streaming
- **useVoicePreviews** (`src/hooks/useVoicePreviews.ts`): tratamento de erro no `audio.play()` para navegadores que bloqueiam autoplay
- **VideoExportPanel** (`src/features/video-render/components/VideoExportPanel.tsx`): labels dinâmicos exibem o container resolvido (MP4/VP8/VP9) em vez de texto fixo "MP4"
- **AnimationPlayer** (`src/features/speed-paint/components/canvas/AnimationPlayer.tsx`): acesso ao `batchMode` via seletor Zustand em vez de getState direto
- **gemini.ts** (`src/lib/gemini.ts`): `generateScenePrompts` refatorado com retry via `withRetry`, nova interface `ScenePromptResult` exportada, remoção de `MAX_IMAGE_RETRIES`

### Removido

- **EDITING_PLAN_STORE** (`src/lib/db/shared.ts`): constante legada do plano de edição (removido na 0.9.0)
- **Plano de legendas Whisper** (`docs/plan/legendas-automaticas-whisper.md`): documento de planejamento arquivado — feature já implementada nas versões 0.8.4/0.10.0
- **referenceImage do localStorage** (`src/features/studio/useStudioState.ts`): `referenceImage` agora é session-only (data URLs base64 são muito grandes para localStorage)

### Documentação

- **persistence.md**: remoção de `EDITING_PLAN_STORE` da tabela de stores, nota "apenas IndexedDB" em `TRANSCRIPTIONS_STORE`

---

## [0.10.0] - 2026-04-22

### Adicionado

- **TranscriptionPanel** (`src/features/video-render/components/TranscriptionPanel.tsx`): painel MUI dedicado para transcrição de legendas — controle de transcrição, progresso, status e ações (transcrever, cancelar, limpar) integrado ao VideoPage
- **useTranscription v2** (`src/features/video-render/hooks/useTranscription.ts`): refatoração do pipeline Whisper com `mergeWordFragments` e `processWhisperCaptions` via `@remotion/captions`, filtros `INVALID_TOKEN`/`VALID_WORD`, troca para modelo Whisper `tiny-en` com idioma `auto` (detector automático)
- **Logos do app** (`public/logo-sem-titulo-quadrado.webp`, `public/logo-sem-titulo-redondo.webp`, `public/logo-sem-titulo-transparente.webp`): três variantes do logo em formato WebP

### Alterado

- **ScrollingPhrase** (`src/features/video-render/components/ScrollingPhrase.tsx`): maxWidth `80%` → `90%`, adição de `width: fit-content` e `margin: 0 auto` para melhor centralização
- **SubtitleOverlay** (`src/features/video-render/components/SubtitleOverlay.tsx`): ajustes na implementação das posições (bottom, center, top)
- **VideoComposition** (`src/features/video-render/components/VideoComposition.tsx`): frame do WaveframeOverlay agora é relativo à cena (`frame - adjustedFrom`) em vez de absoluto, corrigindo sincronização visual
- **WaveformOverlay** (`src/features/video-render/components/WaveformOverlay.tsx`): adição de `zIndex: 5` para controle de empilhamento
- **VideoPage** (`src/pages/VideoPage.tsx`): substituição da UI de transcrição inline por `TranscriptionPanel` dedicado, remoção de imports MUI desnecessários

### Documentação

- **6 guias atualizados** em `docs/guides/` para refletir estado atual do código:
  - `audio.md`: retry logic reescrita (withRetry), remoção de useAudioPlayer e script de previews, correção de contagem de vozes
  - `environment.md`: headers COOP/COEP, dedupe, optimizeDeps, re-exports de auth, tsconfig completo
  - `image-generation.md`: SceneImagePayload removido, funções CRUD atualizadas, withRetry, números de linha corrigidos
  - `persistence.md`: DB_VERSION 8→9, 2 novas stores, domínio Transcriptions, funções CRUD atualizadas
  - `ui-design-system.md`: RoutableErrorBoundary, WHITE_015, APP_BACKGROUND_GLOW, MuiAppBar WebkitBackdropFilter
  - `video-render.md`: pacotes Whisper/captions, SubtitleOverlay refatorada, 3 fallbacks de codec, seções useTranscription e canvasFontStretchPatch

---

## [0.9.0] - 2026-04-22

### Removido (breaking change)

- **Plano de edição IA** (`src/features/video-render/hooks/useEditingPlan.ts`, `src/features/video-render/lib/editingPlan.ts`, `src/features/video-render/lib/audioAnalysis.ts`, `src/features/video-render/components/EditingPlanInspector.tsx`, `src/features/video-render/components/TitleOverlay.tsx`, `src/lib/db/editing-plans.ts`): remoção completa da feature de edição de vídeo gerada por IA — análise de áudio, análise visual de cenas, sugestão de transições/câmera/efeitos, inspetor de edição, persistência de planos e overlays de título. Todas as cenas agora usam fade in/out padrão via spring.
- **gemini.ts** (`src/lib/gemini.ts`): remoção de `generateEditingPlan`, `loadSceneImagesForAnalysis` e funções auxiliares de análise visual (-348 linhas)
- **ActionBar** (`src/components/ActionBar.tsx`): remoção do botão de gerar edição (AutoFixHigh)
- **videoRenderBridge** (`src/features/video-render/store/videoRenderBridge.ts`): remoção do estado do plano de edição (`isGeneratingPlan`, `isPlanDisabled`, `planError`, `generatePlanAction`, `clearPlanErrorAction`)

### Alterado

- **SceneSequence** (`src/features/video-render/components/SceneSequence.tsx`): simplificado para fade in/out padrão com spring — remoção de transições variadas (slide, wipe, zoom, dissolve), movimentos de câmera (pan, tilt, ken-burns) e efeitos visuais (grayscale, blur, sepia, vignette, etc.)
- **VideoComposition** (`src/features/video-render/components/VideoComposition.tsx`): fade fixo (`FADE_FRAMES = 12`, `FADE_DURATION_MS = 400`), remoção de `editingPlan`, `TitleOverlay`, `getOverlapFrames` e `findEditingSceneForIndex`
- **VideoPage** (`src/pages/VideoPage.tsx`): remoção do hook `useEditingPlan`, do inspetor `EditingPlanInspector` e de toda a lógica de sincronização do plano de edição com o bridge
- **App.tsx** (`src/App.tsx`): remoção da leitura do estado do plano de edição do bridge
- **VideoPreview** (`src/components/VideoPreview.tsx`): remoção da prop `editingPlan`
- **VideoExportPanel** (`src/features/video-render/components/VideoExportPanel.tsx`): remoção da prop `editingPlan`
- **useVideoExporter** (`src/features/video-render/hooks/useVideoExporter.tsx`): remoção de `editingPlan` das opções de exportação
- **videoUtils** (`src/features/video-render/lib/videoUtils.ts`): remoção de `editingPlan` de `mapScenesToVideoScenes`
- **types** (`src/features/video-render/types.ts`): remoção de `EditingScene` de `VideoCompositionProps`
- **video-render/index.ts**: remoção de re-exports relacionados ao plano de edição
- **Gemini modelos**: `gemini-3.1-flash-lite-preview` não é mais usado para edição (ainda usado para chunking e prompts de cena)

### Documentação

- **video-render.md**: reescrita completa — remoção de 7 seções (Editing Plan, Tipos do Plano, Análise de Áudio, TitleOverlay, SPRING_CAMERA, transições variadas, efeitos visuais)
- **image-generation.md**: remoção da seção "Análise Visual de Cenas (Plano de Edição)"
- **persistence.md**: remoção das seções `StoredEditingPlan` e `5.8 Editing Plans`
- **audio.md**: remoção de `generateEditingPlan` da tabela de referência

### Outras mudanças

- **Rate limiter** (`src/lib/rate-limiter.ts`, `useAudioGenerator.ts`, `useImageGenerator.ts`): extração do `withRetry` como utilitário reutilizável
- **getImageGenerations** (`src/lib/db/images.ts`): nova função para listar gerações de imagens com ordenação
- **ErrorBoundary** (`src/main.tsx`): wrapper `RoutableErrorBoundary` com reset automático por rota
- **useStudioState** (`src/features/studio/useStudioState.ts`): persistência de `referenceImage` no localStorage

---

## [0.8.4] - 2026-04-21

### Adicionado

- **useTranscription** (`src/features/video-render/hooks/useTranscription.ts`): hook de transcrição automática de áudio via Whisper WASM (`@remotion/whisper-web`); suporta modelos `tiny` (multilingual) e `tiny.en` (inglês), resampling para 16kHz, fallback para estimativa proporcional quando Whisper falha, integração com IndexedDB para cache de transcrições; estados de progresso expostos via `videoRenderBridge` (`isTranscribing`, `transcriptionProgress`, `transcriptionStatusText`)
- **ScrollingPhrase** (`src/features/video-render/components/ScrollingPhrase.tsx`): componente Remotion para exibição de legendas no modo scroll de frases — frase ativa com fade-in/out, karaoke palavra-a-palavra dentro da frase, suporte a negrito via markdown `**`
- **subtitleUtils** (`src/features/video-render/lib/subtitleUtils.tsx`): utilitários para processamento de legendas — agrupamento de palavras em frases (`groupCaptionWordsIntoPhrases`), cálculo de timing e duração por frase, componentes internos `AnimatedPhrase` e `KaraokeWord`
- **TranscriptionResult/CaptionWord/SubtitleMode** (`src/features/video-render/types.ts`): tipos para o sistema de legendas — `CaptionWord` (palavra com timestamp), `TranscriptionResult` (resultado completo da transcrição), `SubtitleMode` (`scroll-phrases` | `word-karaoke`)
- **transcriptions DB** (`src/lib/db/transcriptions.ts`): persistência de transcrições no IndexedDB (store `transcriptions`) para evitar re-transcrição do mesmo áudio
- **VideoPage**: integração com `useTranscription` — botão de transcrever na página de vídeo, com indicação de progresso
- **Dependências**: `@remotion/captions@4.0.448`, `@remotion/whisper-web@4.0.448`

### Alterado

- **SubtitleOverlay** (`src/features/video-render/components/SubtitleOverlay.tsx`): reescrito com suporte a dois modos de exibição — `scroll-phrases` (frases com karaoke interno) e `word-karaoke` (karaoke contínuo como v0.8.0); lógica de timing e animação movida para `subtitleUtils`
- **VideoComposition** (`src/features/video-render/components/VideoComposition.tsx`): adaptação para receber `CaptionWord[]` no lugar de legendas simples
- **VideoExportPanel** (`src/features/video-render/components/VideoExportPanel.tsx`): integração com tipos de transcrição
- **useVideoExporter** (`src/features/video-render/hooks/useVideoExporter.tsx`): integração com tipos de transcrição
- **EditingPlanInspector** (`src/features/video-render/components/EditingPlanInspector.tsx`): simplificação — remoção de campos de legenda editáveis (agora gerados automaticamente via Whisper)
- **videoRenderBridge** (`src/features/video-render/store/videoRenderBridge.ts`): novos estados para transcrição (`isTranscribing`, `transcriptionProgress`, `transcriptionStatusText`, `syncTranscriptionState`)
- **video-render/index.ts**: exportação dos novos tipos (`CaptionWord`, `TranscriptionResult`, `SubtitleMode`)
- **gemini.ts** (`src/lib/gemini.ts`): remoção do campo `subtitle` do tipo de cena (legendas agora são geradas por transcrição, não pelo Gemini)
- **shared.ts** (`src/lib/db/shared.ts`): incremento de `DB_VERSION` para migração, novo store `TRANSCRIPTIONS_STORE`
- **db/index.ts** (`src/lib/db/index.ts`): re-export do módulo de transcrições
- **vite.config.ts**: headers COOP/COEP (`credentialless`) para suporte a `SharedArrayBuffer` (requerido pelo Whisper WASM); `@remotion/whisper-web` excluído de `optimizeDeps`

### Deprecado

- **editingPlan.ts**: campos `subtitle` e `subtitlePosition` no tipo de cena marcados como `@deprecated` para remoção na v0.9.0 — legendas agora vêm da transcrição Whisper

### Dependências

- **Remotion**: downgrade `4.0.450` → `4.0.448` (necessário para compatibilidade com `@remotion/whisper-web`)
- **Novo**: `@remotion/captions@4.0.448`, `@remotion/whisper-web@4.0.448`

### Documentação

- **docs/plan/legendas-automaticas-whisper.md**: plano de implementação do sistema de legendas automáticas com Whisper Web + fallback proporcional

---

## [0.8.3] - 2026-04-21

### Corrigido

- **useEditingPlan** (`src/features/video-render/hooks/useEditingPlan.ts`): `regenerateScene` agora reutiliza a análise de áudio (`audioAnalysisResult`) em vez de refazer a análise, evitando chamadas desnecessárias à API; novo tratamento de erro para `token count exceeds` com mensagem amigável em pt-BR
- **AudioContext** (`src/contexts/AudioContext.tsx`): `AbortError` no `play()` agora é silenciado — ocorre naturalmente ao trocar de áudio ou pausar, não é um erro real
- **useVideoExporter** (`src/features/video-render/hooks/useVideoExporter.tsx`): extraído `isCancellationError()` para detectar tanto `DOMException AbortError` quanto `Error "cancelled"` do Remotion, evitando exibir mensagem de erro falsa ao cancelar exportação
- **generateEditingPlan** (`src/lib/gemini.ts`): roteiro truncado em 15.000 caracteres (`MAX_SCRIPT_CHARS`) quando excede o limite, evitando erro `invalid_argument` do Gemini por estouro de tokens; `MAX_IMAGES_FOR_ANALYSIS` reduzido de 8 para 3 — imagens base64 consomem ~50-150K tokens cada, 3 imagens mantêm uso total abaixo de ~450K tokens do flash-lite

### Alterado

- **AnimationControls** (`src/features/speed-paint/components/canvas/AnimationControls.tsx`): `alert()` substituído por `Snackbar`+`Alert` MUI para feedback de erros de gravação; SpeedSelectors em mobile agora acessíveis via `Menu` com ícone `SpeedIcon` (variante `panel`), melhorando usabilidade em telas estreitas
- **ActionBar** (`src/components/ActionBar.tsx`): download em lote de imagens agora mostra progresso (`"Baixando cena N/M..."`) com `CircularProgress` e desabilita o botão durante o download
- **AssistantMessages** (`src/features/assistant/components/AssistantMessages.tsx`): exibe mensagem de aviso quando o assistente sugere ajustes em JSON malformado (`"O assistente sugeriu ajustes, mas o formato não pôde ser interpretado."`)
- **extractJsonSettings** (`src/features/assistant/utils.ts`): retorno agora discriminado via `ExtractedSettingsResult` — distingue "não encontrado" (`null`), "JSON válido" (`parseError: false`) e "JSON malformado" (`parseError: true`)
- **AuthContext** (`src/contexts/AuthContext.tsx`): migração IndexedDB→Firestore agora usa ref `lastCheckedUserId` para evitar re-verificação quando `onAuthStateChanged` dispara múltiplas vezes com o mesmo usuário
- **App** (`src/main.tsx`): `ErrorBoundary` envolve toda a árvore de providers para captura global de erros
- **vite.config.ts`: adicionado `dedupe` para `mediabunny` e encoders, eliminando duplicatas no bundle

### Removido (código morto)

- **generations.ts**: `deleteGeneration`, `updateGenerationName` — funções sem referência no projeto
- **images.ts**: `sortImages`, `getImageGenerations`, `deleteImageGeneration`, `updateImageGenerationName` — funções sem referência no projeto
- **projects.ts**: `getProjectAudios`, `getProjectImages` — funções sem referência no projeto
- **firebase.ts**: `testFirebaseConnection` — função sem referência no projeto
- **audio.ts**: `base64ToUint8ArraySync` — função sem referência no projeto (versão async `base64ToUint8Array` é usada no lugar)

### Dependências

- **Remotion**: `4.0.448` → `4.0.450` (remotion, @remotion/media, @remotion/media-utils, @remotion/player, @remotion/transitions, @remotion/web-renderer)

---

## [0.8.2] - 2026-04-21

### Adicionado

- **NotFoundPage** (`src/pages/NotFoundPage.tsx`): página 404 com navegação para home
- **ErrorBoundary** (`src/components/ErrorBoundary.tsx`): error boundary global com tela de erro amigável e botão de retry
- **DataMigrationDialog** (`src/components/DataMigrationDialog.tsx`): diálogo de migração de dados entre armazenamentos (Firestore/IndexedDB) com progresso
- **NetworkStatusIndicator** (`src/components/NetworkStatusIndicator.tsx`): indicador visual de status de rede offline
- **useOnlineStatus** (`src/hooks/useOnlineStatus.ts`): hook reativo para detectar status online/offline do navegador
- **Migration module** (`src/lib/db/migration.ts`): módulo de migração de dados para Firestore — transfere dados do IndexedDB ao autenticar
- **Rate limiter** (`src/lib/rate-limiter.ts`): rate limiter para chamadas à API Gemini com controle de requisições por minuto
- **6 guias de documentação** (`docs/guides/`): documentação detalhada por domínio extraída do código-fonte — audio, image-generation, persistence, ui-design-system, video-render, environment

### Alterado

- **useAssistant** (`src/hooks/useAssistant.ts`): tratamento de erros amigável com mensagens contextualizadas (quota, auth, safety, timeout); nova função `buildSystemInstruction` para instruções do sistema; adicionado estado `isStreaming` para controle de UI durante streaming
- **AssistantMessages** (`src/features/assistant/components/AssistantMessages.tsx`): cursor de digitação animado (CSS blink) durante streaming; renderização melhorada de mensagens do modelo
- **Assistant** (`src/features/assistant/Assistant.tsx`): propagação de `isStreaming` para componentes filhos
- **AudioContext** (`src/contexts/AudioContext.tsx`): feedback de erros via Snackbar com MUI Alert e botão de fechar
- **useStudioState** (`src/features/studio/useStudioState.ts`): `safeSetItem` como wrapper seguro para `localStorage.setItem` com tratamento de erros
- **useVideoExporter** (`src/features/video-render/hooks/useVideoExporter.tsx`): suporte a VP8/WebM como fallback automático quando H.264/MP4 não está disponível no navegador; detecção de codecs suportados via `MediaSource.isTypeSupported()`
- **VideoExportPanel** (`src/features/video-render/components/VideoExportPanel.tsx`): aviso informativo quando formato WebM é selecionado como fallback
- **ActionBar** (`src/components/ActionBar.tsx`): melhorias de implementação

### Removido

- **Gemini-TTS.md**: documentação de referência externa não utilizada no projeto
- **Gerador-imagem.md**: documentação de referência externa não utilizada no projeto
- **scripts/generate-voice-previews.ts**: script de geração offline de previews de voz (substituído por arquivos estáticos em `public/voice-previews/`)
- **Script `generate-previews`** (`package.json`): removido dos scripts npm

---

## [0.8.0] - 2026-04-20

### Adicionado

- **WaveformOverlay** (`src/features/video-render/components/WaveformOverlay.tsx`): overlay de forma de onda do áudio no vídeo — usa `@remotion/media-utils` para extrair amplitude por frame (`getAudioData`) e renderiza barras normalizadas com gradiente vertical sobre as cenas
- **Animação palavra-a-palavra nas legendas** (`src/features/video-render/components/SubtitleOverlay.tsx`): sistema de karaoke com `AnimatedWord` — cada palavra recebe estado `active`/`past`/`future` com escala e opacidade distintas; `splitIntoWords` segmenta texto e `calculateWordTiming` distribui frames proporcionalmente ao tamanho de cada palavra
- **Análise visual de cenas no plano de edição** (`src/lib/gemini.ts`): `loadSceneImagesForAnalysis` carrega até `MAX_IMAGES_FOR_ANALYSIS` (8) imagens das cenas como base64, `selectRepresentativeScenes` escolhe cenas distribuídas uniformemente, e `buildVisualInstructions` monta instruções visuais com referências inline para o prompt de edição; tipos `SceneImagePayload` e helpers `fetchImageAsBase64`/`inferMimeTypeFromUrl`
- **Transições com spring** (`src/features/video-render/components/SceneSequence.tsx`): constantes `SPRING_TRANSICAO` e `SPRING_CAMERA` para animações naturais; funções `springFadeIn` e `springFadeOut` para transições de cena suaves
- **Dependências Remotion**: `@remotion/media-utils` (4.0.448) para extração de dados de áudio e `@remotion/transitions` (4.0.448) para transições entre cenas

### Alterado

- **SubtitleOverlay** (`src/features/video-render/components/SubtitleOverlay.tsx`): reescrita completa — substituído sistema de quebra de linha estática por animação karaoke palavra-a-palavra com timing proporcional; removidos `wrapSubtitleText`, `SubtitleLine`, `MAX_CHARS_PER_LINE`
- **SceneSequence** (`src/features/video-render/components/SceneSequence.tsx`): transições agora usam springs (`SPRING_TRANSICAO`) ao invés de easing linear; câmera usa `SPRING_CAMERA` para movimentos suaves; removida dependência de `remotion` e variável `fadeOutOpacity`
- **VideoComposition** (`src/features/video-render/components/VideoComposition.tsx`): integração do `WaveformOverlay` na composição do vídeo
- **useEditingPlan** (`src/features/video-render/hooks/useEditingPlan.ts`): plano de edição agora passa `imageUrl` das cenas para análise visual via Gemini
- **VideoPage** (`src/pages/VideoPage.tsx`): `mapScenesToVideoScenes` agora inclui `imageUrl` no mapeamento de cenas
- **Barrel export** (`src/features/video-render/index.ts`): adicionado export de `WaveformOverlay`
- **gemini.ts** (`src/lib/gemini.ts`): adicionado módulo de análise visual de cenas com loading de imagens em base64 e seleção de cenas representativas

---

## [0.7.0] - 2026-04-20

### Adicionado

- **TitleOverlay** (`src/features/video-render/components/TitleOverlay.tsx`): componente de overlay de título em vídeo com estilos `intro`, `credit` e `lower-third` — renderiza título e subtítulo com animação de fade via Remotion
- **Análise de áudio** (`src/features/video-render/lib/audioAnalysis.ts`): módulo de análise de áudio para o plano de edição — extrai pontos de análise (`AudioAnalysisPoint`) e resultado completo (`AudioAnalysisResult`) usados pelo hook `useEditingPlan` para gerar planos baseados em ritmo do áudio
- **Persistência de planos de edição** (`src/lib/db/editing-plans.ts`): CRUD de planos de edição no IndexedDB — `saveEditingPlan` e `loadEditingPlan` com tipo `StoredEditingPlan`; object store `editing_plans` adicionado ao IndexedDB (DB_VERSION bumped para 8)
- **Listas de constantes para IA** (`src/features/video-render/lib/editingPlan.ts`): `TRANSITION_TYPE_LIST`, `CAMERA_MOVEMENT_LIST`, `VISUAL_EFFECT_LIST` para uso em prompts de structured output; `TITLE_OVERLAY_STYLES` e `TitleOverlayStyle` para estilos de overlay; `DEFAULT_EFFECT_INTENSITY` (0.5) e `effectBlurPx()` para cálculo de blur proporcional
- **Parser de legendas com Markdown** (`src/features/video-render/components/SubtitleOverlay.tsx`): funções `wrapSubtitleText`, `parseBoldMarkdown` e componente `SubtitleLine` para renderizar legendas com quebra automática de linha e suporte a **negrito** em markdown
- **Undo history no plano de edição** (`src/features/video-render/hooks/useEditingPlan.ts`): histórico de undo com `MAX_UNDO_HISTORY = 20`, debounce de persistência (`PERSIST_DEBOUNCE_MS = 500ms`), geração em estágios com análise de áudio integrada
- **Overlap frames** (`src/features/video-render/components/VideoComposition.tsx`): função `getOverlapFrames` para calcular frames de sobreposição entre cenas no plano de edição

### Alterado

- **SubtitleOverlay** (`src/features/video-render/components/SubtitleOverlay.tsx`): reescrita completa — agora usa `wrapSubtitleText` e `parseBoldMarkdown` para renderização avançada de legendas com quebra de linha e formatação markdown
- **EditingPlanInspector** (`src/features/video-render/components/EditingPlanInspector.tsx`): adicionados botões de Play, Restart e Undo com ícones MUI; suporte a undo/reset do plano de edição
- **SceneSequence** (`src/features/video-render/components/SceneSequence.tsx`): importa `CAMERA_MOVEMENTS`, `DEFAULT_EFFECT_INTENSITY` e `effectBlurPx` de `editingPlan` — transições e efeitos agora usam intensidade configurável
- **VideoComposition** (`src/features/video-render/components/VideoComposition.tsx`): importa `TitleOverlay` e usa `getOverlapFrames` para composição com sobreposição de cenas e overlay de título
- **useEditingPlan** (`src/features/video-render/hooks/useEditingPlan.ts`): reescrito — adicionados undo history, debounce de persistência, análise de áudio via `analyzeAudioForEditing`, estágios de geração com progresso granular, e integração com `loadEditingPlan`/`saveEditingPlan`
- **VideoPage** (`src/pages/VideoPage.tsx`): integrado `originalPlan` e `resetToOriginal` do hook de edição para suporte a reset do plano
- **gemini.ts** (`src/lib/gemini.ts`): importa `AudioAnalysisResult` e reorganiza constantes de edição — `TRANSITION_TYPES`, `CAMERA_MOVEMENTS` e `VISUAL_EFFECTS` movidos para `editingPlan.ts`
- **videoUtils** (`src/features/video-render/lib/videoUtils.ts`): `mapScenesToVideoScenes` agora recebe `editingPlan` como 4º parâmetro opcional
- **Barrel export** (`src/features/video-render/index.ts`): adicionado `TitleOverlay`; removidos `TRANSITION_PRESETS`, `CAMERA_MOVEMENTS` (movidos para `editingPlan.ts`)

### Corrigido

- **VideoPreview** (`src/components/VideoPreview.tsx`): `mapScenesToVideoScenes` chamado com `editingPlan` como 4º argumento para consistência com a nova assinatura
- **useVideoExporter** (`src/features/video-render/hooks/useVideoExporter.tsx`): `mapScenesToVideoScenes` chamado com `editingPlan` para respeitar o plano de edição durante exportação

---

## [0.2.0] - 2026-04-18

### Adicionado

- **MUI v7 como stack visual principal**: migração completa de Tailwind CSS + lucide-react para MUI v7 + @mui/icons-material
- **Design System** (`src/theme/`): tema customizado (`appTheme.ts`), tokens visuais (`tokens.ts`), surfaces de vidro (`surfaces.ts`), provider e link behavior
- **Pages com lazy loading** (`src/pages/`): `AssistantPage`, `LibraryPage`, `StudioPage`, `VideoPage` com code splitting por rota
- **Feature Assistant** (`src/features/assistant/`): assistente conversacional completo com header, composer, messages, history panel, memories panel, settings panel e utilitários de UI
- **Feature Studio** (`src/features/studio/`): state management centralizado com `useStudioState`, tipos para cenas e ratio
- **Persistência modular** (`src/lib/db/`): camada dividida em domínios (`chats`, `generations`, `images`, `memories`, `projects`, `shared`, `user-settings`, `types`) substituindo `db.ts` monolítico
- **Variáveis de ambiente tipadas** (`src/lib/env.ts`): leitura centralizada via `import.meta.env` com tipos explícitos
- **Utilitário de download** (`src/lib/download.ts`): `downloadFile` e `triggerDownload` client-side
- **ESLint 10** (flat config): `eslint.config.js` com plugins react, mui-v7, react-19-upgrade, firebase-ai-logic e zod-v4
- **Firebase Hosting**: `firebase.json` configurado com SPA rewrite, cache headers e storage/firestore rules apontados
- **Font Inter via Google Fonts**: preconnect no `index.html`
- **Scripts**: `lint:fix` e `typecheck` (`tsc -b`) adicionados ao `package.json`
- **AGENTS.md**: documentação completa do projeto para agentes de IA

### Alterado

- **App shell** (`App.tsx`): reescrito com lazy loading por rota, MUI Container/Box/Stack e Suspense fallback
- **Header**: migrado de lucide-react para MUI icons com navegação por array tipado (`NavItem[]`)
- **ActionBar**: reescrito com MUI, glass surface, menu de download e integração com `useGlobalAudioActions`
- **Inspector**: reescrito com MUI, tabs de voz (A/B), opções de ritmo, framework visual, ratio de cena e densidade
- **ScriptEditor**: migrado para MUI com suporte a scenes e glass panel
- **ImageStudio**: reescrito com MUI, select de ratio, collapse de parâmetros avançados e glass surface
- **Library**: reescrita com MUI, dialog de edição, search e cards de projetos/imagens
- **VideoLibrary**: reescrito com MUI, cards, metadata pills e glass surface
- **VideoPreview**: reescrito com MUI e glass surface
- **ErrorToast/SuccessToast**: migrados de motion para MUI Snackbar + Alert
- **AudioContext**: split em `useGlobalAudioState` e `useGlobalAudioActions` para leitura otimizada
- **Firebase init** (`firebase.ts`): usa `env.ts` em vez de `firebase-applet-config.json`
- **Gemini** (`gemini.ts`): suporte a imagens de referência, usa `env.ts` para API key
- **Hooks**: todos refatorados para usar `env.ts` e tipos importados de `features/`
- **CSS global** (`index.css`): removido Tailwind, variáveis CSS agora referenciam MUI palette tokens
- **Storage rules**: adicionada regra `update` para imagens com validação de tamanho e contentType

### Removido

- **Tailwind CSS**: `@tailwindcss/vite`, `tailwindcss`, `autoprefixer` e `@theme` removidos
- **lucide-react**: substituído integralmente por `@mui/icons-material`
- **Express server** (`server.ts`): app agora é SPA estática, sem backend Node
- **firebase-applet-config.json**: config Firebase movida para variáveis de ambiente `VITE_*`
- **package-lock.json**: substituído por `bun.lock` (migrado de npm para bun)
- **db.ts monolítico**: `src/lib/db.ts` reduzido a re-export da fachada modular

### Corrigido

- Tipagem `BlobPart` explícita em `audio.ts` para compatibilidade com TS strict

---

## [0.3.0] - 2026-04-18

### Alterado

- **MUI v7 → v9**: migração completa de `@mui/material` e `@mui/icons-material` v7.3.10 para v9.0.0
- **Novas dependências MUI explícitas**: `@mui/styled-engine`, `@mui/system` e `@mui/utils` adicionados como dependências diretas
- **Theme refactoring** (`src/theme/appTheme.ts`): paleta reestruturada com novas cores para primary, secondary, success, warning, background, text e action; remoção de overrides legados (`containedPrimary`, `filledSuccess`, `filledError`, `palette`); adição de `variants` com component-level overrides para Button e `light` theme variant
- **Stack API migration** (MUI v9): props `alignItems` e `justifyContent` movidas de props diretas para `sx` prop em 14+ componentes — `ActionBar`, `Header`, `ImageStudio`, `Inspector`, `Library`, `ScriptEditor`, `VideoLibrary`, `VideoPreview`, `AssistantHeader`, `AssistantHistoryPanel`, `AssistantMemoriesPanel`, `AssistantMessages`, `AssistantSettingsPanel`, `App`
- **ESLint config**: remoção de `@eslint/compat` e `eslint-plugin-mui-v7` (incompatível com MUI v9)

---

## [0.3.1] - 2026-04-18

### Alterado

- **Voice previews** (`src/hooks/useVoicePreviews.ts`): refatorada de geração runtime (Gemini TTS + Firebase Storage) para uso de arquivos WAV pré-gerados em `public/voice-previews/` — elimina chamadas de API no preview de voz e reduz dependências do hook
- **Inspector** (`src/components/Inspector.tsx`): removidos `LinearProgress` e `Autorenew` não utilizados
- **Theme** (`src/theme/appTheme.ts`): `borderRadius` unificado para `24px` em todos os componentes (anterior: valores mistos de 999, 18 e 20)

### Adicionado

- **Script de geração de previews** (`scripts/generate-voice-previews.ts`): script Node.js para gerar arquivos WAV de preview de voz via Gemini TTS, disponível via `bun run generate-previews`
- **eslint-plugin-mui-v9**: plugin ESLint para MUI v9 adicionado ao flat config

### Corrigido

- Versão da documentação de agentes (AGENTS.md/CLAUDE.md/GEMINI.md) atualizada de `0.2.0` para `0.3.1`
- Seção UI & Design System corrigida de "MUI v7" para "MUI v9"

---

## [0.3.2] - 2026-04-18

### Alterado

- **Design tokens** (`src/theme/tokens.ts`): adicionados 12 tokens semânticos — `ICON_SIZE_SM` (14), `ICON_SIZE_MD` (16), `ICON_SIZE_LG` (18), `AVATAR_SIZE_SM` (32), `AVATAR_SIZE_MD` (36), `RADIUS_XS` (2), `RADIUS_SM` (3), `RADIUS_CHIP` (10), `GAP_COMPACT` (0.75), `GAP_DEFAULT` (1), `GAP_MEDIUM` (1.25), `GAP_RELAXED` (1.75)
- **Adoção de tokens em 17 componentes**: substituição de valores hardcodeados por tokens semânticos em `ActionBar`, `ErrorToast`, `Header`, `ImageStudio`, `Inspector`, `Library`, `ScriptEditor`, `SuccessToast`, `VideoLibrary`, `VideoPreview`, `AssistantComposer`, `AssistantHeader`, `AssistantHistoryPanel`, `AssistantMemoriesPanel`, `AssistantMessages`, `AssistantSettingsPanel`, `assistantUi`
- **CHUNK_LIMIT** (`src/lib/constants.ts`): valor ajustado

### Removido

- **Imports não utilizados**: `Stack`, `Typography` (`Assistant.tsx`), `Alert`, `Typography` (`AssistantComposer.tsx`), `Alert`, `Image`, `QUICK_PROMPTS` (`AssistantMessages.tsx`), `useMediaQuery` (`Inspector.tsx`)

---

## [0.3.3] - 2026-04-18

### Alterado

- **Design tokens** (`src/theme/tokens.ts`): adicionados 4 tokens semânticos — `EMPTY_ICON_SIZE` (36), `EMPTY_WRAPPER_MAX_WIDTH` (340), `EMPTY_WRAPPER_PADDING_XS` (3), `EMPTY_WRAPPER_PADDING_MD` (4); ajustados `APP_HEADER_HEIGHT`, `RADIUS_CHIP`, `GAP_MEDIUM` e `GAP_RELAXED`
- **Theme borderRadius** (`src/theme/appTheme.ts`): `borderRadius` unificado para `14` em todos os componentes (antes: 24, 32, 10 e 8)
- **Surfaces** (`src/theme/surfaces.ts`): `borderRadius` atualizado para acompanhar novo padrão unificado

### Adicionado

- **Firestore collection group rules** (`firestore.rules`): regras de leitura/criação/deleção para `/{path=**}/audios/{audioId}` e `/{path=**}/images/{imageId}`, habilitando queries em subcoleções via `getProjectsDetailsMap`
- **Firestore indexes** (`firestore.indexes.json`): índices compostos para collection groups `audios` e `images` filtrados por `userId`

### Removido

- **`isValidScene`** (`firestore.rules`): função de validação de cena removida das rules (não utilizada)

---

## [0.4.0] - 2026-04-19

### Adicionado

- **Speed Paint** (`src/features/speed-paint/`): nova feature de animação de pintura com canvas Konva, geração de strokes a partir de imagens, player de animação com controles de play/pause/replay, e captura de snapshots e gravação de vídeo
  - **Page** (`src/pages/SpeedPaintPage.tsx`): rota lazy-loaded com upload de imagens, player de animação e painel de staging em batch
  - **Canvas** (`components/canvas/`): `AnimationPlayer`, `AnimationControls` e `StrokeRenderer` com react-konva para renderização de strokes progressivos
  - **Batch** (`components/batch/`): `BatchOrchestrator` e `QueueStaging` para processamento em lote de imagens com seletor de velocidade
  - **Upload** (`components/upload/`): `ImageUpload` com react-dropzone para arrastar/soltar imagens
  - **Store** (`store/animationStore.ts`): estado global via zustand com tipagem `AnimationState`
  - **Tipos** (`types.ts`): `Stroke` e `StrokeAnimation` para o modelo de dados de animação
  - **Image processing** (`lib/imageProcessing.ts`): `generateStrokesFromImage` para conversão de imagem em sequência de strokes
  - **Stage ref** (`lib/stageRef.ts`): ref compartilhado do stage Konva para captura de snapshot/vídeo
- **Novas dependências**: `konva` ^10.2.5, `react-konva` ^19.2.3, `react-dropzone` ^15.0.0, `zustand` ^5.0.12
- **Navegação**: ícone Palette adicionado ao Header para acesso à Speed Paint

### Alterado

- **App shell** (`src/App.tsx`): nova rota lazy para `SpeedPaintPage`
- **tsconfig.json**: diretório `Speed-Paint/` adicionado ao `exclude`

---

## [0.4.1] - 2026-04-19

### Alterado

- **Firestore indexes** (`firestore.indexes.json`): formato de índices migrado de array `indexes`/`fields` para `fieldOverrides` com `indexes` aninhados por `collectionGroup` (audios, images), seguindo formato atualizado do Firebase

### Corrigido

- **StrokeRenderer** (`src/features/speed-paint/components/canvas/StrokeRenderer.tsx`): valores numéricos em `mt`/`ml` convertidos para strings com unidade `px` para compatibilidade com MUI

---

## [0.6.0] - 2026-04-20

### Adicionado

- **Video Render com Remotion** (`src/features/video-render/`): nova feature completa de renderização de vídeo programático, integrando o Remotion (React video framework) ao fluxo de produção do Script Master
  - **VideoComposition** (`components/VideoComposition.tsx`): composição raiz do Remotion que orquestra cenas, legendas e áudio em uma timeline de vídeo
  - **SceneSequence** (`components/SceneSequence.tsx`): renderização de sequência de cenas com transições (fade, dissolve, slide) usando `<Series>` do Remotion
  - **SubtitleOverlay** (`components/SubtitleOverlay.tsx`): overlay de legendas com animação de fade in/out sincronizada com o tempo da cena
  - **EditingPlanInspector** (`components/EditingPlanInspector.tsx`): painel de inspeção do plano de edição gerado pela IA — permite visualizar e ajustar transições, câmera, efeitos e legendas por cena
  - **VideoExportPanel** (`components/VideoExportPanel.tsx`): painel de exportação com progresso em tempo real, suporte a MP4/WebM, seleção de resolução e download automático
  - **useEditingPlan** (`hooks/useEditingPlan.ts`): hook que gera o plano de edição automático via Gemini com structured output (transições, movimentos de câmera, efeitos visuais e legendas)
  - **useVideoExporter** (`hooks/useVideoExporter.tsx`): hook de exportação client-side via `@remotion/web-renderer` (WebCodecs), com upload automático para Firebase Storage e persistência no Firestore
  - **editingPlan** (`lib/editingPlan.ts`): tipos e constantes para o plano de edição — `TransitionType`, `CameraMovement`, `VisualEffect`, `EditingScene`, presets de transição
  - **videoUtils** (`lib/videoUtils.ts`): utilitários de conversão frames↔ms↔s e resolução por ratio (`msToFrames`, `framesToMs`, `framesToSeconds`, `getResolutionFromRatio`)
  - **videoRenderBridge** (`store/videoRenderBridge.ts`): store zustand que conecta o estado do vídeo entre `VideoPage`, `VideoPreview` e os painéis de edição/exportação
  - **types** (`types.ts`): tipos `VideoScene` e `VideoCompositionProps` para a composição de vídeo
  - **index** (`index.ts`): barrel export com `TRANSITION_PRESETS` para uso nos componentes
- **Persistência de vídeos** (`src/lib/db/videos.ts`): CRUD completo para vídeos de projeto — `getProjectVideos`, `saveVideoToProject`, `deleteVideoFromProject` — com suporte dual (Firestore + IndexedDB)
- **Tipo ProjectVideo** (`src/lib/db/types.ts`): interface tipada para documentos de vídeo com campos de formato, resolução, FPS, duração e tamanho
- **Geração de plano de edição** (`src/lib/gemini.ts`): função `generateEditingPlan()` que usa Gemini com structured output para gerar automaticamente transições, movimentos de câmera, efeitos visuais e legendas por cena
- **Firestore rules para vídeos** (`firestore.rules`): regras de CRUD para `projects/{projectId}/videos/{videoId}` e collection group `/{path=**}/videos/{videoId}` com validação de ownership e campos obrigatórios
- **Storage rules para vídeos** (`storage.rules`): regra específica para upload de vídeos até 200 MB (MP4/WebM) com validação de contentType
- **IndexedDB v7** (`src/lib/db/shared.ts`): bumped `DB_VERSION` de 6 para 7 com novo object store `videos`
- **Novas dependências**: `remotion` 4.0.448, `@remotion/player` 4.0.448, `@remotion/web-renderer` 4.0.448

### Alterado

- **VideoPreview** (`src/components/VideoPreview.tsx`): refatorado para usar `<Player>` do Remotion em vez de `motion/react` — agora renderiza a composição real com cenas, legendas e transições; adicionado `VideoPlayerErrorBoundary` para captura de erros no player
- **VideoPage** (`src/pages/VideoPage.tsx`): integrado com `useEditingPlan`, `useVideoExporter`, `EditingPlanInspector`, `VideoExportPanel` e `videoRenderBridge` — fluxo completo de visualização, edição e exportação de vídeo
- **ActionBar** (`src/components/ActionBar.tsx`): adicionado botão de geração de vídeo com ícone `VideoFile` e loading spinner animado; integração com `useVideoRenderBridge` e `VideoPreviewHandle`
- **App shell** (`src/App.tsx`): integrado `useVideoRenderBridge` para estado global de vídeo
- **gemini.ts** (`src/lib/gemini.ts`): adicionados arrays `TRANSITION_TYPES`, `CAMERA_MOVEMENTS`, `VISUAL_EFFECTS` e função `generateEditingPlan()` com structured output via Gemini
- **Studio types** (`src/features/studio/types.ts`): adicionado campo opcional `prompt` ao tipo de cena para suporte ao plano de edição
- **useStudioState** (`src/features/studio/useStudioState.ts`): adicionado `VIDEO_FPS = 30` para uso na renderização
- **useAudioGenerator** (`src/hooks/useAudioGenerator.ts`): importado `calculateDurationFromWav` de videoUtils para cálculo de duração
- **Persistência** (`src/lib/db/projects.ts`): integrada deleção de vídeos ao deletar projeto (`deleteVideoFromProject` + `getProjectVideos`)
- **DB facade** (`src/lib/db/index.ts`): adicionado re-export de `./videos`
- **IndexedDB** (`src/lib/db/shared.ts`): `DB_VERSION` bumped para 7; adicionado `VIDEOS_STORE`

### Removido

- **docs/audits/1.md**: relatório de auditoria v0.4.1 removido (desatualizado)
- **docs/plan/integracao-remotion-video.md**: plano de integração do Remotion removido (implementado nesta versão)

---

## [0.5.0] - 2026-04-19

### Adicionado

- **SpeedSelector** (`src/features/speed-paint/components/SpeedSelector.tsx`): componente reutilizável de seleção de velocidade extraído de `AnimationControls` e `QueueStaging`, com suporte a variantes `inline` e `compact`
- **resolveActiveScene** (`src/lib/scene.ts`): utilitário para resolver a cena ativa com base no tempo atual do áudio, utilizado por `ScriptEditor` e `VideoPreview`
- **base64ToBlobSync** (`src/lib/audio.ts`): conversão síncrona de base64 para `Blob`, reutilizável por `useImageGenerator`
- **InspectorController / ScriptEditorController** (`src/features/studio/types.ts`): interfaces de controle para comunicação entre StudioPage e seus subcomponentes
- **testFirebaseConnection** (`src/lib/firebase.ts`): função de teste de conectividade Firebase (renomeada de `testConnection`)
- **Audit report** (`docs/audits/1.md`): primeiro relatório de auditoria técnica do projeto — 4 warnings, 19 sugestões, 0 críticos
- **Plano Remotion** (`docs/plan/integracao-remotion-video.md`): plano de integração do Remotion para vídeo programático em 3 fases
- **Loader global** (`src/App.tsx`): `LinearProgress` + bloqueio de rota durante carregamento do estado de autenticação

### Alterado

- **useAudioGenerator** (`src/hooks/useAudioGenerator.ts`): refatorado com `splitTextProgrammatically` (split lógico por parágrafos) e `toUserFriendlyError` (mensagens de erro amigáveis em pt-BR)
- **useImageGenerator** (`src/hooks/useImageGenerator.ts`): adicionado `toUserFriendlyImageError` para erros amigáveis em pt-BR na geração de imagens
- **AuthContext** (`src/contexts/AuthContext.tsx`): adicionado `getAuthErrorMessage` com mapeamento de erros Firebase para mensagens amigáveis em pt-BR
- **AnimationControls** (`src/features/speed-paint/components/canvas/AnimationControls.tsx`): `SpeedSelectorInline` removido em favor do `SpeedSelector` reutilizável; `alert()` substituído por feedback via UI
- **QueueStaging** (`src/features/speed-paint/components/batch/QueueStaging.tsx`): `SpeedSelector` extraído para componente dedicado
- **BatchOrchestrator** (`src/features/speed-paint/components/batch/BatchOrchestrator.tsx`): painel de erro visual com tokens de design (`glassPanelSx`, `ERROR_MAIN`)
- **StrokeRenderer** (`src/features/speed-paint/components/canvas/StrokeRenderer.tsx`): descrição acessível (`aria-label`) gerada dinamicamente com contagem de traços e progresso
- **Library** (`src/components/Library.tsx`): melhorias de implementação
- **VideoLibrary** (`src/components/VideoLibrary.tsx`): importação de `Alert` e `Button` via MUI, lógica de settings refatorada
- **StudioPage** (`src/pages/StudioPage.tsx`): simplificado com uso de controllers (`InspectorController`, `ScriptEditorController`)
- **ActionBar** (`src/components/ActionBar.tsx`): aria-labels adicionados aos indicadores de progresso de geração de áudio e cenas visuais
- **ImageStudio** (`src/components/ImageStudio.tsx`): importação de `downloadFile` centralizada
- **SuccessToast** (`src/components/SuccessToast.tsx`): posição redefinida para `top center` (antes: `bottom right`)
- **VideoPreview** (`src/components/VideoPreview.tsx`): `resolveActiveScene` importado de `scene.ts` em vez de lógica inline
- **ScriptEditor** (`src/components/ScriptEditor.tsx`): `resolveActiveScene` importado de `scene.ts` em vez de lógica inline
- **Assistant** (`src/features/assistant/Assistant.tsx`): `ErrorToast` importado para feedback de erros
- **AnimationPlayer** (`src/features/speed-paint/components/canvas/AnimationPlayer.tsx`): correção de acentuação ("Animacao" → "Animação")

### Removido

- **`isApplying`** (`src/lib/db/types.ts`): propriedade não utilizada removida do tipo de projeto

---

## [0.6.3] - 2026-04-20

### Corrigido

- **SceneSequence** (`src/features/video-render/components/SceneSequence.tsx`): fórmula de `safeTransitionFrames` corrigida — agora garante que o `inputRange` de interpolação `[0, t, dur-t, dur]` seja estritamente crescente (antes `Math.floor(duration/2)` podia gerar valores iguais causando falha no Remotion)
- **useVideoExporter** (`src/features/video-render/hooks/useVideoExporter.tsx`): refatoração das mensagens de erro — strings inline de fallback removidas, lógica simplificada

### Adicionado

- **@remotion/media** (`@remotion/media ^4.0.448`): nova dependência Remotion para componente `<Audio>` — importado em `VideoComposition.tsx`
- **Favicon** (`public/favicon.png` + `index.html`): ícone PNG adicionado ao projeto com `<link rel="icon">`

### Alterado

- **VideoComposition** (`src/features/video-render/components/VideoComposition.tsx`): `Audio` agora importado de `@remotion/media` em vez de `remotion`
- **VideoPreview** (`src/components/VideoPreview.tsx`): adicionado `acknowledgeRemotionLicense` para conformidade com licença Remotion
- **useAudioGenerator** (`src/hooks/useAudioGenerator.ts`): limpeza de lógica interna — remoção de `audioBlobData` e cálculo de duração via `calculateDurationFromWav` inline
- **cors.json**: configuração CORS para Firebase Storage com origens do projeto (localhost + hosting)

---

## [0.6.2] - 2026-04-20

### Corrigido

- **Inspector** (`src/components/Inspector.tsx`): adicionados `id` e `name` nos switches de podcast/geração de cenas para acessibilidade de formulários; helperText condicional exibido quando perfil de áudio não está definido
- **SpeedSelector** (`src/features/speed-paint/components/SpeedSelector.tsx`): aria-label agora inclui o valor atual da velocidade (ex: "Velocidade de lenta, 0.5x selecionada")
- **ImageUpload** (`src/features/speed-paint/components/upload/ImageUpload.tsx`): texto do dropzone corrigido de "botão abaixo" para "botão acima" (reflete ordem real dos elementos)
- **AssistantComposer** (`src/features/assistant/components/AssistantComposer.tsx`): adicionados `id="assistant-chat-input"` e `name="chat-message"` no input para compatibilidade com autofill
- **AssistantHeader** (`src/features/assistant/components/AssistantHeader.tsx`): adicionado `flexShrink: 0` no Chip "Gemini" para evitar compressão em telas estreitas
- **Library** (`src/components/Library.tsx`): remoção de imports não utilizados (`getProjectAudios`, `getProjectImages`) e chamada `Promise.all` correspondente
- **index.html**: atributo `lang` corrigido de `en` para `pt-BR`; título atualizado para "Script Master"; adicionada meta description

### Alterado

- **Backlog cosmético** (`docs/qa-loop/backlog-cosmetico.md`): reorganizado — itens implementados marcados com check e separados do backlog restante (features não cosmético)

---

## [0.6.1] - 2026-04-20

### Corrigido

- **Typography headings** (`ImageStudio`, `Library`, `AssistantHeader`): variant `h6` elevado para `h5` em títulos de seção e estados vazios para melhor hierarquia visual
- **AudioContext** (`src/contexts/AudioContext.tsx`): adicionado `setDurationOverride` para override da duração calculada a partir do blob WAV, evitando dependência de `loadedmetadata` que pode falhar com áudios gerados client-side
- **useStudioState** (`src/features/studio/useStudioState.ts`): sincronização da duração calculada do blob WAV com o AudioContext para exibir duração real no player
- **AnimationPlayer** (`src/features/speed-paint/components/canvas/AnimationPlayer.tsx`): adicionado anúncio `aria-live="polite"` para screen readers acompanhar progresso da animação
- **ImageUpload** (`src/features/speed-paint/components/upload/ImageUpload.tsx`): import de `Button` adicionado para uso correto no dropzone
- **Header** (`src/components/Header.tsx`): ajustes menores de implementação em estilos
- **ScriptEditor** (`src/components/ScriptEditor.tsx`): ajustes de implementação

### Adicionado

- **Backlog cosmético** (`docs/qa-loop/backlog-cosmetico.md`): lista de 15 itens cosméticos identificados no QA Loop para futura melhoria

---

## [0.1.0] - 2025-xx-xx

### Adicionado

- Versão inicial do projeto Script Master (migrado do Google AI Studio)
- SPA React + Vite para transformar roteiros em áudio com Gemini TTS
- Geração de imagens com Gemini
- Assistente conversacional básico
- Firebase Auth + Firestore + Storage + IndexedDB
