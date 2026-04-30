/**
 * Etapa 0 do wizard — boas-vindas com titulo em gradiente e botao "Comecar".
 */

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import RocketLaunch from '@mui/icons-material/RocketLaunch';
import Lock from '@mui/icons-material/Lock';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { useTheme } from '@mui/material/styles';
import { BRAND_GRADIENT, BRAND_PRIMARY } from '../../../theme/tokens';
import { useLocale } from '../../i18n';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const theme = useTheme();
  const { t } = useLocale();

  return (
    <Stack sx={{ flex: 1, justifyContent: 'center' }}>
      {/* Icone com animacao de entrada */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
      >
        <Stack
          sx={{
            mb: 4,
            width: 64,
            height: 64,
            borderRadius: 3,
            background: BRAND_GRADIENT,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <RocketLaunch sx={{ fontSize: 32, color: '#fff' }} />

          {/* Badge giratorio */}
          <Box
            component={motion.div}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: alpha(BRAND_PRIMARY, 0.16),
              alignItems: 'center',
              justifyContent: 'center',
              display: 'flex',
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          >
            <AutoAwesome sx={{ fontSize: 12, color: BRAND_PRIMARY }} />
          </Box>
        </Stack>
      </Box>

      {/* Titulo com gradiente */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 700,
          background: BRAND_GRADIENT,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2,
        }}
      >
        {t('onboarding.wizard.welcomeTitle')}
      </Typography>

      {/* Descricao */}
      <Typography
        variant="body1"
        sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 6, maxWidth: 420 }}
      >
        {t('onboarding.wizard.welcomeDescription')}
      </Typography>

      {/* Rodape com icone de seguranca e botao */}
      <Stack
        direction="row"
        spacing={3}
        sx={{
          mt: 'auto',
          pt: 4,
          alignItems: 'center',
          justifyContent: { xs: 'center', sm: 'space-between' },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: 2,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', color: 'text.secondary' }}
        >
          <Lock sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {t('onboarding.wizard.welcomeSecure')}
          </Typography>
        </Stack>

        <Box component={motion.div} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onNext}
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            sx={{
              background: BRAND_GRADIENT,
              px: 4,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5BA3D0 0%, #F7941E 100%)',
              },
            }}
          >
            {t('onboarding.wizard.welcomeButton')}
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}
