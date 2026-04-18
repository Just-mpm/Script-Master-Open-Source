import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Close from '@mui/icons-material/Close';
import { ICON_SIZE_MD } from '../theme/tokens';

interface ErrorToastProps {
  error: string | null;
  onDismiss: () => void;
}

export function ErrorToast({ error, onDismiss }: ErrorToastProps) {
  return (
    <Snackbar
      open={Boolean(error)}
      autoHideDuration={8000}
      onClose={(_, reason) => {
        if (reason === 'clickaway') {
          return;
        }

        onDismiss();
      }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity="error"
        variant="filled"
        onClose={onDismiss}
          action={
          <IconButton color="inherit" size="small" aria-label="Fechar mensagem de erro" onClick={onDismiss}>
            <Close sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        }
        sx={{ width: '100%', alignItems: 'center', minWidth: { xs: 'min(92vw, 320px)', sm: 360 } }}
      >
        {error}
      </Alert>
    </Snackbar>
  );
}
