/**
 * Passo 1: Nome do projeto + script (opcional).
 *
 * Campo de texto + textarea. Validação inline do nome via validateProjectName.
 * Sem dependência de estado externo — opera apenas em props callbacks.
 */

import { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLocale } from '../../i18n';
import { validateProjectName } from '../lib/manualProjectValidation';

interface ManualProjectStepNameProps {
  name: string;
  script: string;
  onNameChange: (name: string) => void;
  onScriptChange: (script: string) => void;
}

export function ManualProjectStepName({
  name,
  script,
  onNameChange,
  onScriptChange,
}: ManualProjectStepNameProps) {
  const { t } = useLocale();

  const nameError = useMemo<string | null>(() => {
    if (name.trim().length === 0) return null; // silencioso até usuário digitar
    const result = validateProjectName(name);
    return result.ok ? null : result.errorMessage ?? null;
  }, [name]);

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onNameChange(event.target.value);
    },
    [onNameChange],
  );

  const handleScriptChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onScriptChange(event.target.value);
    },
    [onScriptChange],
  );

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          {t('manualProject.stepName.description')}
        </Typography>

        <TextField
          value={name}
          onChange={handleNameChange}
          label={t('manualProject.stepName.nameLabel')}
          placeholder={t('manualProject.stepName.namePlaceholder')}
          fullWidth
          required
          error={Boolean(nameError)}
          helperText={nameError ?? ' '}
          slotProps={{
            htmlInput: {
              'aria-label': t('manualProject.stepName.nameLabel'),
              maxLength: 100,
            },
          }}
        />

        <TextField
          value={script}
          onChange={handleScriptChange}
          label={t('manualProject.stepName.scriptLabel')}
          placeholder={t('manualProject.stepName.scriptPlaceholder')}
          fullWidth
          multiline
          minRows={4}
          maxRows={12}
          helperText={t('manualProject.stepName.scriptHelper')}
          slotProps={{
            htmlInput: {
              'aria-label': t('manualProject.stepName.scriptLabel'),
              maxLength: 25_000,
            },
          }}
        />
      </Stack>
    </Box>
  );
}
