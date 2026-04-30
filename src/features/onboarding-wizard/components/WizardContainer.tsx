/**
 * Container principal do wizard — painel glass com barra de progresso
 * e transicao animada entre etapas via AnimatePresence.
 */

import { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'motion/react';
import { glassPanelSx } from '../../../theme/surfaces';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  BRAND_SECONDARY_GLOW_SOFT,
  WHITE_04,
} from '../../../theme/tokens';
import { useLocale } from '../../i18n';
import { useWizardStore } from '../store/wizardStore';
import { TOTAL_STEPS, stepVariants } from '../constants';

interface WizardContainerProps {
  children: ReactNode;
}

export function WizardContainer({ children }: WizardContainerProps) {
  const { t } = useLocale();
  const { currentStep, direction } = useWizardStore(
    useShallow((s) => ({ currentStep: s.currentStep, direction: s.direction })),
  );
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Orbe animado azul (canto superior esquerdo) */}
      <Box
        component={motion.div}
        animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        sx={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '60vw',
          height: '60vw',
          maxWidth: 500,
          maxHeight: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND_PRIMARY_GLOW} 0%, transparent 70%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Orbe animado laranja (canto inferior direito) */}
      <Box
        component={motion.div}
        animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        sx={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '70vw',
          height: '70vw',
          maxWidth: 600,
          maxHeight: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND_SECONDARY_GLOW_SOFT} 0%, transparent 70%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Painel glass */}
      <Box
        component={motion.div}
        layout
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 540 }}
      >
        <Box sx={(theme) => ({ ...glassPanelSx(theme), p: { xs: 1.5, sm: 2 } })}>
          <Box
            sx={{
              borderRadius: 3,
              backgroundColor: WHITE_04,
              minHeight: { xs: 460, sm: 520 },
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Barra de progresso */}
            <Stack
              role="progressbar"
              aria-valuenow={currentStep + 1}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-label={t('onboarding.wizard.progress', { current: currentStep + 1, total: TOTAL_STEPS })}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: 'rgba(255,255,255,0.04)',
                zIndex: 2,
              }}
            >
              <Box
                component={motion.div}
                layout
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                sx={{
                  height: '100%',
                  background: BRAND_GRADIENT,
                  borderRadius: '0 4px 4px 0',
                }}
              />
            </Stack>

            {/* Conteudo da etapa com transicao animada */}
            <Box
              role="region"
              aria-live="polite"
              aria-label={t('onboarding.wizard.progress', { current: currentStep + 1, total: TOTAL_STEPS })}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                p: { xs: 3, sm: 4 },
                mt: 0.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={`wizard-step-${currentStep}`}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
