import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { BRAND_GRADIENT, BRAND_PRIMARY_GLOW, TEXT_SECONDARY } from '../../theme/tokens';

interface CTASectionProps {
  title: string;
  subtitle?: string;
  buttonLabel: string;
  buttonHref: string;
}

export function CTASection({ title, subtitle, buttonLabel, buttonHref }: CTASectionProps) {
  return (
    <Box
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
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography variant="body1" sx={{ color: TEXT_SECONDARY, maxWidth: 480 }}>
              {subtitle}
            </Typography>
          )}

          <Button
            component={Link}
            to={buttonHref}
            variant="contained"
            color="secondary"
            size="large"
            sx={{ px: 5, py: 1.5, mt: 1, boxShadow: `0 18px 44px ${BRAND_PRIMARY_GLOW}` }}
          >
            {buttonLabel}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
