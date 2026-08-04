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

**Voice previews** (`src/hooks/useVoicePreviews.ts`): arquivos `public/voice-previews/{voiceId}.wav` distribuídos junto com o build (Vite copia `public/` para `dist/`). `useVoicePreviews` controla play/stop com 5 mecanismos de proteção contra falsos positivos pós-navegação:
- `sessionTokenRef` (contador incremental) — callbacks de áudio verificam `isStale()` antes de aplicar efeito colateral
- Cleanup de unmount em `useEffect` — zera `onerror`/`onended` e revoga `src` antes do GC coletar o `<audio>`
- Lógica condicional `code === 4 && audio.src === ''` — silencia o caso degenerado onde Chrome dispara `onerror` ao limpar `src=''` + `load()`
- `setErrorId(null)` em `stop()` + `clearError` exposto — indicador de erro não persiste indefinidamente

### Geração de Imagens
Geração via Genkit flow `images.ts`. Prompts de cena via `scene-prompts` (saída textual JSON, não imagens). Aspect ratios: 8 (estúdio) / 5 (cenas) / 3 (vídeo). Frameworks visuais: `general` ou `whiteboard`. StockMediaPicker com Pexels API (fallback local).

### Vídeo (Remotion)
Renderização client-side via WebCodecs com fallback de codec (H.264+AAC → H.264 → VP8+Opus+WebM). Legendas: pipeline 3 fontes (segment-timing > whisper-aligned > proportional). Speed Paint: edge detection + contour tracing + Bézier fitting (modo vetorial) ou BFS + tracing (modo mask), renderização Remotion com fases sketch/reveal. Timings centralizados em `speedPaintTimings.ts` (`DEFAULT_SPEED_PAINT_HOLD_SECONDS=3s`, `DURATION_BASED_SKETCH_RATIO=0.8`). Web Worker dedicado para pipeline vetorial off the main thread (`vetorialWorker.ts`). Cache LRU (SHA-256, **50 entradas** desde v0.134.0, chave inclui `mode + preset + sortOrder + canvasColor` desde v0.136.0). Export quality: 720p–4K.

**Speed Paint — dois modos de renderização (v0.133.0):**
- **`mask` (default, retrocompatível):** pipeline preservado — edge detection + BFS + tracing (Worker inline + fallback `processOnMainThread`). `StrokeAnimation` com `strokes[]` raster. Sem mudança de comportamento para projetos existentes.
- **`vetorial` (novo):** dois pipelines de vetorização coexistem (selecionados por preset):
  - **Pipeline legado (imagetracerjs):** `vectorizeImageLegacy()` converte `ImageData` em paths SVG via `imagetracerjs@1.2.6` — usado pelo preset `'default'` (único remanescente legado desde a consolidação 7→2 grupos / 20→4 presets da v0.133.0)
  - **Pipeline edge+bezier (v0.132.0):** `vectorizeImageEdgeBezier()` — Canny edge detection (`edgeDetection.ts`) → Moore-Neighbor contour tracing (`contourTracing.ts`) → cubic Bézier fitting (`bezierFitting.ts`) — usado por presets `edge-*` (`edge-default`, `edge-detailed`, `edge-bold` — apenas 3 após a consolidação da v0.133.0). Produz paths mais suaves com menos pontos.
- **Pipeline defensivo (v0.136.0):** `applyVetorialSafetyLimits()` aplicado em ambos os pipelines. 3 camadas: (1) sanitização numérica via `sanitizePathOrNull` (descarta `d` inválido, `length === 0` ou NaN, normaliza `strokeWidth` inválido), (2) limite de quantidade (`MAX_PATHS_PER_SCENE = 500`, reintroduzido na v0.136.0 como defesa em profundidade), (3) limite de bytes acumulado (`MAX_D_BYTES_PER_SCENE = 250_000` UTF-16, ≈375KB base64). Protege `renderMediaOnWeb` contra `Failed to convert SVG to image` em SVGs excessivamente grandes. `SVG_PATH_DATA_REGEX` valida cada `d` ANTES de `getLength` (exclui `e`/`E`/`+`/`NaN`/`%` e whitespace ilegal em XML 1.0).
- **`sortPaths()`** com 4 estratégias (`top-down`, `center-out`, `big-first`, `random`) — usa `matchAll` com flag `g` (preserva grupos `[1]`/`[2]`) em vez de `String.match` + `split(/\s+/)` (v0.136.0, S1). `filterPathsByBackgroundContrast()` remove paths cuja cor é próxima do fundo do canvas; aceita `canvasColor` desde v0.136.0 (W4 — antes hardcodava `'white'` em 2 lugares).
- **`WhiteboardScene`** (em `src/features/video-render/components/`): renderiza paths SVG crescendo sequencialmente com `strokeDashoffset` + caneta SVG inline (`Pencil` componente). Easing function plugável (`linear`, `smooth`, `bounce`) — convertido da string da store via `easingConverter.ts` (`getRemotionEasing`, v0.136.0). Motion blur na caneta (baseado em velocidade do traço). Tremor orgânico (`Math.sin`) para efeito de mão humana. `safeGetPointAtLength()` com fallback seguro. `TRANSITION_FRACTION` (0.05) controla transição entre strokes na animação da caneta. **`pencilFxId` via `useId()` do React 19** (v0.136.0, F7) — ID único por cena em vez de hardcoded `pencil-fx`, isola filtros SVG em cenas múltiplas. **`fitMode?: FitMode`** prop (v0.136.0, F4) — `'contain' | 'cover' | 'fill' | 'none'` para ajuste do SVG ao container (default `'contain'`).
- **Tipos `vetorial.ts`**: `SpeedPaintRenderMode` (discriminated union `'mask' | 'vetorial'`), `VetorialPreset` (4 valores: `'default'` legado + 3 `edge-*`), `VetorialPath`, `VetorialAnimation`, `VetorialPathSortOrder` (4 valores), `VetorialEasingType` (3 valores), `EdgePresetName` (3 valores). Re-exportados de `types.ts` para evitar import circular.
- **`BezierPath.contourIndex?`** (v0.136.0): índice do `Contour` de origem, setado por `fitBezierPaths` para pareamento path↔contour mesmo após descartes. `sampleColors` no `vectorizer.ts` usa `path.contourIndex ?? i` (fallback posicional para retrocompatibilidade).
- **Seletor de modo na UI** (`SpeedPaintPage.tsx`): `ToggleButtonGroup` com ícones distintos (`FormatPaintOutlined` para Clássico, `GestureOutlined` para Desenho), glow no estado ativo. Abaixo do toggle: `<Select>` de preset (4 opções em 2 grupos — `edge-detection` com 3 presets + `legacy` com 1), `<Select>` de sort order (4 opções com tooltips), `<Select>` de easing (3 opções). Guardas de runtime para validar valores de selects.
- **Alert UX de divergência de `canvasColor`** (v0.136.0, S2): quando `job.animation.canvasColor !== store.canvasColor` (após o usuário trocar a cor mas antes da próxima regeneração), mostra `<Alert severity="info" role="status">` com texto `"A cor do canvas mudou de {from} para {to}..."` e ação "Reprocessar". Não auto-trigger — exige clique para confirmar custo de reprocessamento.
- **Persistência dual storage:** `speedPaintRenderMode`, `speedPaintVetorialSortOrder` em `UserSetting` e `StudioUserSettings`; hooks `useSyncSpeedPaintRenderMode` + `useSyncSpeedPaintVetorialSortOrder` (debounce 2s). Mesmo padrão de `useAutoSaveStudioSettings`.
- **i18n** (3 locales): `modeLabel`, `modeClassic`, `modeVetorial`, `modeDescription`, `presetGroups` (2 grupos: `edge-detection`, `legacy`), `presets` (4 labels), `sortOrder*`, `easing*`, `sceneRenderMode` no namespace `speedPaint`. Adicionado em v0.136.0: `canvasColorReprocessHint`/`canvasColorReprocessAction` (alert UX) + `queueExportUniformTooltip`/`queueExportMixedModeBadge` (tooltip do batch) — 4 chaves × 3 locales = 12 entries.
- **Performance:** Pipeline edge+bezier: latência < 1000ms para imagens 1920×1080 (Canny + tracing + fitting). Fallback seguro para imagens sem bordas detectadas. `filterContoursByCompactness()` classifica contornos por área/perímetro antes da vetorização (helper público mas não conectado por padrão — contornos 1D do Canny têm compacidade ≈ 0 mesmo quando legítimos). `BACKGROUND_FILTER_WARN_RATIO = 0.5`.
- **Batch vetorial suportado**: `BatchOrchestrator` lê `renderMode`/`vetorialPreset`/`vetorialSortOrder`/`canvasColor` da store via `getState()` com race protection (`processingIdRef`). `speedPaintRenderController.tsx` propaga batch vetorial com `easing`/`canvasColor` desde v0.136.0. Seletor granular `s.job.status` (v0.136.0, S5) — evita re-render 30×/s durante progresso. **Tooltip de batch uniforme** (v0.136.0, F5) — detecta `hasMixedModes` na fila e mostra tooltip explicando que a exportação usa modo global (D04: lote uniforme, não misto).
- **Web Worker para pipeline vetorial** (v0.133.0): `vetorialWorker.ts` (123 linhas) processa edge+bezier off the main thread. Elimina bloqueio da UI em roteiros com muitas cenas. **Try/catch no construtor** (v0.136.0, F10) — quando `new Worker(url, {type:'module'})` lança (CSP restritivo, sandbox, navegador sem suporte a module workers), delega para `processVetorialOnMainThread` em vez de unhandled rejection. Integrado via `useEdgeWorker` e `processVetorialInWorker`.
- **Novas utilidades de geometria** (v0.133.0): `polygonArea()`, `polygonPerimeter()`, `filterContoursByCompactness()` em `vectorizer.ts` — classificam e filtram contornos antes da vetorização no pipeline edge+bezier.
- **SceneRenderModePanel** (v0.133.0): painel para seleção de modo de renderização por cena no editor de vídeo. Componente em `src/features/video-render/components/SceneRenderModePanel.tsx`, exportado em `src/features/video-render/index.ts`, utilizado em `VideoPage.tsx`. Suporta namespace i18n `sceneRenderMode` nos 3 locales.
- **Dependências adicionadas:** `imagetracerjs@1.2.6` e `@remotion/paths@4.0.448` (v0.131.0). Sem novas dependências na v0.132.0, v0.133.0 ou v0.136.0 — `easingConverter`, `applyVetorialSafetyLimits`, `pencilFxId` via `useId`, fitMode, contourIndex, e alert UX são implementações nativas do projeto.

**Renderização Cross-Route:** controllers Zustand singleton (`videoRenderController.tsx` + `speedPaintRenderController.tsx`) substituem hooks inline — o ciclo de vida do `renderMediaOnWeb` vive fora do React (AbortController em escopo de módulo, lazy import `@remotion/web-renderer`). `ExportCrossRouteToast.tsx` mostra progresso/erro/conclusão em qualquer rota. `useCrossRouteRenderGuard.ts` centraliza `beforeunload`, `visibilitychange` e `document.title`. Hooks fachada (`useVideoExporter.tsx`, `useSpeedPaintExporter.tsx`) delegam toda lógica aos controllers — `useEffect` cleanup que abortava render no unmount foi removido. `useCodecSupport` permanece local (detecção de codec é por-instância), sincronizado via `setCodecContainer()` action nomeada. **`reset()` do `speedPaintRenderController` preserva `codec`/`container`** (v0.136.0, F1) — antes zerava para defaults `'h264'`/`'mp4'`, sobrescrevendo o fallback VP8/WebM resolvido por `useCodecSupport` para browsers sem H.264 (Firefox Linux). **Falhas de validação setam `status: 'failed'`** (v0.136.0, F14) — `imageSource` ausente no mask, `items.length === 0` no batch, `firstAnimation` undefined após loop; antes a UI ficava eternamente em idle.

**Lazy loading de composições (v0.128.0):** as composições Remotion (`ExportableComposition`, `ExportableSpeedPaintComposition`, `ExportableBatchSpeedPaintComposition`) foram migradas de exports diretos para funções assíncronas (`createExportableComposition()`, `createExportableSpeedPaintComposition()`, `createExportableBatchSpeedPaintComposition()`) — os imports de `remotion` e dos componentes de cena agora são lazy, eliminando a dependência direta nos controllers e reduzindo o bundle inicial das páginas de vídeo/speed paint.

**`strokeWorker.ts` (v0.136.0):** construtor `new Worker(url)` envolto em try/catch (F6) — CSP restritivo, sandbox ou navegadores sem permissão para Blob workers lançam `Error`. Sem o try/catch, exceção vira unhandled rejection e o fallback main-thread não é acionado. Erro é relançado com `cause` (ES2022) preservando stack trace. **Timeout de cena NÃO chama `terminateStrokeWorker`** (W5) — worker é compartilhado entre cenas do lote (`speedPaintRenderer.ts` cria 1 por lote e reusa); terminá-lo mataria as cenas seguintes. Apenas remove os listeners desta cena e marca como timed out local.

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
3 locales (pt-BR, en, es), 20+ namespaces. `I18nProvider` no `main.tsx`. Hooks: `useLocale()` e `useLocaleSafe()`. `LocaleSelector` no SidebarFooter/PublicHeader/MobileBottomNav. `TranslationDictionary` com nested keys e pluralização. Últimos namespaces adicionados: `images` (alt text de showcases), `authAction` (verifyEmail, resetPassword, recoverEmail, validation, error, seoTitle, seoDesc), `analyticsConsent` (5 chaves: title, message, accept, deny, manage), `studio.header.logout` (4 chaves: dialogTitle, dialogDescription, dialogCancel, dialogConfirm), `configuracoes.interfaceLocaleLabel`, `feedback` (dialog, navItem, sidebar, toggle, user, groups), `pwaInstall` (title, actionInstall, actionDismiss, ariaInstallButton, ariaDismissButton), `stackedHeader` (collapseAriaLabel), `manualProject` (meta, steps, stepName, stepAudio, stepImages, errors, success, liveRegion, cta em 3 locales), `openSource` (hero, features, cta, metrics), `providerSettings` (testKey, saveKey, removeKey, validation), `speedPaint` (presetGroups, presets, sortOrder, easing), `sceneRenderMode` (seleção de modo de renderização por cena no editor de vídeo).

### Analytics & Consentimento
Sistema de analytics com consentimento explícito do usuário via `src/lib/analytics.ts` (~287 linhas). **Lazy loading:** módulo `firebase/analytics` (~64 KiB) só carrega após consentimento e apenas em produção. **Consentimento:** `AnalyticsConsentPrompt` (Snackbar + Dialog LGPD-compliant) com persistência em `localStorage` via `s2a_analytics_consent`. **Eventos:** 50 eventos tipados via `AnalyticsEventMap` — geração (áudio, imagem, vídeo, speed paint), autenticação (login, logout, signup), navegação (CTAs, hero), onboarding, exportação, erros, speed paint (preset/sort/easing) e projeto manual (9 eventos: upload áudio/imagem, reordenação, save, CTAs). **Identificação:** `syncAnalyticsUser()` vincula userId do Firebase Auth ao `user_id` do Google Analytics. **Controle:** `VITE_FIREBASE_ANALYTICS_ENABLED` (env var) + `isFirebaseAnalyticsEnabled()` — ativo por padrão apenas em produção. Componentes: `AnalyticsConsentPrompt.tsx`, `openAnalyticsConsentDialog()`.

### Environment & COEP
COEP ativo em `/app/**` (SharedArrayBuffer p/ Whisper + Remotion). Rotas públicas, `/login`, `/cadastro`, `/onboarding` sem COEP. **App Check com lazy loading:** `ensureAppCheck()` em `src/lib/app-check.ts` só inicializa reCAPTCHA v3 (~729 KiB, ~720ms) quando `AuthContext` detecta usuário autenticado — eliminando o custo em rotas públicas visitadas por anônimos. Emuladores seletivos via flags `VITE_EMULATOR_*`. **PWA:** vite-plugin-pwa com runtime caching (1 ano assets), update prompt via `PwaUpdatePrompt` (Snackbar MUI + SW reload), install prompt via `PwaInstallPrompt` (Snackbar MUI glass, cooldown 7d, serializado com AnalyticsConsentPrompt e PwaUpdatePrompt). Manifest: standalone, portrait, `theme_color: #0a0a0f`.

### UI & Theme
MUI v9 + Emotion com CSS layers. Dark mode (light existe mas idêntico). Fontes: Inter (sans), JetBrains Mono (mono), Playfair Display (serif). Tokens: brand (blue/orange), semantic, glow (3 níveis), gradients, surfaces (5 níveis). Component overrides: AppBar glass, Button radius 14, Card elevated, Alert semitransparente. Container `maxWidth: 1600px`.

**Helpers de tema compartilhados (v0.134.0 + v0.135.0):**
- **`src/theme/animations.ts`** — `exportDotPulseKeyframes` exportado como `SxProps<Theme>` com `@keyframes exportDotPulse`. Consumido por `SidebarNavItem` e `MobileBottomNav` via **array syntax** do MUI v9 (`sx={[exportDotPulseKeyframes, {...}]}`) — padrão recomendado oficial, evita spread que pode quebrar silenciosamente se o helper for refatorado para callback function no futuro.
- **`src/theme/surfaces.ts`** — centraliza 6 helpers `SxProps<Theme>`:
  - `glassPanelSx` — `glass` geral com `backdropFilter` responsivo (xs 14px, md 22px) e borda sutil alpha
  - `insetPanelSx` — `glass` recessado (sem sombra, alpha baixo)
  - `glassSurfaceSx` — `glass` superfície com blur fixo 22px (paper de painéis)
  - `appDrawerPaperSx` — `paper` padronizado dos Drawers laterais (backgroundColor + gradiente + borderRight) consumido por `MobileBottomNav`, `GuestMobileNav`, `PublicHeader` (extensão direta) e `Sidebar` (extensão via spread para `variant="permanent"`)
  - `appDrawerBackdropSx` — `backdrop` padronizado dos Drawers laterais temporários (blur 8px + BLACK_40) consumido pelos 3 Drawers via `slotProps.backdrop` (idiomático MUI v9, `BackdropProps` foi removido)
  - `searchFieldSx` — `TextField` com fundo semi-transparente e focus state refinado

  **Padrão MUI v9 confirmado via NotebookLM:** `BackdropProps` foi removido na v9 em favor de `slotProps.backdrop`. **Cross-browser Safari iOS:** todos os `backdropFilter` no projeto têm `WebkitBackdropFilter` emparelhado (20 propriedades 1:1 verificadas na auditoria da v0.135.0).

---

## Version

- **Current:** `0.136.0`
- **Last release:** 2026-08-04

### Últimas mudanças (atualizado por /fast)

> **Regra:** manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga.

| Versão | Resumo |
|--------|--------|
| `0.136.0` | **Novas capacidades opt-in + correções críticas no modo vetorial do Speed Paint:** novo módulo `easingConverter.ts` (74 linhas) converte `VetorialEasingType` (string) em `EasingFunction` do Remotion via tabela hoisted (referência estável para `React.memo`); alert UX de divergência de `canvasColor` na `SpeedPaintPage` (S2) com ação "Reprocessar"; tooltip explicativo de batch uniforme na `QueueStaging` (F5) detecta `hasMixedModes` e documenta o comportamento do export (D04); `applyVetorialSafetyLimits` aplicado em ambos os pipelines (3 camadas: `sanitizePathOrNull` + `MAX_PATHS_PER_SCENE=500` reintroduzido + `MAX_D_BYTES_PER_SCENE=250_000`); `pencilFxId` via `useId()` do React 19 em `WhiteboardScene` (F7) — IDs únicos por cena em vez de hardcoded `pencil-fx`; `fitMode?: FitMode` prop em `WhiteboardScene` (F4) — `'contain' | 'cover' | 'fill' | 'none'`; `contourIndex?` em `BezierPath` para pareamento path↔contour após descartes; `getMinY`/`distFromCenter` migrados para `matchAll` (S1) — coords negativas adjacentes à letra (`M-5 10`) não quebram mais o sort; `useVoicePreviews` 5 mecanismos anti-falso-positivo (sessionToken + cleanup unmount + condicional `code===4 && src===''` + `clearError` + `setErrorId(null)` no `stop`); `canvasColor`/`easing` propagados do store até o `renderMediaOnWeb` (F2/F3) — fecha o gap de "controle morto"; `reset()` do controller preserva `codec`/`container` (F1) — fallback VP8/WebM em Firefox Linux não é mais zerado; `strokeWorker` try/catch no construtor (F6) + timeout não compartilha (W5); falhas de validação setam `status:'failed'` em vez de idle eterno (F14); seletor granular `s.job.status` no `BatchOrchestrator` (S5) evita re-render 30×/s; `canvasColor` adicionado como discriminador no cache LRU (W2) em ambos os modos. 4 novas chaves i18n (`canvasColorReprocess*`, `queueExport*`) × 3 locales = 12 entries. 4 arquivos de teste novos (`vectorizer.safetyLimits`, `imageProcessing.workerFallback`, `CanvasColorAlert`, `easingConverter`) + ~1500 linhas de teste entre novos e modificados. Suíte completa passando |
| `0.135.0` | **Padronização de backdrop dos Drawers + Webkit prefix cross-browser:** novo helper `appDrawerBackdropSx` em `src/theme/surfaces.ts` (padrão MUI v9 `slotProps.backdrop`) padroniza `backdropFilter: blur(8px)` + `BLACK_40` nos 3 Drawers laterais temporários (`MobileBottomNav`, `GuestMobileNav`, `PublicHeader`) — antes só o MobileBottomNav tinha backdrop blur (inconsistência visual); 4 testes para o novo helper em `tests/theme/surfaces.unit.test.ts`; 3 Drawers migrados para `slotProps.backdrop` idiomático; Sidebar (`variant="permanent"`) migrada para spread de `appDrawerPaperSx`; **20 propriedades `backdropFilter` agora com `WebkitBackdropFilter` emparelhado** (14 arquivos corrigidos para Safari iOS — `Configuracoes`, `Assistant`, `FeedbackDialog`, `StudioPage`, `GalleryCard` 3x, `AssistantComposer` 2x, `CaptionEditorPanel`, `SpeedPaintScene`, `SubtitlePreview`, `ManualProjectForm`, `QueueStaging` 2x, `assistantUi`, `subtitle-editor/constants`, `ScriptEditor` override defensivo, `glassPanelSx`, `MobileBottomNav` Paper, `Sidebar`); 5 escape hatches de mock documentados com dependência explícita (quais exports são usados vs não usados); surfacesMock.ts atualizado para 6 stubs. Suíte completa: 2617/2617 passando |
| `0.134.0` | **Pacote de melhorias de qualidade — helpers compartilhados e DRY de testes:** novo helper `src/theme/animations.ts` com `exportDotPulseKeyframes` extraído (SxProps compartilhado consumido por `SidebarNavItem` e `MobileBottomNav` via array syntax do MUI v9); novo helper `appDrawerPaperSx` em `src/theme/surfaces.ts` centraliza estilo de Drawer lateral para 3 consumidores (`MobileBottomNav`, `GuestMobileNav`, `PublicHeader`); factory `tests/__mocks__/surfacesMock.ts` consolida 33 mocks idênticos de `surfaces` em 1 ponto único (5 mantêm inline como escape hatch documentado); `vitest.config.ts` configurado com `pool: 'forks'` + `testTimeout: 15000ms` + `maxWorkers: 50%` para resolver 4 flakies pré-existentes sob carga; 7 `useCallback` redundantes removidos do `MobileBottomNav` (recomendação oficial React 19 — `useEvent` não existe, função simples é preferida quando não há `memo`). Suíte completa: 2613/2613 passando |
| `0.133.0` | **Web Worker para pipeline vetorial e SceneRenderModePanel:** novo worker dedicado (`vetorialWorker.ts`) para processar Canny edge detection, contour tracing e Bézier fitting off the main thread — elimina bloqueio da UI em roteiros com muitas cenas. Novo componente `SceneRenderModePanel` para seleção de modo de renderização por cena no editor de vídeo. Utilitários de geometria adicionados (`polygonArea`, `polygonPerimeter`, `filterContoursByCompactness`). Namespace i18n `sceneRenderMode` nos 3 locales. Presets legados removidos (`posterized1/2/3`, `curvy`), padrão alterado para `edge-default`. Removida `isValidProjectVideo` de `firestore.rules`. |
| `0.132.0` | **Pipeline edge+bezier para modo vetorial no Speed Paint:** novo motor de vetorização com Canny edge detection (`edgeDetection.ts`) → Moore-Neighbor contour tracing (`contourTracing.ts`) → cubic Bézier fitting (`bezierFitting.ts`) — paths mais suaves e com menos pontos. Coexiste com pipeline legado (imagetracerjs). `sortPaths()` com 4 estratégias, `filterPathsByBackgroundContrast()`, `safeGetPointAtLength()`, easing plugável (`linear/smooth/bounce`), motion blur + tremor orgânico na caneta. 20 presets em 7 grupos na UI. Sort order e easing persistidos em dual storage. Batch vetorial suportado. `VetorialPathSortOrder` (4 valores), `VetorialEasingType` (3 valores), `EdgePresetName` (6 valores). 14+ novos arquivos de teste. Limitação: easing select não exposto na UI (default `smooth`) |
