import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Home from '@mui/icons-material/Home';
import TravelExplore from '@mui/icons-material/TravelExplore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  APP_BORDER,
  WHITE_05,
  WHITE_015,
  SHADOW_DEEP,
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
} from '../theme/tokens';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Usuário autenticado -> redireciona para o app; visitante -> landing
  const homePath = user ? '/app/estudio' : '/';

  return (
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '55dvh',
        p: 3,
      }}
    >
      <Paper
        sx={{
          maxWidth: 420,
          p: { xs: 4, sm: 5 },
          textAlign: 'center',
          borderRadius: { xs: 3, md: 4 },
          border: `1px solid ${APP_BORDER}`,
          backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
          backdropFilter: { xs: 'blur(14px)', md: 'blur(22px)' },
          boxShadow: `0 24px 80px ${alpha(SHADOW_DEEP, 0.55)}`,
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: 80, sm: 120 },
              fontWeight: 800,
              letterSpacing: '-0.04em',
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

          <Typography variant="h5" component="h1" sx={{ letterSpacing: '-0.025em' }}>
            Página não encontrada
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 300 }}>
            A URL que você acessou não existe ou foi removida.
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
            Voltar ao início
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
