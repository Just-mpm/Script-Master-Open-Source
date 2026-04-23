# Estúdio de Produção — Script Master

> Documentação baseada exclusivamente no código-fonte. Arquivos de origem:
> `src/features/studio/types.ts`, `src/features/studio/useStudioState.ts`,
> `src/pages/StudioPage.tsx`, `src/components/Inspector.tsx`,
> `src/components/ScriptEditor.tsx`, `src/components/ActionBar.tsx`,
> `src/hooks/useAudioGenerator.ts`, `src/App.tsx`

---

## 1. Visão Geral

O Estúdio de Produção é a página principal da aplicação (rota `/estudio`, redirect de `/`). É onde o usuário escreve o roteiro, configura parâmetros de voz e direção de arte, e dispara a geração de áudio TTS com geração opcional de cenas visuais.

A página é carregada via `React.lazy` em `src/App.tsx:21`.

---

## 2. Arquitetura

### Layout

`StudioPage` renderiza um `Grid` MUI com duas colunas:

| Coluna | Grid `size` | Componente | Responsabilidade |
|--------|-------------|------------|------------------|
| Esquerda | `xs:12, lg:4` | `Inspector` | Voz, ritmo, direção de arte, geração de cenas |
| Direita | `xs:12, lg:8` | `ScriptEditor` | Editor de roteiro + botão "Gerar áudio" |

### Estado centralizado

Todo o estado do estúdio é gerenciado pelo hook `useStudioState()` (`src/features/studio/useStudioState.ts:75`). O `App.tsx` chama esse hook uma vez e propaga via `Pick<StudioStateController, ...>` para `StudioPage`, que redistribui para `Inspector` e `ScriptEditor`.

`ActionBar` não é renderizado dentro de `StudioPage` — é colocado diretamente no `App.tsx:278`, fixado na parte inferior (`position: fixed`), e aparece na rota `/estudio` e `/video`.

```
App.tsx
├── useStudioState() → StudioStateController
│   ├── StudioPage (rote /estudio)
│   │   ├── Inspector (parâmetros)
│   │   └── ScriptEditor (roteiro + botão gerar)
│   └── ActionBar (fixado, global — só aparece quando isGenerating || audioUrl)
```

---

## 3. Tipos e Interfaces

> `src/features/studio/types.ts`

### `SceneRatio`

```typescript
type SceneRatio = '16:9' | '9:16' | '1:1';
```

### `StudioScene`

Representa uma cena visual gerada pela IA:

```typescript
interface StudioScene {
  imageUrl: string;
  timestamp: number;
  prompt?: string;
}
```

### `StudioDraftState`

Snapshot completo das preferências do estúdio (usado em `handleApplySettings` e exportações):

```typescript
interface StudioDraftState {
  script: string;
  selectedVoice: string;
  isMultiSpeaker: boolean;
  audioProfile: string;
  scene: string;
  pace: string;
  styleNotes: string;
  generateScenes: boolean;
  sceneRatio: SceneRatio;
  sceneDensity: number;
  visualFramework: string;
  referenceImage: string | null;
}
```

### `StudioSettingsPatch`

Permite atualizar um subconjunto das configurações (parciais, todas opcionais):

```typescript
interface StudioSettingsPatch {
  script?: string;
  isMultiSpeaker?: boolean;
  selectedVoice?: string;
  speakerAName?: string;
  speakerBVoice?: string;
  speakerBName?: string;
  audioProfile?: string;
  scene?: string;
  pace?: string;
  styleNotes?: string;
  generateScenes?: boolean;
  sceneDensity?: number;
  sceneRatio?: SceneRatio;
  visualFramework?: string;
}
```

### `StudioStateController`

Tipo retornado por `useStudioState()` — não é declarado manualmente, é `ReturnType<typeof useStudioState>`. Contém todos os estados, setters e handlers listados na seção 4.

---

## 4. Fluxo de Dados

### 4.1 Estado persistido no localStorage

`useStudioState` inicializa 14 campos a partir do `localStorage` com chaves prefixadas `s2a_`:

| Chave localStorage | Campo | Default |
|---|---|---|
| `s2a_script` | `script` | `''` |
| `s2a_voice` | `selectedVoice` | `VOICES[0].id` |
| `s2a_multi` | `isMultiSpeaker` | `false` |
| `s2a_spaname` | `speakerAName` | `'Voz A'` |
| `s2a_spbname` | `speakerBName` | `'Voz B'` |
| `s2a_spbvoice` | `speakerBVoice` | `VOICES[1].id` |
| `s2a_profile` | `audioProfile` | `''` |
| `s2a_scene` | `scene` | `''` |
| `s2a_pace` | `pace` | `'normal'` |
| `s2a_notes` | `styleNotes` | `''` |
| `s2a_gen_scenes` | `generateScenes` | `false` |
| `s2a_scene_density` | `sceneDensity` | `15` |
| `s2a_scene_ratio` | `sceneRatio` | `'16:9'` |
| `s2a_visual_framework` | `visualFramework` | `'general'` |

A persistência usa `safeSetItem()` (`useStudioState.ts:36`) que silencia erros de quota e `SecurityError` (Safari Private Browsing).

`referenceImage` é **intencionalmente session-only** — data URLs base64 são grandes demais para localStorage e a imagem é regenerável.

### 4.2 Sincronização de preferências

Um `useEffect` (`useStudioState.ts:173`) sincroniza todas as preferências para o localStorage a cada mudança de estado. A memoização com `useMemo<StudioDraftState>` (`useStudioState.ts:142`) gera o snapshot `currentState` para uso externo (p. ex. restauração de projetos).

### 4.3 Geração de áudio

`handleGenerate` (`useStudioState.ts:205`) coleta todos os parâmetros e delega para `useAudioGenerator().generateAudio()`. O objeto enviado inclui:

- `userId` (do `useAuth`)
- `script`, `selectedVoice`, `audioProfile`, `scene`, `pace`, `styleNotes`
- `generateScenes`, `sceneDensity`, `sceneRatio`, `visualFramework`, `referenceImage`
- `isMultiSpeaker`, `speakerAName`, `speakerBVoice`, `speakerBName`

### 4.4 Download e salvamento

- **Download WAV:** `handleDownload` (`useStudioState.ts:263`) cria um `<a>` temporário com `audioUrl` e nome `roteiro-{voiceId}-{timestamp}.wav`
- **Salvar na biblioteca:** `handleSaveToLibrary` (`useStudioState.ts:277`) cria um `SavedAudio` com UUID, metadados e chama `saveGeneration(blob, userId)` — segue o padrão dual storage (Firestore autenticado / IndexedDB anônimo)

### 4.5 Valores derivados para vídeo

`useStudioState` expõe valores calculados para integração com Remotion:

```typescript
videoFps: 30                    // constante
durationInSeconds: number       // do blob WAV
durationInFrames: number        // Math.round(durationInSeconds * 30)
```

---

## 5. Componentes Principais

### 5.1 Inspector

> `src/components/Inspector.tsx`

Painel lateral com duas seções colapsáveis:

**Seção "Voz do locutor":**
- Toggle modo podcast (`isMultiSpeaker`) — quando ativo, mostra abas Voz A / Voz B
- Grid de 30 vozes com preview de áudio (via `useVoicePreviews`)
- Campos de nome dos speakers (usados como marcadores no roteiro)
- Todas as 30 vozes vêm de `VOICES` em `src/lib/constants.ts`

**Seção "Direção de arte":**
- Personagem (`audioProfile`) — texto livre
- Ambiente (`scene`) — texto livre, multiline
- Ritmo (`pace`) — Select com 5 opções: `very_slow`, `slow`, `normal`, `fast`, `very_fast`
- Sotaque (`styleNotes`) — texto livre
- Gerar cenas visuais (`generateScenes`) — toggle que revela sub-opções:
  - Identidade visual (`visualFramework`): `general` | `whiteboard`
  - Formato (`sceneRatio`): `16:9` | `9:16` | `1:1`
  - Frequência (`sceneDensity`): `15` | `30` | `60` | `120` (segundos entre cenas)
  - Imagem de referência (`referenceImage`): upload de arquivo, session-only

Props vêm via `Pick<StudioStateController, ...>` do `StudioPage`.

### 5.2 ScriptEditor

> `src/components/ScriptEditor.tsx`

- `TextField` multiline com fonte serifada (Georgia), sem spellcheck
- Contador de caracteres: `script.length / MAX_CHARS` (50.000), ficando vermelho ao ultrapassar
- Highlight de cena visual: quando `currentTime` corresponde a uma cena, a imagem aparece como background com opacidade 0.36 e gradiente overlay
- Resolução da cena ativa via `resolveActiveScene()` de `src/lib/scene`
- Atalho `Ctrl+Enter` / `Cmd+Enter` para gerar áudio
- Botão "Limpar" (quando há texto e não está gerando)
- Botão "Gerar áudio" com ícone `Mic`, desabilitado quando `isGenerateDisabled`

### 5.3 ActionBar

> `src/components/ActionBar.tsx`

Barra fixa na parte inferior (z-index 1400, glassmorphism) com dois estados:

**Durante geração TTS:**
- Spinner circular + texto de status + porcentagem
- Barra de progresso linear
- Botão "Cancelar"

**Durante geração de cenas visuais (fase de imagem):**
- Barra de progresso separada com texto "Gerando cenas visuais..."
- Botão cancelar

**Após geração completa (player):**
- Play/Pause + seek bar + timestamps
- Player unificado: Remotion Player na rota `/video`, AudioContext na rota `/estudio`
- Botão salvar na biblioteca (bookmark)
- Menu de download: áudio WAV + imagens individuais + download em lote

Na rota `/video`, também mostra botão de exportar vídeo MP4 e conecta ao `VideoPreviewHandle` do Remotion Player via polling (100ms).

---

## 6. Integração com TTS e Geração de Imagens

O estúdio delega toda a lógica de geração para `useAudioGenerator` (`src/hooks/useAudioGenerator.ts`). O fluxo é:

1. **Usuário configura parâmetros** no Inspector e escreve roteiro no ScriptEditor
2. **`handleGenerate`** coleta `currentState` e chama `generateAudio(params)`
3. **`useAudioGenerator`** executa o pipeline TTS (chunking + chamadas ao Gemini `gemini-3.1-flash-tts-preview`)
4. **Se `generateScenes` está ativo**, após o TTS o pipeline gera prompts de cena via `generateScenePrompts` e imagens via `gemini-3.1-flash-image-preview`
5. **Resultado:** `audioUrl`, `audioBlob`, `scenes: StudioScene[]`, `audioSegments`

Para detalhes completos do pipeline, consulte `docs/guides/audio.md` e `docs/guides/image-generation.md`.

---

## 7. Persistência

### Preferências (localStorage)

As 14 preferências listadas na seção 4.1 são persistidas automaticamente via `useEffect`. O padrão `s2a_*` é usado como namespace.

### Projetos salvos (dual storage)

Quando o usuário clica em salvar, `saveGeneration()` (`src/lib/db/generations.ts`) persiste via dual storage:
- **Autenticado:** Firestore (coleção `generations`)
- **Anônimo:** IndexedDB (store `generations`)

O `SavedAudio` salvo contém: `id`, `name`, `createdAt`, `audioBlob`, `script`, `voice`, `scenes`.

Para detalhes completos do dual storage, consulte `docs/guides/persistence.md`.

---

## 8. Referência Rápida de Arquivos

| Arquivo | Categoria | Responsabilidade |
|---------|-----------|------------------|
| `src/features/studio/types.ts` | Tipos | `SceneRatio`, `StudioScene`, `StudioDraftState`, `StudioSettingsPatch`, `InspectorController`, `ScriptEditorController` |
| `src/features/studio/useStudioState.ts` | Hook | Estado centralizado, persistência localStorage, handlers de geração/download/save |
| `src/pages/StudioPage.tsx` | Página | Layout Grid (Inspector + ScriptEditor), rota `/estudio` |
| `src/components/Inspector.tsx` | Componente | Painel de parâmetros: voz, ritmo, direção de arte, cenas visuais |
| `src/components/ScriptEditor.tsx` | Componente | Editor de roteiro, highlight de cena, botão gerar |
| `src/components/ActionBar.tsx` | Componente | Barra fixa com player, progresso, download e salvar |
| `src/hooks/useAudioGenerator.ts` | Hook | Pipeline TTS + geração de cenas (consumido pelo estúdio) |
| `src/lib/constants.ts` | Constantes | `VOICES`, `MAX_CHARS`, `CHUNK_LIMIT`, `PACE_INSTRUCTIONS` |
| `src/lib/scene.ts` | Util | `resolveActiveScene(scenes, currentTime)` |
| `src/contexts/AudioContext.tsx` | Context | Player global de áudio (play/pause/seek/time) |
