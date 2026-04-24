import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ElementType } from 'react';
import { BRAND_GRADIENT, TEXT_SECONDARY } from '../../theme/tokens';

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
        transition: 'transform 0.3s ease',
        '&:hover': { transform: 'translateY(-2px)' },
      })}
    >
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        {/* Número + ícone */}
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={(theme) => ({
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: BRAND_GRADIENT,
              color: 'common.white',
              boxShadow: `0 12px 32px ${theme.palette.primary.main}40`,
            })}
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
            }}
          >
            {number}
          </Typography>
        </Box>

        <Typography variant="h6" component="h3">
          {title}
        </Typography>

        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Stack>
    </Paper>
  );
}
