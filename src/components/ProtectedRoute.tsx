import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification } from '../lib/firebase';
import { createLogger } from '../lib/logger';
import { useLocale } from '../features/i18n';

const log = createLogger('ProtectedRoute');

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'success' | 'error' | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResendEmail = useCallback(async () => {
    if (!user) return;
    setIsResending(true);
    setResendStatus(null);
    setResendMessage(null);
    try {
      await sendEmailVerification(user);
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
  if (user.providerData.every((p) => p.providerId === 'password') && !user.emailVerified) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
        <Stack spacing={3} sx={{ alignItems: 'center', maxWidth: 400, textAlign: 'center' }}>
          <EmailOutlined sx={{ fontSize: 48, color: 'primary.main' }} aria-hidden="true" />
          <Typography variant="h6">{t('auth.verification.verifyEmailTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('auth.verification.verifyEmailDesc')}
          </Typography>
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
          <Button variant="outlined" onClick={() => { window.location.href = '/login'; }}>
            {t('auth.verification.backToLogin')}
          </Button>
        </Stack>
      </Box>
    );
  }

  // Usuário autenticado — renderiza a rota filha
  return <Outlet />;
}
