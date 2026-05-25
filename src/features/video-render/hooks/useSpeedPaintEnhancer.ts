/**
 * Hook React para geração centralizada de Speed Paint.
 *
 * Gerencia lifecycle automaticamente:
 * - Dispara quando scenes ou enabled mudam
 * - Cancela ao desmontar
 * - Cancela processo anterior quando scenes mudam
 *
 * Uso principal: VideoPreview (preview do player Remotion)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VideoScene } from '../types';
import { enhanceScenesWithSpeedPaint, type SpeedPaintEnhanceResult } from '../lib/speedPaintService';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface UseSpeedPaintEnhancerOptions {
  /** Se a geração está habilitada (default: true).
   *  Quando false, retorna as scenes sem modificação. */
  enabled?: boolean;
  /** Callback de progresso normalizado 0→1 */
  onProgress?: (progress: number) => void;
}

export interface UseSpeedPaintEnhancerResult {
  /** Cenas com strokeAnimation populado (ou scenes originais se disabled) */
  enhancedScenes: VideoScene[];
  /** Se está processando ativamente */
  isProcessing: boolean;
  /** Progresso normalizado 0→1 */
  progress: number;
  /** Warnings de cenas que falharam */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook React para geração de speed paint em componentes.
 *
 * Gerencia lifecycle automaticamente:
 * - Dispara quando scenes ou enabled mudam
 * - Cancela ao desmontar
 * - Cancela processo anterior quando scenes mudam
 *
 * @param scenes  Cenas a serem processadas
 * @param options Opções de enable e progresso
 * @returns Estado da geração (cenas, progresso, warnings)
 */
export function useSpeedPaintEnhancer(
  scenes: VideoScene[],
  options?: UseSpeedPaintEnhancerOptions,
): UseSpeedPaintEnhancerResult {
  const { enabled = true, onProgress } = options ?? {};

  const [result, setResult] = useState<SpeedPaintEnhanceResult>({
    scenes,
    warnings: [],
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const renderIdRef = useRef(0);

  const run = useCallback(
    async (currentScenes: VideoScene[], currentEnabled: boolean) => {
      if (!currentEnabled || currentScenes.length === 0) {
        setResult({ scenes: currentScenes, warnings: [] });
        setIsProcessing(false);
        setProgress(1);
        return;
      }

      // Aborta qualquer processo anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const currentRenderId = ++renderIdRef.current;
      setIsProcessing(true);
      setProgress(0);

      try {
        const enhanceResult = await enhanceScenesWithSpeedPaint(currentScenes, {
          onProgress: (p) => {
            if (renderIdRef.current !== currentRenderId) return;
            setProgress(p);
            onProgress?.(p);
          },
          signal: abortController.signal,
        });

        // Só atualiza se esta ainda é a renderização atual (proteção contra race condition)
        if (renderIdRef.current === currentRenderId) {
          setResult(enhanceResult);
          setProgress(1);
        }
      } catch {
        if (renderIdRef.current !== currentRenderId) return;
        // Em caso de erro, retorna cenas sem animação
        setResult({ scenes: currentScenes, warnings: ['Falha ao gerar speed paint.'] });
        setProgress(0);
      } finally {
        if (renderIdRef.current === currentRenderId) {
          setIsProcessing(false);
        }
      }
    },
    [onProgress],
  );

  useEffect(() => {
    void run(scenes, enabled);

    return () => {
      // Cleanup: aborta ao desmontar ou quando dependências mudam
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [scenes, enabled, run]);

  return {
    enhancedScenes: result.scenes,
    isProcessing,
    progress,
    warnings: result.warnings,
  };
}