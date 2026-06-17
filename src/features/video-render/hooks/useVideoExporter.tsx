/**
 * Hook fachada para exportação de vídeo.
 *
 * Esta fachada fina delega todo o ciclo de vida de render para
 * `videoRenderController` (singleton Zustand) que vive no `App.tsx` e
 * sobrevive à navegação entre rotas.
 *
 * **Contrato público preservado** — `VideoExporter`, `VideoExportOptions`
 * e `VideoExporterState` mantêm a mesma forma. Consumidores
 * (`VideoExportPanel`, `useSpeedPaintExporter`) não precisam mudar.
 *
 * **O que mudou:**
 * - Lógica pesada de `startRender` (speed paint, mapping, renderMediaOnWeb,
 *   getBlob, saveVideoToProject) migrou para `videoRenderController.startRender`.
 * - O `useEffect` cleanup que abortava render no unmount foi **removido** —
 *   o controller gerencia seu próprio AbortController em escopo de módulo.
 * - Estado vem de `useVideoRenderController` via `useStore` (seletores
 *   primitivos, evitando re-render 30×/s em cascata).
 *
 * **`useCodecSupport` permanece local** (state de detecção de codec é
 * por-instância; não migra para controller).
 *
 * @see videoRenderController contract — `docs/plan/video-render-survive-navigation-architecture.md §3 M3`
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { CaptionWord, SubtitleStyle, VideoExportQuality } from '../types';
import type { SpeedPaintSpeed, SpeedPaintMultipliers } from '../types';
import type { SpeedPaintRenderMode, VetorialPreset } from '../../speed-paint/types';
import type { SceneRatio, StudioScene } from '../../studio/types';
import { useCodecSupport } from './useCodecSupport';
import { downloadFile } from '../../../lib/download';
import { useVideoRenderController, getCurrentExportFileName } from '../store/videoRenderController';
import { trackAnalyticsEvent } from '../../../lib/analytics';

// ---------------------------------------------------------------------------
// Tipos públicos (contrato preservado)
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
  /** Modo de renderização do Speed Paint (L7 / RF-06). `undefined` ou
   *  `'mask'` preserva o comportamento legado (raspadinha). `'vetorial'`
   *  aciona a animação whiteboard via `imagetracerjs`. Lido da
   *  `videoRenderBridge` na `VideoPage` para manter escopo de sessão. */
  renderMode?: SpeedPaintRenderMode;
  /** Preset do `imagetracerjs` (só aplicado quando `renderMode === 'vetorial'`).
   *  Ignorado em modo `'mask'`. Lido da `videoRenderBridge` na `VideoPage`. */
  vetorialPreset?: VetorialPreset;
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

// ---------------------------------------------------------------------------
// Hook fachada
// ---------------------------------------------------------------------------

export function useVideoExporter(): VideoExporterState & {
  supportsHtmlInCanvas: boolean;
  checkSupport: (width: number, height: number) => Promise<void>;
  startRender: (options: VideoExportOptions) => Promise<void>;
  handleCancel: () => void;
  handleDownload: () => void;
  dismissSaveWarning: () => void;
  reset: () => void;
} {
  // ── 1. Estado do controller (singleton) — seletores primitivos ─────
  // Cada `useStore` com seletor primitivo re-renderiza APENAS quando aquela
  // slice muda. Isso evita re-render em cascata 30×/s durante progresso.
  const isRendering = useStore(useVideoRenderController, (s) => s.isRendering);
  const renderProgress = useStore(useVideoRenderController, (s) => s.renderProgress);
  const renderStatusText = useStore(useVideoRenderController, (s) => s.renderStatusText);
  const outputBlob = useStore(useVideoRenderController, (s) => s.outputBlob);
  const outputUrl = useStore(useVideoRenderController, (s) => s.outputUrl);
  const error = useStore(useVideoRenderController, (s) => s.error);
  // speedPaintWarnings é um array (referência muda quando o controller adiciona
  // itens durante speed paint). `useShallow` faz comparação rasa para evitar
  // re-render quando o array é recriado com os mesmos itens.
  const speedPaintWarnings = useStore(
    useVideoRenderController,
    useShallow((s) => s.speedPaintWarnings),
  );
  // saveWarning vem do controller — setado por M1 quando `saveVideoToProject`
  // falha após exportação bem-sucedida. Diferente de `error` (que indica falha
  // de render): aqui o vídeo está pronto e o usuário pode baixá-lo.
  const saveWarning = useStore(useVideoRenderController, (s) => s.saveWarning);

  // ── 2. Codec support (hook local — não migra para controller) ───
  const codecSupport = useCodecSupport({ muted: false });

  // ── 3. Sincroniza codec/container resolvidos de volta no controller.
  //    O controller não chama `checkSupport` por conta própria — ele lê
  //    `get().codec` e `get().container` ao montar a chamada do
  //    `renderMediaOnWeb`. Sem esta sincronização, o controller usaria
  //    sempre os defaults do estado inicial ('h264'/'mp4'), ignorando
  //    o fallback VP8/WebM em browsers sem suporte a H.264.
  useEffect(() => {
    useVideoRenderController.getState().setCodecContainer(
      codecSupport.resolvedVideoCodec,
      codecSupport.resolvedContainer,
    );
  }, [codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer]);

  // ── 4. Sincroniza canRender do codecSupport para o estado do exporter
  //    (M3 deriva canRender de codecSupport, como antes)
  const [canRender, setCanRender] = useState<boolean | null>(null);
  useEffect(() => {
    setCanRender(codecSupport.canRender);
  }, [codecSupport.canRender]);

  // ── 4. speedPaintWarnings — derivado do controller ──
  //    O controller acumula warnings durante a fase de speed paint e os
  //    expõe no estado. Reset acontece em `controller.reset()` ou quando
  //    `cancelRender()` é chamado sem blob pronto.

  // ── 5. Handlers thin — só delegam para o controller ──────────────

  // Ref para `codecSupport.checkSupport` — estabiliza o callback abaixo sem
  // depender do objeto `codecSupport` (que muda a cada render do useCodecSupport).
  const checkSupportRef = useRef(codecSupport.checkSupport);
  useEffect(() => {
    checkSupportRef.current = codecSupport.checkSupport;
  }, [codecSupport.checkSupport]);

  const checkSupport = useCallback(async (width: number, height: number) => {
    await checkSupportRef.current(width, height);
  }, []);

  const startRender = useCallback(async (options: VideoExportOptions) => {
    await useVideoRenderController.getState().startRender(options);
  }, []);

  const handleCancel = useCallback(() => {
    useVideoRenderController.getState().cancelRender();
  }, []);

  const handleDownload = useCallback(() => {
    const url = useVideoRenderController.getState().outputUrl;
    if (!url) return;
    const container = useVideoRenderController.getState().container;
    const codec = useVideoRenderController.getState().codec;
    const ext = container === 'webm' ? 'webm' : 'mp4';
    const name = getCurrentExportFileName() || `video-export-${Date.now()}`;
    void downloadFile(url, `${name}.${ext}`);
    trackAnalyticsEvent('video_downloaded', {
      codec,
      container,
    });
  }, []);

  const dismissSaveWarning = useCallback(() => {
    useVideoRenderController.getState().dismissSaveWarning();
  }, []);

  const reset = useCallback(() => {
    useVideoRenderController.getState().reset();
  }, []);

  // ── 7. Actions estáveis — referência só muda quando os useCallback internos
  //    mudam (deps vazias, então a referência é estável). Memorizar o objeto
  //    de actions em useMemo dedicado evita re-criá-lo a cada render, o que
  //    manteria o objeto de retorno com referência nova mesmo quando apenas
  //    `renderProgress` muda.
  const actions = useMemo(
    () => ({
      checkSupport,
      startRender,
      handleCancel,
      handleDownload,
      dismissSaveWarning,
      reset,
    }),
    [checkSupport, startRender, handleCancel, handleDownload, dismissSaveWarning, reset],
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
      canRender,
      saveWarning,
      speedPaintWarnings,
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
      canRender,
      saveWarning,
      speedPaintWarnings,
      codecSupport.resolvedVideoCodec,
      codecSupport.resolvedContainer,
      codecSupport.supportsHtmlInCanvas,
      actions,
    ],
  );
}

/** Tipo do retorno do hook useVideoExporter — útil para passar via props */
export type VideoExporter = ReturnType<typeof useVideoExporter>;
