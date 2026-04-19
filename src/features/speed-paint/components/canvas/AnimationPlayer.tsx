import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useAnimationStore } from '../../store/animationStore';
import { StrokeRenderer } from './StrokeRenderer';
import { AnimationControls } from './AnimationControls';
import { CYAN_GLOW_SOFT } from '../../../../theme/tokens';

export function AnimationPlayer() {
  const { job, isPlaying, setIsPlaying, setProgress } = useAnimationStore();
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const hasAutoPlayed = useRef(false);

  useEffect(() => {
    if (isPlaying) {
      const animate = (time: number) => {
        const state = useAnimationStore.getState();

        if (lastTimeRef.current !== undefined && state.isPlaying && state.job.animation) {
          const deltaTime = time - lastTimeRef.current;

          // Calculate progress increment based on total duration and speed
          // If we are in the coloring/reveal phase, use the specific paintSpeed
          const threshold = state.job.animation.revealThreshold || 0.8;
          const currentSpeed = state.progress >= threshold ? (state.paintSpeed * 0.5) : state.speed;

          const totalDurationMs = state.job.animation.totalDurationMs;
          const progressIncrement = (deltaTime / totalDurationMs) * currentSpeed * 12;

          let newProgress = state.progress + progressIncrement;

          if (newProgress >= 1) {
            newProgress = 1;
            state.setIsPlaying(false);
          }

          state.setProgress(newProgress);
        }

        lastTimeRef.current = time;
        if (useAnimationStore.getState().isPlaying) {
          requestRef.current = requestAnimationFrame(animate);
        }
      };

      requestRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = undefined;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
    // Only re-bind when play state changes, not on every progress update
  }, [isPlaying]);

  // Reset auto-play flag when new job starts
  useEffect(() => {
    if (job.status === 'processing') {
      hasAutoPlayed.current = false;
    }
  }, [job.id, job.status]);

  // Handle manual playback mode where no batch is present and the user drops one image
  const batchMode = useAnimationStore.getState().batchMode;

  useEffect(() => {
    if (job.status === 'completed' && !hasAutoPlayed.current && batchMode === 'idle') {
      hasAutoPlayed.current = true;
      setProgress(0);
      setIsPlaying(true);
    }
  }, [job.status, setProgress, setIsPlaying, batchMode]);

  if (job.status === 'processing') {
    return (
      <Box
        sx={(theme) => ({
          width: '100%',
          maxWidth: 672,
          mx: 'auto',
          p: 4,
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: alpha(theme.palette.background.paper, 0.4),
          backgroundImage: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
        })}
      >
        <CircularProgress
          size={56}
          sx={{ color: 'primary.main', mb: 2 }}
        />
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          Gerando Animação ({Math.round(job.progress * 100)}%)...
        </Typography>
        <Box sx={{ width: '100%', maxWidth: 448 }}>
          <LinearProgress
            variant="determinate"
            value={job.progress * 100}
            sx={(theme) => ({
              height: 10,
              borderRadius: 5,
              bgcolor: alpha(theme.palette.background.default, 0.6),
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main',
                borderRadius: 5,
                boxShadow: `0 0 12px ${CYAN_GLOW_SOFT}`,
              },
            })}
          />
        </Box>
      </Box>
    );
  }

  if (job.status !== 'completed') return null;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <StrokeRenderer />
      <AnimationControls />
    </Box>
  );
}
