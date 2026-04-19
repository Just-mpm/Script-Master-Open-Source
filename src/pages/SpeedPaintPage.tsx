import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useAnimationStore } from '../features/speed-paint/store/animationStore';
import { BatchOrchestrator } from '../features/speed-paint/components/batch/BatchOrchestrator';
import { QueueStaging } from '../features/speed-paint/components/batch/QueueStaging';
import { AnimationPlayer } from '../features/speed-paint/components/canvas/AnimationPlayer';
import { ImageUpload } from '../features/speed-paint/components/upload/ImageUpload';
import { APP_MAX_WIDTH, BRAND_GRADIENT, EMPTY_WRAPPER_MAX_WIDTH, EMPTY_WRAPPER_PADDING_MD } from '../theme/tokens';

export function SpeedPaintPage() {
  const { queue, batchMode } = useAnimationStore();

  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: APP_MAX_WIDTH, mx: 'auto', px: { xs: 2, sm: 3 } }}>
      <BatchOrchestrator />

      {queue.length === 0 ? (
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
              Transforme Imagens em{' '}
              <Box
                component="span"
                sx={{
                  background: BRAND_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Speed Paints
              </Box>
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, lineHeight: 1.7 }}
            >
              Envie qualquer imagem e assista a ela sendo desenhada traço por traço.
              Nosso motor analisa a imagem e gera uma animação de pintura progressiva.
            </Typography>
          </Box>
          <ImageUpload />
        </Box>
      ) : batchMode === 'idle' ? (
        <QueueStaging />
      ) : (
        <AnimationPlayer />
      )}
    </Stack>
  );
}
