# Plano: Refatoração de `useStudioState` para Zustand (Opção C2 — Híbrida)

## Contexto

O hook `useStudioState()` (`src/features/studio/useStudioState.ts`, 364 linhas) orquestra ~20 `useState` de configuração + o hook `useAudioGenerator()` (11 useState + lógica async complexa). Retorna um objeto literal com 40+ propriedades que é consumido apenas em `App.tsx:143`.

O `App.tsx` usa esse objeto como dependência de `useMemo([studio])` nas rotas (linhas 206-269), causando recriação completa da árvore de `<Routes>` a qualquer mudança de estado — incluindo mudanças irrelevantes para a maioria dos componentes.

**Evidências coletadas:**
- `useStudioState` é importado em **1 arquivo** (`App.tsx`)
- `StudioStateController` é tipado em **2 arquivos** (`StudioPage.tsx`, `VideoPage.tsx`)
- O projeto já tem **2 stores Zustand** (`videoRenderBridge`, `animationStore`) — ambas flat, sem middleware
- `immer` **não está instalado** — as stores existentes usam `set((s) => ({ ...s, ... }))`
- `useShallow` está disponível em `zustand/react/shallow`
- `useAudioGenerator` tem 2 refs (`cancelRef`, `lastSuccessfulStateRef`) e 1 useEffect de cleanup de blob URL — não é idiomático mover para Zustand

### Estimativa de ganho

| Ação do usuário | Antes (re-renders) | Depois (re-renders) |
|---|---|---|
| Digitar no roteiro | App + Routes + StudioPage + Inspector + VideoPage (5) | ScriptEditor apenas (1) |
| Trocar voz no Inspector | App + Routes + ScriptEditor + VideoPage (4) | Inspector apenas (1) |
| Progresso de geração | App + Routes + Inspector + ScriptEditor + VideoPage (5) | App (ActionBar/toasts) (1) |
| Trocar pace/styleNotes | App + Routes + StudioPage + Inspector + VideoPage (5) | Inspector apenas (1) |

O ganho principal vem da **eliminação do `useMemo([studio])` nas rotas** (linhas 206-269 do App.tsx) — hoje qualquer mudança em qualquer um dos ~30 estados recria a árvore inteira de `<Routes>`.

## Decisões Pendentes

_(Nenhuma — modo interativo, todas resolvidas)_

## Decisões Tomadas

### 1. Escopo do Store — Opção C2 (Híbrida)
- **Escolha:** Store gerencia apenas os 14 `useState` de configuração persistida + `referenceImage` (session-only) + ação `applySettings`. Total: 15 campos de estado + 14 setters + 1 ação.
- **Justificativa:** O gargalo real são mudanças de config (digitar no roteiro = re-render do App inteiro). `useAudioGenerator` durante geração re-renderiza por progresso — é esperado e legítimo. Reduz risco pela metade mantendo ~90% do ganho.

### 2. `useAudioGenerator` — manter como hook com `useCallback`
- **Escolha:** Manter como hook React. Envolver `generateAudio` e `loadProjectData` em `useCallback` (estabilizar referências). Permanece chamado no App.tsx.
- **Justificativa:** Refs (`cancelRef`, `lastSuccessfulStateRef`), useEffect de cleanup de blob URL e lógica async complexa não são idiomáticos no Zustand. O hook já funciona — apenas precisa de estabilização.

### 3. Padrão do Store — flat, sem middleware
- **Escolha:** Seguir padrão de `videoRenderBridge.ts` e `animationStore.ts`: `create<T>()((set) => ({...}))`, `INITIAL_STATE` como constante, ações inline.
- **Justificativa:** Consistência com o projeto. Sem `immer` (não instalado). Sem `persist` middleware (localStorage customizado com `safeSetItem` é mais resiliente que o persist oficial).

### 4. Desacoplamento de Contextos React
- **Escolha:** `userId` e `play()` não entram no store. Actions que dependem de contextos (`handleGenerate`, `handleSaveToLibrary`, `handleDownload`) permanecem como `useCallback` no componente consumidor (App.tsx), lendo config do store via `useStudioStore.getState()` no momento da execução (não no momento do render).
- **Justificativa:** Zustand não pode chamar hooks React. `handleGenerate` precisa de `userId` (do AuthContext) + 14 campos de config (do store). Usar `getState()` dentro do callback elimina a necessidade de deps reativas nos 14 campos.
- **Estratégia para `handleGenerate`:** `useCallback` com deps apenas em `generateAudio` (do hook) e `userId` (do auth). Os 14 campos de config são lidos via `useStudioStore.getState()` no momento da execução — sem re-renders por mudança de config.

### 5. `successMsg` e `isSaved` — manter no App.tsx
- **Escolha:** `successMsg` e `isSaved` permanecem como `useState` no App.tsx (onde são exclusivamente consumidos para toasts e ActionBar).
- **Justificativa:** São UI state transitório, não config. Mudam poucas vezes (após salvar na biblioteca). Mover para o store adiciona complexidade sem ganho de performance — o App.tsx já re-renderiza por `error`, `generationProgress` e `isGenerating` (do hook).

### 6. Remoção do `useMemo([studio])` nas rotas
- **Escolha:** As rotas no App.tsx não dependem mais de `studio`. O `useMemo` das `<Routes>` recebe `[]` (deps estáticas — imports lazy e refs não mudam entre renders).
- **Justificativa:** É o maior ganho de performance — elimina recriação da árvore de rotas por mudanças de config.

### 7. Componentes consumidores — acesso direto ao store
- **Escolha:** `StudioPage`, `VideoPage`, `AssistantPage`, `Inspector`, `ScriptEditor` passam a consumir `useStudioStore` diretamente com seletores. Fim do prop drilling de 40+ props.
- **Justificativa:** Cada componente assina apenas os slices que precisa. `React.memo` no Inspector torna-se dispensável com seletores granulares.

## Reutilização e Padrões

- **Reutilizar:** `src/features/video-render/store/videoRenderBridge.ts` (padrão de estrutura: interface + INITIAL_STATE + create + ações inline)
- **Reutilizar:** `src/features/speed-paint/store/animationStore.ts` (padrão de partial update: `set((state) => ({ job: { ...state.job, ...update } }))`)
- **Reutilizar:** `src/features/studio/types.ts` — `SceneRatio`, `StudioDraftState`, `StudioSettingsPatch` (import direto)
- **Reutilizar:** Helpers de localStorage — `safeSetItem`, `getStoredValue`, `getStoredBoolean`, `getStoredNumber`, `isSceneRatio`, `getStoredSceneRatio` (mover de `useStudioState.ts` para `studio.utils.ts`)
- **Reutilizar:** `STORAGE_KEYS`, `SCENE_RATIOS`, `VIDEO_FPS` (mover junto com as helpers)
- **Padrão de consumo:** `useVideoRenderBridge((s) => s.isExportingVideo)` — seletor primitivo (ActionBar.tsx:82-83)
- **Padrão de consumo:** `useVideoRenderBridge.getState().resetBridge()` — acesso fora de React (VideoPage.tsx:161)
- **Código novo:** `src/features/studio/store/studioStore.ts` (store principal), `src/features/studio/store/studio.utils.ts` (helpers de localStorage exportados)

## Arquivos a Modificar

### Novos
- `src/features/studio/store/studioStore.ts` — Store Zustand com estado de config + ação `applySettings`
- `src/features/studio/store/studio.utils.ts` — Helpers de localStorage exportados (STORAGE_KEYS, safeSetItem, etc.)
- `src/features/studio/store/index.ts` — Barrel export
- `tests/studio/studioStore.unit.test.ts` — Testes do store (get/set/subscribe/seletores/applySettings)
- `tests/studio/studio.utils.unit.test.ts` — Testes das helpers de localStorage (migrados do teste atual)

### Modificados
- `src/features/studio/useStudioState.ts` — **REESCRITO** como thin adapter (compatibilidade durante migração) → **REMOVIDO** na fase final
- `src/hooks/useAudioGenerator.ts` — `useCallback` em `generateAudio` e `loadProjectData`
- `src/App.tsx` — Remove `useStudioState()`, consome store + hook seletivamente, remove `useMemo([studio])`, mantém `handleGenerate`/`handleSaveToLibrary`/`handleDownload` como `useCallback`
- `src/pages/StudioPage.tsx` — Remove `StudioPageProps`, consome `useStudioStore` diretamente
- `src/pages/VideoPage.tsx` — Remove `VideoPageProps` (campos do studio), consome store + hook diretamente
- `src/pages/AssistantPage.tsx` — Remove props de studio, consome `useStudioStore` diretamente
- `src/components/Inspector.tsx` — Remove `InspectorProps`, consome `useStudioStore(useShallow(...))`
- `src/components/ScriptEditor.tsx` — Remove `ScriptEditorProps`, consome `useStudioStore` diretamente
- `src/components/ActionBar.tsx` — Continua recebendo props explícitas do App (sem mudança)
- `src/features/studio/types.ts` — Remove `StudioStateController` (substituído por tipo do store) e `ScriptEditorController` (0 referências)

### Removidos
- `src/features/studio/useStudioState.ts` — Após migração completa de todos consumidores
- `tests/studio/useStudioState.unit.test.ts` — Substituído por `studioStore.unit.test.ts` + `studio.utils.unit.test.ts`

### Dependências (leitura apenas)
- `src/lib/constants.ts` — `MAX_CHARS` e `VOICES` usados nos valores iniciais do store
- `src/features/assistant/types.ts` — `AssistantStudioState = StudioDraftState` (alias — não muda)

## Passos de Implementação

### Passo 1: Extrair helpers de localStorage
**Arquivos:** `src/features/studio/store/studio.utils.ts` (novo)
**Resultado:** Módulo com `STORAGE_KEYS`, `SCENE_RATIOS`, `VIDEO_FPS`, `safeSetItem`, `getStoredValue`, `getStoredBoolean`, `getStoredNumber`, `isSceneRatio`, `getStoredSceneRatio` — todos exportados.
**Detalhes:** Copiar de `useStudioState.ts:13-67` e exportar. Funções puras sem dependência React. Adicionar `import { VOICES } from '../../../lib/constants'` para fallback de voz.
Sugestão: `builder-worker`

### Passo 2: Criar o store Zustand
**Arquivos:** `src/features/studio/store/studioStore.ts` (novo), `src/features/studio/store/index.ts` (novo)
**Dependências de leitura:** `src/lib/constants.ts` (`MAX_CHARS`), `src/features/studio/types.ts` (`SceneRatio`, `StudioDraftState`, `StudioSettingsPatch`), `studio.utils.ts` (helpers de localStorage)
**Resultado:** Store com 15 campos de estado + 14 setters + ação `applySettings`. Subscribe para sync automático com localStorage.
**Estado do store (15 campos):**
```
script, isMultiSpeaker, speakerAName, selectedVoice, speakerBName, speakerBVoice,
audioProfile, scene, styleNotes, pace, generateScenes, sceneDensity, sceneRatio,
visualFramework, referenceImage
```
**Ações:**
- `setScript`, `setIsMultiSpeaker`, ... (14 setters — delegam para `set`)
- `applySettings(patch: StudioSettingsPatch)` — aplica patch parcial (substitui `handleApplySettings`): para cada campo do patch, chama `set` apenas se o valor for diferente
- `getCurrentState()` — deriva `StudioDraftState` do state atual via `get()` (substitui o `currentState` useMemo): `store.getState()` retorna `{ script, selectedVoice, isMultiSpeaker, ... }`
- `reset()` — restaura `INITIAL_STATE`
**localStorage sync:** `store.subscribe()` com `onRehydrateStorage` que chama `safeSetItem` apenas para os campos que mudaram (comparação por key no listener). O listener **nunca** chama `set()` — apenas persiste. Isso evita loops.
**Valores derivados (seletores no componente consumidor):**
- `isGenerateDisabled`: `isGenerating` (do hook) || `!script.trim()` (do store) || `script.length > MAX_CHARS` — calculado no App.tsx
- `currentState`: `useStudioStore(getCurrentState)` — custom hook de 1 linha
**Note:** `handleDownload` e `handleSaveToLibrary` NÃO entram no store. Permanecem como `useCallback` no App.tsx (dependem de `audioUrl`/`audioBlob` do hook e `user` do auth).
Sugestão: `builder-worker` | Notebook: `c7233d41` (Zustand Guide)

### Passo 3: Estabilizar `useAudioGenerator`
**Arquivos:** `src/hooks/useAudioGenerator.ts`
**Dependências de leitura:** `src/lib/constants.ts` (`CHUNK_LIMIT`, `MAX_CHARS`, `PACE_INSTRUCTIONS`)
**Resultado:** `generateAudio` e `loadProjectData` envolvidos em `useCallback` com deps corretas. Referências estáveis.
**Detalhes:**
- `generateAudio`: deps em `[]` (usa apenas refs internas `cancelRef`, `lastSuccessfulStateRef` e setters `setState` — todos estáveis). A instância `ai` do GoogleGenAI já é `useMemo`.
- `loadProjectData`: deps em `[audioUrl]` — lê `audioUrl` do state. Quando `audioUrl` muda, o callback é recriado (correto — precisa do valor atual para revogar blob URL antigo).
Sugestão: `fix-worker`

### Passo 4: Criar adapter `useStudioState` (compatibilidade)
**Arquivos:** `src/features/studio/useStudioState.ts` (reescrever)
**Dependências:** `studioStore.ts` (Passo 2), `useAudioGenerator.ts` (Passo 3)
**Resultado:** Thin adapter que chama `useStudioStore` + `useAudioGenerator` + `useAuth` e retorna o mesmo objeto de antes (forma 100% compatível com `StudioStateController`). Permite migração incremental dos consumidores.
**Detalhes:** O adapter continua sendo chamado em `App.tsx`. Todos os consumidores continuam funcionando. Mas internamente, o state de config vem do store (não de 20 useState locais). `handleGenerate`, `handleSaveToLibrary` e `handleDownload` são criados como `useCallback` dentro do adapter, lendo config via `useStudioStore.getState()`.
Sugestão: `builder-worker`

### Passo 5: Atualizar App.tsx — remover `useMemo([studio])`
**Arquivos:** `src/App.tsx`
**Dependências:** Adapter (Passo 4) ou store direto (se Passo 4 foi concluído e consumidores já migraram)
**Resultado:** Remove dependência em `studio` das rotas. Rotas tornam-se estáticas (deps `[]`). Mantém `handleGenerate`, `handleSaveToLibrary`, `handleDownload` como `useCallback` locais, lendo config do store via `getState()`.
**Mudanças específicas:**
- `const studio = useStudioState()` → (remover após migrar consumidores, ou manter adapter temporariamente)
- `useMemo([studio])` → `useMemo([], [])` — rotas são estáticas, imports lazy e refs não mudam
- `<StudioPage {...studio} />` → `<StudioPage />` — StudioPage consome store diretamente
- `<VideoPage {...studio} videoPlayerRef={videoPlayerRef} />` → `<VideoPage videoPlayerRef={videoPlayerRef} />`
- `<AssistantPage currentState={studio.currentState} onApplySettings={studio.handleApplySettings} />` → `<AssistantPage />`
- Destructuring de 18 campos do `studio` para ActionBar/toasts/shortcuts → `useStudioStore(seletor)` para campos de config + estado do hook para `isGenerating`, `error`, etc.
- `handleGenerate`: `useCallback` com deps `[generateAudio, userId]`. Corpo usa `useStudioStore.getState()` para ler os 14 campos de config no momento da execução.
- `handleSaveToLibrary`: `useCallback` com deps `[audioBlob, isSaved, scenes, script, selectedVoice, speakerBVoice, user]`. `setError` e `saveGeneration` são imports estáveis.
- `handleDownload`: `useCallback` com deps `[audioUrl, selectedVoice]`. `selectedVoice` vem do store via `useStudioStore(s => s.selectedVoice)`.
- `successMsg` e `isSaved`: permanecem como `useState` no App.tsx (UI state transitório)
**Ordem dentro deste passo:** (1) Criar adapter (se não existir ainda) → (2) Modificar App.tsx para usar store seletivamente + manter callbacks locais → (3) Remover `useMemo([studio])`
Sugestão: `builder-worker`

### Passo 6: Migrar StudioPage para consumo direto do store
**Arquivos:** `src/pages/StudioPage.tsx`, `src/components/Inspector.tsx`, `src/components/ScriptEditor.tsx`
**Resultado:** Remove `StudioPageProps` (Pick<StudioStateController,...>). StudioPage, Inspector e ScriptEditor chamam `useStudioStore` diretamente.
**Detalhes StudioPage:** `useStudioStore(useShallow(...))` para os 26 campos (valor + setter). O spread `...inspectorProps` para Inspector é eliminado — Inspector consome store próprio. `isGenerating`, `handleGenerate`, `isGenerateDisabled`, `scenes` vêm do hook (via App.tsx ou store compartilhado). `currentTime` vem de `useAudioCurrentTime()` (já existe).
**Detalhes Inspector:** Remove `InspectorProps` local e `React.memo`. Usa `useStudioStore(useShallow(...))` com 22 campos (valor + setter). `isGenerating` e `generateScenes` vêm do hook (passado como prop ou via outro mecanismo — decidir na implementação).
**Detalhes ScriptEditor:** Remove `ScriptEditorProps`. Usa `useStudioStore(useShallow(...))` com 5 campos (`script`, `setScript`, `isGenerating`, `handleGenerate`, `isGenerateDisabled`, `scenes`). `currentTime` vem de `useAudioCurrentTime()`.
Sugestão: `builder-worker`

### Passo 7: Migrar VideoPage para consumo direto do store + hook
**Arquivos:** `src/pages/VideoPage.tsx`
**Resultado:** Remove `VideoPageProps`. VideoPage chama `useStudioStore(seletor)` para campos de config + `useAudioGenerator()` para estado de geração.
**Campos do store:** `script`, `setScript`, `sceneRatio`
**Campos do hook:** `audioUrl`, `scenes`, `audioSegments`, `projectId` (currentProjectId), `durationInSeconds`, `loadProjectData`
**Detalhes:** `loadProjectData` vem do hook (permanece lá — depende de refs e state interno). `videoPlayerRef` continua como prop (ref do pai).
Sugestão: `builder-worker`

### Passo 8: Migrar AssistantPage para consumo direto do store
**Arquivos:** `src/pages/AssistantPage.tsx`
**Resultado:** Remove props de studio. Consome `currentState` e `applySettings` via `useStudioStore`.
**Detalhes:** `currentState` via `useStudioStore(getCurrentState)` — custom hook de 1 linha que chama `get()` derivando `StudioDraftState`. `applySettings` via `useStudioStore(s => s.applySettings)`. Apenas 2 seletores.
Sugestão: `builder-worker`

### Passo 9: Remover adapter e limpar
**Arquivos:** `src/features/studio/useStudioState.ts` (remover), `src/features/studio/types.ts` (remover `StudioStateController` e `ScriptEditorController`)
**Resultado:** Código morto eliminado. `StudioStateController` removido (substituído por tipo do store). `ScriptEditorController` (types.ts:43, 0 referências) removido.
Sugestão: `builder-worker`

### Passo 10: Testes
**Arquivos:** `tests/studio/studioStore.unit.test.ts` (novo), `tests/studio/studio.utils.unit.test.ts` (novo), `tests/studio/useStudioState.unit.test.ts` (remover), `tests/components/Inspector.component.test.tsx` (atualizar mock de props para mock do store)
**Resultado:** Testes do store (get/set/subscribe/seletores/applySettings/reset/currentState), testes das helpers de localStorage (migrados do teste atual — funções recriadas são idênticas), testes do Inspector atualizados (mock do store via `vi.mock` ou `zustand` testing utils).
**Nota:** Testes do `useAudioGenerator` (`tests/hooks/useAudioGenerator.unit.test.ts`) podem precisar de ajuste se a assinatura mudar com `useCallback` — verificar na execução.
Sugestão: `vitest-specialist`

## Riscos e Mitigações

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Adapter retorna forma diferente de `StudioStateController` → breaking change | Alto | Passo 4 (adapter) mantém compatibilidade TOTAL. Testes passam antes de qualquer migração de consumidor. |
| `handleGenerate` no App.tsx lê config stale via closure | Médio | Usar `useStudioStore.getState()` no corpo do callback (lê no momento da execução, não do render). Deps apenas em `generateAudio` e `userId`. |
| `loadProjectData` closure over `audioUrl` quebra ao envolver em `useCallback` | Médio | Incluir `audioUrl` nas deps do `useCallback`. O setter é estável, então a ref não vaza. |
| Inspector perde `React.memo` e re-renderiza mais | Baixo | Com seletores granulares no store, o Inspector só re-renderiza quando campos que consome mudam. Na prática, melhor que `React.memo` com spread "sujo". |
| `useShallow` causa re-render por objetos internos | Baixo | `useShallow` faz shallow comparison de top-level. Strings/booleans/numbers são comparados por valor. Funciona para todos os campos do store. |
| localStorage sync via `subscribe` dispara em cascata | Baixo | O listener de `subscribe` só chama `safeSetItem`, nunca `set()`. Sem loop possível. |
| Testes do Inspector quebram ao mudar de props para store | Baixo | Testes usam `defaultProps` literal (independente de `StudioStateController`). Apenas adaptar mock de props para mock do store. |
| `isGenerating` precisa ser acessível em Inspector/ScriptEditor/StudioPage | Médio | `isGenerating` vem do hook `useAudioGenerator`. O App.tsx chama o hook e passa para componentes via props ou os componentes chamam o hook diretamente. Decisão na implementação — preferir que componentes chamem o hook diretamente (padrão já usado em VideoPage). |

## Verificação

- [ ] Validação funcional: digitar no ScriptEditor não re-renderiza Inspector/VideoPage
- [ ] Validação funcional: trocar voz no Inspector não re-renderiza ScriptEditor/VideoPage
- [ ] Validação funcional: geração de áudio funciona (progresso, cancelar, erro, save)
- [ ] Validação funcional: carregar projeto da biblioteca funciona
- [ ] Validação funcional: assistente aplica settings no estúdio
- [ ] Validação funcional: localStorage persiste e restaura as 14 preferências
- [ ] Validação técnica: `bun run lint` — 0 erros, 0 warnings
- [ ] Validação técnica: `bun run typecheck` — 0 erros
- [ ] Validação técnica: `bun run test` — todos os testes passam
- [ ] Validação de regressão principal: App.tsx não re-renderiza por mudança de config em componentes não-relacionados

## Notebooks Relevantes

| Notebook | ID | Uso |
|----------|----|-----|
| Zustand Guide | `c7233d41-4d3e-471e-9e96-5247f6f6208c` | Consultar padrão de slices, `useShallow`, actions, `create<T>()()`, `subscribe` |
| React Guide | `10dd427a-e066-48e5-9001-7c870d390078` | Consultar regras de hooks, referencial equality, `useCallback` com `getState()` |

## Instruções de Execução

Ao executar este plano, siga este protocolo:

### 1. Investigação
- Use analyze tools (`suggest_reads`, `impact_analysis`, `file_context`) nos arquivos listados
- Consulte os Notebooks Relevantes acima para confirmar padrões da tecnologia envolvida
- Identifique padrões, dependências e riscos que o plano não cobriu
- Leia `src/lib/constants.ts` para entender `MAX_CHARS`, `VOICES` (usados nos valores iniciais do store)

### 2. Divisão do Trabalho
- Calcule tokens dos arquivos com `token-counter_token_count` (budget: 40K por agent)
- Agrupe por afinidade — arquivos que se modificam juntos ficam juntos
- Respeite dependências: quem cria tipo usado por outro vai primeiro
- Nunca dois agents do mesmo lote tocam no mesmo arquivo

**Grupos sugeridos:**

| Lote | Grupo | Arquivos | Agent | Ordem |
|------|-------|----------|-------|-------|
| 1 | Infraestrutura do store | `studio.utils.ts` (novo), `studioStore.ts` (novo), `index.ts` (novo) | `builder-worker` | utils → store → barrel |
| 2 | Estabilização do hook | `useAudioGenerator.ts` (useCallback fixes) | `fix-worker` | Paralelo com Lote 1 |
| 3 | Adapter + App.tsx | `useStudioState.ts` (adapter), `App.tsx` (remove useMemo[studio]) | `builder-worker` | **Adapter primeiro, depois App.tsx** |
| 4 | Consumidores (estúdio) | `StudioPage.tsx`, `Inspector.tsx`, `ScriptEditor.tsx` | `builder-worker` | Paralelo com Lote 5 |
| 5 | Consumidores (outros) | `VideoPage.tsx`, `AssistantPage.tsx` | `builder-worker` | Paralelo com Lote 4 |
| 6 | Limpeza + testes | Remover adapter, `types.ts`, testes novos | `builder-worker` + `vitest-specialist` | Após Lotes 4+5 |

**Dependências:** Lote 1 || Lote 2 → Lote 3 → (Lote 4 || Lote 5) → Lote 6

### 3. Escolha de Agents
Para cada grupo, escolha o agent mais adequado ao contexto:
- `builder-worker` — código novo, features, refatorações, componentes
- `fix-worker` — correções, ajustes, fixes
- `vitest-specialist` — testes de lógica (hooks, utils, services sem Firebase)

As sugestões nos passos são pontos de partida — o executor decide com base na investigação.

### 4. Execução em Lotes
- Grupos sem dependência → executar em paralelo (max 2 por lote)
- Grupos com dependência → lotes sequenciais na ordem correta
- Após cada lote, execute lint + type-check do projeto

### 5. Validação Pós-lote
- Execute scripts de lint e type-check (verifique `package.json`): `bun run lint`, `bun run typecheck`
- Corrija sem `eslint-disable`, `@ts-ignore` ou `@ts-expect-error` — corrija a causa raiz
- Repita até 0 erros e 0 warnings
- Execute `bun run test` para confirmar que todos os testes passam
