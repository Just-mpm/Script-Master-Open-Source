# Speed Paint & Animação — Script Master

Documentação completa da feature de speed paint, extraída diretamente do código-fonte.

---

## Visão Geral

Feature que transforma imagens estáticas em animações de speed paint — desenhando a imagem traço por traço no canvas. O pipeline é inteiramente client-side:

1. Upload de imagens (drag & drop ou botão)
2. Detecção de bordas + vetorização em strokes
3. Renderização progressiva no canvas Konva (fase sketch → fase reveal)
4. Exportação como imagem (PNG) ou vídeo (WebM)

O módulo também suporta **batch processing** — fila de imagens processadas sequencialmente com auto-play ou gravação automática.

---

## Arquitetura

```
src/pages/SpeedPaintPage.tsx          ← Roteador de estados (vazio / fila / player)
src/features/speed-paint/
  ├── types.ts                        ← Tipos exportados (Stroke, StrokeAnimation, QueuedImage, PaintingJob)
  ├── store/
  │   └── animationStore.ts           ← Store Zustand central
  ├── lib/
  │   ├── imageProcessing.ts          ← Motor de geração de strokes
  │   └── stageRef.ts                 ← Ref compartilhado do Stage Konva
  └── components/
      ├── SpeedSelector.tsx            ← Seletor de velocidade reutilizável
      ├── upload/
      │   └── ImageUpload.tsx         ← Dropzone com react-dropzone
      ├── canvas/
      │   ├── AnimationPlayer.tsx     ← Loop de animação (requestAnimationFrame)
      │   ├── AnimationControls.tsx   ← Play/pause, seek, velocidade, export
      │   └── StrokeRenderer.tsx      ← Canvas Konva com buffer offscreen
      └── batch/
          ├── BatchOrchestrator.tsx   ← Processamento automático da fila
          └── QueueStaging.tsx        ← UI de revisão da fila
```

---

## Tipos e Interfaces

> `src/features/speed-paint/types.ts`

### `Stroke`

Unidade mínima de desenho no canvas.

```typescript
interface Stroke {
  id: number;
  layer: number;                    // 0 = sketch (bordas), 1 = reveal (coloração)
  type: 'sketch' | 'reveal' | 'polyline';
  points: number[];                 // [x1, y1, x2, y2, ...] ou [x1,y1,cx,cy,x2,y2] (Bézier)
  lineWidth: number;
  r: number; g: number; b: number;  // Cor RGB (0–255)
  alpha: number;                    // Opacidade (0–1)
}
```

### `StrokeAnimation`

Resultado completo da análise de uma imagem — contém todos os strokes e metadados.

```typescript
interface StrokeAnimation {
  id: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasColor: 'white' | 'black';
  totalFrames: number;              // Igual ao total de strokes
  fps: number;                      // 60
  totalDurationMs: number;          // max(1000, strokes.length * 8)
  revealThreshold?: number;         // Fração onde a fase reveal começa
  strokes: Stroke[];
  resizedImage?: string;            // data URL da imagem redimensionada (JPEG)
}
```

### `QueuedImage`

Item na fila de processamento batch.

```typescript
interface QueuedImage {
  id: string;
  dataUrl: string;                  // data URL da imagem original
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

### `PaintingJob`

Estado do job atual de animação no store.

```typescript
interface PaintingJob {
  id: string;
  inputImage: string;               // data URL
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;                 // 0–1
  animation?: StrokeAnimation;
}
```

---

## Fluxo de Dados

### Fluxo principal (imagem única)

```
ImageUpload.onDrop()
  → FileReader (dataUrl)
  → setQueue([...]) + setBatchMode('idle')
  → SpeedPaintPage renderiza QueueStaging
  → Usuário clica "Apenas Assistir" → setBatchMode('watch')
  → BatchOrchestrator detecta queue + batchMode !== 'idle'
    → generateStrokesFromImage(dataUrl, onProgress)
    → setJob({ status: 'completed', animation })
  → SpeedPaintPage renderiza AnimationPlayer
  → AnimationPlayer: auto-play + requestAnimationFrame loop
  → StrokeRenderer: render incremental no canvas Konva
```

### Fluxo batch (múltiplas imagens)

```
ImageUpload.onDrop([file1, file2, ...])
  → FileReader para cada → setQueue([QueuedImage, ...])
  → QueueStaging: grid de thumbnails + configuração de velocidade
  → "Apenas Assistir" (watch) ou "Gravar Tudo Automático" (record)
  → BatchOrchestrator: processa queue[currentIndex]
    → Ao completar: AnimationControls detecta e avança currentIndex
    → watch: auto-avança após 2s quando progress >= 1
    → record: grava vídeo → auto-avança ao finalizar gravação
  → Ao esgotar a fila: setBatchMode('idle') + clearQueue()
```

---

## Motor de Geração de Strokes

> `src/features/speed-paint/lib/imageProcessing.ts` — `generateStrokesFromImage()`

Função assíncrona que recebe um data URL e retorna uma `StrokeAnimation`. Executa em duas fases:

### Fase 1 — Sketch (Detecção de Bordas)

1. **Resize** da imagem para máximo 1920×1080, preenchendo fundo branco (PNGs transparentes)
2. **Conversão para grayscale** (luminância BT.601: `0.299R + 0.587G + 0.114B`)
3. **Detecção de bordas** por diferença adjacente (threshold > 20)
4. **Clusterização** via BFS com raio 5×5 — agrupa bordas conectadas em "objetos"
5. **Filtro de ruído** — ignora clusters menores que 15 pixels
6. **Ordenação espacial** — Y×1000 + X para desenho de cima para baixo
7. **Vetorização** — traça caminhos contínuos dentro de cada cluster
8. **Simplificação** — step size 5, curvas Bézier quadráticas
9. **Pressão simulada** — `sin(progress * PI)` para espessura variável (0.8–2.6)

Cada stroke de sketch: `layer: 0`, `type: 'sketch'`, cor `rgba(40,40,40,0.9)`.

### Fase 2 — Reveal (Coloração)

1. **Grid de "dabs"** — brush size 45, espaçamento 0.6× com randomização de posição
2. **Ordenação orgânica** — Y×10 + X + ruído aleatório (0–300) para efeito de pintura
3. **Cada dab** — pincelada com ângulo randômico e curva Bézier de controle

Cada stroke de reveal: `layer: 1`, `type: 'reveal'`, `lineWidth: 81`, `alpha: 1`.

### Progress

- `onProgress(0.5)` ao fim da fase 1
- `onProgress(1.0)` ao fim da fase 2
- `revealThreshold = sketchCount / totalStrokes` — fração onde começa a coloração

---

## Integração com Konva (Canvas)

> `src/features/speed-paint/components/canvas/StrokeRenderer.tsx`

### Estrutura

```
Stage (react-konva)
  └── Layer (listening={false})    ← Layer única para captura de vídeo confiável
      └── Shape (sceneFunc custom) ← Toda a renderização via Canvas 2D API
```

O `Stage` opera nas dimensões reais da animação (`canvasWidth × canvasHeight`). O container aplica `transform: scale()` CSS para responsividade, mantendo aspect ratio.

### Técnica de renderização

1. **Offscreen buffer** (`HTMLCanvasElement` criado via JS) — simula uma "lousa branca" sobre a imagem original
2. **Desenho incremental** — `lastRenderedIndexRef` rastreia o último stroke renderizado; apenas strokes novos são desenhados por frame
3. **Reset automático** — quando progress volta (seek/restart), o buffer é limpo e redesenhado do zero
4. **Compositing modes:**
   - `sketch`: `globalCompositeOperation = 'source-over'` (desenha por cima)
   - `reveal`: `globalCompositeOperation = 'destination-out'` (apaga a lousa branca, revelando a imagem original)
5. **Ferramenta visual** — lápis (sketch) ou pincel (reveal) desenhada na posição do último stroke via `drawTool()`

### Exportação de imagem

Acessa o Stage via `getStageRef()` (`stageRef.ts`), usa `stage.toDataURL({ pixelRatio: 2 / currentScale })` para exportar em 2× a resolução original.

---

## Controles de Reprodução

> `src/features/speed-paint/components/canvas/AnimationControls.tsx`

### Loop de animação

> `AnimationPlayer.tsx` — `requestAnimationFrame`

- Incremento de progresso: `(deltaTime / totalDurationMs) * speed * 12`
- **Dupla velocidade**: na fase sketch usa `speed`, na fase reveal usa `paintSpeed * 0.5`
- O fator 0.5 na reveal compensa a maior densidade de strokes nessa fase
- Auto-play ao completar job (quando `batchMode === 'idle'` e `!hasAutoPlayed`)

### Controles disponíveis

| Controle | Ação |
|----------|------|
| Play/Pause | Inicia/pausa a animação. Se no final, reinicia ao pressionar play |
| Reiniciar | Volta progress para 0 e pausa |
| Seek (Slider) | Arrastar para qualquer ponto (pausa automaticamente) |
| Velocidade Draw | 0.25× – 8× (velocidade na fase sketch) |
| Velocidade Paint | 0.25× – 8× (velocidade na fase reveal) |
| Baixar Imagem | Exporta frame atual como PNG (2× resolução) |
| Baixar Vídeo | Grava animação completa como WebM via MediaRecorder |
| Nova Imagem / Sair | Volta ao upload ou limpa a fila |

### Gravação de vídeo

- `captureStream(60)` no canvas para captura a 60fps
- Codec prioritizado: H.264 → VP9 → WebM padrão
- Bitrate: 12 Mbps
- Auto-stop quando progress >= 1 (delay de 500ms)
- No batch mode `record`: auto-avança para próxima imagem após gravação

---

## Batch Processing

### QueueStaging (UI de revisão)

> `src/features/speed-paint/components/batch/QueueStaging.tsx`

- Grid responsivo de thumbnails (2–5 colunas por breakpoint)
- Remoção individual de imagens
- Configuração de velocidade Draw/Paint prévia
- Três ações: Cancelar Fila, Apenas Assistir (`watch`), Gravar Tudo Automático (`record`)

### BatchOrchestrator (pipeline automático)

> `src/features/speed-paint/components/batch/BatchOrchestrator.tsx`

- Componente invisível que observa `queue`, `currentIndex` e `batchMode`
- Ao detectar imagem pendente: chama `generateStrokesFromImage()` e atualiza o `job`
- Falhas: exibe alerta por 2s e auto-avança para a próxima
- Usa ref `currentImageIdRef` para evitar reprocessamento da mesma imagem

### Modos de batch

| Modo | Comportamento |
|------|---------------|
| `idle` | Sem batch ativo, fluxo de imagem única |
| `watch` | Reproduz cada animação, auto-avança após 2s ao finalizar |
| `record` | Grava vídeo de cada animação, auto-avança ao finalizar gravação |

---

## Store de Animação (Zustand)

> `src/features/speed-paint/store/animationStore.ts` — `useAnimationStore`

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `job` | `PaintingJob` | Job atual (status, progress, animation) |
| `queue` | `QueuedImage[]` | Fila de imagens pendentes |
| `currentIndex` | `number` | Índice da imagem atual na fila |
| `batchMode` | `'idle' \| 'watch' \| 'record'` | Modo de operação batch |
| `isPlaying` | `boolean` | Se a animação está reproduzindo |
| `progress` | `number` | Progresso atual (0–1) |
| `speed` | `number` | Velocidade de desenho (default: 1) |
| `paintSpeed` | `number` | Velocidade de coloração (default: 1) |
| `hasAutoPlayed` | `boolean` | Controle para auto-play único por job |

Ações principais: `setJob()`, `resetJob()`, `setQueue()`, `clearQueue()`, `setBatchMode()`, `setIsPlaying()`, `setProgress()`, `setSpeed()`, `setPaintSpeed()`.

---

## Upload via Drag & Drop

> `src/features/speed-paint/components/upload/ImageUpload.tsx`

- Usa `react-dropzone` com aceitação: `image/jpeg`, `image/png`, `image/webp`
- Converte cada arquivo em data URL via `FileReader.readAsDataURL()`
- Adiciona à queue existente (acumulativo — pode fazer upload múltiplas vezes)
- Reseta `currentIndex` para 0 e `batchMode` para `idle`

---

## SpeedSelector (Componente Compartilhado)

> `src/features/speed-paint/components/SpeedSelector.tsx`

- Opções fixas: `[0.25, 0.5, 1, 2, 4, 8]`
- Dois variants: `inline` (vertical, controles compactos) e `panel` (horizontal, fila)
- Usado por `AnimationControls` (desktop inline, mobile menu) e `QueueStaging` (panel)

---

## Referência Rápida de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/pages/SpeedPaintPage.tsx` | Roteador de estados: upload → fila → player |
| `src/features/speed-paint/types.ts` | Tipos: Stroke, StrokeAnimation, QueuedImage, PaintingJob |
| `src/features/speed-paint/store/animationStore.ts` | Store Zustand: estado, batch, player |
| `src/features/speed-paint/lib/imageProcessing.ts` | Motor: edge detection, vetorização, dabs de coloração |
| `src/features/speed-paint/lib/stageRef.ts` | Ref compartilhada do Stage Konva |
| `src/features/speed-paint/components/SpeedSelector.tsx` | Seletor de velocidade (0.25×–8×) |
| `src/features/speed-paint/components/upload/ImageUpload.tsx` | Dropzone com react-dropzone |
| `src/features/speed-paint/components/canvas/AnimationPlayer.tsx` | Loop rAF, auto-play, estados de loading |
| `src/features/speed-paint/components/canvas/AnimationControls.tsx` | Controles, seek, exportação PNG/WebM, automação batch |
| `src/features/speed-paint/components/canvas/StrokeRenderer.tsx` | Canvas Konva, buffer offscreen, drawTool |
| `src/features/speed-paint/components/batch/BatchOrchestrator.tsx` | Pipeline automático da fila |
| `src/features/speed-paint/components/batch/QueueStaging.tsx` | UI de revisão da fila com grid de thumbnails |
