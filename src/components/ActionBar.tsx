import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Bookmark from '@mui/icons-material/Bookmark';
import Check from '@mui/icons-material/Check';
import Download from '@mui/icons-material/Download';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Stop from '@mui/icons-material/Stop';
import { downloadFile } from '../lib/download';
import { useGlobalAudioActions, useGlobalAudioState } from '../contexts/AudioContext';
import { APP_ACTION_BAR_BOTTOM, BRAND_GRADIENT, BRAND_GRADIENT_HOVER, BRAND_GLOW, BRAND_GLOW_FOCUS, WHITE_08 } from '../theme/tokens';
import { glassSurfaceSx } from '../theme/surfaces';

interface ActionBarProps {
  isGenerating: boolean;
  audioUrl: string | null;
  statusText: string;
  generationProgress: number;
  handleDownload: () => void;
  handleCancel: () => void;
  handleSaveToLibrary?: () => void;
  isSaved?: boolean;
  scenes?: { imageUrl: string; timestamp: number }[];
}

export function ActionBar({
  isGenerating,
  audioUrl,
  statusText,
  generationProgress,
  handleDownload,
  handleCancel,
  handleSaveToLibrary,
  isSaved,
  scenes = []
}: ActionBarProps) {
  const [downloadAnchorEl, setDownloadAnchorEl] = React.useState<HTMLElement | null>(null);
  const { isPlaying, progress, currentTime, duration, formatTime } = useGlobalAudioState();
  const { toggle, seek } = useGlobalAudioActions();

  if (!isGenerating && !audioUrl) return null;

  const showPlayer = !!audioUrl;
  const showProgressBar = isGenerating && !audioUrl;
  const isImagePhase = isGenerating && audioUrl;
  const isDownloadMenuOpen = Boolean(downloadAnchorEl);
  const progressValue = Math.round(progress);

  const closeDownloadMenu = () => setDownloadAnchorEl(null);

  const seekToPercentage = (nextProgress: number) => {
    const clampedProgress = Math.min(100, Math.max(0, nextProgress));
    seek(clampedProgress);
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickedPosition = event.clientX - rect.left;
    const nextProgress = (clickedPosition / rect.width) * 100;
    seekToPercentage(nextProgress);
  };

  const handleProgressKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 1;
    const pageStep = 10;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        seekToPercentage(progressValue + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        seekToPercentage(progressValue - step);
        break;
      case 'PageUp':
        event.preventDefault();
        seekToPercentage(progressValue + pageStep);
        break;
      case 'PageDown':
        event.preventDefault();
        seekToPercentage(progressValue - pageStep);
        break;
      case 'Home':
        event.preventDefault();
        seekToPercentage(0);
        break;
      case 'End':
        event.preventDefault();
        seekToPercentage(100);
        break;
      default:
        break;
    }
  };

  const handleDownloadAllImages = async () => {
    for (const [index, sceneItem] of scenes.entries()) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      await downloadFile(sceneItem.imageUrl, `cena-${index}.png`);
    }

    closeDownloadMenu();
  };

  return (
    <Box
      role="region"
      aria-label="Controles de áudio e geração"
      sx={{
        position: 'fixed',
        left: '50%',
        bottom: APP_ACTION_BAR_BOTTOM,
        transform: 'translateX(-50%)',
        zIndex: 1400,
        width: '100%',
        px: { xs: 2, sm: 3 },
        pointerEvents: 'none',
      }}
    >
      <Stack spacing={1.5} alignItems="center">
      {isImagePhase && (
        <Paper
          variant="outlined"
          sx={(theme) => ({
            ...glassSurfaceSx(theme),
            width: '100%',
            maxWidth: 680,
            px: 2,
            py: 1.25,
            borderRadius: 999,
            pointerEvents: 'auto',
          })}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {statusText || 'Gerando cenas visuais...'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                  {generationProgress}%
                </Typography>
              </Stack>
                <LinearProgress
                variant="determinate"
                value={generationProgress}
                sx={{
                  mt: 0.5,
                  height: 8,
                  borderRadius: 999,
                    bgcolor: 'action.hover',
                }}
              />
            </Box>

            <Tooltip title="Cancelar geração de imagens">
              <IconButton onClick={handleCancel} color="error" sx={{ pointerEvents: 'auto' }}>
                <Stop sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      )}

        <Paper
          variant="outlined"
          sx={(theme) => ({
            ...glassSurfaceSx(theme),
            width: '100%',
            maxWidth: 1120,
            borderRadius: { xs: 4, md: 999 },
            px: { xs: 1.5, sm: 2, md: 3 },
            py: { xs: 1.5, md: 1.75 },
            pointerEvents: 'auto',
          })}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1.5, md: 2 }}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {showProgressBar ? (
                <Stack spacing={1.25} role="status" aria-live="polite">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CircularProgress size={18} thickness={5} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', flex: 1 }} noWrap>
                      {statusText || 'Sintetizando voz...'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                      {generationProgress}%
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={generationProgress}
                    sx={{
                      height: 10,
                      borderRadius: 999,
                      bgcolor: WHITE_08,
                    }}
                  />
                </Stack>
              ) : showPlayer ? (
                <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} alignItems="center">
                    <IconButton
                      onClick={() => toggle()}
                    aria-label={isPlaying ? 'Pausar áudio' : 'Ouvir áudio'}
                    aria-pressed={isPlaying}
                    color="primary"
                    sx={{
                      color: 'primary.contrastText',
                          background: BRAND_GRADIENT,
                      boxShadow: BRAND_GLOW,
                      '&:hover': {
                            background: BRAND_GRADIENT_HOVER,
                      },
                    }}
                  >
                    {isPlaying ? <Stop sx={{ fontSize: 16 }} /> : <PlayArrow sx={{ fontSize: 16 }} />}
                  </IconButton>

                  <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatTime(currentTime)}
                      </Typography>

                      <Box
                        onClick={handleProgressClick}
                        role="slider"
                        aria-label="Progresso do áudio"
                        aria-orientation="horizontal"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressValue}
                        aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
                        tabIndex={0}
                        onKeyDown={handleProgressKeyDown}
                        sx={{
                          position: 'relative',
                          flex: 1,
                          height: 10,
                          borderRadius: 999,
                           bgcolor: WHITE_08,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          outline: 'none',
                          '&:focus-visible': {
                            boxShadow: BRAND_GLOW_FOCUS,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            width: `${progress}%`,
                            background: BRAND_GRADIENT,
                          }}
                        />
                      </Box>

                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatTime(duration)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              ) : null}
            </Box>

            {!isImagePhase && (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                {showPlayer && handleSaveToLibrary ? (
                  <>
                    <Tooltip title={isSaved ? 'Áudio salvo na biblioteca' : 'Salvar áudio na biblioteca'}>
                      <span>
                        <IconButton
                          onClick={handleSaveToLibrary}
                          disabled={isSaved}
                          color={isSaved ? 'success' : 'default'}
                          aria-label={isSaved ? 'Áudio salvo na biblioteca' : 'Salvar áudio na biblioteca'}
                          sx={{
                            bgcolor: isSaved ? 'success.main' : 'action.hover',
                          }}
                        >
                          {isSaved ? <Check sx={{ fontSize: 16 }} /> : <Bookmark sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Opções de download">
                      <IconButton
                        onClick={(event) => setDownloadAnchorEl(event.currentTarget)}
                        aria-label="Opções de download"
                        sx={{ bgcolor: 'action.hover' }}
                      >
                        <Download sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </>
                ) : null}

                {isGenerating ? (
                  <Button onClick={handleCancel} variant="outlined" color="error" startIcon={<Stop sx={{ fontSize: 16 }} />}>
                    Cancelar
                  </Button>
                ) : null}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Stack>

      <Menu
        open={isDownloadMenuOpen}
        anchorEl={downloadAnchorEl}
        onClose={closeDownloadMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: (theme) => ({
              ...glassSurfaceSx(theme),
              minWidth: 220,
              borderRadius: 3,
              mt: -1,
            }),
          },
        }}
      >
        <MenuItem
          onClick={() => {
            handleDownload();
            closeDownloadMenu();
          }}
        >
          Download áudio (.wav)
        </MenuItem>

        {scenes.length > 0 ? [
          <MenuItem key="all-images" onClick={() => void handleDownloadAllImages()}>
            Download todas as imagens
          </MenuItem>,
          <Divider key="divider" />,
          ...scenes.map((sceneItem, index) => (
            <MenuItem
              key={`${sceneItem.timestamp}-${index}`}
              onClick={() => {
                void downloadFile(sceneItem.imageUrl, `cena-${index}.png`);
                closeDownloadMenu();
              }}
              sx={{ justifyContent: 'space-between', gap: 2 }}
            >
              <span>Cena {index + 1}</span>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatTime(sceneItem.timestamp)}
              </Typography>
            </MenuItem>
          )),
        ] : null}
      </Menu>
    </Box>
  );
}
