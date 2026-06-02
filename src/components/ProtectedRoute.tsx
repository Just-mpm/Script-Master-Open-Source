import { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification } from '../lib/firebase';
import type { User } from '../lib/firebase';
import { authActionCodeSettings } from '../lib/auth-action-settings';
import { createLogger } from '../lib/logger';
import { useLocale } from '../features/i18n';

const log = createLogger('ProtectedRoute');
const EMAIL_VERIFICATION_POLL_MS = 5000;

function requiresVerifiedPasswordEmail(user: User): boolean {
  return user.providerData.every((provider) => provider.providerId === 'password') && !user.emailVerified;
}

export function ProtectedRoute() {
  const { user, loading, logout } = useAuth();
  const { t } = useLocale();
  const [isResending, setIsResending] = useState(false);
  const [isRefreshingVerification, setIsRefreshingVerification] = useState(false);
  const [isLeavingToLogin, setIsLeavingToLogin] = useState(false);
  const [resendStatus, setResendStatus] = useState<'success' | 'error' | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResendEmail = useCallback(async () => {
    if (!user) return;
    setIsResending(true);
    setResendStatus(null);
    setResendMessage(null);
    try {
      await sendEmailVerification(user, authActionCodeSettings);
      setResendStatus('success');
      setResendMessage(t('auth.verification.resendSuccess'));
    } catch (err) {
      log.warn('Falha ao reenviar email de verificação', { error: err });
      setResendStatus('error');
      setResendMessage(t('auth.verification.resendError'));
    } finally {
      setIsResending(false);
    }
  }, [user, t]);

  const handleRefreshVerification = useCallback(async () => {
    if (!user || !requiresVerifiedPasswordEmail(user)) return;
    setIsRefreshingVerification(true);
    try {
      await user.reload();
    } catch (err) {
      log.warn('Falha ao atualizar status de verificação do email', { error: err });
    } finally {
      setIsRefreshingVerification(false);
    }
  }, [user]);

  const handleBackToLogin = useCallback(async () => {
    setIsLeavingToLogin(true);
    try {
      await logout();
    } catch {
      setIsLeavingToLogin(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!user || !requiresVerifiedPasswordEmail(user)) return undefined;

    const refreshIfVisible = () => {
      if (!document.hidden) {
        void handleRefreshVerification();
      }
    };

    const intervalId = window.setInterval(refreshIfVisible, EMAIL_VERIFICATION_POLL_MS);
    const handleWindowFocus = () => {
      void handleRefreshVerification();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void handleRefreshVerification();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleRefreshVerification, user]);

  // Aguardando verificação de sessão do Firebase
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }} role="status" aria-live="polite">
          <CircularProgress size={28} aria-label={t('auth.verification.verifyingSession')} />
          <Typography variant="body2" color="text.secondary">
            {t('auth.verification.verifyingSession')}
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Usuário não autenticado — redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Login por email/senha sem verificação — bloqueia acesso ao app
  if (requiresVerifiedPasswordEmail(user)) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
        <Stack spacing={3} sx={{ alignItems: 'center', maxWidth: 400, textAlign: 'center' }}>
          <EmailOutlined sx={{ fontSize: 48, color: 'primary.main' }} aria-hidden="true" />
          <Typography variant="h6">{t('auth.verification.verifyEmailTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('auth.verification.verifyEmailDesc')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('auth.verification.verifyEmailHint')}
          </Typography>
          <Button
            variant="contained"
            size="small"
            disabled={isRefreshingVerification}
            onClick={() => { void handleRefreshVerification(); }}
          >
            {isRefreshingVerification
              ? t('auth.verification.refreshingStatus')
              : t('auth.verification.refreshStatusBtn')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={isResending}
            onClick={() => { void handleResendEmail(); }}
          >
            {isResending ? t('auth.verification.resending') : t('auth.verification.resendBtn')}
          </Button>
          {resendMessage && (
            <Typography variant="caption" color={resendStatus === 'success' ? 'success.main' : 'error.main'}>
              {resendMessage}
            </Typography>
          )}
          <Button
            variant="outlined"
            disabled={isLeavingToLogin}
            onClick={() => { void handleBackToLogin(); }}
          >
            {t('auth.verification.backToLogin')}
          </Button>
        </Stack>
      </Box>
    );
  }

  // Usuário autenticado — renderiza a rota filha
  return <Outlet />;
}
