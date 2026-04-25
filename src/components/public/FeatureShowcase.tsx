import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Check from '@mui/icons-material/Check';
import type { ElementType, ReactNode } from 'react';
import { APP_MAX_WIDTH, TEXT_SECONDARY, ICON_SIZE_MD, BRAND_PRIMARY_GLOW_SOFT } from '../../theme/tokens';

interface FeatureShowcaseProps {
  /** Ícone representativo */
  icon: ElementType;
  title: string;
  description: string;
  /** Lista de benefícios (strings) */
  benefits: string[];
  /** Imagem/GIF ou conteúdo visual */
  visual: ReactNode;
  /** Posição da imagem: 'left' ou 'right' (padrão: alternado) */
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
  // Posição padrão: esquerda (texto) + direita (imagem)
  const imageFirst = position === 'left';

  return (
    <Box
      sx={{
        py: { xs: 6, md: 10 },
        position: 'relative',
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
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              order: imageFirst ? { md: -1 } : undefined,
            }}
          >
            {visual}
          </Box>

          {/* Texto */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={2}>
              <Box
                sx={(theme) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  color: 'common.white',
                  boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW_SOFT}`,
                })}
              >
                <Icon sx={{ fontSize: 24 }} aria-hidden="true" />
              </Box>

              <Typography variant="h4" component="h2" sx={{ letterSpacing: '-0.03em' }}>
                {title}
              </Typography>

              <Typography variant="body1" sx={{ color: TEXT_SECONDARY, lineHeight: 1.75 }}>
                {description}
              </Typography>

              <Stack spacing={1.25} sx={{ pt: 1 }}>
                {benefits.map((benefit) => (
                  <Stack key={benefit} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <Check
                      sx={{
                        fontSize: ICON_SIZE_MD + 4,
                        color: 'secondary.main',
                        flexShrink: 0,
                        mt: 0.3,
                      }}
                      aria-hidden="true"
                    />
                    <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.65 }}>
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
