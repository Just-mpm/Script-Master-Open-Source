import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { PlayerRef } from '@remotion/player';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ImageIcon from '@mui/icons-material/Image';
import { alpha } from '@mui/material/styles';
import { createLogger } from '../../../lib/logger';
import { glassSurfaceSx } from '../../../theme/surfaces';
import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_PRIMARY_LIGHT,
  SUCCESS_MAIN,
  SUCCESS_GLOW,
  SUCCESS_BG_SUBTLE,
  WHITE_08,
  WHITE_14,
  GAP_COMPACT,
  GAP_DEFAULT,
} from '../../../theme/tokens';
import { AnimationDurationSelector } from './AnimationDurationSelector';
import { useLocale } from '../../i18n';

// ─── Logger ──────────────────────────────────────────────────

const log = createLogger('SpeedPaintPlayerControls');

// ─── Props ──────────────────────────────────────────────────

interface SpeedPaintPlayerControlsProps {
  /** Ref do Remotion Player para controle imperativo */
  playerRef: React.RefObject<PlayerRef | null>;
  /** Duração atual da animação (em segundos) */
  animationDuration: number;
  /** Callback quando a duração muda */
  onAnimationDurationChange: (duration: 10 | 15 | 30 | 60) => void;
  /** Callback para resetar o job (nova imagem) */
  onResetJob: () => void;
  /** Callback para limpar a fila */
  onClearQueue: () => void;
  /** Modo batch atual */
  batchMode: 'idle' | 'watch' | 'record';
  /** Duração total em frames (do Player ou StrokeAnimation) */
  durationInFrames: number;
  /** Frame onde termina sketch e começa reveal (do StrokeAnimation.revealThreshold) */
  revealThreshold?: number;
}

// ─── Fase da animação ───────────────────────────────────────

type AnimationPhase = 'ready' | 'sketching' | 'revealing' | 'completed';

function getPhase(
  progress: number,
  durationInFrames: number,
  revealThreshold: number | undefined,
): AnimationPhase {
  if (progress <= 0) return 'ready';
  if (progress >= 1) return 'completed';

  if (revealThreshold !== undefined && durationInFrames > 0) {
    const currentFrame = progress * durationInFrames;
    return currentFrame < revealThreshold ? 'sketching' : 'revealing';
  }

  return 'sketching';
}

const PHASE_I18N_KEYS: Record<AnimationPhase, string> = {
  ready: 'speedPaint.phaseReady',
  sketching: 'speedPaint.phaseSketching',
  revealing: 'speedPaint.phaseRevealing',
  completed: 'speedPaint.phaseCompleted',
};

const PHASE_COLORS: Record<AnimationPhase, string> = {
  ready: 'text.secondary',
  sketching: BRAND_PRIMARY_LIGHT,
  revealing: BRAND_PRIMARY_LIGHT,
  completed: SUCCESS_MAIN,
};

const PHASE_BG: Record<AnimationPhase, string> = {
  ready: WHITE_08,
  sketching: BRAND_PRIMARY_GLOW_SOFT,
  revealing: BRAND_PRIMARY_GLOW_SOFT,
  completed: SUCCESS_BG_SUBTLE,
};

// ─── Sub-componente: ProgressHeader (badge + slider) ─────────
// Extrai o header de progresso para que apenas ELE re-renderize
// quando progress muda. O resto dos controles (botões) fica estável.

interface ProgressHeaderProps {
  progress: number;
  phase: AnimationPhase;
  phaseLabel: string;
  durationInFrames: number;
  onChange: (_event: Event, value: number | number[]) => void;
  onChangeCommitted: (_event: Event | React.SyntheticEvent, value: number | number[]) => void;
  ariaLabel: string;
}

const ProgressHeader = React.memo(function ProgressHeader({
  progress,
  phase,
  phaseLabel,
  onChange,
  onChangeCommitted,
  ariaLabel,
}: ProgressHeaderProps) {
  return (
    <>
      {/* Badge de fase + porcentagem */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: GAP_DEFAULT, px: 0.5 }}>
        <Stack direction="row" spacing={GAP_COMPACT} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: PHASE_COLORS[phase],
              boxShadow: phase === 'completed'
                ? `0 0 8px ${SUCCESS_GLOW}`
                : phase !== 'ready'
                  ? `0 0 6px ${BRAND_PRIMARY_GLOW_SOFT}`
                  : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              ...(phase === 'sketching' || phase === 'revealing'
                ? { animation: 'pulse 2s ease-in-out infinite' }
                : {}),
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              letterSpacing: '-0.02em',
              transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              color: PHASE_COLORS[phase],
            }}
          >
            {phaseLabel}
          </Typography>
        </Stack>
        <Box
          sx={{
            px: 1.5,
            py: 0.25,
            borderRadius: 1,
            bgcolor: PHASE_BG[phase],
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: PHASE_COLORS[phase],
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {Math.round(progress * 100)}%
          </Typography>
        </Box>
      </Stack>

      {/* Slider de progresso — CSS corrigido: usa 'scale' em vez de 'transform'
          para não conflitar com o translate de posicionamento do MUI Slider */}
      <Box sx={{ px: 0.5, mb: 2 }}>
        <Slider
          value={progress}
          onChange={onChange}
          onChangeCommitted={onChangeCommitted}
          min={0}
          max={1}
          step={0.001}
          aria-label={ariaLabel}
          sx={{
            color: BRAND_PRIMARY,
            p: '4px 0',
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), scale 0.15s ease',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: `0 0 0 4px ${BRAND_PRIMARY_GLOW_SOFT}, 0 0 12px ${BRAND_PRIMARY_GLOW_SOFT}`,
                scale: '1.15',
              },
              '&:active': {
                scale: '1.2',
              },
            },
            '& .MuiSlider-rail': {
              backgroundColor: WHITE_14,
            },
            '& .MuiSlider-track': {
              border: 'none',
            },
          }}
        />
      </Box>
    </>
  );
});

// ─── Sub-componente: PlaybackButtons (play/pause + restart) ──
// Memoizado: não re-renderiza quando progress muda (isPlaying muda raramente)

interface PlaybackButtonsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  playLabel: string;
  pauseLabel: string;
  playAria: string;
  pauseAria: string;
  restartLabel: string;
  restartAria: string;
}

const PlaybackButtons = React.memo(function PlaybackButtons({
  isPlaying,
  onPlayPause,
  onRestart,
  playLabel,
  pauseLabel,
  playAria,
  pauseAria,
  restartLabel,
  restartAria,
}: PlaybackButtonsProps) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: GAP_COMPACT }}>
      <Tooltip title={isPlaying ? pauseLabel : playLabel }>
        <span>
          <IconButton
            onClick={onPlayPause}
            aria-label={isPlaying ? pauseAria : playAria }
            sx={(theme) => ({
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              color: 'primary.main',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.25),
                boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
              },
              '&:active': {
                transform: 'scale(0.93)',
              },
            })}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon sx={{ ml: 0.25 }} />}
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={restartLabel}>
        <span>
          <IconButton
            onClick={onRestart}
            aria-label={restartAria}
            sx={{
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: alpha(BRAND_PRIMARY, 0.08),
                color: BRAND_PRIMARY_LIGHT,
                boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
              },
              '&:active': {
                transform: 'scale(0.93)',
              },
            }}
          >
            <ReplayIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
});

// ─── Sub-componente: ActionButtons (download + new image) ────
// Memoizado: só re-renderiza quando progress muda (afeta disabled do download)

interface ActionButtonsProps {
  progress: number;
  batchMode: 'idle' | 'watch' | 'record';
  onDownload: () => void;
  onNewImage: () => void;
  downloadLabel: string;
  downloadAria: string;
  newImageLabel: string;
  leaveQueueLabel: string;
  newImageBtnLabel: string;
  leaveQueueBtnLabel: string;
}

const ActionButtons = React.memo(function ActionButtons({
  progress,
  batchMode,
  onDownload,
  onNewImage,
  downloadLabel,
  downloadAria,
  newImageLabel,
  leaveQueueLabel,
  newImageBtnLabel,
  leaveQueueBtnLabel,
}: ActionButtonsProps) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: GAP_COMPACT, sm: GAP_DEFAULT } }}>
      <Tooltip title={downloadLabel}>
        <span>
          <IconButton
            onClick={onDownload}
            disabled={progress === 0 }
            aria-label={downloadAria}
            sx={{
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover:not(:disabled)': {
                bgcolor: alpha(BRAND_PRIMARY, 0.08),
                color: BRAND_PRIMARY_LIGHT,
                boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
              },
              '&:active:not(:disabled)': {
                transform: 'scale(0.93)',
              },
            }}
          >
            <PhotoCameraIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={batchMode !== 'idle' ? leaveQueueLabel : newImageLabel }>
        <Button
          onClick={onNewImage}
          startIcon={<ImageIcon sx={{ fontSize: 18 }} />}
          sx={(theme) => ({
            color: 'text.primary',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.18),
              boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
            },
            '&:active': {
              transform: 'scale(0.97)',
            },
          })}
        >
          <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {batchMode !== 'idle' ? leaveQueueBtnLabel : newImageBtnLabel }
          </Typography>
        </Button>
      </Tooltip>
    </Stack>
  );
});

// ─── Componente principal ────────────────────────────────────

export const SpeedPaintPlayerControls = React.memo(function SpeedPaintPlayerControls({
  playerRef,
  animationDuration,
  onAnimationDurationChange,
  onResetJob,
  onClearQueue,
  batchMode,
  durationInFrames,
  revealThreshold,
}: SpeedPaintPlayerControlsProps) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useLocale();

  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUiUpdateRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  // ── Polling de progresso via PlayerRef ──────────────────────

  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const player = playerRef.current;

      if (player) {
        const currentFrame = player.getCurrentFrame();
        const newProgress = durationInFrames > 0 ? currentFrame / durationInFrames : 0;
        const playing = player.isPlaying();

        // Durante arraste do slider: não atualiza progresso via polling
        // para evitar competição entre valor do mouse e valor do player
        if (!isDraggingRef.current) {
          const now = performance.now();
          if (now - lastUiUpdateRef.current >= 100) {
            setProgress(newProgress);
            setIsPlaying(playing);
            lastUiUpdateRef.current = now;
          }
        }

        if (playing) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          timeoutRef.current = setTimeout(tick, 200);
        }
      } else {
        timeoutRef.current = setTimeout(tick, 100);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [playerRef, durationInFrames]);

  // ── Fase atual (derivada de progress) ───────────────────────

  const phase = getPhase(progress, durationInFrames, revealThreshold);

  // ── Handlers ────────────────────────────────────────────────
  // Todos memoizados com useCallback para que filhos memoizados
  // não re-renderizem desnecessariamente.

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (player.isPlaying()) {
      player.pause();
    } else {
      // Lê progresso diretamente do player em vez do estado
      // para que este handler não dependa de 'progress'
      const currentProgress = durationInFrames > 0
        ? player.getCurrentFrame() / durationInFrames
        : 0;
      if (currentProgress >= 1) {
        player.seekTo(0);
      }
      player.play();
    }
  }, [playerRef, durationInFrames]);

  const handleRestart = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(0);
    player.pause();
    setProgress(0);
    setIsPlaying(false);
  }, [playerRef]);

  // Durante arraste: atualiza apenas o estado visual (sem seekTo)
  // para que o thumb acompanhe o mouse sem lag
  const handleProgressChange = useCallback(
    (_event: Event, value: number | number[]) => {
      isDraggingRef.current = true;
      const newProgress = Array.isArray(value) ? value[0] : value;
      setProgress(newProgress);
    },
    [],
  );

  // Ao soltar o slider: aplica o seek no player
  const handleProgressCommit = useCallback(
    (_event: Event | React.SyntheticEvent, value: number | number[]) => {
      isDraggingRef.current = false;
      const newProgress = Array.isArray(value) ? value[0] : value;
      const player = playerRef.current;
      if (!player) return;

      const frame = Math.round(newProgress * durationInFrames);
      // Clamp: evita seekTo para frame >= durationInFrames (inválido no Remotion)
      const clampedFrame = Math.min(frame, Math.max(0, durationInFrames - 1));

      try {
        player.seekTo(clampedFrame);
        if (player.isPlaying()) {
          player.pause();
        }
      } catch (err) {
        log.error('Erro ao fazer seek no player', { error: String(err), clampedFrame });
      }
    },
    [playerRef, durationInFrames],
  );

  const handleDownloadPng = useCallback(() => {
    const container = playerRef.current?.getContainerNode();
    const canvas = container?.querySelector('canvas');

    if (!canvas) {
      log.warn('Canvas não encontrado para exportação PNG');
      setErrorMessage(t('speedPaint.controlsCaptureError'));
      return;
    }

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width * 2;
      exportCanvas.height = canvas.height * 2;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        log.error('getContext("2d") retornou null');
        setErrorMessage(t('speedPaint.controlsContextError'));
        return;
      }

      ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

      const link = document.createElement('a');
      link.download = `speed-paint-${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      log.error('Falha ao exportar PNG', { error: err });
      setErrorMessage(t('speedPaint.controlsExportImageError'));
    }
  }, [playerRef, t]);

  const handleNewImage = useCallback(() => {
    if (batchMode !== 'idle') {
      onClearQueue();
    } else {
      onResetJob();
    }
  }, [batchMode, onClearQueue, onResetJob]);

  // ── Render ──────────────────────────────────────────────────

  return (
    <>
      <Paper
        elevation={0}
        sx={(theme) => ({
          ...glassSurfaceSx(theme),
          width: '100%',
          p: { xs: 2, md: 2.5 },
          borderRadius: { xs: 3, md: 4 },
        })}
      >
        {/* Header de progresso: badge + slider — única parte que re-renderiza
            frequentemente (a cada 100ms quando progress muda) */}
        <ProgressHeader
          progress={progress}
          phase={phase}
          phaseLabel={t(PHASE_I18N_KEYS[phase])}
          durationInFrames={durationInFrames}
          onChange={handleProgressChange}
          onChangeCommitted={handleProgressCommit}
          ariaLabel={t('speedPaint.controlsProgressAria')}
        />

        {/* Barra de controles: playback + velocidade + ações
            NÃO re-renderiza quando progress muda (todos os filhos são memoizados
            e seus callbacks/props não dependem de progress) */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: GAP_COMPACT }}>
          <PlaybackButtons
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onRestart={handleRestart}
            playLabel={t('speedPaint.controlsPlay')}
            pauseLabel={t('speedPaint.controlsPause')}
            playAria={t('speedPaint.controlsPlayAria')}
            pauseAria={t('speedPaint.controlsPauseAria')}
            restartLabel={t('speedPaint.controlsRestart')}
            restartAria={t('speedPaint.controlsRestartAria')}
          />

          <AnimationDurationSelector
            duration={animationDuration}
            onDurationChange={onAnimationDurationChange}
            helperText={t('speedPaint.durationHelperText')}
          />

          <ActionButtons
            progress={progress}
            batchMode={batchMode}
            onDownload={handleDownloadPng}
            onNewImage={handleNewImage}
            downloadLabel={t('speedPaint.controlsDownloadImage')}
            downloadAria={t('speedPaint.controlsDownloadImageAria')}
            newImageLabel={t('speedPaint.controlsNewImage')}
            leaveQueueLabel={t('speedPaint.controlsLeaveQueue')}
            newImageBtnLabel={t('speedPaint.controlsNewImageBtn')}
            leaveQueueBtnLabel={t('speedPaint.controlsLeaveCancel')}
          />
        </Stack>
      </Paper>

      {/* Feedback de erro */}
      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={8000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setErrorMessage(null);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setErrorMessage(null)}
          sx={{ width: '100%', alignItems: 'center', minWidth: { xs: 'min(92vw, 320px)', sm: 360 } }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
});
