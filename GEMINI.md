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
```

**Sem formatter e sem CI/CD.**

## Stack

- **React 19** + **Vite 8** + **react-router-dom v7** (lazy loading por rota)
- **MUI v9** — tema em `src/theme/*`, sem Tailwind
- **@google/genai** (cliente direto) — TTS, imagens, prompts de cena
- **Firebase** — Auth + Firestore + Storage + IndexedDB (dual storage)
- **Remotion 4.0.448** — renderização de vídeo client-side (WebCodecs, Whisper WASM para legendas)
- **Zustand** (estado) | **Konva** (canvas) | **react-dropzone** (upload)
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
| `/features` | FeaturesPage | Não |
| `/login` | LoginPage | Não |
| `/app/estudio` | StudioPage | Sim |
| `/app/video` | VideoPage | Sim |
| `/app/assistant` | AssistantPage | Sim |
| `/app/library` | LibraryPage | Sim |
| `/app/speed-paint` | SpeedPaintPage | Sim |
| `/app/image` | ImageStudio | Sim |
| `/app` | Redirect → `/app/estudio` | — |

---

## Domínios

### Audio & TTS

| | |
|---|---|
| **Arquivos** | `src/pages/public/`, `src/components/public/` |
| **LandingPage** | `/` — hero com CTA, social proof bar, 6 feature cards, 3 feature showcases, seção "como funciona" (3 steps), CTA final |
| **FeaturesPage** | `/features` — 6 seções categorizadas (Áudio, Vídeo, Imagem, Assistente, Biblioteca, Speed Paint) com deep dives |
| **Componentes** | 10 componentes em `src/components/public/`: PublicHeader (AppBar responsivo com drawer mobile), PublicFooter, PageLayout (shell), HeroSection, FeatureCard, FeatureShowcase, CTASection, StepCard, SocialProofBar, barrel `index.ts` |
| **Assets** | 8 imagens em `public/images/public/` (hero, features, CTA) geradas via Gemini |
| **SEO** | Open Graph, Twitter Cards, Schema.org Organization, canonical URL, theme-color |
| **Páginas autenticadas** | Prefixo `/app/` em todas as rotas protegidas (`/app/estudio`, `/app/video`, etc.) |

### Áudio & TTS
| **Chunking** | Se >500 chars, `gemini-lite` divide via JSON output. Fallback: `splitTextProgrammatically` por sentenças |
| **Continuidade** | A partir do chunk 2, injeta "TAKES CONTÍNUOS" no prompt para manter tom/energia consistentes |
| **Multi-speaker** | Quando ativo, `speechConfig` usa `multiSpeakerVoiceConfig` com 2 locutores (Speaker A + B) |
| **Retry** | `withRetry`: 3 tentativas, 1500ms base, 500ms jitter. 429/503/504 retryam; 400/403/404 falham imediato |
| **WAV** | 24kHz mono 16-bit PCM, header 44 bytes. PCM extraído se Gemini retornar com header embutido |
| **Limites** | `MAX_CHARS=50000` (roteiro), `CHUNK_LIMIT=500` (por chamada TTS) |
| **Segmentos** | `AudioSegment` persiste chunk→timestamp no IndexedDB (fire-and-forget). Duração: `pcm.length / 48000` |
| **Cancelamento** | `cancelRef` checado antes de cada chunk; estado anterior restaurado via `lastSuccessfulStateRef` |
| **Detecção de silêncio** | `detectSceneBoundaries()` via RMS no áudio real. Calibra threshold em até 3 iterações |
| **Voice previews** | Arquivos WAV estáticos em `/voice-previews/{voiceId}.wav`. Hook: `useVoicePreviews` |
| **AudioContext selectors** | `useAudioIsPlaying()`, `useAudioCurrentTime()`, `useAudioDuration()`, `useAudioProgress()`, `useAudioActiveId()` — hooks seletivos para re-render otimizado |

### Geração de Imagens

| | |
|---|---|
| **Arquivos** | `src/hooks/useImageGenerator.ts`, `src/lib/gemini.ts`, `src/components/ImageStudio.tsx` |
| **Pipeline** | prompt (opcional + referência) → Gemini via `withRetry` → extrai `inlineData` → base64ToBlob → blob URL |
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
| **Estilo de legendas** | `SubtitleStyle` + `DEFAULT_SUBTITLE_STYLE` configuram fontSize, padding, borderRadius, opacity, gap, verticalOffset. `SubtitleInlineEditor` editor inline via portal |
| **Staleness** | Hash SHA-256 do roteiro detecta quando legendas ficam desatualizadas após edição |
| **ScrollingPhrase** | Texto contínuo com variantes `active` (fade in + translateY) e `previous` (opacidade 1.0→0.5). Suporte a **bold** via markdown |
| **Whisper** | Modelo `base` (~75MB). Filtros de tokens inválidos. Resample para 16kHz. Apenas IndexedDB |
| **Bridge** | `videoRenderBridge` (Zustand) sincroniza estado de exportação/transcrição/reprodução (currentFrame, isPlaying) entre VideoPage e App |
| **Canvas patch** | `canvasFontStretchPatch` corrige bug `%→keyword` na Canvas API do Remotion. Suporta canvas regular e OffscreenCanvas via `patchPrototype()`. Usa `createLogger` |
| **Resoluções** | `16:9` → 1920x1080, `9:16` → 1080x1920, `1:1` → 1080x1080 |
| **Exportação** | `isExporting` em CompositionConfig desabilita overlays pesados (WaveformOverlay) durante renderização |

### Persistência (Dual Storage)

| | |
|---|---|
| **Arquivos** | `src/lib/db/` (barrel: `src/lib/db.ts` → `src/lib/db/index.ts`) |
| **Padrão** | `userId` presente → Firestore + Storage. `userId` ausente → IndexedDB local |
| **Domínios** | memories, user_settings, generations, image_generations, projects (+subcoleções audios/images/videos), chats, transcriptions, audio_segments |
| **IndexedDB** | `GeminiVoiceStudioDB` v9. Stores: generations, image_generations, projects, audios, project_images, memories, chats, user_settings, videos, transcriptions |
| **Chat fallback** | Se doc >900KB, salva apenas no IndexedDB (limite seguro Firestore ~1MB) |
| **Transcriptions** | Apenas IndexedDB (dados temporários por projeto) |
| **Audio segments** | Apenas IndexedDB, campo `audioSegments` dentro de `AudioSource` existente |
| **Admin (Firestore)** | Role-based (`users/{uid}` com `role=='admin'`) OU email hardcoded |
| **Admin (Storage)** | Apenas email hardcoded (leitura + deleção, sem escrita) |
| **Limites Storage** | Áudio 50MB, imagem 10MB, vídeo 200MB. Previews: público (leitura), admin (escrita) |
| **Converter** | `createFirestoreConverter<T>()` genérico remove `undefined` na serialização |

### Assistente IA

| | |
|---|---|
| **Arquivos** | `src/features/assistant/`, `src/hooks/useAssistant.ts` |
| **Modelo** | `gemini-3.1-flash-lite-preview` (streaming via `generateContentStream`) |
| **System prompt** | Montado dinamicamente: identidade + estrutura TTS + memórias + vozes + pace + estado estúdio + custom settings |
| **Modo estúdio** | Quando `currentState` fornecido, inclui estado completo + instrui modelo a sugerir alterações em bloco JSON |
| **JSON extraction** | Bloco ` ```json ` na resposta → `extractJsonSettings()` → botão "Aplicar no estúdio" (patch parcial) |
| **Memórias** | Injetadas no system prompt. Curta: texto direto. Upload: `.md/.txt/.csv` até 500KB (truncado 490K chars) |
| **Anexos** | 5 por msg. Imagem: 10MB. Documento: 5MB. Enviados como `inlineData` ao Gemini |
| **Auto-save** | Salva sessão ao final de cada resposta (quando `isStreaming` → `false`). Título: primeiros 40 chars da primeira msg |
| **Abort** | Novo envio aborta chamada anterior. Desmontagem aborta em andamento |

### Estúdio de Produção

| | |
|---|---|
| **Arquivos** | `src/features/studio/`, `src/pages/StudioPage.tsx`, `src/components/Inspector.tsx`, `src/components/ScriptEditor.tsx`, `src/components/ActionBar.tsx` |
| **Estado** | `useStudioState()` centralizado em App.tsx, propagado via Pick para componentes |
| **Persistência** | 14 preferências no localStorage (prefixo `s2a_`). `referenceImage` é session-only |
| **Layout** | Grid 2 colunas: Inspector (`xs:12, lg:4`) + ScriptEditor (`xs:12, lg:8`) |
| **ActionBar** | Fixo na parte inferior (z-index 1400). Aparece no estúdio e na página de vídeo |
| **Geração** | `handleGenerate` coleta `currentState` e delega para `useAudioGenerator.generateAudio()` |
| **ScriptEditor** | Fonte serifada (Georgia), Ctrl+Enter para gerar, highlight de cena ativa no background |
| **Keyboard shortcuts** | `useKeyboardShortcuts`: Ctrl+Enter (gerar), Space (play/pause vídeo e toggle áudio), proteção contra inputs/blocos editáveis focados |

### Biblioteca & Projetos

| | |
|---|---|
| **Arquivos** | `src/components/Library.tsx`, `src/components/VideoLibrary.tsx`, `src/lib/db/projects.ts`, `src/lib/db/generations.ts` |
| **Library** | `/biblioteca` — lista projetos expansível com áudios, cenas e roteiro |
| **VideoLibrary** | `/video` (abaixo do player) — galeria horizontal com seleção rápida + batch download |
| **Projetos** | Firestore usa subcoleções: `projects/{id}/audios`, `projects/{id}/images`, `projects/{id}/videos` |
| **Gerações** | Coleção flat `generations`. Storage: `audios/{userId}/{id}.wav`, cenas em `generations_images/` |
| **Download** | `downloadFile()`: blob/data URLs direto, remotas via fetch→blob, fallback abre no browser |
| **Blob cleanup** | Library usa `useRef<string[]>`. VideoLibrary usa `Set<string>` com revogação automática |

### Speed Paint & Animação

| | |
|---|---|
| **Arquivos** | `src/features/speed-paint/` |
| **Pipeline** | Upload → edge detection (grayscale + diferença adjacente) → clusterização BFS → vetorização → renderização progressiva no canvas Konva |
| **Fases** | Sketch (bordas, `layer:0`) → Reveal (coloração com destination-out, `layer:1`) |
| **Canvas** | Offscreen buffer simula "lousa branca". Reveal apaga lousa revelando imagem original |
| **Controles** | Play/pause, seek, velocidade dupla (draw + paint), export PNG (2x) e WebM (H.264 > VP9 > padrão, 12Mbps) |
| **Batch** | Fila de imagens processada sequencialmente. Modos: `watch` (auto-avança 2s) e `record` (grava + avança) |
| **Store** | `useAnimationStore` (Zustand): job, queue, batchMode, progress, speed, paintSpeed |

### Autenticação

| | |
|---|---|
| **Arquivos** | `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/LoginPage.tsx`, `src/lib/firebase.ts` |
| **Provider** | Google popup only. Sem email/senha. `AuthContext` + `useAuth()` — 9 componentes consumidores |
| **COEP conflict** | Login/logout fazem `window.location.href` (full reload) para alternar COEP — popup Firebase precisa de iframes cross-origin |
| **Migração** | Ao logar (transição `null→user`), verifica migração pendente IndexedDB→Firestore via `DataMigrationDialog` |
| **Erros** | Mensagens pt-BR mapeadas por código Firebase (`auth/popup-blocked`, `auth/too-many-requests`, etc.) |

### Environment & COEP

| | |
|---|---|
| **Arquivos** | `src/lib/env.ts`, `src/lib/firebase.ts`, `vite.config.ts`, `firebase.json` |
| **Env vars** | `VITE_GEMINI_API_KEY` (required) + 7 `VITE_FIREBASE_*` (required) + 2 opcionais |
| **Helpers** | `readRequiredEnv()` (lança se ausente), `readOptionalEnv()` (undefined se ausente), `getGeminiApiKey()`, `getFirebaseEnvConfig()` |
| **COEP** | Rotas autenticadas `/app/**`: COOP/COEP habilitados. `/login`: SEM COEP (popup Firebase) |
| **Dev** | `coepPlugin()` via middleware Vite — exceção `/login` |
| **Prod** | Headers em `firebase.json` (COEP em `/app/**` + `/404.html`). SPA rewrite: `**` → `/index.html` |
| **Razão** | `SharedArrayBuffer` necessário para Whisper WASM e Remotion |
| **Segurança** | `VITE_GEMINI_API_KEY` exposta no bundle (aceito por contexto privado). Segurança dos dados via Firestore/Storage Rules |

### UI & Theme

| | |
|---|---|
| **Arquivos** | `src/theme/appTheme.ts`, `src/theme/tokens.ts`, `src/theme/surfaces.ts`, `src/theme/linkBehavior.tsx`, `src/index.css` |
| **Stack** | MUI v9 + Emotion. `StyledEngineProvider` com `enableCssLayer`. CSS layers: `theme, base, mui, components, utilities` |
| **Modo** | Dark only na prática (light existe com palette idêntica). Font: Inter (sans), JetBrains Mono (mono), Playfair Display (serif) |
| **Tokens** | `tokens.ts`: brand (blue/orange), semantic (success/error/warning), text opacidades, surfaces (5 níveis), glow (3 níveis), gradients |
| **Surfaces** | `glassPanelSx` (blur+gradiente+shadow), `insetPanelSx` (recessado), `glassSurfaceSx` (blur fixo) — todas em `surfaces.ts` |
| **Component overrides** | AppBar (glass/blur), Button (radius 14, no elevation), Card (surface elevated), Alert (semirtransparente) |
| **Links** | `LinkBehavior` auto-via `defaultProps` em `MuiLink` e `MuiButtonBase` |
| **CSS global** | Apenas `index.css`: scrollbar custom (4px), utilities `.no-scrollbar`, `.glass-panel`, `.text-gradient`, `.accent-gradient` |
| **Layout** | Container `maxWidth: 1600px`. Padding responsivo. `/assistant` e `/login` sem Container |

### PWA

| | |
|---|---|
| **Arquivos** | `vite.config.ts` (plugin VitePWA), `src/main.tsx` (registro SW) |
| **Manifest** | Ícones 192/512, `theme_color` #0a0a0f, `display: standalone` |
| **Workbox** | Runtime caching para assets estáticos (1 ano) e Google Fonts (30 dias) |
| **Registro** | Apenas em produção (`import.meta.env.PROD`), `immediate: true` |
| **Exceções** | `/login` em `navigateFallbackDenylist` (sem COEP, não interceptado pelo SW) |

### Logger & Rate Limiter

| | |
|---|---|
| **Arquivos** | `src/lib/logger.ts`, `src/lib/rate-limiter.ts` |
| **Logger** | `createLogger('context')` com níveis debug/info/warn/error. `debug` e `info` suprimidos em produção (`import.meta.env.PROD`) |
| **Rate limiter** | `withRetry<T>(fn, config?)` — genérico, reutilizável. Detecta `ApiError.status` + keywords em mensagens |

---

## Version

- **Current:** `0.17.0`
- **Last release:** 2026-04-24

### Últimas mudanças (atualizado por /fast)

| Versão | Resumo |
|--------|--------|
| 0.17.0 | LandingPage + FeaturesPage + 10 componentes públicos; paleta blue/orange; PWA base (vite-plugin-pwa); SEO (OG, Twitter, Schema.org); keyboard shortcuts hook; AudioContext selectors; 77 testes novos (total: 857); COEP simplificado em /app/**; prefixo /app/ em rotas autenticadas |
| 0.16.1 | Estado do player centralizado no videoRenderBridge (currentFrame/isPlaying); ActionBar/VideoPreview/CaptionEditorPanel consomem bridge; VideoPage remove estado local; frameToSeconds/secondsToFrame; testes de bridge, sticky fallback e conversão de frames |
| 0.16.0 | Suite de testes Vitest completa (62 testes cobrindo todas as áreas); scripts test/test:watch; vitest.config com jsdom + fake-indexeddb; correção da lógica do logger em produção; normalização de bold markdown no subtitleUtils |
| 0.15.0 | Navigation drawer mobile no Header; CaptionEditorPanel redesign com PhraseCard; botão copiar no ScriptEditor e AssistantMessages; stopGeneration no useAssistant; CaptionPhrase type; dialogs de exclusão em VideoLibrary e Assistant; MAX_STYLE_NOTES no Inspector |
| 0.14.2 | Otimização de exportação: WaveformOverlay pula SVG durante exportação (isExporting); throttle de progresso no useVideoExporter; canvasFontStretchPatch refatorado com logger e suporte a OffscreenCanvas |
| 0.14.1 | Limites dinâmicos de verticalOffset no SubtitleInlineEditor (resolução-aware); docstring corrigida (positivo=sobe); downgrade Whisper base→tiny (~39MB) |
| 0.14.0 | SubtitleInlineEditor — editor inline de estilo de legendas (fontSize, padding, borderRadius, opacity, gap, verticalOffset); SubtitleStyle + DEFAULT_SUBTITLE_STYLE; getAlignment no SubtitleOverlay; limpeza de código morto (SubtitleMode, AnimatedWord, VisiblePhrase) |
| 0.13.3 | ScrollingPhrase reescrito — karaoke substituído por texto contínuo com variantes active/previous; SubtitleOverlay mostra frase ativa + anterior em vez de ativa + próxima |
| 0.13.2 | Galeria de imagens no ImageStudio com exclusão; busca na Biblioteca e histórico do assistente; deleteGeneration (Firestore+Storage+IndexedDB); audio segments dual storage (Firestore+IndexedDB); bug fix ordem de persistência de segmentos (GAP-001) |
| 0.13.1 | AGENTS.md reestruturado com documentação por domínio inline (12 seções), adições de anti-patterns e rotas; 12 guias externos removidos (docs/guides/) |
| 0.13.0 | 6 novos guias (assistant, speed-paint, studio, library, auth, gemini-integration), 4 guias corrigidos (22 inconsistências), deleteImageGeneration, saveChatSession com fallback IndexedDB, countIndexedDbItems, errorId em useVoicePreviews, blob URL cleanup |
| 0.12.0 | LoginPage dedicada, ProtectedRoute, rota /estudio (era /), COEP em produção via firebase.json, coepPlugin simplificado no Vite, 5 guias corrigidos (26 inconsistências) |
| 0.11.2 | Plugin condicional COEP (?coep=1) no dev server, resolve conflito Firebase Auth vs SharedArrayBuffer; referrerPolicy no Header Avatar; correção de encoding nas mensagens de auth |
| 0.11.1 | 5 novos tokens de tema (ERROR_BG_SUBTLE, ERROR_BG_MEDIUM, WARNING_BG_SUBTLE, WHITE_01, GLASS_BG), 12 componentes migrados de cores hardcoded para tokens, 6 guias corrigidos (47 inconsistências) |
| 0.11.0 | Logger centralizado (createLogger), CaptionEditorPanel com split/merge de legendas, persistência de segmentos de áudio (AudioSegment), detecção de silêncio via RMS, hash de roteiro (staleness), alinhamento script→legendas via segmentos TTS, CaptionSource type |
| 0.10.1 | WarningToast, loading states no assistente, auto-save respeita isStreaming, tratamento de autoplay em previews, labels dinâmicos no exportador, withRetry em generateScenePrompts, ScenePromptResult, limpeza de código legado |
| 0.10.0 | TranscriptionPanel dedicado, refatoração do pipeline Whisper (model tiny-en, idioma auto, @remotion/captions), WaveformOverlay com frame relativo, ScrollingPhrase centralizado, 3 logos WebP, 6 guias atualizados |
| 0.9.0 | Remoção completa do plano de edição IA — fade in/out padrão em todas as cenas, sem análise de áudio/visual para edição, sem inspetor, sem TitleOverlay. Documentação atualizada em 4 guias. Rate limiter reutilizável, RoutableErrorBoundary, getImageGenerations |
| 0.8.4 | Transcrição automática de legendas via Whisper WASM, dois modos de legenda (scroll-phrases, word-karaoke), ScrollingPhrase, subtitleUtils, persistência de transcrições, headers COOP/COEP, @remotion/captions + @remotion/whisper-web, Remotion 4.0.448 |
| 0.8.3 | Limpeza de código morto (10 funções), patch font-stretch Canvas, truncamento de roteiro + limite de imagens para Gemini, reutilização de análise de áudio, menu mobile de velocidade, progresso no download em lote, detecção de JSON malformado no assistente, Snackbar no AnimationControls, Remotion 4.0.450, dedupe no Vite |
| 0.8.2 | NotFoundPage, ErrorBoundary, DataMigrationDialog, rate limiter, migração IndexedDB→Firestore, cursor animado no assistente, `isStreaming`, fallback VP8/WebM no exportador, tratamento de erros contextualizado, 6 guias em `docs/guides/` |
| 0.8.1 | Unificação do modelo de imagem para `gemini-3.1-flash-image-preview`; reestruturação da documentação em `docs/guides/` (6 guias); remoção de scripts de preview |
| 0.8.0 | WaveformOverlay, karaoke palavra-a-palavra nas legendas, análise visual de cenas, transições com spring, deps Remotion |
