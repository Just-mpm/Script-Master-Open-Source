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
bun run deploy           # lint + typecheck + build + firebase deploy (completo)
bun run deploy:hosting   # deploy apenas do hosting
bun run deploy:firestore # deploy apenas das regras e indexes do Firestore
bun run deploy:storage   # deploy apenas das regras do Storage
bun run deploy:functions # build functions + deploy das Cloud Functions
bun run deploy:preview   # lint + typecheck + build + firebase hosting:channel:deploy preview
bun run emulators        # inicia todos os emuladores Firebase localmente
bun run emulators:functions # inicia apenas o emulador de functions
bun run emulators:ui     # inicia apenas a UI dos emuladores
```

**Sem formatter e sem CI/CD.**

## Stack

- **React 19** + **Vite 8** + **react-router-dom v7** (lazy loading por rota)
- **MUI v9** — tema em `src/theme/*`, sem Tailwind
- **Genkit** (backend via Cloud Functions) — TTS, imagens, prompts de cena, assistente, chunking
- **Firebase** — Auth + Firestore + Storage + IndexedDB (dual storage) + App Check (reCAPTCHA v3) | `firebase-tools` ^15.3.0 (deploy)
- **Firebase Cloud Functions v2** — backend serverless com Genkit quando necessário + Stripe em `functions/`
- **Stripe** — `@stripe/stripe-js` ^9.3 (client-side) + `stripe` ^22.1 (server-side nas Functions); desconectado por flag `VITE_BILLING_ENABLED` durante beta aberto
- **Remotion 4.0.448** — renderização de vídeo client-side (WebCodecs, Whisper WASM para legendas)
- **Zustand** (estado) | **@dnd-kit/react** (drag-and-drop) | **react-dropzone** (upload) | **react-hot-toast** (toasts)
- **React 19 native** — SEO per-page via `<title>`, `<meta>`, `<link>` com hoisting automático; componente `DocumentHead` em `src/components/DocumentHead.tsx`
- **Vitest 4** + **@testing-library/react** — testes unitários e de componentes (jsdom + fake-indexeddb)
- **vite-plugin-pwa** — service worker + manifest para instalação como app

## Modelos Gemini

| Modelo | Uso |
|--------|-----|
| `gemini-3.1-flash-tts-preview` | Text-to-speech |
| `gemini-3.1-flash-image-preview` | Geração de imagens |
| `gemini-3.1-flash-lite` | Chunking de roteiros, prompts de cena, chat do assistente (modo `fast`) |
| `gemini-3.5-flash` | Chat do assistente (modo `specialist`) |

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
- Não chame o Gemini diretamente do frontend — todas as chamadas de IA passam por Cloud Functions via Genkit (`httpsCallable`)

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
| **Arquivos** | `src/App.tsx`, `src/router/routes.tsx`, `src/router/Redirects.tsx`, `src/components/app/AudioGenerationHandler.tsx`, `src/components/app/AudioPreflightDialog.tsx`, `src/components/app/PwaUpdatePrompt.tsx`, `src/components/toast/ToastProvider.tsx`, `src/components/GuestRoute.tsx`, `src/hooks/useAutoSaveStudioSettings.ts` |
| **App.tsx** | Shell enxuto (~240 linhas) — instancia providers (Router, Auth, I18n, AudioContext), renderiza `AppRoutes` + `VideoPreview` + `ToastProvider` + `Toaster` (react-hot-toast) + `PwaUpdatePrompt`. Importa e invoca `useAutoSaveStudioSettings()` para sincronização automática das preferências do estúdio com Firestore. `isOnboardingRoute` controla ocultação do Header na página de onboarding. Não contém lógica de negócio |
| **Router** | `src/router/routes.tsx` — lazy loading por rota, `Suspense` com fallback, `ProtectedRoute` wrapper para rotas autenticadas, `GuestRoute` wrapper para rotas de convidado (`/`, `/login`, `/cadastro`) |
| **GuestRoute** | `src/components/GuestRoute.tsx` — inverso do `ProtectedRoute`: exibe spinner durante `loading`, redireciona para `/app/estudio` se `user` existe, renderiza `<Outlet />` para visitantes |
| **Redirects** | `src/router/Redirects.tsx` — 11 redirects 301 de compatibilidade |
| **AudioGenerationHandler** | Componente extraído de App.tsx — encapsula `useAudioGenerator` + lógica de geração + integração com `AudioPreflightDialog` para pré-verificação de créditos |
| **ToastProvider** | Componente extraído de App.tsx — gerencia ErrorToast/SuccessToast/WarningToast |

### Páginas Públicas

| | |
|---|---|
| **Arquivos** | `src/pages/public/`, `src/components/public/`, `src/data/`, `src/components/DocumentHead.tsx`, `src/lib/seo.ts` |
| **LandingPage** | `/` — hero com CTA, social proof bar, 6 feature cards, 3 feature showcases, seção "como funciona" (3 steps), CTA final |
| **FuncionalidadesPage** | `/funcionalidades` — 6 seções categorizadas (Áudio, Vídeo, Imagem, Assistente, Biblioteca, Speed Paint) com deep dives |
| **PricingPage** | `/precos` — página de beta aberto: `CreditInfoCard` com cards animados (Motion), `BetaNotice`, seção "Como funciona" com `StepCard`; sem toggle mensal/anual, sem tabela de comparação |
| **FaqPage** | `/perguntas-frequentes` — FAQ por categorias via tabs, accordion expansível com `id`/`aria-controls` (WCAG 4.1.2) |
| **ContactPage** | `/contato` — formulário de contato, links sociais, informações de suporte |
| **AboutPage** | `/sobre` — missão, valores, diferenciais do produto |
| **TermsPage** | `/termos` — termos de uso |
| **PrivacyPage** | `/privacidade` — política de privacidade |
| **CookiesPage** | `/cookies` — política de cookies |
| **StatusPage** | `/status` — status dos serviços |
| **Componentes** | 17 componentes em `src/components/public/`: PublicHeader (AppBar responsivo com drawer mobile, link "Contato"), PublicFooter (3 grupos: Produto, Empresa, Legal), PageLayout (shell, sem `component="main"` — landmark em App.tsx), HeroSection, FeatureCard, FeatureShowcase, CTASection (glow laranja), StepCard (glassPanelSx), SocialProofBar, PricingCard (card de plano), FAQAccordion (accordion com a11y), UseCasesSection, MetricsSection, ProductDemoSection, TestimonialsSection, TestimonialCard, barrel `index.ts` |
| **Assets** | 8 imagens em `public/images/public/` (hero, features, CTA) geradas via Gemini. Logos centralizados em `src/assets/logos.ts` — 7 variantes (`mark.transparent/round/square`, `full.transparent/round/square/roundedSquare`) + favicon, com `LOGO_VERSION` para invalidação de cache |
| **SEO** | React 19 nativo (`<title>`, `<meta>`, `<link>` com hoisting automático). `getPageSeo()` em `src/lib/seo.ts` retorna `SeoData` (tipos próprios). `buildSeoTitle()` constrói títulos padronizados com sufixo do projeto. `DocumentHead` em `src/components/DocumentHead.tsx` renderiza tags no `<head>`. Meta tags OG, Twitter Cards, canonical URL, `article:published_time` por página; OG locale map (`og:locale`) por idioma; `robots.txt` bloqueia `/app/`, `/login`, `/cadastro`, `/onboarding`; `sitemap.xml` com 9 URLs públicas priorizadas; NotFoundPage com `noindex, nofollow` |
| **Domínio prod** | URLs públicas absolutas, canonical, Open Graph, `robots.txt`, `sitemap.xml` e fallbacks de checkout/portal devem priorizar `https://script-master.pro`. Subdomínios `*.web.app` e `*.firebaseapp.com` podem continuar ativos como secundários |
| **Páginas autenticadas** | Prefixo `/app/` em todas as rotas protegidas (`/app/estudio`, `/app/video`, etc.) |

### Áudio & TTS

| | |
|---|---|
| **Arquivos** | `src/hooks/useAudioGenerator.ts`, `src/features/studio/store/audioGeneratorStore.ts`, `src/components/app/AudioGenerationHandler.tsx`, `src/components/app/AudioPreflightDialog.tsx`, `src/lib/audio.ts`, `functions/src/flows/audio.ts`, `functions/src/flows/chunking.ts`, `functions/src/flows/audio-preflight.ts`, `functions/src/usage/audio-preflight.ts`, `functions/src/genkit/constants.ts`, `functions/src/genkit/schemas/common.ts` |
| **Frontend** | `useAudioGenerator` chama Cloud Function `audio` via `httpsCallable` (Genkit). Tipos `AudioFlowInput`/`AudioFlowOutput`. Sem chamada direta ao Gemini |
| **Backend (Genkit)** | Flow `audio.ts` — recebe script, voz, locale, emotion; faz chunking interno (se >500 chars via `chunking.ts`); chama Gemini TTS com retry automático (`TTS_MAX_RETRIES=2`); retorna chunks de áudio base64. Middleware `credit-metering.ts` estima/reserva/confirma créditos. Flow `audio-preflight.ts` — pré-verifica créditos antes da geração |
| **Chunking** | Se >500 chars, Cloud Function `chunking` divide o roteiro via Genkit com output schema `ChunkItemSchema` enriquecido (emotionTag, isContinuation, trailingSentence, paceTag) e instrução montada por `buildChunkingInstruction()`. Fallback programático em `functions/src/genkit/utils/chunking.ts` com `extractTrailingSentence()`, `isTruncatedChunk()`, `mergeOrPush()`, `splitLongSentence()`, `mergeShortChunks()` — regex expandida que nunca quebra palavras |
| **Continuidade** | A partir do chunk 2, injeta contexto enriquecido: última frase do chunk anterior, tag de emoção ativa, sample context (frases âncora não faladas) + `CONTINUITY_AUDIO_TAG` (`[continuing]`) no transcript |
| **Multi-speaker** | Quando ativo, `speechConfig` usa `multiSpeakerVoiceConfig` com 2 locutores (Speaker A + B) |
| **WAV** | 24kHz mono 16-bit PCM, header 44 bytes. PCM extraído se Gemini retornar com header embutido |
| **Limites** | `MAX_CHARS=50000` (roteiro), `CHUNK_LIMIT=500` (por chamada TTS), `MAX_TTS_CHUNKS=24` (chunks máximos), `MIN_TTS_PCM_BYTES=1024` (PCM mínimo válido) |
| **Segmentos** | `AudioSegment` persiste chunk→timestamp no IndexedDB (fire-and-forget). Duração: `pcm.length / 48000` |
| **Cancelamento** | `cancelRef` checado antes de cada chunk; estado anterior restaurado via `lastSuccessfulStateRef`. State values espelhados via refs para evitar stale closure |
| **Detecção de silêncio** | `detectSceneBoundaries()` via RMS no áudio real. Calibra threshold em até 3 iterações |
| **Voice previews** | Arquivos WAV estáticos em `/voice-previews/{voiceId}.wav`. Hook: `useVoicePreviews` |
| **AudioContext selectors** | `useAudioIsPlaying()`, `useAudioCurrentTime()`, `useAudioDuration()`, `useAudioProgress()`, `useAudioActiveId()` — hooks seletivos para re-render otimizado |
| **Emoções** | `emotion` e `emotionIntensity` (0-1) nas options de geração; persistidos nos tipos de db (`db/types.ts`) |
| **Créditos** | `creditsExhausted` prop no `AudioGenerationHandler` — bloqueia geração quando créditos acabam. `AudioPreflightDialog` exibe prévia de custo antes da geração com funções auxiliares extraídas (`getSummaryText`, `getBlockingText`, `getStepLabel`, `getStepDetails`, `getNotes`); `AudioGenerationHandler` possui tipos `AudioPreflightCallableResult` e funções `isAudioPreflightSummary`/`getAudioPreflightSummary` para parsing tipado |

### Geração de Imagens

| | |
|---|---|
| **Arquivos** | `src/hooks/useImageGenerator.ts`, `src/lib/gemini.ts`, `src/components/ImageStudio.tsx`, `src/features/studio/components/StockMediaPicker.tsx`, `src/lib/stockMedia.ts`, `functions/src/flows/images.ts` |
| **Cancelamento** | `cancelRef` checado antes de cada retry; cancelamento silencioso (sem erro para o usuário) |
| **Aspect ratios** | Estúdio de Imagem aceita 8 ratios (via string). Pipeline de cenas aceita 5. Estúdio de Vídeo restringe a 3 (`SceneRatio`) |
| **Referência** | Estúdio: `File` via FileReader. Pipeline: `string` (data URL ou base64) via `parseReferenceImage` |
| **Prompts de cena** | `generateScenePrompts()` chama Cloud Function `scene-prompts` via `httpsCallable` (Genkit com instrução gerada por `buildScenePromptsInstruction()` + output schema em código). Gera descrições textuais (JSON), não imagens. Fallback genérico se API falhar |
| **Frameworks visuais** | `general` (cinema/fotografia) ou `whiteboard` (ilustrações + texto integrado) |
| **Stock Media** | `StockMediaPicker` com busca via Pexels API (`src/lib/pexelsApi.ts`) quando `VITE_PEXELS_API_KEY` disponível; fallback para array fixo de placeholder. Rate limit: 200 req/hora (plano free Pexels) |
| **Créditos** | `CreditBlockedMessage` exibido no ImageStudio quando créditos estão esgotados |

### Vídeo (Remotion)

| | |
|---|---|
| **Arquivos** | `src/features/video-render/` (inclui `src/features/video-render/lib/speedPaintTimings.ts` — timings centralizados do Speed Paint) |
| **Renderização** | Client-side via WebCodecs. Sem backend |
| **Codec fallback** | 1) H.264+AAC+MP4 → 2) H.264 sem áudio → 3) VP8+Opus+WebM (exibe aviso ao usuário) |
| **Crossfade** | Overlap dinâmico por cena: speed paint usa 1s (`getSpeedPaintOverlapFrames`), cenas estáticas usam 400ms. Fade = 12 frames para cenas estáticas, spring `{damping:26, stiffness:100, mass:1}` |
| **Legendas** | Pipeline 3 fontes (prioridade): `segment-timing` > `whisper-aligned` > `proportional` |
| **Estilo de legendas** | `SubtitleStyle` + `DEFAULT_SUBTITLE_STYLE`. `SubtitleInlineEditor` editor inline via portal. Subcomponentes em `subtitle-editor/` (EditorToolbar, FontSizeControls, PositionToggle, StyleSlider, ToolbarActions, SubtitlePreview, DragOverlay, EditorButton) |
| **VoiceStyleKey** | `src/lib/types.ts` — tipo union `VoiceStyleKey` padroniza chaves de estilo de voz (`'casual' | 'bright' | 'animated' | 'informative' | 'firm'`). As 5 vozes em `constants.ts` usam `styleKey` em vez de `style` |
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
| **UserSetting** | Expandida com 16 campos opcionais de preferências do estúdio (`selectedVoice`, `isMultiSpeaker`, `speakerAName`, `speakerBName`, `speakerBVoice`, `audioProfile`, `scene`, `pace`, `styleNotes`, `generateScenes`, `sceneDensity`, `sceneRatio`, `visualFramework`, `emotion`, `emotionIntensity`, `imageTextLanguage`) — persistidos com `{ merge: true }` no Firestore, preservando dados existentes |
| **IndexedDB** | `GeminiVoiceStudioDB` v9. Stores: generations, image_generations, projects, audios, project_images, memories, chats, user_settings, videos, transcriptions |
| **Chat fallback** | Se doc >900KB ou erro Firestore, salva no IndexedDB (retorna `true`); `getChatSessions` busca Firestore + IndexedDB e deduplica por `updatedAt`; filtrado por `userId` no merge |
| **Transcriptions** | Apenas IndexedDB (dados temporários por projeto) |
| **Audio segments** | Apenas IndexedDB, campo `audioSegments` dentro de `AudioSource` existente |
| **Admin (Firestore)** | Role-based (`users/{uid}` com `role=='admin'`) OU email hardcoded. Rules para `/users/{userId}` + subcoleções `/subscription/{docId}`, `/beta_access/{docId}`, `/credit_months/{docId}`, `/credit_events/{docId}`, `/feedback_rewards/{docId}`: leitura pelo próprio usuário, escrita apenas por admin |
| **Admin (Storage)** | Apenas email hardcoded (leitura + deleção, sem escrita) |
| **Limites Storage** | Áudio 150MB, imagem 10MB, vídeo 200MB. Previews: público (leitura), admin (escrita) |
| **Converter** | `createFirestoreConverter<T>()` genérico remove `undefined` na serialização |

### Assistente IA

| | |
|---|---|
| **Arquivos** | `src/features/assistant/`, `src/features/assistant/components/assistantUi.ts`, `src/features/assistant/components/PlanWidget.tsx`, `src/features/assistant/components/SettingsPreviewCard.tsx`, `src/features/assistant/components/ToolEventCard.tsx`, `src/hooks/useAssistant.ts`, `src/features/studio/components/InlineAIWidget.tsx`, `src/hooks/useInlineAssistant.ts`, `functions/src/flows/assistant.ts`, `functions/src/flows/inline-assistant.ts`, `functions/src/genkit/utils/assistant-context.ts`, `functions/src/genkit/utils/callable-auth.ts`, `functions/src/genkit/schemas/common.ts` |
| **Inline AI Widget** | `InlineAIWidget` integrado ao `ScriptEditor` — permite refatorar (IA rewrite), expandir ou resumir trechos selecionados. Usa `useInlineAssistant` para streaming via Cloud Function `inline-assistant` (Genkit) e `VirtualElement` para posicionamento contextual (Popover). Animações Motion com `AnimatePresence`, transições Fade e componente `KbdHint` para dicas de teclado |
| **Backend (Genkit)** | Chat principal usa Cloud Function `assistant` via `httpsCallable`. Inline assistant usa `inline-assistant`. As instruções agora são montadas em código por `assistant-context.ts`, sem arquivos `.prompt` separados |
| **Modelo** | `gemini-3.1-flash-lite` (modo `fast`, streaming via Genkit no backend) ou `gemini-3.5-flash` (modo `specialist`). Selecionável via `AIModeToggle` no ScriptEditor. Nível de pensamento configurável (`ThinkingLevel`: `minimal` | `low` | `medium` | `high`) |
| **UI centralizada** | `assistantUi.ts` — 24 estilos exportados (bubbles, composer, drawer, typing, history, empty state, attachment chip, send button, action icon button, suggestion chip, composer wrapper, input row, cycling placeholder, think toggle, control button, controls, segmented control, selector label); componentes internos importam de `assistantUi` em vez de `tokens.ts`. `assistantActionIconButtonSx` com suporte responsivo para botões de ação; `assistantSuggestionChipSx` para chips de sugestão |
| **Empty state** | `EmptyChatState` no AssistantMessages — estado vazio do chat com call-to-action e chips clicáveis com prompts contextuais |
| **Anexos** | 5 por msg. Imagem: 10MB. Documento: 5MB. Enviados como `inlineData` ao Gemini (via backend). Exibidos como `Chip` MUI com estilo premium (`assistantAttachmentChipSx`) |
| **System prompt (tool-first)** | Montado dinamicamente no backend por builders TypeScript em `assistant-context.ts`: identidade + estrutura TTS + memórias + vozes + pace + custom settings. **Estado do estúdio e memórias completas não são mais injetados no prompt** — o modelo consulta via ferramentas (`getStudioState`, `getUserMemories`) quando necessário. `buildMemoriesSummary()` e `buildStudioSummary()` geram visões condensadas para contexto |
| **Auth callable** | Flows callable do Genkit combinam `authPolicy: isSignedIn()` com `getCallableUidOrThrow(flowContext)` para validar `context.auth.uid` no servidor |
| **Modo estúdio** | Quando `currentState` fornecido, inclui estado completo + instrui modelo a sugerir alterações em bloco JSON |
| **JSON extraction** | Bloco ` ```json ` na resposta → `extractJsonSettings()` → botão "Aplicar no estúdio" (patch parcial) |
| **Memórias** | Injetadas no system prompt. Curta: texto direto. Upload: `.md/.txt/.csv` até 500KB (truncado 490K chars) |
| **Auto-save** | Salva sessão ao final de cada resposta (quando `isStreaming` → `false`). Título: primeiros 40 chars da primeira msg |
| **Abort** | Novo envio aborta chamada anterior. Desmontagem aborta em andamento |
| **Retry** | `retryLastMessage()` reenvia última mensagem do usuário ao falhar; botão "Tentar novamente" no Alert de erro |
| **Streaming batch** | Chunks acumulados via `requestAnimationFrame` — flush uma vez por frame de display (reduz re-renders durante streaming) |
| **Créditos** | `CreditBlockedMessage` exibido no Assistant quando créditos estão esgotados |

| **Orquestração (tool-first)** | `assistant.ts` usa `ai.generate()` com `tools` array de `ai.dynamicTool` (tool loop, `maxTurns: 20`). Ferramentas registradas: `updatePlan` (plano de tarefas), `webSearch` (pesquisa na web com Google Search Retrieval), `getStudioState` (estado atual do estúdio), `getUserMemories` (memórias do usuário), `updateStudio` (aplicar ajustes no estúdio), `interview` (entrevista com opções de múltipla escolha) e `respond` (resposta estruturada com ações sugeridas e mídia). Chunks estruturados emitidos via `sendMetaChunk()` com tipos `plan_update`, `studio_update`, `interview`, `tool_event`, `respond` |
| **PlanWidget** | `PlanWidget.tsx` — componente UI que exibe plano de tarefas (título, status, prioridade, dependências, subtarefas) entre mensagens e composer. i18n nos 3 locales via namespace `plan` |
| **Interview** | Fluxo interrupt/resume: `InterviewInputSchema` com opções (`optionId`, `label`, `description`). Resposta do usuário vira mensagem normal no histórico. `InterviewResumeData` permite continuar entrevista interrompida. Multi-select (`multiple` → checkboxes) e multi-question (`questions` → tabs + Confirm tab) |
| **Studio settings preview** | `settingsPreview` exibe campos individuais antes de aplicar alterações. `formatSettingsPreview()` e `SETTINGS_LABEL_KEYS` mapeiam `StudioSettingsPatch` para labels i18n. Botão "Aplicar no estúdio" aplica patch validado |
| **Tool event badges** | `ToolEventList` (`ToolEventCard.tsx`) renderiza eventos de ferramentas com ícones por tool, estados pending (shimmer), completed (check inline) e error (card colapsável). Máximo 8 eventos visíveis. `EMPTY_TOOL_EVENTS` constante estável para preservar `React.memo` |
| **ThinkingShimmer** | `ThinkingShimmer.tsx` — shimmer animation para estado "Pensando" (substitui Skeleton wave) |
| **TwoPhaseStopButton** | `TwoPhaseStopButton.tsx` — two-phase cancellation: primeiro clique mostra "Clique novamente para interromper" (4s timeout), segundo clique executa cancelamento |
| **Créditos por tokens** | `calculateAssistantCreditsFromUsage()` calcula créditos baseado em `usage.totalTokens` com taxa `TOKEN_CREDIT_RATE = 1000` tokens por crédito |

### Estúdio de Produção

| | |
|---|---|
| **Arquivos** | `src/features/studio/`, `src/features/studio/store/`, `src/pages/StudioPage.tsx`, `src/components/Inspector.tsx`, `src/components/ScriptEditor.tsx`, `src/components/ActionBar.tsx`, `src/components/VoiceCard.tsx`, `src/features/studio/components/TemplateSelector.tsx`, `src/features/studio/components/EmotionSelector.tsx`, `src/features/studio/components/AIModeToggle.tsx`, `src/data/scriptTemplates.ts`, `src/data/studioOptions.ts` |
| **Estado** | `useStudioStore` (Zustand) com `useShallow` para seletores otimizados; `useCurrentStudioState()` deriva `StudioDraftState`; sem hook `useStudioState` (removido na 0.22.0) |
| **Store** | `studioStore.ts` (state + setters + actions + `sanitizeStudioSettingsPatch` para validação de patches do assistente + `isEmotionType` para guarda de tipo de emoção), `audioGeneratorStore.ts` (estado de geração de áudio: `isGenerating`, `scenes`, `audioSegments`, `projectId`, progress, etc. — tipos `AudioGeneratorState`, `SceneItem`, helper `getAudioDurationSeconds()`), `studio.utils.ts` (localStorage helpers puros + `buildGenerateOptions` + `saveStudioDefaults`/`clearStudioDefaults`), `index.ts` (barrel exports) |
| **Persistência** | 17 preferências no localStorage (prefixo `s2a_`) via `subscribe` + `PERSIST_MAP` (sem middleware persist). `referenceImage` é session-only. Quando usuário logado, `getStudioSettingsPatch()` extrai 16 campos persistíveis (`StudioConfigState` → `StudioUserSettings`), sincronizados com Firestore via `useAutoSaveStudioSettings` (App.tsx, debounce 2s) e `Configuracoes.tsx` |
| **Layout** | Grid 2 colunas: Inspector (`xs:12, lg:4`) + ScriptEditor (`xs:12, lg:8`) |
| **Geração** | `useAudioGenerator` hook usa `useAudioGeneratorStore` (Zustand) para estado de geração — instanciado no `App.tsx` via `AudioGenerationHandler`; StudioPage recebe `isGenerating`, `scenes`, `handleGenerate`, `isGenerateDisabled` como props |
| **buildGenerateOptions** | Construtor DRY em `store/studio.utils.ts` — recebe `GenerateOptionsState` (combina `StudioDraftState` + campos de speaker) e userId, retorna opções de geração com `locale` mapeado de `imageTextLanguage` (usado por App.tsx) |
| **Inspector** | Lê estado diretamente do `useStudioStore` com `useShallow` — recebe apenas `isGenerating` como prop (22→1 prop desde 0.24.5). Usa `VoiceCard` para seleção de voz e `studioOptions.ts` para opções DRY (pace, visual framework, scene ratio, density) |
| **ScriptEditor** | Fonte serifada (Georgia), Ctrl+Enter para gerar, highlight de cena ativa no background |
| **Keyboard shortcuts** | `useKeyboardShortcuts`: Ctrl+Enter (gerar), Space (play/pause vídeo e toggle áudio), proteção contra inputs/blocos editáveis focados |
| **Templates** | `TemplateSelector` (collapsible no Inspector), `TemplateGallery`, `TemplateCard`, `TemplatePreviewDialog` — templates categorizados em `src/data/scriptTemplates.ts` com `TemplateCategory`; StudioPage tem aba dedicada para templates |
| **Emoções** | `EmotionType` (10 emoções), `EmotionSelector` com slider de intensidade, validação `isValidEmotion`, persistência `getStoredEmotion` — integrado no Inspector e pipeline de geração de áudio via `EMOTION_OPTIONS`. `EMOTION_LABEL_KEYS` mapeia `EmotionType` para chaves i18n |
| **Idioma das imagens** | `imageTextLanguage` (tipo `Locale`) — controla o idioma dos textos nas imagens/cenas geradas. Persistido em localStorage via `getStoredImageTextLanguage()`. Propagado até `generateScenePrompts()` via `LOCALE_LANGUAGE_MAP` (em `gemini.ts`). `LOCALE_CONFIGS` estendido com `geminiPromptName` |
| **Nome padrão do projeto** | `getDefaultProjectName(locale)` em `useAudioGenerator.ts` e `getDefaultProjectLabel(locale)` em `studio.utils.ts` — geram nome/label padrão do projeto no locale ativo, eliminando strings hardcoded |

### Página de Configurações

| | |
|---|---|
| **Arquivos** | `src/pages/ConfiguracoesPage.tsx`, `src/components/Configuracoes.tsx` |
| **Rota** | `/app/configuracoes` — protegida, lazy loading, export nomeado |
| **Redirect** | `/app/settings` → `/app/configuracoes` |
| **Navegação** | Ícone `Settings` no array `navItems` do Header (desktop + mobile Drawer) |
| **Seções** | 4 seções colapsáveis: Voz, Persona & Direção, Cenas & Imagens, Multi-locutor |
| **Campos** | 15 campos: voice, speakerAName, audioProfile, scene, styleNotes, pace, emotion/intensity, generateScenes, sceneDensity, sceneRatio, visualFramework, imageTextLanguage, isMultiSpeaker, speakerBName, speakerBVoice |
| **Persistência** | `saveStudioDefaults()` / `clearStudioDefaults()` em `studio.utils.ts` — escreve/remove nas mesmas chaves `s2a_*` do estúdio. `Configuracoes.tsx` também persiste no Firestore via `saveUserSettings()` com `{ merge: true }` quando usuário logado |
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

### Billing & Créditos

| | |
|---|---|
| **Arquivos** | `src/features/billing/` (frontend), `src/components/CreditBlockedMessage.tsx`, `src/components/CreditIndicator.tsx`, `src/hooks/useCredits.ts`, `functions/src/usage/` (backend), `functions/src/genkit/middlewares/credit-metering.ts`, `functions/src/flows/credit-snapshot.ts`, `functions/src/flows/cancel-ai-request.ts`, `functions/src/usage/ai-requests.ts` |
| **Modo atual** | Beta aberto (`OPEN_BETA_ENABLED=true`) — acesso gratuito com créditos mensais; Stripe/billing preservados mas desconectados por flag `VITE_BILLING_ENABLED=false` |
| **Tipos** | `PlanId` (`'free' | 'pro' | 'business'`), `Plan`, `PlanLimits`, `UsageRecord`, `UsageState`, `UsageAlert` |
| **Planos** | Gratuito (limites base), Pro (R$ 49,90/mês), Business (R$ 149,90/mês) — definidos em `plans.ts`; `formatPrice()` para exibição |
| **Store** | `useBillingStore` (Zustand) — plano ativo, uso, status de loading; carrega do Firestore (`users/{uid}/subscription/current`) via `onSnapshot` em tempo real; desabilitado quando `isBillingEnabled() === false` |
| **Init** | `useBillingInit` — hook de inicialização, usado uma vez no AuthContext; escuta mudanças de auth para ativar/desativar billing listener |
| **Componentes** | `PlanBadge` (chip de plano no Header), `UsageIndicator` (progress bar de uso), `UpgradeDialog` (dialog com cards de plano e redirect Stripe Checkout), `CreditBlockedMessage` (alerta de créditos esgotados), `CreditIndicator` (chip de créditos no Header com estados `loading`, `syncing`, `error`, `unlimited`) |
| **Utilitários** | `checkEntitlement(state, feature)` verifica se o plano permite a feature; `useIsFreePlan()`, `useIsStripeAvailable()`, `useHasActiveSubscription()` |
| **Stripe client** | `src/lib/stripe.ts` — `loadStripe` lazy singleton; funciona sem key (plano Free); desabilitado quando `isBillingEnabled() === false` |
| **Cloud Functions** | `functions/src/index.ts` — 3 endpoints Stripe: `stripeWebhook` (Express, eventos Stripe), `createCheckoutSession` (assinatura), `createPortalSession` (Customer Portal); endpoints retornam 503 quando `BILLING_ENABLED !== 'true'` |
| **Credit system** | `functions/src/usage/` — `credit-service.ts` (estimar/reservar/confirmar/reverter, `getCreditAvailabilitySnapshot`, `hasUnlimitedCredits`), `credit-metering.ts` (middleware Genkit), `credit-estimator.ts`, `credit-policy.ts` (MONTHLY_BASE_CREDITS, FEEDBACK_BONUS_CREDITS), `credit-events.ts`, `period.ts`, `idempotency.ts`. Flow `credit-snapshot.ts` para snapshot em tempo real; `cancel-ai-request.ts` para cancelamento cooperativo; `ai-requests.ts` para rastreamento de requisições |
| **Saldo no frontend** | `useCredits` agora usa uma store global Zustand para compartilhar listener do Firestore, snapshot callable, cooldown de falha e reconciliação com retry/backoff. O hook expõe `canEnforceBalance` para evitar bloqueio prematuro com saldo ainda não confirmado |
| **Firestore indexes** | `stripeCustomerId` (ASC + DESC) na collection `users`; `credit_events` (status+createdAt, requestId, createdAt DESC) |
| **Env vars** | `VITE_STRIPE_PUBLISHABLE_KEY` (opcional), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (Functions), `VITE_BILLING_ENABLED=false`, `VITE_OPEN_BETA_ENABLED=true` |

### Biblioteca & Projetos

| | |
|---|---|
| **Arquivos** | `src/components/Library.tsx`, `src/components/video-library/`, `src/lib/db/projects.ts`, `src/lib/db/generations.ts`, `src/features/speed-paint/lib/projectQueueAdapter.ts` |
| **Library** | `/biblioteca` — lista projetos expansível com áudios, cenas, roteiro e vídeos. Exibe vídeos salvos com ícone `Movie`, link de download e contagem. Cada projeto com imagens exibe botão "Levar cenas ao Speed Paint" que navega para `/app/pintura-rapida` com a fila pré-preenchida via `prepareProjectImagesForSpeedPaint()` |
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
| **Pós-login** | Novos usuários sem onboarding completado são redirecionados para `/onboarding`; usuários com onboarding concluído vão para `/app/estudio`. Ao logar, `AuthContext` carrega preferências do estúdio (voz, ritmo, cenas, etc.) do Firestore e aplica no `useStudioStore` — sincronização bidirecional com `useAutoSaveStudioSettings` |
| **Exclusão de conta** | Pipeline LGPD: `deleteUser(currentUser)` PRIMEIRO (antes do cleanup) → `deleteAllUserData(userId)` remove projetos + subcoleções, gerações, chats, memórias, settings, Storage objects e IndexedDB local; retorna `string[]` com categorias que falharam; `AuthContext` notifica o usuário via `window.confirm()` sobre falhas parciais; dialog "EXCLUIR" de confirmação no Header |
| **Verificação de email** | `sendEmailVerification()` enviada automaticamente pós-cadastro; `ProtectedRoute` bloqueia acesso a usuários email/senha não verificados com `requiresVerifiedPasswordEmail()` — polling a cada 5s (`EMAIL_VERIFICATION_POLL_MS`) até confirmação, tela com botão "Reenviar email". Google auto-verifica |
| **GuestRoute** | `GuestRoute` — inverso do `ProtectedRoute`: exibe spinner com `role="status"` e `aria-live="polite"` durante loading, redireciona para `/app/estudio` se autenticado, renderiza `<Outlet />` para visitantes. Envolve `/`, `/login` e `/cadastro` no router |
| **COEP conflict** | Login/logout/delete fazem `window.location.href` (full reload) para alternar COEP — popup Firebase precisa de iframes cross-origin |
| **Migração** | Ao logar (transição `null→user`), verifica migração pendente IndexedDB→Firestore via `DataMigrationDialog` |
| **Erros** | Mensagens pt-BR mapeadas por código Firebase (`auth/popup-blocked`, `auth/too-many-requests`, `auth/email-already-in-use`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, `auth/weak-password`, `auth/invalid-email`, `auth/requires-recent-login`) |
| **Estilos compartilhados** | `authTextFieldSx` (TextField dark theme) e `authLinkSx` (link inline hover) definidos em `src/theme/authStyles.ts` (importados por LoginPage e RegisterPage) |

### Internacionalização (i18n)

| | |
|---|---|
| **Arquivos** | `src/features/i18n/`, `src/data/` (authBenefits, pricingFaq, metrics, testimonials, useCases), `src/pages/public/legalData.ts` |
| **Locales** | pt-BR (default), en, es — dicionários em `src/features/i18n/locales/` com 20+ namespaces |
| **Provider** | `I18nProvider` no `main.tsx`; hooks: `useLocale()` retorna `{ locale, setLocale, t }` e `useLocaleSafe()` para contextos sem provider (ErrorBoundary, SceneSequence) |
| **Selector** | `LocaleSelector` (ícone globe) no PublicHeader e Header |
| **Tipo** | `Locale` = `'pt-BR' | 'en' | 'es'`. `TranslationDictionary` com suporte a nested keys. `LocaleConfig` com `geminiPromptName` para instruções ao Gemini |
| **Utils** | `getNestedValue(path, dict)` resolve chaves tipo `'landing.hero.title'`; `pluralKey(baseKey, count)` seleciona chave singular/plural baseada no count; `STEP_LABEL_KEYS` mapeia nomes de etapa (`audio`, `scene_prompts`, `images`, `video`) para chaves i18n do namespace `audioPreflight.stepLabels` |
| **OG locale** | `OG_LOCALE_MAP` em `seo.ts` mapeia locale para meta tag `og:locale` |
| **Namespaces principais** | `landing`, `features`, `pricing`, `faq`, `contact`, `about`, `legal`, `studio`, `common`, `notFound`, `errorBoundary`, `configuracoes`, `speedPaint`, `billing`, `credits`, `inlineAI`, `auth`, `wizard`, `onboarding`, `metrics`, `audioPreflight`, `voiceStyles`, `feedback`, `runtime`, `dataMigration`, `workspace`, `transcription`, `aiMode`, `plan`, `pwaUpdate` |
| **Cobertura** | Todas as páginas públicas + OnboardingPage + ConfiguracoesPage + Header/Footer + Inspector + ActionBar + ScriptEditor + Library + ImageStudio + VideoPreview + StudioPage + SpeedPaintPage + VideoPage + Assistant (Composer/Header/HistoryPanel/MemoriesPanel/Messages/SettingsPanel) + App.tsx + ToastProvider + AudioGenerationHandler + AudioPreflightDialog + GuestRoute + ProtectedRoute + ErrorBoundary + ErrorToast/SuccessToast/WarningToast + LoginPage + RegisterPage + NotFoundPage + GalleryCard + UpgradeDialog + UsageIndicator + AnimationDurationSelector + ImageUpload + InlineAIWidget + CaptionEditorPanel + SceneSequence + SpeedPaintControls + ExportProgressBar + ExportQualitySelector + VoiceCard |

### Environment & COEP

| | |
|---|---|
| **Arquivos** | `src/lib/env.ts`, `src/lib/firebase.ts`, `vite.config.ts`, `firebase.json` |
| **Env vars** | 7 `VITE_FIREBASE_*` (required) + 9 opcionais (`VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_PEXELS_API_KEY`, `VITE_RECAPTCHA_SITE_KEY`, `VITE_APP_CHECK_DEBUG_TOKEN`, `VITE_BILLING_ENABLED`, `VITE_OPEN_BETA_ENABLED`, `VITE_USE_EMULATORS`). `VITE_GEMINI_API_KEY` removido do frontend (uso apenas no backend via `GOOGLE_GENAI_API_KEY` nas Functions) |
| **Helpers** | `readRequiredEnv()` (lança se ausente), `readOptionalEnv()` (undefined se ausente), `getFirebaseEnvConfig()`, `getStripePublishableKey()`, `getPexelsApiKey()`, `getRecaptchaSiteKey()`, `getAppCheckDebugToken()`, `isBillingEnabled()`, `isOpenBetaEnabled()` |
| **COEP** | Rotas autenticadas `/app/**`: COOP/COEP habilitados. `/login`, `/cadastro` e `/onboarding`: SEM COEP (popup Firebase) |
| **Offline** | `initializeFirestore` com `persistentLocalCache` + `persistentMultipleTabManager` (API moderna, suporte nativo a múltiplas abas) |
| **Dev** | `coepPlugin()` via middleware Vite — exceção `/login`, `/cadastro`, `/onboarding` e todas as rotas públicas (`/funcionalidades`, `/precos`, `/perguntas-frequentes`, `/sobre`, `/termos`, `/privacidade`, `/contato`) |
| **Prod** | Headers em `firebase.json` (COEP em `/app/**` + `/404.html`). SPA rewrite: `**` → `/index.html`. `cleanUrls`: true. 8 redirects 301. Cache immutable para assets estáticos. Headers de segurança (`X-Content-Type-Options`, `Referrer-Policy`). Emuladores Firebase configurados para desenvolvimento local (auth 9099, firestore 8080, storage 9199, functions 5001, hosting 5000, ui 4000) |
| **Razão** | `SharedArrayBuffer` necessário para Whisper WASM e Remotion |
| **App Check** | `initializeAppCheck` com `ReCaptchaV3Provider` em `firebase.ts`. `VITE_RECAPTCHA_SITE_KEY` obrigatória em produção (sem ela, todas as chamadas `httpsCallable` falham). Token de debug para desenvolvimento local. Token de debug para desenvolvimento local |
| **Segurança** | API key do Gemini fica apenas no backend (Cloud Functions). Frontend não tem acesso direto ao Gemini. Segurança dos dados via Firestore/Storage Rules + App Check |

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
| **Arquivos** | `vite.config.ts` (plugin VitePWA), `src/components/app/PwaUpdatePrompt.tsx` (registro + update prompt) |
| **Manifest** | Ícones 192/512, `theme_color` #0a0a0f, `display: standalone`, `orientation: portrait` |
| **Workbox** | Runtime caching para assets estáticos (1 ano) e Google Fonts (30 dias) |
| **Registro** | Automático via `useRegisterSW` de `virtual:pwa-register/react` no `PwaUpdatePrompt` com `immediate: true`. Registro manual removido de `main.tsx` |
| **Update prompt** | `PwaUpdatePrompt` detecta nova versão via `registerType: 'prompt'` no vite-plugin-pwa. Snackbar MUI v9 com transição Slide (up), botões "Atualizar agora" (ativa novo SW + reload) e "Ignorar" (persiste no `sessionStorage`). Toast de `onOfflineReady` via react-hot-toast |
| **Exceções** | `/login`, `/cadastro` e `__/` em `navigateFallbackDenylist` (sem COEP e endpoints Firebase Hosting internos não interceptados pelo SW) |

### Logger, Error Mapping & Rate Limiter

| | |
|---|---|
| **Arquivos** | `src/lib/logger.ts`, `src/lib/error-mapping.ts`, `src/lib/rate-limiter.ts`, `src/lib/callable-errors.ts`, `src/lib/callable-utils.ts` |
| **Logger** | `createLogger('context')` com níveis debug/info/warn/error. `debug` e `info` suprimidos em produção (`import.meta.env.PROD`) |
| **Error mapping** | `createErrorMapper(config)` genérico com `ErrorMappingRule[]` por domínio. `sharedErrorRules` comuns (quota, API key, unavailable). `handleFirestoreError` preserva causa original via `{ cause: error }` |
| **Rate limiter** | `withRetry<T>(fn, config?)` — genérico, reutilizável. Detecta `ApiError.status` + keywords em mensagens |
| **Callable errors** | `callable-errors.ts` — `CallableErrorInfo`, `getCallableErrorInfo()`, `isCallableCancelledError()`, `isCreditCallableError()`. Centraliza parsing de erros de `httpsCallable` do Firebase, usado por todos os hooks de IA |

---

## Version

- **Current:** `0.106.0`
- **Last release:** 2026-05-28

### Últimas mudanças (atualizado por /fast)

> **Regra:** manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga.

| Versão | Resumo |
|--------|--------|
| `0.106.0` | PwaUpdatePrompt com detecção de nova versão via useRegisterSW (registerType: prompt), Snackbar MUI v9 com Slide, sessionStorage dismiss, onOfflineReady toast; remoção do registro manual de main.tsw; maxTurns do assistente 10→20 |
| `0.105.2` | Container scrollável no Assistente (fix layout mobile); respondResult refinado com Card + ReactMarkdown + AutoAwesome; assistantUi simplificado (scroll delegado ao pai); correção de imports não utilizados |
| `0.105.1` | SettingsPreviewCard extraído; AssistantComposer com ToggleButton; MergedToolEvent consolidado; PlanWidget responsivo; assistantUi padronizado; chave i18n tasksCompletedLabel; correções em AssistantMessages, testes e backend |
| `0.105.0` | Tool execution feedback com ícones por tool, estados pending/complete/error, error cards colapsáveis; ThinkingShimmer para "Pensando"; TwoPhaseStopButton com two-phase cancellation; Interview multi-select + multi-question (checkboxes, tabs, confirmação); correções de acessibilidade e memoização |
| `0.104.1` | Schemas de orquestração flexibilizados para maior liberdade do modelo (status/priority em z.string()); simplificação do Google Search Retrieval no webSearch; correção de nome da tool getUserMemories |
