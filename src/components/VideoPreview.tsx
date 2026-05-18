import { Component, type ErrorInfo, type ReactNode } from 'react';
import { forwardRef, useImperativeHandle, useMemo, useRef, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import MovieCreation from '@mui/icons-material/MovieCreation';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import SubtitlesOutlined from '@mui/icons-material/SubtitlesOutlined';
import SubtitlesOffOutlined from '@mui/icons-material/SubtitlesOffOutlined';
import { createLogger } from '../lib/logger';
import { useLocale } from '../features/i18n';
import { useNavigate } from 'react-router-dom';
import { Player, type PlayerRef } from '@remotion/player';
import { VideoComposition } from '../features/video-render';
import type { CaptionWord, SubtitleStyle, VideoScene } from '../features/video-render';
import { mapScenesToVideoScenes, getResolutionFromRatio, generateScenesWithSpeedPaint } from '../features/video-render';
import { useVideoRenderBridge } from '../features/video-render/store/videoRenderBridge';
import type { SceneRatio, StudioScene } from '../features/studio/types';
import { glassPanelSx } from '../theme/surfaces';
import { GAP_COMPACT, GAP_MEDIUM, GAP_DEFAULT, EMPTY_WRAPPER_MAX_WIDTH, EMPTY_WRAPPER_PADDING_XS, EMPTY_WRAPPER_PADDING_MD, TEXT_SECONDARY, GLASS_BG, APP_BORDER, BLACK_40 } from '../theme/tokens';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface VideoPreviewProps {
  /** Cenas geradas pelo studio */
  scenes: StudioScene[];
  /** URL do áudio (blob ou Firestore) */
  audioUrl: string | null;
  /** Frames por segundo (default: 30) */
  fps: number;
  /** Duração total do vídeo em frames */
  durationInFrames: number;
  /** Proporção de tela do vídeo */
  ratio: SceneRatio;
  /** Legendas com timestamps (Whisper ou fallback proporcional) */
  captions?: CaptionWord[];
  /** Estilo personalizável das legendas */
  subtitleStyle?: SubtitleStyle;
  /** Exibe botão flutuante para alternar legenda no preview */
  showCaptionToggle?: boolean;
  /** Callback quando o toggle de legenda é clicado */
  onCaptionToggle?: () => void;
  /** Legenda está visível no preview? (default: true) */
  captionVisible?: boolean;
  /** Ativa speed paint automaticamente no preview do vídeo */
  animateScenes?: boolean;
  /** Exibe o lápis/pincel animado durante o speed paint */
  showDrawTool?: boolean;
}

/** Handle imperativo exposto ao pai para controlar o Remotion Player */
export interface VideoPreviewHandle {
  play: () => void;
  pause: () => void;
  seekTo: (frame: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
}

// ---------------------------------------------------------------------------
// ErrorBoundary para o Player Remotion (S8)
// ---------------------------------------------------------------------------

interface VideoPlayerErrorBoundaryProps {
  children: ReactNode;
  /** Strings localizadas para o fallback de erro */
  readonly errorStrings: {
    readonly title: string;
    readonly message: string;
    readonly retry: string;
  };
}

interface VideoPlayerErrorBoundaryState {
  hasError: boolean;
}

/**
 * Captura erros de renderização do Player Remotion e exibe fallback
 * amigável em pt-BR em vez de crashar a SPA inteira.
 */
class VideoPlayerErrorBoundary extends Component<
  VideoPlayerErrorBoundaryProps,
  VideoPlayerErrorBoundaryState
> {
  constructor(props: VideoPlayerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): VideoPlayerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const log = createLogger('VideoPlayerErrorBoundary');
    log.error('Erro na composição do vídeo', { error, componentStack: errorInfo.componentStack });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Stack
          spacing={GAP_DEFAULT}
          sx={{
            width: '100%',
            minHeight: 200,
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            textAlign: 'center',
          }}
        >
          <ErrorOutlineOutlined sx={{ fontSize: 40, color: TEXT_SECONDARY }} />
            <Stack spacing={GAP_COMPACT}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {this.props.errorStrings.title}
            </Typography>
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
              {this.props.errorStrings.message}
            </Typography>
          </Stack>
          <Button variant="outlined" size="small" onClick={this.handleRetry} sx={{ mt: 1 }}>
            {this.props.errorStrings.retry}
          </Button>
        </Stack>
      );
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(
  function VideoPreview({
    scenes,
    audioUrl,
    fps,
    durationInFrames,
    ratio,
    captions,
    subtitleStyle,
    showCaptionToggle,
    onCaptionToggle,
    captionVisible = true,
    animateScenes = true,
    showDrawTool = true,
  }, ref) {
    const internalRef = useRef<PlayerRef>(null);
    const navigate = useNavigate();
    const { t } = useLocale();

    const resolution = useMemo(() => getResolutionFromRatio(ratio), [ratio]);

    // Polling de frame: sincroniza o frame atual e estado de reprodução
    // com o bridge store (consumido por CaptionEditorPanel e ActionBar).
    // O loop nunca morre — quando pausado usa polling leve (500ms) para
    // detectar quando o vídeo volta a tocar via play() externo (ActionBar).
    const rafRef = useRef<number | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      let active = true;

      const tick = () => {
        if (!active) return;
        const playerRef = internalRef.current;

        if (playerRef) {
          const playing = playerRef.isPlaying();
          useVideoRenderBridge.getState().syncCurrentFrame(playerRef.getCurrentFrame());
          useVideoRenderBridge.getState().syncIsPlaying(playing);

          if (playing) {
            // Tocando: alta frequência via RAF (~60fps)
            rafRef.current = requestAnimationFrame(tick);
          } else {
            // Pausado: polling leve para detectar retomada externa
            timeoutRef.current = setTimeout(tick, 500);
          }
        } else {
          // Player ainda não montou — tenta novamente em 100ms
          timeoutRef.current = setTimeout(tick, 100);
        }
      };

      rafRef.current = requestAnimationFrame(tick);

      return () => {
        active = false;
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }, []);

    const mappedScenes = useMemo(
      () => mapScenesToVideoScenes(scenes, durationInFrames, fps),
      [scenes, durationInFrames, fps],
    );
    const [previewScenes, setPreviewScenes] = useState<VideoScene[]>(mappedScenes);

    useEffect(() => {
      let cancelled = false;

      setPreviewScenes(mappedScenes);

      if (!animateScenes || mappedScenes.length === 0) {
        return () => {
          cancelled = true;
        };
      }

      const enhanceScenesWithSpeedPaint = async () => {
        try {
          const results = await generateScenesWithSpeedPaint(
            mappedScenes.map((scene) => ({ imageUrl: scene.imageUrl })),
            undefined,
            { useWorker: true },
          );

          if (cancelled) return;

          setPreviewScenes(
            mappedScenes.map((scene, index) => ({
              ...scene,
              strokeAnimation: results[index]?.animation,
            })),
          );
        } catch {
          if (!cancelled) {
            setPreviewScenes(mappedScenes);
          }
        }
      };

      void enhanceScenesWithSpeedPaint();

      return () => {
        cancelled = true;
      };
    }, [animateScenes, mappedScenes]);

    // Expose handle imperativo para o pai controlar play/pause/seek
    useImperativeHandle(ref, () => ({
      play: () => internalRef.current?.play(),
      pause: () => internalRef.current?.pause(),
      seekTo: (frame: number) => {
        internalRef.current?.seekTo(frame);
        useVideoRenderBridge.getState().syncCurrentFrame(frame);
      },
      getCurrentTime: () => {
        if (!internalRef.current) return 0;
        return internalRef.current.getCurrentFrame() / fps;
      },
      isPlaying: () => internalRef.current?.isPlaying() ?? false,
    }), [fps]);

    // Memoiza inputProps — o Player usa igualdade referencial para detectar mudanças
    const inputProps = useMemo(() => ({
      scenes: previewScenes,
      audioUrl: audioUrl ?? '',
      fps,
      captions: captionVisible ? (captions ?? undefined) : undefined,
      subtitleStyle,
      showDrawTool,
    }), [previewScenes, audioUrl, fps, captions, subtitleStyle, captionVisible, showDrawTool]);

    // Estado vazio: sem áudio e sem cenas
    if (!audioUrl && scenes.length === 0) {
      return (
        <Paper
          elevation={0}
          sx={(theme): SystemStyleObject<Theme> => ({
            ...glassPanelSx(theme),
            aspectRatio: '16 / 9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: EMPTY_WRAPPER_PADDING_XS, md: EMPTY_WRAPPER_PADDING_MD },
          })}
        >
          <Stack spacing={GAP_MEDIUM} sx={{ maxWidth: EMPTY_WRAPPER_MAX_WIDTH, alignItems: 'center', textAlign: 'center' }}>
            <Box
              sx={(theme) => ({
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                backgroundColor: alpha(theme.palette.common.white, 0.06),
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              })}
            >
              <MovieCreation sx={{ fontSize: 24, opacity: 0.35 }} />
            </Box>
            <Stack spacing={GAP_COMPACT}>
              <Typography variant="h6">{t('video.preview.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('video.preview.description')}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/app/estudio')}
                sx={{ mt: 0.5, alignSelf: 'center' }}
              >
                {t('video.preview.goToStudio')}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        sx={(theme): SystemStyleObject<Theme> => ({
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 3, md: 4 },
          border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
          backgroundColor: alpha(theme.palette.common.black, 0.9),
          lineHeight: 0,
        })}
      >
        <VideoPlayerErrorBoundary errorStrings={{
          title: t('errors.video.title'),
          message: t('errors.video.message'),
          retry: t('errors.video.retry'),
        }}>
          <Player
            ref={internalRef}
            component={VideoComposition}
            inputProps={inputProps}
            durationInFrames={Math.max(1, durationInFrames)}
            fps={fps}
            compositionWidth={resolution.width}
            compositionHeight={resolution.height}
            style={{ width: '100%', display: 'block' }}
            acknowledgeRemotionLicense
          />
        </VideoPlayerErrorBoundary>

        {/* Botão flutuante para alternar legenda no preview (canto inferior esquerdo) */}
        {showCaptionToggle && captions != null && captions.length > 0 && (
          <Tooltip title={captionVisible ? t('video.preview.captionVisible') : t('video.preview.captionHidden')} placement="right" arrow>
            <IconButton
              aria-label={captionVisible ? t('video.preview.hideCaption') : t('video.preview.showCaption')}
              onClick={onCaptionToggle}
              size="small"
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                zIndex: 10,
                width: 42,
                height: 42,
                backgroundColor: GLASS_BG,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${APP_BORDER}`,
                color: captionVisible ? '#fff' : 'text.secondary',
                boxShadow: `0 4px 12px ${BLACK_40}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&:active': {
                  transform: 'scale(0.92)',
                },
              }}
            >
              {captionVisible
                ? <SubtitlesOutlined sx={{ fontSize: 22 }} />
                : <SubtitlesOffOutlined sx={{ fontSize: 22 }} />}
            </IconButton>
          </Tooltip>
        )}
      </Paper>
    );
  },
);
