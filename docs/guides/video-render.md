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

**Renderização:** client-side via WebCodecs (H.264 + AAC em MP4). Não há backend de renderização.

## Arquitetura do Módulo

```
src/features/video-render/
  index.ts                          # Barrel — re-exporta tudo
  types.ts                          # VideoScene, VideoCompositionProps, VideoRenderConfig, CaptionWord, TranscriptionResult, SubtitleMode
  lib/
    videoUtils.ts                   # Conversão de tempo, resolução, mapeamento de cenas
    subtitleUtils.tsx               # Utilitários de subtitle (parsing, formatação)
    canvasFontStretchPatch.ts       # Patch de fonte para Canvas
  store/
    videoRenderBridge.ts            # Zustand store — sincroniza exportação e transcrição entre VideoPage e App.tsx
  hooks/
    useVideoExporter.tsx            # Exportação de vídeo via renderMediaOnWeb
    useTranscription.ts             # Transcrição automática via Whisper WASM
  components/
    VideoComposition.tsx            # Composition principal Remotion (fade padrão em todas as cenas)
    VideoExportPanel.tsx            # Painel de exportação (MUI)
    SceneSequence.tsx               # Cena individual com fade in/out padrão (spring-based)
    SubtitleOverlay.tsx             # Legenda karaoke palavra-a-palavra
    WaveformOverlay.tsx             # Waveform de áudio SVG sincronizado
    ScrollingPhrase.tsx             # Componente de frase scrollável
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

interface TranscriptionResult {
  words: CaptionWord[];
  source: 'whisper' | 'proportional';
}

type SubtitleMode = 'word-karaoke' | 'scroll-phrases';
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
      <SubtitleOverlay ... />        // Legenda karaoke (se houver)
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
- **Cenas curtas (< 3 frames):** `safeFadeFrames = min(fadeFrames, floor((duration-1)/2))` previne range inválido no inputRange.

## SubtitleOverlay (Karaoke palavra-a-palavra)

Legenda estilo TikTok com timing por palavra.

### Parsing

1. `parseBoldMarkdown(text)` — parseia `**texto**` em segmentos `{ text, bold }`
2. `splitIntoWords(text)` — separa em palavras preservando flag de negrito
3. `calculateWordTiming(words, totalFrames)` — distribui frames proporcionalmente ao comprimento de cada palavra; última palavra absorve frames residuais

### Estados de palavra

| Estado | Escala | Opacidade | fontWeight |
|--------|--------|-----------|------------|
| `active` | spring 1.0→1.15 | 0.6→1.0 | bold? 800 : 700 |
| `past` | 1.0 | 1.0→0.5 (fade em 6 frames) | bold? 700 : 600 |
| `future` | 1.0 | 0→0.25 (fade em 6 frames) | bold? 600 : 500 |

### Estilo

- Font-size: `clamp(18px, 3.5vw, 36px)`
- Fundo: `BLACK_50` (rgba preto 50%)
- Sombra: `0 0 40px 20px rgba(0,0,0,0.4)`
- Posição: configurável (`bottom`, `center`, `top`)
- Fade global da legenda: 8 frames de entrada/saída com leve deslocamento vertical (+12px)

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
| `NUMBER_OF_SAMPLES` | 120 | Amostras por frame |
| `WINDOW_IN_SECONDS` | 0.4 | Janela de tempo ao redor do frame |
| Opacidade padrão | 0.3 | Overlay semi-transparente |

### Elementos SVG

- Linha base (zero amplitude) — `WHITE_14`
- Path do waveform — gradiente vertical (brilho na base) + mask de fade nas bordas
- Barra de progresso de fundo — 8% de opacidade
- Indicador de progresso — linha vertical com glow
- Ponto luminoso no topo do indicador

## Exportação de Vídeo

### Verificação de suporte (`checkSupport`)

1. Verifica `VideoEncoder` (WebCodecs) disponível
2. Chama `canRenderMediaOnWeb()` com H.264 + AAC + MP4
3. Se falha por codec de áudio, tenta fallback sem áudio (`audioCodec: null`)
4. Exibe mensagem amigável se nenhum fallback funcionar

### Renderização (`startRender`)

1. Mapeia cenas via `mapScenesToVideoScenes()`
2. Cria `AbortController` para cancelamento
3. Chama `renderMediaOnWeb()` com:
   - Composition: `ExportableComposition` (wrapper tipado sobre `VideoComposition`)
   - Codec: `h264` + `aac` (ou null se fallback)
   - Container: `mp4`
   - License: `free-license`
4. Recebe blob final via `result.getBlob()`
5. Cria `URL.createObjectURL(blob)` para preview/download
6. Salva no projeto via `saveVideoToProject()` (não-bloqueante, com `saveWarning` em caso de falha)

### Fluxo de erros

```typescript
function toUserFriendlyError(err: unknown): string {
  if (DOMException 'AbortError') return 'Exportação cancelada.';
  if ('webcodecs'|'videoencoder'|'not supported') return 'Navegador não suporta exportação...';
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

## Resoluções suportadas

| Ratio | Largura | Altura |
|-------|---------|--------|
| `16:9` | 1920 | 1080 |
| `9:16` | 1080 | 1920 |
| `1:1` | 1080 | 1080 |
