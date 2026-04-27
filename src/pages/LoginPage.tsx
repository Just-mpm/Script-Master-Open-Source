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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Mic from '@mui/icons-material/Mic';
import Google from '@mui/icons-material/Google';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
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
  SUCCESS_MAIN,
} from '../theme/tokens';
import { authTextFieldSx, authLinkSx } from '../theme/authStyles';
import { glassPanelSx } from '../theme/surfaces';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';

const SEO_PROPS = getPageSeo({
  title: 'Login',
  description: 'Faça login no Script Master e transforme roteiros em audio, video e imagens com inteligencia artificial.',
  path: '/login',
});

export function LoginPage() {
  const { user, login, loginWithEmail, resetPassword, authError, loading, clearAuthError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog de reset de senha
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Redireciona usuario ja autenticado para o estudio (full reload para aplicar headers COEP)
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
      await loginWithEmail(email, password);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetSubmit(event: FormEvent) {
    event.preventDefault();

    if (!resetEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setResetError('Email inválido.');
      return;
    }

    setIsResetting(true);
    setResetError(null);
    setResetSuccess(false);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      const firebaseMessage = err instanceof Error ? err.message : '';
      // W6: extrai mensagem do error lançado em vez de depender do state (stale closure)
      if (firebaseMessage.includes('user-not-found')) {
        setResetError('Nenhum usuário encontrado com este email.');
      } else if (firebaseMessage.includes('too-many-requests')) {
        setResetError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setResetError(firebaseMessage || 'Erro ao enviar email de redefinição.');
      }
    } finally {
      setIsResetting(false);
    }
  }

  function openResetDialog() {
    setResetEmail(email);
    setResetError(null);
    setResetSuccess(false);
    setResetOpen(true);
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

      {/* Landmark main fica em App.tsx — este Box é apenas container de conteúdo */}
      <Box
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

            {/* Coluna direita — card de login */}
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
                      Script Master
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Entre com Google ou email
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
                    Entrar com Google
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
                        helperText={fieldErrors.password}
                        fullWidth
                        required
                        autoComplete="current-password"
                        sx={authTextFieldSx}
                      />

                      <Button
                        type="submit"
                        variant="outlined"
                        size="large"
                        fullWidth
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                        sx={{
                          mt: 0.5,
                          py: 1.5,
                          borderWidth: 1.5,
                          transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                          '&:hover:not(.Mui-disabled)': {
                            borderWidth: 2,
                            boxShadow: '0 0 0 3px rgba(46, 117, 182, 0.12)',
                          },
                          '&:active:not(.Mui-disabled)': {
                            transform: 'scale(0.98)',
                          },
                        }}
                      >
                        Entrar
                      </Button>
                    </Stack>
                  </Box>

                  {/* Links auxiliares */}
                  <Stack spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
                    <Button
                      variant="text"
                      onClick={openResetDialog}
                      sx={{
                        p: 0,
                        minWidth: 'auto',
                        fontWeight: 600,
                        '&:hover': {
                          textDecoration: 'underline',
                          textDecorationColor: 'rgba(46, 117, 182, 0.4)',
                          textUnderlineOffset: '2px',
                        },
                      }}
                    >
                      Esqueceu a senha?
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      Não tem conta?{' '}
                      <Typography
                        component={Link}
                        to="/cadastro"
                        variant="body2"
                        sx={authLinkSx}
                      >
                        Cadastre-se
                      </Typography>
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Dialog de reset de senha */}
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="reset-password-title"
        slotProps={{
          paper: {
            sx: (theme) => ({
              ...glassPanelSx(theme),
              p: 0,
              backgroundImage: 'none',
            }),
          },
        }}
      >
        <DialogTitle id="reset-password-title" sx={{ pb: 1, fontWeight: 700, letterSpacing: '-0.01em' }}>
          Redefinir senha
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {resetSuccess ? (
            <Stack spacing={2} sx={{ py: 2, alignItems: 'center', textAlign: 'center' }}>
              <CheckCircleOutlineRounded sx={{ fontSize: 48, color: SUCCESS_MAIN }} aria-hidden="true" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Email enviado!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Box component="form" onSubmit={handleResetSubmit} sx={{ pt: 1 }}>
              <Stack spacing={2.5}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Informe seu email e enviaremos um link para redefinir sua senha.
                </Typography>
                {resetError && (
                  <Alert severity="error" variant="filled">{resetError}</Alert>
                )}
                <TextField
                  label="Email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); setResetError(null); }}
                  fullWidth
                  required
                  autoComplete="email"
                  autoFocus
                  sx={authTextFieldSx}
                />
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          {resetSuccess ? (
            <Button
              onClick={() => setResetOpen(false)}
              variant="contained"
              fullWidth
              sx={{ py: 1.25 }}
            >
              Entendi
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setResetOpen(false)}
                disabled={isResetting}
                sx={{
                  color: 'text.secondary',
                  '&:hover:not(.Mui-disabled)': {
                    color: 'text.primary',
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isResetting}
                startIcon={isResetting ? <CircularProgress size={18} color="inherit" /> : undefined}
                sx={{ px: 3 }}
              >
                Enviar link
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <PublicFooter />
    </Box>
  );
}
