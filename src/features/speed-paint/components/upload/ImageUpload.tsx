import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { alpha } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { useAnimationStore } from '../../store/animationStore';
import type { QueuedImage } from '../../types';
import { CYAN_GLOW_SOFT, BRAND_PRIMARY } from '../../../../theme/tokens';

export function ImageUpload() {
  const { setQueue, setCurrentIndex, setBatchMode } = useAnimationStore();

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
        borderColor: isDragActive ? 'primary.main' : 'divider',
        borderRadius: 3,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 260,
        bgcolor: isDragActive
          ? alpha(theme.palette.primary.main, 0.06)
          : alpha(theme.palette.background.paper, 0.4),
        backgroundImage: 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'border-color 200ms, background-color 200ms, box-shadow 200ms',
        boxShadow: isDragActive
          ? `0 0 0 4px ${CYAN_GLOW_SOFT}`
          : 'none',
        '&:hover': {
          borderColor: 'primary.light',
          bgcolor: alpha(theme.palette.background.paper, 0.55),
        },
      })}
    >
      {/* Input oculto conectado ao Button acessível abaixo */}
      <Button
        component="label"
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        sx={{ mt: 2 }}
      >
        Escolher arquivos
        <input {...getInputProps()} style={{ display: 'none' }} />
      </Button>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(BRAND_PRIMARY, 0.1),
          mb: 2.5,
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 28, color: 'primary.main' }} aria-hidden="true" />
      </Box>
      <Typography variant="h6" sx={{ mb: 0.75, fontWeight: 700 }}>
        {isDragActive ? 'Solte as imagens aqui' : 'Envie uma ou mais imagens'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 420 }}>
        Arraste e solte suas imagens aqui, ou use o botão abaixo.
        Suporta JPG, PNG e WebP. Processamento em lote suportado!
      </Typography>
    </Box>
  );
}
