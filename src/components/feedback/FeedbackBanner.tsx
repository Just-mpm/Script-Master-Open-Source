/**
 * FeedbackBanner — banner inline para destacar o bônus de feedback.
 *
 * Renderizado dentro do Assistant (acima das mensagens), aparece enquanto
 * o usuário NÃO tiver recebido o bônus de 250 créditos. Some automaticamente
 * quando `feedbackBonusGranted === true` (via listener do useCredits).
 *
 * Visual: Alert severity="success" com ícone `RateReview` e botão de ação.
 * Cor de destaque: secondary (laranja) para alinhar com o conceito de bônus.
 */
import { useCallback } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../hooks/useCredits';
import { useLocale } from '../../features/i18n';
import { useFeedbackDialog } from './useFeedbackDialog';
import { BRAND_SECONDARY, BRAND_SECONDARY_GLOW_SOFT } from '../../theme/tokens';

export interface FeedbackBannerProps {
  /** Contexto da tela atual (default: "/app/assistente") */
  screenContext?: string;
}

/**
 * Banner de feedback para o topo do Assistant.
 * Aparece condicionalmente baseado em auth + bônus não concedido.
 */
export function FeedbackBanner({ screenContext = '/app/assistente' }: FeedbackBannerProps) {
  const { user } = useAuth();
  const { feedbackBonusGranted, unlimitedCredits } = useCredits();
  const { t } = useLocale();
  const openFeedback = useFeedbackDialog();

  const handleClick = useCallback(() => {
    openFeedback(screenContext);
  }, [openFeedback, screenContext]);

  // Só mostra se: autenticado + sem bônus + sem créditos ilimitados
  if (!user || feedbackBonusGranted || unlimitedCredits) return null;

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pt: 1.5 }}>
      <Alert
        severity="success"
        icon={<RateReviewIcon fontSize="small" />}
        action={
          <Button
            color="secondary"
            size="small"
            variant="contained"
            onClick={handleClick}
            sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {t('feedback.banner.cta')}
          </Button>
        }
        sx={{
          borderRadius: 2,
          borderColor: alpha(BRAND_SECONDARY, 0.32),
          backgroundColor: alpha(BRAND_SECONDARY, 0.08),
          backgroundImage: 'none',
          boxShadow: `0 0 0 1px ${BRAND_SECONDARY_GLOW_SOFT}`,
          '& .MuiAlert-icon': { color: BRAND_SECONDARY },
          alignItems: 'center',
        }}
      >
        <Box>
          <Box sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3 }}>
            {t('feedback.banner.title')}
          </Box>
          <Box sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.4, mt: 0.25 }}>
            {t('feedback.banner.description')}
          </Box>
        </Box>
      </Alert>
    </Box>
  );
}
