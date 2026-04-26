import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VideocamIcon from '@mui/icons-material/Videocam';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { alpha } from '@mui/material/styles';
import { useAnimationStore } from '../../store/animationStore';
import {
  ERROR_MAIN,
  BRAND_GRADIENT,
  BRAND_GRADIENT_HOVER,
  BRAND_GLOW,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  BRAND_SECONDARY_LIGHT,
  BRAND_SECONDARY_GLOW_SOFT,
  WHITE_06,
} from '../../../../theme/tokens';
import { glassPanelSx } from '../../../../theme/surfaces';
import { SpeedSelector } from '../SpeedSelector';

export function QueueStaging() {
  const queue = useAnimationStore((s) => s.queue);
  const speed = useAnimationStore((s) => s.speed);
  const paintSpeed = useAnimationStore((s) => s.paintSpeed);
  const setQueue = useAnimationStore((s) => s.setQueue);
  const setBatchMode = useAnimationStore((s) => s.setBatchMode);
  const clearQueue = useAnimationStore((s) => s.clearQueue);
  const setSpeed = useAnimationStore((s) => s.setSpeed);
  const setPaintSpeed = useAnimationStore((s) => s.setPaintSpeed);

  const handleRemove = (id: string) => {
    setQueue((prev) => prev.filter((img) => img.id !== id));
  };

  const startWatching = () => setBatchMode('watch');
  const startRecording = () => setBatchMode('record');

  if (queue.length === 0) return null;

  return (
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
            Fila de Produção
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {queue.length} imagem(ns) na fila. Configure a velocidade padrão abaixo.
          </Typography>
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
          <SpeedSelector label="Draw" value={speed} onChange={setSpeed} variant="panel" />
          <SpeedSelector label="Paint" value={paintSpeed} onChange={setPaintSpeed} variant="panel" />
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
        {queue.map((img, index) => (
          <Box
            key={img.id}
            sx={(theme) => ({
              position: 'relative',
              bgcolor: alpha(theme.palette.background.default, 0.5),
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${WHITE_06}`,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
              '&:hover': {
                borderColor: alpha(theme.palette.common.white, 0.14),
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px ${alpha(BRAND_PRIMARY, 0.06)}`,
              },
            })}
          >
            <Box
              component="img"
              src={img.dataUrl}
              alt={img.filename}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            />
            <Box
              sx={(theme) => ({
                position: 'absolute',
                top: 8,
                left: 8,
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
            <Tooltip title="Remover Imagem">
              <span>
                <IconButton
                  onClick={(e) => { e.stopPropagation(); handleRemove(img.id); }}
                  size="small"
                  aria-label={`Remover ${img.filename}`}
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
        ))}
      </Box>

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
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              color: ERROR_MAIN,
              bgcolor: alpha(ERROR_MAIN, 0.06),
            },
          }}
        >
          Cancelar Fila
        </Button>
        <Button
          onClick={startWatching}
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
          sx={{
            background: BRAND_GRADIENT,
            boxShadow: BRAND_GLOW,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: BRAND_GRADIENT_HOVER,
            },
          }}
        >
          Apenas Assistir
        </Button>
        <Button
          onClick={startRecording}
          variant="contained"
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
          Gravar Tudo Automático
        </Button>
      </Stack>
    </Paper>
  );
}
