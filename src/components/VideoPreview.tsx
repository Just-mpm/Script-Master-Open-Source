import { Component, type ErrorInfo, type ReactNode } from 'react';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import MovieCreation from '@mui/icons-material/MovieCreation';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import { Player, type PlayerRef } from '@remotion/player';
import { VideoComposition } from '../features/video-render';
import type { EditingScene } from '../features/video-render';
import { mapScenesToVideoScenes, getResolutionFromRatio } from '../features/video-render';
import type { SceneRatio, StudioScene } from '../features/studio/types';
import { glassPanelSx } from '../theme/surfaces';
import { GAP_COMPACT, GAP_MEDIUM, GAP_DEFAULT, EMPTY_WRAPPER_MAX_WIDTH, EMPTY_WRAPPER_PADDING_XS, EMPTY_WRAPPER_PADDING_MD, TEXT_SECONDARY } from '../theme/tokens';

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
  /** Plano de edição com transições, legendas e efeitos (opcional) */
  editingPlan?: EditingScene[];
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
    console.error('[VideoPlayerErrorBoundary] Erro na composição do vídeo:', error, errorInfo);
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
  function VideoPreview({ scenes, audioUrl, fps, durationInFrames, ratio, editingPlan }, ref) {
    const internalRef = useRef<PlayerRef>(null);

    const resolution = useMemo(() => getResolutionFromRatio(ratio), [ratio]);

    const mappedScenes = useMemo(
      () => mapScenesToVideoScenes(scenes, durationInFrames, fps),
      [scenes, durationInFrames, fps],
    );

    // Expose handle imperativo para o pai controlar play/pause/seek
    useImperativeHandle(ref, () => ({
      play: () => internalRef.current?.play(),
      pause: () => internalRef.current?.pause(),
      seekTo: (frame: number) => internalRef.current?.seekTo(frame),
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
      editingPlan: editingPlan ?? undefined,
    }), [mappedScenes, audioUrl, fps, editingPlan]);

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
                Gere um conteúdo com cenas visuais para acompanhar a narrativa aqui com transições e contexto.
              </Typography>
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
          />
        </VideoPlayerErrorBoundary>
      </Paper>
    );
  },
);
