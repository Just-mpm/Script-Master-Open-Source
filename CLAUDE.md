# AGENTS.md — Script Master

## Visão Geral

SPA em React + Vite para transformar roteiros em áudio com Gemini TTS, geração opcional de imagens/cenas, renderização de vídeo com Remotion, biblioteca de projetos, assistente conversacional e internacionalização (3 idiomas).

Firebase Hosting (frontend) + Firebase Cloud Functions v2 (backend serverless quando necessário).

**Domínio oficial de produção:** `https://script-master.pro`

## Comandos

```bash
bun run dev              # Vite em http://localhost:3000
bun run build            # lint + typecheck + build de produção
bun run lint             # ESLint 10 (flat config)
bun run lint:fix         # ESLint com autocorreção
bun run typecheck        # tsc -b
bun run test             # Vitest (execução única)
bun run test:watch       # Vitest (watch mode)
bun run preview          # serve build localmente
bun run clean            # remove dist/
bun run deploy           # lint + typecheck + build + firebase deploy (produção)
bun run deploy:preview   # lint + typecheck + build + firebase hosting:channel:deploy preview
```

**Sem formatter e sem CI/CD.**

## Stack

- **React 19** + **Vite 8** + **react-router-dom v7** (lazy loading por rota)
- **MUI v9** — tema em `src/theme/*`, sem Tailwind
- **@google/genai** (cliente direto) — TTS, imagens, prompts de cena
- **Firebase** — Auth + Firestore + Storage + IndexedDB (dual storage) | `firebase-tools` ^15.3.0 (deploy)
- **Firebase Cloud Functions v2** — backend serverless (Stripe webhooks, checkout, portal) em `functions/`
- **Stripe** — `@stripe/stripe-js` ^9.3 (client-side) + `stripe` ^22.1 (server-side nas Functions)
- **Remotion 4.0.448** — renderização de vídeo client-side (WebCodecs, Whisper WASM para legendas)
- **Zustand** (estado) | **@dnd-kit/react** (drag-and-drop) | **react-dropzone** (upload)
- **React 19 native** — SEO per-page via `<title>`, `<meta>`, `<link>` com hoisting automático; componente `DocumentHead` em `src/components/DocumentHead.tsx`
- **Vitest 4** + **@testing-library/react** — testes unitários e de componentes (jsdom + fake-indexeddb)
- **vite-plugin-pwa** — service worker + manifest para instalação como app

## Modelos Gemini

| Modelo | Uso |
|--------|-----|
| `gemini-3.1-flash-tts-preview` | Text-to-speech |
| `gemini-3.1-flash-image-preview` | Geração de imagens |
| `gemini-3.1-flash-lite-preview` | Chunking de roteiros, prompts de cena, chat do assistente |

## Convenções

- **Idioma:** pt-BR (default), en e es na UI via i18n; comentários em pt-BR; inglês nos prompts de imagem
- **Alias:** `@/` aponta para a raiz do projeto
- **Backend:** Firebase Cloud Functions v2 quando necessário; rotas `/api/*` via Cloud Functions callable/HTTP
- **Rotas:** lazy loading por rota, páginas em `src/pages/`
- **HMR:** não altere a checagem `DISABLE_HMR` em `vite.config.ts`

## Anti-patterns

- Não crie rotas `/api/*` no frontend — use Firebase Cloud Functions v2 (callable ou HTTP) quando precisar de backend
- Não use Tailwind ou CSS modules — MUI v9 é a stack única de UI
- Não altere `DISABLE_HMR` em `vite.config.ts` — usado por AI Studio
- Não remova COEP sem motivo — necessário para SharedArrayBuffer (Whisper + Remotion)
- Não use `process.env` — leia env vars via `import.meta.env` ou `src/lib/env.ts`
- Não use `console.log/warn/error` — importe `createLogger` ou `logger` de `src/lib/logger.ts` (uso: `import { createLogger } from '../../../lib/logger'` — sempre import relativo, nunca `@/`)

## Rotas

| Rota | Componente | Protegida |
|------|-----------|-----------|
| `/` | LandingPage | Convidado |
| `/funcionalidades` | FuncionalidadesPage | Não |
| `/precos` | PricingPage | Não |
| `/perguntas-frequentes` | FaqPage | Não |
| `/contato` | ContactPage | Não |
| `/sobre` | AboutPage | Não |
| `/termos` | TermsPage | Não |
| `/privacidade` | PrivacyPage | Não |
| `/cookies` | CookiesPage | Não |
| `/status` | StatusPage | Não |
| `/login` | LoginPage | Convidado |
| `/cadastro` | RegisterPage | Convidado |
| `/onboarding` | OnboardingPage | Não |
| `/app/estudio` | StudioPage | Sim |
| `/app/video` | VideoPage | Sim |
| `/app/imagens` | ImageStudio | Sim |
| `/app/pintura-rapida` | SpeedPaintPage | Sim |
| `/app/assistente` | AssistantPage | Sim |
| `/app/biblioteca` | LibraryPage | Sim |
| `/app/configuracoes` | ConfiguracoesPage | Sim |
| `/app` | Redirect → `/app/estudio` | — |

**"Convidado"** = `GuestRoute` wrapper — visitantes veem a página, logados são redirecionados para `/app/estudio`

**Redirects de compatibilidade:** `/features` → `/funcionalidades`, `/pricing` → `/precos`, `/faq` → `/perguntas-frequentes`, `/contact` → `/contato`, `/register` → `/cadastro`, `/app/image` → `/app/imagens`, `/app/assistant` → `/app/assistente`, `/app/library` → `/app/biblioteca`, `/app/speed-paint` → `/app/pintura-rapida`

---

## Domínios

### App Shell & Router

| | |
|---|---|
| **Arquivos** | `src/App.tsx`, `src/router/routes.tsx`, `src/router/Redirects.tsx`, `src/components/app/AudioGenerationHandler.tsx`, `src/components/toast/ToastProvider.tsx`, `src/components/GuestRoute.tsx` |
| **App.tsx** | Shell enxuto (~160 linhas) — instancia providers (Router, Auth, I18n, AudioContext), renderiza `AppRoutes` + `VideoPreview` + `ToastProvider`. `isOnboardingRoute` controla ocultação do Header na página de onboarding. Não contém lógica de negócio |
| **Router** | `src/router/routes.tsx` — lazy loading por rota, `Suspense` com fallback, `ProtectedRoute` wrapper para rotas autenticadas, `GuestRoute` wrapper para rotas de convidado (`/`, `/login`, `/cadastro`) |
| **GuestRoute** | `src/components/GuestRoute.tsx` — inverso do `ProtectedRoute`: exibe spinner durante `loading`, redireciona para `/app/estudio` se `user` existe, renderiza `<Outlet />` para visitantes |
| **Redirects** | `src/router/Redirects.tsx` — 10 redirects 301 de compatibilidade |
| **AudioGenerationHandler** | Componente extraído de App.tsx — encapsula `useAudioGenerator` + lógica de geração |
| **ToastProvider** | Componente extraído de App.tsx — gerencia ErrorToast/SuccessToast/WarningToast |

### Páginas Públicas

| | |
|---|---|
| **Arquivos** | `src/pages/public/`, `src/components/public/`, `src/data/`, `src/components/DocumentHead.tsx`, `src/lib/seo.ts` |
| **LandingPage** | `/` — hero com CTA, social proof bar, 6 feature cards, 3 feature showcases, seção "como funciona" (3 steps), CTA final |
| **FuncionalidadesPage** | `/funcionalidades` — 6 seções categorizadas (Áudio, Vídeo, Imagem, Assistente, Biblioteca, Speed Paint) com deep dives |
| **PricingPage** | `/precos` — cards de plano (mensal/anual), tabela de comparação semântica (`<table>` nativa), FAQ de preços, CTA |
| **FaqPage** | `/perguntas-frequentes` — FAQ por categorias via tabs, accordion expansível com `id`/`aria-controls` (WCAG 4.1.2) |
| **ContactPage** | `/contato` — formulário de contato, links sociais, informações de suporte |
| **AboutPage** | `/sobre` — missão, valores, diferenciais do produto |
| **TermsPage** | `/termos` — termos de uso |
| **PrivacyPage** | `/privacidade` — política de privacidade |
| **CookiesPage** | `/cookies` — política de cookies |
| **StatusPage** | `/status` — status dos serviços |
| **Componentes** | 17 componentes em `src/components/public/`: PublicHeader (AppBar responsivo com drawer mobile, link "Contato"), PublicFooter (3 grupos: Produto, Empresa, Legal), PageLayout (shell, sem `component="main"` — landmark em App.tsx), HeroSection, FeatureCard, FeatureShowcase, CTASection (glow laranja), StepCard (glassPanelSx), SocialProofBar, PricingCard (card de plano), FAQAccordion (accordion com a11y), UseCasesSection, MetricsSection, ProductDemoSection, TestimonialsSection, TestimonialCard, barrel `index.ts` |
| **Assets** | 8 imagens em `public/images/public/` (hero, features, CTA) geradas via Gemini. Logos centralizados em `src/assets/logos.ts` — 7 variantes (`mark.transparent/round/square`, `full.transparent/round/square/roundedSquare`) + favicon, com `LOGO_VERSION` para invalidação de cache |
| **SEO** | React 19 nativo (`<title>`, `<meta>`, `<link>` com hoisting automático). `getPageSeo()` em `src/lib/seo.ts` retorna `SeoData` (tipos próprios). `DocumentHead` em `src/components/DocumentHead.tsx` renderiza tags no `<head>`. Meta tags OG, Twitter Cards, canonical URL, `article:published_time` por página; OG locale map (`og:locale`) por idioma; `robots.txt` bloqueia `/app/`, `/login`, `/cadastro`, `/onboarding`; `sitemap.xml` com 9 URLs públicas priorizadas; NotFoundPage com `noindex, nofollow` |
| **Domínio prod** | URLs públicas absolutas, canonical, Open Graph, `robots.txt`, `sitemap.xml` e fallbacks de checkout/portal devem priorizar `https://script-master.pro`. Subdomínios `*.web.app` e `*.firebaseapp.com` podem continuar ativos como secundários |
| **Páginas autenticadas** | Prefixo `/app/` em todas as rotas protegidas (`/app/estudio`, `/app/video`, etc.) |

### Áudio & TTS
| **Chunking** | Se >500 chars, `gemini-lite` divide via JSON output. Fallback: `splitTextProgrammatically` por sentenças |
| **Continuidade** | A partir do chunk 2, injeta "TAKES CONTÍNUOS" no prompt para manter tom/energia consistentes |
| **Multi-speaker** | Quando ativo, `speechConfig` usa `multiSpeakerVoiceConfig` com 2 locutores (Speaker A + B) |
| **Retry** | `withRetry`: 3 tentativas, 1500ms base, 500ms jitter. 429/503/504 retryam; 400/403/404 falham imediato |
| **WAV** | 24kHz mono 16-bit PCM, header 44 bytes. PCM extraído se Gemini retornar com header embutido |
| **Limites** | `MAX_CHARS=50000` (roteiro), `CHUNK_LIMIT=500` (por chamada TTS) |
| **Segmentos** | `AudioSegment` persiste chunk→timestamp no IndexedDB (fire-and-forget). Duração: `pcm.length / 48000` |
| **Cancelamento** | `cancelRef` checado antes de cada chunk; estado anterior restaurado via `lastSuccessfulStateRef`. State values espelhados via refs para evitar stale closure |
| **Detecção de silêncio** | `detectSceneBoundaries()` via RMS no áudio real. Calibra threshold em até 3 iterações |
| **Voice previews** | Arquivos WAV estáticos em `/voice-previews/{voiceId}.wav`. Hook: `useVoicePreviews` |
| **AudioContext selectors** | `useAudioIsPlaying()`, `useAudioCurrentTime()`, `useAudioDuration()`, `useAudioProgress()`, `useAudioActiveId()` — hooks seletivos para re-render otimizado |
| **Emoções** | `emotion` e `emotionIntensity` (0-1) nas options de geração; persistidos nos tipos de db (`db/types.ts`) |

### Geração de Imagens

| | |
|---|---|
| **Arquivos** | `src/hooks/useImageGenerator.ts`, `src/lib/gemini.ts`, `src/components/ImageStudio.tsx`, `src/features/studio/components/StockMediaPicker.tsx`, `src/lib/stockMedia.ts` |
| **Pipeline** | prompt (opcional + referência) → Gemini via `withRetry` → extrai `inlineData` → base64ToBlob → blob URL |
| **Cancelamento** | `cancelRef` checado antes de cada retry; cancelamento silencioso (sem erro para o usuário) |
| **Retry** | `withRetry`: 3 tentativas, 1000ms base, 500ms jitter (mesmo do TTS) |
| **Aspect ratios** | Estúdio de Imagem aceita 8 ratios (via string). Pipeline de cenas aceita 5. Estúdio de Vídeo restringe a 3 (`SceneRatio`) |
| **Referência** | Estúdio: `File` via FileReader. Pipeline: `string` (data URL ou base64) via `parseReferenceImage` |
| **Prompts de cena** | `generateScenePrompts()` usa `gemini-lite` para gerar descrições textuais (JSON), não imagens. Fallback genérico se API falhar. Recebe `locale` e injeta instrução crítica de idioma no prompt via `LOCALE_LANGUAGE_MAP` (ex: "português brasileiro", "inglês", "espanhol") |
| **Frameworks visuais** | `general` (cinema/fotografia) ou `whiteboard` (ilustrações + texto integrado) |
| **Stock Media** | `StockMediaPicker` com busca via Pexels API (`src/lib/pexelsApi.ts`) quando `VITE_PEXELS_API_KEY` disponível; fallback para array fixo de placeholder. Rate limit: 200 req/hora (plano free Pexels). Retry automático via `withRetry` |

### Vídeo (Remotion)

| | |
|---|---|
| **Arquivos** | `src/features/video-render/` (inclui `src/features/video-render/lib/speedPaintTimings.ts` — timings centralizados do Speed Paint) |
| **Renderização** | Client-side via WebCodecs. Sem backend |
| **Codec fallback** | 1) H.264+AAC+MP4 → 2) H.264 sem áudio → 3) VP8+Opus+WebM (exibe aviso ao usuário) |
| **Crossfade** | Overlap dinâmico por cena: speed paint usa 1s (`getSpeedPaintOverlapFrames`), cenas estáticas usam 400ms. Fade = 12 frames para cenas estáticas, spring `{damping:26, stiffness:100, mass:1}` |
| **Legendas** | Pipeline 3 fontes (prioridade): `segment-timing` > `whisper-aligned` > `proportional` |
| **Estilo de legendas** | `SubtitleStyle` + `DEFAULT_SUBTITLE_STYLE`. `SubtitleInlineEditor` editor inline via portal. Subcomponentes em `subtitle-editor/` (EditorToolbar, FontSizeControls, PositionToggle, StyleSlider, ToolbarActions, SubtitlePreview, DragOverlay, EditorButton) |
| **Export quality** | `VideoExportQuality` type (`720p` | `1080p` | `1440p` | `4k`) com `getResolutionFromQuality()` e `DEFAULT_EXPORT_QUALITY`. `estimateFileSize()` calcula tamanho por duração, resolução e codec |
| **Timing centralizado** | `src/features/video-render/lib/speedPaintTimings.ts` — módulo que consolida constantes de temporização do Speed Paint: tipos `SpeedPaintTimingMode` (`'default'` \| `'duration-based'` \| `'sequenced-batch'`), `SpeedPaintSequenceTiming` (`overlapFrames`, `sceneStepFrames`, `totalDurationInFrames`); constantes `DEFAULT_SPEED_PAINT_HOLD_SECONDS` (3s), `DEFAULT_SPEED_PAINT_FADE_SECONDS` (1s), `DURATION_BASED_SKETCH_RATIO` (0.8); funções `getSpeedPaintTimingConfig()`, `getSpeedPaintOverlapFrames()`, `getSpeedPaintSequenceTiming()`. Consumido por `SpeedPaintScene`, `VideoComposition`, `useSpeedPaintExporter`, `SpeedPaintPage`, `SpeedPaintComposition` e `SpeedPaintPlayer` |
| **Speed Paint** | `SpeedPaintScene` (canvas nativo Remotion) com sistema de 4 zonas: fade in (1s) → animação → hold (3s) → fade out (1s) no modo `default`, ou animação pura sem overhead no modo `duration-based`. Opacidade via CSS no `<AbsoluteFill>` (crossfade real entre cenas). `interpolate` do Remotion para transições suaves. `SceneSequence` (fallback para cenas estáticas). Controle de duração via `AnimationDurationSelector` com opções predefinidas (substitui `SpeedPaintControls`). `DURATION_BASED_SKETCH_RATIO=0.8` define proporção automática sketch/reveal baseada na duração total. `SpeedPaintSpeed` type (`slow` \| `normal` \| `fast`). `SpeedPaintMultipliers` interface para controle granular por fase. `DEFAULT_SPEED_PAINT_MULTIPLIERS` sketch em velocidade real, reveal com `REVEAL_SPEED_SCALE` (0.5) applied no renderer (`{ sketch: 1.0, reveal: 1.0 }`) |
| **Speed Paint pipeline** | `generateScenesWithSpeedPaint()` com `{ useWorker: true }`. Web Worker inline (Blob URL + OffscreenCanvas) para >5 cenas. Fallback automático para main thread. Cache LRU (20 entradas) via SHA-256 |
| **Speed Paint renderer** | `renderSpeedPaintFrame()` aceita `SpeedPaintMultipliers` (`{ sketch, reveal }`) para progresso separado por fase. `REVEAL_SPEED_SCALE = 0.5` torna reveal 2x mais lento que linear. `adjustProgress()` com curva de potência para velocidades <1x (garante completude 100%). Backward compat com `number` como `speedMultiplier`. `createBufferCanvas()`, `loadImageElement(crossOrigin='anonymous')` |
| **Stroke cache** | `strokeCache.ts` — LRU com max 20, chave SHA-256, `getStrokeAnimation()`, `setStrokeAnimation()`, `clearStrokeCache()`, `getStrokeCacheStats()` |
| **Stroke worker** | `strokeWorker.ts` — `createStrokeWorker()`, `terminateStrokeWorker()`, `processSceneInWorker()`, `supportsStrokeWorker()` |
| **Staleness** | Hash SHA-256 do roteiro detecta quando legendas ficam desatualizadas após edição |
| **ScrollingPhrase** | Texto contínuo com variantes `active` (fade in + translateY) e `previous` (opacidade 1.0→0.5). Suporte a **bold** via markdown |
| **Whisper** | Modelo `tiny` (~39MB). Filtros de tokens inválidos. Resample para 16kHz. Apenas IndexedDB |
| **Bridge** | `videoRenderBridge` (Zustand) sincroniza estado de exportação/transcrição/reprodução (currentFrame, isPlaying) entre VideoPage e App |
| **Canvas patch** | `canvasFontStretchPatch` corrige bug `%→keyword` na Canvas API do Remotion. Suporta canvas regular e OffscreenCanvas via `patchPrototype()`. Usa `createLogger` |
| **Resoluções** | `16:9` → 1920x1080, `9:16` → 1080x1920, `1:1` → 1080x1080 |
| **Exportação** | `isExporting` em CompositionConfig desabilita overlays pesados (WaveformOverlay) durante renderização |
| **Lápis animado** | `showDrawTool` prop controla exibição do lápis/pincel seguindo o último stroke visível durante preview e exportação. Default `true`. Propagado via `CompositionInputProps` → `useVideoExporter` → `VideoComposition` → `SpeedPaintScene`. `VideoPreview` também suporta a prop |

### Persistência (Dual Storage)

| | |
|---|---|
| **Arquivos** | `src/lib/db/` (barrel: `src/lib/db.ts` → `src/lib/db/index.ts`) |
| **Padrão** | `userId` presente → Firestore + Storage. `userId` ausente → IndexedDB local |
| **Offline** | `initializeFirestore` com `persistentLocalCache` + `persistentMultipleTabManager` (API moderna, suporte nativo a múltiplas abas) |
| **Queries** | `limit(100)` em todas as listagens Firestore (projects, generations, images, memories, chats, videos) |
| **Upload** | `uploadBytesResumable` para blobs >10MB; `uploadBytes` one-shot para menores |
| **Domínios** | memories, user_settings, generations, image_generations, projects (+subcoleções audios/images/videos), chats, transcriptions, audio_segments |
| **IndexedDB** | `GeminiVoiceStudioDB` v9. Stores: generations, image_generations, projects, audios, project_images, memories, chats, user_settings, videos, transcriptions |
| **Chat fallback** | Se doc >900KB ou erro Firestore, salva no IndexedDB (retorna `true`); `getChatSessions` busca Firestore + IndexedDB e deduplica por `updatedAt`; filtrado por `userId` no merge |
| **Transcriptions** | Apenas IndexedDB (dados temporários por projeto) |
| **Audio segments** | Apenas IndexedDB, campo `audioSegments` dentro de `AudioSource` existente |
| **Admin (Firestore)** | Role-based (`users/{uid}` com `role=='admin'`) OU email hardcoded. Rules para `/users/{userId}` + subcoleção `/subscription/{docId}`: leitura pelo próprio usuário, escrita apenas por admin |
| **Admin (Storage)** | Apenas email hardcoded (leitura + deleção, sem escrita) |
| **Limites Storage** | Áudio 150MB, imagem 10MB, vídeo 200MB. Previews: público (leitura), admin (escrita) |
| **Converter** | `createFirestoreConverter<T>()` genérico remove `undefined` na serialização |

### Assistente IA

| | |
|---|---|
| **Arquivos** | `src/features/assistant/`, `src/features/assistant/components/assistantUi.ts`, `src/features/assistant/systemPrompt.ts`, `src/hooks/useAssistant.ts`, `src/features/studio/components/InlineAIWidget.tsx`, `src/hooks/useInlineAssistant.ts` |
| **Inline AI Widget** | `InlineAIWidget` integrado ao `ScriptEditor` — permite refatorar (IA rewrite), expandir ou resumir trechos selecionados. Usa `useInlineAssistant` para streaming direto do Gemini e `VirtualElement` para posicionamento contextual (Popover) |
| **Modelo** | `gemini-3.1-flash-lite-preview` (streaming via `generateContentStream`) |
| **UI centralizada** | `assistantUi.ts` — 13 estilos exportados (bubbles, composer, drawer, typing, history, empty state, attachment chip, send button); componentes internos importam de `assistantUi` em vez de `tokens.ts` |
| **Empty state** | `EmptyChatState` no AssistantMessages — estado vazio do chat com call-to-action e chips clicáveis com prompts contextuais |
| **Anexos** | 5 por msg. Imagem: 10MB. Documento: 5MB. Enviados como `inlineData` ao Gemini. Exibidos como `Chip` MUI com estilo premium (`assistantAttachmentChipSx`) |
| **System prompt** | Montado dinamicamente via `buildSystemInstruction` (em `systemPrompt.ts`): identidade + estrutura TTS + memórias + vozes + pace + estado estúdio + custom settings. Compartilhado entre chat principal e widget inline |
| **Modo estúdio** | Quando `currentState` fornecido, inclui estado completo + instrui modelo a sugerir alterações em bloco JSON |
| **JSON extraction** | Bloco ` ```json ` na resposta → `extractJsonSettings()` → botão "Aplicar no estúdio" (patch parcial) |
| **Memórias** | Injetadas no system prompt. Curta: texto direto. Upload: `.md/.txt/.csv` até 500KB (truncado 490K chars) |
| **Auto-save** | Salva sessão ao final de cada resposta (quando `isStreaming` → `false`). Título: primeiros 40 chars da primeira msg |
| **Abort** | Novo envio aborta chamada anterior. Desmontagem aborta em andamento |
| **Retry** | `retryLastMessage()` reenvia última mensagem do usuário ao falhar; botão "Tentar novamente" no Alert de erro |
| **Streaming batch** | Chunks acumulados via `requestAnimationFrame` — flush uma vez por frame de display (reduz re-renders durante streaming) |

### Estúdio de Produção

| | |
|---|---|
| **Arquivos** | `src/features/studio/`, `src/features/studio/store/`, `src/pages/StudioPage.tsx`, `src/components/Inspector.tsx`, `src/components/ScriptEditor.tsx`, `src/components/ActionBar.tsx`, `src/components/VoiceCard.tsx`, `src/features/studio/components/TemplateSelector.tsx`, `src/features/studio/components/EmotionSelector.tsx`, `src/data/scriptTemplates.ts`, `src/data/studioOptions.ts` |
| **Estado** | `useStudioStore` (Zustand) com `useShallow` para seletores otimizados; `useCurrentStudioState()` deriva `StudioDraftState`; sem hook `useStudioState` (removido na 0.22.0) |
| **Store** | `studioStore.ts` (state + setters + actions), `audioGeneratorStore.ts` (estado de geração de áudio: `isGenerating`, `scenes`, `audioSegments`, `projectId`, progress, etc. — tipos `AudioGeneratorState`, `SceneItem`, helper `getAudioDurationSeconds()`), `studio.utils.ts` (localStorage helpers puros + `buildGenerateOptions` + `saveStudioDefaults`/`clearStudioDefaults`), `index.ts` (barrel exports) |
| **Persistência** | 17 preferências no localStorage (prefixo `s2a_`) via `subscribe` + `PERSIST_MAP` (sem middleware persist). `referenceImage` é session-only |
| **Layout** | Grid 2 colunas: Inspector (`xs:12, lg:4`) + ScriptEditor (`xs:12, lg:8`) |
| **ActionBar** | Fixo na parte inferior (z-index 1400). Aparece no estúdio e na página de vídeo. Seletores primitivos do AudioContext (`useAudioIsPlaying`, `useAudioCurrentTime`, `useAudioDuration`) em vez de `useGlobalAudioState` — elimina ~4 re-renders/s |
| **Geração** | `useAudioGenerator` hook usa `useAudioGeneratorStore` (Zustand) para estado de geração — instanciado no `App.tsx` via `AudioGenerationHandler`; StudioPage recebe `isGenerating`, `scenes`, `handleGenerate`, `isGenerateDisabled` como props |
| **buildGenerateOptions** | Construtor DRY em `store/studio.utils.ts` — recebe `GenerateOptionsState` (combina `StudioDraftState` + campos de speaker) e userId, retorna opções de geração com `locale` mapeado de `imageTextLanguage` (usado por App.tsx) |
| **Inspector** | Lê estado diretamente do `useStudioStore` com `useShallow` — recebe apenas `isGenerating` como prop (22→1 prop desde 0.24.5). Usa `VoiceCard` para seleção de voz e `studioOptions.ts` para opções DRY (pace, visual framework, scene ratio, density) |
| **ScriptEditor** | Fonte serifada (Georgia), Ctrl+Enter para gerar, highlight de cena ativa no background |
| **Keyboard shortcuts** | `useKeyboardShortcuts`: Ctrl+Enter (gerar), Space (play/pause vídeo e toggle áudio), proteção contra inputs/blocos editáveis focados |
| **Templates** | `TemplateSelector` (collapsible no Inspector), `TemplateGallery`, `TemplateCard`, `TemplatePreviewDialog` — templates categorizados em `src/data/scriptTemplates.ts` com `TemplateCategory`; StudioPage tem aba dedicada para templates |
| **Emoções** | `EmotionType` (10 emoções), `EmotionSelector` com slider de intensidade, validação `isValidEmotion`, persistência `getStoredEmotion` — integrado no Inspector e pipeline de geração de áudio via `EMOTION_OPTIONS` |
| **Idioma das imagens** | `imageTextLanguage` (tipo `Locale`) — controla o idioma dos textos nas imagens/cenas geradas. Persistido em localStorage via `getStoredImageTextLanguage()`. Propagado até `generateScenePrompts()` via `LOCALE_LANGUAGE_MAP` (em `gemini.ts`). `LOCALE_CONFIGS` estendido com `geminiPromptName` |

### Página de Configurações

| | |
|---|---|
| **Arquivos** | `src/pages/ConfiguracoesPage.tsx`, `src/components/Configuracoes.tsx` |
| **Rota** | `/app/configuracoes` — protegida, lazy loading, export nomeado |
| **Redirect** | `/app/settings` → `/app/configuracoes` |
| **Navegação** | Ícone `Settings` no array `navItems` do Header (desktop + mobile Drawer) |
| **Seções** | 4 seções colapsáveis: Voz, Persona & Direção, Cenas & Imagens, Multi-locutor |
| **Campos** | 15 campos: voice, speakerAName, audioProfile, scene, styleNotes, pace, emotion/intensity, generateScenes, sceneDensity, sceneRatio, visualFramework, imageTextLanguage, isMultiSpeaker, speakerBName, speakerBVoice |
| **Persistência** | `saveStudioDefaults()` / `clearStudioDefaults()` em `studio.utils.ts` — escreve/remove nas mesmas chaves `s2a_*` do estúdio |
| **Reset** | "Restaurar padrões" limpa `s2a_*` + chama `useStudioStore.getState().reset()` |
| **Componentes reutilizados** | `EmotionSelector`, `useVoicePreviews()`, `VOICES`, `glassPanelSx`/`insetPanelSx` |
| **i18n** | Namespace `configuracoes.*` + `studio.header.nav.settings` nos 3 locales |

### Onboarding Wizard

| | |
|---|---|
| **Arquivos** | `src/features/onboarding-wizard/`, `src/pages/OnboardingPage.tsx` |
| **Rota** | `/onboarding` — pública, sem COEP, sem Header |
| **Componentes** | `WizardContainer` (layout + progress), `WelcomeStep` (boas-vindas), `ProfileStep` (nome + role com `SelectionCard`), `GoalsStep` (goals múltiplos com chips), `CompletionStep` (resumo + redirecionamento), `StepNavigation` (back/next), `SelectionCard` (card animado com toggle) |
| **Store** | `useWizardStore` (Zustand) — passo atual, dados do wizard (`WizardData`), concluído; persistido em localStorage via `COMPLETED_KEY` e `PROFILE_KEY` |
| **Tipos** | `WizardData` (name, role, goals), `WizardRole` (6 roles: contentCreator, podcaster, educator, marketer, student, other), `WizardGoal` (8 goals) |
| **Constants** | `ROLES`, `GOALS`, `STEPS`, `STEP_VARIANTS` em `constants.ts` — roles/goals com ícones MUI e labels i18n; configurações de animação Motion |
| **Animações** | Motion (`AnimatePresence` + variants) para transições entre passos e entrada de componentes |
| **Integração Auth** | Novos usuários sem onboarding completado são redirecionados para `/onboarding` após signup/login (AuthContext). Ao completar, salva `name`, `role`, `goals` no `user_settings` e redireciona para `/app/estudio` |
| **i18n** | Chaves `wizard` e `onboarding` nos 3 locales (pt-BR, en, es) |

### Billing & Pagamentos

| | |
|---|---|
| **Arquivos** | `src/features/billing/` (frontend), `functions/src/index.ts` (backend) |
| **Tipos** | `PlanId` (`'free' | 'pro' | 'business'`), `Plan`, `PlanLimits`, `UsageRecord`, `UsageState`, `UsageAlert` |
| **Planos** | Gratuito (limites base), Pro (R$ 49,90/mês), Business (R$ 149,90/mês) — definidos em `plans.ts`; `formatPrice()` para exibição |
| **Store** | `useBillingStore` (Zustand) — plano ativo, uso, status de loading; carrega do Firestore (`users/{uid}/subscription/current`) via `onSnapshot` em tempo real |
| **Init** | `useBillingInit` — hook de inicialização, usado uma vez no AuthContext; escuta mudanças de auth para ativar/desativar billing listener |
| **Componentes** | `PlanBadge` (chip de plano no Header), `UsageIndicator` (progress bar de uso), `UpgradeDialog` (dialog com cards de plano e redirect Stripe Checkout) |
| **Utilitários** | `checkEntitlement(state, feature)` verifica se o plano permite a feature; `useIsFreePlan()`, `useIsStripeAvailable()`, `useHasActiveSubscription()` |
| **Stripe client** | `src/lib/stripe.ts` — `loadStripe` lazy singleton; funciona sem key (plano Free) |
| **Cloud Functions** | `functions/src/index.ts` — 3 endpoints: `stripeWebhook` (Express, eventos Stripe), `createCheckoutSession` (assinatura), `createPortalSession` (Customer Portal) |
| **Firestore indexes** | `stripeCustomerId` (ASC + DESC) na collection `users` |
| **Env vars** | `VITE_STRIPE_PUBLISHABLE_KEY` (opcional), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (Functions, obrigatórias) |

### Biblioteca & Projetos

| | |
|---|---|
| **Arquivos** | `src/components/Library.tsx`, `src/components/video-library/`, `src/lib/db/projects.ts`, `src/lib/db/generations.ts`, `src/features/speed-paint/lib/projectQueueAdapter.ts` |
| **Library** | `/biblioteca` — lista projetos expansível com áudios, cenas, roteiro e vídeos. Cada projeto com imagens exibe botão "Levar cenas ao Speed Paint" que navega para `/app/pintura-rapida` com a fila pré-preenchida via `prepareProjectImagesForSpeedPaint()` |
| **VideoLibrary** | `/video` (abaixo do player) — galeria horizontal com busca, ordenação, seleção rápida + batch download. Modularizada em `video-library/` (GalleryCard, DeleteConfirmationDialog, MetadataPill, useProjectGallery, useBatchDownload, types) |
| **Projetos** | Firestore usa subcoleções: `projects/{id}/audios`, `projects/{id}/images`, `projects/{id}/videos` |
| **Gerações** | Coleção flat `generations`. Storage: `audios/{userId}/{id}.wav`, cenas em `generations_images/{userId}/{id}_scene_{index}.png` |
| **Download** | `downloadFile()`: blob/data URLs direto, remotas via fetch→blob, fallback abre no browser |
| **Blob cleanup** | Library usa `useRef<string[]>`. VideoLibrary usa `Set<string>` com revogação seletiva por item |
| **Delete dialog** | `DeleteConfirmationDialog` compartilhado em `video-library/` — usado por Library, ImageStudio e Assistant (DRY) |

### Speed Paint & Animação

| | |
|---|---|
| **Arquivos** | `src/features/speed-paint/` |
| **Pipeline** | Upload → edge detection (grayscale + diferença adjacente) → clusterização BFS → vetorização → renderização progressiva via player Remotion nativo. Processamento pesado (edge detection + BFS) via Web Worker inline (Blob URL) — não bloqueia a main thread |
| **Fases** | Sketch (bordas) → Reveal (coloração), renderizadas via `SpeedPaintScene` do video-render com suporte a multi-velocidade granular (`SpeedPaintMultipliers`) |
| **Player** | `SpeedPaintPlayer` (wrapper `@remotion/player`) + `SpeedPaintPlayerControls` (play/pause, seek slider, screenshot, snapshot PNG, indicadores de fase). `showDrawTool` default `true` — lápis animado visível durante preview e exportação |
| **Exportação** | `SpeedPaintExportPanel` com seletor de qualidade e download individual; `useSpeedPaintExporter` via Remotion WebCodecs com fallback de codec (H.264+AAC > H.264 s/ áudio > VP8+Opus+WebM). No lote, o modo `record` gera um único vídeo final da fila com painel próprio de progresso/erro/sucesso/cancelamento em `SpeedPaintPage`. `showDrawTool` default `true` — lápis animado visível durante preview e exportação. O exportador usa `getSpeedPaintSequenceTiming()` com modo `sequenced-batch` para calcular o overlap e duração total do lote |
| **Duração da animação** | `AnimationDurationSelector` substitui os sliders granulares `SpeedPaintControls` (sketch/reveal 0.25x–4.0x) por opções de duração predefinidas. `DURATION_BASED_SKETCH_RATIO=0.8` em `speedPaintTimings.ts` (consumido por `SpeedPaintScene`) determina a proporção sketch/reveal automaticamente. Integrado em `SpeedPaintExportPanel`, `SpeedPaintPlayerControls` e `QueueStaging` |
| **Composição** | `SpeedPaintComposition` — composição Remotion que integra `SpeedPaintScene` com fases de sketch (desenho de bordas) e reveal (coloração). Props `drawSpeed`/`paintSpeed` removidas (substituídas pelo modelo de duração total). Aceita `timingMode` para controle de temporização |
| **Drag-and-drop** | `QueueStaging` refatorado com `@dnd-kit/react` (`DragDropProvider`, `useSortable`, `DragOverlay`) para reordenação da fila; `arrayMove` do `@dnd-kit/helpers` no animationStore. A UI da fila agora informa quantos itens entram no vídeo final e quantos serão ignorados por falha anterior |
| **Batch** | Fila de imagens processada sequencialmente. Modos: `watch` (auto-avança preview) e `record` (gera vídeo final único). O preview em lote usa `BatchOrchestrator` com `AbortController` por item; o vídeo final ignora itens marcados como `failed` |
| **Store** | `useAnimationStore` (Zustand): job, queue, batchMode, progress, speed, paintSpeed, queueSource, queueSourceProjectName, queueSourceNotice; reordenação via `reorderQueue(oldIndex, newIndex)`. `QueuedImage.status` (`pending` \| `processing` \| `completed` \| `failed`) passou a ser usado no fluxo real do lote para transparência e filtro de exportação. Funções `revokeQueuedImageUrl(item)` e `revokeQueueUrls(queue)` previnem vazamento de blob URLs. Tipo `QueuedImage` suporta `shouldRevokeObjectUrl?: boolean` para revogação seletiva |

### Autenticação

| | |
|---|---|
| **Arquivos** | `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/GuestRoute.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/lib/firebase.ts`, `src/lib/db/account-cleanup.ts` |
| **Provider** | Google popup + email/senha + reset de senha + exclusão de conta. `AuthContext` + `useAuth()` — 11 componentes consumidores |
| **Métodos** | `login()` (Google), `signup(email, password)` (criação + verificação de email), `loginWithEmail(email, password)` (login), `resetPassword(email)` (reset, relança erro), `deleteAccount()` (cleanup LGPD + deleteUser), `clearAuthError()` |
| **Pós-login** | Novos usuários sem onboarding completado são redirecionados para `/onboarding`; usuários com onboarding concluído vão para `/app/estudio` |
| **Exclusão de conta** | Pipeline LGPD: `deleteUser(currentUser)` PRIMEIRO (antes do cleanup) → `deleteAllUserData(userId)` remove projetos + subcoleções, gerações, chats, memórias, settings, Storage objects e IndexedDB local; retorna `string[]` com categorias que falharam; `AuthContext` notifica o usuário via `window.confirm()` sobre falhas parciais; dialog "EXCLUIR" de confirmação no Header |
| **Verificação de email** | `sendEmailVerification()` enviada automaticamente pós-cadastro; `ProtectedRoute` bloqueia acesso a usuários email/senha não verificados (tela com botão "Reenviar email"); Google auto-verifica |
| **GuestRoute** | `GuestRoute` — inverso do `ProtectedRoute`: exibe spinner com `role="status"` e `aria-live="polite"` durante loading, redireciona para `/app/estudio` se autenticado, renderiza `<Outlet />` para visitantes. Envolve `/`, `/login` e `/cadastro` no router |
| **COEP conflict** | Login/logout/delete fazem `window.location.href` (full reload) para alternar COEP — popup Firebase precisa de iframes cross-origin |
| **Migração** | Ao logar (transição `null→user`), verifica migração pendente IndexedDB→Firestore via `DataMigrationDialog` |
| **Erros** | Mensagens pt-BR mapeadas por código Firebase (`auth/popup-blocked`, `auth/too-many-requests`, `auth/email-already-in-use`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, `auth/weak-password`, `auth/invalid-email`, `auth/requires-recent-login`) |
| **Estilos compartilhados** | `authTextFieldSx` (TextField dark theme) e `authLinkSx` (link inline hover) definidos em `src/theme/authStyles.ts` (importados por LoginPage e RegisterPage) |

### Internacionalização (i18n)

| | |
|---|---|
| **Arquivos** | `src/features/i18n/`, `src/data/` (authBenefits, pricingFaq, metrics, testimonials, useCases) |
| **Locales** | pt-BR (default), en, es — dicionários em `src/features/i18n/locales/` |
| **Provider** | `I18nProvider` no `main.tsx`; hook `useLocale()` retorna `{ locale, setLocale, t }` |
| **Selector** | `LocaleSelector` (ícone globe) no PublicHeader e Header |
| **Tipo** | `Locale` = `'pt-BR' | 'en' | 'es'`. `TranslationDictionary` com suporte a nested keys. `LocaleConfig` com `geminiPromptName` para instruções ao Gemini |
| **Utils** | `getNestedValue(path, dict)` resolve chaves tipo `'landing.hero.title'` |
| **OG locale** | `OG_LOCALE_MAP` em `seo.ts` mapeia locale para meta tag `og:locale` |
| **Cobertura** | Todas as páginas públicas + OnboardingPage + ConfiguracoesPage + Header/Footer + Inspector + ActionBar + ScriptEditor + Library + ImageStudio + VideoPreview + StudioPage + SpeedPaintPage + VideoPage + AssistantComposer/Header/HistoryPanel/MemoriesPanel/Messages/SettingsPanel |

### Environment & COEP

| | |
|---|---|
| **Arquivos** | `src/lib/env.ts`, `src/lib/firebase.ts`, `vite.config.ts`, `firebase.json` |
| **Env vars** | `VITE_GEMINI_API_KEY` (required) + 7 `VITE_FIREBASE_*` (required) + 4 opcionais (`VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_PEXELS_API_KEY` + 2 outras) |
| **Helpers** | `readRequiredEnv()` (lança se ausente), `readOptionalEnv()` (undefined se ausente), `getGeminiApiKey()`, `getFirebaseEnvConfig()`, `getStripePublishableKey()`, `getPexelsApiKey()` |
| **COEP** | Rotas autenticadas `/app/**`: COOP/COEP habilitados. `/login`, `/cadastro` e `/onboarding`: SEM COEP (popup Firebase) |
| **Offline** | `initializeFirestore` com `persistentLocalCache` + `persistentMultipleTabManager` (API moderna, suporte nativo a múltiplas abas) |
| **Dev** | `coepPlugin()` via middleware Vite — exceção `/login`, `/cadastro` e `/onboarding` |
| **Prod** | Headers em `firebase.json` (COEP em `/app/**` + `/404.html`). SPA rewrite: `**` → `/index.html`. `cleanUrls`: true. 8 redirects 301. Cache immutable para assets estáticos. Headers de segurança (`X-Content-Type-Options`, `Referrer-Policy`) |
| **Razão** | `SharedArrayBuffer` necessário para Whisper WASM e Remotion |
| **Segurança** | `VITE_GEMINI_API_KEY` exposta no bundle (aceito por contexto privado). Segurança dos dados via Firestore/Storage Rules |

### UI & Theme

| | |
|---|---|
| **Arquivos** | `src/theme/appTheme.ts`, `src/theme/tokens.ts`, `src/theme/surfaces.ts`, `src/theme/authStyles.ts`, `src/theme/linkBehavior.tsx`, `src/index.css` |
| **Stack** | MUI v9 + Emotion. `StyledEngineProvider` com `enableCssLayer`. CSS layers: `theme, base, mui, components, utilities` |
| **Modo** | Dark only na prática (light existe com palette idêntica). Font: Inter (sans), JetBrains Mono (mono), Playfair Display (serif) |
| **Tokens** | `tokens.ts`: brand (blue/orange), semantic (success/error/warning), text opacidades, surfaces (5 níveis), glow (3 níveis), gradients, status (success/error/warning borders/glows) |
| **Surfaces** | `glassPanelSx` (blur+gradiente+shadow), `insetPanelSx` (recessado), `glassSurfaceSx` (blur fixo), `searchFieldSx` (campo de busca) — todas em `surfaces.ts` |
| **Component overrides** | AppBar (glass/blur), Button (radius 14, no elevation), Card (surface elevated), Alert (semirtransparente) |
| **Links** | `LinkBehavior` auto-via `defaultProps` em `MuiLink` e `MuiButtonBase` |
| **CSS global** | Apenas `index.css`: scrollbar custom (4px), utilities `.no-scrollbar`, `.glass-panel`, `.text-gradient`, `.accent-gradient`, keyframes `pulse` |
| **Layout** | Container `maxWidth: 1600px`. Padding responsivo. `/assistant`, `/login` e `/cadastro` sem Container |

### PWA

| | |
|---|---|
| **Arquivos** | `vite.config.ts` (plugin VitePWA), `src/main.tsx` (registro SW) |
| **Manifest** | Ícones 192/512, `theme_color` #0a0a0f, `display: standalone`, `orientation: portrait` |
| **Workbox** | Runtime caching para assets estáticos (1 ano) e Google Fonts (30 dias) |
| **Registro** | Apenas em produção (`import.meta.env.PROD`), `immediate: true` |
| **Exceções** | `/login`, `/cadastro` e `/__/` em `navigateFallbackDenylist` (sem COEP e endpoints Firebase Hosting internos não interceptados pelo SW) |

### Logger, Error Mapping & Rate Limiter

| | |
|---|---|
| **Arquivos** | `src/lib/logger.ts`, `src/lib/error-mapping.ts`, `src/lib/rate-limiter.ts` |
| **Logger** | `createLogger('context')` com níveis debug/info/warn/error. `debug` e `info` suprimidos em produção (`import.meta.env.PROD`) |
| **Error mapping** | `createErrorMapper(config)` genérico com `ErrorMappingRule[]` por domínio. `sharedErrorRules` comuns (quota, API key, unavailable). `handleFirestoreError` preserva causa original via `{ cause: error }` |
| **Rate limiter** | `withRetry<T>(fn, config?)` — genérico, reutilizável. Detecta `ApiError.status` + keywords em mensagens |

---

## Version

- **Current:** `0.37.0`
- **Last release:** 2026-05-18

### Últimas mudanças (atualizado por /fast)

> **Regra:** manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga.

| Versão | Resumo |
|--------|--------|
| 0.37.0 | **Timings centralizados do Speed Paint** — novo módulo `speedPaintTimings.ts` consolida constantes, tipos (`SpeedPaintTimingMode`, `SpeedPaintSequenceTiming`) e funções (`getSpeedPaintTimingConfig`, `getSpeedPaintOverlapFrames`, `getSpeedPaintSequenceTiming`); constantes hardcoded removidas de `SpeedPaintScene` e `VideoComposition`; prop `timingMode` adicionada em `SpeedPaintScene`; `sequenced-batch` e `duration-based` como modos de temporização; testes unitários do novo módulo; auditoria de timing |
| 0.36.0 | **Integração Biblioteca → Speed Paint** — novo adaptador `projectQueueAdapter.ts` prepara imagens do projeto para a fila do Speed Paint; botão "Levar cenas ao Speed Paint" em cada projeto na Library; revogação automática de blob URLs (`revokeQueuedImageUrl`, `revokeQueueUrls`); rastreamento de origem da fila (`queueSource`, `queueSourceProjectName`, `queueSourceNotice`); 15 novas chaves i18n para o fluxo; testes do adaptador e da Library |
| 0.35.0 | **Lápis animado do Speed Paint visível em preview e exportação** — `showDrawTool` propagado por todo o pipeline de vídeo (`types.ts` → `useVideoExporter` → `VideoComposition` → `SpeedPaintScene`); `animateScenes` default `false→true` no `VideoExportPanel`; `VideoPreview` com suporte a `showDrawTool`; `SpeedPaintPage` reestruturada (layout flex responsivo); testes de regressão para lápis animado e header duplicado em lote |
| 0.34.0 | **Seletor de duração substitui sliders granulares de Speed Paint** — `SpeedPaintControls` (sketch/reveal 0.25x–4.0x) removido e substituído por `AnimationDurationSelector` com opções de duração predefinidas; props `drawSpeed`/`paintSpeed` removidas de `SpeedPaintComposition` e `useSpeedPaintExporter`; `DURATION_BASED_SKETCH_RATIO=0.8` adicionado em `SpeedPaintScene` para transição sketch→reveal automática baseada na duração total |
| 0.33.1 | **Correções de hooks e dead code no Speed Paint** — dependências do `useEffect` em `BatchOrchestrator` simplificadas (`currentImg?.id, currentImg?.dataUrl` → `currentImg`); ordem de hooks corrigida em `useSpeedPaintExporter` (violação das Rules of Hooks); imports não utilizados removidos de `QueueStaging.tsx` (`BRAND_GRADIENT`, `BRAND_GRADIENT_HOVER`, `BRAND_GLOW`) |
