/**
 * FeedbackFab — Floating Action Button para abrir o FeedbackDialog.
 *
 * Aparece no canto inferior direito de rotas `/app/*` quando o usuário
 * está autenticado.
 *
 * Posicionamento:
 * - Desktop: bottom: 24px, right: 24px
 * - Mobile: bottom: 80px (acima do MobileBottomNav de 56px), right: 16px
 * - z-index: 1250 (entre MobileBottomNav 1200 e ActionBar 1400)
 *
 * É ocultado em:
 * - `/app/estudio` e `/app/video` (ActionBar já toma o bottom)
 * - `/onboarding` (rota dedicada sem COEP)
 */
import { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { keyframes } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../features/i18n';
import { useFeedbackDialog } from './useFeedbackDialog';
import {
  FEEDBACK_FAB_Z_INDEX,
} from './constants';

/** Animação de entrada do FAB (fade + slide up) */
const fadeInUp = keyframes`
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

/** Rotas onde o FAB deve ser ocultado (ActionBar/UX local) */
const HIDDEN_ROUTES = ['/app/estudio', '/app/video', '/onboarding'] as const;

/**
 * FAB para abrir o FeedbackDialog. Auto-gerencia visibilidade baseada em
 * autenticação e rota atual.
 */
export function FeedbackFab() {
  const { user } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const openFeedback = useFeedbackDialog();

  const shouldShow = useMemo(() => {
    if (!user) return false;
    if (HIDDEN_ROUTES.some((route) => location.pathname.startsWith(route))) return false;
    return true;
  }, [user, location.pathname]);

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
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
        >
          <RateReviewIcon sx={{ fontSize: 24 }} />
        </Fab>
      </Tooltip>
    </Box>
  );
}
