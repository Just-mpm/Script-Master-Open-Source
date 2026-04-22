import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Close from '@mui/icons-material/Close';
import { ICON_SIZE_MD } from '../theme/tokens';

interface WarningToastProps {
  warning: string | null;
  onDismiss: () => void;
}

/** Snackbar de aviso para falhas parciais (ex: cenas que falharam na geração). */
export function WarningToast({ warning, onDismiss }: WarningToastProps) {
  return (
    <Snackbar
      open={Boolean(warning)}
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
        severity="warning"
        variant="filled"
        onClose={onDismiss}
        action={
          <IconButton color="inherit" size="small" aria-label="Fechar aviso" onClick={onDismiss}>
            <Close sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        }
        sx={{ width: '100%', alignItems: 'center', minWidth: { xs: 'min(92vw, 320px)', sm: 360 } }}
      >
        {warning}
      </Alert>
    </Snackbar>
  );
}
