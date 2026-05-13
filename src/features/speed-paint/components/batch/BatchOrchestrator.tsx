import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import { useAnimationStore } from '../../store/animationStore';
import { generateStrokesFromImage } from '../../lib/imageProcessing';
import { createLogger } from '../../../../lib/logger';
import {
  ERROR_MAIN,
  BRAND_GRADIENT,
} from '../../../../theme/tokens';
import { glassPanelSx } from '../../../../theme/surfaces';

const log = createLogger('BatchOrchestrator');

/**
 * Orquestrador invisível que processa imagens da fila automaticamente.
 * Gerencia o pipeline: imagem pendente -> geração de strokes.
 * A reprodução é controlada pelo Remotion Player (auto-play ao detectar job completed).
 */
export function BatchOrchestrator() {
  const job = useAnimationStore((s) => s.job);
  const queue = useAnimationStore((s) => s.queue);
  const currentIndex = useAnimationStore((s) => s.currentIndex);
  const batchMode = useAnimationStore((s) => s.batchMode);
  const setJob = useAnimationStore((s) => s.setJob);
  const setCurrentIndex = useAnimationStore((s) => s.setCurrentIndex);
  const setBatchMode = useAnimationStore((s) => s.setBatchMode);

  const currentImageIdRef = useRef<string | null>(null);
  // W5: ref para detectar quando a fila foi limpa durante processamento
  const processingIdRef = useRef<string | null>(null);

  // Pipeline de processamento: detecta nova imagem na fila e gera strokes
  useEffect(() => {
    if (batchMode === 'idle' || queue.length === 0) return;

    const currentImg = queue[currentIndex];

    // Fim da fila — volta ao estado idle
    if (!currentImg) {
      setBatchMode('idle');
      return;
    }

    // Processa apenas imagens novas (evita re-processar a mesma)
    if (currentImageIdRef.current !== currentImg.id) {
      currentImageIdRef.current = currentImg.id;

      // Marca o ID do item sendo processado para checagem de cancelamento
      const processId = currentImg.id;
      processingIdRef.current = processId;

      setJob({ inputImage: currentImg.dataUrl, status: 'processing', progress: 0 });

      generateStrokesFromImage(currentImg.dataUrl, (p) => {
        setJob({ progress: p });
      }).then((animation) => {
        // Se a fila foi limpa durante o processamento, ignora o resultado
        if (processingIdRef.current !== processId) return;
        // Marca job como concluído — o SpeedPaintPlayer detecta e auto-play
        setJob({ status: 'completed', animation, progress: 0 });
      }).catch((err) => {
        // Se a fila foi limpa durante o processamento, ignora o erro
        if (processingIdRef.current !== processId) return;
        log.error('Falha ao processar imagem em lote', { error: err });
        setJob({ status: 'failed' });

        // Auto-skip após 2 segundos — usa getState() para evitar closure stale
        setTimeout(() => {
          setCurrentIndex(useAnimationStore.getState().currentIndex + 1);
        }, 2000);
      });
    }
  }, [batchMode, currentIndex, queue, setJob, setCurrentIndex, setBatchMode]);

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
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: BRAND_GRADIENT,
            opacity: 0.2,
            mb: 1.5,
          }}
        >
          <ErrorOutlineOutlined sx={{ fontSize: 40, color: ERROR_MAIN }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '-0.02em', mb: 0.5 }}>
          Falha ao processar imagem
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {nextInQueue
            ? 'Avançando automaticamente para a próxima imagem...'
            : 'Todas as imagens restantes na fila serão puladas.'}
        </Typography>
      </Box>
    );
  }

  return null;
}
