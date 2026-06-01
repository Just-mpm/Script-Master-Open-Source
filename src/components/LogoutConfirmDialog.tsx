import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import Logout from '@mui/icons-material/Logout';
import { useLocale } from '../features/i18n';

interface LogoutConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Dialog de confirmação reutilizável para logout. */
export function LogoutConfirmDialog({ open, onClose, onConfirm }: LogoutConfirmDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="logout-confirm-title"
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle id="logout-confirm-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Logout sx={{ fontSize: 20, color: 'error.main' }} aria-hidden="true" />
        {t('studio.header.logout.dialogTitle')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {t('studio.header.logout.dialogDescription')}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          {t('studio.header.logout.dialogCancel')}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained"
          sx={{
            transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
            },
          }}
        >
          {t('studio.header.logout.dialogConfirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
