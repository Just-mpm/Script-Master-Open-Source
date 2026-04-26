import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ElementType } from 'react';
import { BRAND_GRADIENT, TEXT_SECONDARY, BRAND_PRIMARY_GLOW_SOFT } from '../../theme/tokens';

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  icon: ElementType;
}

export function StepCard({ number, title, description, icon: Icon }: StepCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: { xs: 3, md: 4 },
        textAlign: 'center',
        height: '100%',
        backgroundColor: theme.palette.background.paper,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.2)}`,
        },
      })}
    >
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        {/* Número + ícone */}
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: BRAND_GRADIENT,
              color: 'common.white',
              boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW_SOFT}`,
              transition: 'box-shadow 0.3s ease',
            }}
          >
            <Icon sx={{ fontSize: 28 }} aria-hidden="true" />
          </Box>
          <Typography
            variant="caption"
            component="span"
            sx={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              fontWeight: 700,
              fontSize: '0.75rem',
              boxShadow: `0 2px 8px ${alpha('#F7941E', 0.3)}`,
            }}
          >
            {number}
          </Typography>
        </Box>

        <Typography variant="h6" component="h3" sx={{ letterSpacing: '-0.02em' }}>
          {title}
        </Typography>

        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.7 }}>
          {description}
        </Typography>
      </Stack>
    </Paper>
  );
}
