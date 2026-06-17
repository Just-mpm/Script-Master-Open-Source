import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import type { SelectChangeEvent } from '@mui/material/Select';
import ArrowBack from '@mui/icons-material/ArrowBack';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import BrushOutlined from '@mui/icons-material/BrushOutlined';
import CenterFocusStrongOutlined from '@mui/icons-material/CenterFocusStrongOutlined';
import FormatPaintOutlined from '@mui/icons-material/FormatPaintOutlined';
import GestureOutlined from '@mui/icons-material/GestureOutlined';
import KeyboardArrowDownOutlined from '@mui/icons-material/KeyboardArrowDownOutlined';
import ShuffleOutlined from '@mui/icons-material/ShuffleOutlined';
import SportsBaseballOutlined from '@mui/icons-material/SportsBaseballOutlined';
import TimelineOutlined from '@mui/icons-material/TimelineOutlined';
import WaterOutlined from '@mui/icons-material/WaterOutlined';
import { alpha } from '@mui/material/styles';
import { useShallow } from 'zustand/react/shallow';
import { useAnimationStore } from '../features/speed-paint/store/animationStore';
import { BatchOrchestrator } from '../features/speed-paint/components/batch/BatchOrchestrator';
import { QueueStaging } from '../features/speed-paint/components/batch/QueueStaging';
import { SpeedPaintPlayer } from '../features/speed-paint/components/SpeedPaintPlayer';
import { SpeedPaintPlayerControls } from '../features/speed-paint/components/SpeedPaintPlayerControls';
import { SpeedPaintExportPanel } from '../features/speed-paint/components/SpeedPaintExportPanel';
import { useSpeedPaintExporter } from '../features/speed-paint/hooks/useSpeedPaintExporter';
import { VETORIAL_PRESETS_GROUPED } from '../features/speed-paint/constants/vetorialPresets';
import { ExportProgressBar } from '../features/video-render/components/export/ExportProgressBar';
import { ExportResultActions } from '../features/video-render/components/export/ExportResultActions';
import { ImageUpload } from '../features/speed-paint/components/upload/ImageUpload';
import { useLocale, pluralKey } from '../features/i18n';
import { DocumentHead } from '../components/DocumentHead';
import { getPageSeo } from '../lib/seo';
import { trackAnalyticsEvent } from '../lib/analytics';
import { createLogger } from '../lib/logger';
import { getStrokeAnimation, isStrokeAnimation, isVetorialAnimation, setStrokeAnimation } from '../features/video-render/lib/strokeCache';
import type { SpeedPaintTimingMode } from '../features/video-render/lib/speedPaintTimings';
import type { SpeedPaintRenderMode, StrokeAnimation, VetorialAnimation, VetorialPreset } from '../features/speed-paint/types';
import type { VetorialEasingType, VetorialPathSortOrder } from '../features/speed-paint/types/vetorial';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_PRIMARY_LIGHT,
  EMPTY_WRAPPER_MAX_WIDTH,
  EMPTY_WRAPPER_PADDING_MD,
  GAP_COMPACT,
  GAP_DEFAULT,
  GAP_MEDIUM,
  ICON_SIZE_MD,
  RADIUS_CHIP,
  RADIUS_SM,
  RADIUS_XS,
  WHITE_08,
  WHITE_14,
} from '../theme/tokens';
import { glassSurfaceSx } from '../theme/surfaces';
import { StackedHeader } from '../components/ui';
import { useCollapsibleSection } from '../hooks/useCollapsibleSection';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const FPS = 30;

// Conjunto das 4 opções de `vetorialSortOrder` (L9, RF-09). Espelha o padrão
// de `VETORIAL_PRESET_VALUES` no topo do arquivo — fonte única de verdade
// para discriminação em runtime via type guard, sem `as VetorialPathSortOrder`
// bypass no handler do `ToggleButtonGroup`.
const VETORIAL_SORT_ORDER_VALUES: ReadonlySet<string> = new Set<VetorialPathSortOrder>([
  'top-down',
  'center-out',
  'big-first',
  'random',
]);

function isVetorialSortOrder(value: string): value is VetorialPathSortOrder {
  return VETORIAL_SORT_ORDER_VALUES.has(value);
}

const VETORIAL_EASING_VALUES: ReadonlySet<string> = new Set<VetorialEasingType>([
  'linear',
  'smooth',
  'bounce',
]);

function isVetorialEasingType(value: string): value is VetorialEasingType {
  return VETORIAL_EASING_VALUES.has(value);
}

/**
 * `sx` compartilhado entre os `ToggleButtonGroup`s do modo vetorial
 * (ordem de desenho + easing). Espelha o estilo do seletor de modo de
 * renderização (linhas próximas a `renderMode`) — mesma marca visual:
 * glow no estado ativo, hover com borda da marca, focus visível com
 * outline. Centralizado para evitar duplicação e garantir consistência
 * quando algum dos seletores mudar de estilo.
 */
const vetorialToggleButtonGroupSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1,
  '& .MuiToggleButtonGroup-grouped': {
    borderRadius: RADIUS_XS,
    border: `1px solid ${WHITE_14}`,
    px: 2,
    py: 1.25,
    fontWeight: 700,
    textTransform: 'none',
    color: 'text.secondary',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      borderColor: alpha(BRAND_PRIMARY, 0.4),
      backgroundColor: alpha(BRAND_PRIMARY, 0.04),
    },
    '&.Mui-selected': {
      color: BRAND_PRIMARY_LIGHT,
      borderColor: alpha(BRAND_PRIMARY, 0.6),
      backgroundColor: alpha(BRAND_PRIMARY, 0.12),
      boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}, inset 0 0 0 1px ${alpha(BRAND_PRIMARY, 0.3)}`,
    },
    '&.Mui-selected:hover': {
      backgroundColor: alpha(BRAND_PRIMARY, 0.18),
      borderColor: BRAND_PRIMARY,
    },
    '&.Mui-focusVisible': {
      outline: `2px solid ${BRAND_PRIMARY_LIGHT}`,
      outlineOffset: 2,
    },
  },
} as const;

function getCombinedBatchExportFileName(queueLength: number): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `speed-paint-lote-${queueLength}itens-${timestamp}`;
}

// Type guard para narrowing real em compile-time de `string` para o union
// `VetorialPreset` no handler do `<Select>` de presets. O Set é derivado de
// `VETORIAL_PRESETS_GROUPED` (fonte única de verdade do agrupamento) e
// elimina o `as VetorialPreset` bypass que existia no handler — narrowing
// autêntico via discriminated check em runtime, sem `as`/any.
const VETORIAL_PRESET_VALUES: ReadonlySet<string> = new Set(
  VETORIAL_PRESETS_GROUPED.flatMap((group) => group.presets),
);

function isVetorialPreset(value: string): value is VetorialPreset {
  return VETORIAL_PRESET_VALUES.has(value);
}

const log = createLogger('speed-paint-page');

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function SpeedPaintPage() {
  const { t } = useLocale();
  const playerRef = useRef<PlayerRef>(null);
  const speedPaintExporter = useSpeedPaintExporter();
  const [isBatchRecording, setIsBatchRecording] = useState(false);
  const batchRenderStartedRef = useRef(false);
  // Refs para race protection no reprocessamento por troca de modo de renderização
  // (padrão do `BatchOrchestrator.tsx:33-35` — `processingIdRef` + `abortControllerRef`).
  const processingIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Estado de erro de reprocessamento (exibido em `Alert` com `role="alert"` para WCAG 2.1 AA).
  const [modeProcessingError, setModeProcessingError] = useState<string | null>(null);
  const configSection = useCollapsibleSection(true);
  const [activeTab, setActiveTab] = useState<'controls' | 'export'>('controls');

  // Store selectors (useShallow para evitar re-renders desnecessários)
  // `renderMode` é lido da store (Fase 1.3) para alimentar o seletor de modo
  // adicionado na Fase 4.1. `vetorialPreset` (Fase 4.2) alimenta o seletor
  // de estilo do modo Desenho — só visível quando `renderMode === 'vetorial'`.
  // `vetorialSortOrder` (L9, RF-09) e `easing` (L10, RF-10) seguem o mesmo
  // padrão — só visíveis no modo `vetorial`.
  const { job, queue, currentIndex, batchMode, queueSource, queueSourceProjectName, queueSourceNotice, animationDuration, showDrawTool, canvasColor, renderMode, vetorialPreset, vetorialSortOrder, easing } =
    useAnimationStore(
      useShallow((s) => ({
        job: s.job,
        queue: s.queue,
        currentIndex: s.currentIndex,
        batchMode: s.batchMode,
        queueSource: s.queueSource,
        queueSourceProjectName: s.queueSourceProjectName,
        queueSourceNotice: s.queueSourceNotice,
        animationDuration: s.animationDuration,
        showDrawTool: s.showDrawTool,
        canvasColor: s.canvasColor,
        renderMode: s.renderMode,
        vetorialPreset: s.vetorialPreset,
        vetorialSortOrder: s.vetorialSortOrder,
        easing: s.easing,
      })),
    );

  const { setAnimationDuration, setShowDrawTool, setCanvasColor, resetJob, clearQueue } =
    useAnimationStore(
      useShallow((s) => ({
        setAnimationDuration: s.setAnimationDuration,
        setShowDrawTool: s.setShowDrawTool,
        setCanvasColor: s.setCanvasColor,
        resetJob: s.resetJob,
        clearQueue: s.clearQueue,
      })),
    );
  // Seletores individuais (reconhecidos como estáveis pelo `react-hooks/exhaustive-deps`).
  // Padrão do `BatchOrchestrator.tsx:28-31`. `useShallow` esconde as referências de
  // setters em um objeto intermediário, então o lint não consegue inferir que são
  // estáveis — declarar via `useStore(selector)` resolve.
  const setRenderMode = useAnimationStore((s) => s.setRenderMode);
  const setVetorialPreset = useAnimationStore((s) => s.setVetorialPreset);
  const setVetorialSortOrder = useAnimationStore((s) => s.setVetorialSortOrder);
  const setEasing = useAnimationStore((s) => s.setEasing);
  const setJob = useAnimationStore((s) => s.setJob);

  const queueLength = queue.length;
  const eligibleBatchQueue = useMemo(
    () => queue.filter((item) => item.status !== 'failed'),
    [queue],
  );
  const failedBatchCount = queueLength - eligibleBatchQueue.length;
  const isCompleted = job.status === 'completed' && Boolean(job.animation);
  const isBatchWatchPreview = batchMode === 'watch' && queueLength > 0;
  const previewTimingMode: SpeedPaintTimingMode = isBatchWatchPreview ? 'sequenced-batch' : 'duration-based';
  const isLastBatchPreviewScene = currentIndex >= Math.max(0, queueLength - 1);

  // Duração fixa — unificada com a velocidade (sliders controlam o ritmo, não o container)
  const durationInFrames = useMemo(() => Math.round(animationDuration * FPS), [animationDuration]);
  // `job.animation` é `StrokeAnimation | VetorialAnimation | undefined`. O player
  // e o export panel agora aceitam a união (GAP-01/GAP-02 da reauditoria F5.5)
  // — o `SpeedPaintPlayer` discrimina via `'paths' in animation` e renderiza
  // `WhiteboardComposition` (vetorial) ou `SpeedPaintComposition` (mask).
  // O `ExportPanel` propaga para `useSpeedPaintExporter.startRender`, que
  // também opera com a união. Sem cast — narrowing real dentro dos filhos.
  const revealThreshold =
    job.animation && 'revealThreshold' in job.animation
      ? job.animation.revealThreshold
      : undefined;

  // -------------------------------------------------------------------------
  // Auto-switch para aba de export quando renderização iniciar
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (speedPaintExporter.isRendering) {
      setActiveTab('export');
    }
  }, [speedPaintExporter.isRendering]);

  useEffect(() => {
    if (batchMode === 'idle') {
      batchRenderStartedRef.current = false;
    }
  }, [batchMode]);

  // -------------------------------------------------------------------------
  // Batch auto-advance (modo watch)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (batchMode !== 'watch') return;

    let rafId: number;
    const checkCompletion = () => {
      const player = playerRef.current;
      if (!player) {
        rafId = requestAnimationFrame(checkCompletion);
        return;
      }

      const currentFrame = player.getCurrentFrame();
      const isPlaying = player.isPlaying();

      if (currentFrame >= durationInFrames - 1 && !isPlaying) {
        // Animação completou — avançar para próxima imagem
        const { currentIndex, queue: currentQueue, setCurrentIndex, setBatchMode, clearQueue: doClear } =
          useAnimationStore.getState();
        if (currentIndex + 1 < currentQueue.length) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setBatchMode('idle');
          doClear();
        }
        return; // Parar polling
      }

      rafId = requestAnimationFrame(checkCompletion);
    };

    rafId = requestAnimationFrame(checkCompletion);
    return () => cancelAnimationFrame(rafId);
  }, [batchMode, durationInFrames]);

  // -------------------------------------------------------------------------
  // Batch record — inicia exportação única da fila
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (batchMode !== 'record' || eligibleBatchQueue.length === 0 || batchRenderStartedRef.current) return;

    batchRenderStartedRef.current = true;
    setIsBatchRecording(true);
    void speedPaintExporter.startBatchRender({
      items: eligibleBatchQueue.map((item) => ({
        imageSource: item.dataUrl,
      })),
      fps: FPS,
      quality: '1080p',
      showDrawTool,
      fileName: getCombinedBatchExportFileName(eligibleBatchQueue.length),
      sceneDurationSeconds: animationDuration,
    });
  }, [animationDuration, batchMode, eligibleBatchQueue, showDrawTool, speedPaintExporter]);

  // -------------------------------------------------------------------------
  // Batch record — fechamento do fluxo
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isBatchRecording || speedPaintExporter.isRendering) return;

    if (speedPaintExporter.error) {
      useAnimationStore.getState().setBatchMode('idle');
      setIsBatchRecording(false);
      batchRenderStartedRef.current = false;
      return;
    }

    if (speedPaintExporter.wasCancelled) {
      useAnimationStore.getState().setBatchMode('idle');
      setIsBatchRecording(false);
      batchRenderStartedRef.current = false;
      return;
    }

    if (speedPaintExporter.outputUrl) {
      const { setBatchMode } = useAnimationStore.getState();
      setBatchMode('idle');
      setIsBatchRecording(false);
      batchRenderStartedRef.current = false;
    }
  }, [isBatchRecording, speedPaintExporter]);

  const showBatchExportPanel = batchMode === 'record'
    || speedPaintExporter.isRendering
    || speedPaintExporter.outputUrl != null
    || speedPaintExporter.error != null
    || speedPaintExporter.wasCancelled;
  const isBatchRendering = speedPaintExporter.isRendering;
  const batchProgressValue = `${Math.round(speedPaintExporter.renderProgress)}%`;
  const batchProgressHelperText = failedBatchCount > 0
    ? `${t(pluralKey('speedPaint.queueFinalVideoSummary', eligibleBatchQueue.length), { eligible: eligibleBatchQueue.length })} ${t(pluralKey('speedPaint.queueFailedSummary', failedBatchCount), { failed: failedBatchCount })}`
    : t(pluralKey('speedPaint.queueFinalVideoSummary', eligibleBatchQueue.length), { eligible: eligibleBatchQueue.length });
  const batchSummaryText = speedPaintExporter.isRendering
    ? speedPaintExporter.renderStatusText
    : speedPaintExporter.error
      ? t('speedPaint.batchExportErrorDescription')
      : speedPaintExporter.wasCancelled
        ? t('speedPaint.batchExportCancelledTitle')
        : speedPaintExporter.outputUrl
          ? speedPaintExporter.renderStatusText
          : t(pluralKey('speedPaint.queueFinalVideoSummary', eligibleBatchQueue.length), { eligible: eligibleBatchQueue.length });
  const queueProjectName = queueSourceProjectName ?? t('library.title');

  const handleBatchExportReset = () => {
    speedPaintExporter.reset();
    clearQueue();
    resetJob();
    setIsBatchRecording(false);
    batchRenderStartedRef.current = false;
  };

  const handleBatchExportBackToQueue = () => {
    speedPaintExporter.reset();
    setIsBatchRecording(false);
    batchRenderStartedRef.current = false;
  };

  const handleBatchExportRetry = () => {
    speedPaintExporter.reset();
    setIsBatchRecording(false);
    batchRenderStartedRef.current = false;
    useAnimationStore.getState().setBatchMode('record');
  };

  // -------------------------------------------------------------------------
  // Reprocessamento (Fase 4.1 + 4.2) — handler do seletor Clássico/Desenho
  // e do seletor de `vetorialPreset` (RF-02 + RF-03).
  // -------------------------------------------------------------------------

  /**
   * Reprocessa a imagem atual no `mode` informado, reaproveitando o cache
   * LRU. Extraído de `handleRenderModeChange` na Fase 4.2 para evitar
   * duplicação com `handlePresetChange` (mesma lógica: abort anterior,
   * cache, gerar, cachear).
   *
   * Comportamento:
   * 1) aborta o `AbortController` do processamento anterior;
   * 2) marca novo `processId` em `processingIdRef` (race protection —
   *    padrão do `BatchOrchestrator.tsx`);
   * 3) consulta o cache LRU antes de reprocessar;
   * 4) em cache miss, delega para `generateStrokesFromImage` via dynamic
   *    import (mantém o bundle da página enxuto);
   * 5) salva o resultado no cache para evitar reprocessamento futuro.
   *
   * O `vetorialPreset` é lido via `useAnimationStore.getState()` no
   * momento da chamada (não via closure) para evitar estado obsoleto
   * quando o usuário troca o preset entre dois cliques no ToggleButton.
   */
  const reprocessCurrentImage = useCallback(async (mode: SpeedPaintRenderMode): Promise<void> => {
    const { job, vetorialPreset: currentPreset, vetorialSortOrder: currentSortOrder } = useAnimationStore.getState();
    if (!job.inputImage || job.status === 'processing') return;

    // 1. Abortar processamento anterior
    abortControllerRef.current?.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    // 2. Marca ID para race protection
    const processId = `${Date.now()}-${Math.random()}`;
    processingIdRef.current = processId;
    setJob({ status: 'processing', progress: 0 });

    try {
      // 3. Consulta cache primeiro (evita reprocessamento desnecessário).
      // Branches separados para narrowar `mode` aos literais exigidos pelas
      // overloads de `getStrokeAnimation` (sem `as` bypass) — narrowing real
      // em compile-time via discriminação por igualdade de literal.
      // A chave do cache inclui `preset` (Premissa #10) E `sortOrder`
      // (L9, RF-09) para evitar colisão entre ordenações diferentes.
      const cached: StrokeAnimation | VetorialAnimation | null = mode === 'vetorial'
        ? await getStrokeAnimation(job.inputImage, { mode: 'vetorial', preset: currentPreset, sortOrder: currentSortOrder })
        : await getStrokeAnimation(job.inputImage, { mode: 'mask' });
      if (processingIdRef.current !== processId) return;
      if (cached) {
        setJob({ animation: cached, status: 'completed', progress: 1 });
        return;
      }

      // 4. Cache miss — gera e cacheia
      const { generateStrokesFromImage } = await import('../features/speed-paint/lib/imageProcessing');
      const animation = await generateStrokesFromImage(
        job.inputImage,
        (p) => {
          if (processingIdRef.current !== processId) return;
          setJob({ progress: p });
        },
        {
          renderMode: mode,
          vetorialPreset: mode === 'vetorial' ? currentPreset : undefined,
          vetorialSortOrder: mode === 'vetorial' ? currentSortOrder : undefined,
          signal: ac.signal,
        },
      );
      if (processingIdRef.current !== processId) return;
      setJob({ status: 'completed', animation, progress: 1 });
      // Persiste no cache — branches discriminam o tipo de `animation` via
      // type guards de `strokeCache` (`isVetorialAnimation`/`isStrokeAnimation`),
      // narrowing real em compile-time sem `as` bypass.
      if (mode === 'vetorial' && isVetorialAnimation(animation)) {
        await setStrokeAnimation(job.inputImage, animation, { mode: 'vetorial', preset: currentPreset, sortOrder: currentSortOrder });
      } else if (mode === 'mask' && isStrokeAnimation(animation)) {
        await setStrokeAnimation(job.inputImage, animation, { mode: 'mask' });
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      if (processingIdRef.current !== processId) return;
      log.error('Falha ao reprocessar imagem', { error: err });
      setJob({ status: 'failed' });
      // Exibe feedback visual (Alert com `role="alert"` para WCAG 2.1 AA).
      const errorMessage = err instanceof Error ? err.message : String(err);
      setModeProcessingError(errorMessage);
    }
  }, [setJob]);

  /**
   * Lógica pura de reprocessamento por troca de modo — extraída de
   * `handleRenderModeChange` para que o botão de "Reprocessar" do Alert
   * de erro (`role="alert"`, severity="error") possa chamá-la sem
   * precisar forjar um `MouseEvent` sintético. O `ToggleButtonGroup`
   * continua usando `handleRenderModeChange` para satisfazer a
   * assinatura do `onChange`, mas a lógica vive aqui.
   */
  const reprocessInMode = useCallback(async (newMode: SpeedPaintRenderMode): Promise<void> => {
    // Limpa erro de tentativa anterior antes de iniciar novo reprocessamento
    setModeProcessingError(null);

    // Persistir na store IMEDIATAMENTE (UI feedback) antes do reprocessamento.
    setRenderMode(newMode);
    trackAnalyticsEvent('speed_paint_mode_changed', { mode: newMode });

    await reprocessCurrentImage(newMode);
    // Deps: `setRenderMode` e `reprocessCurrentImage` vêm de referências
    // estáveis (seletor individual Zustand / `useCallback` com deps internas
    // já estáveis). `setJob` é capturado via closure de `reprocessCurrentImage`.
  }, [setRenderMode, reprocessCurrentImage]);

  /**
   * Callback do `ToggleButtonGroup` de modo. Quando o usuário escolhe `null`
   * (clicando no botão já ativo) o `onChange` retorna `null`; nesse caso
   * mantemos o valor atual sem disparar `setRenderMode` (comportamento padrão
   * de grupos `exclusive` do MUI). A lógica de reprocessamento vive em
   * `reprocessInMode` — este handler só faz o guard de `null` e delega.
   */
  const handleRenderModeChange = useCallback(async (
    _event: React.MouseEvent<HTMLElement>,
    newMode: SpeedPaintRenderMode | null,
  ) => {
    if (newMode == null) return;
    await reprocessInMode(newMode);
  }, [reprocessInMode]);

  /**
   * Handler do seletor de `vetorialPreset` (RF-03 / Fase 4.2). Visível
   * apenas quando `renderMode === 'vetorial'`. Persiste o novo preset na
   * store, dispara evento de analytics e reprocessa a imagem atual usando
   * o helper compartilhado `reprocessCurrentImage` (mesma lógica de race
   * protection + cache LRU do `handleRenderModeChange`).
   */
  const handlePresetChange = useCallback(async (event: SelectChangeEvent<VetorialPreset>): Promise<void> => {
    // Narrowing real via type guard — `event.target.value` chega como
    // `string` (MUI expõe o overload do DOM); o type guard filtra para o
    // union `VetorialPreset` em compile-time, eliminando o `as` bypass.
    const newPreset = event.target.value;
    if (!isVetorialPreset(newPreset)) return;

    // Limpa erro de tentativa anterior antes de iniciar novo reprocessamento
    setModeProcessingError(null);

    // Persistir na store IMEDIATAMENTE (UI feedback)
    setVetorialPreset(newPreset);
    trackAnalyticsEvent('speed_paint_preset_changed', { preset: newPreset });

    // Reaproveita o helper compartilhado — seletor só fica visível no modo
    // vetorial, mas o guard interno já cobre o caso defensivo.
    await reprocessCurrentImage('vetorial');
  }, [setVetorialPreset, reprocessCurrentImage]);

  /**
   * Handler do `ToggleButtonGroup` de `vetorialSortOrder` (L9, RF-09). Visível
   * apenas quando `renderMode === 'vetorial'`. Quando o usuário escolhe `null`
   * (clicando no botão já ativo) o `onChange` retorna `null`; nesse caso
   * mantemos o valor atual sem disparar `setVetorialSortOrder` (comportamento
   * padrão de grupos `exclusive` do MUI). Persiste o novo valor na store,
   * dispara evento de analytics e reprocessa a imagem atual reaproveitando o
   * helper `reprocessCurrentImage` — a chave do cache LRU inclui `sortOrder`,
   * então uma ordenação diferente gera uma entrada distinta (sem colisão).
   */
  const handleSortOrderChange = useCallback(async (
    _event: React.MouseEvent<HTMLElement>,
    newOrder: VetorialPathSortOrder | null,
  ) => {
    if (newOrder == null) return;
    if (newOrder === vetorialSortOrder) return;

    // Limpa erro de tentativa anterior antes de iniciar novo reprocessamento
    setModeProcessingError(null);

    // Persistir na store IMEDIATAMENTE (UI feedback)
    setVetorialSortOrder(newOrder);
    trackAnalyticsEvent('speed_paint_sort_order_changed', { sortOrder: newOrder });

    // Reprocessa a imagem atual com a nova ordenação.
    await reprocessCurrentImage('vetorial');
  }, [vetorialSortOrder, setVetorialSortOrder, reprocessCurrentImage]);

  /**
   * Handler do `ToggleButtonGroup` de `easing` (L10, RF-10). Visível apenas
   * quando `renderMode === 'vetorial'`. Como o easing é aplicado em runtime
   * pelo `WhiteboardScene` (curva de progressão do `interpolate` do Remotion),
   * a troca é REATIVA — não precisa reprocessar a imagem. Persistir na store
   * basta; a próxima renderização do player já consome o novo valor.
   */
  const handleEasingChange = useCallback((
    _event: React.MouseEvent<HTMLElement>,
    newEasing: VetorialEasingType | null,
  ) => {
    if (newEasing == null) return;
    if (newEasing === easing) return;
    setEasing(newEasing);
    trackAnalyticsEvent('speed_paint_easing_changed', { easing: newEasing });
  }, [easing, setEasing]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const seo = getPageSeo({
    title: 'Speed Paint',
    description: 'Transforme imagens em animações de pintura progressiva com exportação de vídeo.',
    path: '/app/pintura-rapida',
  });

  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <DocumentHead {...seo} />
      <BatchOrchestrator />

      {/* Estado vazio — fila vazia */}
      {queueLength === 0 && (
        <Box sx={{ textAlign: 'center', py: EMPTY_WRAPPER_PADDING_MD }}>
          <Box sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH, mx: 'auto' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: 0,
                mb: 1,
              }}
            >
              {t('speedPaint.pageTitle')}
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  ml: 0.5,
                  background: BRAND_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('speedPaint.pageHighlight')}
              </Box>
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
            >
              {t('speedPaint.pageDescription')}
            </Typography>
          </Box>
          <ImageUpload />
        </Box>
      )}

      {/* QueueStaging — fila pronta para iniciar */}
      {queueLength > 0 && batchMode === 'idle' && !showBatchExportPanel && (
        <Stack spacing={GAP_MEDIUM}>
          {queueSource === 'library' ? (
            <Stack spacing={GAP_DEFAULT}>
              <Alert
                variant="outlined"
                severity="info"
                role="status"
                action={(
                  <Button color="inherit" size="small" onClick={clearQueue}>
                    {t('speedPaint.libraryQueueClearAction')}
                  </Button>
                )}
                sx={{
                  '& .MuiAlert-message': {
                    width: '100%',
                  },
                }}
              >
                <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    useFlexGap
                    sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, flexWrap: 'wrap' }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t('speedPaint.libraryQueueBannerTitle')}
                    </Typography>
                    <Chip size="small" label={t('speedPaint.libraryQueueSourceChip')} variant="outlined" />
                    <Chip size="small" label={t('speedPaint.libraryQueueModeChip')} color="secondary" />
                    <Chip size="small" label={t(pluralKey('speedPaint.libraryQueueItemsChip', queueLength), { count: queueLength })} variant="outlined" />
                  </Stack>

                  <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {t('speedPaint.libraryQueueReady', { project: queueProjectName })}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {t('speedPaint.libraryQueueAudioHint')}
                  </Typography>
                </Stack>
              </Alert>
              {queueSourceNotice ? (
                <Alert variant="outlined" severity="warning" role="status">
                  {queueSourceNotice}
                </Alert>
              ) : null }
            </Stack>
          ) : null }
          <QueueStaging />
        </Stack>
      )}

      {/* Processando — indicador de progresso */}
      {job.status === 'processing' && (
        <Box
          sx={(theme) => ({
            width: '100%',
            maxWidth: 672,
            mx: 'auto',
            p: { xs: 3, md: 4 },
            borderRadius: { xs: 3, md: 4 },
            ...glassSurfaceSx(theme),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            position: 'relative',
          })}
        >
          <CircularProgress
            size={56}
            aria-label={t('speedPaint.processingLabel')}
            sx={{
              color: 'primary.main',
              mb: 2,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, letterSpacing: 0 }}>
            {`${t('speedPaint.pageGenerating')} (${Math.round(job.progress * 100)}%)...`}
          </Typography>
          {/* Anúncio para screen readers */}
          <Box
            role="status"
            aria-live="polite"
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('speedPaint.pageGeneratingAria')}, {Math.round(job.progress * 100)}% {t('speedPaint.pageGeneratingComplete')}
          </Box>
          <Box sx={{ width: '100%', maxWidth: 448 }}>
            <LinearProgress
              variant="determinate"
              value={job.progress * 100 }
              sx={{
                height: 8,
                borderRadius: RADIUS_CHIP,
                bgcolor: WHITE_08,
                overflow: 'hidden',
                '& .MuiLinearProgress-bar': {
                  borderRadius: RADIUS_CHIP,
                  background: BRAND_GRADIENT,
                  boxShadow: `0 0 12px ${BRAND_PRIMARY_GLOW_SOFT}`,
                },
              }}
            />
          </Box>
        </Box>
      )}

      {showBatchExportPanel && !isCompleted && (
        <Paper
          elevation={0}
          sx={(theme) => ({
            ...glassSurfaceSx(theme),
            p: { xs: 2.5, md: 3 },
            borderRadius: { xs: 3, md: 4 },
            maxWidth: 720,
            mx: 'auto',
            width: '100%',
          })}
        >
          <Stack spacing={2.5}>
            {!isBatchRendering ? (
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={{ xs: 2, md: 2.5 }}
                useFlexGap
                sx={{ alignItems: { xs: 'flex-start', lg: 'stretch' }, justifyContent: 'space-between' }}
              >
                <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 0 }}>
                      {t('speedPaint.batchExportTitle')}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${eligibleBatchQueue.length}/${queueLength}`}
                      sx={{
                        fontWeight: 700,
                        borderRadius: 999,
                        bgcolor: WHITE_08,
                        border: `1px solid ${WHITE_14}`,
                        '& .MuiChip-label': {
                          px: 1.25,
                        },
                      }}
                    />
                  </Stack>

                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                    {batchSummaryText}
                  </Typography>
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  useFlexGap
                  sx={{ width: '100%', minWidth: 0, maxWidth: { lg: 420 } }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: WHITE_08,
                      border: `1px solid ${WHITE_14}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}>
                      {t(pluralKey('speedPaint.queueDescription', queueLength), { count: queueLength })}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: 0 }}>
                      {t(pluralKey('speedPaint.queueFinalVideoSummary', eligibleBatchQueue.length), { eligible: eligibleBatchQueue.length })}
                    </Typography>
                  </Box>

                  {failedBatchCount > 0 ? (
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: WHITE_08,
                        border: `1px solid ${WHITE_14}`,
                      }}
                    >
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}>
                        {t('speedPaint.batchExportTitle')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: 0 }}>
                        {t(pluralKey('speedPaint.queueFailedSummary', failedBatchCount), { failed: failedBatchCount })}
                      </Typography>
                    </Box>
                  ) : null }
                </Stack>
              </Stack>
            ) : (
              <Stack sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 0 }}>
                    {t('speedPaint.batchExportTitle')}
                  </Typography>
                  <Chip
                    size="small"
                    label={batchProgressValue}
                    sx={{
                      fontWeight: 700,
                      borderRadius: 999,
                      bgcolor: WHITE_08,
                      border: `1px solid ${WHITE_14}`,
                      '& .MuiChip-label': {
                        px: 1.25,
                      },
                    }}
                  />
                </Stack>
              </Stack>
            )}

            {speedPaintExporter.error && !speedPaintExporter.outputUrl && (
              <Stack spacing={1}>
                <Alert severity="error" variant="filled">
                  <strong>{speedPaintExporter.error}</strong>{' '}
                  {t('speedPaint.batchExportErrorDescription')}
                </Alert>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button variant="contained" onClick={handleBatchExportRetry}>
                    {t('speedPaint.batchExportRetry')}
                  </Button>
                  <Button variant="outlined" onClick={handleBatchExportBackToQueue}>
                    {t('speedPaint.batchExportBackToQueue')}
                  </Button>
                  <Button variant="text" onClick={handleBatchExportReset}>
                    {t('speedPaint.batchExportClearQueue')}
                  </Button>
                </Stack>
              </Stack>
            )}

            {speedPaintExporter.wasCancelled && !speedPaintExporter.isRendering && !speedPaintExporter.outputUrl && !speedPaintExporter.error && (
              <Stack spacing={1}>
                <Alert severity="info" variant="outlined" role="status">
                  <strong>{t('speedPaint.batchExportCancelledTitle')}</strong>{' '}
                  {t('speedPaint.batchExportCancelledDescription')}
                </Alert>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button variant="contained" onClick={handleBatchExportRetry}>
                    {t('speedPaint.batchExportRetry')}
                  </Button>
                  <Button variant="outlined" onClick={handleBatchExportBackToQueue}>
                    {t('speedPaint.batchExportBackToQueue')}
                  </Button>
                  <Button variant="text" onClick={handleBatchExportReset}>
                    {t('speedPaint.batchExportClearQueue')}
                  </Button>
                </Stack>
              </Stack>
            )}

            {speedPaintExporter.isRendering && (
              <Box
                sx={{
                  p: { xs: 1.75, md: 2 },
                  borderRadius: RADIUS_SM,
                  bgcolor: WHITE_08,
                  border: `1px solid ${WHITE_14}`,
                }}
              >
                <ExportProgressBar
                  progress={speedPaintExporter.renderProgress}
                  statusText={speedPaintExporter.renderStatusText}
                  helperText={batchProgressHelperText}
                  isRendering={speedPaintExporter.isRendering}
                  onCancel={speedPaintExporter.handleCancel}
                  cancelLabel={t('speedPaint.exportCancel')}
                  progressAriaLabel={t('speedPaint.batchExportProgressAria')}
                  progressValueText={batchProgressValue}
                />
              </Box>
            )}

            {!speedPaintExporter.isRendering && speedPaintExporter.outputUrl && (
              <ExportResultActions
                hasOutput={true}
                onDownload={speedPaintExporter.handleDownload}
                onReset={handleBatchExportBackToQueue}
                onClear={handleBatchExportReset}
                statusText={speedPaintExporter.renderStatusText}
                blobSizeBytes={speedPaintExporter.outputBlob?.size }
                labelRetry={t('speedPaint.batchExportBackToQueue')}
                retryIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                labelClear={t('speedPaint.batchExportClearQueue')}
                labelDownload={t('speedPaint.exportDownload')}
              />
            )}

            {!speedPaintExporter.isRendering
              && !speedPaintExporter.outputUrl
              && !speedPaintExporter.error
              && !speedPaintExporter.wasCancelled
              && batchMode === 'idle' && (
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={handleBatchExportReset}>
                  {t('speedPaint.batchExportClearQueue')}
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      {/* Animação completada — Layout 2 colunas (tipo YouTube) */}
      {isCompleted && (
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {/* Coluna esquerda — Player */}
          <Grid size={{ xs: 12, md: 7 }}>
            <SpeedPaintPlayer
              ref={playerRef}
              // `isCompleted` garante que `job.animation` está definido aqui
              // em runtime; non-null assertion é segura pelo contexto.
              animation={job.animation!}
              imageSource={job.animation!.resizedImage || job.inputImage }
              showDrawTool={showDrawTool}
              animationDuration={animationDuration}
              fps={FPS}
              jobStatus={job.status}
              timingMode={previewTimingMode}
              isLastScene={!isBatchWatchPreview || isLastBatchPreviewScene }
            />
          </Grid>

          {/* Coluna direita — Abas: Reprodução / Exportar + Config */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={GAP_MEDIUM}>
              {/* Navegação por abas */}
              <Tabs
                value={activeTab}
                onChange={(_, newValue: 'controls' | 'export') => setActiveTab(newValue)}
                variant="fullWidth"
                sx={{
                  minHeight: 44,
                  '& .MuiTab-root': {
                    minHeight: 44,
                    fontWeight: 600,
                    letterSpacing: 0,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                  },
                }}
              >
                <Tab value="controls" label={t('speedPaint.tabPlayback')} />
                <Tab value="export" label={t('speedPaint.tabExport')} />
              </Tabs>

              {/* Conteúdo da aba ativa */}
              {activeTab === 'controls' && (
                <SpeedPaintPlayerControls
                  playerRef={playerRef}
                  animationDuration={animationDuration}
                  onAnimationDurationChange={setAnimationDuration}
                  onResetJob={resetJob}
                  onClearQueue={clearQueue}
                  batchMode={batchMode}
                  durationInFrames={durationInFrames}
                  revealThreshold={revealThreshold}
                />
              )}

              {activeTab === 'export' && (
                <SpeedPaintExportPanel
                  // `isCompleted` garante que `job.animation` está definido
                  // aqui em runtime; non-null assertion é segura pelo contexto.
                  animation={job.animation!}
                  imageSource={job.animation!.resizedImage || job.inputImage }
                  animationDuration={animationDuration}
                  onAnimationDurationChange={setAnimationDuration}
                  showDrawTool={showDrawTool}
                  exporter={speedPaintExporter}
                />
              )}

              <StackedHeader
                variant="glass"
                collapsible
                expanded={configSection.expanded}
                onToggle={configSection.onToggle}
                collapseId={configSection.collapseId}
                title={t('speedPaint.pageConfigTitle')}
                titleVariant="subtitle2"
                density="compact"
                sx={(theme) => ({
                  ...glassSurfaceSx(theme),
                  width: '100%',
                  borderRadius: { xs: 3, md: 4 },
                })}
              >
                  <Stack spacing={GAP_MEDIUM}>
                    {/* Mostrar lápis/pincel */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showDrawTool}
                          onChange={(e) => setShowDrawTool(e.target.checked)}
                          size="small"
                        />
                      }
                      label={t('speedPaint.pageConfigDrawTool')}
                      sx={{ typography: 'body2', color: 'text.secondary' }}
                    />

                    {/* Modo de renderização (Fase 4.1) — Clássico (mask) ou Desenho (vetorial).
                        Padrão visual espelha o `AnimationDurationSelector` (Stack + ícone
                        overline + helper text + ToggleButtonGroup com tokens de marca).
                        Fase 4.3: ícones distintos por modo, Tooltip com `describeChild`
                        para preservar aria-label + `aria-describedby` apontando para a
                        descrição textual (helper text compartilhado). */}
                    <Stack spacing={GAP_DEFAULT}>
                      <Stack spacing={GAP_COMPACT}>
                        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                          <BrushOutlined sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
                          <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                            {t('speedPaint.modeLabel')}
                          </Typography>
                        </Stack>
                        <Typography
                          id="speed-paint-mode-description"
                          variant="body2"
                          color="text.secondary"
                          sx={{ lineHeight: 1.7 }}
                        >
                          {t('speedPaint.modeDescription')}
                        </Typography>
                      </Stack>
                      <Box>
                        <ToggleButtonGroup
                          value={renderMode}
                          exclusive
                          onChange={handleRenderModeChange}
                          aria-label={t('speedPaint.modeLabel')}
                          aria-describedby="speed-paint-mode-description"
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            '& .MuiToggleButtonGroup-grouped': {
                              borderRadius: RADIUS_XS,
                              border: `1px solid ${WHITE_14}`,
                              px: 2,
                              py: 1.25,
                              fontWeight: 700,
                              textTransform: 'none',
                              color: 'text.secondary',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                borderColor: alpha(BRAND_PRIMARY, 0.4),
                                backgroundColor: alpha(BRAND_PRIMARY, 0.04),
                              },
                              '&.Mui-selected': {
                                color: BRAND_PRIMARY_LIGHT,
                                borderColor: alpha(BRAND_PRIMARY, 0.6),
                                backgroundColor: alpha(BRAND_PRIMARY, 0.12),
                                boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}, inset 0 0 0 1px ${alpha(BRAND_PRIMARY, 0.3)}`,
                              },
                              '&.Mui-selected:hover': {
                                backgroundColor: alpha(BRAND_PRIMARY, 0.18),
                                borderColor: BRAND_PRIMARY,
                              },
                              '&.Mui-focusVisible': {
                                outline: `2px solid ${BRAND_PRIMARY_LIGHT}`,
                                outlineOffset: 2,
                              },
                            },
                          }}
                        >
                          <Tooltip
                            title={t('speedPaint.modeClassicTooltip')}
                            describeChild
                            placement="top"
                            arrow
                          >
                            <ToggleButton value="mask" aria-label={t('speedPaint.modeClassic')}>
                              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                <FormatPaintOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                <span>{t('speedPaint.modeClassic')}</span>
                              </Stack>
                            </ToggleButton>
                          </Tooltip>
                          <Tooltip
                            title={t('speedPaint.modeVetorialTooltip')}
                            describeChild
                            placement="top"
                            arrow
                          >
                            <ToggleButton value="vetorial" aria-label={t('speedPaint.modeVetorial')}>
                              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                <GestureOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                <span>{t('speedPaint.modeVetorial')}</span>
                              </Stack>
                            </ToggleButton>
                          </Tooltip>
                        </ToggleButtonGroup>
                      </Box>

                      {/* Seletor de estilo do modo Desenho (RF-03 / Fase 4.2).
                          Visível APENAS quando `renderMode === 'vetorial'` — fora
                          desse modo o preset é irrelevante (modo máscara usa
                          rasterização fixa). 16 opções em 6 grupos, agrupadas
                          via `<ListSubheader>`. O tooltip D08 (D08-texto) avisa
                          sobre a limitação: fotos podem não ficar ideais. */}
                      {renderMode === 'vetorial' && (
                        <FormControl
                          fullWidth
                          size="small"
                          title={t('speedPaint.vetorialPresetTooltip')}
                        >
                          <InputLabel id="vetorial-preset-label">
                            {t('speedPaint.vetorialPresetLabel')}
                          </InputLabel>
                          <Select
                            labelId="vetorial-preset-label"
                            id="vetorial-preset"
                            value={vetorialPreset}
                            label={t('speedPaint.vetorialPresetLabel')}
                            onChange={(event) => void handlePresetChange(event)}
                            aria-label={t('speedPaint.vetorialPresetLabel')}
                          >
                            {VETORIAL_PRESETS_GROUPED.map((group) => [
                              <ListSubheader
                                key={`group-${group.id}`}
                                sx={{
                                  bgcolor: 'transparent',
                                  fontWeight: 700,
                                  letterSpacing: '0.08em',
                                  lineHeight: 2,
                                  color: 'text.secondary',
                                }}
                              >
                                {t(`speedPaint.presetGroups.${group.id}` as const)}
                              </ListSubheader>,
                              ...group.presets.map((preset) => (
                                <MenuItem
                                  key={preset}
                                  value={preset}
                                  sx={{ pl: 4 /* indent sob o subheader */ }}
                                >
                                  {t(`speedPaint.presets.${preset}` as const)}
                                </MenuItem>
                              )),
                            ])}
                          </Select>
                        </FormControl>
                      )}

                      {/* Seletor de ordem de desenho dos paths SVG (L9, RF-09).
                          Visível APENAS quando `renderMode === 'vetorial'`. 4 opções
                          discretas via `ToggleButtonGroup` (mesmo padrão visual do
                          seletor de modo de renderização). A troca dispara
                          reprocessamento da imagem com a nova ordenação. */}
                      {renderMode === 'vetorial' && (
                        <Stack spacing={GAP_DEFAULT}>
                          <Stack spacing={GAP_COMPACT}>
                            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                              <ShuffleOutlined sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
                              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                                {t('speedPaint.sortOrderLabel')}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Box>
                            <ToggleButtonGroup
                              value={vetorialSortOrder}
                              exclusive
                              onChange={(event, value: VetorialPathSortOrder | null) => {
                                if (value != null && !isVetorialSortOrder(value)) return;
                                void handleSortOrderChange(event, value);
                              }}
                              aria-label={t('speedPaint.sortOrderLabel')}
                              sx={vetorialToggleButtonGroupSx}
                            >
                              <Tooltip
                                title={t('speedPaint.sortOrderTopDown')}
                                describeChild
                                placement="top"
                                arrow
                              >
                                <ToggleButton value="top-down" aria-label={t('speedPaint.sortOrderTopDown')}>
                                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                    <KeyboardArrowDownOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                    <span>{t('speedPaint.sortOrderTopDown')}</span>
                                  </Stack>
                                </ToggleButton>
                              </Tooltip>
                              <Tooltip
                                title={t('speedPaint.sortOrderCenterOut')}
                                describeChild
                                placement="top"
                                arrow
                              >
                                <ToggleButton value="center-out" aria-label={t('speedPaint.sortOrderCenterOut')}>
                                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                    <CenterFocusStrongOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                    <span>{t('speedPaint.sortOrderCenterOut')}</span>
                                  </Stack>
                                </ToggleButton>
                              </Tooltip>
                              <Tooltip
                                title={t('speedPaint.sortOrderBigFirst')}
                                describeChild
                                placement="top"
                                arrow
                              >
                                <ToggleButton value="big-first" aria-label={t('speedPaint.sortOrderBigFirst')}>
                                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                    <AutoAwesomeOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                    <span>{t('speedPaint.sortOrderBigFirst')}</span>
                                  </Stack>
                                </ToggleButton>
                              </Tooltip>
                              <Tooltip
                                title={t('speedPaint.sortOrderRandom')}
                                describeChild
                                placement="top"
                                arrow
                              >
                                <ToggleButton value="random" aria-label={t('speedPaint.sortOrderRandom')}>
                                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                    <ShuffleOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                    <span>{t('speedPaint.sortOrderRandom')}</span>
                                  </Stack>
                                </ToggleButton>
                              </Tooltip>
                            </ToggleButtonGroup>
                          </Box>
                        </Stack>
                      )}

                      {/* Seletor de curva de progressão (easing) da animação
                          vetorial (L10, RF-10). Visível APENAS quando
                          `renderMode === 'vetorial'`. 3 opções discretas via
                          `ToggleButtonGroup` — troca é REATIVA (a próxima
                          renderização do player já consome o novo valor, sem
                          reprocessamento). */}
                      {renderMode === 'vetorial' && (
                        <Stack spacing={GAP_DEFAULT}>
                          <Stack spacing={GAP_COMPACT}>
                            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                              <WaterOutlined sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
                              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
                                {t('speedPaint.easingLabel')}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Box>
                            <ToggleButtonGroup
                              value={easing}
                              exclusive
                              onChange={(event, value: VetorialEasingType | null) => {
                                if (value != null && !isVetorialEasingType(value)) return;
                                handleEasingChange(event, value);
                              }}
                              aria-label={t('speedPaint.easingLabel')}
                              sx={vetorialToggleButtonGroupSx}
                            >
                              <Tooltip
                                title={t('speedPaint.easingLinear')}
                                describeChild
                                placement="top"
                                arrow
                              >
                                <ToggleButton value="linear" aria-label={t('speedPaint.easingLinear')}>
                                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                    <TimelineOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                    <span>{t('speedPaint.easingLinear')}</span>
                                  </Stack>
                                </ToggleButton>
                              </Tooltip>
                              <Tooltip
                                title={t('speedPaint.easingSmooth')}
                                describeChild
                                placement="top"
                                arrow
                              >
                                <ToggleButton value="smooth" aria-label={t('speedPaint.easingSmooth')}>
                                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                    <WaterOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                    <span>{t('speedPaint.easingSmooth')}</span>
                                  </Stack>
                                </ToggleButton>
                              </Tooltip>
                              <Tooltip
                                title={t('speedPaint.easingBounce')}
                                describeChild
                                placement="top"
                                arrow
                              >
                                <ToggleButton value="bounce" aria-label={t('speedPaint.easingBounce')}>
                                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                                    <SportsBaseballOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                                    <span>{t('speedPaint.easingBounce')}</span>
                                  </Stack>
                                </ToggleButton>
                              </Tooltip>
                            </ToggleButtonGroup>
                          </Box>
                        </Stack>
                      )}
                      {/* Feedback de erro de reprocessamento (WCAG 2.1 AA — `role="alert"`).
                          Aparece quando `handleRenderModeChange` falha e o `status` vira `failed`. */}
                      {modeProcessingError != null && (
                        <Alert
                          severity="error"
                          variant="outlined"
                          role="alert"
                          onClose={() => setModeProcessingError(null)}
                          action={(
                            <Button
                              color="inherit"
                              size="small"
                              onClick={() => {
                                void reprocessInMode(renderMode);
                              }}
                            >
                              {t('speedPaint.modeProcessingRetry')}
                            </Button>
                          )}
                        >
                          {t('speedPaint.modeProcessingError')}
                        </Alert>
                      )}
                    </Stack>

                    {/* Cor do canvas */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('speedPaint.pageConfigCanvasColor')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: GAP_DEFAULT }}>
                        <Box
                          component="button"
                          onClick={() => setCanvasColor('white')}
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: RADIUS_CHIP,
                            border: '2px solid',
                            borderColor: canvasColor === 'white' ? 'primary.main' : WHITE_14,
                            bgcolor: '#fff',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease, box-shadow 0.2s ease',
                            ...(canvasColor === 'white' ? {
                              boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
                              transform: 'scale(1.08)',
                            } : {}),
                            '&:hover': {
                              borderColor: BRAND_PRIMARY_LIGHT,
                              transform: 'scale(1.05)',
                            },
                          }}
                          aria-label={t('speedPaint.pageConfigCanvasWhite')}
                        />
                        <Box
                          component="button"
                          onClick={() => setCanvasColor('black')}
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: RADIUS_CHIP,
                            border: '2px solid',
                            borderColor: canvasColor === 'black' ? 'primary.main' : WHITE_14,
                            bgcolor: '#000',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease, box-shadow 0.2s ease',
                            ...(canvasColor === 'black' ? {
                              boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
                              transform: 'scale(1.08)',
                            } : {}),
                            '&:hover': {
                              borderColor: BRAND_PRIMARY_LIGHT,
                              transform: 'scale(1.05)',
                            },
                          }}
                          aria-label={t('speedPaint.pageConfigCanvasBlack')}
                        />
                      </Box>
                    </Box>
                  </Stack>
              </StackedHeader>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}
