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
import { ERROR_MAIN } from '../../../../theme/tokens';
import { glassPanelSx } from '../../../../theme/surfaces';
import { SpeedSelector } from '../SpeedSelector';

export function QueueStaging() {
  const {
    queue,
    setQueue,
    setBatchMode,
    clearQueue,
    speed,
    setSpeed,
    paintSpeed,
    setPaintSpeed,
  } = useAnimationStore();

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
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Fila de Produção
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {queue.length} imagem(ns) na fila. Configure a velocidade padrão abaixo.
          </Typography>
        </Box>

        <Box
          sx={(theme) => ({
            mt: { xs: 2, sm: 0 },
            p: 2,
            bgcolor: alpha(theme.palette.background.default, 0.4),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
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
              border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 200ms',
              '&:hover': {
                borderColor: alpha(theme.palette.common.white, 0.14),
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
          sx={{ color: 'text.secondary' }}
        >
          Cancelar Fila
        </Button>
        <Button
          onClick={startWatching}
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
        >
          Apenas Assistir
        </Button>
        <Button
          onClick={startRecording}
          variant="contained"
          color="secondary"
          startIcon={<VideocamIcon sx={{ fontSize: 18 }} />}
        >
          Gravar Tudo Automático
        </Button>
      </Stack>
    </Paper>
  );
}
