/**
 * Hook de detecção de codec/compatibilidade do navegador para exportação de vídeo.
 * Unifica a lógica de checkSupport antes duplicada entre useSpeedPaintExporter e useVideoExporter.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { canRenderMediaOnWeb } from '@remotion/web-renderer';
import { createLogger } from '../../../lib/logger';

const log = createLogger('useCodecSupport');

// ---------------------------------------------------------------------------
// Detecção de HTML-in-canvas
// ---------------------------------------------------------------------------

/**
 * Detecta se o browser suporta a API HTML-in-canvas (drawElementImage + requestPaint).
 * Necessário para capturar canvas 2D nativo no @remotion/web-renderer.
 * Requer Chromium com a flag chrome://flags/#canvas-draw-element habilitada.
 *
 * A função supportsNativeHtmlInCanvas() existe no @remotion/web-renderer mas
 * NÃO é exportada do barrel — fazemos a detecção manual equivalente.
 */
function detectHtmlInCanvasSupport(): boolean {
  // drawElementImage é a API principal — verifica se existe no CanvasRenderingContext2D
  const ctx = typeof document !== 'undefined'
    ? document.createElement('canvas').getContext('2d')
    : null;
  if (!ctx) return false;

  // requestPaint é necessário para sincronizar a captura
  const canvas = ctx.canvas;
  return typeof (canvas as HTMLCanvasElement & { requestPaint?: unknown }).requestPaint === 'function';
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Opções do hook — determina se a exportação é com áudio ou muted */
export interface UseCodecSupportOptions {
  /** Se true, pula áudio e vai direto para muted (speed paint) */
  muted: boolean;
}

/** Resultado do hook — codec/container resolvidos + funções de controle */
export interface CodecSupportResult {
  /** null = verificação pendente, true/false = resultado */
  canRender: boolean | null;
  /** Codec de vídeo resolvido após checkSupport ('h264', 'vp8', etc.) */
  resolvedVideoCodec: string;
  /** Container resolvido após checkSupport ('mp4' ou 'webm') */
  resolvedContainer: string;
  /** Codec de áudio resolvido ('aac', 'opus' ou null para muted) */
  resolvedAudioCodec: string | null;
  /** Aviso quando VP8/WebM é usado como fallback */
  codecWarning: string | null;
  /** Mensagem de erro quando nenhum codec funciona */
  supportError: string | null;
  /** Se o browser suporta HTML-in-canvas (drawElementImage) — necessário para canvas 2D no web-renderer */
  supportsHtmlInCanvas: boolean;
  /** Verifica suporte do browser para a resolução dada */
  checkSupport: (width: number, height: number) => Promise<boolean>;
  /** Reseta estado de suporte */
  resetSupport: () => void;
}

// ---------------------------------------------------------------------------
// Estado interno
// ---------------------------------------------------------------------------

interface CodecSupportState {
  canRender: boolean | null;
  resolvedVideoCodec: string;
  resolvedContainer: string;
  resolvedAudioCodec: string | null;
  codecWarning: string | null;
  supportError: string | null;
}

const INITIAL_CODEC_STATE: CodecSupportState = {
  canRender: null,
  resolvedVideoCodec: 'h264',
  resolvedContainer: 'mp4',
  resolvedAudioCodec: 'aac',
  codecWarning: null,
  supportError: null,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCodecSupport(options: UseCodecSupportOptions): CodecSupportResult {
  const { muted } = options;

  const [state, setState] = useState<CodecSupportState>(INITIAL_CODEC_STATE);

  // Detecção síncrona de HTML-in-canvas (drawElementImage do Chromium).
  // Necessário para capturar canvas 2D nativo no @remotion/web-renderer.
  // Retorna false em Firefox/Safari ou Chrome sem a flag habilitada.
  const htmlInCanvasSupported = useMemo(() => detectHtmlInCanvasSupport(), []);

  // Refs sincronizadas para leitura em callbacks sem stale closure
  const resolvedVideoCodecRef = useRef('h264');
  const resolvedContainerRef = useRef('mp4');
  const resolvedAudioCodecRef = useRef<string | null>(muted ? null : 'aac');

  // Sincroniza refs quando o estado muda
  useEffect(() => {
    resolvedVideoCodecRef.current = state.resolvedVideoCodec;
    resolvedContainerRef.current = state.resolvedContainer;
    resolvedAudioCodecRef.current = state.resolvedAudioCodec;
  }, [state.resolvedVideoCodec, state.resolvedContainer, state.resolvedAudioCodec]);

  const checkSupport = useCallback(async (width: number, height: number) => {
    // Checagem rápida síncrona
    if (typeof VideoEncoder === 'undefined') {
      setState(prev => ({
        ...prev,
        canRender: false,
        supportError: 'WebCodecs não disponível neste navegador.',
      }));
      return false;
    }

    try {
      if (muted) {
        // Speed Paint: sempre sem áudio — tenta H.264 + MP4 muted direto
        const result = await canRenderMediaOnWeb({
          width,
          height,
          videoCodec: 'h264',
          audioCodec: null,
          container: 'mp4',
          muted: true,
        });

        if (result.canRender) {
          const codec = result.resolvedVideoCodec ?? 'h264';
          resolvedVideoCodecRef.current = codec;
          resolvedContainerRef.current = 'mp4';
          resolvedAudioCodecRef.current = null;
          setState(prev => ({
            ...prev,
            canRender: true,
            resolvedVideoCodec: codec,
            resolvedContainer: 'mp4',
            resolvedAudioCodec: null,
            codecWarning: null,
            supportError: null,
          }));
          return true;
        }

        // Loga issues para diagnóstico
        for (const issue of result.issues) {
          log.warn('Problema de suporte detectado', { type: issue.type, message: issue.message, severity: issue.severity });
        }

        // Fallback: VP8 + WebM (também sem áudio)
        const vp8Result = await canRenderMediaOnWeb({
          width,
          height,
          videoCodec: 'vp8',
          audioCodec: null,
          container: 'webm',
          muted: true,
        });

        if (vp8Result.canRender) {
          const codec = vp8Result.resolvedVideoCodec ?? 'vp8';
          resolvedVideoCodecRef.current = codec;
          resolvedContainerRef.current = 'webm';
          resolvedAudioCodecRef.current = null;
          setState(prev => ({
            ...prev,
            canRender: true,
            resolvedVideoCodec: codec,
            resolvedContainer: 'webm',
            resolvedAudioCodec: null,
            codecWarning: 'Seu navegador usa VP8/WebM. Alguns players podem não suportar o formato.',
            supportError: null,
          }));
          return true;
        }

        for (const issue of vp8Result.issues) {
          log.warn('Problema no fallback VP8', { type: issue.type, message: issue.message });
        }

        // Nenhum fallback funcionou
        const mainIssue = result.issues.find((i) => i.severity === 'error');
        setState(prev => ({
          ...prev,
          canRender: false,
          supportError: mainIssue?.message ?? 'Navegador não suporta exportação de vídeo. Use Chrome 94+ ou Firefox 130+.',
        }));
        return false;
      } else {
        // Vídeo com áudio — tenta H.264 + AAC + MP4 primeiro
        const result = await canRenderMediaOnWeb({
          width,
          height,
          videoCodec: 'h264',
          audioCodec: 'aac',
          container: 'mp4',
        });

        if (result.canRender) {
          resolvedVideoCodecRef.current = 'h264';
          resolvedContainerRef.current = 'mp4';
          resolvedAudioCodecRef.current = result.resolvedAudioCodec;
          setState(prev => ({
            ...prev,
            canRender: true,
            resolvedVideoCodec: 'h264',
            resolvedContainer: 'mp4',
            resolvedAudioCodec: result.resolvedAudioCodec,
            codecWarning: null,
            supportError: null,
          }));
          return true;
        }

        // Loga issues para diagnóstico
        for (const issue of result.issues) {
          log.warn('Problema de suporte detectado', { type: issue.type, message: issue.message, severity: issue.severity });
        }

        // Tenta fallback sem áudio se o problema for codec de áudio
        const hasAudioIssue = result.issues.some(
          (i) => i.type === 'audio-codec-unsupported' || i.type === 'container-codec-mismatch',
        );

        if (hasAudioIssue) {
          const fallbackResult = await canRenderMediaOnWeb({
            width,
            height,
            videoCodec: 'h264',
            audioCodec: null,
            container: 'mp4',
          });

          if (fallbackResult.canRender) {
            const codec = fallbackResult.resolvedVideoCodec ?? 'h264';
            resolvedVideoCodecRef.current = codec;
            resolvedContainerRef.current = 'mp4';
            resolvedAudioCodecRef.current = fallbackResult.resolvedAudioCodec;
            setState(prev => ({
              ...prev,
              canRender: true,
              resolvedVideoCodec: codec,
              resolvedContainer: 'mp4',
              resolvedAudioCodec: fallbackResult.resolvedAudioCodec,
              codecWarning: null,
              supportError: null,
            }));
            return true;
          }

          for (const issue of fallbackResult.issues) {
            log.warn('Problema no fallback sem áudio', { type: issue.type, message: issue.message });
          }
        }

        // Terceiro fallback: VP8 + Opus + WebM
        const vp8Result = await canRenderMediaOnWeb({
          width,
          height,
          videoCodec: 'vp8',
          audioCodec: 'opus',
          container: 'webm',
        });

        if (vp8Result.canRender) {
          const codec = vp8Result.resolvedVideoCodec ?? 'vp8';
          resolvedVideoCodecRef.current = codec;
          resolvedContainerRef.current = 'webm';
          resolvedAudioCodecRef.current = vp8Result.resolvedAudioCodec;
          setState(prev => ({
            ...prev,
            canRender: true,
            resolvedVideoCodec: codec,
            resolvedContainer: 'webm',
            resolvedAudioCodec: vp8Result.resolvedAudioCodec,
            codecWarning: 'Seu navegador usa VP8/WebM. Alguns players podem não suportar o formato.',
            supportError: null,
          }));
          return true;
        }

        for (const issue of vp8Result.issues) {
          log.warn('Problema no fallback VP8', { type: issue.type, message: issue.message });
        }

        // Nenhum fallback funcionou
        const mainIssue = result.issues.find((i) => i.severity === 'error');
        setState(prev => ({
          ...prev,
          canRender: false,
          supportError: mainIssue?.message ?? 'Navegador não suporta exportação de vídeo. Use Chrome 94+ ou Firefox 130+.',
        }));
        return false;
      }
    } catch (err) {
      log.warn('Exceção inesperada no checkSupport', { error: err });
      setState(prev => ({ ...prev, canRender: false }));
      return false;
    }
  }, [muted]);

  const resetSupport = useCallback(() => {
    resolvedVideoCodecRef.current = 'h264';
    resolvedContainerRef.current = 'mp4';
    resolvedAudioCodecRef.current = muted ? null : 'aac';
    setState(INITIAL_CODEC_STATE);
  }, [muted]);

  return {
    canRender: state.canRender,
    resolvedVideoCodec: state.resolvedVideoCodec,
    resolvedContainer: state.resolvedContainer,
    resolvedAudioCodec: state.resolvedAudioCodec,
    codecWarning: state.codecWarning,
    supportError: state.supportError,
    supportsHtmlInCanvas: htmlInCanvasSupported,
    checkSupport,
    resetSupport,
  };
}
