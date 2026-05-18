/**
 * Hook de exportação simplificado para speed paint.
 * Sem áudio, sem multi-cena, sem salvamento em projeto.
 * Baseado em useVideoExporter, mas otimizado para exportação de animação única.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { renderMediaOnWeb } from '@remotion/web-renderer';
import type { RenderMediaOnWebProgress } from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import { SpeedPaintScene } from '../../video-render/components/SpeedPaintScene';
import type { StrokeAnimation } from '../types';
import type { VideoExportQuality } from '../../video-render/types';
import { patchCanvasFontStretch } from '../../video-render/lib/canvasFontStretchPatch';
import { isCancellationError, toUserFriendlyError } from '../../video-render/lib/exportUtils';
import { useCodecSupport } from '../../video-render/hooks/useCodecSupport';
import { generateStrokesFromImage } from '../lib/imageProcessing';
import { downloadFile } from '../../../lib/download';
import { createLogger } from '../../../lib/logger';
import { useLocale } from '../../i18n';

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
  showDrawTool?: boolean;
  fileName?: string;
  /** Dispara o download automaticamente ao concluir a exportação */
  autoDownload?: boolean;
}

export interface SpeedPaintBatchExportItem {
  imageSource: string;
  fileName?: string;
}

export interface SpeedPaintBatchExportOptions {
  items: SpeedPaintBatchExportItem[];
  fps: number;
  quality: VideoExportQuality;
  showDrawTool?: boolean;
  fileName?: string;
  sceneDurationSeconds?: number;
}

export interface SpeedPaintExporterState {
  isRendering: boolean;
  renderProgress: number; // 0-100
  renderStatusText: string;
  outputBlob: Blob | null;
  outputUrl: string | null;
  error: string | null;
  wasCancelled: boolean;
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
  wasCancelled: false,
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

async function loadImageDimensions(imageSource: string): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    };
    image.onerror = () => {
      reject(new Error('Falha ao ler dimensões da imagem para exportação em lote.'));
    };
    image.src = imageSource;
  });
}

// ---------------------------------------------------------------------------
// Compatibilidade de tipos com renderMediaOnWeb
// ---------------------------------------------------------------------------

/** Props da composição de speed paint para exportação */
interface SpeedPaintCompositionProps {
  animation: StrokeAnimation;
  imageSource: string;
  showDrawTool: boolean;
}

interface BatchSpeedPaintCompositionItem {
  animation: StrokeAnimation;
  imageSource: string;
}

interface BatchSpeedPaintCompositionProps {
  items: BatchSpeedPaintCompositionItem[];
  showDrawTool: boolean;
  sceneDurationInFrames: number;
}

/**
 * Wrapper que satisfaz a constraint Props extends Record<string, unknown>
 * do renderMediaOnWeb. Renderiza SpeedPaintScene com isExporting=true
 * para desabilitar overlays de debug na exportação.
 */
type ExportableSpeedPaintProps = SpeedPaintCompositionProps & { [key: string]: unknown };

function ExportableSpeedPaintComposition(props: ExportableSpeedPaintProps): React.ReactNode {
  const { animation, imageSource, showDrawTool } = props;
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
      <SpeedPaintScene
        animation={animation}
        imageSource={imageSource}
        durationInFrames={durationInFrames}
        showDrawTool={showDrawTool}
        isLastScene
        isExporting
        timingMode="duration-based"
      />
    </AbsoluteFill>
  );
}

type ExportableBatchSpeedPaintProps = BatchSpeedPaintCompositionProps & { [key: string]: unknown };

function ExportableBatchSpeedPaintComposition(props: ExportableBatchSpeedPaintProps): React.ReactNode {
  const { items, showDrawTool, sceneDurationInFrames } = props;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {items.map((item, index) => (
        <Sequence
          key={`${item.animation.id}-${index}`}
          from={index * sceneDurationInFrames}
          durationInFrames={sceneDurationInFrames}
        >
          <SpeedPaintScene
            animation={item.animation}
            imageSource={item.imageSource}
            durationInFrames={sceneDurationInFrames}
            showDrawTool={showDrawTool}
            isLastScene={index === items.length - 1}
            isExporting
            fitMode="contain"
            timingMode="duration-based"
          />
        </Sequence>
      ))}
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
  const { t } = useLocale();
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
  const supportErrorRef = useRef<string | null>(null);

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

  useEffect(() => {
    supportErrorRef.current = codecSupport.supportError;
  }, [codecSupport.supportError]);

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
  const resetSupportRef = useRef(codecSupport.resetSupport);
  useEffect(() => {
    checkSupportRef.current = codecSupport.checkSupport;
  }, [codecSupport.checkSupport]);
  useEffect(() => {
    resetSupportRef.current = codecSupport.resetSupport;
  }, [codecSupport.resetSupport]);

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
      showDrawTool = false,
      fileName,
      autoDownload = false,
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
      renderStatusText: t('speedPaint.batchPreparing'),
    });

    const resolution = getSpeedPaintResolution(animation.canvasWidth, animation.canvasHeight, quality);

    // Cria AbortController ANTES da renderização para permitir cancelamento
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Monta inputProps com tipo compatível com Record<string, unknown>
    const exportableInputProps: ExportableSpeedPaintProps = {
      animation,
      imageSource,
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
      renderStatusText: t('speedPaint.batchStarting'),
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
              ? t('speedPaint.exportRenderStatus', { percent })
              : t('speedPaint.batchFinalizing'),
          }));
        },
      });

      // Obtém o blob final
      const blob = await result.getBlob();
      const url = URL.createObjectURL(blob);

      if (autoDownload) {
        const ext = resolvedContainerRef.current === 'webm' ? 'webm' : 'mp4';
        const name = exportFileNameRef.current || `speed-paint-${Date.now()}`;
        await downloadFile(url, `${name}.${ext}`);
      }

      setState({
        ...INITIAL_STATE,
        canRender: true,
        outputBlob: blob,
        outputUrl: url,
        renderProgress: 100,
        renderStatusText: t('speedPaint.exportCompleted'),
      });
    } catch (err: unknown) {
      // Ignora erros de renders antigos (outra renderização já iniciou)
      if (renderIdRef.current !== renderId) return;

      const cancelled = isCancellationError(err);

      setState(prev => ({
        ...prev,
        isRendering: false,
        wasCancelled: cancelled,
        error: cancelled ? null : toUserFriendlyError(err, log),
        renderStatusText: cancelled ? t('speedPaint.batchCancelled') : prev.renderStatusText,
      }));
    } finally {
      // Só limpa refs se esta ainda é a renderização atual
      if (renderIdRef.current === renderId) {
        abortControllerRef.current = null;
      }
    }
  }, [t]);

  const startBatchRender = useCallback(async (options: SpeedPaintBatchExportOptions) => {
    const {
      items,
      fps,
      quality,
      showDrawTool = false,
      fileName,
      sceneDurationSeconds = 15,
    } = options;

    const renderId = ++renderIdRef.current;
    exportFileNameRef.current = fileName || '';

    if (items.length === 0) return;

    if (abortControllerRef.current) {
      log.warn('Renderização já em andamento — abortando anterior antes de iniciar lote');
      abortControllerRef.current.abort();
    }

    setState({
      ...INITIAL_STATE,
      canRender: null,
      isRendering: true,
      renderProgress: 0,
      renderStatusText: t('speedPaint.batchPreparingQueue'),
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const generationWeight = 50;
    const batchAnimations: BatchSpeedPaintCompositionItem[] = [];

    try {
      const firstItem = items[0];
      const dimensions = await loadImageDimensions(firstItem.imageSource);
      const preflightResolution = getSpeedPaintResolution(dimensions.width, dimensions.height, quality);
      const canRenderBatch = await checkSupportRef.current(preflightResolution.width, preflightResolution.height);

      if (!canRenderBatch) {
        setState(prev => ({
          ...prev,
          isRendering: false,
          canRender: false,
          renderStatusText: t('speedPaint.batchUnsupported'),
          error: supportErrorRef.current ?? t('speedPaint.exportBrowserWarning'),
        }));
        return;
      }

      lastReportedPercentRef.current = -1;

      for (const [index, item] of items.entries()) {
        if (abortController.signal.aborted) {
          throw new DOMException('Batch export aborted', 'AbortError');
        }

        const animation = await generateStrokesFromImage(item.imageSource, (progress) => {
          if (abortController.signal.aborted) return;
          const itemProgress = (index + progress) / items.length;
          const percent = Math.round(itemProgress * generationWeight);
          if (percent === lastReportedPercentRef.current) return;
          lastReportedPercentRef.current = percent;
          setState(prev => ({
            ...prev,
            renderProgress: percent,
            renderStatusText: t('speedPaint.batchGeneratingAnimations', {
              current: index + 1,
              total: items.length,
            }),
          }));
        }, { signal: abortController.signal });

        batchAnimations.push({
          animation,
          imageSource: animation.resizedImage || item.imageSource,
        });
      }

      const firstAnimation = batchAnimations[0]?.animation;
      if (!firstAnimation) return;

      patchCanvasFontStretch();
      lastReportedPercentRef.current = -1;

      const sceneDurationInFrames = Math.max(1, Math.round(sceneDurationSeconds * fps));
      const durationInFrames = sceneDurationInFrames * batchAnimations.length;
      const resolution = getSpeedPaintResolution(firstAnimation.canvasWidth, firstAnimation.canvasHeight, quality);
      const exportableInputProps: ExportableBatchSpeedPaintProps = {
        items: batchAnimations,
        showDrawTool,
        sceneDurationInFrames,
      };

      const composition: {
        component: ComponentType<ExportableBatchSpeedPaintProps>;
        id: string;
        width: number;
        height: number;
        fps: number;
        durationInFrames: number;
        defaultProps: ExportableBatchSpeedPaintProps;
      } = {
        component: ExportableBatchSpeedPaintComposition,
        id: 'script-master-speed-paint-batch-export',
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
        audioCodec: null,
        container: resolvedContainerRef.current as 'mp4' | 'webm',
        licenseKey: 'free-license',
        signal: abortController.signal,
        onProgress: (progress: RenderMediaOnWebProgress) => {
          const percent = generationWeight + Math.round(progress.progress * (100 - generationWeight));
          if (percent === lastReportedPercentRef.current) return;
          lastReportedPercentRef.current = percent;
          setState(prev => ({
            ...prev,
            renderProgress: percent,
            renderStatusText: percent < 100
              ? t('speedPaint.batchRenderingVideo', { percent })
              : t('speedPaint.batchFinalizing'),
          }));
        },
      });

      const blob = await result.getBlob();
      const url = URL.createObjectURL(blob);
      const ext = resolvedContainerRef.current === 'webm' ? 'webm' : 'mp4';
      const name = exportFileNameRef.current || `speed-paint-lote-${Date.now()}`;
      await downloadFile(url, `${name}.${ext}`);

      setState({
        ...INITIAL_STATE,
        canRender: true,
        outputBlob: blob,
        outputUrl: url,
        renderProgress: 100,
        renderStatusText: t('speedPaint.batchCompleted'),
      });
    } catch (err: unknown) {
      if (renderIdRef.current !== renderId) return;

      const cancelled = isCancellationError(err);

      setState(prev => ({
        ...prev,
        isRendering: false,
        wasCancelled: cancelled,
        error: cancelled ? null : toUserFriendlyError(err, log),
        renderStatusText: cancelled ? t('speedPaint.batchCancelled') : prev.renderStatusText,
      }));
    } finally {
      if (renderIdRef.current === renderId) {
        abortControllerRef.current = null;
      }
    }
  }, [t]);

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
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    resetSupportRef.current();
    setState(INITIAL_STATE);
  }, []);

  return useMemo(() => ({
    ...state,
    checkSupport,
    startRender,
    startBatchRender,
    handleCancel,
    handleDownload,
    reset,
  }), [state, checkSupport, startRender, startBatchRender, handleCancel, handleDownload, reset]);
}

/** Tipo do retorno do hook useSpeedPaintExporter — útil para passar via props */
export type SpeedPaintExporter = ReturnType<typeof useSpeedPaintExporter>;
