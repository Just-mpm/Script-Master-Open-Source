import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Mic from '@mui/icons-material/Mic';
import Google from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';
import {
  BRAND_GRADIENT,
  CYAN_GLOW,
  ICON_SIZE_LG,
  APP_BACKGROUND_GLOW,
  BRAND_GLOW,
  GAP_RELAXED,
  EMPTY_ICON_SIZE,
} from '../theme/tokens';
import { glassPanelSx } from '../theme/surfaces';

export function LoginPage() {
  const { login, authError, loading } = useAuth();

  // Estado de verificação de sessão (Firebase checando se existe usuário ativo)
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
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: APP_BACKGROUND_GLOW,
        p: { xs: 2.5, sm: 3 },
      }}
    >
      <Paper
        variant="outlined"
        sx={(theme) => ({
          ...glassPanelSx(theme),
          maxWidth: 420,
          width: '100%',
          p: { xs: 4, sm: 5 },
          textAlign: 'center',
        })}
      >
        <Stack spacing={GAP_RELAXED} sx={{ alignItems: 'center' }}>
          {/* Brand logo — mesmo padrão visual do Header */}
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
                boxShadow: `0 18px 40px ${CYAN_GLOW}`,
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
              Faça login para continuar
            </Typography>
          </Box>

          <Divider sx={{ width: '100%', borderColor: 'divider' }} />

          {/* Mensagem de erro */}
          {authError && (
            <Alert severity="error" variant="filled" sx={{ width: '100%' }}>
              {authError}
            </Alert>
          )}

          {/* Botão de login com Google — loading nativo do MUI */}
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
    </Box>
  );
}
