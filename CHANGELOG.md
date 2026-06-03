# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.126.1] - 2026-06-03

### Alterado

- **Conteúdo editorial das páginas públicas reescrito — foco em clareza e benefício direto** (7 arquivos em `src/data/`, +93/-93 linhas líquidas):
  - `authBenefits.ts`: textos dos 4 benefícios reescritos para tom mais direto ("Narração sem gravar", "Vídeo montado no navegador", "Cenas com IA", "Assistente criativo") — chaves renomeadas de `b*Title`/`b*Desc` para os 3 locales
  - `metrics.ts`: métricas renomeadas para conceitos mais relevantes ao beta ("Fluxo em 3 etapas", "Créditos mensais", "Bônus por feedback", "Sem cartão") — chaves `metric*Label`/`metric*Desc` renomeadas
  - `pricingFaq.ts`: resposta da FAQ sobre créditos não utilizados ajustada ("expiram" em vez de linguagem anterior)
  - `testimonials.ts`: todos os 6 depoimentos reescritos com linguagem mais natural e casos de uso específicos — chaves `t*Text`/`t*UseCase` renomeadas
  - `useCases.ts`: todos os 6 casos de uso reescritos com descrições mais diretas — chaves `uc*Title`/`uc*Desc` renomeadas, novo anchor `images` adicionado

- **Arquivos de tradução reestruturados** (`src/features/i18n/locales/{en,es,pt-BR}.ts`, +198/-197, +200/-199, +200/-199 linhas respectivamente):
  - Namespace `images` adicionado nos 3 locales com chave `images.alt` para alt text de imagens
  - Chaves `landingShowcases.*.alt` reorganizadas e renomeadas para consistência
  - Chaves de feature items (`featureItems.*`) e showcase sections reestruturadas
  - Chave `of` removida do locale EN

- **Descrições SEO reescritas** (`public/llms-full.txt` +36/-32, `public/llms.txt` +16/-16):
  - Tom reformulado de descrição de "plataforma SaaS" para "ferramenta web para criadores"
  - Seções reestruturadas em `llms-full.txt`: "Principal Promessa", "Para Quem É" (detalhamento por perfil), seções de features renomeadas ("Texto para Narração", "Cenas e Imagens", "Vídeo e Legendas", "Assistente de Criação")
  - `llms.txt`: resumo simplificado com links focados em "Criar vídeos para YouTube com IA", seção "Tecnologia" simplificada (sem detalhes de stack — foco em o que faz, não como)
  - Descrições longas e curtas alinhadas entre llms.txt e llms-full.txt

- **Alt texts de imagens migrados para i18n** (`src/pages/public/FuncionalidadesPage.tsx`, +3/-3): 3 alt texts de showcases (TTS, vídeo, imagens) movidos de strings literais para `t('landingShowcases.audio.alt')`, `t('landingShowcases.video.alt')`, `t('landingShowcases.images.alt')` — consistência com LandingPage que já usava i18n para alt texts

- **Labels do roadmap na AboutPage** (`src/pages/public/AboutPage.tsx`, +2/-2): versões de `'0.17', '0.20', '0.22', '0.23', '0.24', 'next'` para `'01', '02', '03', '04', '05', '06'` — label do chip alterada de `v{item.version}` para `item.version` (exibe o número sem prefixo)

### Melhorado

- **HeroSection com `sx` function-based** (`src/components/public/HeroSection.tsx`, +9/-3): `sx` migrado de objeto estático para arrow function `(theme) => ({...})` — permite acesso direto ao tema e evita warnings de TypeScript sobre tipos de tema não resolvidos

- **maxWidth na LandingPage** (`src/pages/public/LandingPage.tsx`, +6/-3): ajuste de largura máxima do container visual do hero para melhor responsividade em telas grandes

---

## [0.126.0] - 2026-06-03

### Adicionado

- **StackedHeader expandido — 5 novas props de layout responsivo** (`src/components/ui/StackedHeader.tsx`, +327/-12 linhas):
  - `direction` (`'vertical' | 'horizontal' | 'responsive'`): controla eixo do layout interno. `default` deriva da variant via `DIRECTION_DEFAULTS` (`alert` → vertical, `glass`/`plain` → responsive). `'responsive'` alterna de horizontal (mdUp) para vertical (xs)
  - `actionAlign` (`'start' | 'end' | 'center' | 'stretch'`): alinhamento do slot de ação. Default deriva do eixo efetivo (vertical → `'end'`, horizontal → `'center'`)
  - `controlAlign` (`'start' | 'end' | 'center'`): alinhamento do slot de controle (chip/switch). Default deriva do eixo efetivo
  - `actionPlacement` (`'inline' | 'stack' | 'bottom'`): posição do slot de ação relativo ao conteúdo. Default: `'inline'` para `alert`, `'stack'` para `section`
  - `density` (`'compact' | 'standard' | 'comfortable'`): densidade visual com tokens `DENSITY_TOKENS` (padding, gap). Default: `'standard'`
  - 8 novos tipos públicos exportados: `StackedHeaderAxis`, `StackedHeaderBreakpoint`, `StackedHeaderResponsiveAxis`, `StackedHeaderDirection`, `StackedHeaderActionAlign`, `StackedHeaderControlAlign`, `StackedHeaderActionPlacement`, `StackedHeaderDensity`
  - 3 helpers internos: `resolveDirection`, `resolveAlignItems`, `getEffectiveAxis`
  - Constantes `DIRECTION_DEFAULTS` e `DENSITY_TOKENS`
  - Barrel export em `src/components/ui/index.ts` expandido com os novos tipos

- **`useCollapsibleSection` adotado em SpeedPaintControls** (`src/features/video-render/components/SpeedPaintControls.tsx`, +85/-134): seção de controles colapsável migrada de `<Box><Collapse>` + `useState` manual + `useId` para `<StackedHeader collapsible>` + `useCollapsibleSection`. Remove imports de `Collapse`, `ExpandMore`, `ExpandLess`, `ButtonBase`. 2 seções (Paint Settings + Layers) usando o hook centralizado

- **`setGlobalOptions` para Cloud Functions** (`functions/src/index.ts`, +21 linhas): nova configuração global de memória via `firebase-functions/v2/options`. Import de `setGlobalOptions` adicionado

- **Testes do StackedHeader expandido** (`tests/components/StackedHeader.component.test.tsx`, +482 linhas): 6 describe blocks específicos — `direction`, `actionAlign`, `controlAlign`, `actionPlacement`, `density`, `defaults inteligentes por variant` + 3 testes de retrocompatibilidade. Cobre combinações responsivas, valores de densidade e interação entre props

- **Constantes de densidade em mock de tokens** (`tests/__mocks__/tokensMock.ts`, +4 linhas): `GAP_COMPACT` (0.75), `GAP_DEFAULT` (1)

- **Documentação técnica:** `docs/scan/stacked-header-gaps-audit.md` (422 linhas) — auditoria estática do componente StackedHeader com 18 call sites analisados

### Alterado

- **Limite de caracteres reduzido para 25.000** (`src/lib/constants.ts`, `public/llms-full.txt`, i18n FAQ nos 3 idiomas): `MAX_CHARS` alterado de 50.000 para 25.000 caracteres por roteiro. Atualiza a documentão de SEO (`llms-full.txt`) e as respostas da FAQ em pt-BR, en e es. Teste unitário `constants.unit.test.ts` atualizado para refletir o novo valor

- **Timestamp dos error logs migrado de `serverTimestamp()` para `Date.now()`** (`src/lib/logger/types.ts`, `src/lib/logger/interceptor.ts`, `firestore.rules`):
  - `types.ts`: tipo `timestamp` alterado de `unknown` (sentinel opaco) para `number` — documenta a decisão (correlação com horário local do usuário é mais útil para debug, elimina edge cases do sentinela em regras v2)
  - `interceptor.ts`: default `null` substituído por `Date.now()` — cada log já chega com timestamp do cliente
  - `firestore.rules`: validação do campo `timestamp` em `errorLogs` alterada de `is timestamp` para `is number` — comentário explicativo adicionado (9 linhas)
  - `src/lib/logger/index.ts`: import de `firebase/firestore` removido (não mais necessário — não usa `serverTimestamp`)

- **Memória das Cloud Functions aumentada para 512MiB** (`functions/src/flows/audio.ts`, +5/-0): default de 256 MiB estourava para roteiros grandes (273 MiB observado em produção em 2026-06-03 — scripts longos geram dezenas de buffers PCM mantidos simultaneamente). Configurado via `setGlobalOptions` + `memory: '512MiB'` no flow de áudio

- **Migração de 9 call sites para novas props do StackedHeader**: `Configuracoes.tsx` (+2), `Library.tsx` (+10, 5 call sites), `ImageStudio.tsx` (+2), `VideoLibrary.tsx` (+2), `AnalyticsConsentPrompt.tsx` (+3, `density="compact"` incluso), `FeedbackBanner.tsx` (+2), `Assistant.tsx` (+2) — todos recebem `actionPlacement="stack" actionAlign="end"` para posicionamento de ação consistente

- **CreditBlockedMessage.tsx**: refatoração (+12/-14) com novas props — `actionAlign="start"` intencional para alinhamento à esquerda do CTA "Ver planos"

### Corrigido

- **Bug de referência circular no logger** (`src/lib/logger/index.ts`): import de `firebase/firestore` removido — o módulo não usava diretamente funções do Firestore (`serverTimestamp` foi substituído por `Date.now()`). Elimina warning de import não utilizado e potencial ciclo em ambiente de teste

- **Testes SpeedPaintControls**: atualizados (+41/-30) para refletir a migração de Collapse/ButtonBase para StackedHeader — asserções de padding, ícones e estado de colapso ajustados para a nova implementação

---

## [0.125.0] - 2026-06-03

### Adicionado

- **PWA Install Prompt** — novo sistema de instalação customizada do PWA via captura do evento nativo `beforeinstallprompt`:
  - `src/types/pwa.d.ts` (+32 linhas): type augmentation para `BeforeInstallPromptEvent` (interface com `prompt()` e `userChoice`)
  - `src/lib/pwa/install-prompt-store.ts` (+385 linhas): store singleton de módulo que gerencia o `deferredPrompt`, cooldown de 7 dias, 4 estados (`available`, `dismissed`, `installed`, `cooldown`), persistência local com prefixo `s2a_pwa_*`, serialização com AnalyticsConsentPrompt e PwaUpdatePrompt (1 prompt por vez)
  - `src/hooks/usePwaInstallPrompt.ts` (+131 linhas): hook reativo que registra listener de `beforeinstallprompt` no `window`, sincroniza com a store, expõe `canInstall`, `install()`, `dismiss()` e `isStandalone` (detecta se já está instalado via `matchMedia('display-mode: standalone')`)
  - `src/components/app/PwaInstallPrompt.tsx` (+282 linhas): UI Snackbar MUI glass com `InstallMobile` icon, ações "Agora não" (ativa cooldown de 7 dias) e "Instalar app", serialização automática (aguarda vez se outro prompt estiver visível)
  - `src/components/app/PwaUpdatePrompt.tsx`: exporta `PWA_UPDATE_VISIBILITY_EVENT` para coordenação visibilidade com install prompt
  - `src/App.tsx`: `<PwaInstallPrompt />` montado no shell (após `<AnalyticsConsentPrompt />`)
  - Namespace `pwaInstall.*` nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`, +8 linhas cada): `title` (2 variantes: disponível e disponível_mobile), `actionInstall`, `actionDismiss`, `ariaInstallButton`, `ariaDismissButton`
  - Testes: `install-prompt-store.unit.test.ts` (+565 linhas, 27+ cenários), `usePwaInstallPrompt.unit.test.ts` (+443 linhas, 18+ cenários), `pwa-install-prompt.component.test.tsx` (+400 linhas, 16+ cenários)

- **StackedHeader — componente genérico de header padronizado (Ondas 1-3)**:
  - `src/components/ui/StackedHeader.tsx` (+508 linhas): componente que unifica 3 famílias de UI: (1) Banners com ação (substitui `<Alert action={<Button>}>` em 8+ componentes), (2) Headers de seção colapsáveis com animação Motion, (3) Títulos de seção simples. Props: `collapsible` (com `defaultCollapsed` + `onToggle`), `action` (botão opcional no canto), `severity` (`success`/`warning`/`error`/`info`), variantes `section`/`banner`. Acessibilidade: `role="button"`, `aria-expanded`, `aria-controls`, `aria-label` via i18n
  - `src/hooks/useCollapsibleSection.ts` (+50 linhas): hook que encapsula `useState<boolean>` + `useId()` para estado de colapso controlado + `aria-controls`/`aria-labelledby` — reduz boilerplate em consumidores que usam StackedHeader colapsável
  - `src/components/ui/index.ts`: barrel export de `StackedHeader` e `StackedHeaderProps`
  - Namespace `stackedHeader.*` nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`): `collapseAriaLabel`
  - `tests/components/StackedHeader.component.test.tsx` (+502 linhas): 20+ cenários — renderização, colapso, severidade, ação, acessibilidade, interação do usuário

- **Migração de ~12 componentes para StackedHeader (Ondas 2-3)**:
  - `src/components/Inspector.tsx` (+336/-404): Alert do assistente + 2 CollapsibleSection (voz, cenas) migrados para StackedHeader
  - `src/components/Configuracoes.tsx` (+37/-69): 5 CollapsibleSection (Voz, Persona & Direção, Cenas & Imagens, Multi-locutor, Idioma da interface) usando `useCollapsibleSection` + StackedHeader
  - `src/components/Library.tsx` (+57/-38): 4 StackedHeader (offline, cena, batch speed paint, card generator)
  - `src/components/ImageStudio.tsx` (+26/-9): StackedHeader de erro de geração
  - `src/components/VideoLibrary.tsx` (+8/-5): StackedHeader de erro de reprodução
  - `src/components/CreditBlockedMessage.tsx` (+28/-22): migrado de `Alert` para StackedHeader
  - `src/components/feedback/FeedbackBanner.tsx` (+25/-27): migrado de `Alert` para StackedHeader
  - `src/components/feedback/FeedbackFormFields.tsx` (+10/-3): usa StackedHeader para título
  - `src/components/app/AnalyticsConsentPrompt.tsx` (+39/-33): migrado de `Paper`/`Stack` para StackedHeader
  - `src/features/assistant/Assistant.tsx` (+30/-19): StackedHeader no lugar de `Alert`
  - `src/features/studio/components/StockMediaPicker.tsx` (+8/-4): StackedHeader de erro
  - `src/features/video-render/components/TranscriptionPanel.tsx` (+20/-16): StackedHeader de erro de transcrição
  - `tests/__mocks__/tokensMock.ts` (+63 linhas): mock centralizado de tokens do tema (inclui tokens do StackedHeader) para todos os testes

- **Flag `feedbackPromoSeen` — momento zero do bônus de feedback**:
  - `functions/src/genkit/schemas/common.ts`: campo `feedbackPromoSeen: z.boolean()` no `UserSettingsSchema`
  - `functions/src/usage/credit-service.ts` (+24/-2): lógica que ativa `feedbackPromoSeen = true` quando o saldo do usuário zera pela primeira vez (transição `availableCredits` > 0 → 0)
  - `src/hooks/useCredits.ts` (+11/-0): propagação do campo no `CreditState` e `CreditSnapshot`, valor padrão `false`
  - `src/components/feedback/FeedbackFab.tsx` (+4/-2): FAB só aparece quando `feedbackPromoSeen = true` (vitrine no "momento zero", sem bônus concedido)
  - `src/components/feedback/FeedbackBanner.tsx`: lógica de visibilidade integrada com a flag
  - `src/components/app/Sidebar.tsx` (+7/-4): item "Feedback" sempre presente (exceto créditos ilimitados) — CTA simplificado, sem condição de bônus
  - `src/components/app/MobileBottomNav.tsx` (+17/-4): mesmo padrão — feedback CTA sempre disponível no drawer
  - `src/features/assistant/components/AssistantMessages.tsx` (+5/-3): chip de feedback sempre presente para usuários autenticados (exceto ilimitados), label muda após bônus concedido
  - Testes: `FeedbackFab.component.test.tsx` — 1 cenário novo (não renderiza quando `feedbackPromoSeen = false`); `credit-service.unit.test.ts` (+175 linhas) — 3 testes de ativação `feedbackPromoSeen` (reserva zera saldo, confirmação mantém, reversão restaura)

- **`stopSwipePropagation()`** (`src/hooks/useSwipeTabs.ts`, +16/-1): nova função utilitária exportada que chama `event.stopPropagation()` em `onPointerDownCapture` — padrão da doc oficial do Motion para evitar que gestos de swipe em elementos interativos propaguem para o container pai de swipe de tabs. 33 elementos protegidos no total (Inspector: 18, VoiceCard: 2, ScriptEditor: 4, EmotionSelector: 2, AIModeToggle: 1, InlineAIWidget: 5, +1 definição)

### Alterado

- **firestore.rules** (+2/-0): campo `timestamp` adicionado como obrigatório na validação da collection `errorLogs` (validação de tipo `is timestamp`)
- **functions/src/flows/audio.ts** (+8/-6): lógica de validação PCM simplificada — retries esgotados tratados como `revert` direto sem condicional extra (`if (pcmBuffer)` removido)
- **functions/src/genkit/middlewares/skills.ts** (+4/-1): comentário e constância da inicialização única do `use_skill` tool (garantida por `const` no escopo)

### Corrigido

- **Bug de ToolInterruptError no fluxo Interview** (`functions/src/flows/assistant.ts`, +14/-2): `interviewInterrupt` movido para antes de `genkitResume` — corrige `ReferenceError` em cenários onde o interrupt era usado antes de ser definido no escopo. Verificado via análise do código-fonte do Genkit (`ToolInterruptError` definido em `@genkit-ai/ai/src/tool.ts:498`)

### Melhorado

- **Condições de visibilidade do CTA de feedback unificadas**: Sidebar, MobileBottomNav e AssistenteMessages agora mostram o item/chip de feedback para todos os usuários autenticados (exceto créditos ilimitados), independentemente de já terem recebido o bônus — simplifica a lógica de "atalho permanente"

### Removido

- **Header.tsx** (`src/components/Header.tsx`, -670 linhas): componente de cabeçalho AppBar removido (substituído pela Sidebar e GuestMobileNav desde v0.123.0). Imports associados removidos de `App.tsx`
- **Testes de app shell obsoletos**: `tests/app/app-shell.test.tsx` (-238 linhas), `tests/app/routes-configuracoes.unit.test.tsx` (-224 linhas), `tests/app/routing.test.tsx` (-289 linhas) — testes do Header/AppBar removidos

### Documentado

- **docs/audits/**: 9 novos documentos — `feedback-promoseen-flag-audit.md` (478 linhas), `pwa-install-prompt-audit.md` (247 linhas), `stacked-header-onday-2-3-audit.md` (907 linhas), `interview-interrupt-toolinterrupterror-fix.md` (178 linhas), `gap-01-swipe-propagation-fix-validation.md` (159 linhas), `onday-2-3-validator-2026-06-03.md` (279 linhas), `working-tree-full-audit-2026-06-03.md` (169 linhas), `use-swipe-tabs-pointerdown-capture-fix.md` (115 linhas)
- **docs/plan/**: 3 novos planos — `pwa-install-prompt-base.md` (263 linhas), `pwa-install-prompt-plano-final.md` (367 linhas), `pwa-install-prompt-product.md` (399 linhas)

---

## [0.124.1] - 2026-06-02

### Adicionado

- **Middleware `toolValidationRecovery` no assistente IA** (`functions/src/flows/assistant.ts`): novo middleware Genkit via `generateMiddleware` que intercepta `ValidationError` do Genkit (input de tool não passa no schema) e converte em `toolResponse` amigável — o modelo se auto-corrige no próximo turno em vez de quebrar o tool loop. Import `generateMiddleware` adicionado. Substitui a função local `toolErrorResponse` e os try/catch individuais de 5 tools (`getStudioState`, `getUserMemories`, `updateStudio`, `webSearch`), agora protegidas centralizadamente pelo middleware
- **`.describe()` em todos os schemas Zod do assistente** (`functions/src/genkit/schemas/common.ts`): `AssistantSubtaskSchema`, `AssistantTaskSchema`, `AssistantPlanSchema`, `UpdatePlanInputSchema`, `WebSearchInputSchema`, `UpdateStudioInputSchema`, `InterviewOptionSchema`, `InterviewQuestionSchema`, `InterviewInputSchema`, `RespondSuggestedActionSchema`, `RespondMediaSchema`, `RespondInputSchema` — todos os campos agora têm descrições semânticas em português para guiar o LLM a gerar JSON válido, reduzindo erros de validação
- **Testes de regressão para layout mobile iOS Safari** (`tests/assistant/assistantUi.unit.test.ts`, +43 linhas): verifica que `assistantMessagesContainerSx` tem `flex: 1` + `minHeight: 0`, que `assistantEmptyStateSx` NÃO tem `minHeight`, e que a centralização via flex continua funcional
- **Documentação técnica:** `docs/audits/safetool-wrapper-and-zod-describe.md` (auditoria estática do wrapper `safeTool` e `.describe()`) e `docs/scan/tool-validation-retry-gaps.md` (scan de lacunas para retry robusto de validação)

### Corrigido

- **Bug de layout no chat mobile iOS Safari** (`src/features/assistant/components/assistantUi.ts`): `assistantMessagesContainerSx` agora usa `flex: 1` + `minHeight: 0` em vez de depender de `minHeight: '100%'` no `EmptyChatState`. Isso elimina o ciclo de altura no iOS Safari quando o teclado virtual abre ao focar o textarea — o composer `sticky` não perdia mais a referência e a área de chat não "vazava" para fora da viewport

### Melhorado

- **Robustez do tool loop do assistente:** erros de validação de schema (Camada 2) agora são interceptados centralizadamente pelo middleware `toolValidationRecovery`, que extrai mensagens de erro legíveis e as retorna como `toolResponse` — o modelo Gemini pode se auto-corrigir sem interromper a conversa. Erros de runtime continuam sendo capturados com o mesmo padrão de `toolResponse` com `{ error: true }`

---

## [0.124.0] - 2026-06-02

### Adicionado

- **Renderização Cross-Route (PR1 "Video Render Survive Navigation")** — renderização de vídeo e speed paint agora sobrevivem à navegação entre rotas:
  - `src/features/video-render/store/videoRenderController.tsx` (+548 linhas): controller Zustand singleton que gerencia o ciclo de vida do `renderMediaOnWeb` do Remotion fora do ciclo de vida React. `AbortController` em escopo de módulo, lazy import de `@remotion/web-renderer`, progresso com throttle (inteiro, `lastReportedPercentRef`), bridge legado (`videoRenderBridge`), cancelamento idempotente, reset com revogação de blob URL. Action `setCodecContainer()` para sincronização de codec/container
  - `src/features/speed-paint/store/speedPaintRenderController.tsx` (+801 linhas, substitui stub de 103 linhas): controller Zustand singleton equivalente ao de vídeo. Suporta render single + batch, composições React (ExportableSpeedPaintComposition, ExportableBatchSpeedPaintComposition), lazy import Remotion, mesmo padrão de AbortController/throttle/cancelamento. Action `setCodecContainer()`
  - `src/features/video-render/types/renderController.ts` (+112 linhas): tipos compartilhados entre controllers — `RenderKind`, `RenderStatus`, `RenderPhase`, `RenderControllerPublicState`, `RenderControllerActions<O>` com interface genérica
  - `src/hooks/useCrossRouteRenderGuard.ts` (+113 linhas): hook guard que centraliza `beforeunload` (aviso ao fechar aba com render ativo), `visibilitychange`/`focus` (pausa/retoma), `document.title` dinâmico durante rendering
  - `src/components/app/ExportCrossRouteToast.tsx` (+275 linhas): Snackbar MUI global de progresso cross-route — ícone spinner/check/erro, botões Ver Vídeo/Cancelar/Baixar/Fechar, roteia entre `/app/video` e `/app/pintura-rapida`. Handlers estáveis via `useCallback` + objetos constantes em escopo de módulo (otimizado para 30×/s durante render)
  - `src/components/app/SidebarNavItem.tsx`: subcomponente `ExportDot` com animação pulsante — azul durante render, verde estático ao concluir
  - `src/components/app/Sidebar.tsx`: dot indicator estendido para speed paint (`spIsRendering`/`spStatus` do speed paint controller)
  - `src/components/app/MobileBottomNav.tsx`: dot indicator de exportação de vídeo no item "Vídeo"
  - Namespace i18n `exportCrossRoute.*` nos 3 locales: actionViewVideo, actionCancel, actionDownload, actionClose, actionSeeDetails, renderingTitle, completedTitle, failedTitle, mobileDotActive, mobileDotCompleted — 10 chaves por locale
  - Evento analytics `video_export_completed_offroute` em `src/lib/analytics.ts`: telemetria de exportação concluída em rota diferente da página de origem

### Alterado

- **src/features/video-render/hooks/useVideoExporter.tsx** (+150/-429): refatorado para fachada fina — lógica pesada migrada para `videoRenderController`. Agora lê estado via `useStore` (seletores primitivos, `useShallow` para `speedPaintWarnings`). `useEffect` cleanup que abortava render no unmount **removido** (controller gerencia seu AbortController). Return object split em `actions` (estável) + state (reativo). Codec/container sincronizados via `setCodecContainer()` action nomeada
- **src/features/speed-paint/hooks/useSpeedPaintExporter.tsx** (+173/-586): refatorado para fachada fina — mesmo padrão do hook de vídeo. Lógica de composições Remotion, lazy import, download, analytics migrada para controller. AbortController cleanup no unmount removido. Codec/container sincronizados via `setCodecContainer()`
- **src/App.tsx** (+9/-4): `useCrossRouteRenderGuard` e `ExportCrossRouteToast` adicionados ao shell
- **src/components/app/AudioGenerationHandler.tsx** (+5/-13): `beforeunload` removido (migrado para `useCrossRouteRenderGuard`)
- **src/pages/VideoPage.tsx** (+4/-9): `useEffect` de sincronização bridge removido (controller faz via `reportProgress`)
- **src/features/i18n/locales/en.ts, es.ts, pt-BR.ts** (+32 cada): namespace `exportCrossRoute`
- **src/components/toast/ToastProvider.tsx** (+5/-63): toast de exportação de vídeo removido (substituído por ExportCrossRouteToast)
- **src/features/video-render/types/renderController.ts**: `setCodecContainer` adicionado à interface `RenderControllerActions`
- **tests/video-render/videoRenderController.unit.test.ts** (+292 linhas): novos testes do controller
- **tests/components/ExportCrossRouteToast.component.test.tsx** (+246 linhas): novos testes do toast cross-route
- **tests/hooks/useCrossRouteRenderGuard.unit.test.ts** (+226 linhas): novos testes do guard
- **tests/speed-paint/useSpeedPaintExporter.unit.test.tsx** (+35/-19): 4 testes atualizados para fachada fina (status text, cancelamento, resetSupport)
- **tests/video-render/useVideoExporter-speedpaint.unit.test.tsx** (-425 linhas): removido (lógica migrada para controller)

### Melhorado

- **ExportCrossRouteToast.tsx**: 5 handlers envolvidos em `useCallback` + 6 objetos extraídos para constantes de módulo (`TOAST_ANCHOR_ORIGIN`, `TOAST_SLOT_PROPS`, `ALERT_SX`, `PROGRESS_STACK_SX`, `TITLE_SX`, `MONO_SX`) — elimina recriação de objetos a cada render no hot path (30×/s durante progresso)
- **useVideoExporter.tsx**: `speedPaintWarnings` usa `useShallow` para comparação shallow — re-render apenas quando conteúdo do array muda; `useEffect` + `setState` substituído por action nomeada `setCodecContainer()`
- **useSpeedPaintExporter.tsx**: `useEffect` + `setState` substituído por action nomeada `setCodecContainer()`

### Removido

- **RenderSnapshot** interface de `src/features/video-render/types/renderController.ts` — código morto (declarado mas nunca consumido)
- **docs/plan/ e docs/scan/**: 11 documentos de planejamento/auditoria da versão antiga (arquivados como conclusos)

---

## [0.123.0] - 2026-06-02

### Adicionado

- **Sidebar de Navegação Colapsável** — novo sistema de navegação lateral que substitui o `Header` nas rotas `/app/*`:
  - `src/components/app/Sidebar.tsx` (+247 linhas): componente Sidebar com dois estados — collapsed (68px, apenas ícones) e expanded (264px, ícones + labels). Drawer `permanent` customizado com `MuiDrawer-paper` estilizado, toggle animado via Motion, 7 itens de navegação, destaque visual da rota ativa, persistência do estado colapsado em `localStorage` via `s2a_sidebar_collapsed`
  - `src/components/app/SidebarHeader.tsx` (+113 linhas): header da Sidebar com logo Koda AI Studio, botão de toggle colapsar/expandir (ícones `ChevronLeft`/`ChevronRight`), animação Motion fade
  - `src/components/app/SidebarFooter.tsx` (+271 linhas): footer com avatar do usuário (nome + email), créditos (`CreditIndicator`), menu de acesso rápido (Perfil, Gerenciar Cookies, Logout com `LogoutConfirmDialog`)
  - `src/components/app/SidebarNavItem.tsx` (+143 linhas): item de navegação individual com `ListItemButton`, tooltip no estado collapsed, ícone + label no estado expanded, Motion para micro-animações
  - `src/components/app/SidebarNetworkBanner.tsx` (+39 linhas): banner de conectividade de rede posicionado no topo da Sidebar
  - `src/components/app/GuestMobileNav.tsx` (+203 linhas): drawer mobile para visitantes não autenticados (extraído da lógica anterior do Header) — avatar genérico, links de navegação, botão "Abrir App"
  - `src/components/app/DeleteAccountDialog.tsx` (+118 linhas): dialog de exclusão de conta com confirmação textual (`CONFIRM_KEYWORD` = "EXCLUIR"), validação de input, feedback de erro/sucesso, integração com `useAuth().deleteAccount()`
  - `src/features/sidebar/store.ts` (+28 linhas): store Zustand com `create<SidebarState>()(...)`, estado `collapsed: true`, actions `toggle()` e `setCollapsed()`, middleware `persist` com `s2a_sidebar_collapsed` no localStorage
  - `src/theme/tokens.ts` (+21 linhas): novos tokens `SIDEBAR_WIDTH_COLLAPSED` (68), `SIDEBAR_WIDTH_EXPANDED` (264), `SIDEBAR_TRANSITION_DURATION` (250ms)
  - `src/App.tsx` (+38/-8): `Header` removido, `Sidebar`, `GuestMobileNav` e `SidebarNetworkBanner` adicionados; keep alive do `MobileBottomNav` em mdDown

- **Sistema de Feedback Global** — 8 novos arquivos em `src/components/feedback/` (~818 linhas no total):
  - `FeedbackController.tsx` (+81 linhas): controller global que escuta evento customizado `OPEN_FEEDBACK_EVENT` e renderiza o `FeedbackDialog`
  - `FeedbackDialog.tsx` (+178 linhas): dialog modal com título, campos de formulário, submissão via Cloud Function, feedback visual de sucesso/erro
  - `FeedbackFab.tsx` (+145 linhas): floating action button no canto inferior direito das rotas `/app/*` — visível apenas para usuários autenticados, abre o dialog de feedback
  - `FeedbackBanner.tsx` (+83 linhas): banner informativo no Assistente IA — sugere envio de feedback com bônus de 250 créditos (desaparece após envio)
  - `FeedbackFormFields.tsx` (+242 linhas): campos de formulário reutilizáveis (categoria, assunto, descrição) — compartilhados entre `FeedbackDialog` e `ContactPage`
  - `useFeedbackDialog.ts` (+36 linhas): hook imperativo `useFeedbackDialog()` que retorna função `openFeedback(source)` — dispara evento `OPEN_FEEDBACK_EVENT` no `window`
  - `constants.ts` (+28 linhas): `FEEDBACK_CATEGORIES` com 5 categorias (bug, sugestão, elogio, dúvida, outro), enum `FeedbackCategory`
  - `index.ts` (+25 linhas): barrel exports de todos os componentes e hooks
  - Namespace `feedback.*` nos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`, +61 linhas cada): `dialog.*` (title, category, subject, description, submit, success, error), `fab.*` (label, ariaLabel), `banner.*` (title, description, button), `emptyState.*`, `navItem.*` (label, ariaLabel), `sidebar.*` (label, ariaLabel), `toggle.*`, `user.*`, `groups.*`
  - Integração em `Assistant.tsx`: `FeedbackBanner` adicionado abaixo do chat
  - Integração em `AssistantMessages.tsx`: botão "Feedback (+250)" com `RateReviewIcon` e `useFeedbackDialog`
  - Integração em `MobileBottomNav.tsx`: item "Feedback (+250)" no drawer com `action='feedback'` (corrigido para passar `item.action` no `onClick`)
  - Integração em `App.tsx`: `FeedbackController` e `FeedbackFab` renderizados no shell

- **ContactPage refatorada** (`src/pages/public/ContactPage.tsx`, +11/-161 linhas): formulário de contato local substituído por `FeedbackFormFields` reutilizável — elimina duplicação de ~160 linhas de formulário. Ícone `RateReviewIcon` adicionado. Import do `firebase/functions` e `callable-utils` removidos (submissão agora via componente compartilhado)

- **Testes** (+969 linhas líquidas):
  - `tests/components/Sidebar.component.test.tsx` (+321 linhas): 19 testes — larguras collapsed/expanded, toggle, itens de navegação (7), acessibilidade (aria-labels), user null (sem avatar/logout), delete account dialog
  - `tests/components/Sidebar.features.test.tsx` (+310 linhas): 18 testes — links de navegação (hrefs corretos), active state por rota, persistência do toggle, logout dialog, feedback dialog, locale selector
  - `tests/features/sidebar/store.test.ts` (+126 linhas): 12 testes — estado inicial, toggle, setCollapsed, persistência localStorage
  - `tests/components/feedback/FeedbackController.component.test.tsx` (+211 linhas): testes do controller com evento customizado
  - `tests/components/feedback/FeedbackFab.component.test.tsx` (+200 linhas): testes do FAB com visibilidade condicional

### Alterado

- **App.tsx** (+38/-8): Header removido, Sidebar adicionado com 6 novos imports; MobileBottomNav preservado em mobile; GuestMobileNav para visitantes; FeedbackController e FeedbackFab integrados
- **ContactPage.tsx** (+11/-161): refatoração para usar `FeedbackFormFields` compartilhado — formulário de contato reutilizável, remove dependências diretas de Cloud Functions
- **MobileBottomNav.tsx** (+35/-10): item "Feedback (+250)" no drawer com `action='feedback'`; import de `RateReviewIcon`, `useCredits`, `useFeedbackDialog`; correção do `onClick` para passar `item.action`
- **Assistant.tsx** (+4/-0): FeedbackBanner adicionado abaixo do chat do assistente
- **AssistantMessages.tsx** (+36/-0): botão "Feedback (+250)" com `RateReviewIcon`, integração com `useFeedbackDialog` e `useAuth`
- **StudioPage.tsx** (+2/-2): ajustes internos de implementação
- **tokens.ts** (+21/-0): novos tokens de largura e transição da Sidebar

### Removido

- **Header.tsx** (removido de `App.tsx`): componente de cabeçalho AppBar substituído pela Sidebar lateral — `GuestMobileNav` extraído para componente próprio; `LogoutConfirmDialog`, `CreditIndicator` e `LocaleSelector` movidos para `SidebarFooter`
- **Testes do Header**: `tests/components/Header.component.test.tsx` (-183 linhas) e `tests/components/Header.features.test.tsx` (-183 linhas) — removidos junto com o componente
- **Formulário de contato local** (ContactPage.tsx, -160 linhas): formulário inline substituído por `FeedbackFormFields` compartilhado

---

## [0.122.0] - 2026-06-01

### Adicionado

- **AuthActionPage** (`src/pages/AuthActionPage.tsx`, +694 linhas): nova página pública dedicada ao tratamento customizado de ações de email do Firebase Auth — verificação de email, reset de senha e recuperação de email. Suporta 3 fluxos completos com estados de loading/sucesso/erro, animações Motion (AnimatePresence + fade), mapeamento de error codes Firebase → chaves i18n (8 códigos mapeados), formulário de nova senha com validação (mínimo 6 caracteres + confirmação), layout com PublicHeader/PublicFooter e glass panel MUI. SEO via `DocumentHead` com title/description dinâmicos por locale. Rota pública `/auth/action` sem COEP
- **authActionCodeSettings** (`src/lib/auth-action-settings.ts`, +12 linhas): utilitário que exporta `ActionCodeSettings` compartilhado com `handleCodeInApp: true` — faz links de ações de email (verificação, reset, recuperação) apontarem para `/auth/action` em vez do handler padrão do Firebase. Importado por `AuthContext`, `ProtectedRoute` e `LoginPage`
- **Chaves i18n `authAction.*`** nos 3 locales (`pt-BR.ts`, `en.ts`, `es.ts`, +56 linhas cada): namespace completo com SEO (seoTitle, seoDesc), verificação (verifyEmail.*), reset de senha (resetPassword.*, validation.*), recuperação de email (recoverEmail.*), erros mapeados (8 error codes → chaves i18n)
- **Testes do AuthActionPage** (`tests/pages/AuthActionPage.component.test.tsx`, +412 linhas): 20+ testes cobrindo verificação de email, reset de senha, recuperação de email, tratamento de erros, navegação e validação de formulário
- **Rota `/auth/action`** no router (`routes.tsx`): lazy loading com `AuthActionPage`, rota pública sem restrição de auth
- **Pre-render** (`vite.config.ts`): `/auth/action` adicionado à lista de rotas pré-renderizadas

### Alterado

- **AuthContext** (`src/contexts/AuthContext.tsx`): `sendEmailVerification` agora recebe `authActionCodeSettings` como segundo argumento — link de verificação aponta para `/auth/action`
- **ProtectedRoute** (`src/components/ProtectedRoute.tsx`): import de `authActionCodeSettings` para reenvio de verificação com link customizado
- **LoginPage** (`src/pages/LoginPage.tsx`): atualizada para usar `authActionCodeSettings` no fluxo de recuperação de senha
- **firebase.ts** (`src/lib/firebase.ts`): novos exports de tipo — `User`, `ActionCodeInfo`, `ActionCodeSettings`
- **Testes existentes**: `ProtectedRoute.component.test.tsx` e `AuthContext.unit.test.tsx` atualizados para refletir `authActionCodeSettings` nos asserts

### Removido

- **Documento obsoleto** (`docs/scan/auditoria-ux-4-melhorias.md`, -151 linhas): auditoria de UX concluída e arquivada

---

## [0.121.0] - 2026-06-01

### Adicionado

- **Sistema de logging modular com error tracking** (`src/lib/logger/`, 8 módulos: `types`, `config`, `console`, `filters`, `sanitization`, `interceptor`, `batch-processor`, `index` — ~1300 linhas no total): substitui o arquivo único `src/lib/logger.ts` por uma arquitetura modular com rastreamento de erros em produção via Firestore (`errorLogs` collection). 26 exports públicos — `createLogger()` (compatível com API anterior), `initErrorTracking()` (chamada em `main.tsx` na inicialização), `setLoggerUserId()` (vincula logs ao usuário autenticado via `AuthContext`), `flushLogs()` (envio forçado de pendentes), sanitização automática de dados sensíveis (tokens, emails, senhas), batch processor para envio em lote ao Firestore, interceptação global de erros (`window.onerror`, `unhandledrejection`). Configurado via 3 env vars: `VITE_LOGGER_ENABLED`, `VITE_LOGGER_MIN_LEVEL`, `VITE_LOGGER_SEND_IN_DEV`
- **LogoutConfirmDialog** (`src/components/LogoutConfirmDialog.tsx`, +56 linhas): novo componente reutilizável de confirmação de logout com Dialog MUI e i18n completo (4 chaves `studio.header.logout.*` nos 3 locales). Integrado em `Header.tsx`, `PublicHeader.tsx` e `MobileBottomNav.tsx`
- **Seção "Idioma da interface" nas Configurações** (`Configuracoes.tsx`): novo seletor de locale da UI persistido em `UserSettings` via dual storage (Firestore + IndexedDB). Import de `Language` icon e `LOCALE_CONFIGS` do módulo i18n
- **MobileBottomNav expandido** (`MobileBottomNav.tsx`, +100/-5 linhas): menu mobile com seletor de idioma (`Menu`/`MenuItem` MUI), gerenciamento de cookies (analytics consent via `openAnalyticsConsentDialog`) e dialog de confirmação de logout. Novos imports: `Language`, `Cookie`, `Menu`, `MenuItem`, `Locale`, `AnalyticsConsentPrompt`, `LogoutConfirmDialog`
- **Script de exportação de error logs** (`scripts/export-error-logs.ts`, +459 linhas): ferramenta CLI para exportar e analisar logs de erros do Firestore com filtros por data, nível e categoria. Script registrado em `package.json` como `export-error-logs`
- **Regras Firestore para `errorLogs`** (`firestore.rules`, +29 linhas): collection com validação estrita — apenas `create` por usuários autenticados, campos obrigatórios validados (`id`, `level`, `category`, `context`, `message`, `payload`, `userId`, `sessionId`, `pageUrl`, `userAgent`, `viewport`, `stackTrace`, `occurrenceCount`, `environment`). Leitura/atualização/exclusão bloqueadas para clientes
- **Variáveis de ambiente do logger** em `.env.example`: `VITE_LOGGER_ENABLED`, `VITE_LOGGER_MIN_LEVEL`, `VITE_LOGGER_SEND_IN_DEV`
- **Chaves i18n** nos 3 locales: `studio.header.logout.*` (dialogTitle, dialogDescription, dialogCancel, dialogConfirm), `configuracoes.interfaceLocaleLabel`, quick actions renomeadas (`howItWorks`, `createScript`, `whichVoice`)

### Alterado

- **Logger**: `src/lib/logger.ts` (arquivo único, ~142 linhas) → `src/lib/logger/` (8 módulos, ~1300 linhas). API pública `createLogger()` mantida totalmente compatível via re-export do `index.ts`. Novo `initErrorTracking()` chamado em `main.tsx` na inicialização
- **ErrorBoundary**: movido de `main.tsx` (inline) para `src/components/ErrorBoundary.tsx` — integrado com o novo logger e importado em `routes.tsx`
- **Header.tsx** (+32/-4): `LogoutConfirmDialog` substitui logout direto — botão "Sair" agora abre dialog de confirmação antes de efetuar logout
- **PublicHeader.tsx** (+22/-1): `LogoutConfirmDialog` integrado para logout de usuários autenticados pela área pública
- **Quick actions do assistente** (3 locales): `adjustPace`/`suggestScene` → `howItWorks`/`createScript`/`whichVoice` — sugestões contextuais mais relevantes para novos usuários
- **Brand**: "Estúdio de Produção" → "AI Studio" em `ProductDemoSection.tsx` e chaves i18n dos 3 locales (`studio.header.subtitle`, `studio.header.title`)
- **LocaleSelector.tsx**: refatorado para usar theme tokens (`ICON_SIZE_LG`, `APP_BORDER`, `WHITE_05`, `WHITE_015`) em vez de valores inline
- **Error handling consistente** (~15+ arquivos): `catch {}` → `catch (err: unknown)` com `log.warn()` incluindo contexto e `String(err)`. Arquivos: `useProjectGallery.ts`, `useTranscription.ts`, `strokeCache.ts`, `analytics.ts`, `account-cleanup.ts`, `chats.ts`, `user-settings.ts`, `wizardStore.ts`, `audio.ts` (backend), `assistant.ts` (backend), `credit-service.ts` (backend)
- **Backend (Cloud Functions)**: todos os 8 flows migrados para `createLogger` de `genkit/utils/logger.js` — `credit-snapshot.ts`, `feedback.ts`, `ping.ts`, `scene-prompts.ts`, `genkit.ts`, `index.ts`, `ai-requests.ts`, `credit-service.ts`. Tratamento de erros com `err: unknown` e logging contextual
- **`main.tsx`** (+16/-24): `ErrorBoundary` movido para arquivo próprio; novo `initErrorTracking()` na inicialização; remoção do import `RoutableErrorBoundary`
- **`routes.tsx`** (+10/-4): `ErrorBoundary` importado de `../components/ErrorBoundary` e aplicado como wrapper das rotas autenticadas

### Corrigido

- **Testes** (30+ arquivos): `setLoggerUserId: vi.fn()` adicionado ao mock do logger em todos os testes. Testes de `Header` atualizados para refletir dialog de logout (não mais logout direto). Testes de `ProductDemoSection` e `LandingPage` atualizados para novo brand "AI Studio". Teste de `Configuracoes` atualizado para múltiplos selects de locale. Novos mocks de Firebase em `imageProcessing.unit.test.ts` e `speedPaintRenderer.unit.test.ts`. Novo teste `imageTextLanguage.unit.test.ts` (+40 linhas)
