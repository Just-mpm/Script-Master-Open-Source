import type { StrokeAnimation } from '../../speed-paint/types';
import type { SpeedPaintMultipliers } from '../types';
import { getStrokeAnimation, setStrokeAnimation } from './strokeCache';
import {
  createStrokeWorker,
  terminateStrokeWorker,
  processSceneInWorker,
  supportsStrokeWorker,
} from './strokeWorker';
import { createLogger } from '../../../lib/logger';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Fator de lentidão para a fase de reveal — torna o 1x do reveal 2x mais lento que linear */
const REVEAL_SPEED_SCALE = 0.5;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Opções para renderizar um frame de speed paint em canvas 2D */
export interface SpeedPaintFrameOptions {
  /** Dados da animação (strokes, dimensões, cor do canvas) */
  animation: StrokeAnimation;
  /** Elemento HTMLImage já carregado com a imagem original */
  imageElement: HTMLImageElement;
  /** Progresso da animação 0-1 */
  progress: number;
  /** Opacidade geral do frame 0-1 (usada para fade in/out) */
  opacity: number;
  /** Multiplicador de velocidade — number para global, SpeedPaintMultipliers para sketch/reveal separados */
  speedMultiplier?: number | SpeedPaintMultipliers;
}

/** Opções para geração de speed paint em lote */
export interface GenerateSpeedPaintOptions {
  /** Usar Web Worker para processamento (recomendado para >5 cenas) */
  useWorker?: boolean;
}

function adjustSpeedPaintProgress(normalized: number, speed: number): number {
  const clamped = Math.max(0, Math.min(1, normalized));

  return speed >= 1
    ? Math.min(1, clamped * speed)
    : Math.pow(clamped, 1 / speed);
}

export function getVisibleStrokeCount(
  animation: StrokeAnimation,
  progress: number,
  speedMultiplier?: number | SpeedPaintMultipliers,
): number {
  const totalStrokes = animation.strokes.length;
  const revealThreshold = animation.revealThreshold ?? 0.8;
  const sketchCount = Math.floor(revealThreshold * totalStrokes);
  const revealCount = totalStrokes - sketchCount;

  if (typeof speedMultiplier === 'number') {
    const adjustedProgress = adjustSpeedPaintProgress(progress, speedMultiplier);
    return Math.floor(adjustedProgress * totalStrokes);
  }

  if (speedMultiplier && sketchCount > 0 && revealCount > 0) {
    const sketchDuration = revealThreshold;
    const revealDuration = 1 - revealThreshold;
    const revealSpeed = speedMultiplier.reveal * REVEAL_SPEED_SCALE;

    if (progress < sketchDuration) {
      const sketchProgress = adjustSpeedPaintProgress(
        progress / sketchDuration,
        speedMultiplier.sketch,
      );
      return Math.floor(sketchProgress * sketchCount);
    }

    const revealProgress = adjustSpeedPaintProgress(
      (progress - sketchDuration) / revealDuration,
      revealSpeed,
    );
    return sketchCount + Math.floor(revealProgress * revealCount);
  }

  if (speedMultiplier) {
    const averageSpeed = (speedMultiplier.sketch + speedMultiplier.reveal * REVEAL_SPEED_SCALE) / 2;
    const adjustedProgress = adjustSpeedPaintProgress(progress, averageSpeed);
    return Math.floor(adjustedProgress * totalStrokes);
  }

  return Math.floor(Math.min(1, Math.max(0, progress)) * totalStrokes);
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Desenha um frame do speed paint em um canvas 2D.
 *
 * Função PURA e SINCRONA — segura para usar com useCurrentFrame() do Remotion.
 * Não usa requestAnimationFrame, Konva ou APIs assíncronas.
 *
 * Fluxo:
 * 1. Limpa o canvas principal e desenha a imagem original como base
 * 2. Prepara o buffer "whiteboard" (preenche com cor sólida)
 * 3. Desenha strokes visíveis no buffer (sketch sobre, reveal destination-out)
 * 4. Compor o buffer sobre o canvas principal (revela a imagem por baixo)
 *
 * @param ctx - Contexto 2D do canvas principal
 * @param buffer - Canvas offscreen para efeito whiteboard
 * @param options - Parâmetros do frame
 */
export function renderSpeedPaintFrame(
  ctx: CanvasRenderingContext2D,
  buffer: HTMLCanvasElement,
  options: SpeedPaintFrameOptions,
): void {
  const { animation, imageElement, progress, opacity, speedMultiplier } = options;
  const { canvasWidth, canvasHeight, canvasColor, strokes } = animation;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Desenhar imagem original como base (com opacidade do fade)
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(imageElement, 0, 0, canvasWidth, canvasHeight);

  // 2. Preparar buffer whiteboard — preenche com cor sólida
  const bCtx = buffer.getContext('2d');
  if (!bCtx) return;

  bCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  bCtx.globalCompositeOperation = 'source-over';
  bCtx.globalAlpha = 1;
  bCtx.fillStyle = canvasColor === 'white' ? '#ffffff' : '#000000';
  bCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 3. Desenhar strokes visíveis no buffer — progress ajustado pelo multiplicador de velocidade
  const visibleCount = getVisibleStrokeCount(animation, progress, speedMultiplier);

  if (visibleCount > 0) {
    bCtx.lineCap = 'round';
    bCtx.lineJoin = 'round';
    bCtx.globalAlpha = 1;

    // Agrupa strokes por tipo para minimizar trocas de compositeOperation
    let currentType = '';
    let currentStyle = '';
    let currentWidth = 0;
    let isDrawing = false;

    for (let i = 0; i < visibleCount; i++) {
      const stroke = strokes[i];
      const style = stroke.type === 'reveal'
        ? 'rgba(0,0,0,1)'
        : `rgba(${stroke.r},${stroke.g},${stroke.b},${stroke.alpha})`;

      // Troca de estilo — finaliza path anterior e inicia novo
      if (stroke.type !== currentType || style !== currentStyle || stroke.lineWidth !== currentWidth) {
        if (isDrawing) {
          bCtx.stroke();
        }
        bCtx.globalCompositeOperation = stroke.type === 'sketch' ? 'source-over' : 'destination-out';
        bCtx.strokeStyle = style;
        bCtx.lineWidth = stroke.lineWidth;
        bCtx.beginPath();
        currentType = stroke.type;
        currentStyle = style;
        currentWidth = stroke.lineWidth;
        isDrawing = true;
      }

      // Desenha o stroke (curva quadrática ou linha reta)
      bCtx.moveTo(stroke.points[0], stroke.points[1]);

      if (stroke.points.length >= 6) {
        bCtx.quadraticCurveTo(stroke.points[2], stroke.points[3], stroke.points[4], stroke.points[5]);
      } else if (stroke.points.length >= 4) {
        bCtx.lineTo(stroke.points[2], stroke.points[3]);
      }
    }

    // Finaliza último path
    if (isDrawing) {
      bCtx.stroke();
    }
  }

  // 4. Compor buffer sobre a imagem (revela a imagem por baixo do whiteboard)
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = opacity;
  ctx.drawImage(buffer, 0, 0);
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/**
 * Cria um canvas offscreen com as dimensões da animação.
 * Reutilizado a cada frame para o buffer whiteboard.
 */
export function createBufferCanvas(animation: StrokeAnimation): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = animation.canvasWidth;
  canvas.height = animation.canvasHeight;
  return canvas;
}

/**
 * Carrega uma imagem de forma assíncrona.
 * Retorna o elemento HTMLImageElement pronto para desenho.
 * Usa crossOrigin anonymous para compatibilidade com blob URLs.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src.substring(0, 100)}`));
    img.src = src;
  });
}

/**
 * Gera strokeAnimations para uma lista de cenas em paralelo.
 * Se a geração falhar para uma cena, retorna undefined para ela (graceful degradation).
 *
 * Estratégias de processamento:
 * - useWorker=true + >5 cenas + suporte disponível: Web Worker com OffscreenCanvas
 * - Caso contrário: batch async na main thread (fallback legado)
 *
 * Cache LRU (20 entradas): verifica cache antes de processar cada cena.
 *
 * @param scenes - Cenas com imageUrl
 * @param onProgress - Callback de progresso (0-1)
 * @param options - Configurações opcionais (useWorker)
 * @returns Array com animação e status de cada cena
 */
export async function generateScenesWithSpeedPaint(
  scenes: { imageUrl: string }[],
  onProgress?: (progress: number) => void,
  options?: GenerateSpeedPaintOptions,
): Promise<Array<{ animation: StrokeAnimation | undefined; sceneIndex: number; error?: string }>> {
  if (scenes.length === 0) return [];

  const log = createLogger('speedPaintRenderer');
  const useWorker = options?.useWorker ?? false;
  const canUseWorker = useWorker && supportsStrokeWorker() && scenes.length > 5;

  if (canUseWorker) {
    log.info('Usando Web Worker para processamento de strokes', { sceneCount: scenes.length });
    return generateWithWorker(scenes, onProgress);
  }

  log.info('Usando batch async para processamento de strokes', { sceneCount: scenes.length });
  return generateWithBatch(scenes, onProgress);
}

// ---------------------------------------------------------------------------
// Worker path — processa cenas sequencialmente no Worker
// ---------------------------------------------------------------------------

/**
 * Processa cenas usando Web Worker com OffscreenCanvas.
 * Cenas são processadas uma a uma no Worker (sequencial) para não sobrecarregar.
 * Verifica cache LRU antes de cada cena.
 */
async function generateWithWorker(
  scenes: { imageUrl: string }[],
  onProgress?: (progress: number) => void,
): Promise<Array<{ animation: StrokeAnimation | undefined; sceneIndex: number; error?: string }>> {
  const { generateStrokesFromImage } = await import('../../speed-paint/lib/imageProcessing');
  const results: Array<{ animation: StrokeAnimation | undefined; sceneIndex: number; error?: string }> =
    new Array(scenes.length);

  let worker: Worker | null = null;

  try {
    worker = createStrokeWorker();

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      // Verifica cache antes de processar
      const cached = await getStrokeAnimation(scene.imageUrl);
      if (cached) {
        results[i] = { animation: cached, sceneIndex: i };
        onProgress?.((i + 1) / scenes.length);
        continue;
      }

      // Processa no Worker
      const workerResult = await processSceneInWorker(worker, scene.imageUrl, i);

      if (workerResult) {
        // Monta StrokeAnimation com os dados do Worker
        const animation: StrokeAnimation = {
          id: Math.random().toString(36).substring(7),
          canvasWidth: workerResult.canvasWidth,
          canvasHeight: workerResult.canvasHeight,
          canvasColor: 'white',
          totalFrames: workerResult.strokes.length,
          fps: 60,
          totalDurationMs: Math.max(1000, workerResult.strokes.length * 8),
          revealThreshold: workerResult.revealThreshold,
          strokes: workerResult.strokes,
        };

        // Armazena no cache
        await setStrokeAnimation(scene.imageUrl, animation);
        results[i] = { animation, sceneIndex: i };
      } else {
        // Worker falhou — fallback para main thread
        try {
          const animation = await generateStrokesFromImage(scene.imageUrl, () => {});
          await setStrokeAnimation(scene.imageUrl, animation);
          results[i] = { animation, sceneIndex: i };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          results[i] = { animation: undefined, sceneIndex: i, error: message };
        }
      }

      onProgress?.((i + 1) / scenes.length);

      // Permite que a UI respire entre cenas processadas no Worker
      if (i < scenes.length - 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    }
  } finally {
    if (worker) {
      terminateStrokeWorker(worker);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Batch async path — processamento na main thread (fallback legado)
// ---------------------------------------------------------------------------

/**
 * Processa cenas em batches de 2 na main thread.
 * Verifica cache LRU antes de processar cada cena.
 */
async function generateWithBatch(
  scenes: { imageUrl: string }[],
  onProgress?: (progress: number) => void,
): Promise<Array<{ animation: StrokeAnimation | undefined; sceneIndex: number; error?: string }>> {
  const { generateStrokesFromImage } = await import('../../speed-paint/lib/imageProcessing');

  const BATCH_SIZE = 2;
  let completedCount = 0;
  const totalScenes = scenes.length;
  const results: Array<{ animation: StrokeAnimation | undefined; sceneIndex: number; error?: string }> =
    new Array(totalScenes);

  // Processa em batches de 2 cenas para não congelar a UI
  for (let batchStart = 0; batchStart < totalScenes; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, totalScenes);

    const batchResults = await Promise.all(
      scenes.slice(batchStart, batchEnd).map(async (scene, batchIndex) => {
        const sceneIndex = batchStart + batchIndex;

        // Verifica cache antes de processar
        const cached = await getStrokeAnimation(scene.imageUrl);
        if (cached) {
          return { animation: cached, sceneIndex };
        }

        try {
          const animation = await generateStrokesFromImage(scene.imageUrl, () => {
            // Progresso interno não é granular o suficiente — usamos contagem de cenas
          });
          // Armazena no cache para futuras reutilizações
          await setStrokeAnimation(scene.imageUrl, animation);
          return { animation, sceneIndex };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          return { animation: undefined, sceneIndex, error: message };
        }
      }),
    );

    // Armazena resultados do batch
    for (const result of batchResults) {
      results[result.sceneIndex] = result;
      completedCount++;
    }

    onProgress?.(completedCount / totalScenes);

    // Permite que a UI respire entre batches (a menos que seja o último batch)
    if (batchEnd < totalScenes) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  return results;
}
