# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

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
