import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { renderMediaOnWeb, canRenderMediaOnWeb } from '@remotion/web-renderer';
import type { RenderMediaOnWebProgress } from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import { VideoComposition } from '../components/VideoComposition';
import type { VideoCompositionProps } from '../types';
import type { CaptionWord, SubtitleStyle, VideoExportQuality } from '../types';
import type { SpeedPaintSpeed, SpeedPaintMultipliers } from '../types';
import type { SceneRatio, StudioScene } from '../../studio/types';
import { getResolutionFromQuality, mapScenesToVideoScenes, DEFAULT_EXPORT_QUALITY } from '../lib/videoUtils';
import { generateScenesWithSpeedPaint } from '../lib/speedPaintRenderer';
import { clearStrokeCache } from '../lib/strokeCache';
import { patchCanvasFontStretch } from '../lib/canvasFontStretchPatch';
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
  const { scenes, audioUrl, fps, captions, subtitleStyle, speedPaintSpeed, speedPaintMultipliers } = props;
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
    />
  );
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const log = createLogger('useVideoExporter');

/**
 * Verifica se o erro representa um cancelamento intencional do usuário.
 * O Remotion lança Error com "was cancelled" ao invés de DOMException AbortError.
 */
function isCancellationError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.message.toLowerCase().includes('cancelled')) return true;
  return false;
}

/**
 * Mapeia erros de renderização para mensagens amigáveis em pt-BR.
 * Não deve ser chamada para erros de cancelamento (usar isCancellationError antes).
 */
function toUserFriendlyError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Erro ao exportar vídeo. Tente novamente.';
  }

  const msg = err.message.toLowerCase();

  // Loga o erro real para diagnóstico
  log.error('Erro original na exportação', { error: err.message });

  if (msg.includes('webcodecs') || msg.includes('videoencoder') || msg.includes('not supported')) {
    return `Navegador não suporta exportação de vídeo: ${err.message}`;
  }

  return 'Erro ao exportar vídeo. Tente novamente.';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVideoExporter() {
  const [state, setState] = useState<VideoExporterState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  /** Último percentual reportado — evita re-renders quando o inteiro não mudou */
  const lastReportedPercentRef = useRef(-1);
  /** Codec de áudio resolvido por checkSupport — 'aac' ou null (muted) */
  const resolvedAudioCodecRef = useRef<string | null>('aac');
  /** Codec de vídeo e container resolvidos por checkSupport */
  const resolvedVideoCodecRef = useRef<string>('h264');
  const resolvedContainerRef = useRef<string>('mp4');
  /** Nome do arquivo para download */
  const exportFileNameRef = useRef<string>('');
  /** Peso acumulado da fase de speed paint no progresso total (0 se não houve speed paint) */
  const speedPaintPhaseWeightRef = useRef(0);

  // Mantém refs sincronizadas para uso em callbacks sem depender do estado
  useEffect(() => {
    outputUrlRef.current = state.outputUrl;
  }, [state.outputUrl]);

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
  // Verifica suporte do browser (WebCodecs + codec)
  // -------------------------------------------------------------------------
  const checkSupport = useCallback(async (width: number, height: number) => {
    // Checagem rápida síncrona
    if (typeof VideoEncoder === 'undefined') {
      setState(prev => ({ ...prev, canRender: false, error: 'WebCodecs não disponível neste navegador.' }));
      return;
    }

    try {
      const result = await canRenderMediaOnWeb({
        width,
        height,
        videoCodec: 'h264',
        audioCodec: 'aac',
        container: 'mp4',
      });

      if (result.canRender) {
        resolvedAudioCodecRef.current = result.resolvedAudioCodec;
        setState(prev => ({ ...prev, canRender: true, error: null, resolvedVideoCodec: 'h264', resolvedContainer: 'mp4' }));
        return;
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
          resolvedAudioCodecRef.current = fallbackResult.resolvedAudioCodec;
          resolvedVideoCodecRef.current = fallbackResult.resolvedVideoCodec ?? 'h264';
          resolvedContainerRef.current = 'mp4';
          setState(prev => ({
            ...prev,
            canRender: true,
            error: null,
            resolvedVideoCodec: fallbackResult.resolvedVideoCodec ?? 'h264',
            resolvedContainer: 'mp4',
          }));
          return;
        }

        for (const issue of fallbackResult.issues) {
          log.warn('Problema no fallback sem áudio', { type: issue.type, message: issue.message });
        }
      }

      // Terceiro fallback: VP8 + WebM (suportado pela maioria dos navegadores)
      const vp8Result = await canRenderMediaOnWeb({
        width,
        height,
        videoCodec: 'vp8',
        audioCodec: 'opus',
        container: 'webm',
      });

      if (vp8Result.canRender) {
        resolvedAudioCodecRef.current = vp8Result.resolvedAudioCodec;
        resolvedVideoCodecRef.current = vp8Result.resolvedVideoCodec ?? 'vp8';
        resolvedContainerRef.current = 'webm';
        setState(prev => ({
          ...prev,
          canRender: true,
          error: null,
          resolvedVideoCodec: vp8Result.resolvedVideoCodec ?? 'vp8',
          resolvedContainer: 'webm',
          saveWarning: prev.saveWarning || 'Seu navegador usa VP8/WebM. Alguns players podem não suportar o formato.',
        }));
        return;
      }

      for (const issue of vp8Result.issues) {
        log.warn('Problema no fallback VP8', { type: issue.type, message: issue.message });
      }

      // Nenhum fallback funcionou — exibe mensagem com a primeira issue real
      const mainIssue = result.issues.find((i) => i.severity === 'error');
      setState(prev => ({
        ...prev,
        canRender: false,
        error: mainIssue?.message ?? 'Navegador não suporta exportação de vídeo. Use Chrome 94+ ou Firefox 130+.',
      }));
    } catch (err) {
      log.warn('Exceção inesperada no checkSupport', { error: err });
      setState(prev => ({ ...prev, canRender: false }));
    }
  }, []);

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
    } = options;

    // Grava o nome do arquivo diretamente na ref (antes de qualquer reset de estado)
    exportFileNameRef.current = fileName || '';

    if (!audioUrl || scenes.length === 0) return;

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
        const strokeResults = await generateScenesWithSpeedPaint(
          mappedScenes.map((s) => ({ imageUrl: s.imageUrl })),
          (progress) => {
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
          { useWorker: true },
        );

        // Mapeia resultados para as cenas e coleta avisos de falha
        mappedScenes = mappedScenes.map((scene, index) => {
          const result = strokeResults[index];
          if (result?.error) {
            collectedWarnings.push(`Cena ${index + 1}: ${result.error}`);
          }
          return {
            ...scene,
            strokeAnimation: result?.animation,
          };
        });

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
          // Informa o usuário que o vídeo foi exportado mas não salvo no projeto
          setState(prev => ({
            ...prev,
            saveWarning: 'O vídeo foi exportado, mas não foi possível salvar no projeto. Você ainda pode baixá-lo localmente.',
          }));
        });
      }
    } catch (err: unknown) {
      const cancelled = isCancellationError(err);

      setState(prev => ({
        ...prev,
        isRendering: false,
        error: cancelled ? null : toUserFriendlyError(err),
        renderStatusText: cancelled ? 'Exportação cancelada.' : prev.renderStatusText,
      }));
    } finally {
      abortControllerRef.current = null;
      speedPaintPhaseWeightRef.current = 0;
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
