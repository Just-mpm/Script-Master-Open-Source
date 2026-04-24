import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import { useAnimationStore } from '../../store/animationStore';
import { generateStrokesFromImage } from '../../lib/imageProcessing';
import { createLogger } from '../../../../lib/logger';
import { ERROR_MAIN } from '../../../../theme/tokens';
import { glassPanelSx } from '../../../../theme/surfaces';

const log = createLogger('BatchOrchestrator');

/**
 * Orquestrador invisível que processa imagens da fila automaticamente.
 * Gerencia o pipeline: imagem pendente -> geração de strokes -> reprodução.
 */
export function BatchOrchestrator() {
  const job = useAnimationStore((s) => s.job);
  const queue = useAnimationStore((s) => s.queue);
  const currentIndex = useAnimationStore((s) => s.currentIndex);
  const batchMode = useAnimationStore((s) => s.batchMode);
  const setJob = useAnimationStore((s) => s.setJob);
  const setCurrentIndex = useAnimationStore((s) => s.setCurrentIndex);
  const setBatchMode = useAnimationStore((s) => s.setBatchMode);
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying);
  const setProgress = useAnimationStore((s) => s.setProgress);

  const currentImageIdRef = useRef<string | null>(null);

  // Handle automatic generation of strokes for the current queued image
  useEffect(() => {
    if (batchMode === 'idle' || queue.length === 0) return;

    const currentImg = queue[currentIndex];

    // If we've reached the end
    if (!currentImg) {
      setBatchMode('idle');
      return;
    }

    // Only process if it's a new image
    if (currentImageIdRef.current !== currentImg.id) {
      currentImageIdRef.current = currentImg.id;

      // Update UI state
      setJob({ inputImage: currentImg.dataUrl, status: 'processing', progress: 0 });

      generateStrokesFromImage(currentImg.dataUrl, (p) => {
        setJob({ progress: p });
      }).then((animation) => {
        setJob({ status: 'completed', animation, progress: 0 });
        // Autoplay once ready (will be hijacked by recorder if in record mode)
        setProgress(0);

        // Give the UI a tiny moment to render the canvas before triggering play
        if (batchMode !== 'record') {
          setTimeout(() => {
            setIsPlaying(true);
          }, 100);
        }
      }).catch((err) => {
        log.error('Falha ao processar imagem em lote', { error: err });
        setJob({ status: 'failed' });

        // Auto-skip failed image after 2 seconds
        // Usa getState() para evitar closure stale do currentIndex
        setTimeout(() => {
          setCurrentIndex(useAnimationStore.getState().currentIndex + 1);
        }, 2000);
      });
    }
  }, [batchMode, currentIndex, queue, setJob, setIsPlaying, setProgress, setCurrentIndex, setBatchMode]);

  if (job.status === 'failed' && batchMode !== 'idle') {
    const nextInQueue = currentIndex + 1 < queue.length;
    return (
      <Box
        sx={(theme) => ({
          ...glassPanelSx(theme),
          width: '100%',
          maxWidth: 672,
          mx: 'auto',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          border: `1px solid ${alpha(ERROR_MAIN, 0.3)}`,
          borderRadius: 3,
        })}
        role="alert"
      >
        <ErrorOutlineOutlined sx={{ fontSize: 40, color: ERROR_MAIN, mb: 1.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          Falha ao processar imagem
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {nextInQueue
            ? 'Avançando automaticamente para a próxima imagem...'
            : 'Todas as imagens restantes na fila serão puladas.'}
        </Typography>
      </Box>
    );
  }

  return null;
}
