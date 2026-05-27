# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

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

- **Constantes de TTS** (`functions/src/genkit/constants.ts`): `MAX_TTS_CHUNKS=24`, `MIN_TTS_PCM_BYTES=1024`
- **`assertValidPcmChunk`** no flow `audio.ts`: validação de chunks PCM com `responseModalities: ['AUDIO']`
- **Suporte a `video_render`** em `credit-estimator.ts` e `credit-policy.ts` — estimativa de créditos baseada em duração + resolução
- **`video_render`** adicionado ao tipo `AiRequestFlow` em `ai-requests.ts`

### Alterado

- **`firebase.ts` (frontend)**: adicionada função `isLocalBrowserHost()` para detecção de ambiente local
- **`audio-preflight.ts` (backend)**: importa `CHUNK_LIMIT` e `MAX_TTS_CHUNKS` de `genkit/constants.js`
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
