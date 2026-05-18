import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { useShallow } from 'zustand/react/shallow';
import { useAnimationStore } from '../features/speed-paint/store/animationStore';
import { BatchOrchestrator } from '../features/speed-paint/components/batch/BatchOrchestrator';
import { QueueStaging } from '../features/speed-paint/components/batch/QueueStaging';
import { SpeedPaintPlayer } from '../features/speed-paint/components/SpeedPaintPlayer';
import { SpeedPaintPlayerControls } from '../features/speed-paint/components/SpeedPaintPlayerControls';
import { SpeedPaintExportPanel } from '../features/speed-paint/components/SpeedPaintExportPanel';
import { useSpeedPaintExporter } from '../features/speed-paint/hooks/useSpeedPaintExporter';
import { ExportProgressBar } from '../features/video-render/components/export/ExportProgressBar';
import { ExportResultActions } from '../features/video-render/components/export/ExportResultActions';
import { ImageUpload } from '../features/speed-paint/components/upload/ImageUpload';
import { useLocale } from '../features/i18n';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_PRIMARY_LIGHT,
  EMPTY_WRAPPER_MAX_WIDTH,
  EMPTY_WRAPPER_PADDING_MD,
  GAP_DEFAULT,
  GAP_MEDIUM,
  RADIUS_CHIP,
  WHITE_08,
  WHITE_14,
} from '../theme/tokens';
import { glassSurfaceSx } from '../theme/surfaces';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const FPS = 30;

function getCombinedBatchExportFileName(queueLength: number): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `speed-paint-lote-${queueLength}itens-${timestamp}`;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function SpeedPaintPage() {
  const { t } = useLocale();
  const playerRef = useRef<PlayerRef>(null);
  const speedPaintExporter = useSpeedPaintExporter();
  const [isBatchRecording, setIsBatchRecording] = useState(false);
  const batchRenderStartedRef = useRef(false);
  const [configOpen, setConfigOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'controls' | 'export'>('controls');

  // Store selectors (useShallow para evitar re-renders desnecessários)
  const { job, queue, batchMode, queueSource, queueSourceProjectName, queueSourceNotice, animationDuration, showDrawTool, canvasColor } =
    useAnimationStore(
      useShallow((s) => ({
        job: s.job,
        queue: s.queue,
        batchMode: s.batchMode,
        queueSource: s.queueSource,
        queueSourceProjectName: s.queueSourceProjectName,
        queueSourceNotice: s.queueSourceNotice,
        animationDuration: s.animationDuration,
        showDrawTool: s.showDrawTool,
        canvasColor: s.canvasColor,
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

  const queueLength = queue.length;
  const eligibleBatchQueue = useMemo(
    () => queue.filter((item) => item.status !== 'failed'),
    [queue],
  );
  const failedBatchCount = queueLength - eligibleBatchQueue.length;
  const isCompleted = job.status === 'completed' && Boolean(job.animation);

  // Duração fixa — unificada com a velocidade (sliders controlam o ritmo, não o container)
  const durationInFrames = useMemo(() => Math.round(animationDuration * FPS), [animationDuration]);
  const revealThreshold = job.animation?.revealThreshold;

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
    ? `${t('speedPaint.queueFinalVideoSummary', { eligible: eligibleBatchQueue.length })} ${t('speedPaint.queueFailedSummary', { failed: failedBatchCount })}`
    : t('speedPaint.queueFinalVideoSummary', { eligible: eligibleBatchQueue.length });
  const batchSummaryText = speedPaintExporter.isRendering
    ? speedPaintExporter.renderStatusText
    : speedPaintExporter.error
      ? t('speedPaint.batchExportErrorDescription')
      : speedPaintExporter.wasCancelled
        ? t('speedPaint.batchExportCancelledTitle')
        : speedPaintExporter.outputUrl
          ? speedPaintExporter.renderStatusText
          : t('speedPaint.queueFinalVideoSummary', { eligible: eligibleBatchQueue.length });
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
  // Render
  // -------------------------------------------------------------------------

  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <BatchOrchestrator />

      {/* Estado vazio — fila vazia */}
      {queueLength === 0 && (
        <Box sx={{ textAlign: 'center', py: EMPTY_WRAPPER_PADDING_MD }}>
          <Box sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH, mx: 'auto' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.025em',
                mb: 1,
              }}
            >
              {t('speedPaint.pageTitle')}
              <Box
                component="span"
                sx={{
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
                    <Chip size="small" label={t('speedPaint.libraryQueueItemsChip', { count: queueLength })} variant="outlined" />
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
              ) : null}
            </Stack>
          ) : null}
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
            sx={{
              color: 'primary.main',
              mb: 2,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, letterSpacing: '-0.02em' }}>
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
              value={job.progress * 100}
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                      {t('speedPaint.queueDescription', { count: queueLength })}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                      {t('speedPaint.queueFinalVideoSummary', { eligible: eligibleBatchQueue.length })}
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
                      <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                        {t('speedPaint.queueFailedSummary', { failed: failedBatchCount })}
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>
              </Stack>
            ) : (
              <Stack sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                  borderRadius: 3,
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
                container={speedPaintExporter.resolvedContainer}
                onDownload={speedPaintExporter.handleDownload}
                onReset={handleBatchExportBackToQueue}
                onClear={handleBatchExportReset}
                statusText={speedPaintExporter.renderStatusText}
                blobSizeBytes={speedPaintExporter.outputBlob?.size}
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
              animation={job.animation!}
              imageSource={job.animation!.resizedImage || job.inputImage}
              showDrawTool={showDrawTool}
              animationDuration={animationDuration}
              fps={FPS}
              jobStatus={job.status}
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
                    letterSpacing: '-0.01em',
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
                  animation={job.animation!}
                  imageSource={job.animation!.resizedImage || job.inputImage}
                  animationDuration={animationDuration}
                  onAnimationDurationChange={setAnimationDuration}
                  showDrawTool={showDrawTool}
                  exporter={speedPaintExporter}
                />
              )}

              {/* Seção de configurações collapsível */}
              <Paper
                elevation={0}
                sx={(theme) => ({
                  ...glassSurfaceSx(theme),
                  width: '100%',
                  p: { xs: 2, md: 2.5 },
                  borderRadius: { xs: 3, md: 4 },
                })}
              >
                <Box
                  component="button"
                  onClick={() => setConfigOpen((prev) => !prev)}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    p: 0,
                    color: 'inherit',
                    typography: 'subtitle2',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { opacity: 0.85 },
                    '&:focus-visible': {
                      outline: `2px solid ${BRAND_PRIMARY}`,
                      outlineOffset: 4,
                      borderRadius: 1,
                    },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
                    {t('speedPaint.pageConfigTitle')}
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: configOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    <ExpandMore sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </Box>
                </Box>

                <Collapse in={configOpen}>
                  <Stack spacing={GAP_MEDIUM} sx={{ mt: 2 }}>
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
                </Collapse>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}
