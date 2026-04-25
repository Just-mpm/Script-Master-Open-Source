import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Close from '@mui/icons-material/Close';
import { ICON_SIZE_MD } from '../theme/tokens';

interface SuccessToastProps {
  message: string | null;
  onDismiss: () => void;
}

const TOAST_SX = {
  width: '100%',
  alignItems: 'center',
  minWidth: { xs: 'min(92vw, 320px)', sm: 400 },
} as const;

export function SuccessToast({ message, onDismiss }: SuccessToastProps) {
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={5000}
      onClose={(_, reason) => {
        if (reason === 'clickaway') {
          return;
        }

        onDismiss();
      }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity="success"
        variant="filled"
        onClose={onDismiss}
        action={
          <IconButton color="inherit" size="small" aria-label="Fechar mensagem de sucesso" onClick={onDismiss}>
            <Close sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        }
        sx={TOAST_SX}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
