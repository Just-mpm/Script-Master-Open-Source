import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { RADIUS_SM } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import type { VideoLibraryItem } from './types';

interface DeleteConfirmationDialogProps {
  open: boolean;
  itemToDelete: VideoLibraryItem | null;
  deletingItem: boolean;
  deleteError: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog de confirmação de exclusão de item da galeria */
export function DeleteConfirmationDialog({
  open,
  itemToDelete,
  deletingItem,
  deleteError,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={deletingItem ? undefined : onCancel}
      fullWidth
      maxWidth="xs"
      aria-labelledby="delete-gallery-item-title"
      slotProps={{
        paper: {
          sx: (theme) => ({
            ...glassPanelSx(theme),
            borderRadius: RADIUS_SM,
            backgroundImage: 'none',
          }),
        },
      }}
    >
      <DialogTitle id="delete-gallery-item-title">
        {deletingItem ? 'Excluindo...' : `Excluir "${itemToDelete?.name ?? 'item'}"?`}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Esta ação remove permanentemente o item e seus arquivos associados.
        </Typography>
        {deleteError && (
          <Alert severity="error" variant="outlined" sx={{ mt: 1.5 }}>
            {deleteError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel} color="inherit" disabled={deletingItem}>
          Cancelar
        </Button>
        <Button onClick={() => void onConfirm()} color="error" variant="contained" disabled={deletingItem}>
          {deletingItem ? 'Excluindo...' : 'Excluir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
