import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

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
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Verificando sessão...
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
          <Typography variant="h6">Verifique seu email</Typography>
          <Typography variant="body2" color="text.secondary">
            Enviamos um link de verificação para seu email. Verifique sua caixa de entrada e spam.
          </Typography>
          <Button variant="outlined" onClick={() => { window.location.href = '/login'; }}>
            Voltar ao login
          </Button>
        </Stack>
      </Box>
    );
  }

  // Usuário autenticado — renderiza a rota filha
  return <Outlet />;
}
