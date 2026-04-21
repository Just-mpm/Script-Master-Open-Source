import React, { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
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
import { useLocation } from 'react-router-dom';
import Bookmark from '@mui/icons-material/Bookmark';
import Check from '@mui/icons-material/Check';
import Download from '@mui/icons-material/Download';
import AutoFixHigh from '@mui/icons-material/AutoFixHigh';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Stop from '@mui/icons-material/Stop';
import VideoFile from '@mui/icons-material/VideoFile';
import { downloadFile } from '../lib/download';
import { useGlobalAudioActions, useGlobalAudioState } from '../contexts/AudioContext';
import type { VideoPreviewHandle } from './VideoPreview';
import { APP_ACTION_BAR_BOTTOM, BRAND_GRADIENT, BRAND_GRADIENT_HOVER, BRAND_GLOW, BRAND_GLOW_FOCUS, WHITE_08, ICON_SIZE_MD, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, RADIUS_SM, RADIUS_CHIP, CYAN_GLOW_SOFT } from '../theme/tokens';
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
  /** Ref para o Remotion Player (rota /video) */
  videoPlayerRef?: RefObject<VideoPreviewHandle | null>;
  /** FPS do vídeo Remotion */
  videoFps?: number;
  /** Duração total do vídeo em frames */
  videoDurationInFrames?: number;
  /** Callback para gerar plano de edição com IA (rota /video) */
  onGenerateEditingPlan?: () => void;
  /** Indica se está gerando o plano de edição */
  isGeneratingPlan?: boolean;
  /** Indica se o botão de gerar plano está desabilitado */
  isPlanDisabled?: boolean;
  /** Callback para rolar até o painel de exportação (rota /video) */
  onScrollToExport?: () => void;
  /** Indica se há exportação de vídeo em andamento */
  isExportingVideo?: boolean;
  /** Progresso da exportação de vídeo (0-100) */
  videoExportProgress?: number;
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
  scenes = [],
  videoPlayerRef,
  videoFps,
  videoDurationInFrames,
  onGenerateEditingPlan,
  isGeneratingPlan = false,
  isPlanDisabled = true,
  onScrollToExport,
  isExportingVideo = false,
  videoExportProgress = 0,
}: ActionBarProps) {
  const [downloadAnchorEl, setDownloadAnchorEl] = React.useState<HTMLElement | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const location = useLocation();
  const isVideoRoute = location.pathname === '/video';

  // Estado do AudioContext (rota /)
  const audioState = useGlobalAudioState();
  const audioActions = useGlobalAudioActions();

  // Estado do Remotion Player (rota /video) — polling otimizado
  const [playerFrame, setPlayerFrame] = useState(0);
  const [playerIsPlaying, setPlayerIsPlaying] = useState(false);
  const [isRemotionActive, setIsRemotionActive] = useState(false);

  // Refs para evitar state updates desnecessários durante polling
  const prevFrameRef = useRef(0);
  const prevPlayingRef = useRef(false);

  // Polling do frame e estado do Remotion Player — pausado quando não está reproduzindo
  useEffect(() => {
    if (!isVideoRoute || !videoFps) return;

    const intervalId = setInterval(() => {
      const player = videoPlayerRef?.current;
      const active = isVideoRoute && !!player;
      setIsRemotionActive(active);

      if (player) {
        const currentFrame = Math.round(player.getCurrentTime() * videoFps);
        const playing = player.isPlaying();

        // Só atualiza state se os valores mudaram (evita re-renders desnecessários)
        if (currentFrame !== prevFrameRef.current) {
          prevFrameRef.current = currentFrame;
          setPlayerFrame(currentFrame);
        }

        if (playing !== prevPlayingRef.current) {
          prevPlayingRef.current = playing;
          setPlayerIsPlaying(playing);
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [isVideoRoute, videoPlayerRef, videoFps]);

  if (!isGenerating && !audioUrl) return null;

  const showPlayer = !!audioUrl;
  const showProgressBar = isGenerating && !audioUrl;
  const isImagePhase = isGenerating && audioUrl;
  const isDownloadMenuOpen = Boolean(downloadAnchorEl);

  // ---- Estado unificado: Remotion na /video, AudioContext na / ----
  const displayIsPlaying = isRemotionActive ? playerIsPlaying : audioState.isPlaying;

  const displayCurrentTime = isRemotionActive && videoFps
    ? playerFrame / videoFps
    : audioState.currentTime;

  const displayDuration = isRemotionActive && videoFps && videoDurationInFrames
    ? videoDurationInFrames / videoFps
    : audioState.duration;

  const displayProgress = displayDuration > 0
    ? (displayCurrentTime / displayDuration) * 100
    : 0;

  const progressValue = Math.round(displayProgress);
  const { formatTime } = audioState;

  const closeDownloadMenu = () => setDownloadAnchorEl(null);

  const seekToPercentage = (nextProgress: number) => {
    const clampedProgress = Math.min(100, Math.max(0, nextProgress));

    if (isRemotionActive && videoDurationInFrames) {
      // Converte porcentagem para frame no Remotion Player
      const frame = Math.round((clampedProgress / 100) * videoDurationInFrames);
      videoPlayerRef?.current?.seekTo(frame);
    } else {
      audioActions.seek(clampedProgress);
    }
  };

  const handleToggle = () => {
    if (isRemotionActive && videoPlayerRef?.current) {
      const player = videoPlayerRef.current;
      if (player.isPlaying()) {
        player.pause();
      } else {
        player.play();
      }
    } else {
      audioActions.toggle();
    }
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
    setIsDownloadingAll(true);
    setDownloadProgress(`Baixando cena 1/${scenes.length}...`);

    for (const [index, sceneItem] of scenes.entries()) {
      setDownloadProgress(`Baixando cena ${index + 1}/${scenes.length}...`);
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      await downloadFile(sceneItem.imageUrl, `cena-${index}.png`);
    }

    setDownloadProgress(null);
    setIsDownloadingAll(false);
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
      <Stack spacing={GAP_MEDIUM} sx={{ alignItems: 'center' }}>
      {isImagePhase && (
        <Paper
          variant="outlined"
          sx={(theme) => ({
            ...glassSurfaceSx(theme),
            width: '100%',
            maxWidth: 680,
            px: 2,
            py: 1.25,
            borderRadius: 8,
            pointerEvents: 'auto',
          })}
        >
            <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack spacing={GAP_MEDIUM} role="status" aria-live="polite">
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
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
                aria-label="Progresso da geração de cenas visuais"
                sx={{
                  mt: 0.5,
                  height: 8,
                  borderRadius: RADIUS_CHIP,
                    bgcolor: 'action.hover',
                }}
              />
              </Stack>
            </Box>

            <Tooltip title="Cancelar geração de imagens">
              <IconButton onClick={handleCancel} color="error" sx={{ pointerEvents: 'auto' }}>
                <Stop sx={{ fontSize: ICON_SIZE_MD }} />
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
            borderRadius: { xs: 3, md: 8 },
            px: { xs: 1.5, sm: 2, md: 3 },
            py: { xs: 1.5, md: 1.75 },
            pointerEvents: 'auto',
          })}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: GAP_MEDIUM, md: GAP_DEFAULT }}
            sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {showProgressBar ? (
                <Stack spacing={GAP_MEDIUM} role="status" aria-live="polite">
                  <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'center' }}>
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
                    aria-label="Progresso da geração de áudio"
                    sx={{
                      height: 8,
                      borderRadius: RADIUS_CHIP,
                      bgcolor: WHITE_08,
                    }}
                  />
                </Stack>
              ) : showPlayer ? (
                <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} sx={{ alignItems: 'center' }}>
                    <IconButton
                      onClick={handleToggle}
                    aria-label={displayIsPlaying ? 'Pausar reprodução' : 'Iniciar reprodução'}
                    aria-pressed={displayIsPlaying}
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
                    {displayIsPlaying ? <Stop sx={{ fontSize: ICON_SIZE_MD }} /> : <PlayArrow sx={{ fontSize: ICON_SIZE_MD }} />}
                  </IconButton>

                  <Stack spacing={GAP_COMPACT} sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatTime(displayCurrentTime)}
                      </Typography>

                      <Box
                        onClick={handleProgressClick}
                        role="slider"
                        aria-label={isRemotionActive ? 'Progresso do vídeo' : 'Progresso do áudio'}
                        aria-orientation="horizontal"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressValue}
                        aria-valuetext={`${formatTime(displayCurrentTime)} de ${formatTime(displayDuration)}`}
                        tabIndex={0}
                        onKeyDown={handleProgressKeyDown}
                        sx={{
                          position: 'relative',
                          flex: 1,
                          height: 10,
                          borderRadius: RADIUS_CHIP,
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
                            width: `${displayProgress}%`,
                            background: BRAND_GRADIENT,
                          }}
                        />
                      </Box>

                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatTime(displayDuration)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              ) : null}
            </Box>

            {!isImagePhase && (
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                {/* Botão de gerar plano de edição (rota /video) */}
                {isVideoRoute && showPlayer && onGenerateEditingPlan && (
                  <Tooltip title={isGeneratingPlan ? 'Gerando plano de edição...' : 'Gerar plano de edição com IA'}>
                    <span>
                      <IconButton
                        onClick={onGenerateEditingPlan}
                        disabled={isPlanDisabled || isGeneratingPlan}
                        aria-label="Gerar plano de edição com IA"
                        sx={{
                          bgcolor: isGeneratingPlan
                            ? 'rgba(139, 92, 246, 0.12)'
                            : 'action.hover',
                          color: isGeneratingPlan ? 'secondary.main' : 'default',
                          ...(isGeneratingPlan ? {
                            animation: 'spin 1.4s linear infinite',
                            '@keyframes spin': {
                              from: { transform: 'rotate(0deg)' },
                              to: { transform: 'rotate(360deg)' },
                            },
                          } : {}),
                        }}
                      >
                        {isGeneratingPlan
                          ? <CircularProgress size={ICON_SIZE_MD} thickness={2.5} sx={{ color: 'secondary.main' }} />
                          : <AutoFixHigh sx={{ fontSize: ICON_SIZE_MD }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}

                {/* Botão de exportar vídeo (rota /video) */}
                {isVideoRoute && showPlayer && onScrollToExport && (
                  <Tooltip title={isExportingVideo ? `Exportando vídeo... ${videoExportProgress}%` : 'Exportar vídeo MP4'}>
                    <span>
                      <IconButton
                        onClick={onScrollToExport}
                        disabled={isExportingVideo}
                        aria-label={isExportingVideo ? 'Exportando vídeo' : 'Exportar vídeo MP4'}
                        sx={{
                          bgcolor: isExportingVideo
                            ? CYAN_GLOW_SOFT
                            : 'action.hover',
                          color: isExportingVideo ? 'primary.main' : 'default',
                        }}
                      >
                        {isExportingVideo
                          ? <CircularProgress size={ICON_SIZE_MD} thickness={2.5} sx={{ color: 'primary.main' }} />
                          : <VideoFile sx={{ fontSize: ICON_SIZE_MD }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}

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
                          {isSaved ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : <Bookmark sx={{ fontSize: ICON_SIZE_MD }} />}
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Opções de download">
                      <IconButton
                        onClick={(event) => setDownloadAnchorEl(event.currentTarget)}
                        aria-label="Opções de download"
                        sx={{ bgcolor: 'action.hover' }}
                      >
                        <Download sx={{ fontSize: ICON_SIZE_MD }} />
                      </IconButton>
                    </Tooltip>
                  </>
                ) : null}

                {isGenerating ? (
                  <Button onClick={handleCancel} variant="outlined" color="error" startIcon={<Stop sx={{ fontSize: ICON_SIZE_MD }} />}>
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
              borderRadius: RADIUS_SM,
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
          <MenuItem
            key="all-images"
            onClick={() => { if (!isDownloadingAll) void handleDownloadAllImages(); }}
            disabled={isDownloadingAll}
            sx={{ gap: 2 }}
          >
            <span style={{ flex: 1 }}>
              {isDownloadingAll ? downloadProgress : 'Download todas as imagens'}
            </span>
            {isDownloadingAll ? <CircularProgress size={16} thickness={2.5} /> : null}
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
