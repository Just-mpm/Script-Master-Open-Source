/**
 * Container principal do wizard de Projeto Manual.
 *
 * 3 seções colapsáveis (StackedHeader) + estado de sucesso após save.
 * Conecta hook useManualProject + useAuth para userId.
 */

import { useCallback, useState } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import toast from 'react-hot-toast';
import { StackedHeader } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { useLocale } from '../../i18n';
import { useManualProject } from '../hooks/useManualProject';
import { ManualProjectStepName } from './ManualProjectStepName';
import { ManualProjectStepAudio } from './ManualProjectStepAudio';
import { ManualProjectStepImages } from './ManualProjectStepImages';
import { ManualProjectSuccess } from './ManualProjectSuccess';
import { useCollapsibleSection } from '../../../hooks/useCollapsibleSection';
import { GAP_RELAXED, RADIUS_XS } from '../../../theme/tokens';

export function ManualProjectForm() {
  const { t } = useLocale();
  const { user } = useAuth();
  const userId = user?.uid;

  const {
    draft,
    addAudio,
    removeAudio,
    addImages,
    removeImage,
    moveImage,
    setName,
    setScript,
    reset,
    canAdvance,
    isSaving,
    save,
  } = useManualProject();

  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  // Estado de colapso de cada seção
  const nameSection = useCollapsibleSection(true);
  const audioSection = useCollapsibleSection(true);
  const imagesSection = useCollapsibleSection(true);

  const handleSave = useCallback(async () => {
    if (!userId) {
      toast.error(t('manualProject.errors.noUser'));
      return;
    }
    if (!canAdvance) {
      toast.error(t('manualProject.errors.saveProject'));
      return;
    }

    const result = await save(userId);

    if (result.ok && result.projectId) {
      setSavedProjectId(result.projectId);
      toast.success(t('manualProject.success.title'));
    } else if (result.errorKind === 'audio_save_failed') {
      toast.error(t('manualProject.errors.saveAudio'));
      // Continua — o projeto foi salvo parcialmente
      if (result.projectId) {
        setSavedProjectId(result.projectId);
      }
    } else if (result.errorKind === 'image_save_failed') {
      toast.error(t('manualProject.errors.saveImages') + ' ' + (result.errorMessage ?? ''));
      if (result.projectId) {
        setSavedProjectId(result.projectId);
      }
    } else {
      toast.error(result.errorMessage ?? t('manualProject.errors.generic'));
    }
  }, [userId, canAdvance, save, t]);

  // ─── Tela de sucesso ───
  if (savedProjectId) {
    return (
      <ManualProjectSuccess
        projectId={savedProjectId}
        projectName={draft.name}
        onCreateAnother={() => {
          setSavedProjectId(null);
          reset();
        }}
      />
    );
  }

  return (
    <Stack spacing={GAP_RELAXED}>
      {/* Live region para anúncios de progresso (a11y) — fora do tab flow */}
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {draft.audioValidation.kind === 'validating' && t('manualProject.liveRegion.progress', { done: 0, total: 1 })}
        {draft.audioValidation.kind === 'valid' && t('manualProject.liveRegion.audioValidated')}
        {draft.audioValidation.kind === 'invalid' && t('manualProject.liveRegion.audioFailed')}
        {isSaving && t('manualProject.actions.saving')}
      </Box>

      <StackedHeader
        variant="glass"
        collapsible
        expanded={nameSection.expanded}
        onToggle={nameSection.onToggle}
        collapseId={nameSection.collapseId}
        title={t('manualProject.stepName.title')}
        description={t('manualProject.stepName.description')}
      >
        <ManualProjectStepName
          name={draft.name}
          script={draft.script}
          onNameChange={setName}
          onScriptChange={setScript}
        />
      </StackedHeader>

      <StackedHeader
        variant="glass"
        collapsible
        expanded={audioSection.expanded}
        onToggle={audioSection.onToggle}
        collapseId={audioSection.collapseId}
        title={t('manualProject.stepAudio.title')}
        description={t('manualProject.stepAudio.description')}
      >
        <ManualProjectStepAudio
          audio={draft.audio}
          validation={draft.audioValidation}
          onAudioSelected={addAudio}
          onRemove={removeAudio}
        />
      </StackedHeader>

      <StackedHeader
        variant="glass"
        collapsible
        expanded={imagesSection.expanded}
        onToggle={imagesSection.onToggle}
        collapseId={imagesSection.collapseId}
        title={t('manualProject.stepImages.title')}
        description={t('manualProject.stepImages.description')}
      >
        <ManualProjectStepImages
          images={draft.images}
          onImagesSelected={addImages}
          onMove={moveImage}
          onRemove={removeImage}
        />
      </StackedHeader>

      {/* Botão de salvar */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 16,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          pt: 2,
          pb: 1,
          borderRadius: RADIUS_XS,
        }}
      >
        <Stack
          direction="column"
          spacing={1}
          sx={(theme) => ({
            alignItems: 'center',
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(8px)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[8],
          })}
        >
          {!userId && (
            <Typography variant="caption" color="error">
              {t('manualProject.errors.noUser')}
            </Typography>
          )}
          <Button
            variant="contained"
            size="large"
            onClick={() => void handleSave()}
            disabled={!canAdvance || isSaving || !userId}
            sx={{ minWidth: 240 }}
          >
            {isSaving ? t('manualProject.actions.saving') : t('manualProject.actions.save')}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
