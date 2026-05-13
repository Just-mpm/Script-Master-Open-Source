import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import Box from '@mui/material/Box';
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
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useShallow } from 'zustand/react/shallow';
import { useAnimationStore } from '../features/speed-paint/store/animationStore';
import { BatchOrchestrator } from '../features/speed-paint/components/batch/BatchOrchestrator';
import { QueueStaging } from '../features/speed-paint/components/batch/QueueStaging';
import { SpeedPaintPlayer } from '../features/speed-paint/components/SpeedPaintPlayer';
import { SpeedPaintPlayerControls } from '../features/speed-paint/components/SpeedPaintPlayerControls';
import { SpeedPaintExportPanel } from '../features/speed-paint/components/SpeedPaintExportPanel';
import { useSpeedPaintExporter } from '../features/speed-paint/hooks/useSpeedPaintExporter';
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

const DEFAULT_ANIMATION_DURATION = 15;
const FPS = 30;

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function SpeedPaintPage() {
  const { t } = useLocale();
  const playerRef = useRef<PlayerRef>(null);
  const speedPaintExporter = useSpeedPaintExporter();
  const [isBatchRecording, setIsBatchRecording] = useState(false);
  const handledJobIdRef = useRef<string | null>(null);
  const [configOpen, setConfigOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'controls' | 'export'>('controls');

  // Store selectors (useShallow para evitar re-renders desnecessários)
  const { job, queue, batchMode, speed, paintSpeed, showDrawTool, canvasColor } =
    useAnimationStore(
      useShallow((s) => ({
        job: s.job,
        queue: s.queue,
        batchMode: s.batchMode,
        speed: s.speed,
        paintSpeed: s.paintSpeed,
        showDrawTool: s.showDrawTool,
        canvasColor: s.canvasColor,
      })),
    );

  const { setSpeed, setPaintSpeed, setShowDrawTool, setCanvasColor, resetJob, clearQueue } =
    useAnimationStore(
      useShallow((s) => ({
        setSpeed: s.setSpeed,
        setPaintSpeed: s.setPaintSpeed,
        setShowDrawTool: s.setShowDrawTool,
        setCanvasColor: s.setCanvasColor,
        resetJob: s.resetJob,
        clearQueue: s.clearQueue,
      })),
    );

  const queueLength = queue.length;
  const isCompleted = job.status === 'completed' && Boolean(job.animation);

  // Duração fixa — unificada com a velocidade (sliders controlam o ritmo, não o container)
  const durationInFrames = useMemo(() => Math.round(DEFAULT_ANIMATION_DURATION * FPS), []);
  const revealThreshold = job.animation?.revealThreshold;

  // -------------------------------------------------------------------------
  // Auto-switch para aba de export quando renderização iniciar
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (speedPaintExporter.isRendering) {
      setActiveTab('export');
    }
  }, [speedPaintExporter.isRendering]);

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
  // Batch record — detecta completion e dispara exportação
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (batchMode !== 'record' || !job.animation || job.id === handledJobIdRef.current) return;
    if (!isCompleted) return;

    let rafId: number;
    const checkAndExport = () => {
      const player = playerRef.current;
      if (!player) {
        rafId = requestAnimationFrame(checkAndExport);
        return;
      }

      const currentFrame = player.getCurrentFrame();

      if (currentFrame >= durationInFrames - 1) {
        // Animação completou — disparar export
        handledJobIdRef.current = job.id;
        setIsBatchRecording(true);
        const imageSource = job.animation?.resizedImage || job.inputImage;
        speedPaintExporter.startRender({
          animation: job.animation!,
          imageSource,
          fps: FPS,
          durationInFrames,
          quality: '1080p',
          drawSpeed: speed,
          paintSpeed: paintSpeed,
          showDrawTool,
        });
        return;
      }

      rafId = requestAnimationFrame(checkAndExport);
    };

    rafId = requestAnimationFrame(checkAndExport);
    return () => cancelAnimationFrame(rafId);
  }, [batchMode, job.animation, job.id, job.inputImage, isCompleted, durationInFrames, speed, paintSpeed, showDrawTool, speedPaintExporter]);

  // -------------------------------------------------------------------------
  // Batch record — auto-advance após exportação completar
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isBatchRecording || speedPaintExporter.isRendering) return;

    if (speedPaintExporter.outputUrl || speedPaintExporter.error) {
      const { currentIndex, queue: currentQueue, setCurrentIndex, setBatchMode, clearQueue: doClear } =
        useAnimationStore.getState();
      if (currentIndex + 1 < currentQueue.length) {
        setCurrentIndex(currentIndex + 1);
        speedPaintExporter.reset();
      } else {
        setBatchMode('idle');
        doClear();
        setIsBatchRecording(false);
        speedPaintExporter.reset();
      }
    }
  }, [isBatchRecording, speedPaintExporter]);

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
      {queueLength > 0 && batchMode === 'idle' && <QueueStaging />}

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

      {/* Animação completada — Layout 2 colunas (tipo YouTube) */}
      {isCompleted && (
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {/* Coluna esquerda — Player */}
          <Grid size={{ xs: 12, md: 7 }}>
            <SpeedPaintPlayer
              ref={playerRef}
              animation={job.animation!}
              imageSource={job.animation!.resizedImage || job.inputImage}
              drawSpeed={speed}
              paintSpeed={paintSpeed}
              showDrawTool={showDrawTool}
              animationDuration={DEFAULT_ANIMATION_DURATION}
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
                  drawSpeed={speed}
                  paintSpeed={paintSpeed}
                  onDrawSpeedChange={setSpeed}
                  onPaintSpeedChange={setPaintSpeed}
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
                  drawSpeed={speed}
                  paintSpeed={paintSpeed}
                  onDrawSpeedChange={setSpeed}
                  onPaintSpeedChange={setPaintSpeed}
                  showDrawTool={showDrawTool}
                  animationDuration={DEFAULT_ANIMATION_DURATION}
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