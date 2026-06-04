import { type FormEvent, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Google from '@mui/icons-material/Google';
import { DocumentHead } from '../components/DocumentHead';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPageSeo } from '../lib/seo';
import { getLocalizedAuthBenefits } from '../data/authBenefits';
import { useLocale } from '../features/i18n';
import logos from '../assets/logos';
import {
  EMPTY_ICON_SIZE,
  ICON_SIZE_LG,
  APP_BACKGROUND_GLOW,
  BRAND_PRIMARY_GLOW,
  GAP_RELAXED,
  TEXT_SECONDARY,
  BRAND_PRIMARY_GLOW_SOFT,
} from '../theme/tokens';
import { authTextFieldSx, authLinkSx } from '../theme/authStyles';
import { glassPanelSx } from '../theme/surfaces';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';

export function RegisterPage() {
  const { login, signup, authError, clearAuthError } = useAuth();
  const { t, locale } = useLocale();
  const authBenefits = getLocalizedAuthBenefits(locale);

  const seo = getPageSeo({
    title: t('auth.register.seoTitle'),
    description: t('auth.register.seoDesc'),
    path: '/cadastro',
    locale,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateFields(): boolean {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = t('auth.register.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('auth.register.validation.emailInvalid');
    }

    if (!password) {
      errors.password = t('auth.register.validation.passwordRequired');
    } else if (password.length < 6) {
      errors.password = t('auth.register.validation.passwordMinLength');
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('auth.register.validation.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('auth.register.validation.passwordsMismatch');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearAuthError();

    if (!validateFields()) return;

    setIsSubmitting(true);
    try {
      await signup(email, password);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: APP_BACKGROUND_GLOW }}>
      <DocumentHead {...seo} locale={locale} />

      <PublicHeader />

      {/* Landmark main fica em App.tsx — este Box é apenas container de conteúdo */}
      <Box
        tabIndex={-1 }
        sx={{
          flex: 1,
          display: 'grid',
          placeItems: 'center',
          p: { xs: 3, sm: 4 },
          py: { xs: 8, md: 12 },
        }}
      >
        <Box sx={{ maxWidth: 960, width: '100%' }}>
          <Grid container spacing={4} sx={{ alignItems: 'center' }}>
            {/* Coluna esquerda — beneficios */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                  <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
                    {t('auth.login.benefitsTitle')}
                  </Typography>
                  <Typography variant="body1" sx={{ color: TEXT_SECONDARY }}>
                    {t('auth.login.benefitsDesc')}
                  </Typography>
                </Box>

                <Stack spacing={2.5}>
                  {authBenefits.map((benefit) => {
                    const BenefitIcon = benefit.icon;
                    return (
                      <Stack key={benefit.title} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2.5,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'action.hover',
                            color: 'primary.main',
                            flexShrink: 0,
                            border: '1px solid ${WHITE_06}',
                            transition: 'background-color 0.2s ease, transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                            '&:hover': {
                              bgcolor: 'action.selected',
                              borderColor: 'rgba(46, 117, 182, 0.2)',
                              boxShadow: '0 0 0 3px rgba(46, 117, 182, 0.08)',
                              transform: 'scale(1.06)',
                            },
                          }}
                        >
                          <BenefitIcon sx={{ fontSize: ICON_SIZE_LG }} aria-hidden="true" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" component="div">{benefit.title}</Typography>
                          <Typography variant="caption" sx={{ color: TEXT_SECONDARY, lineHeight: 1.5 }}>
                            {benefit.description}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            </Grid>

            {/* Coluna direita — card de cadastro */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={(theme) => ({
                  ...glassPanelSx(theme),
                  p: { xs: 4, sm: 5 },
                  textAlign: 'center',
                  mx: 'auto',
                  maxWidth: 420,
                })}
              >
                <Stack spacing={GAP_RELAXED} sx={{ alignItems: 'center' }}>
                  {/* Brand logo */}
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

                  <Box>
                    <Typography variant="h5" component="h2" sx={{ letterSpacing: '-0.02em' }}>
                      {t('auth.register.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('auth.register.subtitle')}
                    </Typography>
                  </Box>

                  <Divider sx={{ width: '100%', my: 0.5 }} />

                  {authError && (
                    <Alert severity="error" variant="filled" sx={{ width: '100%' }}>
                      {authError}
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    startIcon={<Google sx={{ fontSize: ICON_SIZE_LG }} />}
                    onClick={login}
                    sx={{
                      py: 1.5,
                      mt: 0.5,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: `0 20px 48px ${BRAND_PRIMARY_GLOW}, 0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                    }}
                  >
                    {t('auth.register.googleBtn')}
                  </Button>

                  <Divider sx={{ width: '100%' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1.5,
                        color: 'text.disabled',
                        letterSpacing: '0.04em',
                        fontWeight: 500,
                      }}
                    >
                      {t('auth.register.orSeparator')}
                    </Typography>
                  </Divider>

                  {/* Formulario email/senha */}
                  <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
                    <Stack spacing={2}>
                      <TextField
                        label={t('auth.register.emailLabel')}
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })); }}
                        error={Boolean(fieldErrors.email)}
                        helperText={fieldErrors.email}
                        fullWidth
                        required
                        autoComplete="email"
                        autoFocus
                        sx={authTextFieldSx}
                      />

                      <TextField
                        label={t('auth.register.passwordLabel')}
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })); }}
                        error={Boolean(fieldErrors.password)}
                        helperText={fieldErrors.password || t('auth.register.passwordHelpText')}
                        fullWidth
                        required
                        autoComplete="new-password"
                        sx={authTextFieldSx}
                      />

                      <TextField
                        label={t('auth.register.confirmPasswordLabel')}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: '' })); }}
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
                        sx={{
                          mt: 0.5,
                          py: 1.5,
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          '&:hover:not(.Mui-disabled)': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 20px 48px ${BRAND_PRIMARY_GLOW}, 0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
                          },
                          '&:active:not(.Mui-disabled)': {
                            transform: 'translateY(0)',
                          },
                        }}
                      >
                        {isSubmitting ? t('auth.register.submittingBtn') : t('auth.register.submitBtn')}
                      </Button>
                    </Stack>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    {t('auth.register.hasAccount')}{' '}
                    <Typography
                      component={Link}
                      to="/login"
                      variant="body2"
                      sx={authLinkSx}
                    >
                      {t('auth.register.loginLink')}
                    </Typography>
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>

      <PublicFooter />
    </Box>
  );
}
