# AGENTS.md — Script Master

## Visão Geral

SPA em React + Vite para transformar roteiros em áudio com Gemini TTS, geração opcional de imagens/cenas, renderização de vídeo com Remotion, biblioteca de projetos, assistente conversacional e internacionalização (3 idiomas).

Firebase Hosting (frontend) + Firebase Cloud Functions v2 (backend serverless quando necessário).

**Domínio oficial de produção:** `https://script-master.pro`

## Comandos

```bash
bun run dev              # Vite em http://localhost:3000
bun run build            # lint + typecheck + build de produção (~1s, sem pre-render)
bun run build:full       # build + pre-render das 9 rotas públicas (~25s, para deploy)
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
- **puppeteer-core** — pre-renderização das 9 rotas públicas via Chrome do sistema (`scripts/prerender.mjs`)

## Modelos Gemini

| Modelo | Uso |
|--------|-----|
| `gemini-3.1-flash-tts-preview` | Text-to-speech |
| `gemini-3.1-flash-image-preview` | Geração de imagens |
| `gemini-3.1-flash-lite` | Chunking de roteiros, prompts de cena, chat do assistente (modo `fast`) |
| `gemini-3.5-flash` | Chat do assistente (modo `specialist`) |

## Convenções

- **Idioma:** pt-BR (default), en e es na UI via i18n; comentários em pt-BR; inglês nos prompts de imagem
- **Logger:** Use `createLogger('context')` de `src/lib/logger.ts` — import relativo, nunca `@/`. `debug`/`info` suprimidos em produção
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
| `/app` | Redirect → `/app/estudio` | — |

**Visitante** = GuestRoute: visitantes veem, logados redirecionam para `/app/estudio`.
**Público** = sem restrição. **Autenticado** = ProtectedRoute.

---

## Domínios

### App Shell & Router
`App.tsx` (~250 linhas): providers (Router, Auth, I18n, AudioContext), `AudioGenerationHandler`, `MobileBottomNav` (mdDown), `PwaUpdatePrompt`. Router: lazy loading por rota, `ProtectedRoute` p/ rotas autenticadas, `GuestRoute` p/ `/`, `/login`, `/cadastro`. Redirects de compatibilidade (9 rotas) em `Redirects.tsx`.

### Páginas Públicas
8 páginas em `src/pages/public/` (Landing, Funcionalidades, Pricing, FAQ, Contato, Sobre, Termos, Privacidade, Cookies). 17 componentes em `src/components/public/`. SEO via React 19 nativo: `DocumentHead` + `seo.ts` (OG, Twitter Cards, canonical, sitemap.xml, robots.txt). Logos em `src/assets/logos.ts`. Domínio prod: `script-master.pro`.

### SEO / AEO / GEO
Pre-renderização das 9 rotas públicas via `scripts/prerender.mjs` (puppeteer-core + Chrome do sistema). Dispara em `bun run build:full` após vite build — gera HTML estático com tags SEO completas em `dist/{route}/index.html`. `DocumentHead` dispara flag `window.__PRERENDER_READY` para sinalizar quando capturar. `seo.ts` gera: title, meta description, canonical, hreflang (pt-BR, en, es, x-default), Open Graph completo (image 1200x630, width/height/alt, locale, locale:alternate), Twitter Cards, JSON-LD (SoftwareApplication com offers, WebPage, BreadcrumbList). Arquivos estáticos: `public/llms.txt` + `public/llms-full.txt` (para ChatGPT/Claude/Perplexity), `public/robots.txt` (Allow llms.txt, Llms-txt directive), `public/sitemap.xml`. Favicon: `.ico` (16+32+48) + `.webp` + `apple-touch-icon.png` (180x180).

### Áudio & TTS
TTS via Genkit flow `audio.ts` — chunking automático (>500 chars), multi-speaker (2 vozes), detecção de silêncio, voice previews WAV estáticos. Hook frontend: `useAudioGenerator`. Créditos via middleware `credit-metering.ts`. Limites: 50K chars/roteiro, 500 chars/chamada TTS.

### Geração de Imagens
Geração via Genkit flow `images.ts`. Prompts de cena via `scene-prompts` (saída textual JSON, não imagens). Aspect ratios: 8 (estúdio) / 5 (cenas) / 3 (vídeo). Frameworks visuais: `general` ou `whiteboard`. StockMediaPicker com Pexels API (fallback local).

### Vídeo (Remotion)
Renderização client-side via WebCodecs com fallback de codec (H.264+AAC → H.264 → VP8+Opus+WebM). Legendas: pipeline 3 fontes (segment-timing > whisper-aligned > proportional). Speed Paint: edge detection + BFS + renderização Remotion com fases sketch/reveal. Timings centralizados em `speedPaintTimings.ts` (`DEFAULT_SPEED_PAINT_HOLD_SECONDS=3s`, `DURATION_BASED_SKETCH_RATIO=0.8`). Web Worker inline para >5 cenas. Cache LRU (SHA-256, 20 entradas). Export quality: 720p–4K.

### Persistência (Dual Storage)
Dual automático: Firestore + Storage (logado) / IndexedDB (visitante). Offline: `persistentLocalCache` + `multipleTabManager`. Chat fallback p/ IndexedDB se >900KB. Admin via custom claim (`admin: true`) — script `grant-access`. Converter genérico `createFirestoreConverter<T>()`. Limites Storage: áudio 150MB, imagem 10MB, vídeo 200MB.

### Assistente IA
Tool-first com Genkit: `ai.generate()` (import de `genkit/beta`) com `maxTurns: 20` e 7 ferramentas (`updatePlan`, `webSearch`, `getStudioState`, `getUserMemories`, `updateStudio`, `interview`, `respond`). Preservação de tool context via `fullHistory` (`MessageData[]` do Genkit com tool calls/responses transportados entre mensagens — modelo não precisa re-chamar ferramentas). Compactação automática de histórico por threshold de tokens (`assistant-compaction.ts`). Dois modos de IA: `fast` (gemini-3.1-flash-lite) e `specialist` (gemini-3.5-flash). Streaming com batching via `requestAnimationFrame`. Componentes de UX: CodeBlock (syntax highlight com cópia), ImageLightbox (zoom de imagens), ScrollToBottomFab (scroll automático com indicador de streaming), botão de regenerar resposta, animações Motion (AnimatePresence). InlineAIWidget no ScriptEditor para refatorar/expandir trechos. EmptyChatState com sugestões contextuais. TwoPhaseStopButton, ThinkingShimmer, PlanWidget.

### Estúdio de Produção
Zustand (`useStudioStore`) com `useShallow` para seletores otimizados. Persistência localStorage (17 prefs, prefixo `s2a_*`) + Firestore via `useAutoSaveStudioSettings` (debounce 2s). Layout Grid: Inspector (lg:4) + ScriptEditor (lg:8). EmotionSelector (10 emoções + intensidade), TemplateSelector, VoiceCard. Keyboard shortcuts: Ctrl+Enter (gerar), Space (play/pause). Swipe horizontal mobile via `useSwipeTabs`.

### Configurações
Rota `/app/configuracoes`. 4 seções colapsáveis (Voz, Persona & Direção, Cenas & Imagens, Multi-locutor), 15 campos. Mesma store do estúdio. Reset geral limpa `s2a_*` + `useStudioStore.getState().reset()`.

### Billing & Créditos
Beta aberto (`VITE_OPEN_BETA_ENABLED=true`). Planos: Free / Pro (R$49,90/mês) / Business (R$149,90/mês). Stripe preservado mas desconectado (`VITE_BILLING_ENABLED=false`). Backend: credit-service com estimativa/reserva/confirmação/reversão. Frontend: `useCredits` (store global Zustand), `CreditIndicator`, `CreditBlockedMessage`, `UpgradeDialog`.

### Biblioteca & Projetos
Library (`/biblioteca`): projetos expansíveis com áudios, cenas, roteiro, vídeos — botão "Levar ao Speed Paint". VideoLibrary: galeria horizontal no player com busca, batch download. Projetos em subcoleções Firestore (`audios`, `images`, `videos`). Blob cleanup com revogação seletiva de URLs.

### Autenticação
`AuthContext` + `useAuth()`: Google popup, email/senha com verificação (polling 5s), reset de senha, exclusão LGPD. Onboarding Wizard (`/onboarding`): 4 passos (Welcome → Profile → Goals → Completion), 6 roles, 8 goals — persistido em localStorage + `user_settings` no Firestore. `FounderMessageDialog` exibe mensagem pessoal do criador na conclusão (apenas na primeira vez, controlado por `isFounderMessageSeen()` via localStorage). Pós-login: sem onboarding → `/onboarding`, completo → `/app/estudio`. Login/logout/delete fazem full reload (COEP conflict).

### Internacionalização (i18n)
3 locales (pt-BR, en, es), 20+ namespaces. `I18nProvider` no `main.tsx`. Hooks: `useLocale()` e `useLocaleSafe()`. `LocaleSelector` no Header/PublicHeader. `TranslationDictionary` com nested keys e pluralização.

### Environment & COEP
COEP ativo em `/app/**` (SharedArrayBuffer p/ Whisper + Remotion). Rotas públicas, `/login`, `/cadastro`, `/onboarding` sem COEP. **App Check com lazy loading:** `ensureAppCheck()` em `src/lib/app-check.ts` só inicializa reCAPTCHA v3 (~729 KiB, ~720ms) quando `AuthContext` detecta usuário autenticado — eliminando o custo em rotas públicas visitadas por anônimos. Emuladores seletivos via flags `VITE_EMULATOR_*`. **PWA:** vite-plugin-pwa com runtime caching (1 ano assets), update prompt via `PwaUpdatePrompt` (Snackbar MUI + SW reload). Manifest: standalone, portrait, `theme_color: #0a0a0f`.

### UI & Theme
MUI v9 + Emotion com CSS layers. Dark mode (light existe mas idêntico). Fontes: Inter (sans), JetBrains Mono (mono), Playfair Display (serif). Tokens: brand (blue/orange), semantic, glow (3 níveis), gradients, surfaces (5 níveis). Component overrides: AppBar glass, Button radius 14, Card elevated, Alert semitransparente. Container `maxWidth: 1600px`.

---

## Pendências

- **OG Image (`public/og-image.webp`):** Arquivo 1200x630 com logo + tagline ainda precisa ser criado manualmente (design). O código já referencia `og-image.webp` em `seo.ts` e `logos.ts`. Sem este arquivo, OG image retorna 404 (restante do SEO funciona normalmente).

---

## Version

- **Current:** `0.115.1`
- **Last release:** 2026-05-31

### Últimas mudanças (atualizado por /fast)

> **Regra:** manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga.

| Versão | Resumo |
|--------|--------|
| `0.115.1` | App Check extraído para `src/lib/app-check.ts` com lazy loading via `ensureAppCheck()` — reCAPTCHA v3 (~729 KiB) só carrega para usuários autenticados; fontes Google otimizadas com preload assíncrono; `AuthContext` delega ao novo módulo; 8 docs de auditoria/planos removidos; testes atualizados |
| `0.115.0` | `FounderMessageDialog` no onboarding — dialog com mensagem pessoal do criador exibida apenas na primeira conclusão do wizard (persistido via localStorage); remoção completa da página `/status` (StatusPage, rota, footer link, sitemap, prerender, COEP config, ~180 traduções em 3 locales, testes) |
| `0.114.0` | SEO/AEO/GEO completo: pre-renderização das 9 rotas públicas via puppeteer-core (`scripts/prerender.mjs`); JSON-LD centralizado (`buildJsonLd` com 3 tipos: SoftwareApplication, WebPage, BreadcrumbList); `llms.txt` + `llms-full.txt` para visibilidade em LLMs; favicon `.ico` + `apple-touch-icon.png` + meta tags Apple; robots.txt com directive `Llms-txt`; deploy scripts agora usam `build:full`; plano completo em `docs/plan/seo-aeo-geo-plano-final.md` |
| `0.113.1` | `interviewInterrupt` movido para antes do primeiro uso em `assistant.ts` (corrige ReferenceError); novo `ToolRequestPartZodSchema` para serialização precisa de interrupts Genkit no round-trip frontend-backend; `interruptToolRequest` migrado do schema customizado para o schema nativo Genkit |
| `0.113.0` | Preservação completa de tool context via `fullHistory` (schemas, hooks, backend, persistência); compactação automática de histórico por tokens (`assistant-compaction.ts`); 3 novos componentes de UX (CodeBlock, ImageLightbox, ScrollToBottomFab); suporte a `genkit/beta`; animações Motion no chat (AnimatePresence); botão de regenerar resposta; 6 novos docs de auditoria/scan |
