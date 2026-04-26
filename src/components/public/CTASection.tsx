import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BRAND_GRADIENT, BRAND_PRIMARY_GLOW, TEXT_SECONDARY } from '../../theme/tokens';
import { fadeInUp, VIEWPORT_ONCE } from './animations';

interface CTASectionProps {
  title: string;
  subtitle?: string;
  buttonLabel: string;
  buttonHref: string;
}

export function CTASection({ title, subtitle, buttonLabel, buttonHref }: CTASectionProps) {
  return (
    <Box
      component={motion.div}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      sx={(theme) => ({
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 8, md: 12 },
        px: { xs: 2, sm: 3 },
        borderRadius: { xs: 3, md: 4 },
        mx: { xs: 2, sm: 3 },
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.background.paper} 60%)`,
        border: `1px solid ${theme.palette.divider}`,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '60%',
          height: '200%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.08)} 0%, transparent 60%)`,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '40%',
          height: '120%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 60%)`,
          pointerEvents: 'none',
        },
      })}
    >
      <Container maxWidth={false} sx={{ maxWidth: 720, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              background: BRAND_GRADIENT,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.035em',
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography variant="body1" sx={{ color: TEXT_SECONDARY, maxWidth: 480, lineHeight: 1.7 }}>
              {subtitle}
            </Typography>
          )}

          <Button
            component={Link}
            to={buttonHref}
            variant="contained"
            color="secondary"
            size="large"
            sx={{
              px: 5,
              py: 1.5,
              mt: 1,
              boxShadow: `0 12px 36px ${BRAND_PRIMARY_GLOW}`,
              transition: 'box-shadow 0.3s ease, transform 0.2s ease',
              '&:hover': {
                boxShadow: `0 18px 48px ${BRAND_PRIMARY_GLOW}`,
                transform: 'translateY(-1px)',
              },
            }}
          >
            {buttonLabel}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
