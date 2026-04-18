import { lazy, Suspense, useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ActionBar } from './components/ActionBar';
import { ErrorToast } from './components/ErrorToast';
import { Header } from './components/Header';
import { SuccessToast } from './components/SuccessToast';
import { useGlobalAudioActions } from './contexts/AudioContext';
import { useStudioState } from './features/studio/useStudioState';
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

function RouteFallback() {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{ minHeight: '55vh', textAlign: 'center' }}
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
  const studio = useStudioState();
  const { toggle } = useGlobalAudioActions();
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
  } = studio;

  const appRoutes = (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<StudioPage {...studio} />} />

        <Route
          path="/video"
          element={<VideoPage {...studio} />}
        />

        <Route path="/image" element={<ImageStudio />} />

        <Route
          path="/assistant"
          element={<AssistantPage currentState={studio.currentState} onApplySettings={studio.handleApplySettings} />}
        />

        <Route path="/library" element={<LibraryPage />} />
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
          toggle('studio');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, handleGenerate, isGenerateDisabled, isGenerating, toggle]);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <Header />

      <Box component="main" sx={{ minHeight: `calc(100dvh - ${APP_HEADER_HEIGHT}px)` }}>
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

      <ErrorToast error={error} onDismiss={() => setError('')} />
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
        />
      )}
    </Box>
  );
}
