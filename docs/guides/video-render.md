# Renderização de Vídeo — Script Master

Documentação baseada no código-fonte real do módulo `src/features/video-render/`.

## Stack Remotion

Pacotes utilizados (`package.json`):

| Pacote | Versão | Uso |
|--------|--------|-----|
| `remotion` | `4.0.448` | Core: `AbsoluteFill`, `Sequence`, `Img`, `interpolate`, `spring`, `useCurrentFrame`, `useVideoConfig` |
| `@remotion/player` | `4.0.448` | Player de preview no browser |
| `@remotion/media` | `4.0.448` | Componente `<Audio>` para sincronização de áudio |
| `@remotion/media-utils` | `4.0.448` | `useAudioData`, `visualizeAudioWaveform`, `createSmoothSvgPath` |
| `@remotion/transitions` | `4.0.448` | Dependência instalada (não referenciada diretamente no código — crossfade é feito via overlap de `Sequence`) |
| `@remotion/web-renderer` | `4.0.448` | `renderMediaOnWeb`, `canRenderMediaOnWeb` para exportação client-side |
| `@remotion/whisper-web` | `4.0.448` | Transcrição automática via Whisper WASM |
| `@remotion/captions` | `4.0.448` | Pós-processamento de captions Whisper (TikTok style) |

**Renderização:** client-side via WebCodecs (H.264 + AAC em MP4, ou VP8 + Opus em WebM como fallback). Não há backend de renderização.

## Arquitetura do Módulo

```
src/features/video-render/
  index.ts                          # Barrel — re-exporta tudo
  types.ts                          # VideoScene, VideoCompositionProps, VideoRenderConfig, CaptionWord, CaptionSource, TranscriptionResult, SubtitleMode
  lib/
    videoUtils.ts                   # Conversão de tempo, resolução, mapeamento de cenas
    subtitleUtils.tsx               # Tipos (TextSegment, WordEntry, WordState), constantes, AnimatedWord, helpers de parse, timing por sílabas, segmentScriptByCenes, alignScriptToSegments
    canvasFontStretchPatch.ts       # Patch para corrigir bug de fontStretch percentual na Canvas API
  store/
    videoRenderBridge.ts            # Zustand store — sincroniza exportação e transcrição entre VideoPage e App.tsx
  hooks/
    useVideoExporter.tsx            # Exportação de vídeo via renderMediaOnWeb (3 etapas de fallback de codec)
    useTranscription.ts             # Transcrição com 3 fontes (segment-timing, whisper-aligned, proportional) + staleness detection
  components/
    VideoComposition.tsx            # Composition principal Remotion (fade padrão em todas as cenas)
    VideoExportPanel.tsx            # Painel de exportação (MUI)
    SceneSequence.tsx               # Cena individual com fade in/out padrão (spring-based)
    SubtitleOverlay.tsx             # Orchestrator de legendas — agrupa em frases, delega para ScrollingPhrase
    ScrollingPhrase.tsx             # Frase individual com karaoke interno via AnimatedWord
    WaveformOverlay.tsx             # Waveform de áudio SVG sincronizado
    TranscriptionPanel.tsx          # Painel MUI para transcrição de legendas (3 fontes + staleness)
    CaptionEditorPanel.tsx          # Editor de legendas com split/merge de frases (520 linhas)
```

## Tipos TypeScript

### Tipos Core (`types.ts`)

```typescript
interface VideoScene extends StudioScene {
  durationInFrames: number;
  subtitle?: string;
}

interface VideoCompositionProps {
  scenes: VideoScene[];
  audioUrl: string;
  fps: number;
  captions?: CaptionWord[];
}

interface VideoRenderConfig {
  width: number;
  height: number;
  fps: number;
  codec: 'h264' | 'h265' | 'vp8' | 'vp9';
}

interface CaptionWord {
  text: string;
  startFrame: number;
  endFrame: number;
  bold: boolean;
}

/** Fonte dos dados de temporização das legendas */
type CaptionSource =
  | 'whisper'              // Legado: timing Whisper puro (antigo valor)
  | 'whisper-aligned'      // Timing Whisper refinado + texto do roteiro
  | 'segment-timing'       // Timing real do chunk TTS + texto do roteiro
  | 'proportional'         // Timing proporcional (fallback quando não há segmentos)
  | 'manual';              // Editado manualmente pelo usuário

interface TranscriptionResult {
  words: CaptionWord[];
  source: CaptionSource;
  /** Hash SHA-256 do roteiro usado para gerar as legendas (staleness detection) */
  scriptHash?: string;
}

type SubtitleMode = 'scroll-phrases' | 'word-karaoke';
```

### Tipos do subtitleUtils (`lib/subtitleUtils.tsx`)

```typescript
/** Segmento de texto com informação de formatação (negrito markdown) */
interface TextSegment {
  text: string;
  bold: boolean;
}

/** Palavra individual com timing e formatação para animação */
interface WordEntry {
  text: string;
  bold: boolean;
  startFrame: number;
  endFrame: number;
}

/** Estado visual de uma palavra na animação de legenda */
type WordState = 'active' | 'past' | 'future';
```

### Tipos do Exportador (`hooks/useVideoExporter.tsx`)

```typescript
interface VideoExportOptions {
  scenes: StudioScene[];
  audioUrl: string;
  fps: number;
  durationInFrames: number;
  ratio: SceneRatio;
  captions?: CaptionWord[];
  projectId?: string;
  userId?: string;
}

interface VideoExporterState {
  isRendering: boolean;
  renderProgress: number;
  renderStatusText: string;
  outputBlob: Blob | null;
  outputUrl: string | null;
  error: string | null;
  canRender: boolean | null;
  saveWarning: string | null;
  resolvedVideoCodec: string;
  resolvedContainer: string;
}

/** Tipo do retorno do hook useVideoExporter — útil para passar via props */
type VideoExporter = ReturnType<typeof useVideoExporter>;
```

## Composição de Vídeo (VideoComposition)

`VideoComposition` é a composition principal Remotion. Recebe `VideoCompositionProps` como inputProps.

### Estrutura de renderização

```
AbsoluteFill (bg: #000)
  <Audio src={audioUrl} />           // Clock master — sincroniza tudo
  {scenes.map((scene, index) =>
    <Sequence from={adjustedFrom} durationInFrames={adjustedDuration}>
      <SceneSequence ... />          // Imagem com fade in/out padrão
      <SubtitleOverlay ... />        // Legenda com scroll de frases (se houver)
      <WaveformOverlay ... />        // Waveform SVG (se houver áudio)
    </Sequence>
  )}
```

### Crossfade entre cenas

Cenas vizinhas fazem overlap fixo para criar crossfade real. O overlap é calculado a partir de `FADE_DURATION_MS = 400` (convertido para frames via `msToFrames`):

```typescript
const overlapFrames = msToFrames(FADE_DURATION_MS, fps);
const adjustedFrom = Math.max(0, startFrame - overlapFrames);
const adjustedDuration = scene.durationInFrames + overlapFrames;
```

Todas as cenas usam o mesmo fade (`FADE_FRAMES = 12` frames). A última cena não aplica fade-out (permanece visível até o final).

## SceneSequence

Renderiza uma cena individual com imagem fullscreen (`<Img>` do Remotion, que aguarda carregamento). Todas as cenas usam fade in/out padrão — sem transições variadas, câmera ou efeitos visuais.

### Props

```typescript
interface SceneSequenceProps {
  imageUrl: string;
  durationInFrames: number;
  fadeFrames?: number;      // default: 12
  isLastScene?: boolean;    // remove fade-out
}
```

### Spring config

```typescript
const SPRING_TRANSICAO = { damping: 26, stiffness: 100, mass: 1 };
```

Superamortecido (damping > stiffness) — sem oscilação, sem overshoot. A curva natural de spring dá aceleração suave na entrada e desaceleração na saída.

### Fade in/out

- **Fade in:** `springFadeIn(frame, fps, fadeFrames)` — progresso 0→1 com spring ao longo de `fadeFrames`.
- **Fade out:** `springFadeOut(frame, fps, fadeStartFrame, fadeFrames)` — inverte o spring (1→0) começando em `fadeStartFrame`.
- **Opacidade final:** `Math.min(fadeIn, fadeOut)` — cria curva de entrada-platô-saída.
- **Última cena:** não aplica fade-out (permanece visível até o final).
- **Cenas curtas (< 3 frames):** `safeFadeFrames = min(max(1, fadeFrames), maxAllowed)` previne range inválido no inputRange. O `maxAllowed` é `floor((duration-1)/2)` quando `durationInFrames >= 3`, senão `0`.

## SubtitleOverlay (Orchestrator de legendas)

SubtitleOverlay é o componente principal de legendas. Não faz karaoke diretamente — age como **orchestrator** que agrupa palavras em frases e delega a renderização para `ScrollingPhrase`.

### Modos de entrada

Recebe dados de duas formas (prioridade na ordem):

1. **`captions?: CaptionWord[]`** — legendas com timestamps reais (Whisper ou fallback proporcional)
2. **`text?: string`** — texto simples (backward compat, convertido internamente para `CaptionWord[]` via `splitIntoWords` + `calculateWordTiming`)

### Pipeline de processamento

1. **Construção de palavras** — se `captions` está presente, usa diretamente; se `text`, faz parse markdown + split + timing proporcional
2. **Agrupamento em frases** — `groupCaptionWordsIntoPhrases()` divide `CaptionWord[]` em frases (~12 palavras ou pontuação final `.!?`)
3. **Busca de frase ativa** — identifica qual frase contém o frame atual via `startFrame`/`endFrame`
4. **Renderização otimizada** — renderiza apenas frase ativa + próxima frase (evita DOM desnecessário)
5. **Delegação** — cada frase é passada para `ScrollingPhrase` com `words`, `phraseIndex` e `totalPhrases`

### Props

```typescript
interface SubtitleOverlayProps {
  captions?: CaptionWord[];
  text?: string;
  durationInFrames: number;
  position?: 'bottom' | 'center' | 'top';  // default: bottom
}
```

### Fade global

A legenda inteira aplica fade de entrada/saída usando `interpolate`. O fade usa `safeFade = min(SUBTITLE_FADE, floor(durationInFrames / 3))` para evitar que o fade ultrapasse a duração da cena.

## ScrollingPhrase (Frase com karaoke interno)

Renderiza **UMA frase** de legenda com karaoke palavra-a-palavra. Cada frase é renderizada por uma instância separada de `ScrollingPhrase`, criada por `SubtitleOverlay`.

### Props

```typescript
interface ScrollingPhraseProps {
  words: CaptionWord[];
  phraseIndex: number;
  totalPhrases: number;
}
```

### Animação de entrada/saída

| Propriedade | Entrada | Saída (exceto última frase) |
|-------------|---------|---------------------------|
| **Fade** | 0→1 ao longo de `SUBTITLE_FADE` (8 frames) | 1→0 ao longo de `SUBTITLE_FADE` |
| **translateY** | 8px→0px | — |
| **Última frase** | — | Permanece visível (fade out desativado) |

### Detecção de palavra ativa

Por frame, `ScrollingPhrase` encontra o índice da palavra ativa (`frame >= startFrame && frame < endFrame`) e mapeia cada palavra para `WordState`:

- `i === activeIndex` → `'active'`
- `activeIndex !== -1 && i < activeIndex` → `'past'`
- Caso contrário → `'future'`

Cada palavra é renderizada por `AnimatedWord` (em `subtitleUtils.tsx`).

### Estilo

- Font-size: `clamp(18px, 3.5vw, 36px)`
- Fundo: `BLACK_50` (rgba preto 50%)
- Sombra: `0 0 40px 20px ${BLACK_40}` (token `BLACK_40`)
- borderRadius: `12px`, padding: `12px 24px`
- Posição: controlada pelo `SubtitleOverlay` pai

## AnimatedWord (Palavra animada individual)

Componente em `subtitleUtils.tsx` que renderiza uma única palavra com animação baseada no seu `WordState`.

### Spring config

```typescript
{ damping: 12, stiffness: 200, mass: 0.8 }
```

Diferente do `SPRING_TRANSICAO` da cena (`{ damping: 26, stiffness: 100, mass: 1 }`) — aqui o spring é mais responsivo (maior stiffness), gerando o "pop" do karaoke.

### Estados visuais

| Estado | Escala | Opacidade | fontWeight | Cor | Extra |
|--------|--------|-----------|------------|-----|-------|
| `active` | spring 1.0→1.15 | 0.6→1.0 (acompanha spring) | bold? 800 : 700 | WHITE | `textShadow: 0 0 12px ${BLACK_82}, 0 2px 4px ${BLACK_64}` |
| `past` | 1.0 | 1.0→0.5 (fade em `WORD_TRANSITION_FRAMES` = 6) | bold? 700 : 600 | WHITE_92 | — |
| `future` | 1.0 | 0→0.25 (fade em `WORD_TRANSITION_FRAMES` = 6) | bold? 600 : 500 | WHITE_92 | — |

## Constantes de animação (subtitleUtils.tsx)

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `SUBTITLE_FADE` | `8` | Frames de fade in/out da legenda inteira |
| `ACTIVE_WORD_SCALE` | `1.15` | Escala máxima da palavra ativa (pop-in) |
| `PAST_WORD_OPACITY` | `0.5` | Opacidade das palavras já faladas |
| `FUTURE_WORD_OPACITY` | `0.25` | Opacidade das palavras ainda não faladas |
| `WORD_TRANSITION_FRAMES` | `6` | Frames para transição suave entre estados de palavra |

## WaveformOverlay

Visualização SVG de waveform sincronizada com o frame atual.

### Dependências Remotion

- `useAudioData(url)` — carrega e cacheia dados do áudio
- `visualizeAudioWaveform({ audioData, frame, fps, windowInSeconds, numberOfSamples, normalize })` — extrai amplitudes
- `createSmoothSvgPath({ points })` — gera curvas SVG suaves

### Constantes

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `SVG_WIDTH` | 2000 | Largura lógica do viewBox |
| `SVG_HEIGHT` | 120 | Altura lógica do viewBox |
| `SVG_PADDING_Y` | 10 | Margem vertical dentro do viewBox |
| `WAVEFORM_HEIGHT` | 100 | Altura útil (`SVG_HEIGHT - SVG_PADDING_Y * 2`) |
| `NUMBER_OF_SAMPLES` | 120 | Amostras por frame |
| `WINDOW_IN_SECONDS` | 0.4 | Janela de tempo ao redor do frame |
| `PROGRESS_LINE_WIDTH` | 3 | Largura do indicador de progresso (px SVG) |
| `PROGRESS_LINE_OPACITY` | 0.9 | Opacidade do indicador de progresso |
| Opacidade padrão | 0.3 | Overlay semi-transparente |
| Fade do overlay | `Math.min(10, Math.floor(sceneDurationFrames / 4))` frames | Fade de entrada/saída do overlay (dinâmico, máximo 10) |

### Elementos SVG

- Linha base (zero amplitude) — `WHITE_14`
- Path do waveform — gradiente vertical (brilho na base) + mask de fade nas bordas
- Barra de progresso de fundo — 8% de opacidade
- Indicador de progresso — linha vertical com glow (`PROGRESS_LINE_WIDTH`, `PROGRESS_LINE_OPACITY`)
- Ponto luminoso no topo do indicador

## TranscriptionPanel

Painel MUI para transcrição de legendas com suporte a 3 fontes e staleness detection.

### Props

```typescript
interface TranscriptionPanelProps {
  audioUrl: string | null;
  script: string;
  scenes: { timestamp: number; prompt?: string; imageUrl: string }[];
  durationInFrames: number;
  fps: number;
  transcriptionSource: CaptionSource | null;
  isTranscribing: boolean;
  transcriptionProgress: number;
  transcriptionStatusText: string;
  transcriptionError: string | null;
  whisperSupported: boolean | null;
  captionCount: number;
  isStale?: boolean;
  onTranscribe: () => void;
  onCancel: () => void;
  onClear: () => void;
}
```

### Estados visuais

| Estado | Condição | Renderização |
|--------|----------|-------------|
| **Sucesso** | `captionCount > 0 && !isTranscribing` | Contagem de palavras + rótulo da fonte (`Timing TTS`, `Whisper Alinhado`, `Proporcional`, `Manual`) |
| **Stale** | `isStale && hasCaptions` | Alerta `WARNING_BG_SUBTLE`: "O roteiro foi editado desde a última geração" |
| **Transcrevendo** | `isTranscribing` | Barra de progresso com `%` + botão Cancelar |
| **Erro** | `transcriptionError && !isTranscribing` | Alerta `ERROR_BG_SUBTLE` + botão Tentar novamente |
| **Idle** | sem legendas, sem erro | Descrição contextual (Whisper vs proporcional) + botão Gerar |
| **Whisper indisponível** | `whisperSupported === false && idle` | Alerta `WARNING_BG_SUBTLE` informando sobre fallback |

## CaptionEditorPanel

Editor de legendas com split/merge de frases. Exportado pelo barrel. Usa `glassSurfaceSx` para estilo glass.

### Props

```typescript
interface CaptionEditorPanelProps {
  captions: CaptionWord[];
  onUpdateCaptions: (captions: CaptionWord[]) => void;
  fps: number;
  onSeekToFrame?: (frame: number) => void;
  currentFrame?: number;
}
```

### Funcionalidades

| Ação | Descrição |
|------|-----------|
| **Editar frase** | TextField multiline com parse de `**bold**`. Timing redistribuído uniformemente. Enter confirma, Esc cancela. |
| **Dividir frase** | Divide no ponto médio (pelo nº de palavras). Ajusta `startFrame`/`endFrame` para manter continuidade. |
| **Mesclar frases** | Concatena duas frases consecutivas mantendo timing contínuo. |
| **Pular no vídeo** | Clique em qualquer frase chama `onSeekToFrame(startFrame)`. |
| **Highlight ativo** | Frase contendo `currentFrame` recebe borda `BRAND_PRIMARY` + fundo `CYAN_GLOW_SOFT`. |

### Agrupamento

Usa `groupCaptionWordsIntoPhrases()` local (mesma lógica do SubtitleOverlay): pontuação final `.!?` ou limite de 12 palavras.

## canvasFontStretchPatch

Monkey patch que corrige bug do `@remotion/web-renderer` que passa `fontStretch: "100%"` para a Canvas API, que só aceita keywords.

### Mapeamento

O patch intercepta `CanvasRenderingContext2D.prototype.fontStretch` e converte percentuais para keywords válidas:

| Percentual | Keyword |
|------------|---------|
| `50%` | `ultra-condensed` |
| `62.5%` | `extra-condensed` |
| `75%` | `condensed` |
| `87.5%` | `semi-condensed` |
| `100%` | `normal` |
| `112.5%` | `semi-expanded` |
| `125%` | `expanded` |
| `150%` | `extra-expanded` |
| `200%` | `ultra-expanded` |

### Características

- **Idempotente:** flag `patched` impede aplicação múltipla
- **Seguro:** só afeta `fontStretch`, não altera outros comportamentos da Canvas API
- **Chamado em:** `startRender` do `useVideoExporter`, antes de `renderMediaOnWeb()`
- Valores não-percentuais (keywords, globals) são repassados sem alteração

## Transcrição Automática (useTranscription)

Hook que transcreve áudio para legendas palavra-a-palavra usando 3 fontes com prioridade, com staleness detection (detecta quando o roteiro muda após a geração).

### Pipeline de 3 fontes (prioridade)

O hook tenta gerar legendas na seguinte ordem:

| Prioridade | Fonte | `CaptionSource` | Descrição |
|------------|-------|-----------------|-----------|
| 1 | Segmentos TTS | `segment-timing` | Usa timing real dos chunks TTS (`alignScriptToSegments`). Não precisa de Whisper. |
| 2 | Whisper alinhado | `whisper-aligned` | Whisper fornece timestamps, mas o texto vem do roteiro (`processWhisperAlignedCaptions`). |
| 3 | Proporcional | `proportional` | Distribui o roteiro proporcionalmente ao tempo de cada cena (`segmentScriptByCenes`). |

**Fluxo detalhado:**

1. Se `audioSegments` foram fornecidos (ou carregados do IndexedDB via `loadAudioSegments`), usa `alignScriptToSegments()` — timing real, sem Whisper.
2. Se Whisper está disponível (`whisperSupported === true`), executa o pipeline Whisper (resample → download modelo → transcrição → `processWhisperAlignedCaptions`). Se Whisper falhar, cai para proporcional.
3. Se Whisper não está disponível, usa `segmentScriptByCenes()` diretamente.

**`processWhisperCaptions()`** (legado, `@deprecated`) — pipeline Whisper de 5 etapas com texto do próprio Whisper (não do roteiro): (1) `toCaptions`, (2) filtra tokens inválidos, (3) mescla fragmentos via `mergeWordFragments`, (4) `createTikTokStyleCaptions`, (5) converte para `CaptionWord[]`. Mantida para backward compat; o fluxo principal usa `processWhisperAlignedCaptions`.

### Imports principais

```typescript
// @remotion/whisper-web
canUseWhisperWeb, downloadWhisperModel, resampleTo16Khz, transcribe, toCaptions

// @remotion/captions
createTikTokStyleCaptions

// Internos
segmentScriptByCenes, alignScriptToSegments, parseBoldMarkdown, splitIntoWordsWithTiming
saveTranscription, loadTranscription, loadAudioSegments, hashScript
```

### Constantes

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `WHISPER_MODEL` | `'base'` | Modelo Whisper (~75MB, melhor precisão que tiny para legendas) |
| `PERSIST_DEBOUNCE_MS` | `500` | Debounce para persistência no IndexedDB |

### Filtros de tokens

| Filtro | Regex | Ação |
|--------|-------|------|
| `INVALID_TOKEN` | `/[[\]<_{}\]\\]/` | Rejeita tokens com brackets, underscores, chaves, etc. |
| `VALID_WORD` | `/[a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/` | Aceita só tokens com pelo menos uma letra real |

### Staleness detection

Após a geração, o hook calcula `hashScript(script)` (SHA-256) e armazena em `scriptHash`. Sempre que o `script` prop muda, um `useEffect` reavalia: se o hash atual diverge do salvo, `isStale = true`. O `TranscriptionPanel` exibe um alerta nesse caso.

### Persistência

- `saveTranscription(projectId, { words, source, scriptHash })` — salva no IndexedDB
- `loadTranscription(projectId)` — carrega transcrição salva
- **Debounce:** 500ms (`PERSIST_DEBOUNCE_MS`) para evitar writes excessivos

### Parâmetros

```typescript
interface TranscribeAudioParams {
  audioUrl: string;
  script: string;
  scenes: { timestamp: number }[];
  totalDurationFrames: number;
  fps: number;
  audioSegments?: AudioSegment[];
}
```

### Estado

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `captions` | `CaptionWord[]` | Legendas extraídas |
| `source` | `CaptionSource \| null` | Fonte da transcrição (5 valores possíveis) |
| `isTranscribing` | `boolean` | Indica se está transcrevendo |
| `transcriptionProgress` | `number` (0–100) | Progresso da transcrição |
| `transcriptionStatusText` | `string` | Texto descritivo do status |
| `error` | `string \| null` | Mensagem de erro |
| `whisperSupported` | `boolean \| null` | null = verificação pendente |
| `scriptHash` | `string \| null` | Hash do roteiro quando as legendas foram geradas |
| `isStale` | `boolean` | `true` se o roteiro mudou desde a última geração |

### Ações

| Ação | Descrição |
|------|-----------|
| `transcribeAudio(params)` | Inicia transcrição com `TranscribeAudioParams` |
| `cancelTranscription()` | Cancela via flag `cancelRef` (não AbortController) |
| `clearTranscription()` | Limpa todos os dados de transcrição (incluindo `scriptHash` e `isStale`) |
| `updateCaptions(captions)` | Atualiza legendas manualmente — marca `source` como `'manual'` |

## Exportação de Vídeo

### Verificação de suporte (`checkSupport`)

3 etapas de fallback progressivas:

1. **H.264 + AAC + MP4** — codec ideal, melhor compatibilidade
2. **H.264 sem áudio** (`audioCodec: null`, MP4) — fallback se codec de áudio não for suportado
3. **VP8 + Opus + WebM** — fallback final, suportado pela maioria dos navegadores; exibe `saveWarning` informativo ao usuário

Cada etapa chama `canRenderMediaOnWeb()` e verifica `result.canRender`. Issues são logados para diagnóstico. Os resultados são armazenados em refs (`resolvedVideoCodecRef`, `resolvedAudioCodecRef`, `resolvedContainerRef`).

### Renderização (`startRender`)

1. Aplica `patchCanvasFontStretch()` para corrigir bug de fontStretch
2. Mapeia cenas via `mapScenesToVideoScenes()`
3. Cria `AbortController` para cancelamento
4. Chama `renderMediaOnWeb()` com:
   - Composition: `ExportableComposition` (wrapper tipado sobre `VideoComposition`)
   - **Codec dinâmico:** usa refs resolvidas por `checkSupport` (não fixo em H.264+AAC)
     - `videoCodec`: `resolvedVideoCodecRef.current` (`'h264'` ou `'vp8'`)
     - `audioCodec`: `resolvedAudioCodecRef.current` (`'aac'`, `'opus'` ou `null`)
     - `container`: `resolvedContainerRef.current` (`'mp4'` ou `'webm'`)
   - License: `free-license`
5. Recebe blob final via `result.getBlob()`
6. Cria `URL.createObjectURL(blob)` para preview/download
7. Salva no projeto via `saveVideoToProject()` (não-bloqueante, com `saveWarning` em caso de falha)

### Cancelamento

```typescript
function isCancellationError(err: unknown): boolean {
  // Remotion lança Error com "was cancelled"
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.message.toLowerCase().includes('cancelled')) return true;
  return false;
}
```

### Fluxo de erros

```typescript
function toUserFriendlyError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Erro ao exportar vídeo. Tente novamente.';
  }
  const msg = err.message.toLowerCase();
  if (msg.includes('webcodecs') || msg.includes('videoencoder') || msg.includes('not supported')) {
    return `Navegador não suporta exportação de vídeo: ${err.message}`;
  }
  return 'Erro ao exportar vídeo. Tente novamente.';
}
```

## Bridge/Store (videoRenderBridge)

Store Zustand que permite comunicação entre `VideoPage` (que detém os hooks com imports de Remotion) e `App.tsx`/`ActionBar` (que não devem importar Remotion sincronamente — é uma rota lazy).

### Estado compartilhado

```typescript
interface VideoRenderBridgeState {
  // Exportação de vídeo
  isExportingVideo: boolean;
  videoExportProgress: number;

  // Transcrição
  isTranscribing: boolean;
  transcriptionProgress: number;
  transcriptionStatusText: string;

  // Ações de sincronização
  syncExportState: (rendering: boolean, progress: number) => void;
  syncTranscriptionState: (transcribing: boolean, progress: number, statusText: string) => void;
  resetBridge: () => void;
}
```

## Utilitários (`lib/videoUtils.ts`)

| Função | Descrição |
|--------|-----------|
| `msToFrames(ms, fps)` | `Math.round((ms / 1000) * fps)` |
| `framesToMs(frames, fps)` | `(frames / fps) * 1000` |
| `framesToSeconds(frames, fps)` | `frames / fps` |
| `getResolutionFromRatio(ratio)` | `16:9` → 1920x1080, `9:16` → 1080x1920, `1:1` → 1080x1080 |
| `calculateDurationFromWav(byteLength, sampleRate=24000)` | Desconta header WAV de 44 bytes; mono 16-bit: 2 bytes/sample |
| `mapScenesToVideoScenes(scenes, totalDurationInFrames, fps)` | Mapeia `StudioScene[]` para `VideoScene[]` calculando `durationInFrames`; última cena se estende até o fim do áudio |

## Utilitários (`lib/subtitleUtils.tsx`)

### Constantes de pausa por pontuação (locais)

> **Nota:** `PUNCTUATION_PAUSES` e `MAX_WORDS_PER_PHRASE` são constantes locais (não-exportadas) de `subtitleUtils.tsx`, usadas internamente por `splitIntoWordsWithTiming` e `segmentScriptByCenes`.

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `PUNCTUATION_PAUSES` | `{ ',': 5, ';': 5, '.': 10, '!': 10, '?': 10, '...': 14 }` | Pausas por tipo de pontuação em frames (base 24fps) |
| `MAX_WORDS_PER_PHRASE` | `12` | Número máximo de palavras por frase antes de forçar divisão |

### Helpers de contagem e timing (locais)

> **Nota:** `countSyllables`, `scalePause`, `extractTokensFromSegments` e `getPunctuationPauseKey` são funções locais (não-exportadas), usadas internamente por `splitIntoWordsWithTiming`.

| Função | Descrição |
|--------|-----------|
| `countSyllables(word)` | Conta sílabas de uma palavra em português (vogais - ditongos - tritongos, mínimo 1) |
| `scalePause(baseFrames, fps)` | Converte pausa de frames-24fps para fps real: `round(base * fps / 24)` |
| `extractTokensFromSegments(segments)` | Extrai tokens (palavras e pontuação) de segmentos bold, retorna array com `{ text, bold, isPunct }` |
| `getPunctuationPauseKey(punct)` | Mapeia pontuação para chave de `PUNCTUATION_PAUSES` (normaliza reticências `…` → `...`) |

### Helpers de parse

| Função | Descrição |
|--------|-----------|
| `parseBoldMarkdown(text)` | Parseia `**texto**` em segmentos `{ text, bold }` (`TextSegment[]`) |
| `splitIntoWords(text)` | Separa em palavras preservando flag de negrito (`WordEntry[]`) |
| `calculateWordTiming(words, totalFrames)` | Distribui frames proporcionalmente ao comprimento; última palavra absorve residuais |
| `splitIntoWordsWithTiming(text, startFrame, endFrame, fps)` | Divide texto em `CaptionWord[]` com timing por **sílabas** (não caracteres), respeitando pausas de pontuação. Retorna pronto para uso. |

### Segmentação de roteiro

| Função | Descrição |
|--------|-----------|
| `segmentScriptByCenes(script, scenes, totalDurationFrames, fps)` | Divide roteiro por cena proporcionalmente ao timestamp; frases limitadas a ~12 palavras; distribui frames por caractere |
| `alignScriptToSegments(script, segments, totalDurationFrames, fps)` | Alinha o roteiro aos segmentos de áudio TTS com timing real (método principal quando segmentos disponíveis). Cada segmento usa `splitIntoWordsWithTiming` para timing por sílabas. |

## Resoluções suportadas

| Ratio | Largura | Altura |
|-------|---------|--------|
| `16:9` | 1920 | 1080 |
| `9:16` | 1080 | 1920 |
| `1:1` | 1080 | 1080 |
