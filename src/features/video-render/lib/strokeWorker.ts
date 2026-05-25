/**
 * Web Worker condicional para processamento de strokes fora da main thread.
 *
 * Usa OffscreenCanvas + createImageBitmap (suportados em Chrome 94+ e Firefox 105+)
 * para executar edge detection, clustering BFS e vetorização sem bloquear a UI.
 *
 * O Worker NÃO usa document/Image/canvas DOM — apenas APIs disponíveis em Worker scope.
 * A lógica de processamento é idêntica à de imageProcessing.ts (linhas 42-285).
 */

import type { Stroke } from '../../speed-paint/types';
import { createLogger } from '../../../lib/logger';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Mensagem enviada ao Worker para processar uma cena */
export interface StrokeWorkerRequest {
  type: 'process';
  imageUrl: string;
  sceneIndex: number;
}

/** Mensagem de resultado do Worker */
export interface StrokeWorkerResult {
  type: 'result';
  strokes: Stroke[];
  canvasWidth: number;
  canvasHeight: number;
  revealThreshold: number;
  sceneIndex: number;
}

/** Mensagem de erro do Worker */
export interface StrokeWorkerError {
  type: 'error';
  error: string;
  sceneIndex: number;
}

export type StrokeWorkerResponse = StrokeWorkerResult | StrokeWorkerError;

// ---------------------------------------------------------------------------
// Detecção de suporte
// ---------------------------------------------------------------------------

/**
 * Verifica se o browser suporta Worker + OffscreenCanvas + createImageBitmap.
 * Retorna `false` em ambientes que não suportam (ex: SSR, navegadores antigos).
 */
export function supportsStrokeWorker(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function'
  );
}

// ---------------------------------------------------------------------------
// Código do Worker (inline como string para Blob URL)
// ---------------------------------------------------------------------------

/**
 * Lógica de processamento pesado — edge detection + clustering BFS + vetorização.
 * Idêntica à de imageProcessing.ts (PHASE 1 e PHASE 2), mas sem dependências DOM.
 *
 * Recebe ImageData e dimensões, retorna strokes + revealThreshold.
 */
function buildWorkerCode(): string {
  return `
    'use strict';

    // --- PHASE 1: Sketch (Edge Detection) ---
    function processSketch(imageData, width, height) {
      var data = imageData.data;
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

      // Ordenação espacial (top-to-bottom, left-to-right) para ordem humana
      clusters.sort(function(a, b) {
        var cyA = (a.minY + a.maxY) / 2;
        var cxA = (a.minX + a.maxX) / 2;
        var cyB = (b.minY + b.maxY) / 2;
        var cxB = (b.minX + b.maxX) / 2;
        return (cyA * 1000 + cxA) - (cyB * 1000 + cxB);
      });

      // Tracing e vetorização de cada cluster
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

    // --- PHASE 2: Reveal (Coloring) ---
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
    self.onmessage = async function(e) {
      var data = e.data;
      if (data.type !== 'process') return;

      var imageUrl = data.imageUrl;
      var sceneIndex = data.sceneIndex;

      try {
        // 1. Fetch da imagem (suporta blob: e data: URLs)
        var response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error('Falha ao buscar imagem: HTTP ' + response.status);
        }
        var blob = await response.blob();
        var bitmap = await createImageBitmap(blob);

        // 2. Resize para max 1920x1080
        var maxW = 1920;
        var maxH = 1080;
        var width = bitmap.width;
        var height = bitmap.height;

        if (width > maxW || height > maxH) {
          var ratio = Math.min(maxW / width, maxH / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // 3. OffscreenCanvas + getImageData
        var canvas = new OffscreenCanvas(width, height);
        var ctx = canvas.getContext('2d');

        // Fundo branco para PNGs transparentes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);

        var imageData = ctx.getImageData(0, 0, width, height);
        bitmap.close(); // Libera recursos do bitmap

        // 4. PHASE 1: Sketch
        var sketchResult = processSketch(imageData, width, height);
        var sketchStrokes = sketchResult.strokes;
        var sketchCount = sketchStrokes.length;
        var nextStrokeId = sketchResult.strokeId;

        // 5. PHASE 2: Reveal
        var revealResult = processReveal(width, height, nextStrokeId);
        var revealStrokes = revealResult.strokes;

        // Combina strokes (sketch + reveal)
        var allStrokes = sketchStrokes.concat(revealStrokes);
        var revealThreshold = sketchCount / allStrokes.length;

        // 6. Envia resultado de volta
        self.postMessage({
          type: 'result',
          strokes: allStrokes,
          canvasWidth: width,
          canvasHeight: height,
          revealThreshold: revealThreshold,
          sceneIndex: sceneIndex,
        });
      } catch (err) {
        self.postMessage({
          type: 'error',
          error: err.message || 'Erro desconhecido no Worker',
          sceneIndex: sceneIndex,
        });
      }
    };
  `;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

const log = createLogger('strokeWorker');

/**
 * Cria um Web Worker inline via Blob URL para processamento de strokes.
 *
 * O Worker usa OffscreenCanvas + createImageBitmap para rodar toda a lógica
 * pesada de edge detection/clustering/vetorização fora da main thread.
 *
 * @returns Instância do Worker pronta para receber mensagens
 * @throws Se Worker ou OffscreenCanvas não forem suportados
 */
export function createStrokeWorker(): Worker {
  if (!supportsStrokeWorker()) {
    throw new Error('Web Worker com OffscreenCanvas não é suportado neste navegador.');
  }

  const code = buildWorkerCode();
  const blob = new Blob([code], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  const worker = new Worker(url);

  // Limpa a Blob URL após criação — ela já foi carregada pelo Worker
  URL.revokeObjectURL(url);

  log.info('Stroke Worker criado');
  return worker;
}

/**
 * Encerra o Worker e libera recursos.
 *
 * @param worker - Instância do Worker a ser terminada
 */
export function terminateStrokeWorker(worker: Worker): void {
  worker.terminate();
  log.info('Stroke Worker encerrado');
}

/**
 * Processa uma única cena no Worker e retorna os strokes.
 *
 * Wrapper que envolve a comunicação postMessage/onmessage em uma Promise.
 *
 * @param worker - Instância do Worker ativa
 * @param imageUrl - URL da imagem (blob: ou data:)
 * @param sceneIndex - Índice da cena (usado para correlação)
 * @returns Resultado do processamento ou null se o Worker foi encerrado
 */
export function processSceneInWorker(
  worker: Worker,
  imageUrl: string,
  sceneIndex: number,
): Promise<StrokeWorkerResult | null> {
  return new Promise<StrokeWorkerResult | null>((resolve) => {
    const TIMEOUT_MS = 60_000;
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      terminateStrokeWorker(worker);
      log.warn('Worker timeout para cena', { sceneIndex });
      resolve(null);
    }, TIMEOUT_MS);

    const handler = (e: MessageEvent<StrokeWorkerResponse>) => {
      if (e.data.sceneIndex !== sceneIndex) return;

      if (!timedOut) {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', handler);

        if (e.data.type === 'result') {
          resolve(e.data);
        } else {
          log.warn('Worker falhou ao processar cena', {
            sceneIndex,
            error: (e.data as StrokeWorkerError).error,
          });
          resolve(null);
        }
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({
      type: 'process',
      imageUrl,
      sceneIndex,
    } satisfies StrokeWorkerRequest);
  });
}
