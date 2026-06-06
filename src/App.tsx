import { useEffect, useMemo, useRef } from 'react';
import { useLocale } from './features/i18n';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ActionBar } from './components/ActionBar';
import { ScrollToTop } from './components/public/ScrollToTop';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCrossRouteRenderGuard } from './hooks/useCrossRouteRenderGuard';
import { ExportCrossRouteToast } from './components/app/ExportCrossRouteToast';
import type { VideoPreviewHandle } from './components/VideoPreview';
import { useAudioGenerationHandler } from './components/app/AudioGenerationHandler';
import { AudioPreflightDialog } from './components/app/AudioPreflightDialog';
import { PwaUpdatePrompt } from './components/app/PwaUpdatePrompt';
import { PwaInstallPrompt } from './components/app/PwaInstallPrompt';
import { AnalyticsConsentPrompt } from './components/app/AnalyticsConsentPrompt';
import { MobileBottomNav } from './components/app/MobileBottomNav';
import { Sidebar } from './components/app/Sidebar';
import { SidebarNetworkBanner } from './components/app/SidebarNetworkBanner';
import { ToastManager } from './components/toast/ToastProvider';

import { FeedbackController } from './components/feedback';
import { AppRoutes } from './router/routes';
import { VIDEO_FPS } from './features/studio/store';
import { APP_MAX_WIDTH, WHITE_08 } from './theme/tokens';
import { useAutoSaveStudioSettings } from './hooks/useAutoSaveStudioSettings';
import { useGlobalAudioActions, useAudioActiveId } from './contexts/AudioContext';
import { setAnalyticsUserProperties } from './lib/analytics';

export default function App() {
  const { t, locale } = useLocale();
  const location = useLocation();
  const currentPath = location.pathname;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ─── Guard cross-route (M5) — centraliza beforeunload + title + visibility ──
  useCrossRouteRenderGuard();

  useEffect(() => {
    setAnalyticsUserProperties({ locale });
  }, [locale]);

  // ─── Auto-save de settings do estúdio no Firestore ────────
  useAutoSaveStudioSettings();

  // ─── AudioContext — play e activeId para atalhos de teclado ─
  const { play: playGlobalAudio } = useGlobalAudioActions();
  const activeAudioId = useAudioActiveId();

  // ─── Handler de geração de áudio (hook centralizado) ─────
  const {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    scenes,
    handleGenerate,
    confirmGenerate,
    closePreflightDialog,
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
    isPreparingPreflight,
    isPreflightOpen,
    preflight,
    preflightError,
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
    playAudio: playGlobalAudio,
    activeAudioId,
    audioUrl,
  });

  // ─── Renderização ────────────────────────────────────────
  const isPublicOrLogin = !isAppRoute;
  const showAppLayout = isAppRoute && !isOnboardingRoute;
  const showContainerLayout = isPublicOrLogin && !isOnboardingRoute;

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        height: '100dvh',
        display: 'flex',
        bgcolor: 'background.default',
        color: 'text.primary',
        overflow: 'hidden',
      }}
    >
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

      {/* Container de toasts do react-hot-toast — posição top-center para não conflitar com o ExportCrossRouteToast */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e1e2e',
            color: '#e0e0e0',
            borderRadius: '12px',
            fontSize: '0.875rem',
            border: `1px solid ${WHITE_08}`,
          },
          success: {
            iconTheme: {
              primary: '#4caf50',
              secondary: '#1e1e2e',
            },
          },
        }}
      />

      {/* Toast cross-route de exportação de vídeo (M6) — sempre montado, só aparece em rotas != /app/video */}
      <ExportCrossRouteToast />

      {/* Sidebar do app — apenas em desktop, nas rotas /app/* */}
      {showAppLayout && !isMobile && <Sidebar />}

      <Box
        component="main"
        id="main-content"
        aria-label={t('common.mainContent')}
        tabIndex={-1 }
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          overflow: 'auto',
        }}
      >
        {showContainerLayout ? (
          routesElement
        ) : isAssistantRoute ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {routesElement}
          </Box>
        ) : (
          <Container
            maxWidth={false}
            sx={{
              maxWidth: APP_MAX_WIDTH,
              px: { xs: 2, sm: 3, lg: 4 },
              py: { xs: 3, md: 4 },
              pb: { xs: 10, md: 6 },
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
      />

      <AudioPreflightDialog
        open={isPreflightOpen}
        loading={isPreparingPreflight}
        preflight={preflight}
        error={preflightError}
        onClose={closePreflightDialog}
        onConfirm={confirmGenerate}
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

      {/* Prompt de atualização PWA — detecta nova versão após deploy */}
      <PwaUpdatePrompt />
      {/* Prompt de instalação PWA — convite para Add to Home Screen,
          coordena sobreposição com PwaUpdatePrompt via evento customizado */}
      <PwaInstallPrompt />
      <AnalyticsConsentPrompt />

      {/* Controller global do FeedbackDialog — escuta evento de abertura */}
      <FeedbackController />

      {/* Bottom Nav mobile — apenas em rotas /app/* (não onboarding) */}
      {showAppLayout && <MobileBottomNav />}



      {/* Banner de status de rede — sobreposto no topo (retorna null quando online) */}
      <SidebarNetworkBanner />
    </Box>
  );
}
