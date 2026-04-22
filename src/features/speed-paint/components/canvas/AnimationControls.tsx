import { useState, useRef, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Slider from '@mui/material/Slider';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SpeedIcon from '@mui/icons-material/Speed';
import VideocamIcon from '@mui/icons-material/Videocam';
import ImageIcon from '@mui/icons-material/Image';
import { alpha } from '@mui/material/styles';
import { useAnimationStore } from '../../store/animationStore';
import { getStageRef } from '../../lib/stageRef';
import { createLogger } from '../../../../lib/logger';
import { glassSurfaceSx } from '../../../../theme/surfaces';
import { ERROR_MAIN } from '../../../../theme/tokens';
import { SpeedSelector } from '../SpeedSelector';

const log = createLogger('AnimationControls');

export function AnimationControls() {
  const {
    isPlaying, setIsPlaying,
    progress, setProgress,
    speed, setSpeed,
    paintSpeed, setPaintSpeed,
    resetJob, job,
    batchMode, currentIndex, queue, setCurrentIndex, setBatchMode, clearQueue,
  } = useAnimationStore();
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Menu mobile para SpeedSelector em telas pequenas
  const [speedMenuAnchorEl, setSpeedMenuAnchorEl] = useState<HTMLElement | null>(null);
  const isSpeedMenuOpen = Boolean(speedMenuAnchorEl);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handlePlayPause = () => {
    if (progress >= 1 && !isPlaying) {
      setProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (_event: Event, value: number | number[]) => {
    const newProgress = Array.isArray(value) ? value[0] : value;
    setProgress(newProgress);
    if (isPlaying) setIsPlaying(false);
  };

  const handleDownloadImage = () => {
    const stage = getStageRef();
    if (stage) {
      // Calculate pixel ratio to ensure the downloaded image is always 2x the ORIGINAL canvas size
      const currentScale = stage.scaleX() || 1;
      const pixelRatio = 2 / currentScale;

      const link = document.createElement('a');
      link.download = `speed-paint-${Date.now()}.png`;
      link.href = stage.toDataURL({ pixelRatio });
      link.click();
    } else {
      // Fallback: find canvas via DOM
      const canvas = document.querySelector('#paint-canvas-container canvas') as HTMLCanvasElement | null;
      if (canvas) {
        const link = document.createElement('a');
        link.download = `speed-paint-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  const handleDownloadVideo = () => {
    // Force a fresh state check for batch advances
    const currentState = useAnimationStore.getState();
    const currentBatchMode = currentState.batchMode;
    const currentQueue = currentState.queue;
    const currentIdx = currentState.currentIndex;

    const container = document.querySelector('#paint-canvas-container');
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;

    if (!canvas) {
      log.error('Canvas não encontrado para gravação');
      if (currentBatchMode === 'record') setIsPlaying(true);
      return;
    }

    setProgress(0);
    setIsRecording(true);
    chunksRef.current = [];

    try {
      // Capture at 60fps for smooth video
      const stream = canvas.captureStream(60);

      let mimeType = '';
      const extension = 'webm';

      // Prioritize WebM with H.264 if supported, otherwise standard WebM
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else {
        mimeType = 'video/webm';
      }

      log.info('Iniciando gravação', { mimeType });

      // High quality video export (12 Mbps for 1080p)
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12_000_000,
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (chunksRef.current.length === 0) {
          log.error('Nenhum dado de vídeo capturado');
          setIsRecording(false);
          setErrorMessage('Falha ao capturar dados do vídeo. Tente novamente.');
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mimeType });
        log.info('Gravação finalizada', { blobSize: blob.size });

        if (blob.size < 1000) {
          log.warn('Vídeo capturado é suspeitamente pequeno');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const currentImg = currentQueue[currentIdx];
        const baseName = currentImg ? currentImg.filename.split('.')[0] : `speed-paint-${Date.now()}`;
        link.download = `${baseName}.${extension}`;

        link.click();

        // Cleanup and auto-advance
        setTimeout(() => {
          URL.revokeObjectURL(url);
          setIsRecording(false);

          // --- BATCH AUTO-ADVANCE AFTER RECORDING ---
          const finalState = useAnimationStore.getState();
          if (finalState.batchMode === 'record') {
            if (finalState.currentIndex + 1 < finalState.queue.length) {
              finalState.setCurrentIndex(finalState.currentIndex + 1);
            } else {
              finalState.setBatchMode('idle');
              finalState.clearQueue();
            }
          }
        }, 100);
      };

      // Start recording
      recorder.start(1000);

      // Small delay to ensure recorder is ready before starting animation
      setTimeout(() => {
        setIsPlaying(true);
      }, 300);
    } catch (err) {
      log.error('Falha ao iniciar gravação', { error: err });
      setIsRecording(false);
      setErrorMessage('Falha ao iniciar gravação. Seu navegador pode não suportar este recurso.');

      if (currentBatchMode === 'record') {
        setIsPlaying(true);
      }
    }
  };

  // Ref estável para handleDownloadVideo, atualizado a cada render via useEffect
  // (pattern recomendado para usar função de componente em useEffect sem re-trigger)
  const handleDownloadVideoRef = useRef(handleDownloadVideo);

  useEffect(() => {
    handleDownloadVideoRef.current = handleDownloadVideo;
  });

  // --- AUTOMATION TRIGGERS ---

  // 1. Auto-Start Recording when a new job is ready in 'record' mode
  const handledJobIdForRecordRef = useRef<string | null>(null);

  useEffect(() => {
    if (batchMode === 'record' && job.status === 'completed' && progress === 0 && !isRecording && job.id !== handledJobIdForRecordRef.current) {
      handledJobIdForRecordRef.current = job.id;

      setTimeout(() => {
        if (useAnimationStore.getState().batchMode === 'record') {
          handleDownloadVideoRef.current();
        }
      }, 800);
    }
  }, [batchMode, job.status, progress, isRecording, job.id]);

  // 2. Auto-Advance in 'watch' mode when animation finishes
  useEffect(() => {
    if (batchMode === 'watch' && progress >= 1 && !isPlaying) {
      const timer = setTimeout(() => {
        if (currentIndex + 1 < queue.length) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setBatchMode('idle');
          clearQueue();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [batchMode, progress, isPlaying, currentIndex, queue.length, setCurrentIndex, setBatchMode, clearQueue]);

  // Stop recording automatically when animation finishes
  useEffect(() => {
    if (isRecording && progress >= 1) {
      const timer = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, isRecording]);

  // Determine current animation phase for the UI
  let currentPhase = 'Pronto';
  if (isRecording) {
    currentPhase = 'Gravando Vídeo...';
  } else if (job.animation && progress > 0 && progress < 1) {
    const currentStrokeIndex = Math.max(0, Math.floor(progress * job.animation.strokes.length) - 1);
    const currentStroke = job.animation.strokes[currentStrokeIndex];
    currentPhase = currentStroke?.type === 'reveal' ? 'Colorindo...' : 'Desenhando Objetos...';
  } else if (progress === 1) {
    currentPhase = 'Concluído';
  }

  return (
    <>
      <Paper
        elevation={0}
        sx={(theme) => ({
        ...glassSurfaceSx(theme),
        width: '100%',
        maxWidth: 768,
        mx: 'auto',
        mt: 3,
        p: 2,
        borderRadius: 2,
      })}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            transition: 'color 300ms',
            color: isRecording ? ERROR_MAIN : 'text.primary',
          }}
        >
          {currentPhase}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
          {Math.round(progress * 100)}%
        </Typography>
      </Stack>

      <Box sx={{ px: 0.5, mb: 2 }}>
        <Slider
          value={progress}
          onChange={handleProgressChange}
          disabled={isRecording}
          min={0}
          max={1}
          step={0.001}
          aria-label="Progresso da animação"
          sx={{
            color: 'primary.main',
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
            },
          }}
        />
      </Box>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={isPlaying ? 'Pausar' : 'Reproduzir'}>
            <span>
              <IconButton
                onClick={handlePlayPause}
                disabled={isRecording}
                aria-label={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
                sx={(theme) => ({
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.25),
                  },
                })}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon sx={{ ml: 0.25 }} />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Reiniciar">
            <span>
              <IconButton
                onClick={() => { setProgress(0); setIsPlaying(false); }}
                disabled={isRecording}
                aria-label="Reiniciar animação"
              >
                <ReplayIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

          <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 0.5, sm: 2 }, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* SpeedSelectors desktop (sm+) */}
          <Stack sx={{ gap: 0.5, display: { xs: 'none', sm: 'flex' } }}>
            <SpeedSelector label="Draw" value={speed} onChange={setSpeed} disabled={isRecording} />
            <SpeedSelector label="Paint" value={paintSpeed} onChange={setPaintSpeed} disabled={isRecording} />
          </Stack>

          {/* SpeedSelectors mobile (xs) — ícone que abre Menu */}
          <Tooltip title="Velocidade">
            <IconButton
              onClick={(e) => setSpeedMenuAnchorEl(e.currentTarget)}
              disabled={isRecording}
              aria-label="Ajustar velocidade"
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <SpeedIcon />
            </IconButton>
          </Tooltip>
          <Menu
            open={isSpeedMenuOpen}
            anchorEl={speedMenuAnchorEl}
            onClose={() => setSpeedMenuAnchorEl(null)}
            slotProps={{
              paper: {
                sx: (theme) => ({
                  ...glassSurfaceSx(theme),
                  minWidth: 200,
                  p: 1.5,
                  borderRadius: 2,
                }),
              },
            }}
          >
            <SpeedSelector label="Draw" value={speed} onChange={setSpeed} disabled={isRecording} variant="panel" />
            <SpeedSelector label="Paint" value={paintSpeed} onChange={setPaintSpeed} disabled={isRecording} variant="panel" />
          </Menu>

          <Box
            aria-hidden="true"
            sx={(theme) => ({
              width: 32,
              height: 32,
              bgcolor: alpha(theme.palette.common.white, 0.04),
              borderRadius: 1,
              mx: { sm: 0.5 },
              display: { xs: 'none', sm: 'block' },
            })}
          />

          <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 0.5, sm: 0.75 } }}>
            <Tooltip title="Baixar Imagem">
              <span>
                <IconButton
                  onClick={handleDownloadImage}
                  disabled={progress === 0 || isRecording}
                  aria-label="Baixar imagem"
                >
                  <PhotoCameraIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Baixar Video">
              <span>
                <IconButton
                  onClick={handleDownloadVideo}
                  disabled={isRecording}
                  aria-label="Baixar vídeo"
                  sx={isRecording ? { color: ERROR_MAIN } : undefined}
                >
                  {isRecording
                    ? <CircularProgress size={20} sx={{ color: ERROR_MAIN }} />
                    : <VideocamIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={batchMode !== 'idle' ? 'Sair da fila' : 'Enviar nova imagem'}>
              <Button
                onClick={batchMode !== 'idle' ? clearQueue : resetJob}
                disabled={isRecording}
                startIcon={<ImageIcon sx={{ fontSize: 18 }} />}
                sx={(theme) => ({
                  color: 'text.primary',
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.white, 0.08),
                  },
                })}
              >
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {batchMode !== 'idle' ? 'Sair/Cancelar' : 'Nova Imagem'}
                </Typography>
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
        </Stack>
      </Paper>

      {/* Feedback de erro via Snackbar (substitui alert nativo) */}
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
}
