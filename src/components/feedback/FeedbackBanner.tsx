/**
 * FeedbackBanner — banner inline para destacar o bônus de feedback.
 *
 * Renderizado dentro do Assistant (acima das mensagens), aparece enquanto
 * o usuário NÃO tiver recebido o bônus de 250 créditos. Some automaticamente
 * quando `feedbackBonusGranted === true` (via listener do useCredits).
 *
 * Visual: StackedHeader variant="alert" severity="success" com ícone
 * `RateReview` e botão de ação. Cor de destaque: secondary (laranja) para
 * alinhar com o conceito de bônus.
 */
import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../hooks/useCredits';
import { useLocale } from '../../features/i18n';
import { useFeedbackDialog } from './useFeedbackDialog';
import { StackedHeader } from '../ui';
import { BRAND_SECONDARY, BRAND_SECONDARY_GLOW_SOFT, RADIUS_XS } from '../../theme/tokens';

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
  const { feedbackBonusGranted, feedbackPromoSeen, unlimitedCredits } = useCredits();
  const { t } = useLocale();
  const openFeedback = useFeedbackDialog();

  const handleClick = useCallback(() => {
    openFeedback(screenContext);
  }, [openFeedback, screenContext]);

  // Só mostra se: autenticado + sem bônus + sem créditos ilimitados + já zerou créditos (promo seen)
  if (!user || feedbackBonusGranted || unlimitedCredits || !feedbackPromoSeen) return null;

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pt: 1.5 }}>
      <StackedHeader
        variant="alert"
        severity="success"
        icon={<RateReviewIcon fontSize="small" />}
        title={t('feedback.banner.title')}
        description={t('feedback.banner.description')}
        titleVariant="subtitle2"
        descriptionVariant="caption"
        action={
          <Button
            color="secondary"
            size="small"
            variant="contained"
            onClick={handleClick}
            sx={{ fontWeight: 600 }}
          >
            {t('feedback.banner.cta')}
          </Button>
        }
        actionPlacement="stack"
        actionAlign="end"
        slotProps={{
          root: {
            sx: {
              borderRadius: RADIUS_XS,
              borderColor: `${BRAND_SECONDARY}52`,
              backgroundColor: `${BRAND_SECONDARY}14`,
              boxShadow: `0 0 0 1px ${BRAND_SECONDARY_GLOW_SOFT}`,
              '& .MuiAlert-icon': { color: BRAND_SECONDARY },
            },
          },
        }}
      />
    </Box>
  );
}
