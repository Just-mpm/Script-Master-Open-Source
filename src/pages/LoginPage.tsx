import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Mic from '@mui/icons-material/Mic';
import Google from '@mui/icons-material/Google';
import PlayCircle from '@mui/icons-material/PlayCircle';
import ImageIcon from '@mui/icons-material/Image';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../contexts/AuthContext';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  ICON_SIZE_LG,
  APP_BACKGROUND_GLOW,
  BRAND_GLOW,
  GAP_RELAXED,
  EMPTY_ICON_SIZE,
  TEXT_SECONDARY,
} from '../theme/tokens';
import { glassPanelSx } from '../theme/surfaces';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';

const LOGIN_BENEFITS = [
  { icon: Mic, title: 'Voz com IA', description: 'Roteiros em áudio profissional com Gemini TTS' },
  { icon: PlayCircle, title: 'Vídeo Automático', description: 'Renderização client-side com legendas' },
  { icon: ImageIcon, title: 'Imagens', description: 'Geração com 8 aspect ratios e referência' },
  { icon: AutoAwesome, title: 'Assistente IA', description: 'Chat com memória e integração ao estúdio' },
];

export function LoginPage() {
  const { login, authError, loading } = useAuth();

  // Verificação de sessão Firebase
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
          <CircularProgress size={EMPTY_ICON_SIZE} aria-label="Verificando sessão" />
          <Typography variant="body2" color="text.secondary">
            Verificando sessão...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: APP_BACKGROUND_GLOW }}>
      {/* Skip-to-content link — acessibilidade */}
      <Typography
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          zIndex: 10000,
          px: 2,
          py: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          textDecoration: 'none',
          borderRadius: 1,
          fontSize: '0.875rem',
          fontWeight: 600,
          '&:focus': {
            left: 8,
            top: 8,
          },
        }}
      >
        Pular para o conteúdo
      </Typography>

      <PublicHeader />

      <Box
        component="main"
        id="main-content"
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
            {/* Coluna esquerda — benefícios */}
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

                <Stack spacing={2}>
                  {LOGIN_BENEFITS.map((benefit) => {
                    const BenefitIcon = benefit.icon;
                    return (
                      <Stack key={benefit.title} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'action.hover',
                            color: 'primary.main',
                            flexShrink: 0,
                          }}
                        >
                          <BenefitIcon sx={{ fontSize: ICON_SIZE_LG }} aria-hidden="true" />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">{benefit.title}</Typography>
                          <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>
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
                    <Typography variant="h5">
                      Script Master
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Faça login para começar a criar
                    </Typography>
                  </Box>

                  <Divider sx={{ width: '100%', borderColor: 'divider' }} />

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
                    sx={{ mt: 0.5, py: 1.5 }}
                  >
                    Entrar com Google
                  </Button>

                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                    Use sua conta Google para acessar o Script Master
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
