import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ActionBar } from './components/ActionBar';
import { ErrorToast } from './components/ErrorToast';
import { Header } from './components/Header';
import { SuccessToast } from './components/SuccessToast';
import type { VideoPreviewHandle } from './components/VideoPreview';
import { useAuth } from './contexts/AuthContext';
import { useGlobalAudioActions } from './contexts/AudioContext';
import { useStudioState } from './features/studio/useStudioState';
import { useVideoRenderBridge } from './features/video-render/store/videoRenderBridge';
import { APP_HEADER_HEIGHT, APP_MAX_WIDTH } from './theme/tokens';

const StudioPage = lazy(async () => {
  const module = await import('./pages/StudioPage');
  return { default: module.StudioPage };
});

const VideoPage = lazy(async () => {
  const module = await import('./pages/VideoPage');
  return { default: module.VideoPage };
});

const ImageStudio = lazy(async () => {
  const module = await import('./components/ImageStudio');
  return { default: module.ImageStudio };
});

const AssistantPage = lazy(async () => {
  const module = await import('./pages/AssistantPage');
  return { default: module.AssistantPage };
});

const LibraryPage = lazy(async () => {
  const module = await import('./pages/LibraryPage');
  return { default: module.LibraryPage };
});

const SpeedPaintPage = lazy(async () => {
  const module = await import('./pages/SpeedPaintPage');
  return { default: module.SpeedPaintPage };
});

const NotFoundPage = lazy(async () => {
  const module = await import('./pages/NotFoundPage');
  return { default: module.NotFoundPage };
});

function RouteFallback() {
  return (
    <Stack
      spacing={2}
      sx={{ minHeight: '55vh', textAlign: 'center', alignItems: 'center', justifyContent: 'center' }}
    >
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        Carregando página...
      </Typography>
    </Stack>
  );
}

export default function App() {
  const location = useLocation();
  const currentPath = location.pathname;
  const isAssistantRoute = currentPath === '/assistant';
  const { authError, clearAuthError, loading: authLoading } = useAuth();
  const studio = useStudioState();
  const { toggle } = useGlobalAudioActions();

  // Ref compartilhado entre VideoPage (dono) e ActionBar (consumidor)
  // para controlar o Remotion Player na rota /video
  const videoPlayerRef = useRef<VideoPreviewHandle>(null);

  // Bridge store — lê estado dos hooks que vivem em VideoPage (code-splitting)
  const {
    isExportingVideo,
    videoExportProgress,
  } = useVideoRenderBridge();

  const {
    error,
    generationProgress,
    handleCancel,
    handleDownload,
    handleGenerate,
    handleSaveToLibrary,
    isGenerateDisabled,
    isGenerating,
    isSaved,
    scenes,
    setError,
    setSuccessMsg,
    statusText,
    successMsg,
    audioUrl,
    videoFps,
    durationInFrames,
  } = studio;

  // Scroll para o painel de exportação de vídeo (rota /video)
  const scrollToExport = useCallback(() => {
    const element = document.getElementById('video-export-panel');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Prioriza erros: authError > studio error
  const activeError = authError ?? error;
  const dismissError = useCallback(() => {
    if (authError) { clearAuthError(); return; }
    if (error) { setError(''); return; }
  }, [authError, clearAuthError, error, setError]);

  const appRoutes = (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<StudioPage {...studio} />} />

        <Route
          path="/video"
          element={
            <VideoPage
              {...studio}
              videoPlayerRef={videoPlayerRef}
            />
          }
        />

        <Route path="/image" element={<ImageStudio />} />

        <Route
          path="/assistant"
          element={<AssistantPage currentState={studio.currentState} onApplySettings={studio.handleApplySettings} />}
        />

        <Route path="/library" element={<LibraryPage />} />

        <Route path="/speed-paint" element={<SpeedPaintPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isGenerateDisabled && currentPath === '/') {
          e.preventDefault();
          handleGenerate();
        }
      }

      if (e.code === 'Space' && !isTyping) {
        const activeTag = target.tagName;
        const isControlTarget = activeTag === 'BUTTON' || activeTag === 'A' || activeTag === 'SELECT' || activeTag === 'SUMMARY';

        if (isControlTarget) {
          return;
        }

        e.preventDefault();

        if (!isGenerating) {
          if (currentPath === '/video' && videoPlayerRef.current) {
            // Na rota /video, controla o Remotion Player (evita dual-play)
            const player = videoPlayerRef.current;
            if (player.isPlaying()) {
              player.pause();
            } else {
              player.play();
            }
          } else {
            toggle('studio');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, handleGenerate, isGenerateDisabled, isGenerating, toggle, videoPlayerRef]);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <Typography
        component="a"
        href="#main-content"
        tabIndex={0}
        sx={(theme) => ({
          position: 'fixed',
          top: -100,
          left: theme.spacing(1),
          zIndex: theme.zIndex.tooltip + 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 2,
          py: 1,
          borderRadius: 1,
          fontWeight: 600,
          textDecoration: 'none',
          '&:focus': {
            top: theme.spacing(1),
          },
        })}
      >
        Pular para o conteúdo
      </Typography>

      <Header />
      {authLoading && (
        <Box sx={{ position: 'fixed', top: 'var(--mui-shape-borderRadius, 0px)', left: 0, right: 0, zIndex: 1300 }}>
          <LinearProgress />
        </Box>
      )}

      <Box component="main" id="main-content" tabIndex={-1} sx={{ minHeight: `calc(100dvh - ${APP_HEADER_HEIGHT}px)`, outline: 'none' }}>
        {isAssistantRoute ? (
          <Box sx={{ height: `calc(100dvh - ${APP_HEADER_HEIGHT}px)`, overflow: 'hidden' }}>
            {appRoutes}
          </Box>
        ) : (
          <Container
            maxWidth={false}
            sx={{
              maxWidth: APP_MAX_WIDTH,
              px: { xs: 2, sm: 3, lg: 4 },
              py: { xs: 3, md: 4 },
              pb: { xs: 16, md: 18 },
            }}
          >
            {appRoutes}
          </Container>
        )}
      </Box>

      <ErrorToast error={activeError} onDismiss={dismissError} />
      <SuccessToast message={successMsg} onDismiss={() => setSuccessMsg(null)} />

      {(currentPath === '/' || currentPath === '/video') && (
        <ActionBar
          isGenerating={isGenerating}
          audioUrl={audioUrl}
          statusText={statusText}
          generationProgress={generationProgress}
          handleDownload={handleDownload}
          handleCancel={handleCancel}
          handleSaveToLibrary={handleSaveToLibrary}
          isSaved={isSaved}
          scenes={scenes}
          videoPlayerRef={videoPlayerRef}
          videoFps={videoFps}
          videoDurationInFrames={durationInFrames}
          // Props do exportador de vídeo (rota /video, via bridge store)
          onScrollToExport={scrollToExport}
          isExportingVideo={isExportingVideo}
          videoExportProgress={videoExportProgress}
        />
      )}
    </Box>
  );
}
