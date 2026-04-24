import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ElementType, ReactNode } from 'react';
import { glassPanelSx } from '../../theme/surfaces';

interface FeatureCardProps {
  icon: ElementType;
  title: string;
  description: string;
  /** Destaque com borda gradiente */
  highlighted?: boolean;
  /** Conteúdo extra abaixo da descrição */
  extra?: ReactNode;
}

export function FeatureCard({ icon: Icon, title, description, highlighted = false, extra }: FeatureCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        ...glassPanelSx(theme),
        p: { xs: 3, md: 4 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 32px 96px rgba(2, 6, 23, 0.65)',
        },
        ...(highlighted && {
          borderColor: 'transparent',
          backgroundImage: `linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper}), linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          border: '2px solid transparent',
        }),
      })}
    >
      <Stack spacing={2} sx={{ flex: 1 }}>
        {/* Ícone */}
        <Box
          sx={(theme) => ({
            width: 56,
            height: 56,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            bgcolor: highlighted ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` : 'action.hover',
            color: highlighted ? 'common.white' : 'primary.main',
          })}
        >
          <Icon sx={{ fontSize: 28 }} aria-hidden="true" />
        </Box>

        <Typography variant="h6" component="h3">
          {title}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, flex: 1 }}>
          {description}
        </Typography>

        {extra}
      </Stack>
    </Paper>
  );
}
