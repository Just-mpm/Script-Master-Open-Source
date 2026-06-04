/**
 * Serviço centralizado de geração de Speed Paint.
 *
 * ÚNICO ponto de geração de speed paint no projeto.
 * Orquestra generateScenesWithSpeedPaint() com:
 * - Verificação de cache LRU por cena (via strokeCache.ts)
 * - Worker por chamada (cria/destrói a cada batch — simples e seguro)
 * - Coleta padronizada de warnings
 * - Cancelamento cooperativo via AbortSignal
 * - Proteção contra race condition via ignore flag
 * - Progresso normalizado 0→1
 *
 * Usado por:
 * - useSpeedPaintEnhancer() — preview no VideoPreview
 * - startRender() — exportação no useVideoExporter
 */

import type { VideoScene } from '../types';
import { generateScenesWithSpeedPaint } from './speedPaintRenderer';
import { createLogger } from '../../../lib/logger';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface SpeedPaintEnhanceOptions {
  /** Callback de progresso normalizado 0→1 (chamado a cada cena processada) */
  onProgress?: (progress: number) => void;
  /** Sinal para cancelamento cooperativo (AbortController.signal) */
  signal?: AbortSignal;
}

export interface SpeedPaintEnhanceResult {
  /** Cenas originais com strokeAnimation populado onde disponível.
   *  Cenas que falharam ficam sem o campo (undefined). */
  scenes: VideoScene[];
  /** Avisos para cenas que falharam.
   *  Formato: "Cena 3: Falha ao carregar imagem" */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const log = createLogger('speedPaintService');

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Ponto ÚNICO de geração de speed paint no projeto.
 *
 * Orquestra generateScenesWithSpeedPaint() com:
 * - Verificação de cache LRU por cena (via strokeCache.ts)
 * - Worker por chamada (cria/destrói a cada batch — simples e seguro)
 * - Coleta padronizada de warnings
 * - Cancelamento cooperativo via AbortSignal
 * - Proteção contra race condition via ignore flag
 * - Progresso normalizado 0→1
 *
 * @param scenes  Cenas a serem processadas (imageUrl obrigatório)
 * @param options Opções de progresso e cancelamento
 * @returns Cenas com strokeAnimation + warnings
 */
export async function enhanceScenesWithSpeedPaint(
  scenes: VideoScene[],
  options?: SpeedPaintEnhanceOptions,
): Promise<SpeedPaintEnhanceResult> {
  if (scenes.length === 0) {
    return { scenes: [], warnings: [] };
  }

  const { onProgress, signal } = options ?? {};
  const warnings: string[] = [];

  // Proteção contra race condition: se outra chamada iniciar, esta deve ser ignorada
  let ignore = false;

  // Escuta o AbortSignal para permitir cancelamento cooperativo
  if (signal) {
    if (signal.aborted) {
      return { scenes, warnings: ['Operação cancelada antes de iniciar.'] };
    }

    signal.addEventListener('abort', () => {
      ignore = true;
      log.info('enhanceScenesWithSpeedPaint abortado pelo sinal');
    }, { once: true });
  }

  try {
    const results = await generateScenesWithSpeedPaint(
      scenes.map((scene) => ({ imageUrl: scene.imageUrl })),
      onProgress,
      { useWorker: true },
    );

    // Se foi abortado durante o processamento, ignora resultados
    if (ignore) {
      log.info('Resultados ignorados ( race condition ou abort )');
      return { scenes, warnings: ['Operação cancelada durante o processamento.'] };
    }

    const enhancedScenes = scenes.map((scene, index) => {
      const result = results[index];

      if (result?.error) {
        warnings.push(`Cena ${index + 1 }: ${result.error}`);
      }

      return {
        ...scene,
        strokeAnimation: result?.animation,
      };
    });

    return { scenes: enhancedScenes, warnings };
  } catch (err) {
    // Erro geral: mapa de warnings já foi populado parcialmente?
    log.warn('Falha geral em enhanceScenesWithSpeedPaint', { error: err });

    if (ignore) {
      return { scenes, warnings: ['Operação cancelada durante o processamento.'] };
    }

    // Retorna cenas sem animação — fallback natural é SceneSequence
    return {
      scenes,
      warnings: [...warnings, 'Falha geral ao gerar animações de speed paint.'],
    };
  }
}