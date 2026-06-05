/**
 * Grid de imagens com drag-and-drop reordenável (@dnd-kit) + botões ↑↓ mobile.
 *
 * - Desktop: arrastar com mouse/teclado (DnD-kit)
 * - Mobile/touch: botões ↑↓ explícitos
 * - Botão ✕ para remover
 * - a11y: aria-roledescription="sortable" no grid, aria-label em cada item
 */

import { useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Close from '@mui/icons-material/Close';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useLocale } from '../../i18n';
import { GAP_DEFAULT, RADIUS_SM } from '../../../theme/tokens';
import type { ImageUploadItem } from '../types';

interface ManualProjectImageGridProps {
  images: ImageUploadItem[];
  onMove: (fromIndex: number, toIndex: number, totalCount: number) => void;
  onRemove: (localId: string) => void;
}

interface SortableImageProps {
  image: ImageUploadItem;
  index: number;
  totalImages: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  ariaLabels: { remove: string; up: string; down: string };
}

function SortableImage({
  image,
  index,
  totalImages,
  onMoveUp,
  onMoveDown,
  onRemove,
  ariaLabels,
}: SortableImageProps) {
  const { ref, isDragging } = useSortable({
    id: image.localId,
    index,
    group: 'manual-project-images',
  });

  return (
    <Box
      ref={ref}
      role="listitem"
      aria-roledescription="sortable"
      aria-label={`Cena ${index + 1} de ${totalImages}`}
      sx={(theme) => ({
        position: 'relative',
        borderRadius: RADIUS_SM,
        overflow: 'hidden',
        aspectRatio: '16 / 9',
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        transition: 'transform 0.15s ease, opacity 0.15s ease',
      })}
    >
      <Box
        component="img"
        src={image.previewUrl}
        alt={`Cena ${index + 1}`}
        loading="lazy"
        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Badge de posição */}
      <Box
        sx={(theme) => ({
          position: 'absolute',
          top: 4,
          left: 4,
          minWidth: 28,
          height: 28,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.9),
          color: 'primary.contrastText',
          fontWeight: 700,
          fontSize: '0.75rem',
        })}
      >
        #{index + 1}
      </Box>

      {/* Controles: ↑ ↓ ✕ */}
      <Stack
        direction="row"
        spacing={0}
        sx={(theme) => ({
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          borderRadius: 1,
        })}
      >
        <IconButton
          size="small"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={ariaLabels.up.replace('{number}', String(index + 1))}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <KeyboardArrowUp fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={onMoveDown}
          disabled={index === totalImages - 1}
          aria-label={ariaLabels.down.replace('{number}', String(index + 1))}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <KeyboardArrowDown fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={onRemove}
          aria-label={ariaLabels.remove.replace('{number}', String(index + 1))}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

export function ManualProjectImageGrid({
  images,
  onMove,
  onRemove,
}: ManualProjectImageGridProps) {
  const { t } = useLocale();

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index > 0) onMove(index, index - 1, images.length);
    },
    [onMove, images.length],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index < images.length - 1) onMove(index, index + 1, images.length);
    },
    [onMove, images.length],
  );

  const ariaLabels = {
    remove: t('manualProject.stepImages.removeAria'),
    up: t('manualProject.stepImages.moveUpAria'),
    down: t('manualProject.stepImages.moveDownAria'),
  };

  return (
    <Box
      role="list"
      aria-roledescription="sortable"
      aria-label={t('manualProject.stepImages.title')}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
        },
        gap: GAP_DEFAULT,
      }}
    >
      <DragDropProvider
        onDragEnd={(event) => {
          const { source, target } = event.operation;
          if (source && target && source.id !== target.id) {
            const fromIndex = images.findIndex((img) => img.localId === source.id);
            const toIndex = images.findIndex((img) => img.localId === target.id);
            if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
              onMove(fromIndex, toIndex, images.length);
            }
          }
        }}
      >
        {images.map((image, index) => (
          <SortableImage
            key={image.localId}
            image={image}
            index={index}
            totalImages={images.length}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            onRemove={() => onRemove(image.localId)}
            ariaLabels={ariaLabels}
          />
        ))}
      </DragDropProvider>
    </Box>
  );
}
