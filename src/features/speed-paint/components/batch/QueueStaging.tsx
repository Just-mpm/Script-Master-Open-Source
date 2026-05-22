import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VideocamIcon from '@mui/icons-material/Videocam';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { alpha } from '@mui/material/styles';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';
import { TransitionGroup } from 'react-transition-group';
import { useAnimationStore } from '../../store/animationStore';
import type { QueuedImage } from '../../types';
import { useLocale, pluralKey } from '../../../i18n';
import {
  ERROR_MAIN,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  BRAND_SECONDARY_LIGHT,
  BRAND_SECONDARY_GLOW_SOFT,
  WHITE_06,
} from '../../../../theme/tokens';
import { glassPanelSx } from '../../../../theme/surfaces';
import { AnimationDurationSelector } from '../AnimationDurationSelector';

interface SortableQueueImageProps {
  img: QueuedImage;
  index: number;
}

function SortableQueueImage({ img, index }: SortableQueueImageProps) {
  const { t } = useLocale();
  const removeFromQueue = useAnimationStore((s) => s.removeFromQueue);
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id: img.id,
    index,
  });

  return (
    <Box
      ref={ref}
      sx={(theme) => ({
        position: 'relative',
        bgcolor: alpha(theme.palette.background.default, 0.5),
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${isDropTarget ? BRAND_PRIMARY : WHITE_06}`,
        aspectRatio: '1/1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDragging ? 0.3 : 1,
        transition:
          'border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, opacity 0.2s ease',
        ...(isDropTarget && {
          boxShadow: `0 0 16px ${alpha(BRAND_PRIMARY, 0.3)}`,
        }),
        '&:hover': {
          borderColor: alpha(theme.palette.common.white, 0.14),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(BRAND_PRIMARY, 0.06)}`,
        },
      })}
    >
      {/* Drag handle */}
      <IconButton
        ref={handleRef}
        size="small"
        aria-label={t('speedPaint.queueReorderImageAria', { filename: img.filename })}
        aria-roledescription="sortable"
        sx={(theme) => ({
          position: 'absolute',
          top: 6,
          left: 6,
          width: 28,
          height: 28,
          minHeight: 'unset',
          minWidth: 'unset',
          bgcolor: alpha(theme.palette.common.black, 0.6),
          backdropFilter: 'blur(6px)',
          color: 'common.white',
          cursor: 'grab',
          zIndex: 1,
          '&:active': { cursor: 'grabbing' },
          '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.8) },
          '& .MuiSvgIcon-root': { fontSize: 16 },
        })}
      >
        <DragIndicatorIcon />
      </IconButton>

      {/* Number badge */}
      <Box
        sx={(theme) => ({
          position: 'absolute',
          top: 8,
          left: 40,
          bgcolor: alpha(theme.palette.common.black, 0.6),
          backdropFilter: 'blur(6px)',
          color: 'common.white',
          fontSize: '0.75rem',
          fontWeight: 700,
          px: 1,
          py: 0.25,
          borderRadius: 1,
          letterSpacing: '0.02em',
        })}
      >
        #{index + 1}
      </Box>

      <Box
        component="img"
        src={img.dataUrl}
        alt={img.filename}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
      />

      <Tooltip title={t('speedPaint.queueRemoveImage')}>
        <span>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              removeFromQueue(img.id);
            }}
            size="small"
            aria-label={t('speedPaint.queueRemoveImageAria', { filename: img.filename })}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 28,
              height: 28,
              minHeight: 'unset',
              minWidth: 'unset',
              bgcolor: alpha(ERROR_MAIN, 0.75),
              color: 'common.white',
              '&:hover': { bgcolor: ERROR_MAIN },
              '& .MuiSvgIcon-root': { fontSize: 16 },
            }}
          >
            <DeleteIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Box
        sx={(theme) => ({
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          p: 1,
          background: `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.8)}, transparent)`,
        })}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            fontSize: '0.625rem',
          }}
        >
          {img.filename}
        </Typography>
      </Box>
    </Box>
  );
}

export function QueueStaging() {
  const { t } = useLocale();
  const queue = useAnimationStore((s) => s.queue);
  const animationDuration = useAnimationStore((s) => s.animationDuration);
  const setBatchMode = useAnimationStore((s) => s.setBatchMode);
  const clearQueue = useAnimationStore((s) => s.clearQueue);
  const setAnimationDuration = useAnimationStore((s) => s.setAnimationDuration);
  const reorderQueue = useAnimationStore((s) => s.reorderQueue);
  const failedCount = queue.filter((item) => item.status === 'failed').length;
  const eligibleCount = queue.length - failedCount;

  const startWatching = () => setBatchMode('watch');
  const startRecording = () => setBatchMode('record');

  if (queue.length === 0) return null;

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        const { source } = event.operation;
        if (isSortable(source)) {
          const { initialIndex, index } = source;
          if (initialIndex !== index) {
            reorderQueue(initialIndex, index);
          }
        }
      }}
    >
      <Paper
        elevation={0}
        sx={(theme) => ({
          ...glassPanelSx(theme),
          p: 3,
          maxWidth: 1024,
          mx: 'auto',
        })}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            mb: 3,
            pb: 3,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.03em', mb: 0.5 }}>
              {t('speedPaint.queueTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {t(pluralKey('speedPaint.queueDescription', queue.length), { count: queue.length })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mt: 1 }}>
              {t(pluralKey('speedPaint.queueFinalVideoSummary', eligibleCount), { eligible: eligibleCount })}
            </Typography>
            {failedCount > 0 && (
              <Alert severity={eligibleCount > 0 ? 'warning' : 'error'} sx={{ mt: 1.5, borderRadius: 2 }}>
                {eligibleCount > 0
                  ? t(pluralKey('speedPaint.queueFailedSummary', failedCount), { failed: failedCount })
                  : t('speedPaint.queueNoEligibleSummary')}
              </Alert>
            )}
          </Box>

          <Box
            sx={(theme) => ({
              mt: { xs: 2, sm: 0 },
              p: 2,
              bgcolor: alpha(theme.palette.background.default, 0.4),
              borderRadius: 2,
              border: `1px solid ${WHITE_06}`,
            })}
          >
            <AnimationDurationSelector
              duration={animationDuration}
              onDurationChange={setAnimationDuration}
              helperText="A duração vale para cada imagem do lote."
            />
          </Box>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 3,
            maxHeight: '40vh',
            overflowY: 'auto',
            pr: 0.5,
            pb: 1,
          }}
        >
          <TransitionGroup component={null}>
            {queue.map((img, index) => (
              <Collapse key={img.id} timeout={300}>
                <SortableQueueImage
                  img={img}
                  index={index}
                />
              </Collapse>
            ))}
          </TransitionGroup>
        </Box>

        <DragOverlay>
          {(source) => {
            if (!source) return null;
            const draggedImg = queue.find((img) => img.id === source.id);
            if (!draggedImg) return null;
            return (
              <Box
                sx={(theme) => ({
                  position: 'relative',
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(BRAND_PRIMARY, 0.5)}`,
                  aspectRatio: '1/1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  transform: 'scale(1.05)',
                  boxShadow: `0 12px 32px ${alpha(BRAND_PRIMARY, 0.2)}`,
                })}
              >
                <Box
                  component="img"
                  src={draggedImg.dataUrl}
                  alt={draggedImg.filename}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }}
                />
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    p: 1,
                    background: `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.8)}, transparent)`,
                  })}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      fontSize: '0.625rem',
                    }}
                  >
                    {draggedImg.filename}
                  </Typography>
                </Box>
              </Box>
            );
          }}
        </DragOverlay>

        <Stack
          direction="row"
          sx={{
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1.5,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Button
            onClick={clearQueue}
            startIcon={<CancelIcon sx={{ fontSize: 18 }} />}
            sx={{
              color: 'text.secondary',
              display: 'inline-flex',
              alignItems: 'center',
              lineHeight: 1.5,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                color: ERROR_MAIN,
                bgcolor: alpha(ERROR_MAIN, 0.06),
              },
            }}
          >
            {t('speedPaint.queueCancel')}
          </Button>
          <Button
            onClick={startWatching}
            variant="outlined"
            color="inherit"
            startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
            sx={{
              fontWeight: 600,
              letterSpacing: '-0.01em',
              borderColor: alpha(BRAND_PRIMARY, 0.35),
              color: 'text.primary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: BRAND_PRIMARY,
                bgcolor: alpha(BRAND_PRIMARY, 0.08),
              },
            }}
          >
            {t('speedPaint.queuePreview')}
          </Button>
          <Button
            onClick={startRecording}
            variant="contained"
            disabled={eligibleCount === 0}
            startIcon={<VideocamIcon sx={{ fontSize: 18 }} />}
            sx={{
              background: `linear-gradient(135deg, ${BRAND_SECONDARY} 0%, ${BRAND_SECONDARY_LIGHT} 100%)`,
              boxShadow: `0 12px 32px ${BRAND_SECONDARY_GLOW_SOFT}`,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: `linear-gradient(135deg, ${BRAND_SECONDARY_LIGHT} 0%, ${BRAND_SECONDARY} 100%)`,
              },
            }}
          >
            {t('speedPaint.queueExportSingleVideo')}
          </Button>
        </Stack>
      </Paper>
    </DragDropProvider>
  );
}
