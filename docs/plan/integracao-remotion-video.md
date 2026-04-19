# Plano: Integração do Remotion para Vídeo Programático (3 Fases)

## Contexto

O Script Master hoje transforma roteiros em áudio TTS (Gemini) com geração de imagens por cena. O fluxo para na preview visual -- um componente `VideoPreview` baseado em `motion/react` que mostra imagens com crossfade, sincronizado ao áudio via `AudioContext`. Não há exportação de vídeo final.

O objetivo é integrar o **Remotion** (framework React para vídeos programáticos) em **3 fases incrementais**:

1. **Fase 1:** Substituir o preview visual por um Remotion Player com Composition sincronizada (imagens + áudio + legendas)
2. **Fase 2:** IA gera automaticamente o "plano de edição" (timing, transições, legendas, efeitos de câmera) via Gemini structured output
3. **Fase 3:** Exportação MP4 client-side via `@remotion/web-renderer` (WebCodecs) + persistência dual

### Evidências (Mapeamento + Agents)

**Áreas e arquivos mapeados:**
- 13 áreas funcionais, 74 arquivos no total
- Blast radius pequeno: `VideoPreview` só é consumido por `VideoPage`
- Tipos existentes compatíveis: `StudioScene {imageUrl, timestamp}`, `SceneRatio`, `StudioDraftState`
- `useAudioGenerator` já produz `audioUrl` + `scenes[]` + `audioBlob` -- formato de entrada ideal

**Padrões identificados:**
- Features em `src/features/<domain>/` com `types.ts`, `store/`, `components/`, `lib/`
- Hooks retornam objeto plano `{ estados, setters, actions, derivados }` com progresso `statusText` + `progress` (0-100)
- Pages usam `Pick<StudioStateController, 'key1' | 'key2'>` para filtrar props
- Lazy loading em `App.tsx` com named export pattern
- Persistência dual: `if (userId) { Firestore + Storage } else { IndexedDB }`
- SDK Gemini memoizado via `useMemo(() => new GoogleGenAI(...), [])`
- Erros amigáveis pt-BR via `toUserFriendlyError()` + auto-dismiss 8s

**Impacto analisado:**
- `VideoPreview.tsx` → BAIXO (1 consumidor: VideoPage)
- `ActionBar.tsx` → MEDIO (1 consumidor: App.tsx, 2 rotas)
- `useStudioState.ts` → ALTO (hub central, spread para 3+ consumers)
- `gemini.ts` → BAIXO (1 consumidor, adição puramente aditiva)
- `useAudioGenerator.ts` → MEDIO-ALTO (1 consumer direto, mas cascata via StudioStateController)
- `VideoPage.tsx` → MEDIO (recebe spread, adapta-se automaticamente)
- `db/projects.ts` → MEDIO (muitos consumers, mas adição é aditiva)

**Reutilização mapeada:**
- `resolveActiveScene()` (scene.ts), `downloadFile()` (download.ts), `glassPanelSx` (surfaces.ts)
- `generateScenePrompts()` como modelo para `generateEditingPlan()`
- `saveAudioToProject()` como template para `saveVideoToProject()`
- `uploadBlobAndGetUrl()`, `createFirestoreConverter()`, `deleteStorageObjectSafely()` (db/shared.ts)
- Padrão de progresso triplo: `isGenerating` + `generationProgress` + `statusText`
- Remotion substitui: `motion/react` (no VideoPreview), `requestAnimationFrame`, `MediaRecorder`
- Remotion NÃO substitui: geração TTS, geração de imagens, persistência, download

**NotebookLM consultados:**
- Remotion Guide (`3333bad6-daf0-4f5a-9a82-e5f0c038ef20`) -- rendering options, Player API, web-renderer
- Gemini API (`5efcb208-b12d-47d1-8d51-a2b5ad8e954e`) -- structured output com responseSchema

**Resultado da pesquisa Remotion:**
- `@remotion/web-renderer` (client-side) é experimental alpha, usa WebCodecs/Mediabunny, suporta MP4/WebM/WAV
- Suporta Chrome 94+, Firefox 130+, Safari 26+
- `renderMediaOnWeb()` -- sem bundling step, recebe componentes e config diretamente
- `@remotion/cloudrun` é alpha descontinuado -- não usar
- `@remotion/lambda` requer AWS -- não compatível com Firebase Hosting
- Client-side é o caminho natural para SPA sem backend Node

---

## Decisões Tomadas

### 1. Onde criar a feature Remotion
- **Decisão:** `src/features/video-render/` (nova feature dedicada)
- **Justificativa:** Segue padrão do projeto (speed-paint, studio, assistant). Feature nova com types, store, components e lib próprios.

### 2. Store de estado -- hook customizado vs Zustand
- **Decisão:** Hook customizado `useVideoComposer` (Fase 1-2), migrar para Zustand na Fase 3
- **Justificativa:** Fase 1-2 o estado é simples (config da composition, ref do player). Fase 3 adiciona export com progress/queue/retry -- segue modelo de `animationStore.ts`.

### 3. Sincronização audio × vídeo -- Player como master clock
- **Decisão:** Remotion Player como master clock com `<Audio>` embutido na Composition
- **Justificativa:** O Remotion Player **não aceita `currentFrame` como prop reativo**. Ele é o mestre do timing. Usar `<Audio>` nativo garante sincronização frame-perfect. Na rota `/video`, ActionBar chama `playerRef.play()/pause()` em vez de `toggle('studio')`.

### 4. Remoção do `motion/react` do VideoPreview
- **Decisão:** Substituir por Remotion. `motion` permanece no package.json (usado em VideoLibrary e outros)
- **Justificativa:** Remotion oferece transições frame-accurate e é necessário para exportação.

### 5. Abordagem incremental por fases
- **Decisão:** Fase 1 → Fase 2 → Fase 3 como planos separados, cada um funcional e testável
- **Justificativa:** Fase 1 é a fundação (types, composition, player). Fase 2 adiciona inteligência. Fase 3 adiciona infraestrutura de export.

### 6. Exportação -- client-side via web-renderer
- **Decisão:** `@remotion/web-renderer` para renderização client-side (WebCodecs API)
- **Justificativa:** O projeto é SPA estática no Firebase Hosting sem backend Node. Não há infra para Lambda ou Cloud Functions. O web-renderer roda no browser sem servidor. O projeto já aceita API keys expostas no bundle (padrão existente com `VITE_GEMINI_API_KEY`). Limitação: navegadores modernos apenas (Chrome 94+).

### 7. IA para plano de edição -- Gemini structured output
- **Decisão:** `gemini-3.1-flash-lite-preview` com `responseMimeType: "application/json"` e `responseSchema`
- **Justificativa:** Mesmo padrão já usado em `generateScenePrompts()`. Modelo leve, rápido e barato. Retorna `EditingScene[]` com transições, legendas, efeitos de câmera por cena.

### 8. Persistência de vídeos -- nova subcoleção
- **Decisão:** `projects/{projectId}/videos` (nova subcoleção) + `VIDEOS_STORE` no IndexedDB
- **Justificativa:** Segue padrão de `audios/` e `images/`. Não modifica tipos existentes (`AudioSource`, `ProjectImage`). Isola impacto.

### 9. Version pinning do Remotion
- **Decisão:** Versão fixa sem caret (ex: `4.0.448`) para todos os pacotes `remotion` e `@remotion/*`
- **Justificativa:** Version mismatch entre pacotes Remotion causa bugs silenciosos.

---

## Reutilização e Padrões

**Reutilizar sem modificação:**
- `src/lib/scene.ts` (`resolveActiveScene`) -- timing dentro da Composition via `useCurrentFrame() / fps`
- `src/lib/audio.ts` (`createWavBlob`) -- referência de formato WAV 24kHz/mono/16-bit
- `src/lib/download.ts` (`downloadFile`) -- download de vídeo MP4 exportado
- `src/theme/surfaces.ts` (`glassPanelSx`, `glassSurfaceSx`) -- container do Player
- `src/theme/tokens.ts` (todos os tokens) -- design system

**Reutilizar com extensão:**
- `src/lib/gemini.ts` -- adicionar `generateEditingPlan()` seguindo padrão de `generateScenePrompts()`
- `src/hooks/useAudioGenerator.ts` -- `durationInSeconds` derivável via `videoUtils.calculateDurationFromWav(audioBlob, 48000)` (não expor no hook para não poluir)
- `src/features/studio/types.ts` -- adicionar tipos de vídeo (sem quebrar existentes)
- `src/features/studio/useStudioState.ts` -- expor dados adicionais
- `src/lib/db/projects.ts` -- adicionar `saveVideoToProject()` seguindo `saveAudioToProject()`
- `src/lib/db/shared.ts` -- adicionar `VIDEOS_STORE`, incrementar `DB_VERSION`
- `src/lib/db/types.ts` -- adicionar `ProjectVideo`
- `src/lib/constants.ts` -- adicionar `TRANSITION_PRESETS`, `CAMERA_MOVEMENTS`

**Padrão de referência:**
- `src/features/speed-paint/store/animationStore.ts` -- Zustand store para Fase 3
- `src/hooks/useAudioGenerator.ts` -- padrão de hook com progresso, cancelamento, erros pt-BR
- `src/lib/db/projects.ts` (`saveAudioToProject`) -- padrão dual storage

**Código novo (justificado):**
- Composition Remotion (`VideoComposition.tsx`) -- não existe equivalente no projeto
- Tipos de vídeo (`EditingScene`, `VideoCompositionProps`, `ProjectVideo`) -- domínio novo
- Helpers de conversão (`videoUtils.ts`) -- `msToFrames`, `framesToSeconds` específicos do Remotion
- `useVideoComposer()` hook -- orquestra Remotion Player + estado de render
- `generateEditingPlan()` -- nova função Gemini com schema diferente

---

## Arquivos a Modificar

### Fase 1 -- Novos arquivos
- `src/features/video-render/types.ts` -- tipos: `VideoScene`, `VideoCompositionProps`, `VideoRenderConfig`
- `src/features/video-render/components/VideoComposition.tsx` -- Composition React para Remotion
- `src/features/video-render/components/SceneSequence.tsx` -- sequência de cenas com transição
- `src/features/video-render/components/SubtitleOverlay.tsx` -- legenda estilizada
- `src/features/video-render/lib/videoUtils.ts` -- helpers: `msToFrames`, `getResolutionFromRatio`, `calculateDurationFromWav`

### Fase 1 -- Arquivos modificados
- `package.json` -- adicionar `remotion`, `@remotion/player` (versão fixa)
- `vite.config.ts` -- verificar/configurar para Remotion (se necessário)
- `src/hooks/useAudioGenerator.ts` -- expor `durationInSeconds` no retorno
- `src/features/studio/useStudioState.ts` -- expor `videoFps`, `durationInFrames`
- `src/components/VideoPreview.tsx` -- reescrito para Remotion Player
- `src/pages/VideoPage.tsx` -- adaptar props para novo VideoPreview

### Fase 2 -- Novos arquivos
- `src/features/video-render/lib/editingPlan.ts` -- tipos `EditingScene`, `EditingPlan` + prompt template
- `src/features/video-render/components/EditingPlanInspector.tsx` -- exibe/edita o plano de edição gerado

### Fase 2 -- Arquivos modificados
- `src/lib/gemini.ts` -- adicionar `generateEditingPlan()`
- `src/features/video-render/types.ts` -- adicionar `EditingScene` aos tipos
- `src/features/video-render/components/VideoComposition.tsx` -- consumir `EditingScene[]` para transições/legendas/efeitos
- `src/pages/VideoPage.tsx` -- adicionar seção de plano de edição + botão "Gerar plano"
- `src/components/ActionBar.tsx` -- adicionar botão para gerar plano de edição

### Fase 3 -- Novos arquivos
- `src/features/video-render/store/renderStore.ts` -- Zustand store para estado de render (progress, queue, retry)
- `src/features/video-render/components/VideoExportPanel.tsx` -- progresso de render + cancel + download
- `src/features/video-render/hooks/useVideoExporter.ts` -- hook que chama `renderMediaOnWeb()` com progress
- `src/lib/db/videos.ts` -- CRUD de vídeos (dual storage)

### Fase 3 -- Arquivos modificados
- `package.json` -- adicionar `@remotion/web-renderer` (versão fixa)
- `src/lib/db/types.ts` -- adicionar `ProjectVideo`
- `src/lib/db/shared.ts` -- adicionar `VIDEOS_STORE`, incrementar `DB_VERSION` para 7
- `src/lib/db/index.ts` -- re-exportar `videos.ts`
- `src/pages/VideoPage.tsx` -- adicionar painel de exportação
- `src/components/ActionBar.tsx` -- adicionar botão "Exportar MP4"
- `storage.rules` -- adicionar regra para `projects/{userId}/{projectId}/videos/` (200MB)

### Arquivos NÃO modificados em nenhuma fase
- `src/lib/scene.ts`, `src/lib/audio.ts`, `src/lib/download.ts`
- `src/hooks/useImageGenerator.ts`, `src/hooks/useVoicePreviews.ts`, `src/hooks/useAudioPlayer.ts`
- `src/contexts/AuthContext.tsx`
- `src/features/speed-paint/**` (feature independente)
- `src/components/VideoLibrary.tsx`, `src/components/Library.tsx`
- `src/pages/StudioPage.tsx`, `src/pages/LibraryPage.tsx`, `src/pages/SpeedPaintPage.tsx`, `src/pages/AssistantPage.tsx`

---

## Passos de Implementação

### FASE 1: Remotion Player (Preview)

#### Passo 1.1: Tipos e configuração (sem breaking change)
1. Adicionar tipos em `src/features/video-render/types.ts`:
   - `VideoScene` (estende `StudioScene` com `durationInFrames`, `subtitle?`)
   - `VideoCompositionProps` (cenas, audioUrl, fps, resolution, editingPlan?)
   - `VideoRenderConfig` (resolução, fps, codec)
2. Adicionar `remotion` + `@remotion/player` ao `package.json` com **versão fixa sem caret**:
   - `bun add remotion@4.0.448 @remotion/player@4.0.448`
   - Após install, editar `package.json` e remover `^` de todos os pacotes remotion/@remotion/*
3. Verificar `vite.config.ts` para config adicional
4. `bun install` e `bun run dev` -- verificar que funciona

#### Passo 1.2: Composition Remotion (novo código)
1. Criar `src/features/video-render/lib/videoUtils.ts`:
   - `msToFrames(ms, fps)`, `framesToMs(frames, fps)`, `framesToSeconds(frames, fps)`
   - `getResolutionFromRatio(ratio: SceneRatio): {width, height}`
   - `calculateDurationFromWav(pcmByteLength, sampleRate): number`
2. Criar `src/features/video-render/components/VideoComposition.tsx`:
   - `<Audio src={audioUrl} />` (master clock)
   - `<Sequence>` por cena com `from={msToFrames(scene.timestamp * 1000, fps)}`
   - Transições com `interpolate()` + `spring()`
3. Criar `src/features/video-render/components/SceneSequence.tsx`:
   - Cena individual com `<Img>` e fade in/out
4. Criar `src/features/video-render/components/SubtitleOverlay.tsx`:
   - Legenda estilo TikTok/Shorts, animação palavra por palavra

#### Passo 1.3: Expor dados do studio (sem breaking change)
1. Em `useStudioState.ts`: derivar `videoFps: number` (default 30) e `durationInFrames: number` (derivado de `videoUtils.calculateDurationFromWav(audioBlob, 48000) * videoFps`). O `audioBlob` já está disponível via `useAudioGenerator()`. Preferir derivar no consumidor via `videoUtils.ts` em vez de expor `durationInSeconds` no hook.
2. Como App.tsx usa spread `{...studio}`, VideoPage recebe automaticamente

#### Passo 1.4: Reescrever VideoPreview + adaptar ActionBar (breaking change contido)
1. Reescrever `VideoPreview.tsx` com `Player` do Remotion:
   - Importar `Player` de `@remotion/player` e `VideoComposition` de `../features/video-render/`
   - Passar `scenes`, `audioUrl`, `fps`, `durationInFrames`, `resolution` como `inputProps`
   - Expor `playerRef` via `forwardRef` para que o ActionBar possa chamar `play()/pause()/seekTo()`
   - `<Audio>` do Remotion gerencia o áudio internamente -- **não usar AudioContext nesta rota**
2. Adaptar `VideoPage.tsx`:
   - Passar `fps`, `durationInFrames`, `audioUrl` como novas props para VideoPreview
   - **Remover** `useGlobalAudioState().currentTime` -- Remotion Player é o master clock
   - Repassar `playerRef` para ActionBar (via callback ou ref) para play/pause integrado
3. Adaptar `ActionBar.tsx`:
   - Na rota `/video`: usar `playerRef.current.play()/pause()` para controlar o Remotion Player (imperativo via ref)
   - Na rota `/`: continuar usando `toggle('studio')` do AudioContext (comportamento atual preservado)
   - **Evitar dual-play**: na `/video`, o `<audio>` global do AudioContext deve ser pausado/ignorado. O `<Audio>` do Remotion é o único source de áudio.

#### Passo 1.5: Verificação Fase 1
- `bun run lint` / `bun run typecheck` / `bun run build`
- Preview de vídeo funciona na rota `/video` com Remotion Player
- Sincronização audio/visual funcional
- StudioPage, LibraryPage, SpeedPaintPage sem regressão

---

### FASE 2: IA Gera Plano de Edição

#### Passo 2.1: Tipos do plano de edição
1. Criar `src/features/video-render/lib/editingPlan.ts`:
   - `EditingScene` interface: `{ timestamp, prompt, transition, subtitle?, effects?, camera?, durationOverride? }`
   - `EditingPlan` type: `EditingScene[]`
   - `TRANSITION_PRESETS`: Record com presets ('fade', 'slide-left', 'zoom', 'cut', 'dissolve')
   - `CAMERA_MOVEMENTS`: Record com movimentos ('static', 'pan-left', 'zoom-in', 'zoom-out')
2. Atualizar `src/features/video-render/types.ts`: `VideoCompositionProps` aceita `editingPlan?: EditingScene[]`

#### Passo 2.2: Função Gemini para plano de edição
1. Em `src/lib/gemini.ts`, adicionar `generateEditingPlan()`:
   - Modelo: `gemini-3.1-flash-lite-preview`
   - `responseMimeType: "application/json"`
   - `responseSchema` com `Type.ARRAY` de objetos (timestamp, prompt, transition, subtitle, effects, camera)
   - Prompt de sistema instrui a IA a analisar o roteiro e gerar timings com transições apropriadas
   - Segue exatamente o padrão de `generateScenePrompts()`

#### Passo 2.3: Integrar plano na Composition
1. Atualizar `VideoComposition.tsx` para consumir `EditingScene[]`:
   - Se `editingPlan` presente, usar transições e legendas do plano
   - Se ausente, usar transição padrão (fade) -- backward compatible
2. Atualizar `SceneSequence.tsx` para suportar tipos de transição variados
3. Atualizar `SubtitleOverlay.tsx` para exibir legendas do plano de edição

#### Passo 2.4: UI do plano de edição
1. Criar `EditingPlanInspector.tsx`:
   - Lista de cenas com transição, legenda, efeito de câmera editáveis
   - Usa tokens MUI (`glassSurfaceSx`, `insetPanelSx`)
2. Em `VideoPage.tsx`: adicionar seção colapsável do plano de edição
3. Em `ActionBar.tsx`: adicionar botão "Gerar plano de edição" (ao lado de gerar áudio)

#### Passo 2.5: Hook do plano de edição
1. Criar hook `useEditingPlan()` (dentro de `src/features/video-render/` ou em `src/hooks/`):
   - Estado: `editingPlan`, `isGeneratingPlan`, `planProgress`, `error`
   - Ação: `generateEditingPlan(script, scenes, duration)` chama `gemini.generateEditingPlan()`
   - Segue padrão de `useAudioGenerator` (progresso, cancelamento, erros pt-BR)

#### Passo 2.6: Verificação Fase 2
- `bun run lint` / `bun run typecheck` / `bun run build`
- Botão "Gerar plano" funciona e chama Gemini
- Plano gerado aparece no Inspector com campos editáveis
- Composition reflete as transições/legendas do plano
- Fase 1 ainda funciona (backward compatible sem plano)

---

### FASE 3: Exportação MP4

#### Passo 3.1: Persistência de vídeos
1. Em `src/lib/db/types.ts`: adicionar `ProjectVideo` interface (id, projectId, userId, videoUrl, format, width, height, fps, durationInSeconds, createdAt, videoBlob?)
2. Em `src/lib/db/shared.ts`: adicionar `VIDEOS_STORE = 'videos'`, incrementar `DB_VERSION` para 7
3. Criar `src/lib/db/videos.ts`:
   - `saveVideoToProject(video, userId)` -- segue `saveAudioToProject()`
   - `getProjectVideos(projectId, userId)` -- lista vídeos
   - `deleteVideoFromProject(videoId, projectId, userId)` -- remove vídeo
4. Em `src/lib/db/index.ts`: re-exportar novo módulo

#### Passo 3.2: Store Zustand para render
1. Criar `src/features/video-render/store/renderStore.ts`:
   - Segue padrão de `animationStore.ts`
   - Estado: `job` (RenderJob), `settings` (RenderSettings), `isRendering`, `renderProgress`
   - Ações: `startRender`, `cancelRender`, `resetJob`

#### Passo 3.3: Hook de exportação
1. Criar `src/features/video-render/hooks/useVideoExporter.ts`:
   - Importa `renderMediaOnWeb` de `@remotion/web-renderer`
   - Estado: `isRendering`, `renderProgress` (0-100), `renderStatusText`, `outputBlob`, `outputUrl`, `error`
   - `startRender(options: RenderOptions)` -- chama `renderMediaOnWeb()` com callback `onProgress`
   - `handleCancel()` -- cancela render via AbortController
   - Após render: salva via `saveVideoToProject()` + oferece download via `downloadFile()`
   - Segue padrão de progresso/cancelamento/erros pt-BR de `useAudioGenerator`

#### Passo 3.4: UI de exportação
1. Criar `VideoExportPanel.tsx`:
   - Progresso de render com `LinearProgress` (mesmo padrão do ActionBar)
   - Botão cancelar + status text
   - Download automático ao completar
2. Em `VideoPage.tsx`: adicionar painel de exportação
3. Em `ActionBar.tsx`: adicionar botão "Exportar MP4" no menu de download
4. Adicionar `@remotion/web-renderer` ao `package.json` (versão fixa)

#### Passo 3.5: Storage rules
1. Atualizar `storage.rules`: adicionar regra específica para vídeos **ANTES** do wildcard `projects/{userId}/{allPaths=**}` (Firebase rules usam first-match):
   - Limite 200MB, contentType `video/*`
   - O wildcard atual (50MB) continuará cobrindo áudios e imagens

#### Passo 3.6: Verificação Fase 3
- `bun run lint` / `bun run typecheck` / `bun run build`
- Botão "Exportar MP4" inicia render no browser
- Progresso de render atualiza em tempo real
- Download do MP4 funciona
- Vídeo salvo no projeto (Firestore/IndexedDB)
- Storage rules permitem upload de vídeos
- Verificar compatibilidade browser (Chrome 94+, Firefox 130+)
- Verificar fallback graceful se WebCodecs não disponível

---

## Riscos e Mitigações

| Risco | Fase | Severidade | Mitigação |
|---|---|---|---|
| Remotion Player como master clock conflita com ActionBar na `/video` | 1 | ALTO | ActionBar usa `playerRef.play()/pause()`. Lógica condicional por rota. |
| Bundle size aumenta com Remotion | 1 | MEDIO | VideoPage já é lazy-loaded. Remotion só carrega na `/video`. |
| `@remotion/player` exige config Vite específica | 1 | MEDIO | Testar dev server após install. Remotion documenta compatibilidade Vite. |
| Version mismatch entre pacotes Remotion | 1 | MEDIO | Instalar versão fixa sem caret. Validar `package.json` após install. |
| Tipos do Remotion conflitam com React 19 | 1 | BAIXO | Remotion v4 suporta React 19. Verificar versão exata. |
| Gemini retorna plano de edição inconsistente | 2 | MEDIO | Validação zod-like do schema retornado. Fallback para plano padrão (fade). |
| `@remotion/web-renderer` é experimental alpha | 3 | ALTO | Verificar browser support. Fallback graceful: exibir mensagem "navegador não suportado". Monitorar changelog do Remotion para estabilização. |
| Vídeo MP4 excede 50MB (limite atual do Storage) | 3 | MEDIO | Regra específica para vídeos (200MB). Vídeos curtos (< 3 min) tipicamente < 50MB. |
| Render no browser consome muita memória | 3 | MEDIO | Limitar resolução padrão a 720p. Alertar usuário para 1080p. |
| `@remotion/web-renderer` requer CORS em imagens | 3 | MEDIO | Imagens do Firebase Storage já têm CORS. Imagens blob: URLs são same-origin. |
| Índice IndexedDB precisa upgrade | 3 | BAIXO | Incrementar `DB_VERSION` -- trigger automático de upgrade no `shared.ts`. |

---

## Verificação

### Fase 1
- [ ] `bun run lint` sem erros
- [ ] `bun run typecheck` sem erros
- [ ] `bun run build` sucesso
- [ ] Preview de vídeo funciona na `/video` com Remotion Player
- [ ] Sincronização audio/visual funcional
- [ ] StudioPage (/) sem regressão
- [ ] LibraryPage sem regressão
- [ ] SpeedPaintPage sem regressão

### Fase 2
- [ ] `bun run lint` sem erros
- [ ] `bun run typecheck` sem erros
- [ ] `bun run build` sucesso
- [ ] Botão "Gerar plano" chama Gemini com sucesso
- [ ] Plano de edição exibido no Inspector
- [ ] Composition reflete transições/legendas do plano
- [ ] Fallback para plano padrão funciona sem plano
- [ ] Fase 1 funcionalidade preservada

### Fase 3
- [ ] `bun run lint` sem erros
- [ ] `bun run typecheck` sem erros
- [ ] `bun run build` sucesso
- [ ] Exportação MP4 funciona no Chrome 94+
- [ ] Progresso de render atualiza em tempo real
- [ ] Download do MP4 funciona
- [ ] Vídeo salvo no projeto (dual storage)
- [ ] Storage rules permitem upload de vídeo
- [ ] Fallback graceful se WebCodecs não disponível
- [ ] Fases 1 e 2 preservadas

---

## Distribuição de Agents

### FASE 1

#### Lote 1 (fundação -- executa primeiro)
- Agent 1: **builder-worker** -- Tipos + Composition Remotion + Utils + deps install | 📓 Remotion (`3333bad6-daf0-4f5a-9a82-e5f0c038ef20`)

#### Lote 2 (sequencial -- depende do Lote 1)
- Agent 2: **builder-worker** -- VideoPreview rewrite + VideoPage adapt + useStudioState expose + useAudioGenerator durationInSeconds | 📓 Remotion (`3333bad6-daf0-4f5a-9a82-e5f0c038ef20`)

### FASE 2

#### Lote 3 (independente da Fase 1 para types/gemini, mas depende para Composition)
- Agent 3: **builder-worker** -- Tipos do plano de edição + `generateEditingPlan()` em gemini.ts + `useEditingPlan()` hook | 📓 Gemini API (`5efcb208-b12d-47d1-8d51-a2b5ad8e954e`)

#### Lote 4 (sequencial -- depende do Lote 1 + Lote 3)
- Agent 4: **builder-worker** -- Atualizar Composition para consumir EditingScene + EditingPlanInspector + VideoPage/ActionBar adaptação | 📓 Remotion (`3333bad6-daf0-4f5a-9a82-e5f0c038ef20`)

### FASE 3

#### Lote 5 (independente -- persistência + store)
- Agent 5: **builder-worker** -- Tipos ProjectVideo + db/videos.ts + db/shared.ts + db/types.ts + renderStore.ts (Zustand) | 📓 Firebase Firestore (`c5e58e83-b49e-402c-80d4-dc53acb5453e`)

#### Lote 6 (sequencial -- depende do Lote 5)
- Agent 6: **builder-worker** -- useVideoExporter hook + VideoExportPanel + VideoPage/ActionBar adaptação + storage rules + deps install (`@remotion/web-renderer`) | 📓 Remotion (`3333bad6-daf0-4f5a-9a82-e5f0c038ef20`)

### Leitura obrigatória por Agent

- **Agent 1:** `src/features/studio/types.ts`, `src/lib/scene.ts`, `src/lib/audio.ts`, `src/components/VideoPreview.tsx` (design ref), `src/theme/tokens.ts`, `src/theme/surfaces.ts`
- **Agent 2:** `src/components/VideoPreview.tsx` (reescrita), `src/pages/VideoPage.tsx`, `src/features/studio/useStudioState.ts`, `src/hooks/useAudioGenerator.ts`, `src/contexts/AudioContext.tsx`, `src/components/ActionBar.tsx`, `src/App.tsx`
- **Agent 3:** `src/lib/gemini.ts` (padrão structured output), `src/lib/constants.ts`, `src/features/studio/types.ts`
- **Agent 4:** `src/features/video-render/components/VideoComposition.tsx` (atualizar), `src/features/video-render/types.ts`, `src/pages/VideoPage.tsx`, `src/components/ActionBar.tsx`
- **Agent 5:** `src/lib/db/projects.ts` (padrão dual storage), `src/lib/db/shared.ts`, `src/lib/db/types.ts`, `src/features/speed-paint/store/animationStore.ts` (padrão Zustand)
- **Agent 6:** `src/hooks/useAudioGenerator.ts` (padrão progress/cancel), `src/lib/download.ts`, `src/features/video-render/store/renderStore.ts`, `src/pages/VideoPage.tsx`, `src/components/ActionBar.tsx`

### Notebooks
- Agent 1 → `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` (Remotion Guide)
- Agent 2 → `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` (Remotion Guide)
- Agent 3 → `5efcb208-b12d-47d1-8d51-a2b5ad8e954e` (Gemini API -- structured output)
- Agent 4 → `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` (Remotion Guide)
- Agent 5 → `c5e58e83-b49e-402c-80d4-dc53acb5453e` (Firebase Firestore Docs)
- Agent 6 → `3333bad6-daf0-4f5a-9a82-e5f0c038ef20` (Remotion Guide -- web-renderer)

---

## Pós-implementação

### Refinamento Visual (ui-designer)
- **Fase 1:** `src/components/VideoPreview.tsx` (remover estilos antigos, refinar Player container), `src/features/video-render/components/SubtitleOverlay.tsx` (polish de legenda)
- **Fase 2:** `src/features/video-render/components/EditingPlanInspector.tsx` (layout e interação do plano de edição)
- **Fase 3:** `src/features/video-render/components/VideoExportPanel.tsx` (progresso e feedback visual)
- Notebook: `c8b8f7ac-5787-4962-9b7d-a3ccc2e6443b` (MUI V9 Docs)

### Testes (vitest-specialist)
Não aplicável para este escopo -- projeto não tem test runner configurado no momento.

### Testes Firebase (firebase-vitest-specialist)
Não aplicável para este escopo -- nenhuma das 3 fases envolve Cloud Functions. A Fase 3 usa client-side rendering exclusivamente.
