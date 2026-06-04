/**
 * FeedbackDialog — dialog modal reutilizável para envio de feedback.
 *
 * Renderizado globalmente pelo FeedbackController. Pode ser aberto de
 * qualquer lugar da app via `useFeedbackDialog()` (que dispara o evento
 * customizado `OPEN_FEEDBACK_DIALOG_EVENT`).
 *
 * Após envio bem-sucedido, mostra confirmação dentro do próprio dialog
 * por 2.5s e fecha automaticamente. O bônus de 250 créditos já é refletido
 * no CreditIndicator do Header via refresh automático do useCreditsStore.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SendIcon from '@mui/icons-material/Send';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useLocale } from '../../features/i18n';
import { FeedbackFormFields, type FeedbackSubmitResult } from './FeedbackFormFields';
import { BRAND_SECONDARY, BRAND_SECONDARY_GLOW_SOFT, RADIUS_XS, BLACK_32 } from '../../theme/tokens';

export interface FeedbackDialogProps {
  /** Se o dialog está aberto */
  open: boolean;
  /** Callback ao fechar (após submit, X, ESC ou click-outside) */
  onClose: () => void;
  /** Contexto da tela atual pré-preenchido (ex: "/app/estudio") */
  defaultScreenContext?: string;
}

/**
 * Dialog de feedback reutilizável.
 * Mostra form enquanto `!submitted`, depois mostra confirmação com o resultado.
 */
export function FeedbackDialog({ open, onClose, defaultScreenContext }: FeedbackDialogProps) {
  const { t } = useLocale();
  const [submitted, setSubmitted] = useState<FeedbackSubmitResult | null>(null);

  // Ref para guardar o ID do timeout e cancelar no cleanup (evita memory leak)
  const closeTimeoutRef = useRef<number | null>(null);

  // Cleanup do timeout ao desmontar ou quando onClose muda
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSubmitted = useCallback((result: FeedbackSubmitResult) => {
    setSubmitted(result);
    // Fecha automaticamente após 2.5s para dar tempo do usuário ler
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      setSubmitted(null);
      onClose();
    }, 2500);
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setSubmitted(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="feedback-dialog-title"
      aria-describedby="feedback-dialog-description"
      slotProps={{
        paper: {
          sx: (theme) => ({
            borderRadius: RADIUS_XS,
            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)}, ${alpha(theme.palette.background.paper, 0.92)})`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(BRAND_SECONDARY, 0.24)}`,
            boxShadow: `0 24px 64px ${BLACK_32}, 0 0 0 1px ${BRAND_SECONDARY_GLOW_SOFT}`,
          }),
        },
      }}
    >
      <DialogTitle id="feedback-dialog-title" sx={{ pb: 0.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '12px',
              backgroundColor: alpha(BRAND_SECONDARY, 0.12),
              color: BRAND_SECONDARY,
            }}
          >
            <RateReviewIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, display: 'block' }}>
              {t('feedback.dialog.title')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('feedback.dialog.subtitle')}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {submitted ? (
          <Stack spacing={2} sx={{ alignItems: 'center', py: 3 }}>
            <Alert
              severity="success"
              variant="outlined"
              icon={<SendIcon />}
              sx={{
                width: '100%',
                borderColor: alpha(BRAND_SECONDARY, 0.4),
                '& .MuiAlert-icon': { color: BRAND_SECONDARY },
              }}
            >
              {submitted.bonusGranted
                ? t('feedback.dialog.successWithBonus')
                : t('feedback.dialog.successNoBonus')}
            </Alert>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t('feedback.dialog.closingHint')}
            </Typography>
          </Stack>
        ) : (
          <>
            <Typography
              id="feedback-dialog-description"
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2.5, lineHeight: 1.6 }}
            >
              {t('feedback.dialog.description')}
            </Typography>
            <FeedbackFormFields
              defaultScreenContext={defaultScreenContext}
              onSubmitted={handleSubmitted}
              maxWidth="100%"
            />
          </>
        )}
      </DialogContent>

      {!submitted ? (
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={handleClose}>
            {t('feedback.dialog.cancel')}
          </Button>
        </DialogActions>
      ) : null }
    </Dialog>
  );
}
