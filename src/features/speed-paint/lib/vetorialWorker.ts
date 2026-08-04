/**
 * Web Worker para pipeline edge+bezier do modo vetorial do Speed Paint.
 *
 * ## Por que existe
 *
 * O pipeline edge+bezier (Canny → Moore-Neighbor → RDP → Schneider) é
 * computacionalmente pesado. Rodar na main thread bloqueia a UI e limita
 * o número de paths gerados (`computeMaxPaths`). Movendo o pipeline pro
 * Worker, a UI fica responsiva e o número de paths deixa de ser limitado
 * artificialmente — a memoização do `strokeCache.ts` evita reprocessar.
 *
 * ## Por que Worker de módulo
 *
 * Usa `new Worker(new URL('./vetorialWorker.ts', import.meta.url), { type: 'module' })`
 * — padrão moderno do Vite que resolve imports TS automaticamente. Diferente
 * do Worker inline do `imageProcessing.ts` (que reimplementa tudo em string),
 * este aproveita o código de `vectorizer.ts`, `edgeDetection.ts`,
 * `contourTracing.ts` e `bezierFitting.ts` diretamente.
 *
 * ## Limitações
 *
 * O modo legado (`imagetracerjs`) **NÃO** é executado aqui — a lib depende
 * de `importScripts`/window que não funcionam em Worker. O modo legado
 * continua na main thread (comportamento v0.131.0 preservado).
 *
 * @see `src/features/speed-paint/lib/imageProcessing.ts` — orquestrador
 * @see `src/features/speed-paint/lib/vectorizer.ts` — pipeline vetorial
 */

import type { VetorialAnimation, VetorialPath, VetorialPreset } from '../types';
import type { VetorialPathSortOrder } from '../types/vetorial';
import { vectorizeImage } from './vectorizer';
import { filterPathsByBackgroundContrast } from './vectorizer';

// ---------------------------------------------------------------------------
// Tipos de mensagem
// ---------------------------------------------------------------------------

export interface VetorialWorkerRequest {
  type: 'process';
  imageData: ImageData;
  width: number;
  height: number;
  preset: VetorialPreset;
  sortOrder?: VetorialPathSortOrder;
  edgeThreshold?: number;
  contourEpsilon?: number;
  canvasColor: 'white' | 'black';
  /** Data URL JPEG 0.9 (resized) — repassado como `resizedImage` no resultado. */
  resizedImage: string;
}

export interface VetorialWorkerResult {
  type: 'result';
  animation: VetorialAnimation;
}

export interface VetorialWorkerError {
  type: 'error';
  error: string;
}

export interface VetorialWorkerProgress {
  type: 'progress';
  ratio: number;
}

export type VetorialWorkerResponse =
  | VetorialWorkerResult
  | VetorialWorkerError
  | VetorialWorkerProgress;

// ---------------------------------------------------------------------------
// Detecção de suporte
// ---------------------------------------------------------------------------

/**
 * Verifica se o browser suporta Worker com módulos ES (padrão Vite).
 * Retorna `false` em SSR ou navegadores sem suporte a `import` em Worker.
 */
export function supportsVetorialWorker(): boolean {
  return typeof Worker !== 'undefined';
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

self.onmessage = async (e: MessageEvent<VetorialWorkerRequest>): Promise<void> => {
  const msg = e.data;

  if (msg.type !== 'process') {
    return;
  }

  try {
    // 1. Vetorização (pipeline edge+bezier OU legado, decidido pelo preset)
    const rawPaths: VetorialPath[] = await vectorizeImage(
      { data: msg.imageData.data, width: msg.width, height: msg.height } as ImageData,
      {
        preset: msg.preset,
        sortOrder: msg.sortOrder,
        edgeThreshold: msg.edgeThreshold,
        contourEpsilon: msg.contourEpsilon,
        // v0.135.2 (W4): propaga canvasColor para o `filterPathsByBackgroundContrast`
        // interno do pipeline edge+bezier. Sem isso, fundo preto + path
        // claro = path removido como "invisível".
        canvasColor: msg.canvasColor,
      },
    );

    self.postMessage({ type: 'progress', ratio: 0.7 } satisfies VetorialWorkerProgress);

    // 2. Filtra paths invisíveis (cor próxima do fundo)
    const paths = filterPathsByBackgroundContrast(rawPaths, msg.canvasColor);

    self.postMessage({ type: 'progress', ratio: 0.85 } satisfies VetorialWorkerProgress);

    // 3. Calcula totalLength + totalDurationMs
    const totalLength = paths.reduce((sum, p) => sum + p.length, 0);
    const totalDurationMs = Math.max(3000, paths.length * 120);

    const animation: VetorialAnimation = {
      id: Math.random().toString(36).substring(7),
      canvasWidth: msg.width,
      canvasHeight: msg.height,
      canvasColor: msg.canvasColor,
      paths,
      totalLength,
      fps: 60,
      totalDurationMs,
      sourcePreset: msg.preset,
      resizedImage: msg.resizedImage,
    };

    self.postMessage({ type: 'progress', ratio: 1.0 } satisfies VetorialWorkerProgress);
    self.postMessage({ type: 'result', animation } satisfies VetorialWorkerResult);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', error } satisfies VetorialWorkerError);
  }
};
