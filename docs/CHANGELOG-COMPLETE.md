# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

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
