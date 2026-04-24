import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { APP_MAX_WIDTH } from '../../theme/tokens';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Skip-to-content link — acessibilidade: permite pular navegação via teclado */}
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
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
          {children}
        </Container>
      </Box>

      <PublicFooter />
    </Box>
  );
}
