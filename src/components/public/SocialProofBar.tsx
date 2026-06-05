import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { motion } from 'motion/react';
import { APP_MAX_WIDTH, APP_BORDER, BRAND_GRADIENT, TEXT_SECONDARY } from '../../theme/tokens';
import { fadeIn, VIEWPORT_ONCE } from './animations';

interface SocialProofBarProps {
  /** Texto principal (ex: "Mais de 1.000 criadores") */
  label: string;
  /** Texto secundario */
  sublabel?: string;
}

export function SocialProofBar({ label, sublabel }: SocialProofBarProps) {
  return (
    <Box
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      sx={{
        py: { xs: 3, md: 4 },
        borderTop: `1px solid ${APP_BORDER}`,
        borderBottom: `1px solid ${APP_BORDER}`,
        position: 'relative',
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1, sm: 3 }}
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h6"
            component="p"
            sx={{
              fontWeight: 700,
              background: BRAND_GRADIENT,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: 0,
            }}
          >
            {label}
          </Typography>
          {sublabel && (
            <>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ display: { xs: 'none', sm: 'block' }, borderColor: APP_BORDER }}
              />
              <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6 }}>
                {sublabel}
              </Typography>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
