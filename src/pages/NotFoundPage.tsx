import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Home from '@mui/icons-material/Home';
import SearchOff from '@mui/icons-material/SearchOff';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Usuário autenticado → redireciona para o app; visitante → landing
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
        variant="outlined"
        sx={{
          maxWidth: 400,
          p: 4,
          textAlign: 'center',
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <SearchOff
            sx={{ fontSize: 48, color: 'text.disabled' }}
            aria-hidden="true"
          />

          <Typography variant="h5" component="h1">
            Página não encontrada
          </Typography>

          <Typography variant="body2" color="text.secondary">
            A URL que você acessou não existe ou foi removida.
          </Typography>

          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate(homePath)}
            sx={{ mt: 1 }}
          >
            Voltar ao início
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
