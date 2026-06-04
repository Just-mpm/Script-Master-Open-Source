/**
 * Etapa 2 do wizard — multi-selecao de objetivos de uso.
 */

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'motion/react';
import { useLocale } from '../../i18n';
import { useWizardStore } from '../store/wizardStore';
import { WIZARD_GOALS, STEP_CHIP_SX, staggerContainer, staggerItem } from '../constants';
import { SelectionCard } from './SelectionCard';
import { StepNavigation } from './StepNavigation';
import type { WizardGoal } from '../types';

/** Mapeamento de goals para chaves i18n (label + description) */
const GOAL_I18N_KEYS: Record<WizardGoal, { label: string; description: string }> = {
  audio: {
    label: 'onboarding.wizard.goalAudio',
    description: 'onboarding.wizard.goalAudioDescription',
  },
  scenes: {
    label: 'onboarding.wizard.goalScenes',
    description: 'onboarding.wizard.goalScenesDescription',
  },
  video: {
    label: 'onboarding.wizard.goalVideo',
    description: 'onboarding.wizard.goalVideoDescription',
  },
  assistant: {
    label: 'onboarding.wizard.goalAssistant',
    description: 'onboarding.wizard.goalAssistantDescription',
  },
};

export function GoalsStep() {
  const { t } = useLocale();
  const { data, toggleGoal, nextStep, prevStep } = useWizardStore(
    useShallow((s) => ({ data: s.data, toggleGoal: s.toggleGoal, nextStep: s.nextStep, prevStep: s.prevStep })),
  );

  return (
    <Stack sx={{ flex: 1, gap: 2 }}>
      {/* Chip de identificacao da etapa */}
      <Chip
        label={t('onboarding.wizard.goalsStep')}
        size="small"
        sx={STEP_CHIP_SX}
      />

      <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
        {t('onboarding.wizard.goalsTitle')}
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('onboarding.wizard.goalsDescription')}
      </Typography>

      {/* Lista de metas com stagger */}
      <Box
        component={motion.div}
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        sx={{ flex: 1 }}
      >
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {WIZARD_GOALS.map((goal) => {
            const i18n = GOAL_I18N_KEYS[goal.id];
            return (
              <Box key={goal.id} component={motion.div} variants={staggerItem}>
                <SelectionCard
                  selected={data.goals.includes(goal.id)}
                  onClick={() => toggleGoal(goal.id)}
                  icon={<goal.icon sx={{ fontSize: 20 }} />}
                  label={t(i18n.label)}
                  description={t(i18n.description)}
                  multiline
                  selectionMode="multi"
                />
              </Box>
            );
          })}
        </Stack>
      </Box>

      {data.goals.length === 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          {t('onboarding.wizard.selectAtLeastOneGoal')}
        </Typography>
      )}

      <StepNavigation
        onPrev={prevStep}
        onNext={nextStep}
        isDisabled={data.goals.length === 0 }
        isLastStep
      />
    </Stack>
  );
}
