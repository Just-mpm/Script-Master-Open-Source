# AGENTS.md — Script Master

## Visão Geral

SPA em React + Vite para transformar roteiros em áudio com Gemini TTS, geração opcional de imagens/cenas, renderização de vídeo com Remotion, biblioteca de projetos, assistente conversacional e internacionalização (3 idiomas).

Firebase Hosting (frontend) + Firebase Cloud Functions v2 (backend serverless quando necessário).

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

**Admin scripts (dentro de `functions/`):** `npm run grant-access` — concede admin e/ou créditos ilimitados.

**Sem formatter e sem CI/CD.**

## Stack

- **React 19** + **Vite 8** + **react-router-dom v7** (lazy loading por rota)
- **MUI v9** — tema em `src/theme/*`, sem Tailwind
- **Genkit** (backend via Cloud Functions) — TTS, imagens, prompts de cena, assistente, chunking
- **Firebase** — Auth + Firestore + Storage + IndexedDB (dual storage) + App Check (reCAPTCHA v3) | `firebase-tools` ^15.3.0 (deploy)
- **Firebase Cloud Functions v2** — backend serverless com Genkit quando necessário + Stripe em `functions/`
- **Stripe** — `@stripe/stripe-js` ^9.3 (client-side) + `stripe` ^22.1 (server-side); desconectado por flag `VITE_BILLING_ENABLED` durante beta aberto
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
- **Logger:** Use `createLogger('context')` de `src/lib/logger` — import relativo, nunca `@/`. Sistema modular com error tracking em produção (Firestore `errorLogs`), sanitização automática, batch processor e interceptação global. `initErrorTracking()` chamado em `main.tsx`. `debug`/`info` suprimidos em produção; `warn`/`error`/`fatal` enviados ao Firestore. Configurado via `VITE_LOGGER_ENABLED`, `VITE_LOGGER_MIN_LEVEL`, `VITE_LOGGER_SEND_IN_DEV`
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
| `/precos` | PricingPage | Público |
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
| `/app/configuracoes` | ConfiguracoesPage | Autenticado |
| `/app` | Redirect → `/app/assistente` | — |

**Visitante** = GuestRoute: visitantes veem, logados redirecionam para `/app/assistente`.
**Público** = sem restrição. **Autenticado** = ProtectedRoute.

---

## Domínios

### App Shell & Router
`App.tsx` (~250 linhas): providers (Router, Auth, I18n, AudioContext), `AudioGenerationHandler`, `MobileBottomNav` (mdDown), `PwaUpdatePrompt`. Router: lazy loading por rota, `ProtectedRoute` p/ rotas autenticadas, `GuestRoute` p/ `/`, `/login`, `/cadastro`. `ErrorBoundary` em `src/components/ErrorBoundary.tsx` com integração ao logger (error tracking). Redirects de compatibilidade (9 rotas) em `Redirects.tsx`.

### Páginas Públicas
8 páginas em `src/pages/public/` (Landing, Funcionalidades, Pricing, FAQ, Contato, Sobre, Termos, Privacidade, Cookies). 17 componentes em `src/components/public/`. SEO via React 19 nativo: `DocumentHead` + `seo.ts` (OG, Twitter Cards, canonical, sitemap.xml, robots.txt). Logos em `src/assets/logos.ts`. Domínio prod: `script-master.pro`.

### SEO / AEO / GEO
Pre-renderização das 10 rotas públicas via `scripts/prerender.mjs` (puppeteer-core + Chrome do sistema). Dispara em `bun run build:full` após vite build — gera HTML estático com tags SEO completas em `dist/{route}/index.html`. `DocumentHead` dispara flag `window.__PRERENDER_READY` para sinalizar quando capturar. `seo.ts` gera: title, meta description, canonical, hreflang (pt-BR, en, es, x-default), Open Graph completo (image 1200x630, width/height/alt, locale, locale:alternate), Twitter Cards, JSON-LD (SoftwareApplication com offers, WebPage, BreadcrumbList). Arquivos estáticos: `public/llms.txt` + `public/llms-full.txt` (para ChatGPT/Claude/Perplexity), `public/robots.txt` (Allow llms.txt, Llms-txt directive), `public/sitemap.xml`. Favicon: `.ico` (16+32+48) + `.webp` + `apple-touch-icon.png` (180x180).

### Áudio & TTS
TTS via Genkit flow `audio.ts` — chunking automático (>500 chars), multi-speaker (2 vozes), detecção de silêncio, voice previews WAV estáticos. Hook frontend: `useAudioGenerator`. Créditos via middleware `credit-metering.ts`. Limites: 50K chars/roteiro, 500 chars/chamada TTS.

### Geração de Imagens
Geração via Genkit flow `images.ts`. Prompts de cena via `scene-prompts` (saída textual JSON, não imagens). Aspect ratios: 8 (estúdio) / 5 (cenas) / 3 (vídeo). Frameworks visuais: `general` ou `whiteboard`. StockMediaPicker com Pexels API (fallback local).

### Vídeo (Remotion)
Renderização client-side via WebCodecs com fallback de codec (H.264+AAC → H.264 → VP8+Opus+WebM). Legendas: pipeline 3 fontes (segment-timing > whisper-aligned > proportional). Speed Paint: edge detection + BFS + renderização Remotion com fases sketch/reveal. Timings centralizados em `speedPaintTimings.ts` (`DEFAULT_SPEED_PAINT_HOLD_SECONDS=3s`, `DURATION_BASED_SKETCH_RATIO=0.8`). Web Worker inline para >5 cenas. Cache LRU (SHA-256, 20 entradas). Export quality: 720p–4K.

### Persistência (Dual Storage)
Dual automático: Firestore + Storage (logado) / IndexedDB (visitante). Offline: `persistentLocalCache` + `multipleTabManager`. Chat fallback p/ IndexedDB se >900KB. Admin via custom claim (`admin: true`) — script `grant-access`. Converter genérico `createFirestoreConverter<T>()`. Limites Storage: áudio 150MB, imagem 10MB, vídeo 200MB.

### Assistente IA
Tool-first com Genkit: `ai.generate()` (import de `genkit/beta`) com `maxTurns: 20` e 7 ferramentas (`updatePlan`, `webSearch`, `getStudioState`, `getUserMemories`, `updateStudio`, `interview`, `respond`). **Chat persistente:** sessão ativa salva/restaurada do `localStorage` via `ACTIVE_SESSION_KEY` — o assistente retoma automaticamente a conversa anterior ao montar. **Tour de boas-vindas:** ao primeiro acesso, envia mensagem de boas-vindas automática após 1.5s; flag `tourSeen` persistido em `UserSettings` (dual storage Firestore/IndexedDB). Preservação de tool context via `fullHistory` (`MessageData[]` do Genkit com tool calls/responses transportados entre mensagens — modelo não precisa re-chamar ferramentas). Compactação automática de histórico por threshold de tokens (`assistant-compaction.ts`). Dois modos de IA: `fast` (gemini-3.1-flash-lite) e `specialist` (gemini-3.5-flash). Streaming com batching via `requestAnimationFrame`. Componentes de UX: CodeBlock (syntax highlight com cópia), ImageLightbox (zoom de imagens), ScrollToBottomFab (scroll automático com indicador de streaming), botão de regenerar resposta, animações Motion (AnimatePresence). InlineAIWidget no ScriptEditor para refatorar/expandir trechos. EmptyChatState com sugestões contextuais. TwoPhaseStopButton, ThinkingShimmer, PlanWidget.

**Sistema de Skills:** Middleware Genkit (`skills.ts`) que escaneia diretórios de `SKILL.md`, mantém cache em memória e injeta dinamicamente a ferramenta `use_skill` no assistente. Skills fornecem instruções e workflows especializados para tarefas específicas (ex: guia de vozes, melhores práticas TTS). O prompt do assistente foi simplificado — `voicesList`/`paceList` removidos do contexto fixo e agora gerenciados via skills carregadas sob demanda. Script `copy-skills.mjs` copia skills durante o build das Cloud Functions.

### Estúdio de Produção
Zustand (`useStudioStore`) com `useShallow` para seletores otimizados. Persistência localStorage (17 prefs, prefixo `s2a_*`) + Firestore via `useAutoSaveStudioSettings` (debounce 2s). Layout Grid: Inspector (lg:4) + ScriptEditor (lg:8). EmotionSelector (10 emoções + intensidade), VoiceCard. Keyboard shortcuts: Ctrl+Enter (gerar), Space (play/pause). Swipe horizontal mobile via `useSwipeTabs`.

### Configurações
Rota `/app/configuracoes`. 5 seções colapsáveis (Voz, Persona & Direção, Cenas & Imagens, Multi-locutor, Idioma da interface), 16+ campos. Seletor de locale da UI persistido em `UserSettings` via dual storage. Mesma store do estúdio. Reset geral limpa `s2a_*` + `useStudioStore.getState().reset()`.

### Billing & Créditos
Beta aberto (`VITE_OPEN_BETA_ENABLED=true`). Planos: Free / Pro (R$49,90/mês) / Business (R$149,90/mês). Stripe preservado mas desconectado (`VITE_BILLING_ENABLED=false`). Backend: credit-service com estimativa/reserva/confirmação/reversão. Frontend: `useCredits` (store global Zustand), `CreditIndicator`, `CreditBlockedMessage`, `UpgradeDialog`.

### Biblioteca & Projetos
Library (`/biblioteca`): projetos expansíveis com áudios, cenas, roteiro, vídeos — botão "Levar ao Speed Paint". VideoLibrary: galeria horizontal no player com busca, batch download. Projetos em subcoleções Firestore (`audios`, `images`, `videos`). Blob cleanup com revogação seletiva de URLs.

### Autenticação
`AuthContext` + `useAuth()`: Google popup, email/senha com verificação (polling 5s), reset de senha, exclusão LGPD. `LogoutConfirmDialog` confirma saída antes de efetuar logout. `authActionCodeSettings` (`src/lib/auth-action-settings.ts`) com `handleCodeInApp: true` redireciona ações de email para a página customizada `/auth/action`. `AuthActionPage` trata verificação de email, reset de senha e recuperação de email com UI dedicada (Motion + MUI glass panel). Onboarding Wizard (`/onboarding`): 4 passos (Welcome → Profile → Goals → Completion), 6 roles, 8 goals — persistido em localStorage + `user_settings` no Firestore. `FounderMessageDialog` exibe mensagem pessoal do criador na conclusão (apenas na primeira vez, controlado por `isFounderMessageSeen()` via localStorage). Pós-login: sem onboarding → `/onboarding`, completo → `/app/assistente`. Login/logout/delete fazem full reload (COEP conflict).

### Internacionalização (i18n)
3 locales (pt-BR, en, es), 20+ namespaces. `I18nProvider` no `main.tsx`. Hooks: `useLocale()` e `useLocaleSafe()`. `LocaleSelector` no Header/PublicHeader/MobileBottomNav. `TranslationDictionary` com nested keys e pluralização. Últimos namespaces adicionados: `authAction` (verifyEmail, resetPassword, recoverEmail, validation, error, seoTitle, seoDesc), `analyticsConsent` (5 chaves: title, message, accept, deny, manage), `studio.header.logout` (4 chaves: dialogTitle, dialogDescription, dialogCancel, dialogConfirm), `configuracoes.interfaceLocaleLabel`.

### Analytics & Consentimento
Sistema de analytics com consentimento explícito do usuário via `src/lib/analytics.ts` (~287 linhas). **Lazy loading:** módulo `firebase/analytics` (~64 KiB) só carrega após consentimento e apenas em produção. **Consentimento:** `AnalyticsConsentPrompt` (Snackbar + Dialog LGPD-compliant) com persistência em `localStorage` via `s2a_analytics_consent`. **Eventos:** 31 eventos tipados via `AnalyticsEventMap` — geração (áudio, imagem, vídeo, speed paint), autenticação (login, logout, signup), navegação (CTAs, hero), onboarding, exportação e erros. **Identificação:** `syncAnalyticsUser()` vincula userId do Firebase Auth ao `user_id` do Google Analytics. **Controle:** `VITE_FIREBASE_ANALYTICS_ENABLED` (env var) + `isFirebaseAnalyticsEnabled()` — ativo por padrão apenas em produção. Componentes: `AnalyticsConsentPrompt.tsx`, `openAnalyticsConsentDialog()`.

### Environment & COEP
COEP ativo em `/app/**` (SharedArrayBuffer p/ Whisper + Remotion). Rotas públicas, `/login`, `/cadastro`, `/onboarding` sem COEP. **App Check com lazy loading:** `ensureAppCheck()` em `src/lib/app-check.ts` só inicializa reCAPTCHA v3 (~729 KiB, ~720ms) quando `AuthContext` detecta usuário autenticado — eliminando o custo em rotas públicas visitadas por anônimos. Emuladores seletivos via flags `VITE_EMULATOR_*`. **PWA:** vite-plugin-pwa com runtime caching (1 ano assets), update prompt via `PwaUpdatePrompt` (Snackbar MUI + SW reload). Manifest: standalone, portrait, `theme_color: #0a0a0f`.

### UI & Theme
MUI v9 + Emotion com CSS layers. Dark mode (light existe mas idêntico). Fontes: Inter (sans), JetBrains Mono (mono), Playfair Display (serif). Tokens: brand (blue/orange), semantic, glow (3 níveis), gradients, surfaces (5 níveis). Component overrides: AppBar glass, Button radius 14, Card elevated, Alert semitransparente. Container `maxWidth: 1600px`.

---

## Version

- **Current:** `0.122.0`
- **Last release:** 2026-06-01

### Últimas mudanças (atualizado por /fast)

> **Regra:** manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga.

| Versão | Resumo |
|--------|--------|
| `0.122.0` | AuthActionPage: página customizada para ações de email do Firebase Auth (verificação de email, reset de senha, recuperação de email) com UI dedicada (Motion + MUI glass panel); `authActionCodeSettings` com `handleCodeInApp: true`; rota pública `/auth/action`; chaves i18n `authAction.*` (3 locales); testes (+412 linhas); pre-render expandido (10 rotas) |
| `0.121.0` | Logger modular com error tracking: `src/lib/logger/` (8 módulos) substitui arquivo único — rastreamento de erros em produção via Firestore (`errorLogs`), sanitização automática, batch processor, interceptação global; `initErrorTracking()` no `main.tsx`; `LogoutConfirmDialog` em Header/PublicHeader/MobileBottomNav; seção "Idioma da interface" nas Configurações; `MobileBottomNav` expandido com locale/cookie/logout; error handling consistente em ~15+ arquivos (`catch {}` → `catch (err: unknown)`); backend migrado para logger próprio; brand renomeado "Estúdio de Produção" → "AI Studio"; quick actions do assistente atualizadas |
| `0.120.0` | Sistema de Analytics com consentimento: nova lib `src/lib/analytics.ts` com lazy loading do `firebase/analytics`, 31 eventos tipados (`AnalyticsEventMap`); `AnalyticsConsentPrompt` com Snackbar/Dialog LGPD-compliant; integração em 13 hooks/páginas/componentes; chaves i18n `analyticsConsent` (3 locales); nova env var `VITE_FIREBASE_ANALYTICS_ENABLED`; refatoração de `legalData.ts`; novos assets de logo WebP |
| `0.119.0` | Redirecionamento padrão unificado para `/app/assistente` (7 arquivos); chat persistente no Assistente com restauração de sessão (`ACTIVE_SESSION_KEY`); tour de boas-vindas com flag `tourSeen` em UserSettings (dual storage); skill `tour-da-plataforma` (+144 linhas); OG Image (`public/og-image.webp`); docs de auditoria/QA/testes (5 novos); seção "Pendências" removida de AGENTS.md/CLAUDE.md |
| `0.118.0` | AssistantComposer com forwardRef pattern: nova interface `AssistantComposerHandle` e componente `AssistantComposerInner` para controle programático via ref; `extractSkillName()` no ToolEventCard para exibição contextual de skills; remoção de mocks obsoletos do TemplateSelector em testes |
