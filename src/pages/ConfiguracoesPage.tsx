import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Configuracoes } from '../components/Configuracoes';
import { APP_MAX_WIDTH } from '../theme/tokens';

export function ConfiguracoesPage() {
  return (
    <Box sx={{ px: { xs: 0, md: 2 }, py: { xs: 0, md: 2 } }}>
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Configuracoes />
      </Container>
    </Box>
  );
}
