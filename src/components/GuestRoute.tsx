import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }} role="status" aria-live="polite">
          <CircularProgress size={28} aria-label="Verificando sessão" />
          <Typography variant="body2" color="text.secondary">
            Verificando sessão...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (user) {
    return <Navigate to="/app/estudio" replace />;
  }

  return <Outlet />;
}
