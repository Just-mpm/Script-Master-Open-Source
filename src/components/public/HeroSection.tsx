import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  APP_MAX_WIDTH,
  BRAND_GRADIENT,
  BRAND_SECONDARY_GLOW_SOFT,
  TEXT_SECONDARY,
} from '../../theme/tokens';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  primaryCta?: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  visual?: ReactNode;
  /** Alinha o visual à esquerda ou direita no desktop (padrão: direita) */
  visualPosition?: 'left' | 'right';
  /** Mostra background glow decorativo */
  showGlow?: boolean;
}

export function HeroSection({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  visual,
  visualPosition = 'right',
  showGlow = true,
}: HeroSectionProps) {
  const visualElement = visual ? (
    <Box
      sx={{
        flex: { md: 1 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        order: visualPosition === 'left' ? { md: -1, xs: undefined } : undefined,
      }}
    >
      {visual}
    </Box>
  ) : null;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 4, md: 6 },
        ...(showGlow && {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '50%',
            height: '60%',
            background: 'radial-gradient(circle, rgba(46, 117, 182, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '40%',
            height: '50%',
            background: 'radial-gradient(circle, rgba(247, 148, 30, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }),
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          sx={{
            alignItems: 'center',
            textAlign: { xs: 'center', md: 'left' },
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Conteúdo textual */}
          <Box sx={{ flex: { md: 1 }, minWidth: 0 }}>
            <Stack spacing={{ xs: 2, md: 3 }} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
                  lineHeight: 1.15,
                  background: BRAND_GRADIENT,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {title}
              </Typography>

              <Typography
                variant="h6"
                component="p"
                sx={{
                  color: TEXT_SECONDARY,
                  fontWeight: 400,
                  maxWidth: 560,
                  lineHeight: 1.6,
                }}
              >
                {subtitle}
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ pt: 1 }}
              >
                {primaryCta && (
                  <Button
                    component={Link}
                    to={primaryCta.to}
                    variant="contained"
                    color="secondary"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      boxShadow: `0 18px 44px ${BRAND_SECONDARY_GLOW_SOFT}`,
                    }}
                  >
                    {primaryCta.label}
                  </Button>
                )}
                {secondaryCta && (
                  <Button
                    component={Link}
                    to={secondaryCta.to}
                    variant="outlined"
                    color="primary"
                    size="large"
                    sx={{ px: 4, py: 1.5 }}
                  >
                    {secondaryCta.label}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* Visual */}
          {visualElement}
        </Stack>
      </Container>
    </Box>
  );
}
