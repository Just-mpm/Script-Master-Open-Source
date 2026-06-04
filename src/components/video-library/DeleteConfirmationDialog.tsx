import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { RADIUS_SM } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

interface DeleteConfirmationDialogProps {
  open: boolean;
  /** Nome do item exibido no título ("Excluir 'X'?"). Usa fallback "item" se vazio. */
  itemName: string | null;
  deletingItem: boolean;
  deleteError: string | null;
  /** Texto descritivo exibido no corpo do dialog */
  description?: string;
  /** Rótulo do botão confirmar (padrão: "Excluir") */
  confirmLabel?: string;
  /** Rótulo do título quando está deletando (padrão: "Excluindo...") */
  loadingLabel?: string;
  /** Rótulo do título quando está ocioso (padrão: "Excluir 'nome'?") */
  titleIdleLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog de confirmação de exclusão — reutilizável em toda a aplicação */
export function DeleteConfirmationDialog({
  open,
  itemName,
  deletingItem,
  deleteError,
  description = 'Esta ação remove permanentemente o item e seus arquivos associados.',
  confirmLabel = 'Excluir',
  loadingLabel = 'Excluindo...',
  titleIdleLabel,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  const displayTitle = titleIdleLabel ?? `Excluir "${itemName ?? 'item'}"?`;

  return (
    <Dialog
      open={open}
      onClose={deletingItem ? undefined : onCancel }
      fullWidth
      maxWidth="xs"
      aria-labelledby="delete-confirmation-title"
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
      <DialogTitle id="delete-confirmation-title">
        {deletingItem ? loadingLabel : displayTitle }
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {description}
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
          {deletingItem ? loadingLabel : confirmLabel }
        </Button>
      </DialogActions>
    </Dialog>
  );
}
