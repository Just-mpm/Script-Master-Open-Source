import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Home from '@mui/icons-material/Home';
import TravelExplore from '@mui/icons-material/TravelExplore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { glassPanelSx } from '../theme/surfaces';
import { useLocale } from '../features/i18n';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
} from '../theme/tokens';

/**
 * Página 404 — layout minimalista intencional sem header/footer.
 * Usuários que chegam aqui geralmente digitaram uma URL errada ou seguiram
 * um link quebrado; o foco deve ser o botão de retorno, não a navegação.
 */
export function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLocale();

  // Usuário autenticado -> redireciona para o app; visitante -> landing
  const homePath = user ? '/app/assistente' : '/';

  return (
    <>
      {/* Meta robots noindex — SPA rewrite intercepta 404s antes do 404.html estático */}
      <title>{`${t('notFound.seoTitle')} | Script Master`}</title>
      <meta name="robots" content="noindex, nofollow" />
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '55dvh',
          p: 3,
        }}
      >
        <Paper
          sx={(theme) => ({
            ...glassPanelSx(theme),
            position: 'static',
            overflow: 'visible',
            maxWidth: 420,
            p: { xs: 4, sm: 5 },
            textAlign: 'center',
          })}
        >
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: 80, sm: 120 },
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1,
                background: BRAND_GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: -0.5,
              }}
            >
              404
            </Typography>

            <TravelExplore
              sx={{ fontSize: 36, color: 'text.disabled', mt: 0.5 }}
              aria-hidden="true"
            />

            <Typography variant="h5" component="h1" sx={{ letterSpacing: 0 }}>
              {t('notFound.title')}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 300 }}>
              {t('notFound.desc')}
            </Typography>

            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={() => navigate(homePath)}
              sx={{
                mt: 1,
                transition: 'box-shadow 0.2s ease',
                '&:hover': {
                  boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW}`,
                },
              }}
            >
              {t('notFound.homeBtn')}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
