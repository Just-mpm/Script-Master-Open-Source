// ---------------------------------------------------------------------------
// CreditBlockedMessage — exibido quando o usuário fica sem créditos
// ---------------------------------------------------------------------------
//
// Mensagem amigável informando que os créditos do mês acabaram e orientando
// o usuário sobre renovação automática e bônus por feedback.
// ---------------------------------------------------------------------------

import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../features/i18n/context';
import { StackedHeader } from './ui';

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
    <StackedHeader
      variant="alert"
      severity="warning"
      alertVariant="outlined"
      title={t('credits.blocked.title')}
      titleVariant="alertTitle"
      description={t('credits.blocked.description')}
      action={
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={() => navigate('/precos')}
        >
          {t('credits.blocked.cta')}
        </Button>
      }
      actionPlacement="stack"
      actionAlign="start"
      slotProps={{
        root: {
          sx: {
            borderColor: 'warning.main',
            backgroundColor: 'rgba(255, 167, 38, 0.08)',
          },
        },
      }}
    />
  );
}
