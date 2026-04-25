import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { APP_MAX_WIDTH, BRAND_PRIMARY_GLOW_SOFT, APP_BACKGROUND } from '../../theme/tokens';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        scrollBehavior: 'smooth',
      }}
    >
      {/* Skip-to-content link — acessibilidade: permite pular navegação via teclado */}
      <Typography
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          zIndex: 10000,
          px: 2.5,
          py: 1.25,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          textDecoration: 'none',
          borderRadius: 1.5,
          fontSize: '0.875rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          boxShadow: `0 4px 16px ${BRAND_PRIMARY_GLOW_SOFT}`,
          transition: 'left 0.2s ease, top 0.2s ease',
          '&:focus': {
            left: 12,
            top: 12,
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
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 280,
            background: `linear-gradient(180deg, ${APP_BACKGROUND} 0%, transparent 100%)`,
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            maxWidth: APP_MAX_WIDTH,
            px: { xs: 2, sm: 3, lg: 4 },
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Container>
      </Box>

      <PublicFooter />
    </Box>
  );
}
