/**
 * FeedbackFab — Floating Action Button para abrir o FeedbackDialog.
 *
 * Aparece no canto inferior direito de rotas `/app/*` quando o usuário:
 * - Está autenticado
 * - AINDA NÃO recebeu o bônus de 250 créditos (`!feedbackBonusGranted`)
 * - Não tem créditos ilimitados
 *
 * Posicionamento:
 * - Desktop: bottom: 24px, right: 24px
 * - Mobile: bottom: 80px (acima do MobileBottomNav de 56px), right: 16px
 * - z-index: 1250 (entre MobileBottomNav 1200 e ActionBar 1400)
 *
 * É ocultado em:
 * - `/app/estudio` e `/app/video` (ActionBar já toma o bottom)
 * - `/onboarding` (rota dedicada sem COEP)
 *
 * Inclui badge pulsante "+250" para chamar atenção (mesmo padrão visual do
 * ScrollToBottomFab quando há streaming), mas com a cor laranja (secondary)
 * para alinhar com o conceito de "bônus".
 */
import { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { alpha, keyframes } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../hooks/useCredits';
import { useLocale } from '../../features/i18n';
import { useFeedbackDialog } from './useFeedbackDialog';
import {
  FEEDBACK_BONUS_DISPLAY,
  FEEDBACK_FAB_Z_INDEX,
} from './constants';
import { BRAND_SECONDARY, SHADOW_DEEP } from '../../theme/tokens';

/** Animação de pulse para o badge (consistente com ScrollToBottomFab) */
const pulseAnimation = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
`;

/** Animação de entrada do FAB (fade + slide up) */
const fadeInUp = keyframes`
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

/** Rotas onde o FAB deve ser ocultado (ActionBar/UX local) */
const HIDDEN_ROUTES = ['/app/estudio', '/app/video', '/onboarding'] as const;

/**
 * FAB para abrir o FeedbackDialog. Auto-gerencia visibilidade baseada em
 * autenticação, status do bônus e rota atual.
 */
export function FeedbackFab() {
  const { user } = useAuth();
  const { feedbackBonusGranted, unlimitedCredits } = useCredits();
  const { t } = useLocale();
  const location = useLocation();
  const openFeedback = useFeedbackDialog();

  const shouldShow = useMemo(() => {
    if (!user) return false;
    if (unlimitedCredits) return false;
    if (feedbackBonusGranted) return false;
    if (HIDDEN_ROUTES.some((route) => location.pathname.startsWith(route))) return false;
    return true;
  }, [user, unlimitedCredits, feedbackBonusGranted, location.pathname]);

  const handleClick = useCallback(() => {
    openFeedback(location.pathname);
  }, [openFeedback, location.pathname]);

  if (!shouldShow) return null;

  return (
    <Box
      sx={(theme) => ({
        position: 'fixed',
        // Acima do MobileBottomNav (56px) com margem confortável
        bottom: { xs: `calc(56px + ${theme.spacing(3)})`, md: theme.spacing(3) },
        right: { xs: theme.spacing(2), md: theme.spacing(3) },
        zIndex: FEEDBACK_FAB_Z_INDEX,
        // Garante que toque target fica acima de outros elementos
        pointerEvents: 'auto',
        // Animação de entrada/saída suave quando shouldShow muda
        animation: `${fadeInUp} 300ms ease-out`,
      })}
    >
      <Tooltip title={t('feedback.fab.tooltip')} placement="left" arrow>
        <Fab
          size="medium"
          color="secondary"
          onClick={handleClick}
          aria-label={t('feedback.fab.tooltip')}
          sx={{
            boxShadow: `0 8px 24px ${alpha(BRAND_SECONDARY, 0.4)}, 0 2px 8px ${alpha(SHADOW_DEEP, 0.3)}`,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: `0 12px 32px ${alpha(BRAND_SECONDARY, 0.5)}, 0 4px 12px ${alpha(SHADOW_DEEP, 0.4)}`,
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
        >
          <RateReviewIcon sx={{ fontSize: 24 }} />

          {/* Badge "+250" — canto superior direito */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 32,
              height: 22,
              px: 0.75,
              borderRadius: '11px',
              backgroundColor: 'background.paper',
              color: BRAND_SECONDARY,
              border: `1.5px solid ${BRAND_SECONDARY}`,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px ${alpha(SHADOW_DEEP, 0.4)}`,
              animation: `${pulseAnimation} 1.8s ease-in-out infinite`,
              pointerEvents: 'none',
            }}
          >
            {`+${FEEDBACK_BONUS_DISPLAY}`}
          </Box>
        </Fab>
      </Tooltip>
    </Box>
  );
}
