// ---------------------------------------------------------------------------
// CreditBlockedMessage — exibido quando o usuário fica sem créditos
// ---------------------------------------------------------------------------
//
// Mensagem amigável informando que os créditos do mês acabaram e orientando
// o usuário sobre renovação automática e bônus por feedback.
// ---------------------------------------------------------------------------

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../features/i18n/context';

export interface CreditBlockedMessageProps {
  /** Se true, renderiza como um Alert inline. Se false, não renderiza nada. */
  show: boolean;
}

/** Mensagem exibida quando o usuário fica sem créditos no mês */
export function CreditBlockedMessage({ show }: CreditBlockedMessageProps) {
  const navigate = useNavigate();
  const { t } = useLocale();

  if (!show) return null;

  return (
    <Alert
      severity="warning"
      variant="outlined"
      sx={{
        borderColor: 'warning.main',
        backgroundColor: 'rgba(255, 167, 38, 0.08)',
      }}
    >
      <AlertTitle>{t('credits.blocked.title')}</AlertTitle>
      <Stack spacing={1}>
        <span>{t('credits.blocked.description')}</span>
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={() => navigate('/precos')}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('credits.blocked.cta')}
        </Button>
      </Stack>
    </Alert>
  );
}
