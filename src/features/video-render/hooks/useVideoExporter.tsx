import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { renderMediaOnWeb } from '@remotion/web-renderer';
import type { RenderMediaOnWebProgress } from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import { VideoComposition } from '../components/VideoComposition';
import type { VideoCompositionProps } from '../types';
import type { CaptionWord, SubtitleStyle, VideoExportQuality } from '../types';
import type { SpeedPaintSpeed, SpeedPaintMultipliers } from '../types';
import type { SceneRatio, StudioScene } from '../../studio/types';
import { getResolutionFromQuality, mapScenesToVideoScenes, DEFAULT_EXPORT_QUALITY } from '../lib/videoUtils';
import { enhanceScenesWithSpeedPaint } from '../lib/speedPaintService';
import { clearStrokeCache } from '../lib/strokeCache';
import { patchCanvasFontStretch } from '../lib/canvasFontStretchPatch';
import { isCancellationError, toUserFriendlyError } from '../lib/exportUtils';
import { useCodecSupport } from '../hooks/useCodecSupport';
import { saveVideoToProject } from '../../../lib/db/videos';
import { downloadFile } from '../../../lib/download';
import { createLogger } from '../../../lib/logger';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Opções para iniciar a exportação de vídeo */
export interface VideoExportOptions {
  scenes: StudioScene[];
  audioUrl: string;
  fps: number;
  durationInFrames: number;
  ratio: SceneRatio;
  captions?: CaptionWord[];
  subtitleStyle?: SubtitleStyle;
  projectId?: string;
  userId?: string;
  /** Qualidade de exportação (default: '1080p') */
  quality?: VideoExportQuality;
  /** Nome personalizado para o arquivo de download */
  fileName?: string;
  /** Animar cenas com Speed Paint (default: false) */
  animateScenes?: boolean;
  /** Exibe o lápis/pincel animado durante o speed paint */
  showDrawTool?: boolean;
  /** Velocidade da animação speed paint (default: 'normal') */
  speedPaintSpeed?: SpeedPaintSpeed;
  /** Multiplicadores de velocidade separados para sketch/reveal — se fornecido, sobrepõe speedPaintSpeed */
  speedPaintMultipliers?: SpeedPaintMultipliers;
}

export interface VideoExporterState {
  isRendering: boolean;
  renderProgress: number; // 0-100
  renderStatusText: string;
  outputBlob: Blob | null;
  outputUrl: string | null;
  error: string | null;
  /** null = verificação pendente, true/false = resultado */
  canRender: boolean | null;
  /** Aviso quando o salvamento no projeto falha após exportação bem-sucedida */
  saveWarning: string | null;
  /** Lista de cenas cuja geração de speed paint falhou (para feedback ao usuário) */
  speedPaintWarnings: string[];
  /** Codec de vídeo resolvido após checkSupport ('h264', 'vp8', etc.) */
  resolvedVideoCodec: string;
  /** Container resolvido após checkSupport ('mp4' ou 'webm') */
  resolvedContainer: string;

}

const INITIAL_STATE: VideoExporterState = {
  isRendering: false,
  renderProgress: 0,
  renderStatusText: '',
  outputBlob: null,
  outputUrl: null,
  error: null,
  canRender: null,
  saveWarning: null,
  speedPaintWarnings: [],
  resolvedVideoCodec: 'h264',
  resolvedContainer: 'mp4',
};

// ---------------------------------------------------------------------------
// Compatibilidade de tipos com renderMediaOnWeb
// ---------------------------------------------------------------------------

/**
 * Wrapper em torno de VideoComposition que satisfaz a constraint
 * Props extends Record<string, unknown> do renderMediaOnWeb.
 *
 * O renderMediaOnWeb usa generics complexos com Zod schemas que exigem
 * index signatures implícitos. Como interfaces TypeScript regulares não
 * possuem index signatures, criamos um wrapper com tipo explícito.
 */
type ExportableProps = VideoCompositionProps & { [key: string]: unknown };

function ExportableComposition(props: ExportableProps): React.ReactNode {
  const { scenes, audioUrl, fps, captions, subtitleStyle, speedPaintSpeed, speedPaintMultipliers, showDrawTool } = props;
  return (
    <VideoComposition
      scenes={scenes}
      audioUrl={audioUrl}
      fps={fps}
      captions={captions}
      subtitleStyle={subtitleStyle}
      isExporting={true}
      speedPaintSpeed={speedPaintSpeed}
      speedPaintMultipliers={speedPaintMultipliers}
      showDrawTool={showDrawTool}
    />
  );
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const log = createLogger('useVideoExporter');

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVideoExporter() {
  const [state, setState] = useState<VideoExporterState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  /** Identifica qual renderização é a atual — evita que catch/finally de renders antigos corrompam estado */
  const renderIdRef = useRef(0);
  const outputUrlRef = useRef<string | null>(null);
  /** Último percentual reportado — evita re-renders quando o inteiro não mudou */
  const lastReportedPercentRef = useRef(-1);
  /** Codec de áudio resolvido — lido de codecSupport via ref */
  const resolvedAudioCodecRef = useRef<string | null>('aac');
  /** Codec de vídeo e container resolvidos — lidos de codecSupport via refs sincronizadas */
  const resolvedVideoCodecRef = useRef<string>('h264');
  const resolvedContainerRef = useRef<string>('mp4');
  /** Nome do arquivo para download */
  const exportFileNameRef = useRef<string>('');
  /** Peso acumulado da fase de speed paint no progresso total (0 se não houve speed paint) */
  const speedPaintPhaseWeightRef = useRef(0);

  // Detecção de codecs via hook unificado (com áudio)
  const codecSupport = useCodecSupport({ muted: false });

  // Sincroniza canRender, codec e warnings do hook para o estado do exporter
  useEffect(() => {
    setState(prev => ({
      ...prev,
      canRender: codecSupport.canRender,
      resolvedVideoCodec: codecSupport.resolvedVideoCodec,
      resolvedContainer: codecSupport.resolvedContainer,
      // Mapeia supportError para error (só quando não está renderizando)
      error: prev.isRendering ? prev.error : (codecSupport.supportError ?? prev.error),
      // Mapeia codecWarning para saveWarning
      saveWarning: prev.saveWarning ?? codecSupport.codecWarning,
    }));
  }, [codecSupport.canRender, codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer, codecSupport.supportError, codecSupport.codecWarning]);

  // Mantém refs sincronizadas para uso em callbacks sem depender do estado
  useEffect(() => {
    outputUrlRef.current = state.outputUrl;
    resolvedVideoCodecRef.current = state.resolvedVideoCodec;
    resolvedContainerRef.current = state.resolvedContainer;
    resolvedAudioCodecRef.current = codecSupport.resolvedAudioCodec;
  }, [state.outputUrl, state.resolvedVideoCodec, state.resolvedContainer, codecSupport.resolvedAudioCodec]);

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
    // Sincroniza codec de áudio após checkSupport (ref — sem stale closure)
    resolvedAudioCodecRef.current = codecSupport.resolvedAudioCodec;
  }, [codecSupport.resolvedAudioCodec]);

  // -------------------------------------------------------------------------
  // Inicia renderização via WebCodecs
  // -------------------------------------------------------------------------
  const startRender = useCallback(async (options: VideoExportOptions) => {
    const {
      scenes,
      audioUrl,
      fps,
      durationInFrames,
      ratio,
      captions,
      subtitleStyle,
      projectId,
      userId,
      quality,
      fileName,
      animateScenes = false,
      showDrawTool = true,
    } = options;

    // Identifica esta renderização — catch/finally antigos serão ignorados
    const renderId = ++renderIdRef.current;

    // Grava o nome do arquivo diretamente na ref (antes de qualquer reset de estado)
    exportFileNameRef.current = fileName || '';

    if (!audioUrl || scenes.length === 0) return;
    if (durationInFrames <= 0) {
      setState(prev => ({
        ...prev,
        error: 'A duração do áudio ainda não foi carregada. Aguarde alguns instantes e tente exportar novamente.',
        isRendering: false,
        renderProgress: 0,
        renderStatusText: '',
      }));
      return;
    }

    // Previne dupla renderização — aborta a anterior se existir
    if (abortControllerRef.current) {
      log.warn('Renderização já em andamento — abortando anterior antes de iniciar nova');
      abortControllerRef.current.abort();
    }

    // Entra em modo renderização imediatamente para mostrar feedback visual
    setState({
      ...INITIAL_STATE,
      canRender: true,
      isRendering: true,
      renderProgress: 0,
      renderStatusText: 'Preparando exportação...',
    });

    const resolvedQuality = quality ?? DEFAULT_EXPORT_QUALITY;
    const resolution = getResolutionFromQuality(ratio, resolvedQuality);
    let mappedScenes = mapScenesToVideoScenes(scenes, durationInFrames, fps);

    // Cria AbortController ANTES da fase de speed paint para permitir cancelamento
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Warnings de speed paint acumulados em variável local — evita bug de React batching
    // onde setState intermediário (speedPaintWarnings) é perdido ao ser lido no setState final
    let collectedWarnings: string[] = [];

    // Gera strokeAnimations para cenas quando o toggle está ativo
    if (animateScenes && mappedScenes.length > 0) {
      const SPEED_PAINT_PHASE_WEIGHT = 50;

      try {
        log.info('Gerando strokeAnimations para cenas', { sceneCount: mappedScenes.length });
        const enhanceResult = await enhanceScenesWithSpeedPaint(mappedScenes, {
          onProgress: (progress) => {
            const pct = Math.round(progress * SPEED_PAINT_PHASE_WEIGHT);
            if (pct !== lastReportedPercentRef.current) {
              lastReportedPercentRef.current = pct;
              setState(prev => ({
                ...prev,
                renderProgress: pct,
                renderStatusText: `Gerando animações... ${pct}%`,
              }));
            }
          },
          signal: abortController.signal,
        });

        mappedScenes = enhanceResult.scenes;
        collectedWarnings = enhanceResult.warnings;

        // Armazena o peso da fase de speed paint para progresso acumulado
        speedPaintPhaseWeightRef.current = SPEED_PAINT_PHASE_WEIGHT;
      } catch (err) {
        log.warn('Falha ao gerar strokeAnimations — exportando sem animação', { error: err });
        collectedWarnings = ['Falha geral ao gerar animações de speed paint.'];
      }
    }

    // Destrutura com default para speedPaintSpeed
    const speedPaintSpeed = options.speedPaintSpeed ?? 'normal';

    // Monta inputProps com tipo compatível com Record<string, unknown>
    const exportableInputProps: ExportableProps = {
      scenes: mappedScenes,
      audioUrl,
      fps,
      captions,
      subtitleStyle,
      speedPaintSpeed,
      speedPaintMultipliers: options.speedPaintMultipliers,
      showDrawTool,
    };

    // Revoga URL anterior
    const prevUrl = outputUrlRef.current;
    if (prevUrl && prevUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prevUrl);
    }

    // Peso acumulado da fase de speed paint (progresso contínuo: não reseta para 0)
    const speedPaintOffset = speedPaintPhaseWeightRef.current;
    const remainingWeight = 100 - speedPaintOffset;

    setState(prev => ({
      ...prev,
      renderProgress: speedPaintOffset || 0,
      renderStatusText: 'Iniciando renderização...',
      speedPaintWarnings: collectedWarnings,
    }));

    try {
      // Aplica patch que traduz fontStretch percentual → keyword para a Canvas API
      // Corrige bug do @remotion/web-renderer 4.0.450 que causa centenas de warnings
      patchCanvasFontStretch();

      // Reseta o throttle de percentual para nova renderização
      lastReportedPercentRef.current = -1;

      // Usa o wrapper ExportableComposition para satisfazer as constraints de tipo
      const composition: {
        component: ComponentType<ExportableProps>;
        id: string;
        width: number;
        height: number;
        fps: number;
        durationInFrames: number;
        defaultProps: ExportableProps;
      } = {
        component: ExportableComposition,
        id: 'script-master-video-export',
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
        audioCodec: resolvedAudioCodecRef.current as 'aac' | 'opus' | null,
        container: resolvedContainerRef.current as 'mp4' | 'webm',
        licenseKey: 'free-license',
        signal: abortController.signal,
        onProgress: (progress: RenderMediaOnWebProgress) => {
          // Progresso acumulado: speed paint ocupa [0, speedPaintOffset], render ocupa o restante
          const percent = speedPaintOffset + Math.round(progress.progress * remainingWeight);
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
        speedPaintWarnings: collectedWarnings,
      });

      // Salva no projeto de forma não-bloqueante
      if (projectId) {
        const durationInSeconds = durationInFrames / fps;
        const format = resolvedContainerRef.current === 'webm' ? 'webm' : 'mp4';
        saveVideoToProject(
          {
            projectId,
            userId: userId ?? '',
            videoUrl: url,
            format,
            width: resolution.width,
            height: resolution.height,
            fps,
            durationInSeconds,
            fileSizeBytes: blob.size,
            videoBlob: blob,
          },
          userId,
        ).catch(() => {
          // Ignora se outra renderização já iniciou
          if (renderIdRef.current !== renderId) return;
          // Informa o usuário que o vídeo foi exportado mas não salvo no projeto
          setState(prev => ({
            ...prev,
            saveWarning: 'O vídeo foi exportado, mas não foi possível salvar no projeto. Você ainda pode baixá-lo localmente.',
          }));
        });
      }
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
        speedPaintPhaseWeightRef.current = 0;
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
    const name = exportFileNameRef.current || `video-export-${Date.now()}`;
    void downloadFile(url, `${name}.${ext}`);
  }, []);

  // -------------------------------------------------------------------------
  // Dispensa aviso de salvamento sem revogar o blob
  // -------------------------------------------------------------------------
  const dismissSaveWarning = useCallback(() => {
    setState(prev => ({ ...prev, saveWarning: null }));
  }, []);

  // -------------------------------------------------------------------------
  // Reseta estado completo (revoga blob URL)
  // -------------------------------------------------------------------------
  const reset = useCallback(() => {
    const url = outputUrlRef.current;
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    speedPaintPhaseWeightRef.current = 0;
    clearStrokeCache();
    setState(INITIAL_STATE);
  }, []);

  return useMemo(() => ({
    ...state,
    checkSupport,
    startRender,
    handleCancel,
    handleDownload,
    dismissSaveWarning,
    reset,
  }), [state, checkSupport, startRender, handleCancel, handleDownload, dismissSaveWarning, reset]);
}

/** Tipo do retorno do hook useVideoExporter — útil para passar via props */
export type VideoExporter = ReturnType<typeof useVideoExporter>;
