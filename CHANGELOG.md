# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.107.1] - 2026-05-29

### Alterado

- **ToolEventCard**: `updatePlan` tornado silencioso — adicionado `SILENT_TOOLS` set (`ToolEventCard.tsx`) que suprime a exibição de eventos de ferramenta `updatePlan` na UI do chat, reduzindo ruído visual durante o tool loop do assistente. Testes atualizados (`AssistantMessages.component.test.tsx`)
- **Regras do `updatePlan` no backend**: instrução do system prompt reforçada em `assistant-context.ts` — "NUNCA recria o plano do zero — sempre envie o array completo com os status atuais" — evita que o modelo resete o plano de tarefas durante execução multi-turno
- **PlanWidget**: simplificado — removida dependência de `AssistantTaskPriority`; exibição de tarefas mais enxuta (sem labels de prioridade). Redução de ~33 linhas

### Removido

- **Tipo `AssistantTaskPriority`**: removido de `functions/src/genkit/schemas/common.ts` e `src/features/assistant/types.ts` — prioridades de tarefas não são mais validadas/expostas como enum, dando maior liberdade ao modelo (consistente com flexibilização feita no 0.104.1)
- **Chaves i18n `plan.priorityLabels.*`**: removidas dos 3 locales (`en.ts`, `es.ts`, `pt-BR.ts`) — não mais utilizadas após simplificação do PlanWidget

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
