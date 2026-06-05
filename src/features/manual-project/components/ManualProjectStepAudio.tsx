/**
 * Passo 2: Upload de áudio.
 *
 * Combina dropzone (react-dropzone) + preview (ManualProjectAudioPreview).
 * Valida via hook useManualProject.addAudio; mostra estado de validação inline.
 */

import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloudUpload from '@mui/icons-material/CloudUpload';
import { alpha } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { useLocale } from '../../i18n';
import { ACCEPTED_AUDIO_MIMES, type AudioUploadItem, type ValidationState } from '../types';
import { ManualProjectAudioPreview } from './ManualProjectAudioPreview';
import {
  BRAND_PRIMARY_LIGHT,
  BRAND_PRIMARY_GLOW_SOFT,
  GAP_DEFAULT,
  RADIUS_SM,
} from '../../../theme/tokens';

interface ManualProjectStepAudioProps {
  audio: AudioUploadItem | null;
  validation: ValidationState;
  onAudioSelected: (file: File) => void;
  onRemove: () => void;
}

function formatDurationPt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSizeBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ManualProjectStepAudio({
  audio,
  validation,
  onAudioSelected,
  onRemove,
}: ManualProjectStepAudioProps) {
  const { t } = useLocale();

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      if (!file) return;
      await onAudioSelected(file);
    },
    [onAudioSelected],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_AUDIO_MIMES.reduce<Record<string, string[]>>((acc, mime) => {
      acc[mime] = [];
      return acc;
    }, {}),
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  });

  // Exibe toast em erro de validação
  // (Toast é disparado pelo hook via analytics — não duplicar)

  if (audio) {
    return (
      <Stack spacing={GAP_DEFAULT}>
        <ManualProjectAudioPreview
          src={audio.previewUrl}
          durationSec={audio.durationSec}
          sizeBytes={audio.sizeBytes}
          fileName={audio.file.name}
          onReplace={open}
          onRemove={onRemove}
          formatDuration={formatDurationPt}
          formatSize={formatSizeBytes}
          playAriaLabel={t('common.continue')}
          pauseAriaLabel={t('common.stop')}
          replaceLabel={t('manualProject.stepAudio.replace')}
          removeLabel={t('manualProject.stepAudio.remove')}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={GAP_DEFAULT}>
      <Box
        {...getRootProps()}
        role="button"
        tabIndex={0}
        aria-label={t('manualProject.stepAudio.dropzoneLabel')}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        }}
        sx={(theme) => ({
          width: '100%',
          p: { xs: 4, md: 5 },
          border: '2px dashed',
          borderColor: isDragActive ? BRAND_PRIMARY_LIGHT : 'divider',
          borderRadius: RADIUS_SM,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          bgcolor: isDragActive
            ? alpha(BRAND_PRIMARY_LIGHT, 0.06)
            : alpha(theme.palette.background.paper, 0.4),
          transition: 'border-color 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            borderColor: BRAND_PRIMARY_LIGHT,
            bgcolor: alpha(theme.palette.background.paper, 0.55),
            boxShadow: `0 0 0 1px ${BRAND_PRIMARY_GLOW_SOFT}`,
          },
        })}
      >
        <input {...getInputProps()} aria-label={t('manualProject.stepAudio.browse')} />
        <CloudUpload sx={{ fontSize: 40, color: 'primary.main', mb: 1.5 }} aria-hidden="true" />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {isDragActive
            ? t('manualProject.stepAudio.dropzoneLabel')
            : t('manualProject.stepAudio.dropzoneLabel')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 480 }}>
          {t('manualProject.stepAudio.dropzoneHint')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={(event) => {
            event.stopPropagation();
            open();
          }}
          sx={{ mt: 2 }}
        >
          {t('manualProject.stepAudio.browse')}
        </Button>
      </Box>

      {validation.kind === 'validating' && (
        <Typography variant="caption" color="text.secondary">
          {t('manualProject.stepAudio.validating')}
        </Typography>
      )}
      {validation.kind === 'invalid' && (
        <Box
          role="alert"
          sx={(theme) => ({
            p: 1.5,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
          })}
        >
          <Typography variant="body2" color="error">
            {validation.message}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
