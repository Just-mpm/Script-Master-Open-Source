import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Check from '@mui/icons-material/Check';
import { motion } from 'motion/react';
import type { ElementType, ReactNode } from 'react';
import { APP_MAX_WIDTH, TEXT_SECONDARY, ICON_SIZE_MD, BRAND_PRIMARY_GLOW_SOFT, RADIUS_XS } from '../../theme/tokens';
import { VIEWPORT_ONCE, SPRING_SMOOTH } from './animations';

interface FeatureShowcaseProps {
  /** Icone representativo */
  icon: ElementType;
  title: string;
  description: string;
  /** Lista de beneficios (strings) */
  benefits: string[];
  /** Imagem/GIF ou conteudo visual */
  visual: ReactNode;
  /** Posicao da imagem: 'left' ou 'right' (padrao: alternado) */
  position?: 'left' | 'right';
}

export function FeatureShowcase({
  icon: Icon,
  title,
  description,
  benefits,
  visual,
  position,
}: FeatureShowcaseProps) {
  // Posicao padrao: esquerda (texto) + direita (imagem)
  const imageFirst = position === 'left';

  return (
    <Box
      sx={{
        py: { xs: 6, md: 10 },
        position: 'relative',
        overflowX: 'clip',
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 8 }}
          sx={{
            alignItems: 'center',
            gap: { md: 6 },
          }}
        >
          {/* Imagem */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, x: imageFirst ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            sx={{
              flex: 1,
              minWidth: 0,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              order: imageFirst ? { md: -1 } : undefined,
            }}
          >
            {visual}
          </Box>

          {/* Texto */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, x: imageFirst ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <Stack spacing={2}>
              <Box
                sx={(theme) => ({
                  width: 48,
                  height: 48,
                  borderRadius: RADIUS_XS,
                  display: 'grid',
                  placeItems: 'center',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  color: 'common.white',
                  boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW_SOFT}`,
                })}
              >
                <Icon sx={{ fontSize: 24 }} aria-hidden="true" />
              </Box>

              <Typography variant="h4" component="h2" sx={{ letterSpacing: '-0.03em' }}>
                {title}
              </Typography>

              <Typography variant="body1" sx={{ color: TEXT_SECONDARY, lineHeight: 1.75, fontSize: { xs: '0.9375rem', md: '1rem' } }}>
                {description}
              </Typography>

              <Stack spacing={1.25} sx={{ pt: 1 }}>
                {benefits.map((benefit, idx) => (
                  <Stack
                    component={motion.div}
                    key={benefit}
                    direction="row"
                    spacing={1.5}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ ...SPRING_SMOOTH, delay: 0.2 + idx * 0.06 }}
                    sx={{ alignItems: 'flex-start', minWidth: 0 }}
                  >
                    <Check
                      sx={{
                        fontSize: ICON_SIZE_MD + 4,
                        color: 'secondary.main',
                        flexShrink: 0,
                        mt: 0.3,
                      }}
                      aria-hidden="true"
                    />
                    <Typography
                      variant="body2"
                      sx={{ color: TEXT_SECONDARY, lineHeight: 1.65, flex: 1, minWidth: 0 }}
                    >
                      {benefit}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
