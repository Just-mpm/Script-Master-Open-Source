# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.130.0] - 2026-06-06

### Adicionado

- **Arquivos open source para governança do repositório** (+~350 linhas):
  - `SECURITY.md`: política de segurança e reporte responsável de vulnerabilidades
  - `CONTRIBUTING.md`: guia de contribuição com setup, padrões de código, commits e PR
  - `CODE_OF_CONDUCT.md`: código de conduta baseado no Contributor Covenant
  - `.github/ISSUE_TEMPLATE/`: templates para bug report, feature request e pergunta
  - `.github/PULL_REQUEST_TEMPLATE.md`: template padronizado para pull requests
  - `.github/FUNDING.yml`: configuração de sponsorship

- **Metadados no `package.json`**: campos `repository` (`git+https://github.com/matheusrc/script-master.git`), `bugs` (`https://github.com/matheusrc/script-master/issues`), `homepage` (`https://script-master.pro`) — integração com GitHub e visibilidade do projeto

- **Rota `/open-source` com `OpenSourcePage`** (`src/pages/public/OpenSourcePage.tsx`): nova página pública que substitui `/precos` (PricingPage) — conteúdo focado em modelo BYOK, instruções de fork e contribuição

- **Namespace i18n `openSource`** nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`): substitui o namespace `pricing` — todas as chaves de tradução renomeadas

- **`testApiKey` flow** (`functions/src/flows/test-api-key.ts`, +45 linhas): Cloud Function callable que faz uma chamada mínima ao Gemini (`gemini-3.1-flash-lite`) para validar a API key do usuário — retorna sucesso/erro com mensagem descritiva

- **`ProviderSettingsSection`** no frontend (`src/features/provider-settings/`, 3 arquivos): UI completa para o usuário salvar, testar e remover a API key do Gemini — persistida em IndexedDB local (escopada por `uid`), nunca enviada ao Firestore

### Alterado

- **Migração para BYOK finalizada** — backend sem Stripe, billing ou sistema de créditos:
  - `functions/src/genkit/genkit.ts`: `googleAI({ apiKey: false })` — nenhuma chave global
  - `functions/src/genkit/utils/byok.ts`: helpers `extractApiKey(input)`, `withApiKey(apiKey)`, `maskApiKeyForLog(apiKey)` centralizados
  - Cada flow extrai a key do payload via `extractApiKey(input)` e injeta via `withApiKey(apiKey)` no `config` de `ai.generate()`
  - Logs usam `maskApiKeyForLog(apiKey)` (mostra apenas primeiros/últimos 4 caracteres)

- **Namespace i18n `pricing` → `openSource`**: todas as chaves de tradução renomeadas em pt-BR, en e es — referências atualizadas em componentes e rotas

- **`.firebaserc`** apontado para placeholder `your-firebase-project-id` — forks precisam configurar o próprio projeto

- **`serviceAccount`** em `functions/src/index.ts` tornado opcional com comentário — facilita fork sem service account local

- **Documentação atualizada** (AGENTS.md, CLAUDE.md, Script-Master.md): `/precos` → `/open-source`, `PricingPage` → `OpenSourcePage`, menções a billing/pricing removidas

### Removido

- **Diretórios e arquivos de billing** (~2.500 linhas removidas):
  - `src/features/billing/` (diretório completo: componentes de planos, upgrade dialog, pricing cards)
  - `src/hooks/useCredits.ts` (hook de gestão de créditos)
  - `src/components/CreditIndicator.tsx` (indicador de créditos no header/sidebar)
  - `src/components/CreditBlockedMessage.tsx` (mensagem de bloqueio por créditos)
  - `src/lib/stripe.ts` (integração com Stripe)
  - `functions/src/usage/credit-*` (serviços de crédito: credit-service, credit-snapshot, credit-utils)
  - `functions/src/usage/period.ts` (cálculo de períodos de billing)
  - `functions/src/usage/audio-preflight.ts` (validação de créditos antes de gerar áudio)
  - `functions/src/flows/credit-snapshot.ts` (flow de snapshot de créditos)
  - `functions/src/genkit/middlewares/credit-metering.ts` (middleware de medição de créditos)

- **Mocks mortos em testes**: limpeza de mocks não utilizados em arquivos de teste — remoção de imports e setup de mocks que referenciavam módulos de billing já deletados

- **Resquícios de pricing em código e documentação**: todas as referências a `/precos`, `PricingPage` e namespace `pricing` removidas de AGENTS.md, CLAUDE.md e Script-Master.md

---

## [0.120.0] - 2026-06-01

### Adicionado

- **Sistema de Analytics com consentimento** (`src/lib/analytics.ts`, +287 linhas): nova lib de analytics com lazy loading (`getAnalyticsInstance()`) e consentimento explícito do usuário. 13 funções exportadas — `trackAnalyticsEvent()` com tipagem forte via `AnalyticsEventMap` (31 eventos mapeados), `grantAnalyticsConsent()`/`denyAnalyticsConsent()` com persistência em `localStorage`, `syncAnalyticsUser()` para identificação de usuários autenticados, `setAnalyticsUserProperties()` para metadados de sessão, `categorizeAnalyticsError()` e `getSizeBucket()` para analytics de erros e tamanhos. Implementa lazy loading do módulo `firebase/analytics` (~64 KiB sob demanda) — só carrega após consentimento e apenas em produção (controlado por `VITE_FIREBASE_ANALYTICS_ENABLED` + `isFirebaseAnalyticsEnabled()`)
- **AnalyticsConsentPrompt** (`src/components/app/AnalyticsConsentPrompt.tsx`, +130 linhas): novo componente de consentimento com Snackbar persistente (1ª visita) + Dialog (reabertura via `openAnalyticsConsentDialog()`). Exibe aviso LGPD-compliant com link para Política de Privacidade. Botões "Aceitar" e "Recusar" — dispara `grantAnalyticsConsent()`/`denyAnalyticsConsent()`. Exporta evento customizado `OPEN_ANALYTICS_CONSENT_EVENT` para reabertura programática via `dispatchEvent`
- **Integração de consentimento** em 3 pontos de UI: `Header.tsx` (botão Cookie na área do usuário logado), `PublicFooter.tsx` (link "Gerenciar cookies" entre links legais), `OnboardingPage.tsx` (botão "Gerenciar cookies" no onboarding)
- **Tracking de eventos** em 13 hooks/páginas/componentes: `Library.tsx`, `AudioGenerationHandler.tsx`, `CTASection.tsx`, `HeroSection.tsx`, `AuthContext.tsx`, `UpgradeDialog.tsx`, `wizardStore.ts`, `useSpeedPaintExporter.tsx`, `useVideoExporter.tsx`, `useAssistant.ts`, `useAudioGenerator.ts`, `useImageGenerator.ts`, `ContactPage.tsx` — eventos de geração (áudio, imagem, vídeo, speed paint), autenticação (login, logout, cadastro), navegação (CTAs), onboarding e exportação
- **Chaves i18n `analyticsConsent.*`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): namespace com 5 chaves — `title`, `message`, `accept`, `deny` e `manage` para o diálogo de consentimento de analytics
- **Nova env var** (`VITE_FIREBASE_ANALYTICS_ENABLED`) em `.env.example`, `README.md` e tipada em `vite-env.d.ts` — ativo por padrão apenas em produção via `isFirebaseAnalyticsEnabled()`
- **Novos assets de logo** (`public/logo-*.webp`, `public/apple-touch-icon.webp`): 7 variações de logo em formato WebP (quadrado, redondo, transparente, sem título) para PWA splash screens e apple-touch-icon

### Alterado

- **`src/lib/firebase.ts`**: export do `app` (`initializeApp()`) adicionado — necessário para `getAnalytics()` no módulo de analytics
- **`public/og-image.webp`**: atualizado (imagem Open Graph 1200×630 com logo + marca)
- **`src/pages/public/legalData.ts`**: refatoração interna (+18/-18 linhas) — dados legais reestruturados sem mudança de comportamento visível

### Corrigido

- **Testes**: `PublicFooter.component.test.tsx` — teste de links atualizado (verifica que "Roadmap" e "Changelog" não são renderizados); `OnboardingPage.component.test.tsx` — verifica botão "Gerenciar cookies" no onboarding com `hasTrackedStart: false`

---

## [0.119.0] - 2026-06-01

### Adicionado

- **Chat persistente no Assistente** (`src/hooks/useAssistant.ts`, +129/-2): nova constante `ACTIVE_SESSION_KEY` (`s2a_active_chat_session_id`) para salvar/restaurar a sessão ativa do chat no `localStorage` — o assistente agora retoma automaticamente a conversa anterior ao montar o hook, eliminando a perda de contexto entre navegações
- **Tour de boas-vindas do Assistente** (`src/hooks/useAssistant.ts`, `src/lib/db/user-settings.ts`, `src/lib/db/types.ts`): nova constante `TOUR_SEEN_KEY` (`s2a_assistant_tour_seen`) + flag `tourSeen` no tipo `UserSettings` + funções `markTourSeen()` e `hasTourSeen()` com suporte a dual storage (Firestore + IndexedDB). Ao primeiro acesso, o assistente envia uma mensagem de boas-vindas automática após 1.5s; visitas subsequentes não repetem o tour
- **Chaves i18n `tourAutoMessage`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): mensagem de boas-vindas automática do assistente em inglês, espanhol e português
- **Skill: Tour da Plataforma** (`functions/src/skills/tour-da-plataforma/SKILL.md`, +144 linhas): nova skill que guia novos usuários pela plataforma com instruções passo-a-passo, referências a posições reais da UI e personalização por perfil (nome, papel, metas)
- **OG Image para SEO** (`public/og-image.webp`, 1200x630): imagem Open Graph com logo + marca do produto — referenciada por `seo.ts` como `OG_IMAGE_URL` para previews em redes sociais e LLMs

### Alterado

- **Redirecionamento padrão unificado para `/app/assistente`** (7 arquivos): todas as rotas de destino pós-autenticação agora apontam para o Assistente em vez do Estúdio — `GuestRoute.tsx`, `AuthContext.tsx` (2 ocorrências), `CompletionStep.tsx` (onboarding), `NotFoundPage.tsx`, `OnboardingPage.tsx`, `routes.tsx` (redirect `/app`). O Assistente é agora a landing page pós-login, consolidando-o como hub principal da plataforma
- **`PublicHeader.tsx`**: link "Abrir App" alterado de `/app/estudio` para `/app/assistente`
- **`useAssistant.ts`**: `fullHistoryRef` mantido; novo cleanup com `vi.clearAllTimers()` nos testes para evitar warnings de act() com timers do tour
- **`AGENTS.md` / `CLAUDE.md`**: seção "Pendências" sobre OG Image removida (arquivo `public/og-image.webp` agora existe)

### Documentado

- **`docs/audits/2026-06-01-chat-persistente-tour-audit.md`** (+187 linhas): auditoria estática do chat persistente + tour de boas-vindas — 28 arquivos revisados, 1 bug real (timeout sem cleanup) documentado
- **`docs/qa-loop/rotas-autenticadas-ux-leigo.md`** (+52 linhas): relatório de QA UX nas 8 rotas autenticadas — veredito funcional e consistente, 8 recomendações de melhoria
- **`docs/scan/2026-06-01-diff-chat-persistente-tour.md`** (+280 linhas): scan de lacunas — 3 gaps priorizados (GAP-01: `AGENTS.md`/`CLAUDE.md` desatualizados resolvido nesta versão)
- **`docs/test/2026-06-01-assistant-persistent-chat-vitest.md`** (+134 linhas): relatório de testes — 18 testes criados, 17/18 passaram, 1 bug real (BUG-001: closure do timeout)
- **`docs/test/2026-06-01-user-settings-vitest.md`** (+67 linhas): relatório de testes — 10 testes unitários para `markTourSeen`/`hasTourSeen`, 10/10 passaram

### Corrigido

- **Testes**: 3 novos arquivos de teste adicionados (`useAssistant.persistent-chat.unit.test.tsx` +612 linhas, `user-settings.unit.test.ts` +231 linhas, `NotFoundPage.auth-redirect.component.test.tsx` +88 linhas). 4 arquivos de teste atualizados para refletir o novo destino `/app/assistente` (routing, GuestRoute, PublicHeader, OnboardingPage)

---

## [0.118.0] - 2026-06-01

### Adicionado

- **AssistantComposerHandle — forwardRef pattern** (`src/features/assistant/components/AssistantComposer.tsx`, +83/-23): nova interface exportada `AssistantComposerHandle` com `forwardRef` + `useImperativeHandle` — permite que componentes pais (ex: `Assistant.tsx`) controlem o composer programaticamente via ref. O componente interno foi renomeado para `AssistantComposerInner` com tipagem via `ForwardedRef<AssistantComposerHandle>`. Mantém compatibilidade total com props existentes
- **`extractSkillName()`** (`src/features/assistant/components/ToolEventCard.tsx`, +36/-6): nova função utilitária que extrai o nome de uma skill a partir de eventos de ferramenta do assistente — usada para exibição contextual de skills carregadas

### Alterado

- **`Assistant.tsx`** (+10/-10): adaptação para usar o novo `ref` com `AssistantComposerHandle` — integração do forwardRef pattern no layout do chat
- **`functions/src/flows/assistant.ts`** (+18/-14): modificações internas no fluxo do assistente para suportar o novo pattern de comunicação entre frontend e backend

### Corrigido

- **`tests/components/Inspector.features.test.tsx`** (-9 linhas): removidos 3 mocks obsoletos do `TemplateSelector` (componente removido na v0.116.0) — eliminando warnings de mock de dependência inexistente

---

- **`firebase-blueprint.json`** (109 linhas): blueprint de entidades Firestore (Memory, Project, AudioSource, ProjectImage) removido — arquivo de documentação de schema que não é mais utilizado pela aplicação
- **`metadata.json`** (6 linhas): metadados de projeto (nome, descrição, permissões, capacidades) removidos — arquivo obsoleto que não tem função no ecossistema atual

### Corrigido

- **`tests/functions/assistant-context.unit.test.ts`**: removidas referências a `voicesList`/`paceList` no teste de contexto do assistente — alinhamento com a simplificação do prompt do assistente (v0.117.0) onde esses campos foram movidos do contexto fixo para o sistema de Skills (`skills.ts`). O teste agora reflete o novo retorno do contexto sem as listas de vozes/velocidades

---

## [0.117.0] - 2026-06-01

### Adicionado

- **Sistema de Skills para o Assistente IA** (`functions/src/genkit/middlewares/skills.ts`, +307 linhas): novo middleware Genkit que escaneia diretórios de `SKILL.md`, mantém cache em memória e injeta a ferramenta `use_skill` no assistente. O assistente pode consultar conhecimento especializado (guia de vozes, melhores práticas TTS) durante a conversa
- **Script de build para skills** (`functions/scripts/copy-skills.mjs`, +33 linhas): copia arquivos `SKILL.md` do diretório `functions/src/skills/` para o diretório de build durante `npm run build` nas Cloud Functions
- **Skill: Guia de Vozes** (`functions/src/skills/guia-de-vozes/SKILL.md`, +103 linhas): catálogo completo das 30 vozes Gemini TTS com características, estilos e recomendações de uso
- **Skill: Melhores Práticas TTS** (`functions/src/skills/melhores-praticas-tts/SKILL.md`, +181 linhas): guia de otimização de roteiros para síntese de voz — pontuação, audio tags, emoções e técnicas avançadas
- **ToolEventCard — suporte a `use_skill`** (`src/features/assistant/components/ToolEventCard.tsx`): novo tipo de evento `use_skill` no chat do assistente com ícone Star (`@mui/icons-material/Star`) e formatação visual dedicada
- **i18n — labels de skill** (3 locales): chaves `useSkill` e `loadingSkill` adicionadas em pt-BR, en e es para exibição do status de carregamento de skills

### Alterado

- **Fluxo do assistente** (`functions/src/flows/assistant.ts`): adicionado `skillsMiddleware` com caminho de skills (`skillPaths`) e registro no Genkit flow via `use: [skillsMiddleware]`
- **Fluxo inline-assistant** (`functions/src/flows/inline-assistant.ts`): removido import do `constants.js` (não mais necessário com novo sistema de skills)
- **Prompt de contexto do assistente** (`functions/src/genkit/utils/assistant-context.ts`): simplificado — removidos campos `voicesList`/`paceList` do retorno e texto do prompt reduzido (agora gerenciado via skills)
- **Build das Functions** (`functions/package.json`): script `build` agora executa `node scripts/copy-skills.mjs` após o `tsc` para garantir que skills sejam copiadas para a build

---

## [0.116.0] - 2026-05-31

### Alterado

- **Créditos gratuitos reduzidos** (`src/data/pricingFaq.ts`): gratuito era 1.000 créditos/mês → 500 créditos/mês. FAQs de billing atualizados nos 3 locales (pt-BR, en, es). Teste `PricingPage.component.test.tsx` atualizado para refletir novo valor
- **hreflang removido do SEO** (`src/lib/seo.ts`): campos `hreflang` e construção de links alternates removidos —简化 SEO output, hreflang agora gerenciado via `public/sitemap.xml` apenas

### Removido

- **Sistema de Templates do Estúdio** (~1000 linhas): arquivos e componentes de template de roteiro removidos — não há mais TemplateSelector, TemplateGallery, TemplatePreviewDialog, TemplateCard, templateUtils, scriptTemplates.ts, templates.ts, nem imports em Inspector.tsx
  - `src/data/scriptTemplates.ts` (262 linhas)
  - `src/features/studio/types/templates.ts` (8 linhas)
  - `src/features/studio/utils/templateUtils.ts` (69 linhas)
  - `src/features/studio/components/TemplateCard.tsx` (159 linhas)
  - `src/features/studio/components/TemplateGallery.tsx` (112 linhas)
  - `src/features/studio/components/TemplatePreviewDialog.tsx` (238 linhas)
  - `src/features/studio/components/TemplateSelector.tsx` (134 linhas)
  - `tests/studio/template*.test.tsx` (5 arquivos de teste removidos)
  - `templates` e `patchLabels` removidos dos 3 arquivos de locale (pt-BR, en, es)

### Corrigido

- **Meta tag Apple** (`index.html`): `apple-mobile-web-app-capable` corrigido para `mobile-web-app-capable` — valor correto para Progressive Web Apps

---

## [0.115.1] - 2026-05-31

### Alterado

- **App Check extraído para lazy loading** (`src/lib/app-check.ts`, +67 linhas): módulo dedicado com `ensureAppCheck()` idempotente — só carrega reCAPTCHA v3 (~729 KiB, ~720ms) quando usuário autenticado é detectado. Visitantes anônimos (landing page, rotas públicas) não acionam mais o reCAPTCHA. `firebase.ts` simplificado (-40 linhas) com import delegado ao novo módulo
- **Fontes Google otimizadas** (`index.html`): carregamento assíncrono com `<link rel="preload" as="style">` + `media="print" onload="this.media='all'"` + fallback `<noscript>` — fontes não bloqueiam mais a renderização inicial
- **AuthContext**: importa `ensureAppCheck` do novo módulo `src/lib/app-check` em vez de `src/lib/firebase`

### Removido

- **8 documentos de auditoria/plano/scan** (`docs/audits/`, `docs/plan/`, `docs/scan/`): limpeza de documentos de trabalho já consumidos ou substituídos por versões mais recentes no código

### Corrigido

- **Testes**: 5 suítes atualizadas com `vi.mock('../../src/lib/app-check')` para cobrir o novo módulo; `OnboardingPage.component.test.tsx` recebeu tokens de tema faltantes (`BRAND_GRADIENT_HOVER`, `BRAND_SECONDARY`, `WHITE_06`)

---

## [0.115.0] - 2026-05-31

### Adicionado

- **FounderMessageDialog no onboarding** (`src/features/onboarding-wizard/components/FounderMessageDialog.tsx`, +210 linhas): dialog com mensagem pessoal do criador exibida na conclusão do wizard, apenas na primeira vez. Usa `localStorage` para persistir se já foi visto (`isFounderMessageSeen()`). Componente MUI Dialog com animações Motion (fade/scale), tokens de tema (`BRAND_GRADIENT`, `BRAND_SECONDARY`) e ícones (`FavoriteBorder`, `ArrowForward`)
- **Integração no CompletionStep** (`CompletionStep.tsx`, +28/-2): lógica condicional — se `isFounderMessageSeen()`, conclui wizard e navega direto; se primeira vez, abre `FounderMessageDialog` antes de completar. `complete()` só é chamado após fechar o dialog (evita unmount prematuro via `<Navigate>`)
- **Exportação pública** (`onboarding-wizard/index.ts`): `FounderMessageDialog` e `isFounderMessageSeen` exportados do barrel

### Removido

- **Página de Status** (`/status`): `StatusPage.tsx` (-328 linhas) removida inteiramente — incluindo `GlobalStatusBanner`, `ServiceCard`, `IncidentHistory`, configs de serviços e incidentes. Decisão de produto (página não essencial no beta)
- **Testes da StatusPage** (`tests/pages/public/StatusPage.component.test.tsx`, -110 linhas): removidos junto com a página
- **Rota `/status`** removida de `routes.tsx` (lazy import + `<Route>` excluídos)
- **Link "Status"** removido do `PublicFooter.tsx`
- **Rota de prerender** `/status` removida de `scripts/prerender.mjs`
- **Entrada de sitemap** `/status` removida de `public/sitemap.xml`
- **COEP config** `/status` removida de `vite.config.ts`
- **Namespace `status.*`** removido dos 3 locales (pt-BR, en, es) — ~180 chaves de tradução (hero, incidents, services, statusLabels, etc.)
- **Testes de i18n** atualizados: removido teste de chaves de status em `i18n.unit.test.ts`, removido `'status'` da lista de páginas em `locales.completeness.unit.test.ts`, removido teste de interpolação de FAQ em `context.unit.test.tsx`

---

## [0.114.0] - 2026-05-31

### Adicionado

- **SEO / AEO / GEO completo**: Pre-renderização das 10 rotas públicas para HTML estático com tags SEO completas — crawlers sociais e LLMs recebem conteúdo renderizado sem executar JS:
  - `scripts/prerender.mjs` (+156 linhas): script Node com puppeteer-core que navega cada rota pública, aguarda `window.__PRERENDER_READY` e sobrescreve `dist/{route}/index.html` com HTML completo
  - `DocumentHead.tsx`: sinaliza `window.__PRERENDER_READY = true` após renderizar meta tags
  - `seo.ts` (+142/-4): `buildJsonLd()` centralizado com 3 tipos (`software`, `software-with-offers`, `webpage`); `buildSoftwareAppSchema()`, `buildWebPageSchema()`, `buildBreadcrumbSchema()`; `OG_IMAGE_URL` constante; `ALTERNATE_LOCALES` para hreflang; removido `DEFAULT_IMAGE` (substituído por `OG_IMAGE_URL`)
  - Cada página pública passa `jsonLdType` ao `DocumentHead`: `software` (Landing, Funcionalidades), `webpage` (About, Contact, Cookies, Privacy, Terms, Status)

- **Arquivos estáticos para visibilidade em LLMs**:
  - `public/llms.txt` (+37 linhas): resumo conciso do produto com links para funcionalidades, preços e empresa — para ChatGPT, Claude, Perplexity
  - `public/llms-full.txt` (+60 linhas): documentação completa com descrição detalhada de cada feature e stack técnica

- **Favicon otimizado e meta tags Apple**:
  - `public/favicon.ico` (16+32+48px): formato .ico para Safari e browsers legados
  - `public/apple-touch-icon.png` (180x180): ícone para iOS home screen
  - `index.html`: `<link rel="icon" type="image/x-icon">`, `<link rel="apple-touch-icon">`, `<meta name="apple-mobile-web-app-capable">`, `<meta name="apple-mobile-web-app-status-bar-style">`

- **OG Image references**: `logos.ts` expõe `faviconIco`, `appleTouchIcon`, `ogImage` com cache-busting via `APP_VERSION`

- **robots.txt atualizado**: `Allow: /llms.txt`, `Allow: /llms-full.txt`, `Llms-txt: https://script-master.pro/llms.txt` directive

- **sitemap.xml**: `lastmod` atualizado para 2026-05-31 em todas as 10 rotas

### Alterado

- **`package.json`**: `puppeteer-core` ^25.1.0 adicionado em devDependencies; novo script `build:full` (lint + typecheck + vite build + prerender); scripts `deploy`, `deploy:hosting`, `deploy:preview` agora usam `build:full` em vez de `build`
- **`tsconfig.json`**: `scripts/**` adicionado à lista de exclusões
- **`vite.config.ts`**: `includeAssets` atualizado para incluir novos favicons
- **Testes**: `lib-data.unit.test.ts` — assertions atualizadas para `og-image.webp` e hreflang alternates

### Documentado

- **`docs/plan/seo-aeo-geo-plano-final.md`** (+419 linhas): plano completo de SEO/AEO/GEO com decisões de arquitetura (MDE), escopo, trade-offs e referências

---

## [0.113.1] - 2026-05-31

### Corrigido

- **`functions/src/flows/assistant.ts`**: `interviewInterrupt` movido de depois do `respondTool` (linha ~634) para antes do seu primeiro uso em `genkitResume` (linha ~368) — corrige potencial `ReferenceError` onde o interrupt era usado antes de ser definido no escopo. Cast `as Parameters<typeof interviewInterrupt.respond>[0]` removido (desnecessário após a correção de ordem)

### Alterado

- **`functions/src/genkit/schemas/common.ts`** (+22/-5): Novo schema `ToolRequestPartZodSchema` (`z.ZodType<ToolRequestPart>`) que espelha o formato nativo do Genkit (`ToolRequestPartSchema` não é re-exportado pelo pacote `genkit`). Os campos `interruptToolRequest` em `AssistantInputSchema` e `AssistantOutputSchema` migrados do schema customizado `AssistantHistoryToolRequestSchema` para o novo `ToolRequestPartZodSchema` — serialização/desserialização mais precisa de interrupts no round-trip frontend-backend

---

## [0.113.0] - 2026-05-31

### Adicionado

- **Preservação de tool context no Assistente IA — fullHistory**: Novo campo `fullHistory` transporta o histórico completo do Genkit (`MessageData[]` com tool calls/responses) entre mensagens — o modelo não precisa mais re-chamar ferramentas para recuperar informações de rodadas anteriores:
  - `functions/src/genkit/schemas/common.ts`: 6 novos schemas Zod (`AssistantHistoryInlineDataSchema`, `AssistantHistoryMediaSchema`, `AssistantHistoryToolRequestSchema`, `AssistantHistoryToolResponseSchema`, `AssistantHistoryPartSchema`, `AssistantHistoryMessageSchema`) com tipagens inferidas
  - `src/hooks/useAssistant.ts`: `fullHistoryRef` (`useRef<unknown[]>`) armazena o histórico entre mensagens; enviado no input da Cloud Function e recebido no output; persistido no `ChatSession`
  - `src/lib/db/types.ts`: novas interfaces `AssistantHistoryInlineData`, `AssistantHistoryMedia`, `AssistantHistoryToolRequest`, `AssistantHistoryToolResponse`, `AssistantHistoryPart`, `AssistantHistoryMessage`, `UploadAttachment`, `StoredAttachment`
  - `functions/src/flows/assistant.ts`: backend usa `fullHistory` como base do histórico (com fallback para `historyMessages` tradicional); `parseGenkitMessages()` e `appendContextSummary()` para tratamento do histórico tool-aware; `assertAssistantPayloadSize()` com guard de 500k tokens
  - `src/lib/db/chats.ts`: `sanitizeAssistantHistoryAttachments()` e `sanitizeChatSessionForPersistence()` — sanitização de attachments no histórico completo antes da persistência

- **Compactação automática de histórico do Assistente** (`functions/src/genkit/utils/assistant-compaction.ts`, +216 linhas): novo utilitário que aciona sumarização automática quando o histórico excede threshold de tokens — preserva cauda de mensagens recentes, usa `MODEL_FAST` para sumarização, expõe eventos `compaction_started`/`compaction_completed`/`compaction_failed` no streaming. Testes unitários em `tests/functions/assistant-compaction.unit.test.ts`

- **Syntax highlighting com CodeBlock** (`src/features/assistant/components/CodeBlock.tsx`, +215 linhas): novo componente com `react-syntax-highlighter` — suporte a JS, TS, JSX, TSX, JSON, CSS com botão de cópia (check animado), tooltip i18n, tema escuro compatível com o design system. Dependências: `react-syntax-highlighter` ^16.1.1 e `@types/react-syntax-highlighter` ^15.5.13

- **ImageLightbox** (`src/features/assistant/components/ImageLightbox.tsx`, +97 linhas): lightbox para visualização ampliada de imagens no chat — Dialog MUI com Zoom transition, backdrop escuro, botão de fechar, dimensões responsivas (90vw/90vh)

- **ScrollToBottomFab** (`src/features/assistant/components/ScrollToBottomFab.tsx`, +106 linhas): FAB de scroll ao final da conversa — visível quando scroll não está no final, indicador de streaming com pulso, animação Zoom, translateZ para GPU acceleration

- **Suporte a `genkit/beta`** (`functions/src/genkit/genkit.ts`): import migrado para `genkit/beta` — acesso a APIs beta como `defineInterrupt` e `generateMiddleware`

- **Chave i18n `regenerate` e `scriptTab`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): substituem chaves `savedToMemory`/`saveInsight` removidas

### Alterado

- **`useAssistant.ts`** (+141/-30): refatoração com `fullHistoryRef` para preservação de tool context; `regenerateLastResponse()` com `STREAM_ERROR_MARKER` para detecção de erros de streaming; sanitização de attachments via `sanitizeChatMessageAttachments()` e `hasAttachmentData()`; import de tipos `AssistantHistoryMessage` e `ChatSession`
- **`functions/src/flows/assistant.ts`** (+199/-69): `fullHistory` como fonte principal de histórico; `buildMeteringMessagesText()` para cálculo de créditos com base no histórico tool-aware; migração de `inlineData` para `media` no formato de parts; `assertAssistantPayloadSize()` com `MAX_ASSISTANT_PAYLOAD_CHARS` (20M); `appendContextSummary()` para sumarização de contexto persistente
- **`AssistantMessages.tsx`** (+193/-109): animações Motion com `AnimatePresence mode="popLayout"` e `layout` para transições suaves; botão de regenerar resposta com `Refresh` icon; `PreBlock` wrapper para CodeBlock; `ImageLightbox` integrado com clique em imagens; `ScrollToBottomFab` com `shallowEqualAttachments` para evitar re-renders; timestamps via `formatTimestamp()` com locale mapping
- **`Assistant.tsx`** (+10/-9): integração de `ScrollToBottomFab` no layout do chat
- **`assistant/utils.ts`** (+4/-3): import de `UploadAttachment` do `../../lib/db`
- **`src/lib/db/types.ts`** (+58/-2): `AttachmentRecord` modificado com novos campos; 8 novas interfaces para suporte a fullHistory e upload attachments
- **`src/lib/db/chats.ts`** (+67/-11): `sanitizeStoredAttachments()`, `sanitizeHistoryPart()`, `sanitizeAssistantHistoryAttachments()`, `sanitizeChatSessionForPersistence()` — pipeline de sanitização para persistência segura do histórico completo
- **`package.json`**: `react-syntax-highlighter` ^16.1.1 adicionado em dependencies; `@types/react-syntax-highlighter` ^15.5.13 e `firebase-tools` ^15.3.0 em devDependencies; reordenação de entradas
- **Testes**: `AssistantMessages.component.test.tsx` — remoção de testes do botão "Salvar insight" (7 asserts) e adaptação para novos props; `useAssistant.unit.test.tsx` — setup de teste atualizado para novos schemas de fullHistory; `persistence.dual-storage.test.ts` — novo teste de sanitização de fullHistory com attachments; `imageProcessing.unit.test.ts` — mock `decode()` adicionado para compatibilidade

### Removido

- **`docs/audits/swipe-tabs-bugfix.md`** (67 linhas): documento de auditoria do bugfix useSwipeTabs — conteúdo incorporado ao histórico de versões
- **`docs/audits/tool-context-preservation.md`** (269 linhas): plano de tool context preservation — implementação concluída nesta versão

### Documentado

- **`docs/audits/assistant-chat-ux-improvements.md`** (+204 linhas): auditoria de UX do chat do assistente — 11 arquivos revisados, veredito "Ajustes recomendados" (2 warnings)
- **`docs/audits/defineInterrupt-migration.md`** (+306 linhas): auditoria da migração interviewTool → defineInterrupt — 4 arquivos revisados, veredito "Bloqueadores de merge" (3 erros de compilação, 4 bugs)
- **`docs/plan/assistant-chat-ux-improvements.md`** (+729 linhas): plano de 10 melhorias de UX no chat do assistente — 9 implementadas, 1 deferida
- **`docs/scan/1.md`** (+66 linhas): scan de lacunas do projeto inteiro — 9 gaps priorizados
- **`docs/scan/2.md`** (+57 linhas): scan de lacunas da compactação do assistente — 5 gaps priorizados
- **`docs/scan/2026-05-31-interrupt-migration.md`** (+78 linhas): scan de lacunas da migração defineInterrupt — 6 gaps priorizados
- **`docs/scan/assistant-chat-ux-verification.md`** (+97 linhas): scan de verificação de implementação das melhorias de UX — 9/10 implementados

---

## [0.112.0] - 2026-05-31

### Adicionado

- **Preservação de tool context no Assistente IA**: Novo campo `fullHistory` transporta o histórico completo do Genkit (`MessageData[]` com tool calls/responses) entre mensagens — o modelo não precisa mais re-chamar ferramentas para recuperar informações de rodadas anteriores:
  - `functions/src/genkit/schemas/common.ts`: `fullHistory` adicionado em `AssistantInputSchema` e `AssistantOutputSchema` (`z.array(z.any()).nullable().optional()`)
  - `src/hooks/useAssistant.ts`: `fullHistoryRef` (`useRef<unknown[]>`) armazena o histórico entre mensagens; enviado no input da Cloud Function e recebido no output; persistido no `ChatSession`
  - `src/lib/db/types.ts`: campo `fullHistory` adicionado na interface `ChatSession`
  - `functions/src/flows/assistant.ts`: backend usa `fullHistory` como base do histórico (com fallback para `historyMessages` tradicional); `resumeMessages` extraído para array separado; `fullHistory: response.messages` retornado no output

### Alterado

- **`useSwipeTabs.ts`**: Refatoração do hook de swipe — `constraintRef` (Ref) substituído por `dragConstraints` estático (`{ left: 0, right: 0 }`), eliminando a necessidade de `useRef` no hook. `dragDirectionLock: true` adicionado para travar direção ao primeiro gesto (evita conflito com scroll vertical). Thresholds ajustados: `DISTANCE_THRESHOLD` 50→40px, `DRAG_ELASTIC` 0.2→1 (tracking 1:1 natural do dedo)
- **`StudioPage.tsx`**: Adaptado à nova API do `useSwipeTabs` — `dragConstraints` substitui `constraintRef` em props do `motion.div`; `ref={constraintRef}` removido do container Box; `dragDirectionLock` propagado
- **Testes do `useSwipeTabs`**: Testes atualizados para refletir a nova API — `dragConstraints` e `dragDirectionLock` substituem `constraintRef`; `dragElastic` testado com valor exato (1) em vez de faixa

### Documentado

- **`docs/audits/swipe-tabs-bugfix.md`** (+68 linhas): auditoria completa do bugfix do useSwipeTabs — 3 arquivos revisados (hook, StudioPage, testes), veredito sem problemas relevantes, 1 sugestão de documentação que foi endereçada nesta versão
- **`docs/plan/tool-context-preservation.md`** (+270 linhas): plano de preservação de contexto de tool calls no chat do assistente — escopo, decisões de arquitetura (MDE), schemas, implementação e critérios de aceite

---

## [0.111.0] - 2026-05-30

### Adicionado

- **`VideoExportPanel.tsx`**: Novas props opcionais `animateScenes` e `onAnimateScenesChange` — permite sincronizar o toggle de animação Speed Paint entre preview e painel de exportação, eliminando estado duplicado e inconsistência

### Alterado

- **`VideoPage.tsx`**: `animateScenes` movido de valor fixo `false` para estado controlado por toggle (`useState(true)`) — compartilhado entre preview e exportação; default `true` (cenas animadas com Speed Paint por padrão)
- **`VideoComposition.tsx`**: `globalSpeedMultiplier` simplificado — removido divisor `/ 4` que distorcia a progressão; a velocidade do Speed Paint no contexto de vídeo agora é governada exclusivamente pela duração da cena (`animationFrames`), sem multiplicador arbitrário externo
- **`speedPaintRenderer.ts`**: `adjustSpeedPaintProgress` simplificado de power curve para progressão linear — `Math.min(1, clamped * speed)` substitui o antigo comportamento condicional (power curve para speed < 1, linear para speed >= 1). A duração da animação é controlada por `animationFrames` em `SpeedPaintScene`, não por curvas de easing

### Corrigido

- **Testes**: `SpeedPaintScene.component.test.ts` e `speedPaintRenderer.unit.test.ts` atualizados para refletir a progressão linear do Speed Paint — ordem de chamadas corrigida (`continue` antes de `draw`) e expectativas de stroke count ajustadas

---

## [0.110.1] - 2026-05-30

### Corrigido

- **Unmount/remount loop no VideoComposition** (`VideoComposition.tsx`): `SceneItem` movido do escopo interno (onde era recriado a cada frame por causa de `useCurrentFrame`) para o escopo de módulo — a referência do componente agora é estável, eliminando o ciclo de unmount/remount de todos os `SpeedPaintScene` a cada frame que impedia o carregamento de imagens durante preview e exportação
- **Flashs pretos no Speed Paint durante exportação** (`useSpeedPaintExporter.tsx`, `useVideoExporter.tsx`): `allowHtmlInCanvas: true` desabilitado — `drawElementImage` (Chromium experimental) não captura canvas 2D de forma confiável, causando quadros pretos. A exportação volta ao software renderer padrão (`drawImage(canvas, ...)`), síncrono e estável
- **`SpeedPaintScene.tsx`**: gerenciamento de recursos migrado de estado React (`SpeedPaintResourcesStatus`) para ref booleana (`resourcesReadyRef`) — elimina re-renders desnecessários durante carregamento de imagem; `delayRender`/`continueRender` simplificado com handle único; linting de dependências do `useLayoutEffect` reduzido de 13 para 10 entradas

### Alterado

- **`VideoComposition.tsx`**: `nextHasSpeedPaint` pré-computado via `useMemo` em vez de acesso direto a `scenes[index + 1]` dentro do componente filho; `globalFrame` passado como prop explícita para `SceneItem` (elimina dependência de closure); nova interface `SceneItemProps` no escopo de módulo para tipagem estável. Redução de ~73 linhas no componente principal
- **`SpeedPaintScene.tsx`**: `backgroundColor` readicionado no `AbsoluteFill` com valor condicional (`canvasColor === 'white' ? '#fff' : '#000'`) — a remoção completa em v0.110.0 causava flash branco em temas escuros durante crossfade entre cenas

### Removido

- **Avisos HTML-in-canvas** (`SpeedPaintExportPanel.tsx`, `VideoExportPanel.tsx`): Alert warning `htmlInCanvasWarning` removido dos painéis de exportação — o aviso era prematuro (baseado em detecção experimental com falsos positivos) e agora que `allowHtmlInCanvas` está desabilitado, perdeu o sentido

---

## [0.110.0] - 2026-05-30

### Adicionado

- **`detectHtmlInCanvasSupport()`** em `src/features/video-render/hooks/useCodecSupport.ts`: nova função de detecção síncrona de suporte a `HTML-in-canvas` (drawElementImage + requestPaint) — verifica se o navegador Chromium tem a flag `chrome://flags/#canvas-draw-element` habilitada, necessária para capturar canvas 2D nativo no `@remotion/web-renderer`. Exposta como campo `supportsHtmlInCanvas` no retorno de `useCodecSupport()`
- **Avisos HTML-in-canvas** em `SpeedPaintExportPanel.tsx` e `VideoExportPanel.tsx`: `Alert` warning exibido quando o navegador não suporta `drawElementImage` — informa o usuário sobre limitações de compatibilidade durante exportação de Speed Paint
- **Chave i18n `htmlInCanvasWarning`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): mensagem de aviso sobre captura de canvas não suportada

### Alterado

- **`useSpeedPaintExporter.tsx`**: `allowHtmlInCanvas: true` adicionado na configuração do `@remotion/web-renderer` — permite captura real de frames via drawElementImage para canvas 2D nativo (Speed Paint)
- **`useVideoExporter.tsx`**: `allowHtmlInCanvas: true` adicionado — mesma configuração para exportação de vídeo com cenas Speed Paint
- **`SpeedPaintScene.tsx`**: `backgroundColor` removido do `<AbsoluteFill>` — o canvas já preenche via `renderSpeedPaintFrame()` com a cor definida em `canvasColor`. A remoção elimina o flash branco durante crossfade entre cenas (o CSS do AbsoluteFill sobrepunha a renderização do canvas)
- **`speedPaintRenderer.ts`**: prop `opacity` removida de `SpeedPaintFrameOptions` — opacidade agora controlada exclusivamente via CSS no componente `SpeedPaintScene` (sem dupla aplicação que causava inconsistência visual). `renderSpeedPaintFrame()` sempre usa `ctx.globalAlpha = 1`
- **`firestore.rules`**: validação de `imageUrl` e `videoUrl` migrada de regex `matches("^https://.*")` para `isAssetUrl()` — regra de segurança mais flexível que aceita URLs de asset do Firebase Storage

### Removido

- **`@remotion/preload`** do `package.json` e `bun.lock` — dependência não mais utilizada; o pré-carregamento de imagens de cena agora é feito pelo `<Img>` do Remotion com `delayRender()` automático (desde v0.109.0). Import removido de `VideoPreview.tsx`

### Corrigido

- **Flash branco no crossfade do Speed Paint** (`SpeedPaintScene.tsx`): `backgroundColor` fixo no `<AbsoluteFill>` causava flash entre transições de cena — removido, deixando o canvas controlar a cor de fundo via `renderSpeedPaintFrame()`

---

## [0.109.1] - 2026-05-30

### Corrigido

- **EncodingError no Remotion Player** — fix multicamada para `EncodingError: The source image cannot be decoded`:
  - `speedPaintRenderer.ts`: `loadImageElement()` agora chama `img.decode()` após `onload` — garante que os pixels da imagem estão totalmente decodificados antes de desenhar no canvas, eliminando a race condition que causava o EncodingError durante preview e exportação no Speed Paint
  - `VideoPreview.tsx`: import de `preloadImage()` do `@remotion/preload` + `useEffect` que pré-carrega todas as imagens de cena com cleanup via `cancelFns` — resolve race condition na transição entre `Sequence`s de cenas estáticas
  - `VideoPage.tsx`: `animateScenes` alterado de `true` para `false` — desativa animações de cena que concorriam com a decodificação de imagens
- **Validação de imagem antes da geração de cenas** (`useAudioGenerator.ts`): integração com `validateImageIsDecodable()` — verifica se a imagem é decodificável antes de adicioná-la às cenas, prevenindo falhas silenciosas em lote
- **Cancelamento seguro no imageProcessing** (`src/features/speed-paint/lib/imageProcessing.ts`): `img.onload` tornado `async` com verificação de `signal?.aborted` — evita processamento de imagens após cancelamento do usuário
- **Timeout na validação de imagem** (`src/lib/validateImage.ts`): `IMAGE_DECODE_TIMEOUT_MS` (30s) adicionado via `AbortSignal.timeout` — previne Promise pendente indefinidamente se a URL da imagem não responder (rede instável, URL morta, CORS bloqueado)

### Adicionado

- **`@remotion/preload` ^4.0.448** como dependência (`package.json`): lib oficial do Remotion para pré-carregamento de assets (imagens, áudio, vídeo) antes da renderização
- **`src/lib/validateImage.ts`**: novo helper `validateImageIsDecodable(src)` com timeout de 30s — valida se uma imagem pode ser decodificada pelo navegador (`new Image()` + `img.decode()`) antes de uso no pipeline de geração de cenas
- **Logger estruturado no Genkit** (`functions/src/genkit/genkit.ts`): import de `logger` do `genkit/logging` — permite logs com contexto nos flows Genkit (backwards-compatible)

### Alterado

- **`AudioGenerationHandler.tsx`**: constante `AUDIO_PREFLIGHT_TIMEOUT_MS` ajustada para alinhamento com novos tempos de preflight
- **Testes do speedPaintRenderer** (`tests/video-render/speedPaintRenderer.unit.test.ts`): mock de `async decode()` adicionado no objeto `Image` — compatibilidade com a nova implementação assíncrona de `loadImageElement`

### Documentado

- **`docs/audits/002-encoding-error-fix-audit.md`** (+204 linhas): auditoria completa do fix do EncodingError — 4 arquivos revisados, veredito "Ajustes recomendados" (2 warnings, 3 sugestões, nenhum bloqueador)
- **`docs/scan/encoding-error-verification.md`** (+58 linhas): scan de lacunas pós-fix — 3 recomendações implementadas e verificadas, 3 gaps identificados (G1-MÉDIA para `imageProcessing.ts`, G2/G3-BAIXA para `loadImageDimensions` e `projectQueueAdapter.ts`)

---

## [0.109.0] - 2026-05-30

### Adicionado

- **Emuladores seletivos** (`src/lib/env.ts`, `scripts/emulators.mjs`): novos helpers `isEmulatorEnabled()` e `getActiveEmulators()` com flags `VITE_EMULATOR_AUTH`, `VITE_EMULATOR_FIRESTORE`, `VITE_EMULATOR_STORAGE`, `VITE_EMULATOR_FUNCTIONS`, `VITE_EMULATOR_HOSTING`, `VITE_EMULATOR_UI` — permite iniciar apenas os emuladores necessários, economizando recursos localmente. Script inteligente `scripts/emulators.mjs` substitui chamadas diretas ao Firebase CLI. Comando `bun run emulators:all` para forçar todos (ignora .env)
- **Validação de timestamps de cena** (`src/lib/audio-analysis.ts`): `validateSceneTimestamps()` e `buildUniformTimestamps()` substituem a detecção de silêncio via RMS — agora os timestamps são calculados de forma determinística baseados na duração total do áudio, eliminando o bug onde cenas com áudio longo tinham duração incorreta. Testes unitários em `tests/lib/audio-analysis.unit.test.ts` (+129 linhas)
- **Detecção de silêncio no backend TTS** (`functions/src/flows/audio.ts`): `isSilentPcm()` com threshold RMS e `responseModalities: ['AUDIO']` na chamada Gemini — previne chunks de silêncio puro (até 1.8MB de zeros) de chegarem ao frontend
- **Integração de teclado com AudioContext** (`src/hooks/useKeyboardShortcuts.ts`): tecla `Space` agora controla play/pause do áudio global no estúdio via `playAudio`/`activeAudioId`
- **Mock de PWA para testes** (`tests/__mocks__/pwa-register.ts`): `useRegisterSW` mockado para `virtual:pwa-register/react` — viabiliza testes do `PwaUpdatePrompt` sem service worker real
- **5 documentos de auditoria/scan**: `docs/audits/002-chunking-emotionTag-removal.md`, `docs/audits/003-audio-tags-extractpcm-silent-audit.md`, `docs/audits/timestamp-validation.md`, `docs/scan/scene-timestamps-scan.md`, `docs/scan/tts-pipeline-audit.md`
- **Keyframe `spin`** em `src/index.css`: utilitário de rotação para indicadores de loading

### Corrigido

- **Pipeline TTS — `extractPcmFromDataUrl`** (`functions/src/flows/audio.ts`): regex reescrita para suportar MIME type com parâmetros (ex: `audio/wav; codec=pcm; rate=24000`) — antes falhava e chunks de áudio válidos não eram extraídos (bug P0 do audit TTS)
- **Timestamps de cena** (`src/hooks/useAudioGenerator.ts`): substituição de `detectSceneBoundaries()` por `validateSceneTimestamps()` + `buildUniformTimestamps()` — elimina o bug de alocação errada de cenas em áudios longos (2 imagens em 52s geravam timestamps com intervalo incorreto)
- **Chunking — `emotionTag` removido dos schemas** (`functions/src/genkit/schemas/common.ts`, `functions/src/flows/chunking.ts`): tags de áudio obsoletas removidas do `ChunkItemSchema` e da função `buildChunkingInstruction()` — 8 das 9 tags não estavam na lista oficial do Gemini, causando ruído no transcript
- **`densitySeconds` removido do schema de cenas** (`functions/src/genkit/schemas/common.ts`, `functions/src/flows/scene-prompts.ts`): parâmetro removido do input schema — o backend agora calcula timestamps uniformes baseados na duração total, eliminando risco de `Infinity` quando o valor era 0

### Alterado

- **`src/hooks/useSwipeTabs.ts`**: refatoração com extração de constantes (`DISTANCE_THRESHOLD`, `VELOCITY_THRESHOLD`, `SPRING_TRANSITION`, etc.) e função `isInteractiveTarget()` — melhora legibilidade e testabilidade sem mudança de comportamento
- **`src/lib/db/projects.ts`**: logging estruturado adicionado ao `saveProject()` — logs de debug no sucesso e warning no fallback para IndexedDB
- **`package.json`**: scripts de emulador refatorados para usar `scripts/emulators.mjs`
- **`.env.example`**: adicionadas 6 flags `VITE_EMULATOR_*` para emuladores seletivos

---

## [0.108.3] - 2026-05-29

### Corrigido

- **Exposição de PII em logs de erro do Firestore** (`src/lib/db/shared.ts`): `authInfo` e `providerInfo` removidos — elimina vazamento de `email`, `displayName`, `providerInfo` em logs de erro do frontend (P1 do audit #001)
- **Validação de comprimento nos schemas Zod do backend** (`functions/src/genkit/schemas/common.ts`): `script` limitado a `z.string().min(1).max(50_000)` no `AudioInputSchema` e `prompt` limitado a `z.string().min(1).max(5_000)` no `ImageInputSchema` — previne envio de payloads arbitrários (P2 do audit #001)
- **Bloqueio de main thread com `base64ToBlobSync`** (`src/lib/audio.ts`, `useAudioGenerator.ts`, `useImageGenerator.ts`): função síncrona removida e substituída por `base64ToBlob` assíncrona — elimina freeze de UI de ~50-200ms (imagens) a 5-10s (áudios grandes) (P2 do audit #001)
- **Respostas não-imagem do Pexels** (`src/lib/stockMedia.ts`): validação de `content-type` adicionada — respostas que não são `image/*` são rejeitadas com erro descritivo, evitando falhas silenciosas no StockMediaPicker

### Alterado

- **Logging estruturado nos flows backend**: `createLogger` integrado em `audio.ts`, `chunking.ts` e `images.ts` (`functions/src/flows/`) — substitui logs genéricos por logger com contexto
- **StockMediaPicker**: tratamento de erro de busca com `Alert` MUI e `createLogger` — erros da Pexels API agora exibem mensagem amigável ao usuário (`searchError` i18n)

### Adicionado

- **Validação de imagem de referência** (`functions/src/flows/images.ts`): `MAX_REFERENCE_IMAGE_DATA_URL_LENGTH = 15_000_000` (15MB) e `ALLOWED_REFERENCE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp']` — validação defensiva de tamanho e tipo de conteúdo no pipeline de geração de imagens
- **Constante `MIN_TTS_PCM_BYTES = 1024`** (`functions/src/genkit/constants.ts`): threshold mínimo de PCM válido para chunks de áudio
- **Chave i18n `stockMedia.searchError`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): mensagem de erro amigável para falhas na busca de imagens do StockMediaPicker

### Removido

- **`docs/audits/001-audio-image-audit.md`**: documento de auditoria unificada removido — todos os 6 achados (P1-P3) foram endereçados nesta versão

---

## [0.108.2] - 2026-05-29

### Alterado

- **Sistema de Admin Auth**: migração de role-based (`users/{uid}.role == 'admin'`) + email hardcoded para **custom claim** `admin: true` no token de autenticação (`request.auth.token.admin == true`). Aplicado em `firestore.rules` (+1/-3) e `storage.rules` (+2/-2) — elimina dependência de leitura do Firestore para verificação de admin e remove email hardcoded como fallback, reduzindo superfície de segurança
- **Script `grant-access`** em `functions/package.json`: novo script Node para conceder custom claim `admin: true` e/ou créditos ilimitados via Firebase Admin SDK — substitui manipulação manual de claims
- **`.gitignore`**: adicionada exclusão de `service-account.json` e `*-service-account*.json` — prevenção contra versionamento acidental de chaves de serviço

### Removido

- **Docs de auditoria/scan do mobile** (5 arquivos): `docs/audits/assistant-mobile-compact-layout.md`, `docs/audits/bottom-navigation-mobile.md`, `docs/audits/mobile-bottom-nav-audit.md`, `docs/scan/assistant-mobile-layout-gaps.md`, `docs/scan/bottom-nav-mobile-gaps.md` — documentação de conclusão das auditorias mobile, agora incorporadas ao histórico

### Adicionado

- **`docs/audits/001-audio-image-audit.md`** (+266 linhas): auditoria unificada de geração de áudio e imagem com IA — 6 achados priorizados (P1-P3) incluindo PII em logs de erro do frontend, validação de comprimento ausente nos schemas Zod do backend, bloqueio de main thread com `base64ToBlobSync`, exposição de chave Pexels no client-side, e ausência de `.max()` nos schemas de input

---

## [0.108.1] - 2026-05-29

### Adicionado

- **Chave i18n `studio.swipeRegion`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): label de acessibilidade ARIA para a região de swipe do estúdio

### Alterado

- **AssistantComposer.tsx** (+69/-27): refatoração da UI de seleção de modelo e nível de pensamento — `ToggleButton`/`ToggleButtonGroup` substituídos por `Menu` + `Chip` (modelo e thinking level agora abrem menus suspensos). Estilos `paper` dos menus unificados com callback `(theme) => ({...})` para acesso ao `theme.palette.background.paper`. Código do composer simplificado em ~27 linhas
- **InterviewPanel.tsx** (+36/-50): modo `isCustomMode` removido — simplificação do fluxo de entrevista, eliminando ramo condicional de resposta customizada com Enter. Fluxo de multi-select e multi-question mantido intacto
- **ToolEventCard.tsx**: cores de erro migradas de valores hardcoded (`'ERROR_MAIN'` string) para tokens do tema (`ERROR_MAIN` de `tokens.ts`) — consistência com o design system
- **AssistantHeader.tsx**: cor do ícone `AutoAwesome` alterada para `WHITE` — padronização visual com os demais ícones do header
- **MobileBottomNav.tsx**: reordenação dos itens de navegação — `Biblioteca` movido para antes de `Estúdio` na ordem do BottomNavigation
- **assistantUi.ts**: estilos de `paper` refinados para menus do composer — temificação via callback para suporte a dark mode

### Corrigido

- **Assistant.tsx**: bordas do container simplificadas — `borderTopLeftRadius: 0` e `borderTopRightRadius: 0` substituídos por `borderRadius: 0` único, eliminando redundância
- **AssistantPage.tsx**: imports não utilizados removidos (`Box`, `Container`, `tokens`) — limpeza de dependências mortas
- **useSwipeTabs.test.ts**: testes ajustados para refletir mudanças na implementação do hook

---

## [0.108.0] - 2026-05-29

### Adicionado

- **MobileBottomNav** (`src/components/app/MobileBottomNav.tsx`, +421 linhas): novo componente de navegação inferior mobile com `BottomNavigation` MUI v9 — 4 destinos principais (Estúdio, Vídeo, Assistente, Biblioteca) + Drawer para itens secundários (Imagens, Speed Paint, Configurações, Sair). Suporte a `safe-area-inset-bottom`, `z-index: 1200` (abaixo do Drawer 1300 e ActionBar 1400), exibição condicional via `useMediaQuery` (mdDown). Drawer com backdrop blur, avatar do usuário, link de logout com confirmação. i18n completo nos 3 locales via namespace `mobileBottomNav`
- **Chaves i18n `mobileBottomNav.*`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): 4 chaves — `estudio` ("Estúdio"), `video` ("Vídeo"), `assistant` ("Assistente"), `biblioteca` ("Biblioteca")
- **useSwipeTabs** (`src/hooks/useSwipeTabs.ts`, +114 linhas): novo hook de swipe horizontal com feedback visual em tempo real — detecta gestos via `drag="x"` do Motion (framer-motion), fornece variants de animação para `AnimatePresence` (slide + fade + blur), handler `onDragEnd` com thresholds de distância (50px) e velocidade (300px/s), `constraintRef` para limitar arrasto, segurança integrada que ignora gestos originados em elementos interativos (inputs, sliders, tabs, contenteditable). Tipos exportados: `UseSwipeTabsOptions`, `UseSwipeTabsReturn`
- **Testes unitários do useSwipeTabs** (`tests/hooks/useSwipeTabs.test.ts`, +342 linhas): cobertura completa — troca de aba via swipe (esquerda/direita), thresholds de distância e velocidade, ignorar gestos em elementos interativos, limites de aba (primeira/última), variants de animação

### Alterado

- **App.tsx**: integração de `MobileBottomNav`, `BOTTOM_NAV_HEIGHT` — mobile nav renderizada abaixo do ActionBar, visível em mdDown em rotas autenticadas. Adicionados imports `useMediaQuery`, `useTheme`
- **ActionBar.tsx**: posicionamento responsivo — `bottom: 24` (desktop) → `bottom: 24 + 56 = 80px` (mobile) quando bottom nav está visível. Adicionado `useMediaQuery` para detecção de breakpoint
- **Header.tsx**: ajustes para coexistência com bottom nav em mobile — itens de navegação duplicados agora são gerenciados via MobileBottomNav
- **AssistantHeader.tsx**: layout mobile compacto — avatar responsivo (`width/height: { xs: 30, md: AVATAR_SIZE_MD }`), paddings reduzidos (`px: { xs: 1.5, md: 2 }`, `py: { xs: 1, md: 1.5 }`), subtítulo agora visível em sm+ (antes md+), fonte do título reduzida no mobile (`{ xs: '0.875rem', md: '1.5rem' }`). Layout reorganizado com `Box` para melhor responsividade
- **AssistantMessages.tsx**: avatar do empty state responsivo — dimensões adaptadas para mobile (`width/height: { xs: AVATAR_SIZE_MD * 1.8, md: AVATAR_SIZE_MD * 2.5 }`, `mb: { xs: 2, md: 3 }`)
- **assistantUi.ts**: gap responsivo no header/composer (`{ xs: 0.5, md: 1 }`), ajustes de padding para mobile
- **StudioPage.tsx**: integração de swipe visual com drag — `TabPanel` substituído por `AnimatePresence` + `motion.div` com `drag="x"`, `touchAction: 'pan-y'` para scroll vertical nativo, container com `constraintRef` para limitar arrasto, state `direction` para orientação da animação. Tabs agora propagam direção via `setDirection` no onChange. Importados `motion`, `AnimatePresence` (Motion) e `useSwipeTabs`

### Documentado

- **`docs/audits/assistant-mobile-compact-layout.md`**: auditoria do layout mobile compacto do Assistente IA (AssistantHeader, assistantUi, AssistantMessages) — veredito sem problemas relevantes, 2 sugestões de polimento (token de avatar, visibilidade do subtítulo em desktop)
- **`docs/audits/bottom-navigation-mobile.md`**: auditoria estática completa da Bottom Navigation Mobile (MobileBottomNav, Header, App.tsx, ActionBar, i18n) — imports não utilizados identificados, acoplamento arquitetural documentado
- **`docs/audits/mobile-bottom-nav-audit.md`**: auditoria focada do MobileBottomNav.tsx (420 linhas) — showLabels com 5 itens contradiz Material Design, navItems como dependência desnecessária no useMemo
- **`docs/scan/assistant-mobile-layout-gaps.md`**: scan de lacunas do layout mobile do Assistente — 9 gaps identificados (acessibilidade do "Novo Chat", touch targets, safe-area top)
- **`docs/scan/bottom-nav-mobile-gaps.md`**: scan de lacunas da Bottom Navigation Mobile — 6 gaps priorizados (padding no Assistente, z-index Drawer vs ActionBar, labels contra MD)

---

## [0.107.0] - 2026-05-29

### Alterado

- **Scroll do Assistente durante streaming**: novo comportamento de scroll inteligente — quando a IA começa a responder, o scroll é posicionado **uma única vez no início da mensagem** do modelo e depois liberado para o usuário manusear livremente. Removido o `setInterval` de 200ms que forçava scroll contínuo para o final durante o streaming. Agora só rola para o final quando o **usuário** envia uma mensagem nova. Envolve 4 arquivos (`useAssistant.ts`, `AssistantMessages.tsx`, `Assistant.tsx`, `AssistantMessages.component.test.tsx`)
- **PlanWidget**: estado inicial alterado de expandido (`true`) para recolhido (`false`) — a TODO List (plano de tarefas) do assistente agora aparece fechada por padrão, evitando poluição visual no chat (`PlanWidget.tsx`)

---

## [0.106.0] - 2026-05-28

### Adicionado

- **PwaUpdatePrompt** (`src/components/app/PwaUpdatePrompt.tsx`, +262 linhas): novo componente de banner de atualização PWA — detecta nova versão do service worker via `useRegisterSW` (`virtual:pwa-register/react`) com `registerType: 'prompt'`. Snackbar MUI v9 com transição Slide (up), ícone `SystemUpdateAlt`, botões "Atualizar agora" (ativa novo SW + reload) e "Ignorar" (persiste no `sessionStorage`). Toast de `onOfflineReady` via react-hot-toast com ícone 📡. Barra lateral gradiente decorativa no Paper. Espaçamento inferior ajustado para não conflitar com a ActionBar do estúdio
- **Chaves i18n `pwaUpdate.*`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): 5 chaves — `title` ("Nova versão disponível"), `description` ("Atualize para aproveitar as melhorias mais recentes"), `update` ("Atualizar agora"), `dismiss` ("Ignorar"), `offlineReady` ("App pronto para uso offline")

### Alterado

- **App.tsx**: integração de `<PwaUpdatePrompt />` no shell do app — renderizado abaixo do `ActionBar`, visível em todas as rotas
- **main.tsx**: registro manual do service worker (`import('virtual:pwa-register').then(({ registerSW }) => ...)`) removido — substituído pelo `useRegisterSW` interno do `PwaUpdatePrompt` (que gerencia registro automático + prompt de atualização). Cabeçalho NOTA adicionado explicando a mudança
- **Backend assistant.ts**: `maxTurns` aumentado de 10 para 20 — maior profundidade de tool loop no orquestrador do assistente para fluxos multi-ferramenta complexos

---

## [0.105.2] - 2026-05-28

### Adicionado

- **Container scrollável no Assistente** (`Assistant.tsx`): novo wrapper `Box` com `flex: 1, overflowY: 'auto', minHeight: 0` envolvendo `AssistantMessages`, `PlanWidget`, `SettingsPreviewCard`, `respondResult` e `InterviewPanel` — resolve bug de layout mobile onde conteúdo extravasava a tela em dispositivos pequenos
- **ReactMarkdown no respondResult**: substituição de `Typography` por `ReactMarkdown` — respostas com formatação markdown agora são renderizadas corretamente
- **Ícone AutoAwesome no respondResult**: ícone decorativo no card de resposta sugerida do assistente

### Alterado

- **respondResult UI** (`Assistant.tsx`): `Alert` + `Typography` substituídos por `Card` elevado com `backdropFilter: 'blur(8px)'`, borda, sombra, ícone `AutoAwesome` e `ReactMarkdown` — visual mais premium e consistente com o design system
- **assistantMessagesContainerSx** (`assistantUi.ts`): removidos `flex: 1`, `overflowY: 'auto'`, `scrollBehavior` (scroll delegado ao container pai); adicionados `display: flex`, `flexDirection: column` — simplificação de layout
- **assistantEmptyStateSx** (`assistantUi.ts`): adicionado `minHeight: '100%'` para centralização vertical mais consistente

### Corrigido

- **Layout mobile do Assistente**: `PlanWidget`, `respondResult` e `InterviewPanel` agora estão dentro do container scrollável — corrige overflow horizontal e quebra de layout em viewports pequenas
- **Imports não utilizados**: `Typography` removido de `Assistant.tsx` (substituído por `ReactMarkdown` + `AutoAwesome`)

---

## [0.105.1] - 2026-05-28

### Adicionado

- **Chave i18n** `plan.tasksCompletedLabel` nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): label para contagem de tarefas concluídas no PlanWidget

### Alterado

- **SettingsPreviewCard** (`src/features/assistant/components/SettingsPreviewCard.tsx`, +157 linhas): novo componente extraído do `Assistant.tsx` — encapsula preview visual de configurações do assistente com `formatSettingsPreview()` e `SETTINGS_LABEL_KEYS`. `Assistant.tsx` simplificado (–76 linhas)
- **AssistantComposer.tsx**: substituição de `ListItemIcon`/`Lightbulb`/`KeyboardArrowUp` por `ToggleButton`/`ToggleButtonGroup`/`AutoAwesome` — UI de seleção de modelo realinhada
- **ToolEventCard.tsx**: nova interface `MergedToolEvent` para consolidação de eventos de ferramenta; removida prop `displayEvents` (lógica incorporada no componente)
- **PlanWidget.tsx**: novo tipo `StatusIconSize` (`'sm' | 'md'`); ajustes responsivos (`display: { xs: 'none', sm: 'flex' }`); `SubtaskStatusIcon` removido (incorporado em `StatusIcon`)
- **assistantUi.ts**: estilos `assistantToolEventItemSx` e `assistantToolEventIconSx` com `alignItems: 'center'`, `height: 32` — padronização visual de tool events
- **useAssistant.ts**: estado inicial simplificado — `messages` inicializado como array vazio (welcome message gerenciado pelo componente); parâmetro `thinkingLevel` removido da chamada da Cloud Function

### Corrigido

- **AssistantMessages.tsx**: condicionais de exibição simplificadas — removido `isCurrentId` redundante, garantindo que settings e tool events apareçam corretamente durante e após streaming
- **Testes**: `AssistantMessages.component.test.tsx` e `useAssistant.unit.test.tsx` atualizados — remoção de asserções sobre welcome message e Skeletons; novos asserts para `MergedToolEvent`
- **Backend assistant.ts**: assinatura de `sendMetaChunk` ajustada — remoção de campos obsoletos nos chunks tool_event

---

## [0.105.0] - 2026-05-28

### Adicionado

- **Tool Execution Feedback** (`src/features/assistant/components/ToolEventCard.tsx`, +445 linhas): novo componente `ToolEventList` com ícones específicos por tool (Web, Settings, Memory, Tune, Psychology, SmartToy), estados visuais `pending` (shimmer + pulse), `completed` (check inline) e `error` (card colapsável com detalhes). Resultado inline por tool (ex: "5 resultados" para webSearch, "3 memórias" para getUserMemories). Máximo 8 eventos visíveis com "+N anteriores"

- **ThinkingShimmer** (`src/features/assistant/components/ThinkingShimmer.tsx`, +95 linhas): novo componente de shimmer animation para estado "Pensando" — substitui Skeleton wave por gradiente animado + pontos pulsantes. Ícone de pensamento com shimmer

- **TwoPhaseStopButton** (`src/features/assistant/components/TwoPhaseStopButton.tsx`, +112 linhas): novo componente de two-phase cancellation — primeiro clique mostra "Clique novamente para interromper" (4s timeout), segundo clique executa cancelamento. Animação fade-in no estado de confirmação

- **Interview Multi-select + Multi-question** (`src/features/assistant/components/InterviewPanel.tsx`, rewrite completo): suporte a `multiple` (checkboxes), `questions` array (tabs + Confirm tab), navegação por teclado (↑↓, Enter, Espaço, Tab), "Outra resposta" com TextField, ARIA roles

- **Chaves i18n** nos 3 locales: 16 chaves `assistant.interview.*`, 8 chaves `assistant.toolEvents.*`, 4 chaves `assistant.stop.*`, 1 chave `assistant.messages.thinking`

### Alterado

- **AssistantMessages.tsx**: integração de `ToolEventList`, `ThinkingShimmer` e `TwoPhaseStopButton` — removidos Chips genéricos de tool events, Skeleton wave e botão Stop direto

- **Backend assistant.ts**: resume de entrevista agora injeta todas as respostas no histórico (`resume.answers` como lista numerada)

- **PlanWidget.tsx**: animação de pulso para `in_progress`, strikethrough para `completed`/`failed`, CSS transitions 220ms, ARIA roles

### Corrigido

- **InterviewPanel**: envio imediato prematuro em multi-question corrigido — `handleSingleQuestionAnswer` só envia para `!question.multiple && !isMultiQuestion`
- **Backend**: `resume.answers` agora é processado corretamente no histórico
- **"Outra resposta"**: Checkbox em modo multi-select (era Radio)
- **Acessibilidade**: error card com `role="button"`, `tabIndex`, `aria-expanded`, `onKeyDown`
- **Memoização**: `EMPTY_TOOL_EVENTS` constante estável para preservar `React.memo`
- **Animação**: dots animados com opacity em vez de `content` (compatibilidade cross-browser)

---

## [0.104.1] - 2026-05-27

### Corrigido

- **Schemas de orquestração flexibilizados** (`functions/src/genkit/schemas/common.ts`): campos `status` e `priority` em `AssistantSubtaskSchema`/`AssistantTaskSchema` migrados de enums (`AssistantTaskStatusSchema`/`AssistantTaskPrioritySchema`) para `z.string().describe()`; campo `mode` em `GetMemoriesInputSchema` migrado de `z.enum(['list', 'expand'])` para `z.string()` — maior liberdade para o modelo de IA nos valores de task e mode. Preservados os schemas enum para compatibilidade com clientes existentes

- **Simplificação do Google Search Retrieval** (`functions/src/flows/assistant.ts`): tool `webSearch` teve `dynamicRetrievalConfig` removido — `googleSearchRetrieval` agora usa objeto vazio `{}`, mantendo grounding funcional com configuração mais simples

## [0.104.0] - 2026-05-27

### Adicionado

- **Arquitetura Tool-first no Assistente** (`functions/src/flows/assistant.ts`): system prompt reduzido — modelo agora consulta ferramentas via `ai.dynamicTool` em vez de receber estado completo no prompt. Tool loop com `maxTurns: 10` — ferramentas registradas: `updatePlan`, `webSearch`, `getStudioState`, `getMemories`, `updateStudio`, `interview`, `respond`. Créditos calculados por tokens via `calculateAssistantCreditsFromUsage()`
- **15+ schemas Zod de orquestração** (`functions/src/genkit/schemas/common.ts`): `AssistantTaskStatusSchema`, `AssistantTaskPrioritySchema`, `AssistantSubtaskSchema`, `AssistantTaskSchema`, `AssistantPlanSchema`, `UpdatePlanInputSchema`, `WebSearchInputSchema`, `GetStudioStateInputSchema`, `GetMemoriesInputSchema`, `UpdateStudioInputSchema`, `InterviewOptionSchema`, `InterviewInputSchema`, `InterviewResumeDataSchema`, `RespondSuggestedActionSchema`, `RespondMediaSchema`, `RespondInputSchema` — validação completa do fluxo de orquestração no backend
- **12 novos tipos no frontend** (`src/features/assistant/types.ts`): `AssistantTaskStatus`, `AssistantTaskPriority`, `AssistantSubtask`, `AssistantTask`, `AssistantPlan`, `AssistantToolEvent`, `AssistantStudioUpdate`, `InterviewOption`, `InterviewDatum`, `InterviewResumeData`, `RespondSuggestedAction`, `RespondMedia`, `RespondResult`
- **`PlanWidget`** (`src/features/assistant/components/PlanWidget.tsx`, +229 linhas): novo componente de plano visual integrado entre mensagens e composer — exibe tarefas, prioridades e dependências
- **Interview Interrupt/Resume**: fluxo completo de entrevista — `InterviewInputSchema`/`InterviewInput`, opções clicáveis na UI, `InterviewResumeData` para continuidade de entrevistas interrompidas
- **Studio Settings Preview**: `settingsPreview` com `formatSettingsPreview()` e `SETTINGS_LABEL_KEYS` — exibe campos individuais antes de aplicar alterações no estúdio
- **Tool event badges** (`AssistantMessages.tsx`): badges visuais na última mensagem do modelo indicando uso de ferramentas (`interview`, `studio_update`, `respond`)
- **`sanitizeStudioSettingsPatch()`** (`src/features/studio/store/studioStore.ts`): validação de tipos e ranges dos settings recebidos do assistente — `isEmotionType()` como guarda de tipo
- **`buildMemoriesSummary()` e `buildStudioSummary()`** (`functions/src/genkit/utils/assistant-context.ts`): funções de sumarização para o system prompt tool-first
- **Namespace `plan` nos 3 locales** (`en.ts`, `es.ts`, `pt-BR.ts`): `plan.title`, `plan.tasks`, `plan.statusLabels.*` (pending, in_progress, completed, failed), `plan.priorityLabels.*` (high, medium, low)

### Alterado

- **`src/hooks/useAssistant.ts`** (+173/-2): `AssistantStreamMeta` type, `parseAssistantStreamMeta()` para parsing de chunks estruturados (`plan_update`, `interview`, `studio_update`, `tool_event`, `respond`); streaming de eventos de ferramentas
- **`src/features/assistant/Assistant.tsx`** (+225/-3): integração com `PlanWidget`, `settingsPreview` com preview de configurações, UI de entrevista com opções clicáveis
- **`src/features/assistant/components/AssistantComposer.tsx`** (+6/-2): nova prop `interviewPending` para bloquear composição durante entrevista ativa
- **Páginas públicas**: textos de `Header` ("AI Studio" → "Estúdio de produção"), `MetricsSection`, `PublicFooter`, `UseCasesSection`, `LandingPage`, `FuncionalidadesPage` e `TestimonialsSection` refinados para pt-BR mais natural
- **Testes**: 13 arquivos de teste atualizados para refletir novos textos, novos tipos (`AssistantTask`, `AssistantPlan`, `InterviewDatum`, `RespondResult`) e novos estilos do `assistantUi`

### Removido

- **Docs de auditoria/scan antigos** (8 arquivos): `docs/audits/2026-05-27-progress-timer-audit.md`, `docs/audits/audit-tts-pipeline-enhancements.md`, `docs/audits/progress-simulation-reaudit.md`, `docs/audits/undefined-null-sanitization-review.md`, `docs/scan/progresso-audio-estimado-gaps.md`, `docs/scan/reaudit-progresso-tts-gaps.md`, `docs/scan/tts-pipeline-gaps-2026-05-27.md`, `docs/scan/undefined-null-sanitization-gaps.md`

### Documentado

- **`docs/audits/assistant-orchestrator-static-audit-2026-05-27.md`**: auditoria estática do orquestrador do assistente (8 arquivos, 3 warnings de UX/tipagem)
- **`docs/audits/assistant-session-audit-2026-05-27.md`**: auditoria de sessão do assistente (3 features + 4 fixes, 16 arquivos lidos)
- **`docs/scan/orquestrador-agente-gaps-2026-05-27.md`**: scan de lacunas do orquestrador agente vs plano original
- **`docs/scan/orquestrador-agente-gaps-sessao-2026-05-27.md`**: scan de lacunas da sessão de implementação (3 features + 4 fixes)

---

## [0.103.0] - 2026-05-27

### Adicionado

- **`removeUndefinedFields()`** (`src/lib/callable-utils.ts`): novo utilitário de sanitização recursiva que remove campos `undefined` de objetos antes do envio via `httpsCallable` — previne falhas de serialização `undefined→null` nos schemas Zod do backend. Integrado em `useAssistant`, `useImageGenerator`, `gemini.ts` e `ContactPage.tsx`
- **`estimatedChunkCount` no fluxo de geração de áudio**: propagado do preflight (`AudioPreflightSummary`) para `GenerateOptions` e `useAudioGenerator` — usado como base para simulação de progresso com timer (`progressTimerRef`) durante a chamada `audio` da Cloud Function

### Corrigido

- **Schemas Zod em `common.ts`**: `.nullable()` adicionado antes de `.optional()` em todos os schemas — corrige falha de serialização onde `undefined` era convertido para `null` pelo `JSON.stringify` e rejeitado pelo Zod no backend
- **Null safety nos flows Genkit**: parâmetros opcionais em `assistant.ts`, `inline-assistant.ts` e `audio-preflight.ts` agora usam `?? undefined` para compatibilidade com schemas `.nullable().optional()`

### Alterado

- **`functions/src/genkit/utils/assistant-context.ts`**: removidas funções `buildAudioProfileSection` e `buildDirectorNotesSection` — simplificação do contexto montado para o assistente
- **Flows `audio.ts` e `chunking.ts`**: `thinkingConfig` removido — ajuste na configuração de chamada ao Gemini TTS
- **`WaveformOverlay.tsx`**: simplificação do `interpolate` de opacidade durante crossfade de cenas
- **`functions/src/config/cors.ts`**: `APP_ALLOWED_CORS_ORIGINS` ajustado

### Documentado

- **`docs/audits/undefined-null-sanitization-review.md`**: auditoria de qualidade das correções de sanitização `undefined→null` em 9 arquivos
- **`docs/audits/2026-05-27-progress-timer-audit.md`**: auditoria do timer de progresso estimado em `useAudioGenerator`
- **`docs/audits/progress-simulation-reaudit.md`**: re-auditoria pós-correção do timer de progresso
- **`docs/scan/progresso-audio-estimado-gaps.md`**: scan de lacunas da simulação de progresso na geração de áudio
- **`docs/scan/reaudit-progresso-tts-gaps.md`**: re-auditoria das lacunas de progresso TTS pós-correção
- **`docs/scan/undefined-null-sanitization-gaps.md`**: scan de lacunas na sanitização `undefined→null`
- **`docs/plan/orquestrador-agente.md`**: plano arquitetural do orquestrador agente (Harness Engineer)

---

## [0.102.0] - 2026-05-27

### Adicionado

- **Chunking inteligente com fallback programático** (`functions/src/genkit/utils/chunking.ts`): novo módulo de chunking com regex expandida (`SENTENCE_SPLIT_REGEX`) que nunca corta palavras, respeita pares lógicos e mergeia chunks pequenos. Funções `extractTrailingSentence()`, `isTruncatedChunk()`, `mergeOrPush()`, `splitLongSentence()`, `mergeShortChunks()` — substitui `splitTextProgrammatically` anterior
- **Audio tags inline no transcript** (`functions/src/genkit/utils/assistant-context.ts`): `buildTaggedTranscript()` injeta tags de emoção (`EMOTION_TO_AUDIO_TAGS` — 8 emoções), pace (`PACE_TO_AUDIO_TAG`) e continuidade (`CONTINUITY_AUDIO_TAG = '[continuing]'`) no texto enviado ao Gemini TTS
- **Constantes centralizadas de TTS** (`functions/src/genkit/constants.ts`): `EMOTION_TO_AUDIO_TAGS`, `PACE_TO_AUDIO_TAG`, `CONTINUITY_AUDIO_TAG`, `TTS_MAX_RETRIES` (2), `MIN_CHUNK_DURATION_SECONDS` (1.5), `MIN_CHUNK_SIZE` (80)
- **`ChunkItemSchema`** (`functions/src/genkit/schemas/common.ts`): schema Zod enriquecido com campos `text`, `emotionTag`, `isContinuation`, `trailingSentence`, `paceTag` para validação do output do chunking
- **Retry automático no TTS** (`functions/src/flows/audio.ts`): loop de retry com `TTS_MAX_RETRIES = 2` para tratamento de `text token returns` — cancelamento do usuário respeitado (`throwOnCancel`)
- **Continuidade de tom entre chunks** (`functions/src/flows/audio.ts`): contexto enriquecido com última frase do chunk anterior, tag de emoção ativa e sample context (frases âncora não faladas)
- **Reestruturação do prompt TTS** (`functions/src/genkit/utils/assistant-context.ts`): novas funções `buildAudioProfileSection()` (speakerName + audioProfile), `buildDirectorNotesSection()` (unifica styleNotes, emotionIntensity, pace) — estrutura: Audio Profile → Scene → Director's Notes
- **`EnrichedChunk`** (`functions/src/flows/audio.ts`): nova interface que estende o chunk base com `emotionTag`, `isContinuation`, `audioTag`, `trailingSentence`, `durationMs`
- **`thinkingConfig` nos flows de IA**: adicionado `thinkingLevel: 'high'` nos flows `audio.ts`, `chunking.ts`, `images.ts`, `inline-assistant.ts` e `scene-prompts.ts` — ativa pensamento estendido do Gemini para maior qualidade

### Alterado

- **`functions/src/flows/audio.ts`**: refatorado — import de `../genkit/constants.js` removido (constantes agora em `../genkit/constants.js`); `chunkScript` melhorado com `EnrichedChunk`, retry loop, continuidade enriquecida e validação de cancelamento
- **`functions/src/flows/chunking.ts`**: output schema enriquecido com `ChunkItemSchema`; `thinkingConfig: 'high'` habilitado
- **`functions/src/genkit/utils/chunking.ts`**: reescrito com novo módulo de funções programáticas — `extractTrailingSentence`, `isTruncatedChunk`, `mergeOrPush`, `splitLongSentence`, `mergeShortChunks`
- **`functions/src/genkit/utils/assistant-context.ts`**: expandido com `buildAudioProfileSection`, `buildDirectorNotesSection`, `buildTaggedTranscript`

### Documentado

- **`docs/audits/audit-tts-pipeline-enhancements.md`**: auditoria completa do pipeline TTS — 6 arquivos revisados, 1 bug de cancelamento e 1 bug de prompt tag detectados
- **`docs/scan/tts-pipeline-gaps-2026-05-27.md`**: scan de lacunas das 5 fases do plano de melhorias TTS — 14 itens sólidos, 3 desalinhamentos de severidade baixa

---

## [0.101.0] - 2026-05-26

### Adicionado

- **Seleção de modelo de IA no Assistente**: novo `AIModeToggle` em `src/features/studio/components/AIModeToggle.tsx` — permite alternar entre modelos `fast` (`gemini-3.1-flash-lite`) e `specialist` (`gemini-3.5-flash`) com níveis de pensamento (`ThinkingLevel`: `minimal` | `low` | `medium` | `high`)
- **`ModelConfig` e `resolveModelConfig()`** nos flows `assistant.ts` e `inline-assistant.ts` (`functions/src/flows/`): roteamento de modelo e thinking config no backend Genkit
- **`ThinkingLevelSchema` e `AssistantModel` type** em `functions/src/genkit/schemas/common.ts`: schemas Zod para validação de nível de pensamento e tipo de modelo
- **Nova UI do `AssistantComposer`** (`AssistantComposer.tsx`): seletor de modelo via Menu, toggle de "pensamento" animado, placeholders cíclicos com `AnimatePresence`, controle de modo IA (fast/specialist)
- **9 novos estilos** em `assistantUi.ts`: `assistantComposerWrapperSx`, `assistantComposerInputRowSx`, `assistantCyclingPlaceholderSx`, `assistantPlaceholderLetterSx`, `assistantThinkToggleSx`, `assistantControlButtonSx`, `assistantComposerControlsSx`, `assistantSegmentedControlSx`, `assistantSelectorLabelSx`
- **Namespace `aiMode`** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): chaves para seleção de modelo e nível de pensamento
- **Suporte a `model` e `thinkingLevel`** no hook `useAssistant.ts`: parâmetros opcionais propagados para a Cloud Function
- **Animações Motion** no `InlineAIWidget.tsx`: `AnimatePresence`, transições Fade, componente `KbdHint` para dicas de teclado

### Removido

- **`fix_imports.js`**: script utilitário não mais utilizado
- **`docs/audits/2026-05-20-firebase-callable-auth-audit.md`**: documento de auditoria concluída
- **`docs/test/i18n-key-guards.md`**: documentação de testes de guarda i18n consolidada

### Alterado

- **`AssistantComposer.component.test.tsx`**: props de teste estendidas com `isThinkActive`, `selectedModel`, `selectedThinkingLevel`, `onModelChange`, `onThinkingLevelChange`
- **`AssistantHeader.tsx`**: removidos imports não utilizados (`Box`, `Chip`)
- **`ScriptEditor.tsx`**: integração com `AIModeToggle` para alternância de modo IA inline

## [0.100.0] - 2026-05-26

### Adicionado

- **Testes de guarda i18n** (`tests/i18n/i18n-locale-parity.unit.test.ts`, `tests/i18n/i18n-used-keys.unit.test.ts`): paridade de chaves entre todos os locales + varredura AST de chamadas `t('...')` no código-fonte para detectar chaves faltantes antes de abrir páginas no navegador
- **Script `bun run i18n`** no `package.json`: atalho para executar apenas os dois guardas de i18n
- **`SpeedPaintResourcesStatus` type** (`SpeedPaintScene.tsx`): tipo `'loading' | 'ready'` para controle de estado de recursos do canvas
- **`tests/video-render/SpeedPaintScene.component.test.tsx`** (+113 linhas): teste de componente para SpeedPaintScene com mocks de Remotion e speedPaintRenderer
- **Novos namespaces i18n** nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`): `dataMigration` (migração IndexedDB→Firestore), `workspace` (espaço de trabalho do estúdio), `summaryPanel` (painel de resumo), `librarySection` (seção da biblioteca), `transcription` (transcrição de áudio), `speedLabels` (labels de velocidade), `settings` (configurações)
- **`docs/test/i18n-key-guards.md`**: documentação dos guardas de i18n com escopo, gaps e próximos passos

### Removido

- **Infraestrutura Cloud Run de renderização de vídeo**: arquivo `useVideoExporter.tsx` limpo em ~237 linhas — removidos imports Firebase/Firestore, export `useCloudRun`, `speedPaintWarnings` e `inputProps`; removido script `deploy:cloudrun` do `package.json`; removido mock de env Cloud Run em `useVideoExporter-speedpaint.unit.test.tsx`
- **Sistema de Jobs Assíncronos**: rota `/app/jobs` removida de `routes.tsx`; namespace `audioJobs` removido dos 3 locales (jobs, badge, empty, filter, pipeline, step, etc.)
- **`src/lib/image-jobs.ts`**: arquivo de jobs de imagem removido (não mais utilizado)

### Alterado

- **Locales i18n** (`en.ts`, `es.ts`, `pt-BR.ts`, ~+149/-118 linhas cada): reestruturação de namespaces — `audioJobs` removido; 7 novos namespaces adicionados
- **`tests/i18n/i18n-integration.test.tsx`**: assertion flexível com regex `/Feito com IA/` em vez de match exato de string
- **`AGENTS.md` / `CLAUDE.md`**: removidas referências a Cloud Run, Cloud Tasks, Jobs Assíncronos e Jobs UI; rota `/app/jobs` removida; stack simplificada

## [0.47.0] - 2026-05-23

### Adicionado

- **`VideoLibraryVideo`** (`src/components/video-library/types.ts`): nova interface que estende `ProjectVideo` com `resolvedUrl` para exibição de vídeos salvos na biblioteca
- **Chaves i18n de vídeo** nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`): `library.video`, `library.savedVideos`, `library.noVideos`, `library.videoItem`, `library.videoCount`
- **Download de vídeos no lote** (`useBatchDownload.ts`): `downloadFile()` agora inclui vídeos do projeto no download em lote (áudio + cenas + vídeos)

### Alterado

- **`Library.tsx`** (+154 linhas): expandido com exibição de vídeos salvos no projeto (importa `Movie` icon, tipo `ProjectVideo`)
- **`GalleryCard.tsx`**: exibe contagem de vídeos no card do projeto
- **`useProjectGallery.ts`**: mapeia `resolvedUrl` para vídeos do projeto

### Corrigido


---

## [0.45.2] - 2026-05-23

### Corrigido





### Alterado


---

## [0.45.1] - 2026-05-23

### Corrigido


---

## [0.45.0] - 2026-05-23

### Adicionado


### Alterado

- **`functions/src/usage/index.ts`**: barrel exports expandidos com 13 novos tipos de pipeline
- **`src/components/app/AudioGenerationHandler.tsx`**: removido `loadPipelineAudio()` — lógica antiga de carregamento de áudio do pipeline substituída pelo fluxo server-side

### Removido


---

## [0.44.1] - 2026-05-23

### Corrigido


---

## [0.44.0] - 2026-05-23

### Adicionado

- **`useAutoSaveStudioSettings`** (`src/hooks/useAutoSaveStudioSettings.ts`): novo hook que observa mudanças no `useStudioStore` (Zustand) e persiste automaticamente as preferências do estúdio no Firestore com debounce de 2s quando o usuário está logado. Montado uma vez no `App.tsx` — sincronização contínua sem intervenção manual
- **`getStudioSettingsPatch()`** (`src/features/studio/store/studioStore.ts`): nova função exportada que extrai 16 campos persistíveis do estado do estúdio (`StudioConfigState` → `StudioUserSettings`), excluindo `script` e `referenceImage`. Reaproveitada pelo hook de auto-save e pela página de Configurações
- **`StudioUserSettings`** (`src/lib/db/user-settings.ts`): nova interface que define 16 campos de estúdio sincronizados com Firestore (`selectedVoice`, `isMultiSpeaker`, `speakerAName`, `speakerBName`, `speakerBVoice`, `audioProfile`, `scene`, `pace`, `styleNotes`, `generateScenes`, `sceneDensity`, `sceneRatio`, `visualFramework`, `emotion`, `emotionIntensity`, `imageTextLanguage`)
- **Campos de estúdio em `UserSetting`** (`src/lib/db/types.ts`): interface `UserSetting` expandida com 16 campos opcionais de preferências do estúdio — persistidos via `{ merge: true }` no Firestore sem sobrescrever dados existentes

### Alterado

- **`saveUserSettings()`** (`src/lib/db/user-settings.ts`): agora aceita 4º parâmetro opcional `studio?: StudioUserSettings` — faz merge dos campos de estúdio no documento `user_settings` do Firestore com `{ merge: true }`, preservando `customSystemPrompt` e perfil
- **`Configuracoes.tsx`**: `handleSave` agora também chama `saveUserSettings()` com o patch do estúdio — salvamento duplo (localStorage + Firestore) quando usuário logado
- **`AuthContext.tsx`**: agora importa `getUserSettings`, `StudioDraftState` e `useStudioStore` — ao logar, carrega preferências do estúdio do Firestore e aplica no estado do estúdio
- **`App.tsx`**: adicionado `import { useAutoSaveStudioSettings }` e hook invocado no corpo do componente — sincronização automática ativada
- **`src/features/studio/store/index.ts`**: barrel export expandido — `getStudioSettingsPatch` agora exportado publicamente
- **`studio.utils.ts`**: tipo `StudioSettingsPatch` removido (substituído por `StudioUserSettings` do `user-settings.ts`)
- **`ai-requests.ts`** (+23/-15): transação Firestore simplificada — remove verificação redundante de `cancel_requested` antes do `transaction.set`
- **`credit-service.ts`** (+18/-18): fluxo de feedback não consome créditos — pulava verificação `hasUnlimitedCredits` desnecessária; feedback retorna direto `{ success: true, eventId: requestId }`
- **Teste `ConfiguracoesPage.component.test.tsx`**: adicionados mocks de `useAuth` e `saveUserSettings` para compatibilidade com novo fluxo

### Removido

- **`StudioSettingsPatch`** de `src/features/studio/types.ts`: tipo substituído por `StudioUserSettings` do módulo `user-settings.ts`
- **Verificação redundante de `cancel_requested`** em `ai-requests.ts`: transação simplificada

---

## [0.43.0] - 2026-05-23

### Removido


### Adicionado


### Corrigido

- **Bug do `resultImageBase64`**: campo nunca populado pelo backend — substituído por `results[0].downloadUrl` (Storage URL) via `fetchFirstImageAsDataUrl()`, eliminando base64 duplicado

### Alterado

- **`useAudioGenerator.ts`**: chamada de `generateImageFromPrompt` agora passa `userId` como 5º argumento
- **`AudioGenerationHandler.tsx`**: chave i18n `scene_prompts` corrigida de `scenePrompts` para `scene_prompts` (alinhamento com padrão snake_case)
- **i18n (`en.ts`, `es.ts`, `pt-BR.ts`)**: chave `video` adicionada ao namespace `audioPreflight.stepLabels` para suporte a labels do pipeline de vídeo

---

## [0.42.2] - 2026-05-22

### Adicionado

- **SEO por página com DocumentHead**: `index.html` teve meta tags estáticas (canonical, OG, Twitter Cards, description) removidas em favor do componente `DocumentHead` que renderiza tags no `<head>` por página. `AssistantPage`, `ConfiguracoesPage`, `LibraryPage`, `SpeedPaintPage`, `StudioPage` e `VideoPage` agora importam `DocumentHead` + `getPageSeo()` para SEO dinâmico por rota
- **`pluralKey()`** (`src/features/i18n/utils.ts`): nova função utilitária de pluralização — `pluralKey(baseKey, count)` seleciona chave singular/plural baseada no count
- **`assistantSuggestionChipSx`** (`src/features/assistant/components/assistantUi.ts`): novo estilo exportado para chips de sugestão no assistente
- **`Toaster`** integrado ao `App.tsx`: componente `react-hot-toast` configurado com tema dark, posição `bottom-right` e estilos personalizados
- **Dependência `react-hot-toast`** (`^2.6.0`): adicionada formalmente ao `package.json`

### Alterado

- **`index.html`**: meta tags SEO removidas (canonical, OG, Twitter Cards, description) — agora gerenciadas pelo `DocumentHead` por página; Schema.org Organization mantido como global
- **`QueueStaging`** (`src/features/speed-paint/components/batch/QueueStaging.tsx`): animações de entrada/saída com `Collapse` MUI + `TransitionGroup` (react-transition-group)
- **`AnimationDurationSelector`** (`src/features/speed-paint/components/AnimationDurationSelector.tsx`): labels internacionalizadas — `t('speedPaint.durationTitle')` substitui texto hardcoded
- **`StockMediaPicker`** (`src/features/studio/components/StockMediaPicker.tsx`): `htmlInput` com `accept` para filtro de tipos de arquivo
- **`Configuracoes.tsx`**: tokens de tema atualizados
- **Locales i18n** (`en.ts`, `es.ts`, `pt-BR.ts`): limpeza de chaves não utilizadas — `footer` namespace removido de en/es; `exportProgress`, `exportQuality`, `timingError`, `undoDelete`, `libraryQueueItemsChip` removidos de pt-BR
- **Testes**: 5 arquivos de teste atualizados — `QueueStaging.component.test.tsx` (pluralização), `SpeedPaintPage.component.test.tsx` (pluralização), `ConfiguracoesPage.component.test.tsx` (label do botão), `assistantUi.unit.test.ts` (novo estilo), `AssistantMessages.component.test.tsx` (novo estilo)

### Removido


---

## [0.42.1] - 2026-05-22

### Adicionado

- **`docs/CHANGELOG-COMPLETE.md`**: arquivo de changelog completo para consulta histórica, com as entradas anteriores a 0.38.0 extraídas do `CHANGELOG.md` para reduzir o tamanho do arquivo principal

### Alterado

- **`functions/src/usage/credit-estimator.ts`**: refatorado — constante `baseCost` extraída, multiplicadores de resolução simplificados
- **Testes**: 3 arquivos de teste atualizados com novos campos (`progress`, `segments`, `steps`, `scenes`, `audioSegments`) para compatibilidade com as mudanças

### Removido


---

## [0.42.0] - 2026-05-22

### Adicionado

- **Constantes de TTS** (`functions/src/genkit/constants.ts`): `MIN_TTS_PCM_BYTES=1024`
- **`assertValidPcmChunk`** no flow `audio.ts`: validação de chunks PCM com `responseModalities: ['AUDIO']`
- **Suporte a `video_render`** em `credit-estimator.ts` e `credit-policy.ts` — estimativa de créditos baseada em duração + resolução
- **`video_render`** adicionado ao tipo `AiRequestFlow` em `ai-requests.ts`

### Alterado

- **`firebase.ts` (frontend)**: adicionada função `isLocalBrowserHost()` para detecção de ambiente local
- **`audio-preflight.ts` (backend)**: importa `CHUNK_LIMIT` de `genkit/constants.js`
- **`credit-estimator.ts`**: adicionada estimativa para `video_render` com `durationSeconds` e resolução
- **`credit-policy.ts`**: adicionada política de créditos para `video_render`
- **`ai-requests.ts`**: `video_render` adicionado ao union type de flows
- **`audio.ts` (flow Genkit)**: adicionado `responseModalities: ['AUDIO']` e função `assertValidPcmChunk`

### Removido

- **`fix_imports.js`**: script de correção de imports (não mais necessário)
- **`docs/audits/2026-05-20-firebase-callable-auth-audit.md`**: relatório de auditoria removido (concluído e incorporado)

---

## [0.41.0] - 2026-05-21

### Adicionado

- **Verificação de email com polling (`ProtectedRoute.tsx`)**: nova função `requiresVerifiedPasswordEmail()` e constante `EMAIL_VERIFICATION_POLL_MS` (5000ms) para re-verificação periódica de email de usuários cadastrados por senha — previne acesso a rotas protegidas antes da confirmação de email
- **`buildSeoTitle()`** (`src/lib/seo.ts`): nova função utilitária para construção padronizada de títulos SEO com sufixo do projeto
- **`getDefaultProjectName()` / `getDefaultProjectLabel()`** (`useAudioGenerator.ts`, `studio.utils.ts`): funções que geram nome e label padrão de projeto no locale ativo, eliminando strings hardcoded
- **`VoiceStyleKey`** (`src/lib/types.ts`): novo tipo union exportado para padronizar chaves de estilo de voz; `constants.ts` reflete a mudança com `style` → `styleKey` em todas as 5 vozes
- **Novos namespaces de internacionalização** (`src/features/i18n/locales/{en,es,pt-BR}.ts`): `voiceStyles`, `feedback`, `runtime`, `audioPreflight.stepLabels`, `audioPreflight.stepDetails`, `audioPreflight.audio`, `audioPreflight.chunking`, `audioPreflight.scenePrompts`, `audioPreflight.image`, `audioPreflight.notes` — +111 linhas por locale
- **Funções auxiliares no `AudioPreflightDialog`**: tipo `AudioPreflightStepType`, funções `getSummaryText()`, `getBlockingText()`, `getStepLabel()`, `getStepDetails()`, `getNotes()` — extração de lógica de formatação do diálogo de pré-verificação
- **Funções auxiliares no `AudioGenerationHandler`**: tipo `AudioPreflightCallableResult`, funções `isAudioPreflightSummary()` e `getAudioPreflightSummary()` — parsing tipado do retorno da callable `audio-preflight`
- **`EMOTION_LABEL_KEYS`** (`EmotionSelector.tsx`): mapeamento centralizado de `EmotionType` para chaves i18n de label
- **`assistantActionIconButtonSx`** (`assistantUi.ts`): novo estilo exportado para botões de ação do assistente com suporte responsivo
- **`isAssetUrl()`** (`firestore.rules`): nova função helper nas regras do Firestore que valida URLs de asset (https, localhost, blob) — substitui validação inline duplicada para `audioUrl`

### Alterado

- **Internacionalização de componentes**: `VoiceCard`, `ImageUpload`, `Assistant`, `AssistantComposer`, `useAssistant` (erros), `RegisterPage` (`noValidate`), `SpeedPaintPage` (layout) — textos hardcoded substituídos por chaves i18n
- **Responsividade de componentes públicos**: `PublicHeader` adiciona `flexGrow`/`display`/`fontSize` responsivos; `FeatureShowcase` adiciona `overflowX: 'clip'` e `minWidth`/`width` responsivos para evitar overflow horizontal; `FaqPage` e `LoginPage` adicionam `useMediaQuery` para adaptação a mobile
- **Vozes renomeadas (`constants.ts`)**: campo `style` → `styleKey` nas 5 vozes (Aoede, Zephyr, Puck, Charon, Kore) com valores normalizados em inglês (`casual`, `bright`, `animated`, `informative`, `firm`) — reflete o novo tipo `VoiceStyleKey`
- **`audio-preflight.ts` (backend)**: refatorado para usar imports diretos do Genkit e callable-auth em vez de arquivos `.js` — alinhado com a centralização das instruções Genkit
- **`firebase.ts`**: estrutura condicional do App Check simplificada — remove ramo aninhado desnecessário
- **Testes**: 8 arquivos de teste atualizados para refletir `style` → `styleKey`, internacionalização de componentes e novo fluxo de ProtectedRoute — destaque para `ProtectedRoute.component.test.tsx` (+153 linhas, mock de `createMockUser`, cobertura de `requiresVerifiedPasswordEmail`)

### Corrigido

- **`credit-service.ts`**: ajuste no fluxo de criação de beta access — remoção de `transaction.set(betaRef, beta)` redundante que causava escrita duplicada no Firestore
- **`RegisterPage`**: formulário agora usa `noValidate` para evitar validação nativa do browser conflitante com a validação do react-hook-form
- **`PublicHeader.component.test.tsx`**: parâmetros do `Wrapper` ajustados para compatibilidade com novo layout responsivo; remoção de mock não utilizado de `@testing-library/user-event`

---

## [0.40.1] - 2026-05-20

### Adicionado

- **Enforcement centralizado de autenticação nas callables Genkit**: novo helper `getCallableUidOrThrow()` em `functions/src/genkit/utils/callable-auth.ts`, reaproveitado nos flows `assistant`, `audio`, `audio-preflight`, `cancel-ai-request`, `chunking`, `credit-snapshot`, `feedback`, `images`, `inline-assistant`, `ping` e `scene-prompts` para validar `context.auth.uid` no backend
- **Centralização das instruções de IA**: `functions/src/genkit/utils/assistant-context.ts` agora concentra builders reutilizáveis para chat, inline assistant, chunking, TTS, geração de imagens e prompts de cena (`buildAssistantSystemInstruction`, `buildInlineAssistantInstruction`, `buildChunkingInstruction`, `buildTtsInstruction`, `buildImageInstruction`, `buildScenePromptsInstruction`)
- **Cobertura de testes para saldo de créditos e instruções do assistente**: novos testes `tests/hooks/useCredits.unit.test.tsx`, `tests/components/CreditIndicator.component.test.tsx` e `tests/functions/assistant-context.unit.test.ts`
- **Auditoria documentada das callables Firebase**: `docs/audits/2026-05-20-firebase-callable-auth-audit.md` registra a revisão do enforcement de autenticação nos flows expostos

### Alterado

- **`useCredits.ts` refeito como store global Zustand**: listener do Firestore, snapshot callable, reconciliação com retry/backoff, cooldown de falha e estado compartilhado passam a viver em uma store única; o hook agora expõe `canEnforceBalance` para bloquear consumo só quando o saldo estiver confirmado
- **`CreditIndicator.tsx`**: o chip do header agora diferencia 4 estados visuais do saldo (`loading`, `syncing`, `error`, `unlimited`) e usa o breakdown apenas quando o saldo já está consistente
- **Hooks de IA e geração**: `useAudioGenerator`, `useImageGenerator` e `useInlineAssistant` deixam de bloquear por saldo cacheado e passam a depender de `canEnforceBalance`; `useAssistant` normaliza anexos e mensagens antes do envio
- **Estado do estúdio e contexto do assistente**: `speakerAName`, `speakerBName` e `speakerBVoice` entram no tipo/estado do estúdio e passam a alimentar o contexto enviado ao assistente
- **Fluxos Genkit**: `assistant`, `inline-assistant`, `chunking`, `scene-prompts`, `audio` e `images` deixam de depender de arquivos `.prompt` e passam a montar instruções em código com schemas/output definidos no próprio flow
- **`functions/package.json`**: o build das Functions deixa de copiar `src/prompts/` para `dist/`, acompanhando a remoção desses arquivos
- **Pequenos ajustes de i18n e efeitos**: novas chaves `studio.header.credits.syncing` e `assistant.memories.deleteMemoryConfirm`; dependências de `useEffect` corrigidas em `AudioGenerationHandler`, `UsageIndicator` e `useBatchDownload`

### Removido

- **Prompts estáticos do backend**: `functions/src/prompts/assistant.prompt`, `chunking.prompt`, `inline-assistant.prompt`, `scene-prompts.prompt` e `.gitkeep` removidos em favor das instruções geradas em TypeScript
- **`src/features/assistant/systemPrompt.ts`**: lógica antiga de montagem do prompt do assistente removida após a centralização em `functions/src/genkit/utils/assistant-context.ts`
- **`GEMINI.md`**: documento legado removido do repositório

---

## [0.40.0] - 2026-05-20

### Adicionado

- **Internacionalização massiva**: `useLocale()` integrado em ~30 componentes que antes usavam textos hardcoded em pt-BR — `App.tsx`, `ErrorBoundary`, `ErrorToast`, `SuccessToast`, `WarningToast`, `ToastProvider`, `GuestRoute`, `ProtectedRoute`, `LoginPage`, `RegisterPage`, `NotFoundPage`, `AudioGenerationHandler`, `AudioPreflightDialog`, `GalleryCard`, `useBatchDownload`, `VideoLibrary`, `AudioContext`, `Assistant`, `UpgradeDialog`, `UsageIndicator`, `AnimationDurationSelector`, `ImageUpload`, `InlineAIWidget`, `CaptionEditorPanel`, `SceneSequence`, `SpeedPaintControls`, `ExportProgressBar`, `ExportQualitySelector`, `LegalPageTemplate`
- **`useLocaleSafe()`** (`src/features/i18n/context.tsx`): novo hook sem dependência de `I18nContext` para uso em ErrorBoundary e SceneSequence — previne crash quando o provider não está disponível
- **Novos namespaces i18n** (`src/features/i18n/locales/{en,es,pt-BR}.ts`, +160 linhas cada): `metrics`, `auth` (login, validation, resetDialog, errors, register, verification), `notFound`, `audioPreflight`, `legal`, `errorBoundary` — 12 novos namespaces nos 3 idiomas
- **`legalData.ts`** (`src/pages/public/legalData.ts`, +481 linhas): dados centralizados das páginas legais — `TERMS_DATA`, `PRIVACY_DATA`, `COOKIES_DATA` com seções, datas de atualização e estrutura padronizada. Substitui conteúdo inline de `TermsPage`, `PrivacyPage`, `CookiesPage`
- **Constantes de reconciliação em `useCredits`**: `MAX_RECONCILE_ATTEMPTS` (5), `BASE_RECONCILE_DELAY_MS` (1000), `MAX_RECONCILE_DELAY_MS` (30000) — controle de backoff exponencial para reconciliação de créditos
- **Tratamento de erro em `credit-snapshot.ts`**: `getCreditAvailabilitySnapshot` envolvido em try/catch para resiliência a falhas de consulta

### Alterado

- **Páginas legais refatoradas**: `TermsPage`, `PrivacyPage`, `CookiesPage` agora importam dados de `legalData.ts` em vez de usar `LegalPageTemplate` com dados inline — redução de ~180 linhas no total e conteúdo traduzível via i18n
- **`credit-service.ts`**: refatorado com etapas isoladas por bloco try/catch para facilitar diagnóstico de falhas — cada operação (`hasUnlimitedCredits`, `getOrCreateBetaAccess`, `expireStaleReservations`) executa independentemente
- **`LoginPage` / `RegisterPage`**: texto estático de validação e erros substituído por chaves i18n — `t('auth.login.validation.*')`, `t('auth.login.errors.*')`, `t('auth.register.*')`, etc.
- **`AudioPreflightDialog`**: labels de créditos (`formatCredits`, `formatStepCredits`) internacionalizadas
- **`SceneSequence`**: usa `useLocaleSafe` em vez de `useLocale` para evitar crash contextual
- **`SpeedPaintControls`**: `formatSpeedLabel` agora aceita parâmetros adicionais para internacionalização

### Corrigido

- **`UpgradeDialog`**: mensagem de erro `'Preço não configurado para este plano'` internacionalizada via `t('billing.priceNotConfigured')`
- **`InlineAIWidget`**: labels `'Parar'`/`'Cancelar'` internacionalizados via `t('common.stop')`/`t('common.cancelEsc')`

---

## [0.39.0] - 2026-05-20

### Adicionado

- **Callable Error Handling** (`src/lib/callable-errors.ts`): novo módulo centralizado de parsing de erros de `httpsCallable` do Firebase — `CallableErrorInfo`, `getCallableErrorInfo()`, `isCallableCancelledError()`, `isCreditCallableError()`. Integrado em `useAudioGenerator`, `useAssistant`, `useImageGenerator`, `useInlineAssistant`, `useCredits`, `AudioGenerationHandler` e `gemini.ts`. Substitui tratamento de erros inline disperso
- **Audio Preflight** (`AudioPreflightDialog.tsx`, `functions/src/flows/audio-preflight.ts`, `functions/src/usage/audio-preflight.ts`): novo fluxo de pré-verificação de créditos antes da geração de áudio — estima chunks, calcula créditos necessários e exibe diálogo de confirmação ao usuário. Integrado no `App.tsx` via `AudioPreflightDialog` no `AudioGenerationHandler`. Tipos `AudioPreflightStepSchema`, `AudioPreflightInputSchema`, `AudioPreflightOutputSchema` em `common.ts`
- **Cancel AI Request** (`functions/src/flows/cancel-ai-request.ts`): novo flow Genkit para cancelar requisições de IA em andamento — consulta e atualiza `ai_requests` no Firestore. `CancelAiRequestInputSchema`/`CancelAiRequestOutputSchema`. Previne que registros `ai_requests` fiquem presos em `running`
- **Credit Snapshot** (`functions/src/flows/credit-snapshot.ts`): novo flow para snapshot de créditos em tempo real — `getCreditAvailabilitySnapshot()` em `credit-service.ts`. `CreditSnapshotOutputSchema`. Exibição de créditos ilimitados no `CreditIndicator` via `hasUnlimitedCredits()`
- **AI Request Tracking** (`functions/src/usage/ai-requests.ts`): novo módulo de rastreamento de requisições de IA — `AiRequestStatus`, `AiRequestFlow`, `AiRequestRecord`. Registra ciclo de vida completo (running → completed/failed/cancelled)
- **CORS Configuration** (`functions/src/config/cors.ts`): configuração centralizada de origens CORS permitidas (`APP_ALLOWED_CORS_ORIGINS`). Importado por todos os 11 flows Genkit (assistant, audio, chunking, feedback, images, inline-assistant, ping, scene-prompts, audio-preflight, cancel-ai-request, credit-snapshot)
- **Assistant Context** (`functions/src/genkit/utils/assistant-context.ts`): novo utilitário extraído de `assistant.ts` — `buildUserProfileBlock()`, `formatEmotionIntensity()`, tipos `MemoryEntry`, `AssistantUserSettingsDoc`. `buildMeteringHistoryText()` injeta histórico de uso no prompt do assistente; `userProfileBlock` substitui `buildStudioBlock`
- **Credit Service enhancements**: `getCreditAvailabilitySnapshot()`, `hasUnlimitedCredits()`, `UserEntitlements`, `UserProfile`, `CreditAvailabilitySnapshot`, `buildRolledOverBetaAccess()` — identificação de acesso ilimitado a créditos com tratamento específico de beta access
- **`VITE_APP_CHECK_DEBUG_TOKEN`** (`.env.example`): nova env var para token de depuração do App Check, permite rodar localmente sem reCAPTCHA. `getAppCheckDebugToken()` em `env.ts`
- **Configuração de Emuladores Firebase** (`firebase.json`): seção `emulators` completa com auth (9099), firestore (8080), storage (9199), functions (5001), hosting (5000) e UI (4000). `firebase.json` também inclui seção `functions` com `source` e `predeploy`
- **Scripts de deploy granular** no `package.json`: `deploy:hosting`, `deploy:firestore`, `deploy:storage`, `deploy:functions` — deploy específico por serviço Firebase
- **Scripts de emuladores** no `package.json`: `emulators`, `emulators:functions`, `emulators:ui` — atalhos para emuladores Firebase locais
- **`VITE_USE_EMULATORS`** (`.env.example`): env var booleana que conecta frontend aos emuladores locais

### Alterado

- **`package.json`**: versão bump `0.38.0` → `0.39.0`; `deploy` agora executa `firebase deploy` completo (antes `--only hosting`); `deploy:all` removido (substituído por `deploy`)
- **`functions/package.json`**: build script copia `src/prompts/` para `dist/prompts/` após compilação; `engines: { node: "24" }` adicionado
- **Dotprompts migrados para `functions/src/prompts/`**: `assistant.prompt`, `chunking.prompt`, `inline-assistant.prompt`, `scene-prompts.prompt` movidos para dentro da árvore de source — copiados ao `dist/` durante o build. `genkit.ts` usa `dirname`/`join` (`node:path`) e `fileURLToPath` (`node:url`) para resolução de caminho em runtime
- **`functions/src/index.ts`**: 3 novos flows exportados — `audioPreflight`, `cancelAiRequest`, `creditSnapshot`. Total: 11 flows Genkit + 3 endpoints Stripe. Importa `APP_ALLOWED_CORS_ORIGINS` de `../config/cors.js`
- **`src/lib/firebase.ts`**: suporte a emuladores via `VITE_USE_EMULATORS`; `connectFunctionsEmulator`, `connectFirestoreEmulator`, `connectStorageEmulator` condicionais
- **`src/hooks/useAudioGenerator.ts`**: refatorado com callable error handling; `buildAudioFlowInput()` extraído; integração com preflight e `useCredits`
- **`src/hooks/useAssistant.ts`**: refatorado com callable error handling; integração com `useCredits`; `STREAM_ABORTED` symbol para cancelamento limpo
- **`src/hooks/useImageGenerator.ts`**: refatorado com callable error handling; integração com `useCredits`
- **`src/hooks/useInlineAssistant.ts`**: refatorado com callable error handling; integração com `useCredits`; expõe `stopProcessing`
- **`src/hooks/useCredits.ts`**: integrado com `creditSnapshot` callable; adicionados `unlimitedCredits`, `isUnlimited`; escuta `user_settings` do Firestore para `UserEntitlements`
- **`src/components/app/AudioGenerationHandler.tsx`**: integração com `AudioPreflightDialog` — exibe prévia de créditos antes da geração; callable error handling com `getCallableErrorInfo`
- **`src/components/CreditIndicator.tsx`**: exibe "Ilimitados" quando `unlimitedCredits === true`; label internacionalizado via `t('billing.usage.unlimited')`
- **`src/components/ImageStudio.tsx`**: botão de geração desabilitado quando `creditsExhausted` (antes apenas por `!prompt.trim()`)
- **`src/features/assistant/Assistant.tsx`**: integração com `useCredits` para bloqueio por créditos
- **`src/features/assistant/components/AssistantComposer.tsx`**: nova prop `creditsBlocked` — desabilita envio quando créditos esgotados
- **`src/features/studio/components/InlineAIWidget.tsx`**: expõe `stopProcessing` do hook; bloqueio por créditos
- **`src/lib/gemini.ts`**: importa `getCallableErrorInfo`, `isCallableCancelledError`, `isCreditCallableError` de `callable-errors.ts`
- **`src/lib/env.ts`**: adicionado `getAppCheckDebugToken()`
- **`src/lib/db/user-settings.ts`**: tratamento melhorado de `undefined` nos campos `name`, `role`, `goals` — fallback para `existingSetting` quando profile fields são undefined
- **`functions/src/flows/assistant.ts`**: refatorado — `buildMeteringHistoryText()` extraído; `userProfileBlock` substitui `buildStudioBlock`; CORS import; `AssistantUserSettingsDoc` type; melhorias no `userSettings`
- **`functions/src/flows/audio.ts`**: `AudioSegment` interface; melhorias em `metadata`; CORS import
- **`functions/src/flows/images.ts`**: `getDataUrlContentType()`, `media` config, `randomUUID`; CORS import; remoção de `use` não utilizado; integração Firestore
- **`functions/src/flows/scene-prompts.ts`**: melhorias em `input`; CORS import
- **`functions/src/genkit/middlewares/credit-metering.ts`**: `createReserveError()`, `createConfirmError()` — erros HttpsError dedicados para operações de crédito
- **`functions/src/genkit/schemas/common.ts`**: novos schemas — `AudioPreflightStepSchema`, `AudioPreflightInputSchema`, `AudioPreflightOutputSchema`, `CreditSnapshotOutputSchema`; tipos inferidos correspondentes
- **`functions/src/usage/credit-service.ts`**: refatorado — `UserEntitlements`, `UserProfile`, `getCreditAvailabilitySnapshot()`, `hasUnlimitedCredits()`, `buildRolledOverBetaAccess()`; melhorias na consulta de usuário com `userSnap`/`userData`
- **`functions/src/usage/index.ts`**: exports atualizados — `CreditAvailabilitySnapshot`, `CreditSnapshot`, `AiRequestStatus`, `AiRequestRecord`
- **`firebase.json`**: seção `functions` com `source` e `predeploy`; seção `emulators` completa
- **`functions/bun.lock` removido**: lock file do Bun substituído por `package-lock.json` (npm)
- **`tests/`**: 13 novos arquivos de teste + atualizações em 7 testes existentes para mockar `getAppCheckDebugToken`, `useCredits`, preflight, callable errors e funções mockFirestore

### Removido

- **`deploy:all` do `package.json`**: obsoleto — `deploy` agora faz deploy completo
- **`functions/prompts/` diretório antigo**: `.gitkeep` e arquivos `.prompt` removidos da raiz `functions/prompts/` — migrados para `functions/src/prompts/`
- **`buildStudioBlock`** de `functions/src/flows/assistant.ts`: substituído por `userProfileBlock` + `buildMeteringHistoryText`

---

## [0.38.0] - 2026-05-19

### Adicionado

- **Migração de IA para Cloud Functions com Genkit** — todas as operações de IA (TTS, imagens, prompts de cena, assistente, assistente inline, chunking) migradas do frontend (`@google/genai`) para Cloud Functions v2 usando Genkit (`genkit` ^1.34.0, `@genkit-ai/firebase`, `@genkit-ai/google-genai`). Frontend agora chama via `httpsCallable` do Firebase Functions
- **8 novos flows de IA no backend** (`functions/src/flows/`): `audio.ts` (TTS com chunking), `images.ts` (geração de imagens), `assistant.ts` (chat principal com streaming), `inline-assistant.ts` (widget inline), `scene-prompts.ts` (prompts de cena), `chunking.ts` (divisão de roteiros), `feedback.ts` (feedback com bônus de créditos), `ping.ts` (health check)
- **Dotprompts** (`functions/prompts/`): prompts configuráveis separados do código — `assistant.prompt`, `inline-assistant.prompt`, `chunking.prompt`, `scene-prompts.prompt`
- **Sistema de créditos** (`functions/src/usage/`): `credit-service.ts` (770 linhas — estimar/reservar/confirmar/reverter créditos), `credit-metering.ts` (middleware Genkit), `credit-estimator.ts`, `credit-policy.ts` (MONTHLY_BASE_CREDITS, FEEDBACK_BONUS_CREDITS, OperationType), `credit-events.ts`, `period.ts`, `idempotency.ts`
- **Genkit setup** (`functions/src/genkit/`): `genkit.ts` (inicialização com plugins Firebase + Google GenAI), `constants.ts` (VOICES), schemas (`common.ts` com `ChatMessageSchema`), middlewares, utils (`chunking.ts`, `helpers.ts`)
- **Firebase App Check** com reCAPTCHA v3 — `initializeAppCheck` em `firebase.ts`, `VITE_RECAPTCHA_SITE_KEY` no `.env`, token de debug para desenvolvimento
- **Modo Open Beta** — flag `OPEN_BETA_ENABLED` (functions) e `VITE_OPEN_BETA_ENABLED` (frontend); acesso gratuito durante beta público, preparado para transição futura para cobrança por créditos
- **`CreditIndicator`** (`src/components/CreditIndicator.tsx`): chip no Header mostrando saldo de créditos do usuário com skeleton loading e ícones de warning
- **`CreditBlockedMessage`** (`src/components/CreditBlockedMessage.tsx`): Alert exibido quando créditos estão esgotados, com link para login; integrado no estúdio, assistente, widget inline e ImageStudio
- **`useCredits`** (`src/hooks/useCredits.ts`): hook que escuta `credit_events` do Firestore via `onSnapshot` e calcula saldo atual (CreditState)
- **Formulário de feedback** (`ContactPage.tsx`): usuários autenticados podem enviar feedback via Cloud Function `feedback` e receber bônus de créditos
- **Firestore rules** para novas subcoleções: `beta_access`, `credit_months`, `credit_events`, `feedback_rewards` (leitura pelo usuário, escrita apenas admin)
- **Firestore indexes** para `credit_events` (status+createdAt, requestId, createdAt DESC)
- **Script `deploy:all`** (`package.json`): build + deploy functions + deploy hosting em um comando

### Removido

- **`@google/genai`** do frontend — dependência removida do `package.json`; todas as chamadas diretas ao Gemini eliminadas de `useAudioGenerator`, `useImageGenerator`, `useAssistant`, `useInlineAssistant` e `gemini.ts`
- **`VITE_GEMINI_API_KEY`** do frontend — API key agora fica apenas no backend (functions); removido de `.env.example`, `vite-env.d.ts` e `env.ts` (`getGeminiApiKey` removido)
- **Chamadas client-side ao Gemini** — `contents`, `parts`, `inlineData`, `responseSchema`, `multiSpeakerVoiceConfig`, `prebuiltVoiceConfig`, `responseModalities` removidos dos hooks
- **`withRetry` do `rate-limiter.ts`** nos hooks de IA — retry agora é gerenciado pelo backend (Genkit); `rate-limiter.ts` simplificado
- **UI de billing/assinatura da PricingPage** — removidos `PricingCard`, `BillingToggle`, `ComparisonTable`, `PLAN_UI_META`, `PLAN_ORDER`, `PLANS`, `COMPARISON_TABLE`; página convertida para beta aberto com `CreditInfoCard`, `BetaNotice`, `StepCard` e seção "Como funciona"
- **Namespace `billing` do i18n** — substituído por `credits`, `howItWorks`, `notice`, `feedback`, `blocked` nos 3 locales (pt-BR, en, es)
- **`Modality`/`Type` imports de `@google/genai`** removidos de todos os testes

### Alterado

- **`useAudioGenerator`** — substitui chamada direta ao Gemini por `httpsCallable(functions, 'audio')`; tipos `AudioFlowInput`/`AudioFlowOutput`; remove dependências de `@google/genai`, `rate-limiter`, `env`, `studio/types`
- **`useImageGenerator`** — substitui chamada direta ao Gemini por `httpsCallable(functions, 'images')`; tipos `ImagesFlowInput`/`ImagesFlowOutput`
- **`useAssistant`** — substitui chamada direta ao Gemini por `httpsCallable(functions, 'assistant')`; tipos `AssistantFlowInput`/`AssistantFlowOutput`; system prompt agora fica no backend (Dotprompt)
- **`useInlineAssistant`** — substitui chamada direta ao Gemini por `httpsCallable(functions, 'inline-assistant')`; sem mais dependência de `db`, `AuthContext`, `systemPrompt`, `constants`, `rate-limiter`
- **`generateScenePrompts` / `generateImageFromPrompt`** (`gemini.ts`) — agora chamam `httpsCallable` (`scene-prompts`, `images`); removidos `parseReferenceImage`, `ReferenceImagePayload`, `LOCALE_LANGUAGE_MAP`
- **`firebase.ts`** — adicionado `functions` (região `southamerica-east1`) e `initializeAppCheck` com `ReCaptchaV3Provider`
- **`env.ts`** — `getGeminiApiKey` removido; adicionados `getRecaptchaSiteKey()`, `isBillingEnabled()`, `isOpenBetaEnabled()`
- **`stripe.ts`** — agora usa `isBillingEnabled()` para condicionar carregamento
- **`billing/hooks` e `billing/store`** — agora usam `isBillingEnabled()` para ativar/desativar listeners
- **`Header.tsx`** — `CreditIndicator` substitui componentes de billing; importa `isOpenBetaEnabled`
- **`LoginPage` / `RegisterPage`** — título alterado de "Crie com IA, sem limites" para "Crie com IA no beta aberto"
- **`PricingPage`** — completamente reescrita como página de beta aberto; `CreditInfoCard` com cards animados (Motion), `BetaNotice`, `StepCard` para "Como funciona"; sem mais toggle mensal/anual, sem tabela de comparação
- **`ContactPage`** — adicionado `FeedbackForm` para usuários autenticados
- **`AudioGenerationHandler.tsx`** — adicionada prop `creditsExhausted`
- **`Inspector.tsx`** — adicionada função `escapeHtml` para sanitização
- **`ImageStudio.tsx`** — adicionado `CreditBlockedMessage` para bloqueio por créditos
- **`Assistant.tsx`** — adicionado `CreditBlockedMessage` para bloqueio por créditos
- **`InlineAIWidget.tsx`** — adicionado `CreditBlockedMessage` para bloqueio por créditos
- **`speedPaintRenderer.ts`** — `adjustSpeedPaintProgress` e `getVisibleStrokeCount` exportados; imports reorganizados
- **`vite.config.ts`** — rotas públicas expandidas para incluir `/funcionalidades`, `/precos`, `/perguntas-frequentes`, `/sobre`, `/termos`, `/privacidade`, `/contato`
- **`functions/package.json`** — build agora roda ESLint antes de tsc; adicionadas deps `genkit`, `@genkit-ai/firebase`, `@genkit-ai/google-genai`, `zod`
- **`.env.example`** — `VITE_GEMINI_API_KEY` comentado (apenas referência); adicionados `VITE_RECAPTCHA_SITE_KEY`, `VITE_BILLING_ENABLED`, `VITE_OPEN_BETA_ENABLED`
- **`functions/.env.example`** — adicionadas seções para GenAI API key, App Check, flags de modo (BILLING_ENABLED, OPEN_BETA_ENABLED)
- **`firestore.rules`** — novas subcoleções em `users/{userId}`: `beta_access`, `credit_months`, `credit_events`, `feedback_rewards`
- **`firestore.indexes.json`** — 4 novos indexes para `credit_events`
- **Testes** — atualizados para mockar `functions` em vez de `MockGoogleGenAI`; assertions de i18n atualizadas de `Preços` → `Beta`; testes de login/register atualizados para novo título; `ContactPage` mock de `useAuth`; `FaqPage` tab `Preços` → `Créditos`

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
