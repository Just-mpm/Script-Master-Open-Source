/**
 * Hook fachada para exportação de speed paint.
 *
 * Esta fachada fina delega todo o ciclo de vida de render para
 * `speedPaintRenderController` (singleton Zustand) que vive no `App.tsx` e
 * sobrevive à navegação entre rotas.
 *
 * **Contrato público preservado** — `SpeedPaintExporter`,
 * `SpeedPaintExportOptions`, `SpeedPaintBatchExportItem` e
 * `SpeedPaintBatchExportOptions` mantêm a mesma forma. Consumidores
 * (`SpeedPaintExportPanel`, `SpeedPaintPage`) não precisam mudar.
 *
 * **O que mudou:**
 * - Lógica pesada de `startRender` e `startBatchRender` (composições Remotion,
 *   renderMediaOnWeb, generateStrokesFromImage, getBlob, download automático)
 *   migrou para `speedPaintRenderController.startRender` /
 *   `startBatchRender`.
 * - O `useEffect` cleanup que abortava render no unmount foi **removido** —
 *   o controller gerencia seu próprio AbortController em escopo de módulo.
 * - Estado vem de `useSpeedPaintRenderController` via `useStore` (seletores
 *   primitivos, evitando re-render 30×/s em cascata).
 *
 * **`useCodecSupport` permanece local** (state de detecção de codec é
 * por-instância; não migra para controller). Esta fachada também é
 * responsável por sincronizar `codec`/`container` resolvidos de volta no
 * controller — o controller não chama `checkSupport` por conta própria.
 *
 * @see speedPaintRenderController contract — `docs/plan/video-render-survive-navigation-architecture.md §3 M2`
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import type { StrokeAnimation, VetorialAnimation } from '../types';
import type { VideoExportQuality } from '../../video-render/types';
import { useCodecSupport } from '../../video-render/hooks/useCodecSupport';
import { downloadFile } from '../../../lib/download';
import { trackAnalyticsEvent } from '../../../lib/analytics';
import {
  useSpeedPaintRenderController,
  getCurrentExportFileName,
} from '../store/speedPaintRenderController';

// ---------------------------------------------------------------------------
// Tipos públicos (contrato preservado)
// ---------------------------------------------------------------------------

/**
 * Opções para iniciar a exportação de speed paint.
 *
 * `animation` aceita a união `StrokeAnimation | VetorialAnimation` —
 * GAP-02 (reauditoria F5.5). A fachada apenas delega para o
 * `speedPaintRenderController` que já discrimina via `'paths' in animation`
 * em runtime. A tipagem reflete a realidade do controller (que opera com a
 * união desde a Fase 2.1), removendo o cast `as StrokeAnimation` que
 * "engenhariava" o consumidor.
 *
 * **O que o controller faz com a união:**
 * - Modo `'mask'` + `StrokeAnimation` → `createExportableSpeedPaintComposition`
 * - Modo `'vetorial'` + `VetorialAnimation` → `createExportableWhiteboardComposition`
 * - Modo divergente (ex: `'vetorial'` mas só `StrokeAnimation`) → fallback mask
 *
 * `imageSource` permanece obrigatório em ambos os modos porque a página
 * sempre passa `resizedImage || inputImage` (campos comuns aos dois tipos).
 * O controller valida `!isVetorial && !imageSource` antes de prosseguir.
 */
export interface SpeedPaintExportOptions {
  animation: StrokeAnimation | VetorialAnimation;
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
  showDrawTool: boolean;
  fileName: string;
  sceneDurationSeconds: number;
  /**
   * Modo de renderização uniforme para o lote (D04: lote uniforme, não misto).
   * Default `undefined` = comportamento legado (mask).
   */
  renderMode?: import('../types').SpeedPaintRenderMode;
  /**
   * Preset vetorial (só usado quando `renderMode === 'vetorial'`).
   * Default `undefined` = `'artistic1'` (default da `animationStore`).
   */
  vetorialPreset?: import('../types').VetorialPreset;
}

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
// Hook fachada
// ---------------------------------------------------------------------------

/**
 * Tipo do retorno do hook — explicitado para que consumidores possam
 * tipar props (`exporter: SpeedPaintExporter`).
 */
export type SpeedPaintExporter = ReturnType<typeof useSpeedPaintExporter>;

export function useSpeedPaintExporter(): {
  // Estado do controller
  isRendering: boolean;
  renderProgress: number;
  renderStatusText: string;
  outputBlob: Blob | null;
  outputUrl: string | null;
  error: string | null;
  wasCancelled: boolean;
  currentBatchIndex: number;
  totalBatchItems: number;
  // Codec support (local)
  canRender: boolean | null;
  resolvedVideoCodec: string;
  resolvedContainer: string;
  supportsHtmlInCanvas: boolean;
  // Ações
  checkSupport: (width: number, height: number) => Promise<void>;
  resetSupport: () => void;
  startRender: (options: SpeedPaintExportOptions) => Promise<void>;
  startBatchRender: (options: SpeedPaintBatchExportOptions) => Promise<void>;
  handleCancel: () => void;
  handleDownload: () => void;
  reset: () => void;
} {
  // ── 1. Estado do controller (singleton) — seletores primitivos ─────
  // Cada `useStore` com seletor primitivo re-renderiza APENAS quando aquela
  // slice muda. Isso evita re-render em cascata 30×/s durante progresso.
  const isRendering = useStore(useSpeedPaintRenderController, (s) => s.isRendering);
  const renderProgress = useStore(useSpeedPaintRenderController, (s) => s.renderProgress);
  const renderStatusText = useStore(useSpeedPaintRenderController, (s) => s.renderStatusText);
  const outputBlob = useStore(useSpeedPaintRenderController, (s) => s.outputBlob);
  const outputUrl = useStore(useSpeedPaintRenderController, (s) => s.outputUrl);
  const error = useStore(useSpeedPaintRenderController, (s) => s.error);
  const wasCancelled = useStore(useSpeedPaintRenderController, (s) => s.wasCancelled);
  const currentBatchIndex = useStore(useSpeedPaintRenderController, (s) => s.currentBatchIndex);
  const totalBatchItems = useStore(useSpeedPaintRenderController, (s) => s.totalBatchItems);

  // ── 2. Codec support (hook local — não migra para controller) ─────
  const codecSupport = useCodecSupport({ muted: true });

  // ── 3. Sincroniza codec/container resolvidos de volta no controller.
  //    O controller não chama `checkSupport` por conta própria — ele lê
  //    `get().codec` e `get().container` ao montar a chamada do
  //    `renderMediaOnWeb` e ao escolher a extensão do download. Sem esta
  //    sincronização, o controller usaria sempre os defaults do estado
  //    inicial ('h264'/'mp4'), ignorando o fallback VP8/WebM em browsers
  //    sem suporte a H.264.
  useEffect(() => {
    useSpeedPaintRenderController.getState().setCodecContainer(
      codecSupport.resolvedVideoCodec,
      codecSupport.resolvedContainer,
    );
  }, [codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer]);

  // ── 4. Sincroniza canRender do codecSupport para o estado do exporter
  //    (mesmo padrão de `useVideoExporter` — `canRender` fica em useState
  //    local para que o componente consumidor não dependa do codecSupport
  //    diretamente).
  const [canRender, setCanRender] = useState<boolean | null>(null);
  useEffect(() => {
    setCanRender(codecSupport.canRender);
  }, [codecSupport.canRender]);

  // ── 5. Refs estáveis para `checkSupport`/`resetSupport` — estabiliza
  //    os callbacks abaixo sem depender do objeto `codecSupport` (que
  //    muda a cada render do useCodecSupport).
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

  const resetSupport = useCallback(() => {
    resetSupportRef.current();
  }, []);

  // ── 6. Handlers thin — só delegam para o controller ──────────────

  const startRender = useCallback(async (options: SpeedPaintExportOptions) => {
    await useSpeedPaintRenderController.getState().startRender(options);
  }, []);

  const startBatchRender = useCallback(async (options: SpeedPaintBatchExportOptions) => {
    await useSpeedPaintRenderController.getState().startBatchRender(options);
  }, []);

  const handleCancel = useCallback(() => {
    useSpeedPaintRenderController.getState().cancelRender();
  }, []);

  const handleDownload = useCallback(() => {
    const state = useSpeedPaintRenderController.getState();
    const url = state.outputUrl;
    if (!url) return;
    const ext = state.container === 'webm' ? 'webm' : 'mp4';
    const name = getCurrentExportFileName() || `speed-paint-${Date.now()}`;
    void downloadFile(url, `${name}.${ext}`);
    trackAnalyticsEvent('speed_paint_downloaded', {
      codec: state.codec,
      container: state.container,
    });
  }, []);

  const reset = useCallback(() => {
    useSpeedPaintRenderController.getState().reset();
  }, []);

  // ── 7. Actions estáveis — referência só muda quando os useCallback internos
  //    mudam (deps vazias, então a referência é estável). Memorizar o objeto
  //    de actions em useMemo dedicado evita re-criá-lo a cada render, o que
  //    manteria o objeto de retorno com referência nova mesmo quando apenas
  //    `renderProgress` ou `currentBatchIndex` mudam.
  const actions = useMemo(
    () => ({
      checkSupport,
      resetSupport,
      startRender,
      startBatchRender,
      handleCancel,
      handleDownload,
      reset,
    }),
    [checkSupport, resetSupport, startRender, startBatchRender, handleCancel, handleDownload, reset],
  );

  // ── 8. Retorna estado consolidado (preservando forma do contrato) ──
  // Actions são spread do useMemo estável — não causam re-criação quando
  // apenas o estado muda (ex: renderProgress 30×/s).
  return useMemo(
    () => ({
      isRendering,
      renderProgress,
      renderStatusText,
      outputBlob,
      outputUrl,
      error,
      wasCancelled,
      currentBatchIndex,
      totalBatchItems,
      canRender,
      resolvedVideoCodec: codecSupport.resolvedVideoCodec,
      resolvedContainer: codecSupport.resolvedContainer,
      supportsHtmlInCanvas: codecSupport.supportsHtmlInCanvas,
      ...actions,
    }),
    [
      isRendering,
      renderProgress,
      renderStatusText,
      outputBlob,
      outputUrl,
      error,
      wasCancelled,
      currentBatchIndex,
      totalBatchItems,
      canRender,
      codecSupport.resolvedVideoCodec,
      codecSupport.resolvedContainer,
      codecSupport.supportsHtmlInCanvas,
      actions,
    ],
  );
}
