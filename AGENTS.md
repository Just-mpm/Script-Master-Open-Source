# AGENTS.md — Script Master

## Visão Geral

SPA em React + Vite para transformar roteiros em áudio com Gemini TTS, geração opcional de imagens/cenas, renderização de vídeo com Remotion, biblioteca de projetos, assistente conversacional e internacionalização (3 idiomas).

Firebase Hosting (frontend) + Firebase Cloud Functions v2 (backend serverless quando necessário).

**Modelo de monetização:** **BYOK (Bring Your Own Key)** — open source, sem Stripe, sem billing, sem sistema de créditos. O usuário fornece sua própria API key do Gemini (Google AI Studio) e paga diretamente ao Google pelo uso. Toda chamada de IA passa pelo backend que recebe a key no payload via `providerAuth`.

**Domínio oficial de produção:** `https://script-master.pro`

## Comandos

```bash
bun run dev              # Vite em http://localhost:3000
bun run build            # lint + typecheck + build de produção (~1s, sem pre-render)
bun run build:full       # build + pre-render das 10 rotas públicas (~25s, para deploy)
bun run lint             # ESLint 10 (flat config)
bun run lint:fix         # ESLint com autocorreção
bun run typecheck        # tsc -b
bun run test             # Vitest (execução única)
bun run test:watch       # Vitest (watch mode)
bun run preview          # serve build localmente
bun run clean            # remove dist/
bun run deploy           # build:full + functions build + firebase deploy (completo)
bun run deploy:hosting   # build:full + firebase deploy --only hosting
bun run deploy:firestore # deploy apenas das regras e indexes do Firestore
bun run deploy:storage   # deploy apenas das regras do Storage
bun run deploy:functions # build functions + deploy das Cloud Functions
bun run deploy:preview   # build:full + firebase hosting:channel:deploy preview
bun run emulators        # inicia emuladores conforme flags VITE_EMULATOR_* no .env
bun run emulators:all    # força TODOS os emuladores (ignora .env)
bun run emulators:functions # inicia apenas o emulador de functions
bun run emulators:ui     # inicia apenas a UI dos emuladores
bun run export-error-logs # exporta logs de erros do Firestore (script CLI)
```

**Admin scripts (dentro de `functions/`):** `npm run grant-access` — concede flag `admin: true` no custom claim do Firebase Auth.

**Sem formatter e sem CI/CD.**

## Stack

- **React 19** + **Vite 8** + **react-router-dom v7** (lazy loading por rota)
- **MUI v9** — tema em `src/theme/*`, sem Tailwind
- **Genkit** (backend via Cloud Functions) — TTS, imagens, prompts de cena, assistente, chunking
- **Firebase** — Auth + Firestore + Storage + IndexedDB (dual storage) + App Check (reCAPTCHA v3) | `firebase-tools` ^15.3.0 (deploy)
- **Firebase Cloud Functions v2** — backend serverless com Genkit, BYOK (sem Stripe/billing)
- **BYOK (Bring Your Own Key)** — usuário fornece sua própria API key do Gemini via `ProviderSettings` (IndexedDB local). A key é passada em cada chamada via `providerAuth` no payload do callable. O backend usa `googleAI({ apiKey: false })` e injeta a key por chamada via `config: { apiKey }`. Helpers em `functions/src/genkit/utils/byok.ts` (`extractApiKey`, `withApiKey`, `maskApiKeyForLog`).
- **Remotion 4.0.448** — renderização de vídeo client-side (WebCodecs, Whisper WASM para legendas)
- **Zustand** (estado) | **Motion** (animações, swipe/drag) | **@dnd-kit/react** (drag-and-drop) | **react-dropzone** (upload) | **react-hot-toast** (toasts)
- **Vitest 4** + **@testing-library/react** — testes unitários e de componentes
- **vite-plugin-pwa** — service worker + manifest para instalação como app
- **puppeteer-core** — pre-renderização das 10 rotas públicas via Chrome do sistema (`scripts/prerender.mjs`)

## Modelos Gemini

| Modelo | Uso |
|--------|-----|
| `gemini-3.1-flash-tts-preview` | Text-to-speech |
| `gemini-3.1-flash-image-preview` | Geração de imagens |
| `gemini-3.1-flash-lite` | Chunking de roteiros, prompts de cena, chat do assistente (modo `fast`) |
| `gemini-3.5-flash` | Chat do assistente (modo `specialist`) |

## Convenções

- **Idioma:** pt-BR (default), en e es na UI via i18n; comentários em pt-BR; inglês nos prompts de imagem
- **Logger:** Use `createLogger('context')` de `src/lib/logger` — import relativo, nunca `@/`. Sistema modular com error tracking em produção (Firestore `errorLogs`), sanitização automática, batch processor e interceptação global. `initErrorTracking()` chamado em `main.tsx`. `debug`/`info` suprimidos em produção; `warn`/`error`/`fatal` enviados ao Firestore. Configurado via `VITE_LOGGER_ENABLED`, `VITE_LOGGER_MIN_LEVEL`, `VITE_LOGGER_SEND_IN_DEV`. **Timestamp:** `Date.now()` do cliente em vez de `serverTimestamp()` (Firestore sentinel) — evita edge cases de permissão em regras v2 e facilita correlação com horário local para debug. Validação em `firestore.rules` com `is number`.
- **Backend:** Firebase Cloud Functions v2 (callable ou HTTP). Sem rotas `/api/*` no frontend
- **Rotas:** lazy loading por rota, páginas em `src/pages/`
- **HMR:** não altere `DISABLE_HMR` em `vite.config.ts` — usado por AI Studio
- **Dual Storage:** `userId` presente → Firestore + Storage. Ausente → IndexedDB local

## Anti-patterns

- Não use Tailwind ou CSS modules — MUI v9 é a stack única de UI
- Não remova COEP sem motivo — necessário para SharedArrayBuffer (Whisper + Remotion)
- Não use `process.env` — leia env vars via `import.meta.env` ou `src/lib/env.ts`
- Não chame o Gemini diretamente do frontend — todas as chamadas de IA passam por Cloud Functions via Genkit (`httpsCallable`)

## Rotas

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/` | LandingPage | Visitante |
| `/funcionalidades` | FuncionalidadesPage | Público |
| `/open-source` | OpenSourcePage | Público |
| `/perguntas-frequentes` | FaqPage | Público |
| `/contato` | ContactPage | Público |
| `/sobre` | AboutPage | Público |
| `/termos` | TermsPage | Público |
| `/privacidade` | PrivacyPage | Público |
| `/cookies` | CookiesPage | Público |
| `/auth/action` | AuthActionPage | Público |
| `/login` | LoginPage | Visitante (GuestRoute) |
| `/cadastro` | RegisterPage | Visitante (GuestRoute) |
| `/onboarding` | OnboardingPage | Público (sem COEP) |
| `/app/estudio` | StudioPage | Autenticado |
| `/app/video` | VideoPage | Autenticado |
| `/app/imagens` | ImageStudio | Autenticado |
| `/app/pintura-rapida` | SpeedPaintPage | Autenticado |
| `/app/assistente` | AssistantPage | Autenticado |
| `/app/biblioteca` | LibraryPage | Autenticado |
| `/app/projeto/novo` | ManualProjectPage | Autenticado |
| `/app/configuracoes` | ConfiguracoesPage | Autenticado |
| `/app` | Redirect → `/app/assistente` | — |

**Visitante** = GuestRoute: visitantes veem, logados redirecionam para `/app/assistente`.
**Público** = sem restrição. **Autenticado** = ProtectedRoute.

---

## Domínios

### App Shell & Router
`App.tsx` (~305 linhas): providers (Router, Auth, I18n, AudioContext), `AudioGenerationHandler`, `Sidebar` (mdUp, colapsável 68px/264px), `MobileBottomNav` (mdDown), `GuestMobileNav` (drawer visitantes), `FeedbackController`, `PwaUpdatePrompt`, `PwaInstallPrompt`, `ExportCrossRouteToast` (snackbar global de progresso cross-route), `useCrossRouteRenderGuard` (beforeunload/visibilitychange/title dinâmico). Router: lazy loading por rota, `ProtectedRoute` p/ rotas autenticadas, `GuestRoute` p/ `/`, `/login`, `/cadastro`. `ErrorBoundary` em `src/components/ErrorBoundary.tsx` com integração ao logger (error tracking). Redirects de compatibilidade (9 rotas) em `Redirects.tsx`. Store Zustand `useSidebarStore` com persistência localStorage do estado collapsed/expanded.

### Páginas Públicas
9 páginas em `src/pages/public/` (Landing, Funcionalidades, OpenSource, FAQ, Contato, Sobre, Termos, Privacidade, Cookies). 17 componentes em `src/components/public/`. SEO via React 19 nativo: `DocumentHead` + `seo.ts` (OG, Twitter Cards, canonical, sitemap.xml, robots.txt). Logos em `src/assets/logos.ts`. Domínio prod: `script-master.pro`.

### SEO / AEO / GEO
Pre-renderização das 10 rotas públicas via `scripts/prerender.mjs` (puppeteer-core + Chrome do sistema). Dispara em `bun run build:full` após vite build — gera HTML estático com tags SEO completas em `dist/{route}/index.html`. `DocumentHead` dispara flag `window.__PRERENDER_READY` para sinalizar quando capturar. `seo.ts` gera: title, meta description, canonical, hreflang (pt-BR, en, es, x-default), Open Graph completo (image 1200x630, width/height/alt, locale, locale:alternate), Twitter Cards, JSON-LD (SoftwareApplication com offers, WebPage, BreadcrumbList). Arquivos estáticos: `public/llms.txt` + `public/llms-full.txt` (para ChatGPT/Claude/Perplexity), `public/robots.txt` (Allow llms.txt, Llms-txt directive), `public/sitemap.xml`. Favicon: `.ico` (16+32+48) + `.webp` + `apple-touch-icon.png` (180x180).

### Marketing Demo Video
Composição Remotion para demonstração visual do produto na LandingPage. `MarketingDemoComposition.tsx` (+659 linhas): layout responsivo (desktop 1280×720 / mobile 720×1280), tipografia gradiente, exibição de funcionalidades em timeline animada. `MarketingDemoPlayer.tsx` (+165 linhas): wrapper `@remotion/player` com `useMediaQuery` para breakpoint responsivo, lazy loading via `React.lazy` + `Suspense` na `LandingPage.tsx`. 3 arquivos em `src/features/public-demo-video/`. Fallback visual `HeroDemoFallback` enquanto o player não carrega.

### Áudio & TTS
TTS via Genkit flow `audio.ts` — chunking automático (>500 chars), multi-speaker (2 vozes), detecção de silêncio, voice previews WAV estáticos. Hook frontend: `useAudioGenerator`. **BYOK:** o flow recebe `providerAuth.apiKey` no payload e a injeta via `config: { apiKey }` em cada `ai.generate()`. Limites: 25K chars/roteiro, 500 chars/chamada TTS. Cloud Function com `memory: '512MiB'` via `setGlobalOptions` para suportar roteiros grandes (~273 MiB observado em produção).

### Geração de Imagens
Geração via Genkit flow `images.ts`. Prompts de cena via `scene-prompts` (saída textual JSON, não imagens). Aspect ratios: 8 (estúdio) / 5 (cenas) / 3 (vídeo). Frameworks visuais: `general` ou `whiteboard`. StockMediaPicker com Pexels API (fallback local).

### Vídeo (Remotion)
Renderização client-side via WebCodecs com fallback de codec (H.264+AAC → H.264 → VP8+Opus+WebM). Legendas: pipeline 3 fontes (segment-timing > whisper-aligned > proportional). Speed Paint: edge detection + BFS + renderização Remotion com fases sketch/reveal. Timings centralizados em `speedPaintTimings.ts` (`DEFAULT_SPEED_PAINT_HOLD_SECONDS=3s`, `DURATION_BASED_SKETCH_RATIO=0.8`). Web Worker inline para >5 cenas. Cache LRU (SHA-256, 20 entradas). Export quality: 720p–4K.

**Renderização Cross-Route:** controllers Zustand singleton (`videoRenderController.tsx` + `speedPaintRenderController.tsx`) substituem hooks inline — o ciclo de vida do `renderMediaOnWeb` vive fora do React (AbortController em escopo de módulo, lazy import `@remotion/web-renderer`). `ExportCrossRouteToast.tsx` mostra progresso/erro/conclusão em qualquer rota. `useCrossRouteRenderGuard.ts` centraliza `beforeunload`, `visibilitychange` e `document.title`. Hooks fachada (`useVideoExporter.tsx`, `useSpeedPaintExporter.tsx`) delegam toda lógica aos controllers — `useEffect` cleanup que abortava render no unmount foi removido. `useCodecSupport` permanece local (detecção de codec é por-instância), sincronizado via `setCodecContainer()` action nomeada.

**Lazy loading de composições (v0.128.0):** as composições Remotion (`ExportableComposition`, `ExportableSpeedPaintComposition`, `ExportableBatchSpeedPaintComposition`) foram migradas de exports diretos para funções assíncronas (`createExportableComposition()`, `createExportableSpeedPaintComposition()`, `createExportableBatchSpeedPaintComposition()`) — os imports de `remotion` e dos componentes de cena agora são lazy, eliminando a dependência direta nos controllers e reduzindo o bundle inicial das páginas de vídeo/speed paint.

### Persistência (Dual Storage)
Dual automático: Firestore + Storage (logado) / IndexedDB (visitante). Offline: `persistentLocalCache` + `multipleTabManager`. Chat fallback p/ IndexedDB se >900KB. Admin via custom claim (`admin: true`) — script `grant-access`. Converter genérico `createFirestoreConverter<T>()`. Limites Storage: áudio 150MB, imagem 10MB. **Vídeos exportados são armazenados apenas no IndexedDB local** (v0.128.0) — novas escritas de vídeo no Storage/Firestore foram bloqueadas; leitura/deleção de arquivos legados preservada. Storage rules refinadas: áudio com validação de tipo `audio/*` e imagem com `image/*`.

### Assistente IA
Tool-first com Genkit: `ai.generate()` (import de `genkit/beta`) com `maxTurns: 20` e 7 ferramentas (`updatePlan`, `webSearch`, `getStudioState`, `getUserMemories`, `updateStudio`, `interview`, `respond`). Middleware `toolValidationRecovery` (Genkit `generateMiddleware`) intercepta `ValidationError` e converte em `toolResponse` amigável — o modelo se auto-corrige no próximo turno sem quebrar o tool loop, protegendo todas as tools e `use_skill` sem try/catch individuais. Schemas Zod com `.describe()` em todos os campos (13 schemas) para guiar o LLM a gerar JSON válido. **Chat persistente:** sessão ativa salva/restaurada do `localStorage` via `ACTIVE_SESSION_KEY` — o assistente retoma automaticamente a conversa anterior ao montar. **Tour de boas-vindas:** ao primeiro acesso, envia mensagem de boas-vindas automática após 1.5s; flag `tourSeen` persistido em `UserSettings` (dual storage Firestore/IndexedDB). Preservação de tool context via `fullHistory` (`MessageData[]` do Genkit com tool calls/responses transportados entre mensagens — modelo não precisa re-chamar ferramentas). Compactação automática de histórico por threshold de tokens (`assistant-compaction.ts`). Dois modos de IA: `fast` (gemini-3.1-flash-lite) e `specialist` (gemini-3.5-flash). Streaming com batching via `requestAnimationFrame`. Componentes de UX: CodeBlock (syntax highlight com cópia), ImageLightbox (zoom de imagens), ScrollToBottomFab (scroll automático com indicador de streaming), botão de regenerar resposta, animações Motion (AnimatePresence). InlineAIWidget no ScriptEditor para refatorar/expandir trechos. EmptyChatState com sugestões contextuais. TwoPhaseStopButton, ThinkingShimmer, PlanWidget.

**Sistema de Skills:** Middleware Genkit (`skills.ts`) que escaneia diretórios de `SKILL.md`, mantém cache em memória e injeta dinamicamente a ferramenta `use_skill` no assistente. Skills fornecem instruções e workflows especializados para tarefas específicas (ex: guia de vozes, melhores práticas TTS). O prompt do assistente foi simplificado — `voicesList`/`paceList` removidos do contexto fixo e agora gerenciados via skills carregadas sob demanda. Script `copy-skills.mjs` copia skills durante o build das Cloud Functions.

### Sistema de Feedback
Sistema global de feedback do usuário em `src/components/feedback/`. `FeedbackController` escuta evento customizado `OPEN_FEEDBACK_EVENT` no `window` e gerencia o `FeedbackDialog`. `FeedbackFormFields` compartilhado entre `FeedbackDialog` e `ContactPage` (evita duplicação de formulário). Hook imperativo `useFeedbackDialog()` para disparo programático. O backend (`feedback` flow) registra o feedback no Firestore — sem conceder créditos (modelo open source BYOK, sem sistema de bônus). i18n completo com namespace `feedback.*` nos 3 locales. `FeedbackFab` e `FeedbackBanner` foram removidos na v0.130.1 (bônus de créditos não existe mais).

### StackedHeader
Componente genérico de header padronizado em `src/components/ui/StackedHeader.tsx` (~837 linhas). Resolve 3 famílias de UI com 1 API: (1) Banners com ação (substitui `<Alert action={<Button>}>` em 8+ componentes), (2) Headers de seção colapsáveis (animação Motion para expand/contract), (3) Títulos de seção simples.

Props base: `collapsible` (com `defaultCollapsed` + `onToggle` via hook `useCollapsibleSection` em `src/hooks/useCollapsibleSection.ts`), `action` (botão opcional), `severity` (success/warning/error/info), variante `section`/`banner`.

**5 novas props de layout (v0.126.0):**
- `direction` (`'vertical' | 'horizontal' | 'responsive'`): eixo do layout — defaults inteligentes por variant (alert → vertical, glass/plain → responsive). `'responsive'` alterna horizontal (mdUp) para vertical (xs)
- `actionAlign` (`'start' | 'end' | 'center' | 'stretch'`): alinhamento do slot de ação. Default deriva do eixo efetivo
- `controlAlign` (`'start' | 'end' | 'center'`): alinhamento do slot de controle (chip/switch). Default deriva do eixo efetivo
- `actionPlacement` (`'inline' | 'stack' | 'bottom'`): posição do slot de ação relativo ao conteúdo
- `density` (`'compact' | 'standard' | 'comfortable'`): densidade visual com tokens `DENSITY_TOKENS` (containerPx/py, mainGap, collapsePx/pb)

8 tipos públicos, 3 helpers (`resolveDirection`, `resolveAlignItems`, `getEffectiveAxis`), constantes `DIRECTION_DEFAULTS` e `DENSITY_TOKENS`. Migrado em ~15 componentes (Ondas 1-3: Inspector, Configuracoes, Library, ImageStudio, VideoLibrary, FeedbackBanner, FeedbackFormFields, AnalyticsConsentPrompt, Assistant, StockMediaPicker, TranscriptionPanel, SpeedPaintControls — Onda 4: SpeedPaintPage, VideoExportPanel, SpeedPaintExportPanel). Namespace i18n `stackedHeader.*` nos 3 locales. Barrel export em `src/components/ui/index.ts` com todos os tipos.

### Estúdio de Produção
Zustand (`useStudioStore`) com `useShallow` para seletores otimizados. Persistência localStorage (17 prefs, prefixo `s2a_*`) + Firestore via `useAutoSaveStudioSettings` (debounce 2s). Layout Grid: Inspector (lg:4) + ScriptEditor (lg:8). EmotionSelector (10 emoções + intensidade), VoiceCard. Keyboard shortcuts: Ctrl+Enter (gerar), Space (play/pause). Swipe horizontal mobile via `useSwipeTabs`.

### Configurações
Rota `/app/configuracoes`. 5 seções colapsáveis (Voz, Persona & Direção, Cenas & Imagens, Multi-locutor, Idioma da interface), 16+ campos. Seletor de locale da UI persistido em `UserSettings` via dual storage. Mesma store do estúdio. Reset geral limpa `s2a_*` + `useStudioStore.getState().reset()`. Seção de **Provedor de IA (BYOK)** com `ProviderSettingsSection` (`src/features/provider-settings/`) — usuário salva/testa/remove a API key do Gemini (persistida em IndexedDB local, nunca em Firestore).

### BYOK (Bring Your Own Key)
O usuário fornece sua própria API key do Gemini (Google AI Studio) via seção BYOK em Configurações. A key é persistida **apenas** em IndexedDB local (escopada por `uid`). Em cada chamada de IA, o frontend injeta `providerAuth: { provider: 'gemini', apiKey }` no payload do `httpsCallable`. O backend (`functions/src/genkit/genkit.ts`) é inicializado com `googleAI({ apiKey: false })` — **nenhuma chave global**. Cada flow extrai a key via `extractApiKey(input)` e injeta via `withApiKey(apiKey)` no `config` de `ai.generate()`. Logs usam `maskApiKeyForLog(apiKey)` (mostra apenas primeiros/últimos 4 caracteres). Flow de validação: `testApiKey` (`functions/src/flows/test-api-key.ts`) faz uma chamada mínima ao Gemini (`gemini-3.1-flash-lite`) para confirmar que a key funciona. **Sem Stripe, sem billing, sem sistema de créditos** — o usuário paga o Gemini diretamente ao Google.

### Biblioteca & Projetos
Library (`/biblioteca`): projetos expansíveis com áudios, cenas, roteiro, vídeos — botão "Levar ao Speed Paint". VideoLibrary: galeria horizontal no player com busca, batch download. Projetos em subcoleções Firestore (`audios`, `images`, `videos`). Blob cleanup com revogação seletiva de URLs. Vídeos exportados são armazenados apenas no IndexedDB local desde v0.128.0 — Storage/Firestore mantém compatibilidade de leitura com arquivos legados.

### Projeto Manual (v0.129.0)
Wizard de 4 passos em `/app/projeto/novo` (rota autenticada, lazy loading) para criar projetos a partir de arquivos próprios. `useManualProject.ts` (~387 linhas) gerencia o `ManualProjectDraft` via `useReducer` com 11 ações, ciclo de vida de blob URLs com revogação controlada, save sequencial e rollback parcial. Componentes: `ManualProjectStepName` (nome + script), `ManualProjectStepAudio` (dropzone MIME+decode, preview player), `ManualProjectStepImages` (dropzone MIME+decode+dimensões, drag-and-drop `@dnd-kit/react` + botões ↑↓), `ManualProjectSuccess` (4 CTAs: Speed Paint, Vídeo, Library, Criar outro). Persistência dual via `saveProject`/`saveAudioToProject`/`saveImageToProject`. Validação em `manualProjectValidation.ts` com 7 tipos de erro (`ValidationErrorKind`). 9 eventos analytics. Namespace i18n `manualProject.*` nos 3 locales. 61 testes Vitest em 5 arquivos.

### Autenticação
`AuthContext` + `useAuth()`: Google popup, email/senha com verificação (polling 5s), reset de senha, exclusão LGPD. `LogoutConfirmDialog` confirma saída antes de efetuar logout. `DeleteAccountDialog` (`src/components/app/DeleteAccountDialog.tsx`) com confirmação textual para exclusão de conta. `authActionCodeSettings` (`src/lib/auth-action-settings.ts`) com `handleCodeInApp: true` redireciona ações de email para a página customizada `/auth/action`. `AuthActionPage` trata verificação de email, reset de senha e recuperação de email com UI dedicada (Motion + MUI glass panel). Onboarding Wizard (`/onboarding`): 4 passos (Welcome → Profile → Goals → Completion), 6 roles, 8 goals — persistido em localStorage + `user_settings` no Firestore. `FounderMessageDialog` exibe mensagem pessoal do criador na conclusão (apenas na primeira vez, controlado por `isFounderMessageSeen()` via localStorage). Pós-login: sem onboarding → `/onboarding`, completo → `/app/assistente`. Login/logout/delete fazem full reload (COEP conflict).

### Internacionalização (i18n)
3 locales (pt-BR, en, es), 20+ namespaces. `I18nProvider` no `main.tsx`. Hooks: `useLocale()` e `useLocaleSafe()`. `LocaleSelector` no SidebarFooter/PublicHeader/MobileBottomNav. `TranslationDictionary` com nested keys e pluralização. Últimos namespaces adicionados: `images` (alt text de showcases), `authAction` (verifyEmail, resetPassword, recoverEmail, validation, error, seoTitle, seoDesc), `analyticsConsent` (5 chaves: title, message, accept, deny, manage), `studio.header.logout` (4 chaves: dialogTitle, dialogDescription, dialogCancel, dialogConfirm), `configuracoes.interfaceLocaleLabel`, `feedback` (dialog, navItem, sidebar, toggle, user, groups), `pwaInstall` (title, actionInstall, actionDismiss, ariaInstallButton, ariaDismissButton), `stackedHeader` (collapseAriaLabel), `manualProject` (meta, steps, stepName, stepAudio, stepImages, errors, success, liveRegion, cta em 3 locales), `openSource` (hero, features, cta, metrics), `providerSettings` (testKey, saveKey, removeKey, validation).

### Analytics & Consentimento
Sistema de analytics com consentimento explícito do usuário via `src/lib/analytics.ts` (~287 linhas). **Lazy loading:** módulo `firebase/analytics` (~64 KiB) só carrega após consentimento e apenas em produção. **Consentimento:** `AnalyticsConsentPrompt` (Snackbar + Dialog LGPD-compliant) com persistência em `localStorage` via `s2a_analytics_consent`. **Eventos:** 47 eventos tipados via `AnalyticsEventMap` — geração (áudio, imagem, vídeo, speed paint), autenticação (login, logout, signup), navegação (CTAs, hero), onboarding, exportação, erros e projeto manual (9 eventos: upload áudio/imagem, reordenação, save, CTAs). **Identificação:** `syncAnalyticsUser()` vincula userId do Firebase Auth ao `user_id` do Google Analytics. **Controle:** `VITE_FIREBASE_ANALYTICS_ENABLED` (env var) + `isFirebaseAnalyticsEnabled()` — ativo por padrão apenas em produção. Componentes: `AnalyticsConsentPrompt.tsx`, `openAnalyticsConsentDialog()`.

### Environment & COEP
COEP ativo em `/app/**` (SharedArrayBuffer p/ Whisper + Remotion). Rotas públicas, `/login`, `/cadastro`, `/onboarding` sem COEP. **App Check com lazy loading:** `ensureAppCheck()` em `src/lib/app-check.ts` só inicializa reCAPTCHA v3 (~729 KiB, ~720ms) quando `AuthContext` detecta usuário autenticado — eliminando o custo em rotas públicas visitadas por anônimos. Emuladores seletivos via flags `VITE_EMULATOR_*`. **PWA:** vite-plugin-pwa com runtime caching (1 ano assets), update prompt via `PwaUpdatePrompt` (Snackbar MUI + SW reload), install prompt via `PwaInstallPrompt` (Snackbar MUI glass, cooldown 7d, serializado com AnalyticsConsentPrompt e PwaUpdatePrompt). Manifest: standalone, portrait, `theme_color: #0a0a0f`.

### UI & Theme
MUI v9 + Emotion com CSS layers. Dark mode (light existe mas idêntico). Fontes: Inter (sans), JetBrains Mono (mono), Playfair Display (serif). Tokens: brand (blue/orange), semantic, glow (3 níveis), gradients, surfaces (5 níveis). Component overrides: AppBar glass, Button radius 14, Card elevated, Alert semitransparente. Container `maxWidth: 1600px`.

---

## Version

- **Current:** `0.130.2`
- **Last release:** 2026-06-12

### Últimas mudanças (atualizado por /fast)

> **Regra:** manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga.

| Versão | Resumo |
|--------|--------|
| `0.130.2` | **Correção de drag-and-drop em lote no SpeedPaint:** wrappers `TransitionGroup` + `Collapse` removidos do `QueueStaging.tsx` — o `OptimisticSortingPlugin` do `@dnd-kit` não conseguia mover elementos DOM através das divs extras do Collapse. `group: 'speed-paint-queue'` adicionado ao `useSortable`. Imports de `@mui/material/Collapse` e `react-transition-group` removidos. Auditado e validado por code-validator e gap-finder |
| `0.130.1` | **Limpeza pós-BYOK:** `FeedbackFab` e `FeedbackBanner` removidos (bônus de créditos não existe mais); chaves i18n `fab`/`banner`/`emptyState` removidas dos 3 locales; link do GitHub adicionado ao `SidebarFooter`, `PublicFooter`, `PublicHeader`; READMEs padronizados em 4 arquivos com badges/seção de documentação/tabela de tecnologias; `byokFaq.ts` refinado; mensagens de codec em `useCodecSupport.ts` atualizadas |
| `0.130.0` | **Migração para BYOK (Bring Your Own Key) finalizada:** backend sem Stripe/billing/créditos — `testApiKey` flow (`functions/src/flows/test-api-key.ts`) valida a API key do Gemini via chamada mínima; `ProviderSettingsSection` no frontend (`src/features/provider-settings/`); diretórios e arquivos de billing removidos (`src/features/billing/`, `src/hooks/useCredits.ts`, `src/components/CreditIndicator.tsx`, `src/components/CreditBlockedMessage.tsx`, `src/lib/stripe.ts`, `functions/src/usage/credit-*`, `functions/src/usage/period.ts`, `functions/src/usage/audio-preflight.ts`, `functions/src/flows/credit-snapshot.ts`, `functions/src/genkit/middlewares/credit-metering.ts`); `.firebaserc` apontado para placeholder `your-firebase-project-id`; `serviceAccount` em `functions/src/index.ts` tornado opcional com comentário; AGENTS.md/CLAUDE.md atualizados (sem Stripe, com BYOK) |
| `0.129.1` | **Projeto Manual — UI refinada:** descrições redundantes removidas dos 3 steps do wizard (`ManualProjectStepName`, `ManualProjectStepAudio`, `ManualProjectStepImages`) — redução de 16 linhas, wizard mais limpo e direto |
| `0.129.0` | **Projeto Manual** (wizard `/app/projeto/novo`) — upload de áudio (≤50MB) + imagens (≤30) com validação MIME/decode/dimensões, reordenação drag-and-drop (`@dnd-kit`) + botões ↑↓, persistência dual via `saveProject`/`saveAudioToProject`/`saveImageToProject`; integração com Speed Paint e Vídeo via novo campo `script` no `useAudioGeneratorStore` (NÃO polui `useStudioStore`); CORS do Firebase Storage configurado (`storage-cors.json` + `Cross-Origin-Resource-Policy`); 9 eventos analytics novos; namespace `manualProject.*` em pt-BR/en/es; 61 testes Vitest (5 arquivos); nova rota lazy + botão na Library |
