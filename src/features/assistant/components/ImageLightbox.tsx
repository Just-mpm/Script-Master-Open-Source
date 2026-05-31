import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Zoom from '@mui/material/Zoom';
import Close from '@mui/icons-material/Close';
import type { SxProps, Theme } from '@mui/material/styles';
import { useLocale } from '../../../features/i18n';

interface ImageLightboxProps {
  /** Fonte da imagem (data URL ou URL normal) */
  src: string;
  /** Texto alternativo */
  alt: string;
  /** SX aplicado à miniatura (thumbnail) */
  thumbnailSx?: SxProps<Theme>;
}

/**
 * Miniatura de imagem que abre um lightbox (Dialog) ao ser clicada.
 * Usa MUI Dialog com transição Zoom para entrada/saída.
 */
export function ImageLightbox({ src, alt, thumbnailSx }: ImageLightboxProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <Box
        component="img"
        src={src}
        alt={alt}
        onClick={handleOpen}
        sx={{
          cursor: 'zoom-in',
          transition: 'transform 0.15s ease',
          '&:hover': { transform: 'scale(1.05)' },
          ...thumbnailSx,
        }}
      />
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        slots={{ transition: Zoom }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden',
              m: 2,
            },
          },
          backdrop: {
            sx: {
              bgcolor: 'rgba(0, 0, 0, 0.85)',
            },
          },
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconButton
            onClick={handleClose}
            aria-label={t('assistant.messages.closePreview')}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1,
              color: '#fff',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
            }}
          >
            <Close />
          </IconButton>
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        </Box>
      </Dialog>
    </>
  );
}
