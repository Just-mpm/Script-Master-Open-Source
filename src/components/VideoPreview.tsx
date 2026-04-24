import { Component, type ErrorInfo, type ReactNode } from 'react';
import { forwardRef, useImperativeHandle, useMemo, useRef, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { Player, type PlayerRef } from '@remotion/player';
import { VideoComposition } from '../features/video-render';
import type { CaptionWord, SubtitleStyle } from '../features/video-render';
import { mapScenesToVideoScenes, getResolutionFromRatio } from '../features/video-render';
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
              Erro ao renderizar o vídeo
            </Typography>
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
              Ocorreu um problema durante a composição. Tente recarregar.
            </Typography>
          </Stack>
          <Button variant="outlined" size="small" onClick={this.handleRetry} sx={{ mt: 1 }}>
            Tentar novamente
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
  function VideoPreview({ scenes, audioUrl, fps, durationInFrames, ratio, captions, subtitleStyle, showCaptionToggle, onCaptionToggle, captionVisible = true }, ref) {
    const internalRef = useRef<PlayerRef>(null);
    const navigate = useNavigate();

    const resolution = useMemo(() => getResolutionFromRatio(ratio), [ratio]);

    // Polling de frame: sincroniza o frame atual e estado de reprodução
    // com o bridge store (consumido por CaptionEditorPanel e outros)
    const rafRef = useRef<number | null>(null);
    useEffect(() => {
      const tick = () => {
        const playerRef = internalRef.current;
        if (playerRef && playerRef.isPlaying()) {
          useVideoRenderBridge.getState().syncCurrentFrame(playerRef.getCurrentFrame());
          useVideoRenderBridge.getState().syncIsPlaying(true);
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Pausado: emite frame atual e estado uma vez e para
          if (playerRef) {
            useVideoRenderBridge.getState().syncCurrentFrame(playerRef.getCurrentFrame());
          }
          useVideoRenderBridge.getState().syncIsPlaying(false);
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(tick);

      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }, []);

    const mappedScenes = useMemo(
      () => mapScenesToVideoScenes(scenes, durationInFrames, fps),
      [scenes, durationInFrames, fps],
    );

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
      scenes: mappedScenes,
      audioUrl: audioUrl ?? '',
      fps,
      captions: captionVisible ? (captions ?? undefined) : undefined,
      subtitleStyle,
    }), [mappedScenes, audioUrl, fps, captions, subtitleStyle, captionVisible]);

    // Estado vazio: sem áudio e sem cenas
    if (!audioUrl && scenes.length === 0) {
      return (
        <Paper
          elevation={0}
          sx={(theme): SystemStyleObject<Theme> => ({
            ...glassPanelSx(theme),
            aspectRatio: ratio === '9:16' ? '9 / 16' : ratio === '1:1' ? '1 / 1' : '16 / 9',
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
              <Typography variant="h6">Preview de vídeo aguardando cenas</Typography>
              <Typography variant="body2" color="text.secondary">
                Gere o áudio e as cenas no estúdio para visualizar a montagem aqui.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/app/estudio')}
                sx={{ mt: 0.5, alignSelf: 'center' }}
              >
                Ir para o Estúdio
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
        <VideoPlayerErrorBoundary>
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

        {/* Botão flutuante para alternar legenda no preview */}
        {showCaptionToggle && captions != null && captions.length > 0 && (
          <Tooltip title={captionVisible ? 'Legenda visível' : 'Legenda oculta'} placement="left" arrow>
            <IconButton
              aria-label={captionVisible ? 'Ocultar legenda' : 'Mostrar legenda'}
              onClick={onCaptionToggle}
              size="small"
              sx={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                zIndex: 10,
                width: 36,
                height: 36,
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
                ? <SubtitlesOutlined sx={{ fontSize: 20 }} />
                : <SubtitlesOffOutlined sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
        )}
      </Paper>
    );
  },
);
