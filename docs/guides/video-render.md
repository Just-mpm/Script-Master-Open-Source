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
  types.ts                          # VideoScene, VideoCompositionProps, VideoRenderConfig
  lib/
    editingPlan.ts                  # Tipos, presets e constantes do plano de edição
    videoUtils.ts                   # Conversão de tempo, resolução, mapeamento de cenas
    audioAnalysis.ts                # Análise de áudio via Web Audio API (peaks, silences)
  store/
    videoRenderBridge.ts            # Zustand store — ponte entre VideoPage e App.tsx/ActionBar
  hooks/
    useEditingPlan.ts               # Geração, edição, undo, persistência do plano de edição
    useVideoExporter.tsx            # Exportação de vídeo via renderMediaOnWeb
  components/
    VideoComposition.tsx            # Composition principal Remotion
    VideoExportPanel.tsx            # Painel de exportação (MUI)
    SceneSequence.tsx               # Cena individual com transição/câmera/efeitos
    SubtitleOverlay.tsx             # Legenda karaoke palavra-a-palavra
    TitleOverlay.tsx                # Overlay de título (intro, créditos, lower-third)
    WaveformOverlay.tsx             # Waveform de áudio SVG sincronizado
    EditingPlanInspector.tsx        # Inspetor/editor do plano de edição (MUI)
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
  editingPlan?: EditingScene[];
}

interface VideoRenderConfig {
  width: number;
  height: number;
  fps: number;
  codec: 'h264' | 'h265' | 'vp8' | 'vp9';
}
```

### Tipos do Plano de Edição (`lib/editingPlan.ts`)

```typescript
type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'zoom' | 'cut' | 'dissolve' | 'wipe';
type CameraMovement = 'static' | 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'zoom-in' | 'zoom-out' | 'ken-burns';
type VisualEffect = 'none' | 'grayscale' | 'sepia' | 'blur' | 'vignette' | 'brightness-up' | 'contrast-up' | 'saturate';
type TitleOverlayStyle = 'intro' | 'credit' | 'lower-third';

interface EditingScene {
  timestamp: number;
  prompt: string;
  transition: TransitionType;
  transitionDuration?: number;
  subtitle?: string;
  effects?: VisualEffect[];
  camera?: CameraMovement;
  durationOverride?: number;
  subtitlePosition?: 'bottom' | 'center' | 'top';
  titleOverlay?: {
    text: string;
    style: TitleOverlayStyle;
  };
}

type EditingPlan = EditingScene[];
```

### Tipos da Análise de Áudio (`lib/audioAnalysis.ts`)

```typescript
interface AudioAnalysisPoint {
  time: number;
  type: 'peak' | 'silence' | 'volume-rise' | 'volume-drop';
  intensity: number;
}

interface AudioAnalysisResult {
  points: AudioAnalysisPoint[];
  averageEnergy: number;
  duration: number;
  toPromptText: string;
}
```

### Tipos do Exportador (`hooks/useVideoExporter.tsx`)

```typescript
interface VideoExportOptions {
  scenes: StudioScene[];
  audioUrl: string;
  fps: number;
  durationInFrames: number;
  ratio: SceneRatio;
  editingPlan?: EditingScene[];
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
}
```

## Editing Plan

### O que é

O plano de edição é um array de `EditingScene` que descreve, para cada cena do vídeo, a transição de entrada, legenda, efeitos visuais, movimento de câmera e overlays de título. É gerado pela IA (Gemini) e pode ser editado manualmente pelo usuário.

### Geração (useEditingPlan)

O hook `useEditingPlan(projectId?)` orquestra a geração:

1. **Análise de áudio (opcional):** se `audioUrl` for fornecido, baixa o blob e executa `analyzeAudioForEditing()` via Web Audio API
2. **Carregamento de imagens:** chama `loadSceneImagesForAnalysis()` para enviar imagens ao Gemini para análise visual
3. **Geração via IA:** chama `generateEditingPlan()` (de `src/lib/gemini.ts`) com roteiro, cenas, duração, dados de áudio e imagens
4. **Persistência:** salva no IndexedDB via `saveEditingPlan()` com debounce de 500ms

Etapas de progresso:

| Progresso | Texto |
|-----------|-------|
| 15% | Analisando áudio... |
| 20% | Carregando imagens... |
| 40% | Enviando para IA... |
| 60% | Analisando roteiro e imagens... |
| 80% | Gerando plano de edição... |
| 100% | Plano de edição gerado com sucesso! |

### Edições manuais

- `updateScene(index, updates)` — edita cena parcialmente, salva no histórico de undo (máximo 20 entradas)
- `undoLastEdit()` — desfaz última edição
- `resetToOriginal()` — volta ao plano gerado pela IA
- `regenerateScene(index, ...)` — solicita plano completo à IA e substitui apenas a cena no índice

### Presets de Transição

| Transição | Duração padrão | Descrição |
|-----------|----------------|-----------|
| `fade` | 500ms | Fade suave entre cenas |
| `slide-left` | 400ms | Desliza da direita para esquerda |
| `slide-right` | 400ms | Desliza da esquerda para direita |
| `slide-up` | 400ms | Desliza de baixo para cima |
| `zoom` | 600ms | Zoom in/out entre cenas |
| `cut` | 0ms | Corte direto sem transição |
| `dissolve` | 800ms | Dissolve cruzado longo |
| `wipe` | 500ms | Cortina horizontal |

### Movimentos de Câmera

| Movimento | Intensidade |
|-----------|-------------|
| `static` | 0 |
| `pan-left` / `pan-right` | 0.3 |
| `tilt-up` / `tilt-down` | 0.2 |
| `zoom-in` / `zoom-out` | 0.4 |
| `ken-burns` | 0.5 |

Intensidade controla: `maxPan = intensity * 15` (translate em %) e `maxScale = 1 + intensity * 0.4`.

## Composição de Vídeo (VideoComposition)

`VideoComposition` é a composition principal Remotion. Recebe `VideoCompositionProps` como inputProps.

### Estrutura de renderização

```
AbsoluteFill (bg: #000)
  <Audio src={audioUrl} />           // Clock master — sincroniza tudo
  {scenes.map((scene, index) =>
    <Sequence from={adjustedFrom} durationInFrames={adjustedDuration}>
      <SceneSequence ... />          // Imagem com transição/câmera/efeitos
      <SubtitleOverlay ... />        // Legenda karaoke (se houver)
      <TitleOverlay ... />           // Título overlay (se houver)
      <WaveformOverlay ... />        // Waveform SVG (se houver áudio)
    </Sequence>
  )}
```

### Crossfade entre cenas

Cenas vizinhas fazem overlap para criar crossfade real:

```typescript
const overlapFrames = getOverlapFrames(planScene, fps);
const adjustedFrom = Math.max(0, startFrame - overlapFrames);
const adjustedDuration = scene.durationInFrames + overlapFrames;
```

- `cut` não gera overlap (0 frames)
- Demais transições usam `transitionDuration` do plano ou o `defaultDuration` do preset

### Busca de cena no plano

`findEditingSceneForIndex()` busca por timestamp com tolerância de 0.5s, com fallback por índice.

## SceneSequence

Renderiza uma cena individual com imagem fullscreen (`<Img>` do Remotion, que aguarda carregamento).

### Spring configs

```typescript
const SPRING_TRANSICAO = { damping: 26, stiffness: 100, mass: 1 };
const SPRING_CAMERA = { damping: 200, stiffness: 40, mass: 1, overshootClamping: true };
```

- **SPRING_TRANSICAO:** superamortecido (damping > stiffness), sem oscilação. Usado em fade-in, fade-out, slides e wipes.
- **SPRING_CAMERA:** extremamente suave (damping 200), `overshootClamping` impede que a câmera passe do ponto final.

### Implementação das transições

Todas as transições usam `spring()` do Remotion (physics-based) em vez de interpolação linear:

| Transição | Mecanismo |
|-----------|-----------|
| `cut` | Sem animação — opacidade 1, sem transform |
| `fade` | `min(fadeIn, fadeOut)` com spring — curva entrada-platô-saída |
| `dissolve` | Igual ao fade, porém com 2x os frames de transição |
| `slide-left` | `translateX` de 100%→0% com spring + fade-out |
| `slide-right` | `translateX` de -100%→0% com spring + fade-out |
| `slide-up` | `translateY` de 100%→0% com spring + fade-out |
| `zoom` | `scale` de 1.2→1.0 com spring sincronizado + opacidade |
| `wipe` | `clipPath: inset(0 X% 0 0)` com spring — cortina horizontal |

Última cena: não aplica fade-out (permanece visível até o final).

### Efeitos visuais (CSS filter)

| Efeito | CSS |
|--------|-----|
| `grayscale` | `grayscale(100%)` |
| `sepia` | `sepia(80%)` |
| `blur` | `blur(${effectBlurPx(0.5, width)}px)` — proporcional à resolução |
| `brightness-up` | `brightness(1.2)` |
| `contrast-up` | `contrast(1.3)` |
| `saturate` | `saturate(1.4)` |
| `vignette` | `box-shadow: inset 0 0 120px 40px rgba(0,0,0,0.6)` |

`effectBlurPx(intensity, referenceWidth)` retorna `Math.max(1, intensity * referenceWidth / 480)`.

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

## TitleOverlay

Overlay de título com 3 estilos:

| Estilo | Tamanho | Alinhamento | Peso |
|--------|---------|-------------|------|
| `intro` | `clamp(28px, 6vw, 56px)` | Centro | 800, uppercase |
| `credit` | `clamp(18px, 3.5vw, 36px)` | Centro | 400 |
| `lower-third` | `clamp(16px, 3vw, 28px)` | Inferior esquerdo | 600, bg preto 65% |

Animação: fade 10 frames + translateY 20→0px na entrada.

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

## Análise de Áudio (`lib/audioAnalysis.ts`)

Analisa WAV via `OfflineAudioContext` para detectar eventos sonoros relevantes.

### Algoritmo

1. Decodifica o ArrayBuffer de áudio via `OfflineAudioContext.decodeAudioData()`
2. Calcula RMS por janela de ~50ms com hop de 50% (overlap)
3. Normaliza RMS para 0-1
4. Detecta pontos de interesse:

| Evento | Condição | Threshold | Distância mínima |
|--------|----------|-----------|------------------|
| `peak` | cruza threshold para cima | 0.7 | 0.3s |
| `silence` | cruza threshold para baixo | 0.05 | 0.5s |
| `volume-rise` | diff > threshold E prev < 0.5 | 0.3 | 0.5s |
| `volume-drop` | diff < -threshold E curr < 0.5 | 0.3 | 0.5s |

5. Gera `toPromptText` com os 20 pontos mais relevantes por intensidade, ordenados por tempo — enviado ao Gemini como contexto para sugestão de cortes.

### Fallbacks

- Se `OfflineAudioContext` não está disponível (SSR, browser antigo), retorna resultado vazio
- Se decodificação falha (formato inválido), retorna resultado vazio

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

Erros de quota/permissão do Gemini são tratados separadamente no `useEditingPlan`.

## Bridge/Store (videoRenderBridge)

Store Zustand que permite comunicação entre `VideoPage` (que detém os hooks com imports de Remotion) e `App.tsx`/`ActionBar` (que não devem importar Remotion sincronamente — é uma rota lazy).

### Estado compartilhado

```typescript
interface VideoRenderBridgeState {
  // Plano de edição
  isGeneratingPlan: boolean;
  isPlanDisabled: boolean;
  planError: string | null;

  // Exportação de vídeo
  isExportingVideo: boolean;
  videoExportProgress: number;

  // Callbacks (registrados por VideoPage)
  generatePlanAction: (() => void) | null;
  clearPlanErrorAction: (() => void) | null;
}
```

Ações: `syncPlanState()`, `syncExportState()`, `setGeneratePlanAction()`, `setClearPlanErrorAction()`, `dismissPlanError()`, `resetBridge()`.

## Utilitários (`lib/videoUtils.ts`)

| Função | Descrição |
|--------|-----------|
| `msToFrames(ms, fps)` | `Math.round((ms / 1000) * fps)` |
| `framesToMs(frames, fps)` | `(frames / fps) * 1000` |
| `framesToSeconds(frames, fps)` | `frames / fps` |
| `getResolutionFromRatio(ratio)` | `16:9` → 1920x1080, `9:16` → 1080x1920, `1:1` → 1080x1080 |
| `calculateDurationFromWav(byteLength, sampleRate=24000)` | Desconta header WAV de 44 bytes; mono 16-bit: 2 bytes/sample |
| `mapScenesToVideoScenes(scenes, totalDuration, fps, editingPlan?)` | Mapeia `StudioScene[]` para `VideoScene[]` calculando `durationInFrames`; respeita `durationOverride` do plano |

## Resoluções suportadas

| Ratio | Largura | Altura |
|-------|---------|--------|
| `16:9` | 1920 | 1080 |
| `9:16` | 1080 | 1920 |
| `1:1` | 1080 | 1080 |
