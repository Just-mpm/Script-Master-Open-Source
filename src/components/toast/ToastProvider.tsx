import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { ErrorToast } from '../ErrorToast';
import { SuccessToast } from '../SuccessToast';
import { WarningToast } from '../WarningToast';

interface ToastManagerProps {
  activeError: string | null;
  onDismissError: () => void;
  warning: string | null;
  onDismissWarning: () => void;
  successMessage: string | null;
  onDismissSuccess: () => void;
  isExportingVideo: boolean;
  videoExportProgress: number;
  isVideoRoute: boolean;
}

/**
 * Componente que centraliza a renderização de todos os toasts da aplicação:
 * - ErrorToast (erros de auth e estúdio)
 * - WarningToast (avisos parciais de geração de cenas)
 * - SuccessToast (feedback de sucesso)
 * - Snackbar de progresso de exportação de vídeo
 */
export function ToastManager({
  activeError,
  onDismissError,
  warning,
  onDismissWarning,
  successMessage,
  onDismissSuccess,
  isExportingVideo,
  videoExportProgress,
  isVideoRoute,
}: ToastManagerProps) {
  const navigate = useNavigate();

  return (
    <>
      <ErrorToast error={activeError} onDismiss={onDismissError} />
      <WarningToast warning={warning} onDismiss={onDismissWarning} />
      <SuccessToast message={successMessage} onDismiss={onDismissSuccess} />

      {/* Toast de progresso de exportação — visível quando exportando fora da página /video */}
      {isExportingVideo && !isVideoRoute && (
        <Snackbar
          open
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 80, md: 96 } }}
        >
          <Alert
            severity="info"
            variant="filled"
            role="progressbar"
            aria-valuenow={videoExportProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Exportando vídeo: ${videoExportProgress}%`}
            icon={<CircularProgress size={20} color="inherit" />}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={() => navigate('/app/video')}
                sx={{ fontWeight: 600 }}
              >
                Ver vídeo
              </Button>
            }
            sx={{
              width: '100%',
              alignItems: 'center',
              minWidth: { xs: 'min(92vw, 360px)', sm: 400 },
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Exportando vídeo...
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {videoExportProgress}%
              </Typography>
            </Stack>
          </Alert>
        </Snackbar>
      )}
    </>
  );
}
