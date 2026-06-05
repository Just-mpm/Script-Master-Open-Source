/**
 * Tela de sucesso do wizard — 4 CTAs:
 *  1. Ver na Biblioteca
 *  2. Abrir no Speed Paint (carrega fila antes de navegar)
 *  3. Exportar como Vídeo
 *  4. Criar outro projeto (reseta wizard via callback)
 *
 * Analytics: dispara `manual_project_cta_clicked` ao clicar.
 *
 * GAP-01 (CRÍTICO): o CTA Speed Paint agora prepara a fila antes de navegar,
 * chamando `getProjectDetails` + `prepareProjectImagesForSpeedPaint` +
 * `useAnimationStore.loadLibraryQueue`, exatamente como o `Library.tsx:268-313`.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircle from '@mui/icons-material/CheckCircle';
import LibraryBooks from '@mui/icons-material/LibraryBooks';
import Brush from '@mui/icons-material/Brush';
import Movie from '@mui/icons-material/Movie';
import Add from '@mui/icons-material/Add';
import { useLocale } from '../../i18n';
import { trackAnalyticsEvent } from '../../../lib/analytics';
import { getProjectDetails } from '../../../lib/db/projects';
import { prepareProjectImagesForSpeedPaint } from '../../speed-paint/lib/projectQueueAdapter';
import { useAnimationStore } from '../../speed-paint/store/animationStore';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ManualProjectSuccessProps {
  projectId: string;
  projectName: string;
  onCreateAnother: () => void;
}

export function ManualProjectSuccess({
  projectId,
  projectName,
  onCreateAnother,
}: ManualProjectSuccessProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { user } = useAuth();
  const loadLibraryQueue = useAnimationStore((state) => state.loadLibraryQueue);
  const [isPreparingSpeedPaint, setIsPreparingSpeedPaint] = useState(false);

  const navigateTo = useCallback((destination: 'library' | 'speed_paint' | 'video' | 'new') => {
    trackAnalyticsEvent('manual_project_cta_clicked', { destination });
    if (destination === 'library') {
      navigate('/app/biblioteca');
    } else if (destination === 'speed_paint') {
      navigate('/app/pintura-rapida');
    } else if (destination === 'video') {
      navigate('/app/video');
    } else {
      onCreateAnother();
    }
  }, [navigate, onCreateAnother]);

  const handleSpeedPaint = useCallback(async () => {
    if (isPreparingSpeedPaint) return;
    setIsPreparingSpeedPaint(true);

    try {
      const images = (await getProjectDetails(projectId, user?.uid)).images;

      if (images.length === 0) {
        toast.error(t('library.speedPaintNoImages'));
        return;
      }

      const { queue, failedCount } = await prepareProjectImagesForSpeedPaint(projectName, images);

      if (queue.length === 0) {
        toast.error(t('library.speedPaintPrepareError'));
        return;
      }

      const speedPaintNotice = failedCount > 0
        ? t('library.speedPaintPartialWarning', {
          ready: queue.length,
          failed: failedCount,
        })
        : null;

      loadLibraryQueue(queue, projectName, speedPaintNotice);
      trackAnalyticsEvent('manual_project_cta_clicked', { destination: 'speed_paint' });
      navigate('/app/pintura-rapida');
    } catch (error) {
      console.error('Falha ao preparar Speed Paint', { error });
      toast.error(t('library.speedPaintPrepareError'));
    } finally {
      setIsPreparingSpeedPaint(false);
    }
  }, [isPreparingSpeedPaint, projectId, projectName, user, t, loadLibraryQueue, navigate]);

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Stack spacing={3} sx={{ alignItems: 'center', maxWidth: 720, mx: 'auto' }}>
        <Box
          sx={(theme) => ({
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(theme.palette.success.main, 0.15),
            border: `2px solid ${alpha(theme.palette.success.main, 0.4)}`,
          })}
        >
          <CheckCircle sx={{ fontSize: 44, color: 'success.main' }} />
        </Box>

        <Stack spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t('manualProject.success.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('manualProject.success.description')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {projectName} • ID: {projectId}
          </Typography>
        </Stack>

        {/* CTAs primários — Speed Paint, Vídeo, Library */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          useFlexGap
          sx={{ width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<Brush />}
            onClick={() => void handleSpeedPaint()}
            disabled={isPreparingSpeedPaint}
            aria-busy={isPreparingSpeedPaint}
          >
            {isPreparingSpeedPaint
              ? t('library.speedPaintPreparing')
              : t('manualProject.success.goToSpeedPaint')}
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<Movie />}
            onClick={() => navigateTo('video')}
          >
            {t('manualProject.success.goToVideo')}
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<LibraryBooks />}
            onClick={() => navigateTo('library')}
          >
            {t('manualProject.success.goToLibrary')}
          </Button>
        </Stack>

        {/* CTA secundário — Criar outro projeto */}
        <Button
          variant="text"
          size="medium"
          startIcon={<Add />}
          onClick={() => navigateTo('new')}
          sx={{ mt: 1 }}
        >
          {t('manualProject.success.createAnother')}
        </Button>
      </Stack>
    </Box>
  );
}
