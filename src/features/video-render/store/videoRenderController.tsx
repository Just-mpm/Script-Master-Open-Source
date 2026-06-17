/**
 * Controller singleton da renderização de vídeo.
 *
 * Este store Zustand vive no `App.tsx` (sempre montado) e gerencia o ciclo
 * de vida do `renderMediaOnWeb` do Remotion **fora do ciclo de vida React**.
 *
 * **Por que singleton?**
 * O hook `useVideoExporter` original era instanciado dentro de `VideoPage`
 * (rota lazy). Quando o usuário navegava para outra rota, o `useEffect`
 * cleanup chamava `abortController.abort()` e o render era perdido. Este
 * controller é importado por `useVideoExporter` (fachada fina) e pelo
 * `ExportCrossRouteToast` (M6), garantindo que o render continue rodando
 * enquanto a SPA navega.
 *
 * **Por que lazy import do Remotion?**
 * O `@remotion/web-renderer` (~2.4 MB com codecs) é importado dinamicamente
 * apenas quando `startRender()` é chamado pela primeira vez. Isso preserva
 * o tamanho do bundle principal (`main-*.js`) e mantém a fronteira de
 * lazy loading existente.
 *
 * **Por que AbortController em escopo de módulo?**
 * Porque precisa sobreviver a `unmount` do componente. Em React, `useRef`
 * é descartado no unmount. Variável no closure do módulo persiste enquanto
 * o JS runtime estiver vivo.
 *
 * **Sincronização com `videoRenderBridge`:**
 * M1 escreve `isExportingVideo` + `videoExportProgress` no bridge para que
 * consumidores legados (`ActionBar`, `ToastManager`) continuem funcionando
 * sem mudanças.
 *
 * @see videoRenderController contract — `docs/plan/video-render-survive-navigation-architecture.md §3 M1`
 */
import { create } from 'zustand';
import type { ComponentType, ReactNode } from 'react';
import type { VideoCompositionProps, SpeedPaintSpeed, SpeedPaintMultipliers } from '../types';
import { getResolutionFromQuality, mapScenesToVideoScenes, DEFAULT_EXPORT_QUALITY } from '../lib/videoUtils';
import { enhanceScenesWithSpeedPaint } from '../lib/speedPaintService';
import { clearStrokeCache } from '../lib/strokeCache';
import { patchCanvasFontStretch } from '../lib/canvasFontStretchPatch';
import { isCancellationError, toUserFriendlyError } from '../lib/exportUtils';
import { saveVideoToProject } from '../../../lib/db/videos';
import { trackAnalyticsEvent, categorizeAnalyticsError } from '../../../lib/analytics';
import { createLogger } from '../../../lib/logger';
import { useVideoRenderBridge } from './videoRenderBridge';
import type { VideoExportOptions } from '../hooks/useVideoExporter';
import type {
  RenderControllerPublicState,
  RenderControllerActions,
  RenderKind,
  RenderStatus,
} from '../types/renderController';

// ---------------------------------------------------------------------------
// Tipo do store público (Zustand state + actions)
// ---------------------------------------------------------------------------

interface VideoRenderControllerStore
  extends RenderControllerPublicState,
    RenderControllerActions<VideoExportOptions> {
  /** Limpa `saveWarning` sem resetar o estado (preserva outputBlob para download) */
  dismissSaveWarning: () => void;
}

// ---------------------------------------------------------------------------
// Estado privado do módulo (não exposto via Zustand)
// ---------------------------------------------------------------------------

/** AbortController ativo — vive no closure para sobreviver a unmount de componente */
let abortController: AbortController | null = null;
/** Identifica qual render é o "atual" — renders obsoletos não devem escrever estado */
let currentRenderId = 0;
/** Cache do módulo Remotion lazy-imported (só baixa uma vez) */
let remotionModule: typeof import('@remotion/web-renderer') | null = null;
/** Objeto mutável para throttle do percentual (não é ref React — vive no módulo) */
const lastReportedPercentRef = { current: -1 };
/** Nome do arquivo do último export (usado por handleDownload) */
let currentExportFileName = '';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const log = createLogger('videoRenderController');

// ---------------------------------------------------------------------------
// Lazy import do Remotion (preserva o bundle principal)
// ---------------------------------------------------------------------------

/** Carrega o `@remotion/web-renderer` apenas na primeira chamada. Retorna o módulo cacheado. */
async function loadRenderImpl(): Promise<typeof import('@remotion/web-renderer')> {
  if (!remotionModule) {
    remotionModule = await import('@remotion/web-renderer');
  }
  return remotionModule;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tipo para satisfazer a constraint de `renderMediaOnWeb` que exige Props extends Record<string, unknown>. */
type ExportableProps = VideoCompositionProps & { [key: string]: unknown };

async function createExportableComposition(): Promise<ComponentType<ExportableProps>> {
  const { VideoComposition } = await import('../components/VideoComposition');

  /**
   * Wrapper em torno de VideoComposition que satisfaz a constraint de tipo
   * `Props extends Record<string, unknown>` exigida pelo `renderMediaOnWeb`.
   */
  return function ExportableComposition(props: ExportableProps): ReactNode {
    const {
      scenes,
      audioUrl,
      fps,
      captions,
      subtitleStyle,
      speedPaintSpeed,
      speedPaintMultipliers,
      showDrawTool,
    } = props;
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
  };
}

// ---------------------------------------------------------------------------
// Helpers de status — sincronizam Zustand e bridge
// ---------------------------------------------------------------------------

type SetFn = (
  partial:
    | Partial<RenderControllerPublicState>
    | ((state: RenderControllerPublicState) => Partial<RenderControllerPublicState>),
) => void;

/** Escreve progresso no Zustand E no bridge (consumidores legados). Recebe `set` por injeção para evitar forward-reference. */
function reportProgress(
  set: SetFn,
  percent: number,
  statusText: string,
): void {
  // Throttle: só atualiza se o inteiro mudou
  if (percent === lastReportedPercentRef.current) return;
  lastReportedPercentRef.current = percent;
  set({
    renderProgress: percent,
    renderStatusText: statusText,
    lastProgressUpdateAt: Date.now(),
  });
  useVideoRenderBridge.getState().syncExportState(true, percent);
}

// ---------------------------------------------------------------------------
// Store Zustand singleton
// ---------------------------------------------------------------------------

const INITIAL_STATE: RenderControllerPublicState = {
  kind: 'video' as RenderKind,
  status: 'idle' as RenderStatus,
  isRendering: false,
  renderProgress: 0,
  renderStatusText: '',
  outputBlob: null,
  outputUrl: null,
  error: null,
  startedAt: null,
  lastProgressUpdateAt: 0,
  codec: 'h264',
  container: 'mp4',
  speedPaintWarnings: [],
  saveWarning: null,
};

/** Hook de acesso ao controller — use `useStore(videoRenderController, selector)` para reatividade */
export const useVideoRenderController = create<VideoRenderControllerStore>()((set, get) => ({
  ...INITIAL_STATE,

  // -------------------------------------------------------------------------
  // startRender — lógica COMPLETA migrada de useVideoExporter
  // -------------------------------------------------------------------------
  startRender: async (options: VideoExportOptions) => {
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
      renderMode,
      vetorialPreset,
    } = options;

    // 1. Identifica esta renderização — catch/finally de renders antigos serão ignorados
    const renderId = ++currentRenderId;

    // 2. Validações básicas — antes de criar AbortController (evita controller órfão)
    if (!audioUrl || scenes.length === 0) return;
    if (durationInFrames <= 0) {
      set({
        status: 'idle' as RenderStatus,
        isRendering: false,
        renderProgress: 0,
        renderStatusText: '',
        error: 'A duração do áudio ainda não foi carregada. Aguarde alguns instantes e tente exportar novamente.',
      });
      return;
    }

    // 3. Cancela render anterior se existir (2ª exportação cancela 1ª)
    if (abortController) {
      log.warn('Renderização já em andamento — abortando anterior antes de iniciar nova');
      abortController.abort();
      abortController = null;
    }

    // 4. Cria novo AbortController em escopo de módulo (sobrevive a unmount)
    abortController = new AbortController();
    const signal = abortController.signal;

    // 5. Reseta throttle do percentual
    lastReportedPercentRef.current = -1;

    // 6. Reseta estado para "preparing" — feedback visual imediato
    set({
      ...INITIAL_STATE,
      kind: 'video' as RenderKind,
      status: 'preparing' as RenderStatus,
      isRendering: true,
      renderProgress: 0,
      renderStatusText: 'Preparando exportação...',
      startedAt: Date.now(),
      lastProgressUpdateAt: Date.now(),
    });
    useVideoRenderBridge.getState().syncExportState(true, 0);

    const resolvedQuality = quality ?? DEFAULT_EXPORT_QUALITY;
    const resolution = getResolutionFromQuality(ratio, resolvedQuality);
    const analyticsParams = {
      quality: resolvedQuality,
      ratio,
      scene_count: scenes.length,
      mode: animateScenes ? 'speed_paint' : 'standard',
    };
    trackAnalyticsEvent('video_export_started', analyticsParams);

    let mappedScenes = mapScenesToVideoScenes(scenes, durationInFrames, fps);

    // 7. Warnings de speed paint acumulados em variável local — evita bug de
    //    React batching onde setState intermediário seria perdido.
    let collectedWarnings: string[] = [];

    // 8. Fase de speed paint (gera strokeAnimations) — ocupa 0-50% do progresso
    if (animateScenes && mappedScenes.length > 0) {
      const SPEED_PAINT_PHASE_WEIGHT = 50;

      try {
        log.info('Gerando strokeAnimations para cenas', { sceneCount: mappedScenes.length });
        const enhanceResult = await enhanceScenesWithSpeedPaint(mappedScenes, {
          onProgress: (progress) => {
            const pct = Math.round(progress * SPEED_PAINT_PHASE_WEIGHT);
            reportProgress(set, pct, `Gerando animações... ${pct}%`);
          },
          // L7: propaga modo+preset do bridge para o pipeline. Sem isso, o
          // gerador sempre cai no default `mask` independente da escolha do
          // usuário na VideoPage (RF-06). Defaults seguros: undefined = mask.
          ...(renderMode !== undefined ? { renderMode } : {}),
          ...(renderMode === 'vetorial' && vetorialPreset !== undefined ? { vetorialPreset } : {}),
          signal,
        });
        mappedScenes = enhanceResult.scenes;
        collectedWarnings = enhanceResult.warnings;
      } catch (err) {
        log.warn('Falha ao gerar strokeAnimations — exportando sem animação', { error: err });
        collectedWarnings = ['Falha geral ao gerar animações de speed paint.'];
      }

      // Atualiza status para fase de renderização
      set({ renderStatusText: 'Iniciando renderização...' });
    }

    // 9. Calcula peso final para o progresso acumulado
    const speedPaintOffset = animateScenes ? 50 : 0;
    const remainingWeight = 100 - speedPaintOffset;

    // 10. Monta inputProps para o composition
    const speedPaintSpeed: SpeedPaintSpeed = options.speedPaintSpeed ?? 'normal';
    const speedPaintMultipliers: SpeedPaintMultipliers | undefined = options.speedPaintMultipliers;

    const exportableInputProps: ExportableProps = {
      scenes: mappedScenes,
      audioUrl,
      fps,
      animateScenes,
      captions,
      subtitleStyle,
      speedPaintSpeed,
      speedPaintMultipliers,
      showDrawTool,
    };

    // 11. Cacheia fileName em escopo de módulo (usado por handleDownload)
    //     Nota: isso é específico do M1; M2 (speed paint) terá sua própria versão.
    currentExportFileName = fileName ?? '';

    // 12. Carrega Remotion lazy (primeira vez baixa o chunk; demais é cache)
    let renderMediaOnWeb: typeof import('@remotion/web-renderer').renderMediaOnWeb;
    let ExportableComposition: ComponentType<ExportableProps>;
    try {
      const [module, exportableComposition] = await Promise.all([
        loadRenderImpl(),
        createExportableComposition(),
      ]);
      renderMediaOnWeb = module.renderMediaOnWeb;
      ExportableComposition = exportableComposition;
    } catch (err) {
      log.error('Falha ao carregar módulo de renderização de vídeo', { error: err });
      if (currentRenderId !== renderId) return; // render obsoleto
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      set({
        status: 'failed' as RenderStatus,
        isRendering: false,
        error: `Falha ao carregar módulo de renderização: ${message}. Tente recarregar a página.`,
      });
      useVideoRenderBridge.getState().syncExportState(false, 0);
      return;
    }

    // 13. Aplica patch que traduz fontStretch percentual → keyword para a Canvas API
    patchCanvasFontStretch();

    // 14. Atualiza status para 'rendering'
    set({
      status: 'rendering' as RenderStatus,
      renderStatusText: 'Iniciando renderização...',
    });

    // 15. Inicia renderização via WebCodecs
    try {
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
        videoCodec: get().codec as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1',
        audioCodec: 'aac',
        container: get().container as 'mp4' | 'webm',
        licenseKey: 'free-license',
        signal,
        onProgress: (progress) => {
          const percent = speedPaintOffset + Math.round(progress.progress * remainingWeight);
          reportProgress(set, percent, percent < 100 ? `Renderizando... ${percent}%` : 'Finalizando exportação...');
        },
      });

      // 16. Obtém blob final (assíncrono, pode demorar >30s)
      const blob = await result.getBlob();
      const localUrl = URL.createObjectURL(blob);

      // 17. Edge case LAC-004: se outra renderização sobrescreveu, não substituir estado
      if (currentRenderId !== renderId) {
        URL.revokeObjectURL(localUrl);
        log.warn('Render obsoleto — URL local descartada');
        return;
      }

      // 18. Render concluído com sucesso — atualiza estado
      set({
        status: 'completed' as RenderStatus,
        isRendering: false,
        renderProgress: 100,
        renderStatusText: 'Exportação concluída!',
        outputBlob: blob,
        outputUrl: localUrl,
        error: null,
        lastProgressUpdateAt: Date.now(),
        speedPaintWarnings: collectedWarnings,
      });
      useVideoRenderBridge.getState().syncExportState(false, 100);

      trackAnalyticsEvent('video_export_completed', {
        ...analyticsParams,
        codec: get().codec,
        container: get().container,
      });

      // 19. Telemetria: emite evento offroute APÓS set() completo
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath !== '/app/video' && currentPath !== '/app/pintura-rapida') {
        trackAnalyticsEvent('video_export_completed_offroute', {
          ...analyticsParams,
          codec: get().codec,
          container: get().container,
          source: currentPath,
        });
      }

      // 20. Salva no projeto local de forma não-bloqueante
      if (projectId) {
        const durationInSeconds = durationInFrames / fps;
        const format = get().container === 'webm' ? 'webm' : 'mp4';
        // Passa URL local (capturada no closure) — não usa get().outputUrl global
        saveVideoToProject(
          {
            projectId,
            userId: userId ?? '',
            videoUrl: localUrl,
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
          if (currentRenderId !== renderId) return;
          set({
            saveWarning: 'O vídeo foi exportado, mas não foi possível salvá-lo localmente. Você ainda pode baixá-lo agora.',
          });
        });
      }
    } catch (err: unknown) {
      // Ignora erros de renders antigos (outra renderização já iniciou)
      if (currentRenderId !== renderId) return;

      const cancelled = isCancellationError(err);
      trackAnalyticsEvent(cancelled ? 'video_export_cancelled' : 'video_export_failed', {
        ...analyticsParams,
        error_category: categorizeAnalyticsError(err),
      });

      set({
        status: cancelled ? ('cancelled' as RenderStatus) : ('failed' as RenderStatus),
        isRendering: false,
        error: cancelled ? null : toUserFriendlyError(err, log),
        renderStatusText: cancelled ? 'Exportação cancelada.' : get().renderStatusText,
      });
      useVideoRenderBridge.getState().syncExportState(false, get().renderProgress);
    } finally {
      // Limpa refs apenas se esta ainda é a renderização atual
      if (currentRenderId === renderId) {
        abortController = null;
        lastReportedPercentRef.current = -1;
      }
    }
  },

  // -------------------------------------------------------------------------
  // cancelRender — cancela render em andamento ou descarta blob
  // -------------------------------------------------------------------------
  cancelRender: () => {
    const state = get();

    // Se já completou, não descarta o blob — apenas marca como cancelado
    if (state.outputBlob) {
      set({
        status: 'cancelled' as RenderStatus,
        isRendering: false,
      });
      useVideoRenderBridge.getState().syncExportState(false, state.renderProgress);
      return;
    }

    // Aborta render em andamento
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // Revoga blob URL se existir (preemptivamente)
    if (state.outputUrl && state.outputUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.outputUrl);
    }

    set({
      status: 'cancelled' as RenderStatus,
      isRendering: false,
      outputBlob: null,
      outputUrl: null,
      renderProgress: 0,
      renderStatusText: 'Exportação cancelada.',
      error: null,
      startedAt: null,
      speedPaintWarnings: [],
    });
    useVideoRenderBridge.getState().syncExportState(false, 0);
  },

  // -------------------------------------------------------------------------
  // reset — limpa tudo (revoga blob URL, aborta, volta a 'idle')
  // -------------------------------------------------------------------------
  reset: () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    const url = get().outputUrl;
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }

    clearStrokeCache();
    currentExportFileName = '';

    set({
      ...INITIAL_STATE,
      kind: 'video' as RenderKind,
      status: 'idle' as RenderStatus,
    });
    useVideoRenderBridge.getState().syncExportState(false, 0);
  },

  // -------------------------------------------------------------------------
  // dismissSaveWarning — limpa APENAS o saveWarning, preservando outputBlob
  // -------------------------------------------------------------------------
  dismissSaveWarning: () => {
    set({ saveWarning: null });
  },

  // -------------------------------------------------------------------------
  // setCodecContainer — sincroniza codec/container resolvidos do hook
  // fachada (`useVideoExporter`). Chamado via useEffect quando
  // `useCodecSupport` resolve. Action nomeada evita setState externo direto
  // (mantém a fronteira de mutação encapsulada no store).
  // -------------------------------------------------------------------------
  setCodecContainer: (codec: string, container: string) => {
    set({ codec, container });
  },
}));

/** Retorna o fileName do último export — usado por `useVideoExporter.handleDownload`. */
export function getCurrentExportFileName(): string {
  return currentExportFileName;
}
