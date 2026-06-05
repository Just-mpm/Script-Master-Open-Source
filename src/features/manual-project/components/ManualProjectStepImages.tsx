/**
 * Passo 3: Upload de imagens + grid ordenável.
 *
 * Combina dropzone multi-arquivo (react-dropzone) + grid (ManualProjectImageGrid).
 * Mostra contador X de Y e botão "Adicionar mais" quando há imagens.
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
import { ACCEPTED_IMAGE_MIMES, MAX_IMAGES, type ImageUploadItem } from '../types';
import { ManualProjectImageGrid } from './ManualProjectImageGrid';
import {
  BRAND_PRIMARY_LIGHT,
  BRAND_PRIMARY_GLOW_SOFT,
  GAP_DEFAULT,
  RADIUS_SM,
} from '../../../theme/tokens';

interface ManualProjectStepImagesProps {
  images: ImageUploadItem[];
  onImagesSelected: (files: File[]) => void | Promise<void>;
  onMove: (fromIndex: number, toIndex: number, totalCount: number) => void;
  onRemove: (localId: string) => void;
}

export function ManualProjectStepImages({
  images,
  onImagesSelected,
  onMove,
  onRemove,
}: ManualProjectStepImagesProps) {
  const { t } = useLocale();

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      await onImagesSelected(acceptedFiles);
    },
    [onImagesSelected],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_IMAGE_MIMES.reduce<Record<string, string[]>>((acc, mime) => {
      acc[mime] = [];
      return acc;
    }, {}),
    noClick: true,
    noKeyboard: true,
  });

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <Stack spacing={GAP_DEFAULT}>
      <Typography variant="body2" color="text.secondary">
        {t('manualProject.stepImages.description')}
      </Typography>

      {/* Contador */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          {t('manualProject.stepImages.counter', {
            count: images.length,
            max: MAX_IMAGES,
          })}
        </Typography>
        {canAddMore && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={open}
          >
            {images.length === 0
              ? t('manualProject.stepImages.browse')
              : t('manualProject.stepImages.addMore')}
          </Button>
        )}
      </Stack>

      {/* Dropzone compacto (sempre presente para drag-and-drop adicional) */}
      <Box
        {...getRootProps()}
        role="region"
        aria-label={t('manualProject.stepImages.dropzoneLabel')}
        aria-describedby="manual-project-images-help"
        sx={{
          width: '100%',
          p: { xs: 3, md: 4 },
          border: '2px dashed',
          borderColor: isDragActive ? BRAND_PRIMARY_LIGHT : 'divider',
          borderRadius: RADIUS_SM,
          cursor: canAddMore ? 'pointer' : 'not-allowed',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 120,
          bgcolor: isDragActive
            ? alpha(BRAND_PRIMARY_LIGHT, 0.06)
            : 'transparent',
          transition: 'border-color 0.2s ease, background-color 0.2s ease',
          opacity: canAddMore ? 1 : 0.4,
          '&:hover': canAddMore
            ? {
                borderColor: BRAND_PRIMARY_LIGHT,
                boxShadow: `0 0 0 1px ${BRAND_PRIMARY_GLOW_SOFT}`,
              }
            : {},
        }}
      >
        <input {...getInputProps()} disabled={!canAddMore} aria-describedby="manual-project-images-help" />
        <CloudUpload sx={{ fontSize: 28, color: 'primary.main', mb: 0.5 }} aria-hidden="true" />
        <Typography id="manual-project-images-help" variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('manualProject.stepImages.dropzoneHint')}
        </Typography>
      </Box>

      {/* Hint de reordenação */}
      {images.length > 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {t('manualProject.stepImages.reorderHint')}
        </Typography>
      )}

      {/* Grid ou empty state */}
      {images.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {t('manualProject.stepImages.empty')}
          </Typography>
        </Box>
      ) : (
        <ManualProjectImageGrid
          images={images}
          onMove={onMove}
          onRemove={onRemove}
        />
      )}
    </Stack>
  );
}
