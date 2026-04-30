# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.28.2] - 2026-04-30

### Adicionado

- **`GuestRoute`** (`src/components/GuestRoute.tsx`): novo componente de rota para visitantes não autenticados — exibe spinner de loading durante verificação de sessão (`role="status"`, `aria-live="polite"`), redireciona para `/app/estudio` se o usuário já estiver logado, renderiza `<Outlet />` para visitantes. Comporta como inverso do `ProtectedRoute`

### Alterado

- **Rotas de login/cadastro**: `LoginPage` e `RegisterPage` movidas para dentro do wrapper `<GuestRoute />` no router — usuários autenticados são redirecionados automaticamente para `/app/estudio` ao acessar `/login` ou `/cadastro`
- **LandingPage**: movida para dentro do `<GuestRoute />` — visitantes logados na raiz `/` são redirecionados para o app
- **Loading spinner duplicado removido**: `LoginPage` e `RegisterPage` não mais renderizam spinner de "Verificando sessão..." internamente — responsabilidade centralizada no `GuestRoute`
- **`ProtectedRoute`**: adicionado `role="status"` e `aria-live="polite"` no container de loading para conformidade WCAG (antes sem atributos ARIA)

### Removido

- **Loading spinner de LoginPage**: bloco `if (loading)` com spinner CircularProgress e texto "Verificando sessão..." removido (22 linhas)
- **Loading spinner de RegisterPage**: mesmo bloco removido (22 linhas)
- **Testes de loading duplicados**: 3 testes removidos de `LoginPage.component.test.tsx` (38 linhas), `RegisterPage.component.test.tsx` (42 linhas) e `pages.component.test.tsx` (6 linhas)

### Testes

- `GuestRoute.component.test.tsx`: 4 testes novos cobrindo renderização para visitante, spinner de loading com a11y (`role="status"`, `aria-live="polite"`), e redirecionamento para `/app/estudio` quando autenticado

---

## [0.28.1] - 2026-04-30

### Alterado

- **Logos centralizados**: novo módulo `src/assets/logos.ts` com todas as variantes de logo (`mark.transparent`, `mark.round`, `mark.square`, `full.transparent`, `full.round`, `full.square`, `full.roundedSquare`) e favicon. `LOGO_VERSION` constante para invalidação de cache em lote — basta incrementar para atualizar todas as referências
- **Referências de logo migradas**: `Header`, `PublicHeader`, `PublicFooter`, `LoginPage`, `RegisterPage` e `seo.ts` (`DEFAULT_IMAGE`) agora importam de `logos` em vez de caminhos hardcoded. `Mic` icon removido de `PublicFooter`, `LoginPage` e `RegisterPage` (não utilizado)

---

## [0.28.0] - 2026-04-30

### Adicionado

- **Onboarding Wizard** (`/onboarding`): nova página de onboarding com wizard de 3 passos (Perfil → Objetivos → Conclusão) substitui o tour guiado antigo. Usa `useWizardStore` (Zustand) com persistência em localStorage. Componentes: `WizardContainer`, `WelcomeStep`, `ProfileStep`, `GoalsStep`, `CompletionStep`, `StepNavigation`, `SelectionCard`. Animações via Motion. Rota pública (sem COEP)
- **Campos de perfil no user settings**: `name`, `role` (`WizardRole`) e `goals` (`WizardGoal[]`) adicionados a `UserSettings` e persistidos via `saveUserSettings()`
- **i18n do wizard**: chaves `wizard` e `onboarding` adicionadas nos 3 locales (pt-BR, en, es) com textos dos 4 passos, roles, goals e navegação

### Alterado

- **Redirecionamento pós-login/cadastro**: novos usuários sem onboarding completado são redirecionados para `/onboarding` em vez de `/app/estudio` (AuthContext)
- **App.tsx layout**: `isOnboardingRoute` controla ocultação do Header e do app layout na página de onboarding
- **COEP & Vite**: `/onboarding` adicionada às rotas públicas (sem COEP) em `vite.config.ts` e `public/robots.txt`

### Removido

- **Tour de onboarding antigo**: `src/features/onboarding/` removido por completo — `OnboardingManager`, `TourTooltip`, `WelcomeDialog`, `useOnboardingStore`, `ONBOARDING_STEPS`, `OnboardingStep`, `OnboardingState`, `TooltipPlacement`
- **Integração no StudioPage**: `OnboardingManager` não é mais renderizado como wrapper no StudioPage

### Testes

- `OnboardingPage.component.test.tsx`: 26 testes novos cobrindo renderização condicional por passo, navegação, seleção de role/goals, persistência no store e redirecionamento ao completar
- `AuthContext.unit.test.tsx`: assertions atualizadas para redirecionamento `/onboarding` (antes `/app/estudio`)
- `StudioPage.component.test.tsx`: mock do `OnboardingManager` removido
- `onboarding.unit.test.ts`: suite removida (feature substituída)

---

## [0.27.1] - 2026-04-30

### Alterado

- **Speed Paint — base de velocidade mais lenta**: `DEFAULT_SPEED_PAINT_MULTIPLIERS` alterado de `{ sketch: 1.0, reveal: 1.0 }` para `{ sketch: 0.25, reveal: 0.25 }` — base 4x mais lenta que a velocidade nominal do slider. Produz animações mais suaves e visíveis por padrão
- **`adjustProgress()` no renderer**: nova função de curva de potência que garante 100% de completude no final da animação quando velocidade <1x (ex: `0.25x → progress^4`). Velocidades >=1x continuam com multiplicação simples e clamping
- **`VideoComposition` compensação**: `globalSpeedMultiplier` dividido por 4 para alinhar `SPEED_PAINT_MULTIPLIERS` (slow/normal/fast) com a nova base de velocidade dos sliders granulares
- **`tsconfig.json`**: `docs/**` adicionado ao `exclude` (documentação de referência e planos)

### Adicionado

- **`docs/onboarding-ux/`**: applet AI Studio com UX de onboarding de referência (React + Tailwind + Motion)
- **`docs/plan/onboarding-page.md`**: plano detalhado para wizard de onboarding (`/onboarding`) com decisões técnicas

### Testes

- `types.unit.test.ts`: assertions atualizadas de `1.0` → `0.25` para `DEFAULT_SPEED_PAINT_MULTIPLIERS`
- `speedPaintRenderer.unit.test.ts`: novos casos para `adjustProgress` com velocidades <1x e >=1x
- `VideoExportPanel.unit.test.tsx`: data-attributes atualizados para refletir novo default

---

## [0.27.0] - 2026-04-29

### Adicionado

- **imageTextLanguage — idioma do texto nas imagens**: novo campo `imageTextLanguage` no `StudioDraftState` e `StudioSettingsPatch` que permite ao usuário selecionar em qual idioma os textos das imagens/cenas geradas pelo Gemini serão escritos. Persistido no localStorage (`s2a_image_text_lang`), default `pt-BR`. Integrado no Inspector com seletor de locale
- **LOCALE_LANGUAGE_MAP em gemini.ts**: mapa derivado de `LOCALE_CONFIGS` que traduz locale em nome de idioma para instruções ao Gemini (ex: `pt-BR` → "português brasileiro"). `LOCALE_CONFIGS` estendido com campo `geminiPromptName` para nomes customizados
- **getStoredImageTextLanguage()** em `studio.utils.ts`: helper de leitura do localStorage com validação via `isValidLocale` e fallback `pt-BR`
- **Propagação no pipeline**: `buildGenerateOptions` mapeia `imageTextLanguage` → `locale` nas opções de geração; `generateScenePrompts` injeta instrução crítica de idioma no prompt ao Gemini; `useAudioGenerator` recebe e propaga o locale
- **i18n — 3 locales**: chave `imageTextLanguage` adicionada nos dicionários pt-BR, en e es (label e descrição do seletor)
- **42 testes**: arquivo `tests/studio/imageTextLanguage.unit.test.ts` cobrindo `generateScenePrompts` (7), `buildGenerateOptions` (5), localStorage helpers (16) e studioStore (14) — zero bugs, zero falsos positivos

### Alterado

- **STORAGE_KEYS**: adicionada chave `imageTextLanguage: 's2a_image_text_lang'` (total: 17 preferências persistidas)
- **testes existentes**: assertion de 16→17 chaves distintas em `studio.utils.unit.test.ts`
- **types.ts (i18n)**: adicionado campo `geminiPromptName?: string` no tipo `LocaleConfig`

---

## [0.26.1] - 2026-04-29

### Corrigido

- **Speed Paint imageProcessing CORS**: `img.crossOrigin = 'anonymous'` adicionado ao `Image` element em `generateStrokesFromImage()` — previne canvas tainted ao carregar imagens cross-origin, alinhando com padrão já usado em `loadImageElement()` no video-render

---

## [0.26.0] - 2026-04-29

### Adicionado

- **Firebase Cloud Functions v2 (backend)**: diretório `functions/` com integração Stripe completa — `stripeWebhook` (Express + onRequest para eventos Stripe), `createCheckoutSession` (cria sessão de assinatura), `createPortalSession` (Customer Portal para gerenciar assinatura); deps: `firebase-admin` ^13.5.0, `firebase-functions` ^7.2.5, `stripe` ^22.1.0; tsconfig próprio com `module: Node16`
- **Stripe client-side**: `@stripe/stripe-js` ^9.3.0 adicionado; `src/lib/stripe.ts` com `loadStripe` lazy (singleton); `getStripePublishableKey()` em `env.ts`; app funciona normalmente sem a key (plano Free)
- **Billing conectado ao app**: `useBillingStore` (Zustand) — estado global de plano/uso, carrega do Firestore (`users/{uid}/subscription/current`) via `onSnapshot` em tempo real; `useBillingInit` — hook de inicialização usado no AuthContext; `UpgradeDialog` — dialog com cards de plano e redirect para Stripe Checkout; `PlanBadge` integrado no Header
- **Pexels API para stock media**: `src/lib/pexelsApi.ts` — cliente HTTP com `withRetry`, tipos tipados (`PexelsPhoto`, `PexelsSearchResponse`); `stockMedia.ts` atualizado para usar Pexels quando `VITE_PEXELS_API_KEY` disponível, fallback para placeholder; `getPexelsApiKey()` em `env.ts`
- **Firestore indexes**: `stripeCustomerId` index (ASC + DESC) na collection `users` para queries de webhook
- **Env vars**: `VITE_STRIPE_PUBLISHABLE_KEY` (opcional) e `VITE_PEXELS_API_KEY` (opcional) com tipo `OptionalEnvName`

### Alterado

- **PricingPage refatorada**: dados de planos importados de `billing/plans.ts` (`PLANS`, `formatPrice`) em vez de hardcoded; `PLAN_UI_META` (recommended badge, ctaVariant) e `PLAN_ORDER` controlam renderização; plano "Equipe/Team" renomeado para "Business" em todos os 3 locales
- **AboutPage**: roadmap refatorado com `ROADMAP_VERSIONS` e `ROADMAP_STATUSES` arrays (dados separados da apresentação)
- **StatusPage**: incidentes hardcoded removidos, componente simplificado
- **i18n**: 3 locales atualizados — novas seções `billing` (upgrade, badge, portal, usage, entitlement) e `features.business`; remoção de `pricing.plans.team` (substituído por `business`)
- **tsconfig.json**: `functions/**` adicionado ao `exclude`

### Removido

- `docs/plan/transformacao-estrutural-script-master.md` (plano concluído)
- `docs/scan/1.md` (scan resolvido)

### Testes

- `AuthContext.unit.test.tsx`: mock `db: {}` adicionado para billing store
- `i18n.unit.test.ts` e `locales.completeness.unit.test.ts`: assertions atualizadas de `team` → `business`
- `PricingPage.component.test.tsx`: assertions atualizadas para plano Business e preço do Pro

---

## [0.25.0] - 2026-04-28

### Adicionado

- **i18n — internacionalização completa**: sistema de 3 locales (pt-BR, en, es) propagado para todas as páginas públicas e componentes autenticados via `I18nProvider` + hook `useLocale`; seletor de idioma no header; dados localizados (authBenefits, pricingFaq, metrics, testimonials, useCases); OG locale map para SEO
- **Onboarding**: tour guiado com WelcomeDialog, TourTooltip, OnboardingManager e store Zustand — integrado no StudioPage
- **Billing foundation**: tipos (PlanId, Plan, PlanLimits, UsageState), 3 planos (Gratuito, Pro, Business), utilitário `checkEntitlement`, componentes PlanBadge e UsageIndicator — base preparada, aguarda conexão ao app
- **Templates de roteiro**: galeria de templates categorizados com TemplateSelector, TemplateCard, TemplateGallery e TemplatePreviewDialog — integrado no Inspector e StudioPage (nova aba)
- **Emoções no TTS**: `EmotionType` com 10 emoções, EmotionSelector com slider de intensidade, validação e persistência no store — integrado no Inspector e pipeline de geração de áudio
- **Stock Media Picker**: busca de imagens de referência integrada ao ImageStudio (placeholder com 20 imagens, aguarda API real)
- **Landing Page — novas seções**: UseCasesSection, MetricsSection, ProductDemoSection, TestimonialsSection com dados localizados e animações motion

### Alterado

- **App.tsx refactor**: 511→~160 linhas — rotas lazy-loaded movidas para `src/router/routes.tsx`; AudioGenerationHandler e ToastProvider extraídos como componentes independentes; redirects de compatibilidade em `src/router/Redirects.tsx`
- **~20 testes existentes** atualizados com `I18nProvider` como wrapper

### Adicionado (testes)

- ~30 novos arquivos de teste cobrindo app-shell, routing, i18n (context, utils, locales, integration), billing (data, usage), onboarding, templates, emoções, dados localizados e features dos componentes

---

## [0.24.7] - 2026-04-27

### Alterado

- **`SpeedPaintScene` — sistema de 4 zonas**: substituído `computeSafeFadeFrames`/`springFadeIn`/`springFadeOut` (transitions helpers) por 4 zonas determinísticas com `interpolate` do Remotion: fade in (1s) → animação → hold (3s) → fade out (1s). Opacidade movida de `ctx.globalAlpha` para CSS no `<AbsoluteFill>`, permitindo crossfade real entre cenas via overlap de Sequences
- **`VideoComposition` — overlap dinâmico por cena**: speed paint usa 1s de overlap (`SPEED_PAINT_OVERLAP_MS`), cenas estáticas mantêm 400ms — overlap calculado por cena ao invés de global
- **`sendMessage` estabilizado com `useCallback`**: referência do `sendMessage` no `useAssistant` agora é estável com deps `[user, messages, currentState, ai]` — previne re-criações desnecessárias em consumidores
- **PWA `navigateFallbackDenylist`**: `/__/` adicionado para não interceptar endpoints internos do Firebase Hosting (`/__/auth/handler`, `/__/firebase/init.json`)

---

## [0.24.6] - 2026-04-27

### Alterado

- **Firestore persistence modernizada**: `enableIndexedDbPersistence` (legado/depreciado) substituído por `initializeFirestore` com `persistentLocalCache` + `persistentMultipleTabManager` — API recomendada pelo Firebase Web SDK v10+, com suporte nativo a múltiplas abas sem try/catch
- **`optimizeDeps.include`** adicionado para `mediabunny` e sub-pacotes (`aac-encoder`, `flac-encoder`, `mp3-encoder`) — garante pre-bundling correto pelo Vite e elimina warnings de dependências dinâmicas
- **Firestore composite indexes**: 3 novos indexes `COLLECTION_GROUP` adicionados para `audios`, `images` e `videos` (campo `userId ASCENDING`) — necessários para as queries `collectionGroup` usadas pela galeria de projetos (introduzidas na 0.24.5)

---

## [0.24.5] - 2026-04-27

### Corrigido

**Bugs críticos:**
- **Dupla instância `useAudioGenerator`** (CRÍTICO): StudioPage criava sua própria instância do hook, desconectando geração do ActionBar (player/download nunca apareciam). Instância removida — StudioPage agora recebe `isGenerating`, `scenes`, `handleGenerate` e `isGenerateDisabled` como props do App.tsx
- **Imagens de cena nunca deletadas no cleanup LGPD**: `deleteGenerationsAndSceneImages()` usava path errado (`generations_images/{uid}/{id}` em vez de `generations_images/{uid}/{id}_scene_{index}.png`). Agora lê o campo `scenes` de cada documento para construir paths corretos
- **Galeria não exibia vídeos exportados**: `getProjectDetails` e `getProjectsDetailsMap` ignoravam a subcoleção `videos`. Agora incluem vídeos via `collectionGroup` query (Firestore) e `VIDEOS_STORE` (IndexedDB)
- **Race condition no `useVideoExporter`**: `catch`/`finally` de renders antigos podiam corromper estado de renders novos. `renderIdRef` com guards adicionados para isolar cada renderização

**Bugs de funcionalidade:**
- **`useAssistant`**: chamadas Firestore sequenciais (`getMemories` + `getUserSettings`) convertidas para `Promise.all` — elimina 150-600ms de latência no primeiro envio de mensagem
- **`deleteChatSession`** não deletava do IndexedDB quando `userId` presente — apenas Firestore era deletado. Agora deleta de ambos via `Promise.all`
- **Exclusão de conta**: `deleteUser()` agora é chamado PRIMEIRO (antes do cleanup LGPD). Se o cleanup falhar, dados residuais são notificados via `window.confirm()` antes do redirect
- **`ProtectedRoute`**: login por email/senha sem verificação de email agora bloqueia acesso ao app — exibe tela com botão "Reenviar email de verificação" e loading state
- **`DataMigrationDialog`**: `.catch()` adicionado com fallback seguro para migrações com erro
- **Blob URL de referência** não era revogado no `useEffect` cleanup do `ImageStudio`
- **Blob URL de áudio** não era revogado após download na `Library`
- **`setTimeout` sem cleanup** no `AnimationControls` — auto-start de gravação batch podia disparar após navegação rápida
- **`reader.onerror`** sem feedback no `Inspector` — upload de referência falhava silenciosamente
- **`formatTime`** movido de `audioState` para `audioActions` no `ActionBar`
- **Contagem de testes**: 1185 → 1180 (5 testes SpeedPaint corrigidos após mudança de API de props)

**LGPD / data loss:**
- **Firestore offline persistence**: `enableIndexedDbPersistence(db)` ativado com fallback silencioso para múltiplas abas
- **`getChatSessions`**: sessões IndexedDB agora filtradas por `userId` — não mistura dados de usuários diferentes
- **`handleFirestoreError`**: causa original do erro preservada via `{ cause: error }`
- **`runRequest` (IndexedDB)**: resolve na conclusão da transação (`transaction.oncomplete`) em vez de no sucesso individual — evita resolver antes de commit
- **Upload resumável**: `uploadBytesResumable` para blobs >10MB — evita OOM e permite recuperação em falhas
- **`limit(100)`** adicionado em todas as queries Firestore de listagem (projects, generations, images, memories, chats, videos)

### Alterado

**Estúdio:**
- **`Inspector`**: 22 props de config removidas — agora lê tudo diretamente do `useStudioStore` com `useShallow`. Recebe apenas `isGenerating` como prop
- **`StudioPage`**: simplificada de 104→36 linhas — estado de config e geração removidos (vêm do App.tsx via props)
- **`App.tsx`**: `StudioPage` agora recebe props dinâmicas do hook de geração; `routes` memoizado com deps corretas
- **`ActionBar`**: seletores primitivos do AudioContext (`useAudioIsPlaying`, `useAudioCurrentTime`, `useAudioDuration`) substituem `useGlobalAudioState` — elimina ~4 re-renders/s durante playback
- **`applySettings`**: loop genérico sobre `Object.entries(patch)` substitui 14 if/else manuais
- **`buildGenerateOptions`**: usa spread (`...state`) em vez de 15 atribuições individuais; tipo `GenerateOptionsState` extraído

**Vídeo:**
- **`SpeedPaintControls`**: props mudaram de objeto `multipliers`/`onMultipliersChange` para primitivas `sketch`/`reveal`/`onSketchChange`/`onRevealChange` — elimina objeto intermediário e estabiliza callbacks
- **`VideoExportPanel`**: seletor de velocidade `SPEED_OPTIONS` (slow/normal/fast) removido — sliders granulares são suficientes; `speedPaintSpeed` fixo em `'normal'`

**Assistente:**
- **`retryLastMessage`**: novo método no `useAssistant` — botão "Tentar novamente" no Alert de erro reenvia última mensagem do usuário
- **Delete dialogs**: Assistant usa `DeleteConfirmationDialog` compartilhado (DRY) em vez de Dialogs duplicados — mesmo componente de Library e ImageStudio

**Páginas públicas:**
- **3 CTAs corrigidos** de `/login` → `/cadastro` (PricingPage hero, PricingPage final, FuncionalidadesPage final)
- **Link "Contato"** adicionado ao header público
- **Tabela de comparação** (PricingPage): `Grid` com roles ARIA substituída por `<table>` semântica nativa (`<thead>`, `<tbody>`, `<th>`, `<td>`)
- **CTASection**: glow do botão trocado de azul (`BRAND_PRIMARY_GLOW`) para laranja (`BRAND_SECONDARY_GLOW_SOFT`)
- **StepCard**: `glassPanelSx` aplicado (consistência com outros cards)
- **`EMAIL_REGEX`** movido para escopo de módulo no ContactPage (evita recriação por render)

**Acessibilidade:**
- **FAQAccordion**: `id`/`aria-controls`/`role="region"`/`aria-labelledby` adicionados (WCAG 4.1.2)
- **`aria-hidden="true"`** adicionado em 10 ícones decorativos (ContactPage, StatusPage, ProtectedRoute)
- **`aria-current="page"`** adicionado nos links ativos do header (desktop e mobile)
- **`aria-label="Verificando sessão"`** adicionado no spinner do `ProtectedRoute`
- **`prefers-reduced-motion`**: desabilita animação `pulseGlow` no AboutPage
- **Duplicate `<main>`**: `component="main"` removido de `PageLayout`, `LoginPage` e `RegisterPage` (App.tsx já fornece o landmark)

**SEO:**
- **NotFoundPage**: `<meta name="robots" content="noindex, nofollow">` adicionado via React 19 hoisting

**Performance:**
- **`useCallback` removido** de `getPrice` no PricingPage (cálculo trivial, deps estáveis)
- **`useShallow` no Inspector** (Zustand) — evita re-renders quando state não mudou

**Dead code cleanup:**
- **`extractVideoThumbnail.ts`** removido (não referenciado em nenhum lugar)
- **4 variantes de animação mortas** removidas de `animations.ts` (`slideInLeft`, `slideInRight`, `heroContainer`, `showcaseContainer`)
- **11 type/interface exports** tornados internos (`LogLevel`, `LogPayload`, `LoggerInstance`, `ErrorMappingRule`, `ErrorMapperConfig`, `ErrorMapper`, `RetryResult`, `FirebaseEnvConfig`, `ProjectSettings`, `StoredTranscription`, `StudioConfigState`)
- **3 barrel re-exports** removidos de `studio/store/index.ts` (`StudioConfigState`, `STORAGE_KEYS`, `SCENE_RATIOS`)
- **1 dependência npm removida**: `es-abstract` (transitiva redundante)
- **`searchFieldSx`** extraído para `surfaces.ts` (DRY entre Library e ImageStudio)

### Testes

- 7 arquivos de teste atualizados para refletir mudanças na API de componentes (Inspector props, SpeedPaintControls props, PageLayout sem `component="main"`, barrel exports)
- 5 testes corrigidos no `VideoExportPanel` (mock atualizado para props primitivas do SpeedPaintControls)
- Total: 1180 testes passando

---

## [0.24.4] - 2026-04-26

### Alterado

- **`react-helmet-async` removido** — migrado para suporte nativo do React 19 (`<title>`, `<meta>`, `<link>` com hoisting automático para o `<head>`)
- **`src/lib/seo.ts`**: interfaces próprias `SeoMeta`, `SeoLink` e `SeoData` substituem `HelmetProps`; `getPageSeo()` retorna `SeoData` em vez de `HelmetProps` — mesma lógica, tipo próprio
- **`src/components/DocumentHead.tsx`** (novo): componente que renderiza `<title>`, `<meta>` e `<link>` usando hoisting nativo do React 19; defaults defensivos (`meta = []`, `link = []`) para compatibilidade com mocks de teste
- **14 páginas**: `<Helmet {...seo} />` substituído por `<DocumentHead {...seo} />` (10 páginas públicas + LoginPage + RegisterPage)
- **`src/main.tsx`**: `HelmetProvider` removido — `App` agora é filho direto de `AudioProvider` (menos um nível de nesting)

### Removido

- **`react-helmet-async`** (^3.0.0) — dependência removida do `package.json`

---

## [0.24.3] - 2026-04-26

### Corrigido

**Data loss / LGPD:**
- **`shared.ts`**: `clearAllIndexedDbStores()` — limpa todas as stores IndexedDB na exclusão de conta (antes apenas Firestore + Storage eram limpos)
- **`account-cleanup.ts`**: `deleteAllUserData()` agora retorna `string[]` com categorias que falharam; `AuthContext` notifica o usuário sobre falhas parciais via `setAuthError`
- **`chats.ts`**: `saveChatSession()` faz fallback para IndexedDB em erro Firestore (antes `handleFirestoreError` sempre lançava, impedindo o fallback)
- **`chats.ts`**: `getChatSessions()` busca Firestore + IndexedDB e deduplica por `updatedAt` — sessões migradas para IndexedDB (>900KB) não ficam mais invisíveis

**Bugs de funcionalidade:**
- **`rate-limiter.ts`**: status HTTP `500` adicionado a `RETRYABLE_STATUS_CODES` — TTS agora retenta erros 500 intermitentes do Gemini
- **`AssistantMessages.tsx`**: `EmptyChatState` nunca renderizava — condição `messages.length === 0` alterada para `messages.length === 1 && messages[0].id === 'welcome'`
- **`AssistantComposer.tsx`**: botão "Parar" conectado ao `stopGeneration` real (antes chamava `onSubmit` que ignorava enquanto `isLoading`)
- **`DataMigrationDialog.tsx`**: migração só marca como concluída quando `result.errors === 0`; adicionados botões "Tentar novamente" e "Ignorar e continuar"
- **`useBatchDownload.ts`**: batch download com try/catch individual por item — falha parcial não interrompe os demais downloads
- **`PageLayout.tsx`**: `id="main-content"` duplicado removido (App.tsx já fornece o id)

**UX / feedback visual:**
- **`Inspector.tsx`**: upload de imagem >10MB agora exibe Alert de warning com auto-dismiss 5s (antes silencioso)
- **`Assistant.tsx`**: truncamento de documento na Base de Conhecimento exibe Alert com contagem de caracteres
- **`App.tsx`**: `beforeunload` registrado durante geração de áudio ou exportação de vídeo — previne perda de progresso ao fechar aba
- **`ContactPage.tsx`**: `window.location.href` trocado por `window.open(..., '_blank')` — preserva SPA se cliente de email não estiver configurado

**SEO:**
- **`LoginPage.tsx`**: SEO adicionado via `Helmet` + `getPageSeo` (antes era a única página sem SEO)

### Alterado

- **DRY**: `LOGIN_BENEFITS` e `REGISTER_BENEFITS` (idênticos) extraídos para `src/data/authBenefits.ts` como `AUTH_BENEFITS`
- **`LoginPage.tsx`** + **`RegisterPage.tsx`**: skip-to-content link local removido (App.tsx fornece global); `id="main-content"` duplicado removido
- **`chats.ts`**: `saveChatSession()` retorna `boolean` indicando fallback para IndexedDB; `useAssistant` loga warning quando salva apenas localmente
- **`AGENTS.md`**: Whisper `base (~75MB)` corrigido para `tiny (~39MB)`

### Testes

- 7 testes quebrados corrigidos: 4 skip-to-content removidos, 3 AuthContext deleteAccount (assinatura `deleteAllUserData` → `string[]`)
- Total: 1182 testes (3 removidos por obsolescência, 0 perdidos)

---

## [0.24.2] - 2026-04-26

### Corrigido

**Bugs críticos (LGPD / data loss):**
- **`account-cleanup.ts`**: storage path de vídeo corrigido (`videos/{uid}/{pid}` → `projects/{uid}/{pid}/videos/{id}.{ext}`) — vídeos agora são deletados corretamente durante exclusão de conta
- **`account-cleanup.ts`**: pipeline LGPD agora deleta imagens de cena da coleção `generations` (antes só deletava imagens standalone de `image_generations`)
- **`account-cleanup.ts`**: prefixo de imagens standalone corrigido (`generations_images/` → `images/`)
- **`account-cleanup.ts`**: `collectionGroup` (função) removida de template literal no log; storage deletions agora aguardam conclusão via `Promise.all`
- **`useAudioGenerator.ts`**: stale closure corrigido — refs espelhadas para `audioUrl/audioBlob/scenes/audioSegments` garantem que `previousState` reflita valores atuais ao restaurar estado após cancelamento/falha

**Bugs de funcionalidade:**
- **`useVideoExporter.tsx`**: race condition corrigida — `AbortController` movido antes da fase speed paint, cancelamento agora funciona durante toda a renderização
- **`VideoComposition.tsx`**: WaveformOverlay corrigido — frame passado para `getSceneTime` agora é absoluto (antes era relativo, waveform ausente em cenas >1)
- **`BatchOrchestrator.tsx`**: jobs órfãos agora são ignorados ao limpar fila (`processingIdRef` checado no `.then()`/`.catch()`)
- **`LoginPage.tsx`**: mensagem de erro do reset de senha extraída do `Error` lançado em vez do `authError` stale
- **`ActionBar.tsx`**: throttle de progresso corrigido — `bridgeFrame` removido das deps do `useEffect` (evitava 30 destruições/s do interval); frame sincronizado via ref

**Memory leaks:**
- **`AnimationControls.tsx`**: `MediaRecorder` agora limpo no `useEffect` cleanup ao desmontar
- **`Library.tsx`**: blob URLs de projeto anterior revogados ao trocar de projeto

**UI fixes:**
- **`FeatureShowcase.tsx`**: `bgcolor` trocado por `background` — gradiente de fundo do ícone agora renderiza corretamente
- **`FeatureCard.tsx`**: mesmo fix aplicado na variante `highlighted` (bug latente)
- **`FaqPage.tsx`**: classes MUI v9 atualizadas (`.MuiTabs-flexContainer` → `.MuiTabs-list`, `.MuiTab-iconWrapper` → `.MuiTab-icon`)

**Performance:**
- **`useAssistant.ts`**: streaming do assistente com batching via `requestAnimationFrame` — acumula chunks e faz flush uma vez por frame (reduz renders durante streaming)
- **`SubtitleOverlay.tsx`**: `getAlignment()` envolvido com `useMemo` — elimina alocação de objeto por frame
- **`AnimationPlayer.tsx`**: progress do speed paint throttled para ~20fps (antes 60fps causava re-renders excessivos)
- **`imageProcessing.ts`**: edge detection + BFS + vetorização movidos para Web Worker inline — main thread desbloqueada (antes bloqueava 500-2000ms)

**UX:**
- **`useImageGenerator.ts` + `ImageStudio.tsx`**: cancelamento de geração de imagem adicionado (`cancelRef` + botão "Parar geração")
- **`ImageStudio.tsx`**: download agora disponível para imagens IndexedDB (blob URL fallback quando `imageUrl` ausente)
- **`AssistantMessages.tsx` + `Assistant.tsx`**: chips do empty state agora clicáveis com prompts contextuais
- **`Library.tsx`**: `saveEdit` com try/catch — erro mantém campo aberto com feedback
- **`ScriptEditor.tsx`**: confirmação ao limpar roteiro >500 chars via `window.confirm`
- **`Inspector.tsx`**: validação de 10MB para upload de imagem de referência
- **`Assistant.tsx`**: `handleDocumentUpload` e `handleAddMemory` com try/catch + loading state + feedback de erro
- **`ProtectedRoute.tsx`**: texto "Verificando sessão..." adicionado abaixo do spinner
- **`App.tsx`**: redirect autoreferente `/cookies → /cookies` removido
- **`ActionBar.tsx`**: botão exportar desabilitado quando não há cenas
- **`AssistantMessages.tsx`**: fallback `document.execCommand('copy')` quando Clipboard API falha
- **`AboutPage.tsx`**: `@keyframes pulse` renomeado para `pulseGlow` (evitava conflito com global)
- **`ContactPage.tsx`**: botões redes sociais com `variant="outlined"` (borderColor funciona)

### Alterado

- **Tokens hardcoded substituídos**: StepCard (`#F7941E` → `BRAND_SECONDARY`), Library + ImageStudio (`#2E75B6` → `BRAND_PRIMARY`), AssistantComposer (`#ef4444` → `ERROR_MAIN`), Header (`borderColor` → `APP_BORDER_STRONG`)
- **DRY**: `authTextFieldSx` / `authLinkSx` extraídos para novo `src/theme/authStyles.ts` (importados por LoginPage e RegisterPage)
- **DRY**: `glassPanelSx` duplicado em ErrorBoundary e NotFoundPage substituído por import de `surfaces.ts`
- **LoginPage.tsx** + **RegisterPage.tsx**: links imperativos trocados por `<Typography component={Link}>` do RouterLink
- **StatusPage.tsx**: disclaimer movido para antes do banner de status

### Adicionado

- **`src/theme/authStyles.ts`**: estilos compartilhados de autenticação (`authTextFieldSx`, `authLinkSx`) — antes duplicados entre LoginPage e RegisterPage

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
