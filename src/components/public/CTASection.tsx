import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BRAND_GRADIENT, BRAND_SECONDARY_GLOW_SOFT, TEXT_SECONDARY } from '../../theme/tokens';
import { fadeInUp, VIEWPORT_ONCE } from './animations';
import { trackAnalyticsEvent } from '../../lib/analytics';

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
        <Stack spacing={{ xs: 2.5, md: 3.5 }} sx={{ alignItems: 'center' }}>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontSize: { xs: '1.875rem', sm: '2.25rem', md: '3rem' },
              fontWeight: 800,
              background: BRAND_GRADIENT,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                color: TEXT_SECONDARY,
                maxWidth: { xs: 440, md: 520 },
                lineHeight: 1.75,
                fontSize: { xs: '0.9375rem', md: '1rem' },
              }}
            >
              {subtitle}
            </Typography>
          )}

          <Button
            component={Link}
            to={buttonHref}
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => trackAnalyticsEvent('select_content', {
              content_type: 'public_cta',
              item_id: buttonHref,
              source: 'cta_section',
            })}
            sx={{
              px: 5,
              py: 1.5,
              mt: 1,
              boxShadow: `0 12px 36px ${BRAND_SECONDARY_GLOW_SOFT}`,
              transition: 'box-shadow 0.3s ease, transform 0.2s ease',
              '&:hover': {
                boxShadow: `0 18px 48px ${BRAND_SECONDARY_GLOW_SOFT}`,
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
