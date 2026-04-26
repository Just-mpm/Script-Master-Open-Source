import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { motion } from 'motion/react';
import type { ElementType, ReactNode } from 'react';
import { glassPanelSx } from '../../theme/surfaces';
import { fadeInUp, VIEWPORT_ONCE, SPRING_SMOOTH } from './animations';

interface FeatureCardProps {
  icon: ElementType;
  title: string;
  description: string;
  /** Destaque com borda gradiente */
  highlighted?: boolean;
  /** Conteudo extra abaixo da descricao */
  extra?: ReactNode;
  /** Indice para stagger de entrada no viewport (delay = index * 0.1s) */
  index?: number;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  highlighted = false,
  extra,
  index = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      variants={{
        ...fadeInUp,
        visible: {
          ...fadeInUp.visible,
          transition: { ...SPRING_SMOOTH, delay: index * 0.1 },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      style={{ height: '100%' }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Paper
        variant="outlined"
        sx={(theme) => ({
          ...glassPanelSx(theme),
          p: { xs: 3, md: 4 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease',
          '&:hover': {
            transform: 'translateY(-6px)',
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
          {/* Icone */}
          <Box
            component={motion.div}
            sx={(theme) => ({
              width: 56,
              height: 56,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              background: highlighted ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` : undefined,
              bgcolor: highlighted ? undefined : 'action.hover',
              color: highlighted ? 'common.white' : 'primary.main',
              transition: 'transform 0.3s ease',
            })}
            whileHover={{ scale: 1.1 }}
          >
            <Icon sx={{ fontSize: 28 }} aria-hidden="true" />
          </Box>

          <Typography variant="h6" component="h3" sx={{ letterSpacing: '-0.02em' }}>
            {title}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, flex: 1 }}>
            {description}
          </Typography>

          {extra}
        </Stack>
      </Paper>
    </motion.div>
  );
}
