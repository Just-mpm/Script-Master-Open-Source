import type { SpeedPaintRenderMode, Stroke, StrokeAnimation, VetorialAnimation, VetorialPreset } from '../types';
import type { VetorialPathSortOrder } from '../types/vetorial';
import { createLogger } from '../../../lib/logger';
import { filterPathsByBackgroundContrast, vectorizeImage } from './vectorizer';

const log = createLogger('imageProcessing');

// ---------------------------------------------------------------------------
// Web Worker inline para processamento pesado fora da main thread
// ---------------------------------------------------------------------------

/** Resultado enviado pelo worker via postMessage */
interface WorkerResult {
  strokes: Stroke[];
  revealThreshold: number;
  totalDurationMs: number;
}

/**
 * Cria um Web Worker inline via Blob URL para edge detection + BFS + vetorização.
 * Segue o mesmo padrão de strokeWorker.ts (video-render).
 */
function createImageProcessingWorker(): Worker {
  const workerCode = `
    'use strict';

    // --- PHASE 1: SKETCH (Edge Detection) ---
    function processSketch(imageData) {
      var data = imageData.data;
      var width = imageData.width;
      var height = imageData.height;
      var strokes = [];
      var strokeId = 0;

      // Conversão para grayscale
      var grayscale = new Uint8Array(width * height);
      for (var i = 0; i < data.length; i += 4) {
        grayscale[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }

      // Edge detection (diferença adjacente)
      var edges = new Uint8Array(width * height);
      for (var y = 0; y < height - 1; y++) {
        for (var x = 0; x < width - 1; x++) {
          var curr = grayscale[y * width + x];
          var right = grayscale[y * width + x + 1];
          var bottom = grayscale[(y + 1) * width + x];
          var diff = Math.abs(curr - right) + Math.abs(curr - bottom);
          if (diff > 20) {
            edges[y * width + x] = 1;
          }
        }
      }

      // BFS clustering de edges conectados
      var visitedEdges = new Uint8Array(width * height);
      var clusters = [];

      for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
          var idx = y * width + x;
          if (edges[idx] && !visitedEdges[idx]) {
            var queue = [idx];
            visitedEdges[idx] = 1;
            var clusterPixels = [];
            var minX = width;
            var minY = height;
            var maxX = 0;
            var maxY = 0;

            var head = 0;
            while (head < queue.length) {
              var currIdx = queue[head++];
              clusterPixels.push(currIdx);
              var cy = Math.floor(currIdx / width);
              var cx = currIdx % width;

              if (cx < minX) minX = cx;
              if (cx > maxX) maxX = cx;
              if (cy < minY) minY = cy;
              if (cy > maxY) maxY = cy;

              // 5x5 search para saltar gaps em linhas
              for (var dy = -2; dy <= 2; dy++) {
                for (var dx = -2; dx <= 2; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  var nx = cx + dx;
                  var ny = cy + dy;
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    var nIdx = ny * width + nx;
                    if (edges[nIdx] && !visitedEdges[nIdx]) {
                      visitedEdges[nIdx] = 1;
                      queue.push(nIdx);
                    }
                  }
                }
              }
            }

            if (clusterPixels.length > 15) {
              clusters.push({ pixels: clusterPixels, minX: minX, minY: minY, maxX: maxX, maxY: maxY });
            }
          }
        }
      }

      // Ordenação espacial (top-to-bottom, left-to-right)
      clusters.sort(function(a, b) {
        var cyA = (a.minY + a.maxY) / 2;
        var cxA = (a.minX + a.maxX) / 2;
        var cyB = (b.minY + b.maxY) / 2;
        var cxB = (b.minX + b.maxX) / 2;
        return (cyA * 1000 + cxA) - (cyB * 1000 + cxB);
      });

      // Tracing e vetorização
      var visitedForTracing = new Uint8Array(width * height);

      for (var c = 0; c < clusters.length; c++) {
        var cluster = clusters[c];
        for (var p = 0; p < cluster.pixels.length; p++) {
          var idx2 = cluster.pixels[p];
          if (!visitedForTracing[idx2]) {
            var cx2 = idx2 % width;
            var cy2 = Math.floor(idx2 / width);
            visitedForTracing[idx2] = 1;

            var path = [{ x: cx2, y: cy2 }];

            var continueTracing = true;
            while (continueTracing) {
              var found = false;
              for (var r = 1; r <= 2; r++) {
                for (var dy2 = -r; dy2 <= r; dy2++) {
                  for (var dx2 = -r; dx2 <= r; dx2++) {
                    if (dx2 === 0 && dy2 === 0) continue;
                    var nx2 = cx2 + dx2;
                    var ny2 = cy2 + dy2;
                    if (nx2 >= 0 && nx2 < width && ny2 >= 0 && ny2 < height) {
                      var nIdx2 = ny2 * width + nx2;
                      if (edges[nIdx2] && !visitedForTracing[nIdx2]) {
                        visitedForTracing[nIdx2] = 1;
                        cx2 = nx2;
                        cy2 = ny2;
                        path.push({ x: cx2, y: cy2 });
                        found = true;
                        break;
                      }
                    }
                  }
                  if (found) break;
                }
                if (found) break;
              }
              continueTracing = found;
            }

            // Simplificação e curvas orgânicas
            if (path.length > 2) {
              var stepSize = 5;
              var smoothedPath = [];
              for (var si = 0; si < path.length; si += stepSize) {
                smoothedPath.push(path[si]);
              }
              if (smoothedPath[smoothedPath.length - 1] !== path[path.length - 1]) {
                smoothedPath.push(path[path.length - 1]);
              }

              if (smoothedPath.length > 2) {
                var prevPt = smoothedPath[0];
                for (var pi = 1; pi < smoothedPath.length - 1; pi++) {
                  var currPt = smoothedPath[pi];
                  var nextPt = smoothedPath[pi + 1];

                  var midX = (currPt.x + nextPt.x) / 2;
                  var midY = (currPt.y + nextPt.y) / 2;

                  var pressure = Math.sin((pi / smoothedPath.length) * Math.PI);
                  var dynamicWidth = 0.8 + (pressure * 1.8);

                  strokes.push({
                    id: strokeId++,
                    layer: 0,
                    type: 'sketch',
                    points: [prevPt.x, prevPt.y, currPt.x, currPt.y, midX, midY],
                    lineWidth: dynamicWidth,
                    r: 40, g: 40, b: 40, alpha: 0.9,
                  });
                  prevPt = { x: midX, y: midY };
                }

                var lastPt = smoothedPath[smoothedPath.length - 1];
                strokes.push({
                  id: strokeId++,
                  layer: 0,
                  type: 'sketch',
                  points: [prevPt.x, prevPt.y, lastPt.x, lastPt.y],
                  lineWidth: 0.8,
                  r: 40, g: 40, b: 40, alpha: 0.9,
                });
              }
            }
          }
        }
      }

      return { strokes: strokes, strokeId: strokeId };
    }

    // --- PHASE 2: REVEAL (Coloring) ---
    function processReveal(width, height, startStrokeId) {
      var strokes = [];
      var brushSize = 45;

      var dabs = [];
      for (var y = -brushSize; y < height + brushSize; y += brushSize * 0.6) {
        for (var x = -brushSize; x < width + brushSize; x += brushSize * 0.6) {
          var rx = x + (Math.random() - 0.5) * brushSize * 0.5;
          var ry = y + (Math.random() - 0.5) * brushSize * 0.5;
          dabs.push({ x: rx, y: ry });
        }
      }

      dabs.sort(function(a, b) {
        var scoreA = a.y * 10 + a.x + (Math.random() * 300);
        var scoreB = b.y * 10 + b.x + (Math.random() * 300);
        return scoreA - scoreB;
      });

      for (var d = 0; d < dabs.length; d++) {
        var dab = dabs[d];
        var angle = (Math.random() - 0.5) * Math.PI / 3;
        var len = brushSize * (1 + Math.random() * 0.5);
        var ddx = Math.cos(angle) * len;
        var ddy = Math.sin(angle) * len;

        var ccx = dab.x + ddx / 2 + (Math.random() - 0.5) * 30;
        var ccy = dab.y + ddy / 2 + (Math.random() - 0.5) * 30;

        strokes.push({
          id: startStrokeId++,
          layer: 1,
          type: 'reveal',
          points: [dab.x, dab.y, ccx, ccy, dab.x + ddx, dab.y + ddy],
          lineWidth: brushSize * 1.8,
          r: 0, g: 0, b: 0, alpha: 1,
        });
      }

      return { strokes: strokes, strokeId: startStrokeId };
    }

    // --- Handler principal do Worker ---
    self.onmessage = function(e) {
      var imageData = e.data.imageData;
      var sketchResult = processSketch(imageData);
      var sketchStrokes = sketchResult.strokes;
      var nextStrokeId = sketchResult.strokeId;

      var revealResult = processReveal(imageData.width, imageData.height, nextStrokeId);
      var revealStrokes = revealResult.strokes;

      var allStrokes = sketchStrokes.concat(revealStrokes);
      var revealThreshold = sketchStrokes.length / allStrokes.length;

      self.postMessage({
        strokes: allStrokes,
        revealThreshold: revealThreshold,
        totalDurationMs: Math.max(1000, allStrokes.length * 8),
      });
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export interface GenerateStrokesOptions {
  signal?: AbortSignal;
  /** Modo de renderização (default: `'mask'` para retrocompatibilidade). */
  renderMode?: SpeedPaintRenderMode;
  /** Preset do `imagetracerjs` (usado só quando `renderMode === 'vetorial'`). */
  vetorialPreset?: VetorialPreset;
  /**
   * Ordem de desenho dos paths SVG (L9, RF-09). Usada só quando
   * `renderMode === 'vetorial'`. Quando omitida, o `vectorizeImage` mantém
   * a ordem original do `imagetracerjs`.
   */
  vetorialSortOrder?: VetorialPathSortOrder;
  /**
   * Threshold alto normalizado 0..1 para Canny no pipeline edge+bezier.
   * Usado só quando `renderMode === 'vetorial'` e o preset é da família
   * `edge-*`. Quando omitido, o `vectorizeImage` usa o valor default do preset.
   *
   * @see `EDGE_PRESET_CONFIG[preset].highThreshold`
   */
  edgeThreshold?: number;
  /**
   * Tolerância Ramer-Douglas-Peucker em pixels (pipeline edge+bezier).
   * Usada só quando `renderMode === 'vetorial'` e o preset é da família
   * `edge-*`. Quando omitida, o `vectorizeImage` usa o valor default do preset.
   *
   * @see `EDGE_PRESET_CONFIG[preset].epsilon`
   */
  contourEpsilon?: number;
}

function createAbortError(): DOMException {
  return new DOMException('Speed paint generation aborted', 'AbortError');
}

export async function generateStrokesFromImage(
  dataUrl: string,
  onProgress: (p: number) => void,
  options: GenerateStrokesOptions = {},
): Promise<StrokeAnimation | VetorialAnimation> {
  const { signal } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    let settled = false;
    let worker: Worker | null = null;

    const cleanupAbortListener = () => {
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
    };

    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanupAbortListener();
      reject(error);
    };

    const resolveOnce = (value: StrokeAnimation | VetorialAnimation) => {
      if (settled) return;
      settled = true;
      cleanupAbortListener();
      resolve(value);
    };

    const handleAbort = () => {
      worker?.terminate();
      worker = null;
      rejectOnce(createAbortError());
    };

    signal?.addEventListener('abort', handleAbort, { once: true });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (signal?.aborted) {
        rejectOnce(createAbortError());
        return;
      }

      try {
        await img.decode();
      } catch {
        rejectOnce(new Error('Falha ao decodificar imagem para speed paint'));
        return;
      }

      if (signal?.aborted) {
        rejectOnce(createAbortError());
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Resize to high resolution for quality (max 1920x1080)
      const maxW = 1920;
      const maxH = 1080;
      let width = img.width;
      let height = img.height;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Fill with white background first to handle transparent PNGs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      // Save the resized image to prevent holding massive 4K images in memory
      const resizedImage = canvas.toDataURL('image/jpeg', 0.9);

      // Extrai imageData na main thread (canvas não disponível no Worker sem OffscreenCanvas)
      const imageData = ctx.getImageData(0, 0, width, height);

      onProgress(0.3);

      // -------------------------------------------------------------------------
      // Branch: renderização vetorial (Fase 2.1)
      // -------------------------------------------------------------------------
      // O modo vetorial usa `imagetracerjs` (~290 KB de JS puro) para converter
      // pixels em paths SVG. NÃO é executado em Web Worker inline porque
      // `importScripts` não funciona em Blob URL e seria frágil inlinear uma
      // lib desse tamanho. A vetorização roda na main thread com yields via
      // `async` e respeita `signal.aborted` a cada 50 paths (no `vectorizer.ts`),
      // mantendo a UI responsiva. Imagens 1920×1080 vetorizam em < 500 ms em
      // hardware moderno — aceitável.
      const renderMode: SpeedPaintRenderMode = options.renderMode ?? 'mask';
      if (renderMode === 'vetorial') {
        const preset: VetorialPreset = options.vetorialPreset ?? 'artistic1';
        const sortOrder: VetorialPathSortOrder | undefined = options.vetorialSortOrder;
        processVetorialOnMainThread(
          imageData,
          width,
          height,
          resizedImage,
          preset,
          sortOrder,
          options.edgeThreshold,
          options.contourEpsilon,
          onProgress,
          resolveOnce,
          rejectOnce,
          signal,
        );
        return;
      }

      // Cria Worker e delega o processamento pesado
      try {
        worker = createImageProcessingWorker();
      } catch (workerError: unknown) {
        log.warn('Worker indisponível, usando fallback na main thread', { error: workerError });
        // Fallback: processa na main thread (comportamento original)
        processOnMainThread(imageData, width, height, resizedImage, onProgress, resolveOnce, rejectOnce, signal);
        return;
      }

      const handler = (e: MessageEvent<WorkerResult>) => {
        if (signal?.aborted) {
          worker?.removeEventListener('message', handler);
          worker?.terminate();
          worker = null;
          rejectOnce(createAbortError());
          return;
        }

        worker!.removeEventListener('message', handler);

        const result = e.data;
        onProgress(1.0);

        resolveOnce({
          id: Math.random().toString(36).substring(7),
          canvasWidth: width,
          canvasHeight: height,
          canvasColor: 'white',
          totalFrames: result.strokes.length,
          fps: 60,
          totalDurationMs: result.totalDurationMs,
          revealThreshold: result.revealThreshold,
          strokes: result.strokes,
          resizedImage,
        });

        worker!.terminate();
        worker = null;
      };

      worker.addEventListener('message', handler);

      // Envia pixels para o Worker processar
      worker.postMessage({ imageData: { data: imageData.data, width, height } });
      worker.onerror = (err: ErrorEvent) => {
        worker!.removeEventListener('message', handler);
        worker!.terminate();
        worker = null;
        log.error('Erro no Worker de image processing, usando fallback', { error: err.message });
        processOnMainThread(imageData, width, height, resizedImage, onProgress, resolveOnce, rejectOnce, signal);
      };
    };
    img.onerror = () => rejectOnce(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Processa vetorização na main thread via `vectorizeImage()`.
 *
 * ## Decisão técnica (Fase 2.1)
 *
 * Diferente do modo máscara (que tem Worker inline + fallback de main thread),
 * o modo vetorial **NÃO usa Worker inline** — o `imagetracerjs` é uma lib de
 * ~290 KB e `importScripts` não funciona em Blob URL sem origin. Vetorizar
 * direto na main thread é mais simples e suficiente: o `vectorizeImage` já é
 * `async` e checa `signal.aborted` a cada 50 paths, mantendo a UI responsiva.
 *
 * @param imageData   - Pixels extraídos do canvas (RGBA, `width × height`).
 * @param width       - Largura do canvas em pixels.
 * @param height      - Altura do canvas em pixels.
 * @param resizedImage - Data URL JPEG 0.9 (fallback/comparação na UI).
 * @param preset      - Preset do vetorizador (estilo da vetorização).
 * @param sortOrder   - Ordem de desenho dos paths (L9, RF-09). `undefined`
 *                       mantém a ordem original do vetorizador.
 * @param edgeThreshold - Threshold alto normalizado 0..1 para Canny
 *                       (pipeline edge+bezier, opcional).
 * @param contourEpsilon - Tolerância Ramer-Douglas-Peucker em pixels
 *                       (pipeline edge+bezier, opcional).
 * @param onProgress  - Callback de progresso (0.0–1.0).
 * @param resolve     - Resolve a Promise externa com a `VetorialAnimation`.
 * @param reject      - Rejeita a Promise externa com o erro ocorrido.
 * @param signal      - `AbortSignal` opcional para cancelamento cooperativo.
 */
async function processVetorialOnMainThread(
  imageData: ImageData,
  width: number,
  height: number,
  resizedImage: string,
  preset: VetorialPreset,
  sortOrder: VetorialPathSortOrder | undefined,
  edgeThreshold: number | undefined,
  contourEpsilon: number | undefined,
  onProgress: (p: number) => void,
  resolve: (value: VetorialAnimation) => void,
  reject: (error: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) {
    reject(createAbortError());
    return;
  }

  try {
    onProgress(0.3);

    // Vetorização pesada (síncrona dentro do `vectorizeImage`, mas exposta como
    // `Promise` com yields via `async` + checagem de abort a cada 50 paths).
    // O `vectorizeImage` decide o pipeline automaticamente: presets `edge-*`
    // usam o novo pipeline edge+bezier (v0.132.0) e os demais usam o legado
    // `imagetracerjs`. Options opcionais (`edgeThreshold`, `contourEpsilon`)
    // são repassadas para permitir tuning fino no pipeline edge+bezier.
    const rawPaths = await vectorizeImage(imageData, {
      preset,
      sortOrder,
      signal,
      edgeThreshold,
      contourEpsilon,
    });
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    // Filtra paths cuja cor é próxima do fundo do canvas. O `imagetracerjs`
    // inclui a cor de fundo na paleta quantizada — esses paths ficam
    // invisíveis (branco sobre branco / preto sobre preto) e o pencil
    // se move sem traço aparecer. Filtro transparente para imagens com
    // bom contraste.
    const paths = filterPathsByBackgroundContrast(rawPaths, 'white');

    onProgress(0.8);

    // Pré-calcula `totalLength` (soma dos comprimentos) e `totalDurationMs`
    // com base na quantidade de paths — recalibrado para o pipeline
    // edge+bezier (Leva 3.2 / D8 §10.4). A nova fórmula (3000ms base,
    // 120ms por path) compensa paths mais longos porém menos numerosos
    // gerados pelo Canny → RDP → Bezier (v0.132.0). A fórmula antiga
    // (2000ms base, 80ms/path) foi calibrada para o pipeline legado
    // `imagetracerjs` (v0.131.0).
    const totalLength = paths.reduce((sum, p) => sum + p.length, 0);
    const totalDurationMs = Math.max(3000, paths.length * 120);

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
    // Repassa `AbortError` e qualquer outro erro do `vectorizeImage`/`ensureNotAborted`
    reject(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Fallback: processa edge detection + BFS + vetorização na main thread.
 * Usado quando o Worker não está disponível ou falha.
 */
function processOnMainThread(
  imageData: ImageData,
  width: number,
  height: number,
  resizedImage: string,
  onProgress: (p: number) => void,
  resolve: (value: StrokeAnimation) => void,
  reject: (error: Error) => void,
  signal?: AbortSignal,
): void {
  const data = imageData.data;
  const strokes: Stroke[] = [];
  let strokeId = 0;
  let sketchTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let revealTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const abortIfNeeded = (): boolean => {
    if (!signal?.aborted) return false;
    reject(createAbortError());
    return true;
  };

  // Let UI update before heavy processing
  sketchTimeoutId = setTimeout(() => {
    if (abortIfNeeded()) return;

    // --- PHASE 1: SKETCH (Edge Detection) ---
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      if ((i & 4095) === 0 && abortIfNeeded()) return;
      grayscale[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }

    const edges = new Uint8Array(width * height);
    for (let y = 0; y < height - 1; y++) {
      if ((y & 15) === 0 && abortIfNeeded()) return;
      for (let x = 0; x < width - 1; x++) {
        const curr = grayscale[y * width + x];
        const right = grayscale[y * width + x + 1];
        const bottom = grayscale[(y + 1) * width + x];
        const diff = Math.abs(curr - right) + Math.abs(curr - bottom);
        if (diff > 20) {
          edges[y * width + x] = 1;
        }
      }
    }

    const visitedEdges = new Uint8Array(width * height);
    const clusters: Array<{ pixels: number[], minX: number, minY: number, maxX: number, maxY: number }> = [];

    for (let y = 0; y < height; y++) {
      if ((y & 15) === 0 && abortIfNeeded()) return;
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (edges[idx] && !visitedEdges[idx]) {
          const queue = [idx];
          visitedEdges[idx] = 1;
          const clusterPixels: number[] = [];
          let minX = width;
          let minY = height;
          let maxX = 0;
          let maxY = 0;

          let head = 0;
          while (head < queue.length) {
            const currIdx = queue[head++];
            clusterPixels.push(currIdx);
            const cy = Math.floor(currIdx / width);
            const cx = currIdx % width;

            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nIdx = ny * width + nx;
                  if (edges[nIdx] && !visitedEdges[nIdx]) {
                    visitedEdges[nIdx] = 1;
                    queue.push(nIdx);
                  }
                }
              }
            }
          }

          if (clusterPixels.length > 15) {
            clusters.push({ pixels: clusterPixels, minX, minY, maxX, maxY });
          }
        }
      }
    }

    clusters.sort((a, b) => {
      const cyA = (a.minY + a.maxY) / 2;
      const cxA = (a.minX + a.maxX) / 2;
      const cyB = (b.minY + b.maxY) / 2;
      const cxB = (b.minX + b.maxX) / 2;
      return (cyA * 1000 + cxA) - (cyB * 1000 + cxB);
    });

    const sketchSegments: Stroke[] = [];
    const visitedForTracing = new Uint8Array(width * height);

    for (const cluster of clusters) {
      for (const idx of cluster.pixels) {
        if (!visitedForTracing[idx]) {
          let cx = idx % width;
          let cy = Math.floor(idx / width);
          visitedForTracing[idx] = 1;

          const path: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];

          let continueTracing = true;
          while (continueTracing) {
            let found = false;
            for (let r = 1; r <= 2; r++) {
              for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = cx + dx;
                  const ny = cy + dy;
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (edges[nIdx] && !visitedForTracing[nIdx]) {
                      visitedForTracing[nIdx] = 1;
                      cx = nx;
                      cy = ny;
                      path.push({ x: cx, y: cy });
                      found = true;
                      break;
                    }
                  }
                }
                if (found) break;
              }
              if (found) break;
            }
            continueTracing = found;
          }

          if (path.length > 2) {
            const stepSize = 5;
            const smoothedPath: Array<{ x: number; y: number }> = [];
            for (let i = 0; i < path.length; i += stepSize) {
              smoothedPath.push(path[i]);
            }
            if (smoothedPath[smoothedPath.length - 1] !== path[path.length - 1]) {
              smoothedPath.push(path[path.length - 1]);
            }

            if (smoothedPath.length > 2) {
              let prevPt = smoothedPath[0];
              for (let i = 1; i < smoothedPath.length - 1; i++) {
                const currPt = smoothedPath[i];
                const nextPt = smoothedPath[i + 1];

                const midX = (currPt.x + nextPt.x) / 2;
                const midY = (currPt.y + nextPt.y) / 2;

                const progress = i / smoothedPath.length;
                const pressure = Math.sin(progress * Math.PI);
                const dynamicWidth = 0.8 + (pressure * 1.8);

                sketchSegments.push({
                  id: strokeId++,
                  layer: 0,
                  type: 'sketch',
                  points: [prevPt.x, prevPt.y, currPt.x, currPt.y, midX, midY],
                  lineWidth: dynamicWidth,
                  r: 40, g: 40, b: 40, alpha: 0.9,
                });
                prevPt = { x: midX, y: midY };
              }
              const lastPt = smoothedPath[smoothedPath.length - 1];
              sketchSegments.push({
                id: strokeId++,
                layer: 0,
                type: 'sketch',
                points: [prevPt.x, prevPt.y, lastPt.x, lastPt.y],
                lineWidth: 0.8,
                r: 40, g: 40, b: 40, alpha: 0.9,
              });
            }
          }
        }
      }
    }

    for (const seg of sketchSegments) strokes.push(seg);
    if (abortIfNeeded()) return;

    const sketchCount = strokes.length;
    onProgress(0.5);

    // --- PHASE 2: REVEAL (Coloring) ---
    revealTimeoutId = setTimeout(() => {
      if (abortIfNeeded()) return;

      const revealSegments: Stroke[] = [];
      const brushSize = 45;

      const dabs: Array<{ x: number; y: number }> = [];
      for (let y = -brushSize; y < height + brushSize; y += brushSize * 0.6) {
        for (let x = -brushSize; x < width + brushSize; x += brushSize * 0.6) {
          const rx = x + (Math.random() - 0.5) * brushSize * 0.5;
          const ry = y + (Math.random() - 0.5) * brushSize * 0.5;
          dabs.push({ x: rx, y: ry });
        }
      }

      dabs.sort((a, b) => {
        const scoreA = a.y * 10 + a.x + (Math.random() * 300);
        const scoreB = b.y * 10 + b.x + (Math.random() * 300);
        return scoreA - scoreB;
      });

      for (const dab of dabs) {
        if (revealSegments.length % 20 === 0 && abortIfNeeded()) return;
        const angle = (Math.random() - 0.5) * Math.PI / 3;
        const len = brushSize * (1 + Math.random() * 0.5);
        const dx = Math.cos(angle) * len;
        const dy = Math.sin(angle) * len;

        const cx = dab.x + dx / 2 + (Math.random() - 0.5) * 30;
        const cy = dab.y + dy / 2 + (Math.random() - 0.5) * 30;

        revealSegments.push({
          id: strokeId++,
          layer: 1,
          type: 'reveal',
          points: [dab.x, dab.y, cx, cy, dab.x + dx, dab.y + dy],
          lineWidth: brushSize * 1.8,
          r: 0, g: 0, b: 0, alpha: 1,
        });
      }

      for (const seg of revealSegments) strokes.push(seg);
      if (abortIfNeeded()) return;
      onProgress(1.0);

      const revealThreshold = sketchCount / strokes.length;

      resolve({
        id: Math.random().toString(36).substring(7),
        canvasWidth: width,
        canvasHeight: height,
        canvasColor: 'white',
        totalFrames: strokes.length,
        fps: 60,
        totalDurationMs: Math.max(1000, strokes.length * 8),
        revealThreshold,
        strokes,
        resizedImage,
      });
    }, 50);
  }, 50);

  signal?.addEventListener('abort', () => {
    if (sketchTimeoutId) {
      clearTimeout(sketchTimeoutId);
      sketchTimeoutId = null;
    }
    if (revealTimeoutId) {
      clearTimeout(revealTimeoutId);
      revealTimeoutId = null;
    }
  }, { once: true });
}
