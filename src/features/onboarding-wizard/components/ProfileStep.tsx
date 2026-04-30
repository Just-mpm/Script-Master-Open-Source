/**
 * Etapa 1 do wizard — campo de nome e selecao de papel (role).
 */

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'motion/react';
import { useLocale } from '../../i18n';
import { useWizardStore } from '../store/wizardStore';
import { WIZARD_ROLES, STEP_CHIP_SX, staggerContainer, staggerItem } from '../constants';
import { SelectionCard } from './SelectionCard';
import { StepNavigation } from './StepNavigation';
import { authTextFieldSx } from '../../../theme/authStyles';
import type { WizardRole } from '../types';

/** Mapeamento de roles para chaves i18n */
const ROLE_I18N_KEYS: Record<WizardRole, string> = {
  contentCreator: 'onboarding.wizard.roleContentCreator',
  podcaster: 'onboarding.wizard.rolePodcaster',
  marketer: 'onboarding.wizard.roleMarketer',
  educator: 'onboarding.wizard.roleEducator',
  other: 'onboarding.wizard.roleOther',
};

export function ProfileStep() {
  const { t } = useLocale();
  const { data, updateData, nextStep, prevStep } = useWizardStore(
    useShallow((s) => ({ data: s.data, updateData: s.updateData, nextStep: s.nextStep, prevStep: s.prevStep })),
  );
  const isValid = data.name.trim().length > 0 && data.role !== '';

  return (
    <Stack sx={{ flex: 1, gap: 3 }}>
      {/* Chip de identificacao da etapa */}
      <Chip
        label={t('onboarding.wizard.profileStep')}
        size="small"
        sx={STEP_CHIP_SX}
      />

      <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
        {t('onboarding.wizard.profileTitle')}
      </Typography>

      {/* Campo de nome */}
      <Box
        component={motion.div}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <TextField
          fullWidth
          autoFocus
          label={t('onboarding.wizard.nameLabel')}
          placeholder={t('onboarding.wizard.namePlaceholder')}
          value={data.name}
          onChange={(e) => updateData({ name: e.target.value })}
          sx={authTextFieldSx}
          slotProps={{ htmlInput: { maxLength: 50 } }}
        />
      </Box>

      {/* Selecao de papel */}
      <Box
        component={motion.div}
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mb: 1.5, ml: 0.5 }}
        >
          {t('onboarding.wizard.roleLabel')}
        </Typography>
        <Stack spacing={1.5}>
          {WIZARD_ROLES.map((role) => (
            <Box key={role.id} component={motion.div} variants={staggerItem}>
              <SelectionCard
                selected={data.role === role.id}
                onClick={() => updateData({ role: role.id })}
                icon={<role.icon sx={{ fontSize: 20 }} />}
                label={t(ROLE_I18N_KEYS[role.id])}
                selectionMode="single"
              />
            </Box>
          ))}
        </Stack>
      </Box>

      <StepNavigation onPrev={prevStep} onNext={nextStep} isDisabled={!isValid} />
    </Stack>
  );
}
