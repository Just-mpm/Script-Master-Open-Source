# AGENTS.md — Script Master

## Visão Geral

SPA em React + Vite para transformar roteiros em áudio com Gemini TTS, geração opcional de imagens/cenas, renderização de vídeo com Remotion, biblioteca de projetos e assistente conversacional.

Firebase Hosting tradicional (frontend estático, sem backend Node).

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
- **Remotion 4.0.448** — renderização de vídeo client-side (WebCodecs, Whisper WASM para legendas)
- **Zustand** (estado) | **Konva** (canvas) | **react-dropzone** (upload)
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

- **Idioma:** pt-BR na UI e comentários, inglês nos prompts de imagem
- **Alias:** `@/` aponta para a raiz do projeto
- **Sem backend:** não criar `/api/*`, tudo client-side
- **Rotas:** lazy loading por rota, páginas em `src/pages/`
- **HMR:** não altere a checagem `DISABLE_HMR` em `vite.config.ts`

## Anti-patterns

- Não crie rotas `/api/*` — tudo é client-side
- Não use Tailwind ou CSS modules — MUI v9 é a stack única de UI
- Não altere `DISABLE_HMR` em `vite.config.ts` — usado por AI Studio
- Não remova COEP sem motivo — necessário para SharedArrayBuffer (Whisper + Remotion)
- Não use `process.env` — leia env vars via `import.meta.env` ou `src/lib/env.ts`
- Não use `console.log/warn/error` — importe `createLogger` ou `logger` de `src/lib/logger.ts` (uso: `import { createLogger } from '../../../lib/logger'` — sempre import relativo, nunca `@/`)

## Rotas

| Rota | Componente | Protegida |
|------|-----------|-----------|
| `/` | LandingPage | Não |
| `/funcionalidades` | FuncionalidadesPage | Não |
| `/precos` | PricingPage | Não |
| `/perguntas-frequentes` | FaqPage | Não |
| `/contato` | ContactPage | Não |
| `/sobre` | AboutPage | Não |
| `/termos` | TermsPage | Não |
| `/privacidade` | PrivacyPage | Não |
| `/cookies` | CookiesPage | Não |
| `/status` | StatusPage | Não |
| `/login` | LoginPage | Não |
| `/cadastro` | RegisterPage | Não |
| `/app/estudio` | StudioPage | Sim |
| `/app/video` | VideoPage | Sim |
| `/app/imagens` | ImageStudio | Sim |
| `/app/pintura-rapida` | SpeedPaintPage | Sim |
| `/app/assistente` | AssistantPage | Sim |
| `/app/biblioteca` | LibraryPage | Sim |
| `/app` | Redirect → `/app/estudio` | — |

**Redirects de compatibilidade:** `/features` → `/funcionalidades`, `/pricing` → `/precos`, `/faq` → `/perguntas-frequentes`, `/contact` → `/contato`, `/register` → `/cadastro`, `/app/image` → `/app/imagens`, `/app/assistant` → `/app/assistente`, `/app/library` → `/app/biblioteca`, `/app/speed-paint` → `/app/pintura-rapida`

---

## Domínios

### Páginas Públicas

| | |
|---|---|
| **Arquivos** | `src/pages/public/`, `src/components/public/`, `src/components/DocumentHead.tsx`, `src/lib/seo.ts` |
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
| **Componentes** | 12 componentes em `src/components/public/`: PublicHeader (AppBar responsivo com drawer mobile, link "Contato"), PublicFooter (3 grupos: Produto, Empresa, Legal), PageLayout (shell, sem `component="main"` — landmark em App.tsx), HeroSection, FeatureCard, FeatureShowcase, CTASection (glow laranja), StepCard (glassPanelSx), SocialProofBar, PricingCard (card de plano), FAQAccordion (accordion com a11y), barrel `index.ts` |
| **Assets** | 8 imagens em `public/images/public/` (hero, features, CTA) geradas via Gemini |
| **SEO** | React 19 nativo (`<title>`, `<meta>`, `<link>` com hoisting automático). `getPageSeo()` em `src/lib/seo.ts` retorna `SeoData` (tipos próprios). `DocumentHead` em `src/components/DocumentHead.tsx` renderiza tags no `<head>`. Meta tags OG, Twitter Cards, canonical URL, `article:published_time` por página; `robots.txt` bloqueia `/app/`, `/login`, `/cadastro`; `sitemap.xml` com 9 URLs públicas priorizadas; NotFoundPage com `noindex, nofollow` |
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

### Geração de Imagens

| | |
|---|---|
| **Arquivos** | `src/hooks/useImageGenerator.ts`, `src/lib/gemini.ts`, `src/components/ImageStudio.tsx` |
| **Pipeline** | prompt (opcional + referência) → Gemini via `withRetry` → extrai `inlineData` → base64ToBlob → blob URL |
| **Cancelamento** | `cancelRef` checado antes de cada retry; cancelamento silencioso (sem erro para o usuário) |
| **Retry** | `withRetry`: 3 tentativas, 1000ms base, 500ms jitter (mesmo do TTS) |
| **Aspect ratios** | Estúdio de Imagem aceita 8 ratios (via string). Pipeline de cenas aceita 5. Estúdio de Vídeo restringe a 3 (`SceneRatio`) |
| **Referência** | Estúdio: `File` via FileReader. Pipeline: `string` (data URL ou base64) via `parseReferenceImage` |
| **Prompts de cena** | `generateScenePrompts()` usa `gemini-lite` para gerar descrições textuais (JSON), não imagens. Fallback genérico se API falhar |
| **Frameworks visuais** | `general` (cinema/fotografia) ou `whiteboard` (ilustrações + texto integrado) |

### Vídeo (Remotion)

| | |
|---|---|
| **Arquivos** | `src/features/video-render/` |
| **Renderização** | Client-side via WebCodecs. Sem backend |
| **Codec fallback** | 1) H.264+AAC+MP4 → 2) H.264 sem áudio → 3) VP8+Opus+WebM (exibe aviso ao usuário) |
| **Crossfade** | Overlap de 400ms entre cenas. Fade = 12 frames, spring `{damping:26, stiffness:100, mass:1}` |
| **Legendas** | Pipeline 3 fontes (prioridade): `segment-timing` > `whisper-aligned` > `proportional` |
| **Estilo de legendas** | `SubtitleStyle` + `DEFAULT_SUBTITLE_STYLE`. `SubtitleInlineEditor` editor inline via portal. Subcomponentes em `subtitle-editor/` (EditorToolbar, FontSizeControls, PositionToggle, StyleSlider, ToolbarActions, SubtitlePreview, DragOverlay, EditorButton) |
| **Export quality** | `VideoExportQuality` type (`720p` | `1080p` | `1440p` | `4k`) com `getResolutionFromQuality()` e `DEFAULT_EXPORT_QUALITY`. `estimateFileSize()` calcula tamanho por duração, resolução e codec |
| **Speed Paint** | `SpeedPaintScene` (canvas nativo Remotion) + `SceneSequence` (fallback). Toggle no `VideoExportPanel` + `SpeedPaintControls` com sliders independentes sketch/reveal (0.25x–4.0x) via props primitivas (`sketch`/`reveal`/`onSketchChange`/`onRevealChange`). `SpeedPaintSpeed` type (`slow` | `normal` | `fast`). `SpeedPaintMultipliers` interface para controle granular por fase |
| **Speed Paint pipeline** | `generateScenesWithSpeedPaint()` com `{ useWorker: true }`. Web Worker inline (Blob URL + OffscreenCanvas) para >5 cenas. Fallback automático para main thread. Cache LRU (20 entradas) via SHA-256 |
| **Speed Paint renderer** | `renderSpeedPaintFrame()` aceita `SpeedPaintMultipliers` (`{ sketch, reveal }`) para progresso separado por fase. Backward compat com `number` como `speedMultiplier`. `createBufferCanvas()`, `loadImageElement(crossOrigin='anonymous')` |
| **Stroke cache** | `strokeCache.ts` — LRU com max 20, chave SHA-256, `getStrokeAnimation()`, `setStrokeAnimation()`, `clearStrokeCache()`, `getStrokeCacheStats()` |
| **Stroke worker** | `strokeWorker.ts` — `createStrokeWorker()`, `terminateStrokeWorker()`, `processSceneInWorker()`, `supportsStrokeWorker()` |
| **Staleness** | Hash SHA-256 do roteiro detecta quando legendas ficam desatualizadas após edição |
| **ScrollingPhrase** | Texto contínuo com variantes `active` (fade in + translateY) e `previous` (opacidade 1.0→0.5). Suporte a **bold** via markdown |
| **Whisper** | Modelo `tiny` (~39MB). Filtros de tokens inválidos. Resample para 16kHz. Apenas IndexedDB |
| **Bridge** | `videoRenderBridge` (Zustand) sincroniza estado de exportação/transcrição/reprodução (currentFrame, isPlaying) entre VideoPage e App |
| **Canvas patch** | `canvasFontStretchPatch` corrige bug `%→keyword` na Canvas API do Remotion. Suporta canvas regular e OffscreenCanvas via `patchPrototype()`. Usa `createLogger` |
| **Resoluções** | `16:9` → 1920x1080, `9:16` → 1080x1920, `1:1` → 1080x1080 |
| **Exportação** | `isExporting` em CompositionConfig desabilita overlays pesados (WaveformOverlay) durante renderização |

### Persistência (Dual Storage)

| | |
|---|---|
| **Arquivos** | `src/lib/db/` (barrel: `src/lib/db.ts` → `src/lib/db/index.ts`) |
| **Padrão** | `userId` presente → Firestore + Storage. `userId` ausente → IndexedDB local |
| **Offline** | `enableIndexedDbPersistence(db)` ativado com fallback silencioso (múltiplas abas) |
| **Queries** | `limit(100)` em todas as listagens Firestore (projects, generations, images, memories, chats, videos) |
| **Upload** | `uploadBytesResumable` para blobs >10MB; `uploadBytes` one-shot para menores |
| **Domínios** | memories, user_settings, generations, image_generations, projects (+subcoleções audios/images/videos), chats, transcriptions, audio_segments |
| **IndexedDB** | `GeminiVoiceStudioDB` v9. Stores: generations, image_generations, projects, audios, project_images, memories, chats, user_settings, videos, transcriptions |
| **Chat fallback** | Se doc >900KB ou erro Firestore, salva no IndexedDB (retorna `true`); `getChatSessions` busca Firestore + IndexedDB e deduplica por `updatedAt`; filtrado por `userId` no merge |
| **Transcriptions** | Apenas IndexedDB (dados temporários por projeto) |
| **Audio segments** | Apenas IndexedDB, campo `audioSegments` dentro de `AudioSource` existente |
| **Admin (Firestore)** | Role-based (`users/{uid}` com `role=='admin'`) OU email hardcoded |
| **Admin (Storage)** | Apenas email hardcoded (leitura + deleção, sem escrita) |
| **Limites Storage** | Áudio 50MB, imagem 10MB, vídeo 200MB. Previews: público (leitura), admin (escrita) |
| **Converter** | `createFirestoreConverter<T>()` genérico remove `undefined` na serialização |

### Assistente IA

| | |
|---|---|
| **Arquivos** | `src/features/assistant/`, `src/features/assistant/components/assistantUi.ts`, `src/hooks/useAssistant.ts` |
| **Modelo** | `gemini-3.1-flash-lite-preview` (streaming via `generateContentStream`) |
| **UI centralizada** | `assistantUi.ts` — 13 estilos exportados (bubbles, composer, drawer, typing, history, empty state, attachment chip, send button); componentes internos importam de `assistantUi` em vez de `tokens.ts` |
| **Empty state** | `EmptyChatState` no AssistantMessages — estado vazio do chat com call-to-action e chips clicáveis com prompts contextuais |
| **Anexos** | 5 por msg. Imagem: 10MB. Documento: 5MB. Enviados como `inlineData` ao Gemini. Exibidos como `Chip` MUI com estilo premium (`assistantAttachmentChipSx`) |
| **System prompt** | Montado dinamicamente: identidade + estrutura TTS + memórias + vozes + pace + estado estúdio + custom settings |
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
| **Arquivos** | `src/features/studio/`, `src/features/studio/store/`, `src/pages/StudioPage.tsx`, `src/components/Inspector.tsx`, `src/components/ScriptEditor.tsx`, `src/components/ActionBar.tsx` |
| **Estado** | `useStudioStore` (Zustand) com `useShallow` para seletores otimizados; `useCurrentStudioState()` deriva `StudioDraftState`; sem hook `useStudioState` (removido na 0.22.0) |
| **Store** | `studioStore.ts` (state + setters + actions), `studio.utils.ts` (localStorage helpers puros + `buildGenerateOptions`), `index.ts` (barrel exports) |
| **Persistência** | 14 preferências no localStorage (prefixo `s2a_`) via `subscribe` + `PERSIST_MAP` (sem middleware persist). `referenceImage` é session-only |
| **Layout** | Grid 2 colunas: Inspector (`xs:12, lg:4`) + ScriptEditor (`xs:12, lg:8`) |
| **ActionBar** | Fixo na parte inferior (z-index 1400). Aparece no estúdio e na página de vídeo. Seletores primitivos do AudioContext (`useAudioIsPlaying`, `useAudioCurrentTime`, `useAudioDuration`) em vez de `useGlobalAudioState` — elimina ~4 re-renders/s |
| **Geração** | `useAudioGenerator` instanciado apenas no `App.tsx`; StudioPage recebe `isGenerating`, `scenes`, `handleGenerate`, `isGenerateDisabled` como props |
| **buildGenerateOptions** | Construtor DRY em `store/studio.utils.ts` — recebe `GenerateOptionsState` (combina `StudioDraftState` + campos de speaker) e userId, retorna opções de geração (usado por App.tsx) |
| **Inspector** | Lê estado diretamente do `useStudioStore` com `useShallow` — recebe apenas `isGenerating` como prop (22→1 prop desde 0.24.5) |
| **ScriptEditor** | Fonte serifada (Georgia), Ctrl+Enter para gerar, highlight de cena ativa no background |
| **Keyboard shortcuts** | `useKeyboardShortcuts`: Ctrl+Enter (gerar), Space (play/pause vídeo e toggle áudio), proteção contra inputs/blocos editáveis focados |

### Biblioteca & Projetos

| | |
|---|---|
| **Arquivos** | `src/components/Library.tsx`, `src/components/video-library/`, `src/lib/db/projects.ts`, `src/lib/db/generations.ts` |
| **Library** | `/biblioteca` — lista projetos expansível com áudios, cenas, roteiro e vídeos |
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
| **Pipeline** | Upload → edge detection (grayscale + diferença adjacente) → clusterização BFS → vetorização → renderização progressiva no canvas Konva. Processamento pesado (edge detection + BFS) via Web Worker inline (Blob URL) — não bloqueia a main thread |
| **Fases** | Sketch (bordas, `layer:0`) → Reveal (coloração com destination-out, `layer:1`) |
| **Canvas** | Offscreen buffer simula "lousa branca". Reveal apaga lousa revelando imagem original |
| **Controles** | Play/pause, seek, velocidade dupla (draw + paint), export PNG (2x) e WebM (H.264 > VP9 > padrão, 12Mbps) |
| **Batch** | Fila de imagens processada sequencialmente. Modos: `watch` (auto-avança 2s) e `record` (grava + avança) |
| **Store** | `useAnimationStore` (Zustand): job, queue, batchMode, progress, speed, paintSpeed |

### Autenticação

| | |
|---|---|
| **Arquivos** | `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/lib/firebase.ts`, `src/lib/db/account-cleanup.ts` |
| **Provider** | Google popup + email/senha + reset de senha + exclusão de conta. `AuthContext` + `useAuth()` — 10 componentes consumidores |
| **Métodos** | `login()` (Google), `signup(email, password)` (criação + verificação de email), `loginWithEmail(email, password)` (login), `resetPassword(email)` (reset, relança erro), `deleteAccount()` (cleanup LGPD + deleteUser), `clearAuthError()` |
| **Exclusão de conta** | Pipeline LGPD: `deleteUser(currentUser)` PRIMEIRO (antes do cleanup) → `deleteAllUserData(userId)` remove projetos + subcoleções, gerações, chats, memórias, settings, Storage objects e IndexedDB local; retorna `string[]` com categorias que falharam; `AuthContext` notifica o usuário via `window.confirm()` sobre falhas parciais; dialog "EXCLUIR" de confirmação no Header |
| **Verificação de email** | `sendEmailVerification()` enviada automaticamente pós-cadastro; `ProtectedRoute` bloqueia acesso a usuários email/senha não verificados (tela com botão "Reenviar email"); Google auto-verifica |
| **COEP conflict** | Login/logout/delete fazem `window.location.href` (full reload) para alternar COEP — popup Firebase precisa de iframes cross-origin |
| **Migração** | Ao logar (transição `null→user`), verifica migração pendente IndexedDB→Firestore via `DataMigrationDialog` |
| **Erros** | Mensagens pt-BR mapeadas por código Firebase (`auth/popup-blocked`, `auth/too-many-requests`, `auth/email-already-in-use`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, `auth/weak-password`, `auth/invalid-email`, `auth/requires-recent-login`) |
| **Estilos compartilhados** | `authTextFieldSx` (TextField dark theme) e `authLinkSx` (link inline hover) definidos em `src/theme/authStyles.ts` (importados por LoginPage e RegisterPage) |

### Environment & COEP

| | |
|---|---|
| **Arquivos** | `src/lib/env.ts`, `src/lib/firebase.ts`, `vite.config.ts`, `firebase.json` |
| **Env vars** | `VITE_GEMINI_API_KEY` (required) + 7 `VITE_FIREBASE_*` (required) + 2 opcionais |
| **Helpers** | `readRequiredEnv()` (lança se ausente), `readOptionalEnv()` (undefined se ausente), `getGeminiApiKey()`, `getFirebaseEnvConfig()` |
| **COEP** | Rotas autenticadas `/app/**`: COOP/COEP habilitados. `/login` e `/cadastro`: SEM COEP (popup Firebase) |
| **Offline** | `enableIndexedDbPersistence(db)` com fallback silencioso para múltiplas abas |
| **Dev** | `coepPlugin()` via middleware Vite — exceção `/login` e `/cadastro` |
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
| **Manifest** | Ícones 192/512, `theme_color` #0a0a0f, `display: standalone` |
| **Workbox** | Runtime caching para assets estáticos (1 ano) e Google Fonts (30 dias) |
| **Registro** | Apenas em produção (`import.meta.env.PROD`), `immediate: true` |
| **Exceções** | `/login` e `/cadastro` em `navigateFallbackDenylist` (sem COEP, não interceptado pelo SW) |

### Logger, Error Mapping & Rate Limiter

| | |
|---|---|
| **Arquivos** | `src/lib/logger.ts`, `src/lib/error-mapping.ts`, `src/lib/rate-limiter.ts` |
| **Logger** | `createLogger('context')` com níveis debug/info/warn/error. `debug` e `info` suprimidos em produção (`import.meta.env.PROD`) |
| **Error mapping** | `createErrorMapper(config)` genérico com `ErrorMappingRule[]` por domínio. `sharedErrorRules` comuns (quota, API key, unavailable). `handleFirestoreError` preserva causa original via `{ cause: error }` |
| **Rate limiter** | `withRetry<T>(fn, config?)` — genérico, reutilizável. Detecta `ApiError.status` + keywords em mensagens |

---

## Version

- **Current:** `0.24.5`
- **Last release:** 2026-04-27

### Últimas mudanças (atualizado por /fast)

> **Regra:** manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga.

| Versão | Resumo |
|--------|--------|
| 0.24.5 | Dupla instância `useAudioGenerator` corrigida (CRÍTICO — StudioPage desconectado do ActionBar); imagens de cena LGPD com path correto; galeria exibe vídeos exportados; race condition no `useVideoExporter`; `deleteUser` antes do cleanup LGPD; email verification gate no ProtectedRoute; Firestore offline persistence; `Promise.all` no assistente; `retryLastMessage`; `deleteChatSession` dual-delete; `Inspector` 22→1 prop; ActionBar seletores primitivos; `SpeedPaintControls` props primitivas; 3 CTAs para `/cadastro`; link Contato no header; tabela semântica PricingPage; FAQAccordion a11y; `searchFieldSx` extraído; `deleteChatSession` dual-delete; dead code cleanup (11 exports, 1 dep, 4 animations); `limit(100)` em todas as queries; upload resumável >10MB; `transaction.oncomplete` no IndexedDB |
| 0.24.4 | `react-helmet-async` removido — migrado para SEO nativo do React 19 (`<title>`, `<meta>`, `<link>` com hoisting automático); `DocumentHead` componente em `src/components/DocumentHead.tsx`; interfaces próprias `SeoMeta`/`SeoLink`/`SeoData` em `seo.ts`; `HelmetProvider` removido do `main.tsx`; 14 páginas migradas |
| 0.24.3 | IndexedDB cleanup LGPD na exclusão de conta; TTS retry 500; chat sessions merge Firestore+IndexedDB; chat save fallback IndexedDB; EmptyChatState funcional (welcome-only detection); botão Parar do composer conectado; migração com retry em erros parciais; batch download com falha individual; upload >10MB com feedback; truncamento de documento com aviso; beforeunload durante geração/exportação; SEO no LoginPage; authBenefits DRY; skip-to-content/id duplicados removidos; Whisper docs tiny; contactPage window.open |
| 0.24.2 | 3 CRITICAL bugs LGPD corrigidos (vídeo/imagens de cena nunca deletados); stale closure em `useAudioGenerator` (refs espelhadas); race condition no `useVideoExporter`; WaveformOverlay frame absoluto; MediaRecorder e blob URL cleanup; ActionBar throttle corrigido; streaming assistant batched via RAF; SubtitleOverlay memoizado; AnimationPlayer progress throttled; imageProcessing movido para Web Worker; cancelamento de geração de imagem; download IndexedDB; chips clicáveis no empty state; tokens hardcoded migrados (5 locais); authStyles.ts extraído (DRY); bgcolor→background em FeatureShowcase/FeatureCard; classes MUI v9 atualizadas no FaqPage |
| 0.24.1 | `exportFileName` movido do estado para ref (evita perda em reset); feedback visual de renderização antecipado; `speedPaintWarnings` preservado entre `setState` calls; `estimateFileSize` realinhado ao mediabunny (3 Mbps base, escala pow 0.95, codecs avc/hevc/av1); caption toggle sempre visível no VideoPage |
