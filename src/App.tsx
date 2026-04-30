import { useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useLocation } from 'react-router-dom';
import { ActionBar } from './components/ActionBar';
import { Header } from './components/Header';
import { ScrollToTop } from './components/public/ScrollToTop';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { VideoPreviewHandle } from './components/VideoPreview';
import { useAudioGenerationHandler } from './components/app/AudioGenerationHandler';
import { ToastManager } from './components/toast/ToastProvider';
import { AppRoutes } from './router/routes';
import { VIDEO_FPS } from './features/studio/store';
import { APP_HEADER_HEIGHT, APP_MAX_WIDTH } from './theme/tokens';

export default function App() {
  const location = useLocation();
  const currentPath = location.pathname;

  // ─── Handler de geração de áudio (hook centralizado) ─────
  const {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    scenes,
    handleGenerate,
    handleDownload,
    handleCancel,
    handleSaveToLibrary,
    scrollToExport,
    isGenerateDisabled,
    durationInFrames,
    activeError,
    dismissError,
    warning,
    dismissWarning,
    successMessage,
    dismissSuccess,
    isExportingVideo,
    videoExportProgress,
    toggleAudioPlayer,
    isSaved,
  } = useAudioGenerationHandler();

  // ─── Classificação de rotas ──────────────────────────────
  const isAppRoute = currentPath.startsWith('/app/');
  const isOnboardingRoute = currentPath === '/onboarding';
  const isAssistantRoute = currentPath === '/app/assistente';
  const isStudioRoute = currentPath === '/app/estudio';
  const isVideoRoute = currentPath === '/app/video';

  // Ref compartilhado entre VideoPage (dono), ActionBar e atalhos de teclado
  const videoPlayerRef = useRef<VideoPreviewHandle>(null);

  // ─── Rotas memoizadas ────────────────────────────────────
  const routesElement = useMemo(() => (
    <AppRoutes
      isGenerating={isGenerating}
      scenes={scenes}
      handleGenerate={handleGenerate}
      isGenerateDisabled={isGenerateDisabled}
      videoPlayerRef={videoPlayerRef}
    />
  ), [isGenerating, scenes, handleGenerate, isGenerateDisabled, videoPlayerRef]);

  // ─── Atalhos de teclado ────────────────────────────────────
  useKeyboardShortcuts({
    videoPlayerRef,
    onGenerate: handleGenerate,
    isStudioRoute,
    isVideoRoute,
    isGenerating,
    isGenerateDisabled,
    toggleAudioPlayer,
  });

  // ─── Renderização ────────────────────────────────────────
  const isPublicOrLogin = !isAppRoute;
  const showAppLayout = isAppRoute && !isOnboardingRoute;
  const showContainerLayout = isPublicOrLogin && !isOnboardingRoute;

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

      <ScrollToTop />

      {/* Header do app — apenas nas rotas /app/* */}
      {showAppLayout && <Header />}

      <Box
        component="main"
        id="main-content"
        aria-label="Conteúdo principal"
        tabIndex={-1}
        sx={{
          minHeight: showAppLayout ? undefined : `calc(100dvh - ${APP_HEADER_HEIGHT}px)`,
          outline: 'none',
        }}
      >
        {showContainerLayout ? (
          routesElement
        ) : isAssistantRoute ? (
          <Box sx={{ height: `calc(100dvh - ${APP_HEADER_HEIGHT}px)`, overflow: 'hidden' }}>
            {routesElement}
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
            {routesElement}
          </Container>
        )}
      </Box>

      <ToastManager
        activeError={activeError}
        onDismissError={dismissError}
        warning={warning}
        onDismissWarning={dismissWarning}
        successMessage={successMessage}
        onDismissSuccess={dismissSuccess}
        isExportingVideo={isExportingVideo}
        videoExportProgress={videoExportProgress}
        isVideoRoute={isVideoRoute}
      />

      {/* ActionBar — apenas nas rotas /app/estudio e /app/video */}
      {(isStudioRoute || isVideoRoute) && (
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
          videoFps={VIDEO_FPS}
          videoDurationInFrames={durationInFrames}
          onScrollToExport={scrollToExport}
          isExportingVideo={isExportingVideo}
          videoExportProgress={videoExportProgress}
        />
      )}
    </Box>
  );
}
