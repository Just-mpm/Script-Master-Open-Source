import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import type { ReactNode } from 'react';
import { APP_MAX_WIDTH, APP_BACKGROUND } from '../../theme/tokens';
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
      {/* Skip-to-content — mantido apenas em App.tsx (cobre rotas públicas E app) */}

      <PublicHeader />

      {/* Landmark main fica em App.tsx — este Box é apenas container de conteúdo */}
      <Box
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
