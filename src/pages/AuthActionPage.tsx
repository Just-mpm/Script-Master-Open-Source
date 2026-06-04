import { useEffect, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  auth,
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type ActionCodeInfo,
} from '../lib/firebase';
import { createLogger } from '../lib/logger';
import { DocumentHead } from '../components/DocumentHead';
import { getPageSeo } from '../lib/seo';
import { useLocale } from '../features/i18n';
import logos from '../assets/logos';
import {
  APP_BACKGROUND_GLOW,
  BRAND_PRIMARY_GLOW,
  EMPTY_ICON_SIZE,
  GAP_RELAXED,
  SUCCESS_MAIN,
  TEXT_SECONDARY, BRAND_PRIMARY_GLOW_SOFT } from '../theme/tokens';
import { authTextFieldSx } from '../theme/authStyles';
import { glassPanelSx } from '../theme/surfaces';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';

const log = createLogger('AuthAction');

// ─── Mapeamento de error codes do Firebase → chaves i18n ─────────────────

const ACTION_CODE_ERRORS: Record<string, string> = {
  'auth/expired-action-code': 'authAction.error.expired',
  'auth/invalid-action-code': 'authAction.error.invalid',
  'auth/user-disabled': 'authAction.error.userDisabled',
  'auth/user-not-found': 'authAction.error.userNotFound',
  'auth/network-request-failed': 'authAction.error.network',
  'auth/weak-password': 'authAction.error.weakPassword',
  'auth/too-many-requests': 'authAction.error.tooManyRequests',
};

/** Extrai a chave i18n de um erro Firebase ou retorna fallback genérico */
function getActionErrorCode(err: unknown): string {
  if (err instanceof Error && 'code' in err) {
    const code = (err as { code: string }).code;
    return ACTION_CODE_ERRORS[code] ?? 'authAction.error.generic';
  }
  return 'authAction.error.generic';
}

// ─── Types de estado ──────────────────────────────────────────────────────

type VerifyState = 'loading' | 'success' | 'error';
type ResetState = 'verifying' | 'form' | 'success' | 'error';
type RecoverState = 'loading' | 'confirm' | 'success' | 'error';

// ─── Constantes de animação Motion ────────────────────────────────────────

const FADE_TRANSITION = { duration: 0.3 };

const STATE_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
} as const;

// ─── Hover premium para botão contained (mesmo padrão LoginPage) ────────

const CONTAINED_BUTTON_SX = {
  py: 1.5,
  mt: 0.5,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover:not(.Mui-disabled)': {
    transform: 'translateY(-1px)',
    boxShadow: `0 20px 48px ${BRAND_PRIMARY_GLOW}, 0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
  },
  '&:active:not(.Mui-disabled)': {
    transform: 'translateY(0)',
  },
} as const;

const OUTLINED_BUTTON_SX = {
  py: 1.25,
  borderWidth: 1.5,
  transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover:not(.Mui-disabled)': {
    borderWidth: 2,
    boxShadow: '0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}',
  },
  '&:active:not(.Mui-disabled)': {
    transform: 'scale(0.98)',
  },
} as const;

// ─── Componente principal ─────────────────────────────────────────────────

export function AuthActionPage() {
  const [searchParams] = useSearchParams();
  const { t, locale } = useLocale();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const seo = getPageSeo({
    title: t('authAction.seoTitle'),
    description: t('authAction.seoDesc'),
    path: '/auth/action',
    locale,
  });

  // Redireciona se não tiver parâmetros válidos
  if (!mode || !oobCode) {
    log.warn('Parâmetros mode/oobCode ausentes na URL');
    return <Navigate to="/login" replace />;
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: APP_BACKGROUND_GLOW }}>
      <DocumentHead {...seo} locale={locale} />
      <PublicHeader />

      <Box
        sx={{
          flex: 1,
          display: 'grid',
          placeItems: 'center',
          p: { xs: 3, sm: 4 },
          py: { xs: 8, md: 12 },
        }}
      >
        <Box sx={{ maxWidth: 480, width: '100%' }}>
          <Paper
            variant="outlined"
            sx={(theme) => ({
              ...glassPanelSx(theme),
              p: { xs: 3, sm: 5 },
              textAlign: 'center',
              mx: 'auto',
              width: '100%',
            })}
          >
            <Stack spacing={GAP_RELAXED} sx={{ alignItems: 'center' }}>
              {/* Brand logo — mesmo padrão LoginPage */}
              <Box
                component="img"
                src={logos.mark.round}
                alt={t('nav.logoAlt')}
                sx={{
                  width: EMPTY_ICON_SIZE * 2,
                  height: EMPTY_ICON_SIZE * 2,
                  objectFit: 'contain',
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.04)' },
                }}
              />

              <Divider sx={{ width: '100%', my: 0.5 }} />

              {/* Conteúdo dinâmico por mode */}
              {mode === 'verifyEmail' && <VerifyEmailView oobCode={oobCode} t={t} />}
              {mode === 'resetPassword' && <ResetPasswordView oobCode={oobCode} t={t} />}
              {mode === 'recoverEmail' && <RecoverEmailView oobCode={oobCode} t={t} />}
              {mode !== 'verifyEmail' && mode !== 'resetPassword' && mode !== 'recoverEmail' && (
                <Navigate to="/login" replace />
              )}
            </Stack>
          </Paper>
        </Box>
      </Box>

      <PublicFooter />
    </Box>
  );
}

// ─── Função auxiliar: mascara email ────────────────────────────────────────

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visiblePart = user.slice(0, 2);
  return `${visiblePart}***@${domain}`;
}

// ─── Loading centralizado ─────────────────────────────────────────────────

interface LoadingStateProps {
  t: (key: string) => string;
}

function LoadingState({ t }: LoadingStateProps) {
  return (
    <Stack spacing={GAP_RELAXED} sx={{ alignItems: 'center', py: 4 }}>
      <CircularProgress size={40} />
      <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
        {t('authAction.loading')}
      </Typography>
    </Stack>
  );
}

// ─── Card de resultado reutilizável (sucesso ou erro) ─────────────────────

interface ResultStateProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  /** 'contained' (default) ou 'outlined' para estados de erro */
  buttonVariant?: 'contained' | 'outlined';
}

function ResultState({
  icon,
  iconColor,
  title,
  description,
  buttonLabel,
  buttonHref,
  buttonVariant = 'contained',
}: ResultStateProps) {
  return (
    <Stack spacing={GAP_RELAXED} sx={{ alignItems: 'center' }}>
      <Box sx={{ color: iconColor }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Box>
      <Button
        variant={buttonVariant}
        href={buttonHref}
        size="large"
        sx={{ mt: 1, minWidth: 200, ...(buttonVariant === 'contained' ? CONTAINED_BUTTON_SX : OUTLINED_BUTTON_SX) }}
      >
        {buttonLabel}
      </Button>
    </Stack>
  );
}

// ─── Motion wrapper para states com AnimatePresence ───────────────────────

interface MotionWrapperProps {
  children: React.ReactNode;
  stateKey: string;
}

function MotionWrapper({ children, stateKey }: MotionWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stateKey}
        initial={STATE_VARIANTS.initial}
        animate={STATE_VARIANTS.animate}
        exit={STATE_VARIANTS.exit}
        transition={FADE_TRANSITION}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── VerifyEmailView ──────────────────────────────────────────────────────

interface VerifyEmailViewProps {
  oobCode: string;
  t: (key: string) => string;
}

function VerifyEmailView({ oobCode, t }: VerifyEmailViewProps) {
  const [state, setState] = useState<VerifyState>('loading');
  const [errorKey, setErrorKey] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        await applyActionCode(auth, oobCode);
        if (!cancelled) {
          log.info('Email verificado com sucesso');
          setState('success');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const key = getActionErrorCode(err);
          log.error('Erro ao verificar email', { error: key });
          setErrorKey(key);
          setState('error');
        }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [oobCode]);

  if (state === 'loading') {
    return <MotionWrapper stateKey="loading"><LoadingState t={t} /></MotionWrapper>;
  }

  if (state === 'success') {
    return (
      <MotionWrapper stateKey="success">
        <ResultState
          icon={<CheckCircleOutlineRounded sx={{ fontSize: 48 }} />}
          iconColor={SUCCESS_MAIN}
          title={t('authAction.verifyEmail.successTitle')}
          description={t('authAction.verifyEmail.successDesc')}
          buttonLabel={t('authAction.verifyEmail.loginBtn')}
          buttonHref="/login?verified=true"
        />
      </MotionWrapper>
    );
  }

  return (
    <MotionWrapper stateKey="error">
      <ResultState
        icon={<ErrorOutlineRounded sx={{ fontSize: 48 }} />}
        iconColor="error.main"
        title={t('authAction.verifyEmail.errorTitle')}
        description={errorKey ? t(errorKey) : t('authAction.error.generic')}
        buttonLabel={t('authAction.verifyEmail.backToLogin')}
        buttonHref="/login"
        buttonVariant="outlined"
      />
    </MotionWrapper>
  );
}

// ─── ResetPasswordView ────────────────────────────────────────────────────

interface ResetPasswordViewProps {
  oobCode: string;
  t: (key: string) => string;
}

function ResetPasswordView({ oobCode, t }: ResetPasswordViewProps) {
  const [state, setState] = useState<ResetState>('verifying');
  const [email, setEmail] = useState('');
  const [errorKey, setErrorKey] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verifica o código e obtém o email do usuário
  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        if (!cancelled) {
          log.info('Código de reset válido', { email: maskEmail(userEmail) });
          setEmail(userEmail);
          setState('form');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const key = getActionErrorCode(err);
          log.error('Erro ao verificar código de reset', { error: key });
          setErrorKey(key);
          setState('error');
        }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [oobCode]);

  function validateFields(): boolean {
    const errors: Record<string, string> = {};

    if (newPassword.length < 6) {
      errors.newPassword = t('authAction.resetPassword.validation.minLength');
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = t('authAction.resetPassword.validation.mismatch');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateFields()) return;

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      log.info('Senha redefinida com sucesso');
      setState('success');
    } catch (err: unknown) {
      const key = getActionErrorCode(err);
      log.error('Erro ao redefinir senha', { error: key });
      setErrorKey(key);
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state === 'verifying') {
    return <MotionWrapper stateKey="verifying"><LoadingState t={t} /></MotionWrapper>;
  }

  if (state === 'success') {
    return (
      <MotionWrapper stateKey="success">
        <ResultState
          icon={<CheckCircleOutlineRounded sx={{ fontSize: 48 }} />}
          iconColor={SUCCESS_MAIN}
          title={t('authAction.resetPassword.successTitle')}
          description={t('authAction.resetPassword.successDesc')}
          buttonLabel={t('authAction.resetPassword.loginBtn')}
          buttonHref="/login"
        />
      </MotionWrapper>
    );
  }

  if (state === 'error') {
    return (
      <MotionWrapper stateKey="error">
        <ResultState
          icon={<ErrorOutlineRounded sx={{ fontSize: 48 }} />}
          iconColor="error.main"
          title={t('authAction.resetPassword.errorTitle')}
          description={errorKey ? t(errorKey) : t('authAction.error.generic')}
          buttonLabel={t('authAction.resetPassword.backToLogin')}
          buttonHref="/login"
          buttonVariant="outlined"
        />
      </MotionWrapper>
    );
  }

  // state === 'form'
  return (
    <MotionWrapper stateKey="form">
      <Stack spacing={GAP_RELAXED} sx={{ alignItems: 'center' }}>
        <Box sx={{ color: 'primary.main' }}>
          <EmailOutlined sx={{ fontSize: 48 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('authAction.resetPassword.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6 }}>
            {t('authAction.resetPassword.desc')}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 1, fontWeight: 600, color: 'primary.main', fontFamily: 'monospace' }}
          >
            {maskEmail(email)}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
          <Stack spacing={2}>
            <TextField
              label={t('authAction.resetPassword.newPasswordLabel')}
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              error={Boolean(fieldErrors.newPassword)}
              helperText={fieldErrors.newPassword}
              fullWidth
              required
              autoComplete="new-password"
              sx={authTextFieldSx}
            />

            <TextField
              label={t('authAction.resetPassword.confirmPasswordLabel')}
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={Boolean(fieldErrors.confirmPassword)}
              helperText={fieldErrors.confirmPassword}
              fullWidth
              required
              autoComplete="new-password"
              sx={authTextFieldSx}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined }
              sx={CONTAINED_BUTTON_SX}
            >
              {isSubmitting
                ? t('authAction.resetPassword.submittingBtn')
                : t('authAction.resetPassword.submitBtn')}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </MotionWrapper>
  );
}

// ─── RecoverEmailView ─────────────────────────────────────────────────────

interface RecoverEmailViewProps {
  oobCode: string;
  t: (key: string) => string;
}

function RecoverEmailView({ oobCode, t }: RecoverEmailViewProps) {
  const [state, setState] = useState<RecoverState>('loading');
  const [actionInfo, setActionInfo] = useState<ActionCodeInfo | null>(null);
  const [errorKey, setErrorKey] = useState<string>('');
  const [isReverting, setIsReverting] = useState(false);

  // Verifica o código e obtém info da operação
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const info = await checkActionCode(auth, oobCode);
        if (!cancelled) {
          log.info('Código de recover válido', {
            email: info.data.email ? maskEmail(info.data.email) : null,
            previousEmail: info.data.previousEmail ? maskEmail(info.data.previousEmail) : null,
          });
          setActionInfo(info);
          setState('confirm');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const key = getActionErrorCode(err);
          log.error('Erro ao verificar código de recover', { error: key });
          setErrorKey(key);
          setState('error');
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [oobCode]);

  async function handleRevert() {
    setIsReverting(true);
    try {
      await applyActionCode(auth, oobCode);
      log.info('Email revertido com sucesso');
      setState('success');
    } catch (err: unknown) {
      const key = getActionErrorCode(err);
      log.error('Erro ao reverter email', { error: key });
      setErrorKey(key);
      setState('error');
    } finally {
      setIsReverting(false);
    }
  }

  if (state === 'loading') {
    return <MotionWrapper stateKey="loading"><LoadingState t={t} /></MotionWrapper>;
  }

  if (state === 'success') {
    return (
      <MotionWrapper stateKey="success">
        <ResultState
          icon={<CheckCircleOutlineRounded sx={{ fontSize: 48 }} />}
          iconColor={SUCCESS_MAIN}
          title={t('authAction.recoverEmail.successTitle')}
          description={t('authAction.recoverEmail.successDesc')}
          buttonLabel={t('authAction.recoverEmail.loginBtn')}
          buttonHref="/login"
        />
      </MotionWrapper>
    );
  }

  if (state === 'error') {
    return (
      <MotionWrapper stateKey="error">
        <ResultState
          icon={<ErrorOutlineRounded sx={{ fontSize: 48 }} />}
          iconColor="error.main"
          title={t('authAction.recoverEmail.errorTitle')}
          description={errorKey ? t(errorKey) : t('authAction.error.generic')}
          buttonLabel={t('authAction.recoverEmail.backToLogin')}
          buttonHref="/login"
          buttonVariant="outlined"
        />
      </MotionWrapper>
    );
  }

  // state === 'confirm'
  const originalEmail = actionInfo?.data.email ?? '';
  const changedEmail = actionInfo?.data.previousEmail ?? '';

  return (
    <MotionWrapper stateKey="confirm">
      <Stack spacing={GAP_RELAXED} sx={{ alignItems: 'center' }}>
        <Box sx={{ color: 'warning.main' }}>
          <EmailOutlined sx={{ fontSize: 48 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('authAction.recoverEmail.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6 }}>
            {t('authAction.recoverEmail.desc')}
          </Typography>
        </Box>

        <Alert severity="info" variant="outlined" sx={{ width: '100%', textAlign: 'left' }}>
          <Typography variant="body2">
            {changedEmail && (
              <>
                <strong>{t('authAction.recoverEmail.fromLabel')}</strong>{' '}
                <Box component="span" sx={{ fontFamily: 'monospace' }}>{maskEmail(changedEmail)}</Box>
                <br />
              </>
            )}
            <strong>{t('authAction.recoverEmail.toLabel')}</strong>{' '}
            <Box component="span" sx={{ fontFamily: 'monospace' }}>{maskEmail(originalEmail)}</Box>
          </Typography>
        </Alert>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%', mt: 1 }}>
          <Button
            variant="outlined"
            href="/login"
            size="large"
            disabled={isReverting}
            sx={{ flex: 1, ...OUTLINED_BUTTON_SX }}
          >
            {t('authAction.recoverEmail.cancelBtn')}
          </Button>
          <Button
            variant="contained"
            onClick={handleRevert}
            size="large"
            disabled={isReverting}
            startIcon={isReverting ? <CircularProgress size={18} color="inherit" /> : undefined }
            sx={{ flex: 1, ...CONTAINED_BUTTON_SX }}
          >
            {isReverting
              ? t('authAction.recoverEmail.revertingBtn')
              : t('authAction.recoverEmail.confirmBtn')}
          </Button>
        </Stack>
      </Stack>
    </MotionWrapper>
  );
}
