# Fase 2.1 — Handoff: Integrar vectorizer no Worker

**Você é o agent `worker` da Koda AI Studio.** Sua tarefa é a Fase 2.1 do plano `docs/plan/plano-speed-paint-vetorial-2026-06-14.md` (tracker `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`).

## Objetivo

Modificar `src/features/speed-paint/lib/imageProcessing.ts` (721 linhas) para suportar **dois modos de renderização** via `renderMode`:

- `'mask'` (default, retrocompatibilidade) — pipeline atual (edge detection + BFS + tracing). **Manter 100% inalterado.**
- `'vetorial'` (novo) — chamar `vectorizeImage()` (Fase 1.2) em vez do pipeline atual.

Criar também o fallback `processOnMainThreadVetorial()` (mesmo padrão do `processOnMainThread` do mask).

## Estado atual dos arquivos

### `src/features/speed-paint/lib/imageProcessing.ts` (721 linhas)

Estrutura:
1. **Worker inline via Blob URL** (`createImageProcessingWorker()`) — JS puro com `processSketch()` (edge detection + BFS + tracing) e `processReveal()` (coloring dabs).
2. **API pública `generateStrokesFromImage(dataUrl, onProgress, options)`** — orquestra: decodifica imagem, resize 1920×1080, extrai `ImageData`, tenta Worker → fallback main thread.
3. **Fallback `processOnMainThread(imageData, width, height, resizedImage, onProgress, resolve, reject, signal?)`** — executa as duas fases com timeouts.

### `src/features/speed-paint/lib/vectorizer.ts` (criado na Fase 1.2)

Função pública: `vectorizeImage(imageData: ImageData, options?: VectorizeOptions): Promise<VetorialPath[]>`.
- `VectorizeOptions { preset?: VetorialPreset; pathomit?: number; strokeWidth?: number; defaultColor?: string; signal?: AbortSignal; }`
- Default `preset='artistic1'`.
- Lança `Error` se `ImageData` inválido; lança `DOMException('AbortError')` se abortado.

### `src/features/speed-paint/types/vetorial.ts` (criado na Fase 1.1)

Tipo `VetorialAnimation { id, canvasWidth, canvasHeight, canvasColor, paths, totalLength, fps, totalDurationMs, sourcePreset, resizedImage? }`.

### `src/features/speed-paint/types.ts` (modificado na Fase 1.3)

Re-exporta `SpeedPaintRenderMode`, `VetorialPreset`, `VetorialPath`, `VetorialAnimation`.

### `src/features/speed-paint/store/animationStore.ts` (modificado na Fase 1.3)

Tem `renderMode` (default `'mask'`) e `vetorialPreset` (default `'artistic1'`) no estado.

## Decisão técnica sobre o Worker (NÃO use Worker inline para vetorização)

O `imagetracerjs` é uma lib de ~290 KB de JS puro auto-contido. Carregá-la dentro de um Worker inline (Blob URL) é problemático porque:

- `importScripts` não funciona em Blob URLs sem URL de origem.
- Fazer fetch+inline do conteúdo da lib em runtime é frágil.
- Worker inline existe no projeto para edge detection (JS leve, código de ~250 linhas). Imagetracerjs é uma lib completa, não foi escrita para o padrão inline.

**Decisão técnica para esta task: vetorizar SOMENTE na main thread** (`processOnMainThreadVetorial`). Justificativas:

1. O `vectorizeImage` já tem yield interno via `async` e respeita `signal.aborted` a cada 50 paths — não bloqueia UI indefinidamente.
2. Vetorização de 1920×1080 demora < 500ms em hardware moderno — aceitável.
3. Elimina complexidade de carregar lib de 290 KB dentro do Worker.
4. **A Premissa #11 do tracker** ("Manter no Worker inline + criar processOnMainThreadVetorial() como fallback") é ambígua — interpreto como "vetorização no main thread, com a estrutura `processOnMainThread*` como função de fallback para o caso de o caminho principal falhar". Documente essa decisão com comentário no código.

**NÃO crie um `createVetorialWorker()` helper** — não há Worker inline para o modo vetorial.

## Tarefas

### 1. Adicionar imports em `imageProcessing.ts`

```typescript
import { vectorizeImage } from './vectorizer';
import type { VetorialAnimation, VetorialPreset } from '../types/vetorial';
import type { SpeedPaintRenderMode } from '../types';
```

### 2. Estender `GenerateStrokesOptions`

```typescript
export interface GenerateStrokesOptions {
  signal?: AbortSignal;
  /** Modo de renderização (default: 'mask' para retrocompatibilidade). */
  renderMode?: SpeedPaintRenderMode;
  /** Preset do imagetracerjs (usado só quando renderMode === 'vetorial'). */
  vetorialPreset?: VetorialPreset;
}
```

### 3. Modificar tipo de retorno de `generateStrokesFromImage`

De `Promise<StrokeAnimation>` para `Promise<StrokeAnimation | VetorialAnimation>`.

### 4. No `img.onload`, ANTES de criar o worker atual

Adicionar branch:
```typescript
const renderMode = options.renderMode ?? 'mask';
if (renderMode === 'vetorial') {
  // Chamar processVetorialOnMainThread (decisão técnica acima)
  processVetorialOnMainThread(
    imageData, width, height, resizedImage,
    vetorialPreset, onProgress, resolveOnce, rejectOnce, signal,
  );
  return; // não tenta criar worker mask
}
// ... fluxo mask atual (INTACTO)
```

### 5. Criar `processVetorialOnMainThread(imageData, width, height, resizedImage, preset, onProgress, resolve, reject, signal?)`

```typescript
async function processVetorialOnMainThread(
  imageData: ImageData,
  width: number,
  height: number,
  resizedImage: string,
  preset: VetorialPreset,
  onProgress: (p: number) => void,
  resolve: (value: VetorialAnimation) => void,
  reject: (error: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) {
    reject(new DOMException('Speed paint generation aborted', 'AbortError'));
    return;
  }
  try {
    onProgress(0.3);
    const paths = await vectorizeImage(imageData, { preset, signal });
    if (signal?.aborted) {
      reject(new DOMException('Speed paint generation aborted', 'AbortError'));
      return;
    }
    onProgress(0.8);
    const totalLength = paths.reduce((sum, p) => sum + p.length, 0);
    const totalDurationMs = Math.max(2000, paths.length * 80);
    const animation: VetorialAnimation = {
      id: Math.random().toString(36).substring(7),
      canvasWidth: width,
      canvasHeight: height,
      canvasColor: 'white',
      paths,
      totalLength,
      fps: 60,
      totalDurationMs,
      sourcePreset: preset,
      resizedImage,
    };
    onProgress(1.0);
    resolve(animation);
  } catch (err) {
    reject(err instanceof Error ? err : new Error(String(err)));
  }
}
```

### 6. GAP-03 do gap-finder (Fase 1.5)

O `PaintingJob.animation` é tipado como `StrokeAnimation | undefined` e precisa aceitar `VetorialAnimation`. Modificar `src/features/speed-paint/types.ts`:

```typescript
export interface PaintingJob {
  id: string;
  inputImage: string;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  animation?: StrokeAnimation | VetorialAnimation;  // ← estendido
}
```

## Restrições

- **NÃO** criar Worker inline para vetorização (decisão técnica acima).
- **NÃO** modificar lógica do `processOnMainThread` (mask).
- **NÃO** criar `createVetorialWorker()`.
- **NÃO** usar `any`.
- **NÃO** quebrar a API legada (consumidores sem `renderMode` continuam funcionando como antes).
- **NÃO** alterar `processOnMainThread` do mask.
- Comentários em pt-BR.
- Logger `createLogger('imageProcessing')` (já existe no arquivo).

## Validação

- `bun run typecheck` passa com 0 erros.
- `bun run lint` passa com 0 erros/warnings.
- `bun run test tests/speed-paint/imageProcessing.unit.test.ts` passa (verifica se o `generateStrokesFromImage` continua funcionando com e sem `renderMode`).
- Retorne mensagem final com: (a) resumo das mudanças, (b) saída dos 3 comandos acima, (c) qualquer decisão de implementação relevante.
