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
import PlayArrow from '@mui/icons-material/PlayArrow';
import Stop from '@mui/icons-material/Stop';
import VideoFile from '@mui/icons-material/VideoFile';
import { downloadFile } from '../lib/download';
import { useGlobalAudioActions, useAudioIsPlaying, useAudioCurrentTime, useAudioDuration, useAudioActiveId } from '../contexts/AudioContext';
import type { VideoPreviewHandle } from './VideoPreview';
import { useVideoRenderBridge } from '../features/video-render/store/videoRenderBridge';
import { useLocale } from '../features/i18n';
import { APP_ACTION_BAR_BOTTOM, BRAND_GRADIENT, BRAND_GRADIENT_HOVER, BRAND_GLOW, BRAND_GLOW_FOCUS, WHITE_08, ICON_SIZE_MD, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, RADIUS_SM, RADIUS_CHIP,   BRAND_PRIMARY_GLOW_SOFT } from '../theme/tokens';
import { glassSurfaceSx } from '../theme/surfaces';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { BOTTOM_NAV_HEIGHT } from './app/MobileBottomNav';

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
  onScrollToExport,
  isExportingVideo = false,
  videoExportProgress = 0,
}: ActionBarProps) {
  const { t } = useLocale();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [downloadAnchorEl, setDownloadAnchorEl] = React.useState<HTMLElement | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const location = useLocation();
  const isVideoRoute = location.pathname === '/app/video';

  // Seletores primitivos do AudioContext — evita re-render ~4x/s durante playback
  // (useGlobalAudioState espalha todo AudioSnapshot incluindo currentTime que muda ~4x/s)
  const audioIsPlaying = useAudioIsPlaying();
  const audioCurrentTime = useAudioCurrentTime();
  const audioDuration = useAudioDuration();
  const audioActiveId = useAudioActiveId();
  const audioActions = useGlobalAudioActions();

  // Frame e estado de reprodução do Remotion Player via bridge store
  // (sincronizado pelo VideoPreview RAF ~30x/s — sem polling duplicado)
  const bridgeFrame = useVideoRenderBridge((state) => state.currentFrame);
  const bridgeIsPlaying = useVideoRenderBridge((state) => state.isPlaying);

  // Throttle do frame para display ~4x/s durante playback (evita 30 re-renders/s)
  // P1: Usa ref para evitar bridgeFrame (~30x/s) nas deps — destruiria o setInterval antes de disparar
  const bridgeFrameRef = useRef(bridgeFrame);
  const [displayFrame, setDisplayFrame] = useState(bridgeFrame);

  // Sincroniza ref com o frame atual (via useEffect para não violar react-hooks/refs)
  useEffect(() => {
    bridgeFrameRef.current = bridgeFrame;
  }, [bridgeFrame]);

  useEffect(() => {
    if (!bridgeIsPlaying) {
      setDisplayFrame(bridgeFrameRef.current);
      return;
    }
    const id = setInterval(() => {
      setDisplayFrame(useVideoRenderBridge.getState().currentFrame);
    }, 250); // 4 atualizações/segundo
    return () => clearInterval(id);
  }, [bridgeIsPlaying]); // Removido bridgeFrame das deps

  // Na rota /video o player sempre está montado; guards em handleToggle/seekToPercentage
  // verificam videoPlayerRef?.current antes de operar no player
  const isRemotionActive = isVideoRoute;

  if (!isGenerating && !audioUrl) return null;

  const showPlayer = !!audioUrl;
  const showProgressBar = isGenerating && !audioUrl;
  const isImagePhase = isGenerating && audioUrl;
  const isDownloadMenuOpen = Boolean(downloadAnchorEl);

  // ---- Estado unificado: Remotion na /video, AudioContext na / ----
  const displayIsPlaying = isRemotionActive ? bridgeIsPlaying : audioIsPlaying;

  const displayCurrentTime = isRemotionActive && videoFps
    ? displayFrame / videoFps
    : audioCurrentTime;

  const displayDuration = isRemotionActive && videoFps && videoDurationInFrames
    ? videoDurationInFrames / videoFps
    : audioDuration;

  const displayProgress = displayDuration > 0
    ? (displayCurrentTime / displayDuration) * 100
    : 0;

  const progressValue = Math.round(displayProgress);
  const { formatTime } = audioActions;

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
    } else if (!audioActiveId && audioUrl) {
      // Carrega a URL no elemento <audio> antes de tocar — toggle() não seta audio.src
      audioActions.play(audioUrl, 'studio-audio');
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
    setDownloadProgress(t('studio.actionBar.downloadingScene', { current: 1, total: scenes.length }));

    for (const [index, sceneItem] of scenes.entries()) {
      setDownloadProgress(t('studio.actionBar.downloadingScene', { current: index + 1, total: scenes.length }));
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      await downloadFile(sceneItem.imageUrl, `cena-${index}.png`);
    }

    setDownloadProgress(null);
    setIsDownloadingAll(false);
    closeDownloadMenu();
  };

  return (
    <Box
      id="action-bar"
      role="region"
      aria-label={t('studio.actionBar.ariaLabel')}
      sx={{
        position: 'fixed',
        left: '50%',
        bottom: isMobile ? APP_ACTION_BAR_BOTTOM + BOTTOM_NAV_HEIGHT : APP_ACTION_BAR_BOTTOM,
        transform: 'translateX(-50%)',
        zIndex: 1400,
        width: '100%',
        px: { xs: 2, sm: 3 },
        pointerEvents: 'none',
        pb: 'env(safe-area-inset-bottom, 0px)',
        // Visual cue — gradiente para indicar conteúdo atrás
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -32,
          left: 0,
          right: 0,
          height: 32,
          background: `linear-gradient(to bottom, transparent, ${alpha('#0a0a0f', 0.6)})`,
          pointerEvents: 'none',
          zIndex: -1,
        },
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
            borderTop: '1px solid rgba(46, 117, 182, 0.15)',
          })}
        >
            <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack spacing={GAP_MEDIUM} role="status" aria-live="polite">
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {statusText || t('studio.actionBar.generatingScenes')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                  {generationProgress}%
                </Typography>
              </Stack>
                <LinearProgress
                variant="determinate"
                value={generationProgress}
                aria-label={t('studio.actionBar.sceneProgressLabel')}
                sx={{
                  mt: 0.5,
                  height: 8,
                  borderRadius: RADIUS_CHIP,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    backgroundImage: BRAND_GRADIENT,
                    borderRadius: RADIUS_CHIP,
                  },
                }}
              />
              </Stack>
            </Box>

            <Tooltip title={t('studio.actionBar.cancelImages')}>
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
            borderTop: '1px solid rgba(46, 117, 182, 0.15)',
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
                      {statusText || t('studio.actionBar.synthesizingVoice')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                      {generationProgress}%
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={generationProgress}
                    aria-label={t('studio.actionBar.audioProgressLabel')}
                    sx={{
                      height: 8,
                      borderRadius: RADIUS_CHIP,
                      bgcolor: WHITE_08,
                      '& .MuiLinearProgress-bar': {
                        backgroundImage: BRAND_GRADIENT,
                        borderRadius: RADIUS_CHIP,
                      },
                    }}
                  />
                </Stack>
              ) : showPlayer ? (
                <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} sx={{ alignItems: 'center' }}>
                    <IconButton
                      onClick={handleToggle}
                    aria-label={displayIsPlaying ? t('studio.actionBar.pausePlayback') : t('studio.actionBar.startPlayback')}
                    aria-pressed={displayIsPlaying}
                    color="primary"
                    sx={{
                      color: 'primary.contrastText',
                          background: BRAND_GRADIENT,
                      boxShadow: BRAND_GLOW,
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                            background: BRAND_GRADIENT_HOVER,
                            transform: 'scale(1.06)',
                            boxShadow: '0 18px 48px rgba(46, 117, 182, 0.36)',
                      },
                      '&:active': {
                            transform: 'scale(0.98)',
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
                        aria-label={isRemotionActive ? t('studio.actionBar.videoProgress') : t('studio.actionBar.audioProgress')}
                        aria-orientation="horizontal"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressValue}
                        aria-valuetext={t('studio.actionBar.progressOf', { current: formatTime(displayCurrentTime), duration: formatTime(displayDuration) })}
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
                          transition: 'height 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            height: 12,
                          },
                          '&:focus-visible': {
                            boxShadow: BRAND_GLOW_FOCUS,
                            height: 12,
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
              ) : null }
            </Box>

            {!isImagePhase && (
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                {/* Botão de exportar vídeo (rota /video) */}
                {isVideoRoute && showPlayer && onScrollToExport && (scenes?.length ?? 0) > 0 && (
                  <Tooltip title={isExportingVideo ? t('studio.actionBar.exportingVideoProgress', { progress: videoExportProgress }) : t('studio.actionBar.exportVideoMp4')}>
                    <span>
                      <IconButton
                        onClick={onScrollToExport}
                        disabled={isExportingVideo}
                        aria-label={isExportingVideo ? t('studio.actionBar.exportingVideo') : t('studio.actionBar.exportVideoMp4')}
                        sx={{
                          bgcolor: isExportingVideo
                            ? BRAND_PRIMARY_GLOW_SOFT
                            : 'action.hover',
                          color: isExportingVideo ? 'primary.main' : 'default',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            bgcolor: isExportingVideo
                              ? BRAND_PRIMARY_GLOW_SOFT
                              : BRAND_PRIMARY_GLOW_SOFT,
                          },
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
                    <Tooltip title={isSaved ? t('studio.actionBar.savedToLibrary') : t('studio.actionBar.saveToLibrary')}>
                      <span>
                        <IconButton
                          onClick={handleSaveToLibrary}
                          disabled={isSaved}
                          color={isSaved ? 'success' : 'default'}
                          aria-label={isSaved ? t('studio.actionBar.savedToLibrary') : t('studio.actionBar.saveToLibrary')}
                          sx={{
                            bgcolor: isSaved ? 'success.main' : 'action.hover',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              bgcolor: isSaved ? 'success.main' : BRAND_PRIMARY_GLOW_SOFT,
                            },
                          }}
                        >
                          {isSaved ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : <Bookmark sx={{ fontSize: ICON_SIZE_MD }} />}
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title={t('studio.actionBar.downloadOptions')}>
                      <IconButton
                        onClick={(event) => setDownloadAnchorEl(event.currentTarget)}
                        aria-label={t('studio.actionBar.downloadOptions')}
                        sx={{
                          bgcolor: 'action.hover',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': { bgcolor: BRAND_PRIMARY_GLOW_SOFT },
                        }}
                      >
                        <Download sx={{ fontSize: ICON_SIZE_MD }} />
                      </IconButton>
                    </Tooltip>
                  </>
                ) : null }

                {isGenerating ? (
                  <Button onClick={handleCancel} variant="outlined" color="error" startIcon={<Stop sx={{ fontSize: ICON_SIZE_MD }} />} sx={{
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)',
                    },
                   }}>
                    {t('studio.actionBar.cancel')}
                  </Button>
                ) : null }
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
          {t('studio.actionBar.downloadAudio')}
        </MenuItem>

        {scenes.length > 0 ? [
          <MenuItem
            key="all-images"
            onClick={() => { if (!isDownloadingAll) void handleDownloadAllImages(); }}
            disabled={isDownloadingAll}
            sx={{ gap: 2 }}
          >
            <span style={{ flex: 1 }}>
              {isDownloadingAll ? downloadProgress : t('studio.actionBar.downloadAllImages')}
            </span>
            {isDownloadingAll ? <CircularProgress size={16} thickness={2.5} /> : null }
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
              <span>{t('studio.actionBar.scene', { number: index + 1 })}</span>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatTime(sceneItem.timestamp)}
              </Typography>
            </MenuItem>
          )),
        ] : null }
      </Menu>
    </Box>
  );
}
