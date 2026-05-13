/**
 * Hook de exportação simplificado para speed paint.
 * Sem áudio, sem multi-cena, sem salvamento em projeto.
 * Baseado em useVideoExporter, mas otimizado para exportação de animação única.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { renderMediaOnWeb } from '@remotion/web-renderer';
import type { RenderMediaOnWebProgress } from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import { SpeedPaintScene } from '../../video-render/components/SpeedPaintScene';
import type { StrokeAnimation } from '../types';
import type { VideoExportQuality } from '../../video-render/types';
import { patchCanvasFontStretch } from '../../video-render/lib/canvasFontStretchPatch';
import { isCancellationError, toUserFriendlyError } from '../../video-render/lib/exportUtils';
import { useCodecSupport } from '../../video-render/hooks/useCodecSupport';
import { downloadFile } from '../../../lib/download';
import { createLogger } from '../../../lib/logger';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Opções para iniciar a exportação de speed paint */
export interface SpeedPaintExportOptions {
  animation: StrokeAnimation;
  imageSource: string;
  fps: number;
  /** Duração total em frames */
  durationInFrames: number;
  quality: VideoExportQuality;
  drawSpeed: number;
  paintSpeed: number;
  showDrawTool?: boolean;
  fileName?: string;
}

export interface SpeedPaintExporterState {
  isRendering: boolean;
  renderProgress: number; // 0-100
  renderStatusText: string;
  outputBlob: Blob | null;
  outputUrl: string | null;
  error: string | null;
  /** null = verificação pendente, true/false = resultado */
  canRender: boolean | null;
  /** Codec de vídeo resolvido após checkSupport ('h264', 'vp8', etc.) */
  resolvedVideoCodec: string;
  /** Container resolvido após checkSupport ('mp4' ou 'webm') */
  resolvedContainer: string;
}

const INITIAL_STATE: SpeedPaintExporterState = {
  isRendering: false,
  renderProgress: 0,
  renderStatusText: '',
  outputBlob: null,
  outputUrl: null,
  error: null,
  canRender: null,
  resolvedVideoCodec: 'h264',
  resolvedContainer: 'mp4',
};

// ---------------------------------------------------------------------------
// Resolução
// ---------------------------------------------------------------------------

/**
 * Qualidade → "lado maior" em pixels.
 * Speed paint não suporta 4K — usa no máximo 2560px (1440p).
 */
const QUALITY_TO_LONGER_SIDE: Record<VideoExportQuality, number> = {
  '720p': 1280,
  '1080p': 1920,
  '1440p': 2560,
  '4k': 3840,
};

/**
 * Calcula a resolução de exportação baseada nas dimensões do canvas da animação
 * e na qualidade selecionada. Mantém a proporção original e garante dimensões pares.
 */
export function getSpeedPaintResolution(
  canvasWidth: number,
  canvasHeight: number,
  quality: VideoExportQuality,
): { width: number; height: number } {
  const longerSide = QUALITY_TO_LONGER_SIDE[quality];
  const aspectRatio = canvasWidth / canvasHeight;

  let width: number;
  let height: number;

  if (aspectRatio >= 1) {
    // Landscape ou quadrado — largura é o lado maior
    width = longerSide;
    height = Math.round(longerSide / aspectRatio);
  } else {
    // Portrait — altura é o lado maior
    height = longerSide;
    width = Math.round(longerSide * aspectRatio);
  }

  // Garante dimensões pares (necessário para codecs de vídeo H.264/VP8)
  width = width & ~1;
  height = height & ~1;

  return { width: Math.max(width, 2), height: Math.max(height, 2) };
}

// ---------------------------------------------------------------------------
// Compatibilidade de tipos com renderMediaOnWeb
// ---------------------------------------------------------------------------

/** Props da composição de speed paint para exportação */
interface SpeedPaintCompositionProps {
  animation: StrokeAnimation;
  imageSource: string;
  drawSpeed: number;
  paintSpeed: number;
  showDrawTool: boolean;
}

/**
 * Wrapper que satisfaz a constraint Props extends Record<string, unknown>
 * do renderMediaOnWeb. Renderiza SpeedPaintScene com isExporting=true
 * para desabilitar overlays de debug na exportação.
 */
type ExportableSpeedPaintProps = SpeedPaintCompositionProps & { [key: string]: unknown };

function ExportableSpeedPaintComposition(props: ExportableSpeedPaintProps): React.ReactNode {
  const { animation, imageSource, drawSpeed, paintSpeed, showDrawTool } = props;
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
      <SpeedPaintScene
        animation={animation}
        imageSource={imageSource}
        durationInFrames={durationInFrames}
        drawSpeed={drawSpeed}
        paintSpeed={paintSpeed}
        showDrawTool={showDrawTool}
        isLastScene
        isExporting
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const log = createLogger('useSpeedPaintExporter');

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpeedPaintExporter() {
  const [state, setState] = useState<SpeedPaintExporterState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  /** Identifica qual renderização é a atual — evita que catch/finally de renders antigos corrompam estado */
  const renderIdRef = useRef(0);
  const outputUrlRef = useRef<string | null>(null);
  /** Último percentual reportado — evita re-renders quando o inteiro não mudou */
  const lastReportedPercentRef = useRef(-1);
  /** Nome do arquivo para download */
  const exportFileNameRef = useRef<string>('');
  /** Refs para leitura de codec/container em callbacks sem stale closure */
  const resolvedVideoCodecRef = useRef<string>('h264');
  const resolvedContainerRef = useRef<string>('mp4');

  // Detecção de codecs via hook unificado (muted = sem áudio)
  const codecSupport = useCodecSupport({ muted: true });

  // Sincroniza canRender e codec do hook para o estado do exporter
  useEffect(() => {
    setState(prev => ({
      ...prev,
      canRender: codecSupport.canRender,
      resolvedVideoCodec: codecSupport.resolvedVideoCodec,
      resolvedContainer: codecSupport.resolvedContainer,
      // Mapeia supportError para error (só quando não está renderizando)
      error: prev.isRendering ? prev.error : (codecSupport.supportError ?? prev.error),
    }));
  }, [codecSupport.canRender, codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer, codecSupport.supportError]);

  // Mantém refs sincronizadas para uso em callbacks sem stale closure
  useEffect(() => {
    outputUrlRef.current = state.outputUrl;
    resolvedVideoCodecRef.current = state.resolvedVideoCodec;
    resolvedContainerRef.current = state.resolvedContainer;
  }, [state.outputUrl, state.resolvedVideoCodec, state.resolvedContainer]);

  // Cleanup de blob URL ao desmontar e aborta renderização em andamento
  useEffect(() => {
    return () => {
      const url = outputUrlRef.current;
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Verifica suporte do browser (delegado ao hook useCodecSupport)
  // -------------------------------------------------------------------------
  // Ref estável para checkSupport — evita re-criação do callback
  const checkSupportRef = useRef(codecSupport.checkSupport);
  useEffect(() => {
    checkSupportRef.current = codecSupport.checkSupport;
  }, [codecSupport.checkSupport]);

  const checkSupport = useCallback(async (width: number, height: number) => {
    await checkSupportRef.current(width, height);
  }, []);

  // -------------------------------------------------------------------------
  // Inicia renderização via WebCodecs (sem áudio)
  // -------------------------------------------------------------------------
  const startRender = useCallback(async (options: SpeedPaintExportOptions) => {
    const {
      animation,
      imageSource,
      fps,
      durationInFrames,
      quality,
      drawSpeed,
      paintSpeed,
      showDrawTool = false,
      fileName,
    } = options;

    // Identifica esta renderização — catch/finally antigos serão ignorados
    const renderId = ++renderIdRef.current;

    // Grava o nome do arquivo antes de qualquer reset de estado
    exportFileNameRef.current = fileName || '';

    if (!imageSource) return;

    // Previne dupla renderização — aborta a anterior se existir
    if (abortControllerRef.current) {
      log.warn('Renderização já em andamento — abortando anterior antes de iniciar nova');
      abortControllerRef.current.abort();
    }

    // Entra em modo renderização imediatamente
    setState({
      ...INITIAL_STATE,
      canRender: true,
      isRendering: true,
      renderProgress: 0,
      renderStatusText: 'Preparando exportação...',
    });

    const resolution = getSpeedPaintResolution(animation.canvasWidth, animation.canvasHeight, quality);

    // Cria AbortController ANTES da renderização para permitir cancelamento
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Monta inputProps com tipo compatível com Record<string, unknown>
    const exportableInputProps: ExportableSpeedPaintProps = {
      animation,
      imageSource,
      drawSpeed,
      paintSpeed,
      showDrawTool,
    };

    // Revoga URL anterior
    const prevUrl = outputUrlRef.current;
    if (prevUrl && prevUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prevUrl);
    }

    setState(prev => ({
      ...prev,
      renderProgress: 0,
      renderStatusText: 'Iniciando renderização...',
    }));

    try {
      // Aplica patch que traduz fontStretch percentual → keyword para a Canvas API
      patchCanvasFontStretch();

      // Reseta o throttle de percentual para nova renderização
      lastReportedPercentRef.current = -1;

      const composition: {
        component: ComponentType<ExportableSpeedPaintProps>;
        id: string;
        width: number;
        height: number;
        fps: number;
        durationInFrames: number;
        defaultProps: ExportableSpeedPaintProps;
      } = {
        component: ExportableSpeedPaintComposition,
        id: 'script-master-speed-paint-export',
        width: resolution.width,
        height: resolution.height,
        fps,
        durationInFrames,
        defaultProps: exportableInputProps,
      };

      const result = await renderMediaOnWeb({
        composition,
        inputProps: exportableInputProps,
        videoCodec: resolvedVideoCodecRef.current as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1',
        audioCodec: null, // Sem áudio — speed paint é mute
        container: resolvedContainerRef.current as 'mp4' | 'webm',
        licenseKey: 'free-license',
        signal: abortController.signal,
        onProgress: (progress: RenderMediaOnWebProgress) => {
          const percent = Math.round(progress.progress * 100);
          // Throttle: só atualiza estado quando o percentual inteiro mudar
          if (percent === lastReportedPercentRef.current) return;
          lastReportedPercentRef.current = percent;
          setState(prev => ({
            ...prev,
            renderProgress: percent,
            renderStatusText: percent < 100
              ? `Renderizando... ${percent}%`
              : 'Finalizando exportação...',
          }));
        },
      });

      // Obtém o blob final
      const blob = await result.getBlob();
      const url = URL.createObjectURL(blob);

      setState({
        ...INITIAL_STATE,
        canRender: true,
        outputBlob: blob,
        outputUrl: url,
        renderProgress: 100,
        renderStatusText: 'Exportação concluída!',
      });
    } catch (err: unknown) {
      // Ignora erros de renders antigos (outra renderização já iniciou)
      if (renderIdRef.current !== renderId) return;

      const cancelled = isCancellationError(err);

      setState(prev => ({
        ...prev,
        isRendering: false,
        error: cancelled ? null : toUserFriendlyError(err, log),
        renderStatusText: cancelled ? 'Exportação cancelada.' : prev.renderStatusText,
      }));
    } finally {
      // Só limpa refs se esta ainda é a renderização atual
      if (renderIdRef.current === renderId) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  // -------------------------------------------------------------------------
  // Cancela renderização em andamento
  // -------------------------------------------------------------------------
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // -------------------------------------------------------------------------
  // Baixa o vídeo exportado
  // -------------------------------------------------------------------------
  const handleDownload = useCallback(() => {
    const url = outputUrlRef.current;
    if (!url) return;
    const ext = resolvedContainerRef.current === 'webm' ? 'webm' : 'mp4';
    const name = exportFileNameRef.current || `speed-paint-${Date.now()}`;
    void downloadFile(url, `${name}.${ext}`);
  }, []);

  // -------------------------------------------------------------------------
  // Reseta estado completo (revoga blob URL)
  // -------------------------------------------------------------------------
  const reset = useCallback(() => {
    const url = outputUrlRef.current;
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    setState(INITIAL_STATE);
  }, []);

  return useMemo(() => ({
    ...state,
    checkSupport,
    startRender,
    handleCancel,
    handleDownload,
    reset,
  }), [state, checkSupport, startRender, handleCancel, handleDownload, reset]);
}

/** Tipo do retorno do hook useSpeedPaintExporter — útil para passar via props */
export type SpeedPaintExporter = ReturnType<typeof useSpeedPaintExporter>;