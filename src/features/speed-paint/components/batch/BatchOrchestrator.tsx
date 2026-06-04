import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import { useAnimationStore } from '../../store/animationStore';
import { generateStrokesFromImage } from '../../lib/imageProcessing';
import { createLogger } from '../../../../lib/logger';
import { useLocale } from '../../../i18n';
import {
  ERROR_MAIN,
  BRAND_GRADIENT, RADIUS_SM } from '../../../../theme/tokens';
import { glassPanelSx } from '../../../../theme/surfaces';

const log = createLogger('BatchOrchestrator');

/**
 * Orquestrador invisível que processa imagens da fila automaticamente.
 * Gerencia o pipeline: imagem pendente -> geração de strokes.
 * A reprodução é controlada pelo Remotion Player (auto-play ao detectar job completed).
 */
export function BatchOrchestrator() {
  const { t } = useLocale();
  const job = useAnimationStore((s) => s.job);
  const queue = useAnimationStore((s) => s.queue);
  const currentIndex = useAnimationStore((s) => s.currentIndex);
  const batchMode = useAnimationStore((s) => s.batchMode);
  const setJob = useAnimationStore((s) => s.setJob);
  const setCurrentIndex = useAnimationStore((s) => s.setCurrentIndex);
  const setBatchMode = useAnimationStore((s) => s.setBatchMode);
  const setQueue = useAnimationStore((s) => s.setQueue);

  const currentImageIdRef = useRef<string | null>(null);
  // W5: ref para detectar quando a fila foi limpa durante processamento
  const processingIdRef = useRef<string | null>(null);
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentImg = queue[currentIndex];

  useEffect(() => {
    if (batchMode === 'watch' && queue.length > 0) return;

    currentImageIdRef.current = null;
    processingIdRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = null;
    }
  }, [batchMode, queue.length]);

  // Pipeline de processamento: detecta nova imagem na fila e gera strokes
  useEffect(() => {
    if (batchMode !== 'watch' || queue.length === 0) return;

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
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setJob({
        id: currentImg.id,
        inputImage: currentImg.dataUrl,
        status: 'processing',
        progress: 0,
      });
      setQueue((prev) => prev.map((item) => (
        item.id === currentImg.id
          ? { ...item, status: 'processing' }
          : item
      )));

      generateStrokesFromImage(currentImg.dataUrl, (p) => {
        if (processingIdRef.current !== processId) return;
        setJob({ progress: p });
      }, { signal: abortController.signal }).then((animation) => {
        // Se a fila foi limpa durante o processamento, ignora o resultado
        if (processingIdRef.current !== processId) return;
        // Marca job como concluído — o SpeedPaintPlayer detecta e auto-play
        setJob({ id: currentImg.id, status: 'completed', animation, progress: 0 });
        setQueue((prev) => prev.map((item) => (
          item.id === currentImg.id
            ? { ...item, status: 'completed' }
            : item
        )));
      }).catch((err) => {
        if (abortController.signal.aborted) return;
        // Se a fila foi limpa durante o processamento, ignora o erro
        if (processingIdRef.current !== processId) return;
        log.error('Falha ao processar imagem em lote', { error: err });
        setJob({ id: currentImg.id, status: 'failed' });
        setQueue((prev) => prev.map((item) => (
          item.id === currentImg.id
            ? { ...item, status: 'failed' }
            : item
        )));

        // Auto-skip após 2 segundos — usa getState() para evitar closure stale
        if (skipTimeoutRef.current) {
          clearTimeout(skipTimeoutRef.current);
        }
        skipTimeoutRef.current = setTimeout(() => {
          setCurrentIndex(useAnimationStore.getState().currentIndex + 1);
          skipTimeoutRef.current = null;
        }, 2000);
      });
    }

    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current);
        skipTimeoutRef.current = null;
      }
    };
  }, [batchMode, currentIndex, currentImg, queue.length, setJob, setCurrentIndex, setBatchMode, setQueue]);

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
          borderRadius: RADIUS_SM,
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
          {t('speedPaint.batchProcessingFailed')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {nextInQueue
            ? t('speedPaint.batchSkippingNext')
            : t('speedPaint.batchSkippingRest')}
        </Typography>
      </Box>
    );
  }

  return null;
}
