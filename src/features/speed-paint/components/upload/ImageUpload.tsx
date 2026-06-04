import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { alpha } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { useAnimationStore } from '../../store/animationStore';
import type { QueuedImage } from '../../types';
import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_LIGHT,
  BRAND_PRIMARY_GLOW,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_GRADIENT, RADIUS_SM } from '../../../../theme/tokens';
import { useLocale } from '../../../../features/i18n';

export function ImageUpload() {
  const { t } = useLocale();
  const setQueue = useAnimationStore((s) => s.setQueue);
  const setCurrentIndex = useAnimationStore((s) => s.setCurrentIndex);
  const setBatchMode = useAnimationStore((s) => s.setBatchMode);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const newQueue: QueuedImage[] = [];

    for (const file of acceptedFiles) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      newQueue.push({
        id: Math.random().toString(36).substring(7),
        dataUrl,
        filename: file.name,
        status: 'pending',
      });
    }

    if (newQueue.length > 0) {
      setQueue((prev) => [...prev, ...newQueue]);
      setCurrentIndex(0);
      setBatchMode('idle');
    }
  }, [setQueue, setCurrentIndex, setBatchMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
  });

  return (
    <Box
      {...getRootProps()}
      sx={(theme) => ({
        width: '100%',
        maxWidth: 672,
        mx: 'auto',
        p: 6,
        border: '2px dashed',
        borderColor: isDragActive ? BRAND_PRIMARY_LIGHT : 'divider',
        borderRadius: RADIUS_SM,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 260,
        bgcolor: isDragActive
          ? alpha(BRAND_PRIMARY, 0.06)
          : alpha(theme.palette.background.paper, 0.4),
        backgroundImage: 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isDragActive
          ? `0 0 0 4px ${BRAND_PRIMARY_GLOW_SOFT}, 0 0 32px ${BRAND_PRIMARY_GLOW}`
          : 'none',
        transform: isDragActive ? 'scale(1.01)' : 'none',
        '&:hover': {
          borderColor: BRAND_PRIMARY_LIGHT,
          bgcolor: alpha(theme.palette.background.paper, 0.55),
          boxShadow: `0 0 0 1px ${BRAND_PRIMARY_GLOW_SOFT}`,
        },
      })}
    >
      {/* Ícone de upload */}
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: BRAND_GRADIENT,
          opacity: isDragActive ? 0.25 : 0.15,
          mb: 2.5,
          transition: 'opacity 0.3s ease',
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 28, color: BRAND_PRIMARY_LIGHT }} aria-hidden="true" />
      </Box>
<Typography variant="h5" sx={{ mb: 0.75, fontWeight: 700, letterSpacing: '-0.02em' }}>
        {isDragActive ? t('speedPaint.uploadDragActive') : t('speedPaint.uploadPrompt')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 420, lineHeight: 1.7 }}>
        {t('speedPaint.uploadDescription')}
      </Typography>
      {/* Botão de escolha de arquivo */}
      <Button
        component="label"
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        sx={{
          mt: 2,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: BRAND_PRIMARY_LIGHT,
            boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
          },
        }}
      >
        {t('speedPaint.chooseFiles')}
        <input {...getInputProps()} style={{ display: 'none' }} />
      </Button>
    </Box>
  );
}
