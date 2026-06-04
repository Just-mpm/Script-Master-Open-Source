import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../features/i18n';
import { createLogger } from '../../lib/logger';
import { RADIUS_XS } from '../../theme/tokens';

const log = createLogger('delete-account-dialog');

/** Palavra-chave que o usuário precisa digitar para confirmar a exclusão. */
const CONFIRM_KEYWORD = 'EXCLUIR';

interface DeleteAccountDialogProps {
  /** Controla a visibilidade do dialog (gerenciado pelo componente pai). */
  open: boolean;
  /** Callback ao fechar o dialog (por backdrop, ESC ou botão "Cancelar"). */
  onClose: () => void;
}

/**
 * Dialog de confirmação para exclusão permanente de conta.
 *
 * Reutilizado pelo `Sidebar` e pelo `MobileBottomNav` (via evento
 * `open-delete-account-dialog`). O estado de abertura é controlado
 * pelo componente pai — este dialog é puramente apresentacional.
 */
export function DeleteAccountDialog({ open, onClose }: DeleteAccountDialogProps) {
  const { deleteAccount } = useAuth();
  const { t } = useLocale();

  // Texto digitado pelo usuário no campo de confirmação
  const [confirmText, setConfirmText] = useState('');
  // Flag de loading durante a requisição de exclusão
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fecha o dialog e reseta o campo de texto.
   * Bloqueado durante a exclusão para impedir perda de progresso.
   */
  const handleClose = (): void => {
    if (isDeleting) return;
    setConfirmText('');
    onClose();
  };

  /**
   * Executa a exclusão de conta se a palavra-chave estiver correta.
   * Não fecha o dialog manualmente — o AuthContext faz redirect ao concluir.
   */
  const handleConfirm = async (): Promise<void> => {
    if (confirmText !== CONFIRM_KEYWORD) return;
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (err: unknown) {
      // AuthContext já loga o erro — aqui só destravamos o estado
      log.error('Falha ao excluir conta', { err });
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isDeleting ? undefined : handleClose }
      fullWidth
      maxWidth="xs"
      aria-labelledby="delete-account-title"
      slotProps={{
        paper: { sx: { borderRadius: RADIUS_XS } },
      }}
    >
      <DialogTitle id="delete-account-title">
        {isDeleting
          ? t('studio.header.deleteAccount.dialogTitleDeleting')
          : t('studio.header.deleteAccount.dialogTitle')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          {t('studio.header.deleteAccount.dialogDescription')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <span dangerouslySetInnerHTML={{ __html: t('studio.header.deleteAccount.dialogConfirm') }} />
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="EXCLUIR"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={isDeleting}
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="inherit" disabled={isDeleting}>
          {t('studio.header.deleteAccount.dialogCancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={confirmText !== CONFIRM_KEYWORD || isDeleting }
        >
          {isDeleting
            ? t('studio.header.deleteAccount.dialogDeleting')
            : t('studio.header.deleteAccount.dialogDelete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
