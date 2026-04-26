import { type FormEvent, useState, useEffect } from 'react';
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
import Mic from '@mui/icons-material/Mic';
import Google from '@mui/icons-material/Google';
import { DocumentHead } from '../components/DocumentHead';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPageSeo } from '../lib/seo';
import { AUTH_BENEFITS } from '../data/authBenefits';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  EMPTY_ICON_SIZE,
  ICON_SIZE_LG,
  APP_BACKGROUND_GLOW,
  BRAND_GLOW,
  GAP_RELAXED,
  TEXT_SECONDARY,
} from '../theme/tokens';
import { authTextFieldSx, authLinkSx } from '../theme/authStyles';
import { glassPanelSx } from '../theme/surfaces';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';

const SEO_PROPS = getPageSeo({
  title: 'Cadastro',
  description: 'Crie sua conta no Script Master e comece a transformar roteiros em audio, video e imagens com inteligencia artificial.',
  path: '/cadastro',
});

export function RegisterPage() {
  const { user, login, signup, authError, loading, clearAuthError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redireciona usuario ja autenticado (full reload para aplicar COEP)
  useEffect(() => {
    if (user && !loading) {
      window.location.href = '/app/estudio';
    }
  }, [user, loading]);

  function validateFields(): boolean {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email inválido.';
    }

    if (!password) {
      errors.password = 'Senha é obrigatória.';
    } else if (password.length < 6) {
      errors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirme sua senha.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não conferem.';
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

  // Verificacao de sessao Firebase
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: APP_BACKGROUND_GLOW,
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress size={EMPTY_ICON_SIZE} aria-label="Verificando sessao" />
          <Typography variant="body2" color="text.secondary">
            Verificando sessão...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: APP_BACKGROUND_GLOW }}>
      <DocumentHead {...SEO_PROPS} />

      <PublicHeader />

      <Box
        component="main"
        tabIndex={-1}
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
                    Crie com IA, sem limites
                  </Typography>
                  <Typography variant="body1" sx={{ color: TEXT_SECONDARY }}>
                    Transforme roteiros em áudio, vídeo e imagens profissionais. Grátis para começar.
                  </Typography>
                </Box>

                <Stack spacing={2.5}>
                  {AUTH_BENEFITS.map((benefit) => {
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
                            border: '1px solid rgba(255, 255, 255, 0.06)',
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
                          <Typography variant="subtitle2">{benefit.title}</Typography>
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
                    aria-hidden="true"
                    sx={{
                      width: EMPTY_ICON_SIZE * 2,
                      height: EMPTY_ICON_SIZE * 2,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'common.white',
                      background: BRAND_GRADIENT,
                      boxShadow: BRAND_GLOW,
                      transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                      '&:hover': {
                        boxShadow: `0 18px 40px ${BRAND_PRIMARY_GLOW}`,
                        transform: 'scale(1.04)',
                      },
                    }}
                  >
                    <Mic sx={{ fontSize: EMPTY_ICON_SIZE }} />
                  </Box>

                  <Box>
                    <Typography variant="h5" sx={{ letterSpacing: '-0.02em' }}>
                      Criar conta
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Comece a criar com IA
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
                        boxShadow: `0 20px 48px ${BRAND_PRIMARY_GLOW}, 0 0 0 3px rgba(46, 117, 182, 0.12)`,
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                    }}
                  >
                    Cadastrar com Google
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
                      ou
                    </Typography>
                  </Divider>

                  {/* Formulario email/senha */}
                  <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                    <Stack spacing={2}>
                      <TextField
                        label="Email"
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
                        label="Senha"
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })); }}
                        error={Boolean(fieldErrors.password)}
                        helperText={fieldErrors.password || 'Pelo menos 6 caracteres'}
                        fullWidth
                        required
                        autoComplete="new-password"
                        sx={authTextFieldSx}
                      />

                      <TextField
                        label="Confirmar senha"
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
                        startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                        sx={{
                          mt: 0.5,
                          py: 1.5,
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          '&:hover:not(.Mui-disabled)': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 20px 48px ${BRAND_PRIMARY_GLOW}, 0 0 0 3px rgba(46, 117, 182, 0.12)`,
                          },
                          '&:active:not(.Mui-disabled)': {
                            transform: 'translateY(0)',
                          },
                        }}
                      >
                        Criar conta
                      </Button>
                    </Stack>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    Já tem conta?{' '}
                    <Typography
                      component={Link}
                      to="/login"
                      variant="body2"
                      sx={authLinkSx}
                    >
                      Faça login
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
