import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  APP_MAX_WIDTH,
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  BRAND_SECONDARY_GLOW_SOFT,
  TEXT_SECONDARY,
} from '../../theme/tokens';
import { fadeInUp } from './animations';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  primaryCta?: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  visual?: ReactNode;
  /** Alinha o visual a esquerda ou direita no desktop (padrao: direita) */
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
      component={motion.div}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
      sx={{
        flex: { md: 1 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        order: visualPosition === 'left' ? { md: -1, xs: undefined } : undefined,
        position: 'relative',
        zIndex: 2,
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
          {/* Conteudo textual */}
          <Box sx={{ flex: { md: 1 }, minWidth: 0 }}>
            <Stack spacing={{ xs: 2, md: 3 }} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Box component={motion.div} variants={fadeInUp} initial="hidden" animate="visible">
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
                    lineHeight: 1.15,
                    background: BRAND_GRADIENT,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.04em',
                  }}
                >
                  {title}
                </Typography>
              </Box>

              <Box component={motion.div} variants={fadeInUp} initial="hidden" animate="visible">
                <Typography
                  variant="h6"
                  component="p"
                  sx={{
                    color: TEXT_SECONDARY,
                    fontWeight: 400,
                    maxWidth: 560,
                    lineHeight: 1.7,
                  }}
                >
                  {subtitle}
                </Typography>
              </Box>

              <Box component={motion.div} variants={fadeInUp} initial="hidden" animate="visible">
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
                        boxShadow: `0 12px 36px ${BRAND_SECONDARY_GLOW_SOFT}`,
                        transition: 'box-shadow 0.3s ease, transform 0.2s ease',
                        '&:hover': {
                          boxShadow: `0 18px 48px ${BRAND_PRIMARY_GLOW}`,
                          transform: 'translateY(-1px)',
                        },
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
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderWidth: 1.5,
                        transition: 'border-color 0.2s ease, background-color 0.2s ease',
                        '&:hover': {
                          borderWidth: 1.5,
                        },
                      }}
                    >
                      {secondaryCta.label}
                    </Button>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>

          {/* Visual */}
          {visualElement}
        </Stack>
      </Container>
    </Box>
  );
}
