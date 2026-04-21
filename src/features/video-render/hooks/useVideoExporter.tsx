import { useState, useCallback, useRef, useEffect } from 'react';
import { renderMediaOnWeb, canRenderMediaOnWeb } from '@remotion/web-renderer';
import type { RenderMediaOnWebProgress } from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import { VideoComposition } from '../components/VideoComposition';
import type { VideoCompositionProps } from '../types';
import type { EditingScene } from '../lib/editingPlan';
import type { SceneRatio, StudioScene } from '../../studio/types';
import { getResolutionFromRatio, mapScenesToVideoScenes } from '../lib/videoUtils';
import { patchCanvasFontStretch } from '../lib/canvasFontStretchPatch';
import { saveVideoToProject } from '../../../lib/db/videos';
import { downloadFile } from '../../../lib/download';

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
  editingPlan?: EditingScene[];
  projectId?: string;
  userId?: string;
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
  const { scenes, audioUrl, fps, editingPlan } = props;
  return (
    <VideoComposition
      scenes={scenes}
      audioUrl={audioUrl}
      fps={fps}
      editingPlan={editingPlan}
    />
  );
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

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

  // Loga o erro real para diagnóstico no console
  console.error('[useVideoExporter] Erro original:', err.message);

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
  /** Codec de áudio resolvido por checkSupport — 'aac' ou null (muted) */
  const resolvedAudioCodecRef = useRef<string | null>('aac');
  /** Codec de vídeo e container resolvidos por checkSupport */
  const resolvedVideoCodecRef = useRef<string>('h264');
  const resolvedContainerRef = useRef<string>('mp4');

  // Mantém ref sincronizada para uso em callbacks sem depender do estado
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
        console.warn(`[checkSupport] ${issue.type}: ${issue.message} (${issue.severity})`);
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
          console.warn(`[checkSupport fallback] ${issue.type}: ${issue.message}`);
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
        console.warn(`[checkSupport VP8 fallback] ${issue.type}: ${issue.message}`);
      }

      // Nenhum fallback funcionou — exibe mensagem com a primeira issue real
      const mainIssue = result.issues.find((i) => i.severity === 'error');
      setState(prev => ({
        ...prev,
        canRender: false,
        error: mainIssue?.message ?? 'Navegador não suporta exportação de vídeo. Use Chrome 94+ ou Firefox 130+.',
      }));
    } catch (err) {
      console.warn('[checkSupport] Exceção inesperada:', err);
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
      editingPlan,
      projectId,
      userId,
    } = options;

    if (!audioUrl || scenes.length === 0) return;

    const resolution = getResolutionFromRatio(ratio);
    const mappedScenes = mapScenesToVideoScenes(scenes, durationInFrames, fps, editingPlan);

    // Monta inputProps com tipo compatível com Record<string, unknown>
    const exportableInputProps: ExportableProps = {
      scenes: mappedScenes,
      audioUrl,
      fps,
      editingPlan,
    };

    // Cria AbortController para cancelamento
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Revoga URL anterior
    const prevUrl = outputUrlRef.current;
    if (prevUrl && prevUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prevUrl);
    }

    setState({
      ...INITIAL_STATE,
      canRender: true,
      isRendering: true,
      renderProgress: 0,
      renderStatusText: 'Iniciando renderização...',
    });

    try {
      // Aplica patch que traduz fontStretch percentual → keyword para a Canvas API
      // Corrige bug do @remotion/web-renderer 4.0.450 que causa centenas de warnings
      patchCanvasFontStretch();

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
          const percent = Math.round(progress.progress * 100);
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
    void downloadFile(url, `video-export-${Date.now()}.${ext}`);
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
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    checkSupport,
    startRender,
    handleCancel,
    handleDownload,
    dismissSaveWarning,
    reset,
  };
}

/** Tipo do retorno do hook useVideoExporter — útil para passar via props */
export type VideoExporter = ReturnType<typeof useVideoExporter>;
