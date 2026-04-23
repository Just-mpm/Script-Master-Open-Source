import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
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
        <CircularProgress size={28} />
      </Box>
    );
  }

  // Usuário não autenticado — redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Usuário autenticado — renderiza a rota filha
  return <Outlet />;
}
