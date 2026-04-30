/**
 * Botoes de navegacao (Voltar/Continuar) compartilhados entre as etapas do wizard.
 */

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { motion } from 'motion/react';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { BRAND_GRADIENT } from '../../../theme/tokens';
import { useLocale } from '../../i18n';

interface StepNavigationProps {
  onPrev: () => void;
  onNext: () => void;
  isDisabled: boolean;
  isLastStep?: boolean;
  showPrev?: boolean;
}

export function StepNavigation({
  onPrev,
  onNext,
  isDisabled,
  isLastStep,
  showPrev = true,
}: StepNavigationProps) {
  const { t } = useLocale();

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        mt: 'auto',
        pt: 3,
        alignItems: 'center',
        justifyContent: showPrev ? 'space-between' : 'flex-end',
      }}
    >
      {showPrev && (
        <Box component={motion.div} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onPrev}
            variant="outlined"
            size="large"
            startIcon={<ArrowBack />}
            aria-label={t('onboarding.wizard.back')}
            sx={{
              borderColor: 'rgba(255,255,255,0.12)',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.24)',
                backgroundColor: 'rgba(255,255,255,0.04)',
              },
            }}
          />
        </Box>
      )}

      <Box
        component={motion.div}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
      >
        <Button
          onClick={onNext}
          disabled={isDisabled}
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          sx={{
            background: isDisabled
              ? 'rgba(255,255,255,0.08)'
              : BRAND_GRADIENT,
            color: isDisabled ? 'text.disabled' : '#fff',
            px: 3,
            fontWeight: 600,
            boxShadow: isDisabled ? 'none' : '0 4px 14px rgba(0,0,0,0.3)',
            '&:hover': {
              background: isDisabled
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #5BA3D0 0%, #F7941E 100%)',
            },
          }}
        >
          {isLastStep ? t('onboarding.wizard.finish') : t('onboarding.wizard.continue')}
        </Button>
      </Box>
    </Stack>
  );
}
