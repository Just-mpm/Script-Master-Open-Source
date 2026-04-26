import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ActionBar } from './components/ActionBar';
import { ErrorToast } from './components/ErrorToast';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SuccessToast } from './components/SuccessToast';
import { WarningToast } from './components/WarningToast';
import type { VideoPreviewHandle } from './components/VideoPreview';
import { ScrollToTop } from './components/public/ScrollToTop';
import { useAuth } from './contexts/AuthContext';
import { useGlobalAudioActions } from './contexts/AudioContext';
import { useAudioGenerator } from './hooks/useAudioGenerator';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { MAX_CHARS } from './lib/constants';
import { saveGeneration, type SavedAudio } from './lib/db';
import { createLogger } from './lib/logger';
import { useStudioStore, VIDEO_FPS, buildGenerateOptions } from './features/studio/store';
import { useVideoRenderBridge } from './features/video-render/store/videoRenderBridge';
import { APP_HEADER_HEIGHT, APP_MAX_WIDTH } from './theme/tokens';

const log = createLogger('App');

// ─── Páginas públicas (lazy) ───────────────────────────────

const LandingPage = lazy(async () => {
  const module = await import('./pages/public/LandingPage');
  return { default: module.default };
});

const FuncionalidadesPage = lazy(async () => {
  const module = await import('./pages/public/FuncionalidadesPage');
  return { default: module.default };
});

const PricingPage = lazy(async () => {
  const module = await import('./pages/public/PricingPage');
  return { default: module.default };
});

const FaqPage = lazy(async () => {
  const module = await import('./pages/public/FaqPage');
  return { default: module.default };
});

const ContactPage = lazy(async () => {
  const module = await import('./pages/public/ContactPage');
  return { default: module.default };
});

const AboutPage = lazy(async () => {
  const module = await import('./pages/public/AboutPage');
  return { default: module.default };
});

const TermsPage = lazy(async () => {
  const module = await import('./pages/public/TermsPage');
  return { default: module.default };
});

const PrivacyPage = lazy(async () => {
  const module = await import('./pages/public/PrivacyPage');
  return { default: module.default };
});

const CookiesPage = lazy(async () => {
  const module = await import('./pages/public/CookiesPage');
  return { default: module.default };
});

const StatusPage = lazy(async () => {
  const module = await import('./pages/public/StatusPage');
  return { default: module.default };
});

// ─── Páginas do app (lazy) ─────────────────────────────────

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

const LoginPage = lazy(async () => {
  const module = await import('./pages/LoginPage');
  return { default: module.LoginPage };
});

const RegisterPage = lazy(async () => {
  const module = await import('./pages/RegisterPage');
  return { default: module.RegisterPage };
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
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { authError, clearAuthError, user } = useAuth();
  const userId = user?.uid;
  const { toggle, setDurationOverride } = useGlobalAudioActions();

  // ─── Estado de geração de áudio (hook) ────────────────────
  const {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    audioBlob,
    scenes,
    error,
    setError,
    sceneGenerationWarning,
    generateAudio,
    handleCancel,
    durationInSeconds,
  } = useAudioGenerator();

  // ─── Estado de config do store (Zustand) ──────────────────
  const script = useStudioStore((s) => s.script);

  // Derivações para ActionBar e atalhos
  const isGenerateDisabled = isGenerating || !script.trim() || script.length > MAX_CHARS;
  const durationInFrames = useMemo(
    () => Math.round(durationInSeconds * VIDEO_FPS),
    [durationInSeconds],
  );

  // Sincroniza duração com AudioContext
  useEffect(() => {
    setDurationOverride(durationInSeconds > 0 ? durationInSeconds : null);
  }, [durationInSeconds, setDurationOverride]);

  // ─── UI state transitório ─────────────────────────────────
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // ─── Classificação de rotas ──────────────────────────────
  const isAppRoute = currentPath.startsWith('/app/');
  const isAssistantRoute = currentPath === '/app/assistente';
  const isStudioRoute = currentPath === '/app/estudio';
  const isVideoRoute = currentPath === '/app/video';

  // Ref compartilhado entre VideoPage (dono) e ActionBar (consumidor)
  const videoPlayerRef = useRef<VideoPreviewHandle>(null);

  // Bridge store — lê apenas as slices necessárias (evita re-render 30x/s)
  const isExportingVideo = useVideoRenderBridge((s) => s.isExportingVideo);
  const videoExportProgress = useVideoRenderBridge((s) => s.videoExportProgress);

  // ─── Handlers ─────────────────────────────────────────────

  // handleGenerate: lê config do store via getState() no momento da execução.
  // Deps apenas em generateAudio (estável via useCallback) e userId.
  const handleGenerate = useCallback(() => {
    generateAudio(buildGenerateOptions(userId, useStudioStore.getState()));
  }, [generateAudio, userId]);

  const handleDownload = useCallback(() => {
    if (!audioUrl) return;

    const voice = useStudioStore.getState().selectedVoice;
    const safeVoiceName = voice.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
    const anchor = document.createElement('a');
    anchor.href = audioUrl;
    anchor.download = `roteiro-${safeVoiceName}-${Date.now()}.wav`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [audioUrl]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!audioBlob || isSaved) return;

    try {
      const s = useStudioStore.getState();
      const voiceLabel = s.isMultiSpeaker ? `${s.selectedVoice} & ${s.speakerBVoice}` : s.selectedVoice;
      const newItem: SavedAudio = {
        id: crypto.randomUUID(),
        name: `Roteiro - ${voiceLabel} - ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        audioBlob,
        script: s.script,
        voice: voiceLabel,
        scenes: scenes.length > 0 ? scenes : [],
      };

      await saveGeneration(newItem, userId);
      setIsSaved(true);
      setSuccessMsg(user
        ? 'Áudio salvo na nuvem com sucesso!'
        : 'Áudio salvo na biblioteca local!');
    } catch (saveError: unknown) {
      log.error('Erro ao salvar na biblioteca', { error: saveError });
      setError('Erro ao salvar na biblioteca.');
    }
  }, [audioBlob, isSaved, scenes, user, userId, setError]);

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

  const [localSceneWarning, setLocalSceneWarning] = useState<string | null>(null);

  useEffect(() => {
    if (sceneGenerationWarning) {
      setLocalSceneWarning(sceneGenerationWarning);
    }
  }, [sceneGenerationWarning]);

  const dismissSceneWarning = useCallback(() => setLocalSceneWarning(null), []);
  const dismissSuccess = useCallback(() => setSuccessMsg(null), []);

  // Reseta isSaved ao iniciar nova geração
  useEffect(() => {
    if (isGenerating) setIsSaved(false);
  }, [isGenerating]);

  // ─── Rotas ───────────────────────────────────────────────
  // Rotas são estáticas: imports lazy e refs não mudam entre renders.
  const routes = useMemo(() => (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/funcionalidades" element={<FuncionalidadesPage />} />
        <Route path="/precos" element={<PricingPage />} />
        <Route path="/perguntas-frequentes" element={<FaqPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />

        {/* Redirects de rotas públicas antigas */}
        <Route path="/features" element={<Navigate to="/funcionalidades" replace />} />
        <Route path="/pricing" element={<Navigate to="/precos" replace />} />
        <Route path="/faq" element={<Navigate to="/perguntas-frequentes" replace />} />
        <Route path="/contact" element={<Navigate to="/contato" replace />} />
        <Route path="/about" element={<Navigate to="/sobre" replace />} />
        <Route path="/register" element={<Navigate to="/cadastro" replace />} />
        <Route path="/terms" element={<Navigate to="/termos" replace />} />
        <Route path="/privacy" element={<Navigate to="/privacidade" replace />} />
        <Route path="/cookies" element={<Navigate to="/cookies" replace />} />
        {/* Rotas protegidas do app (prefixo /app/) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app/estudio" element={<StudioPage />} />

          <Route
            path="/app/video"
            element={
              <VideoPage
                videoPlayerRef={videoPlayerRef}
              />
            }
          />

          <Route path="/app/imagens" element={<ImageStudio />} />
          <Route path="/app/image" element={<Navigate to="/app/imagens" replace />} />

          <Route
            path="/app/assistente"
            element={<AssistantPage />}
          />
          <Route path="/app/assistant" element={<Navigate to="/app/assistente" replace />} />

          <Route path="/app/biblioteca" element={<LibraryPage />} />
          <Route path="/app/library" element={<Navigate to="/app/biblioteca" replace />} />
          <Route path="/app/pintura-rapida" element={<SpeedPaintPage />} />
          <Route path="/app/speed-paint" element={<Navigate to="/app/pintura-rapida" replace />} />
        </Route>

        {/* Redirect raiz do app */}
        <Route path="/app" element={<Navigate to="/app/estudio" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  ), []);

  // ─── Atalhos de teclado ────────────────────────────────────
  useKeyboardShortcuts({
    videoPlayerRef,
    onGenerate: handleGenerate,
    isStudioRoute,
    isVideoRoute,
    isGenerating,
    isGenerateDisabled,
    toggleAudioPlayer: toggle,
  });

  // ─── Renderização ────────────────────────────────────────
  const isPublicOrLogin = !isAppRoute;

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
      {isAppRoute && <Header />}

      <Box
        component="main"
        id="main-content"
        aria-label="Conteúdo principal"
        tabIndex={-1}
        sx={{
          minHeight: isPublicOrLogin ? undefined : `calc(100dvh - ${APP_HEADER_HEIGHT}px)`,
          outline: 'none',
        }}
      >
        {isPublicOrLogin ? (
          routes
        ) : isAssistantRoute ? (
          <Box sx={{ height: `calc(100dvh - ${APP_HEADER_HEIGHT}px)`, overflow: 'hidden' }}>
            {routes}
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
            {routes}
          </Container>
        )}
      </Box>

      <ErrorToast error={activeError} onDismiss={dismissError} />
      <WarningToast warning={localSceneWarning} onDismiss={dismissSceneWarning} />
      <SuccessToast message={successMsg} onDismiss={dismissSuccess} />

      {/* Toast de progresso de exportação — visível quando exportando fora da página /video */}
      {isExportingVideo && !isVideoRoute && (
        <Snackbar
          open
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 80, md: 96 } }}
        >
          <Alert
            severity="info"
            variant="filled"
            role="progressbar"
            aria-valuenow={videoExportProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Exportando vídeo: ${videoExportProgress}%`}
            icon={<CircularProgress size={20} color="inherit" />}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={() => navigate('/app/video')}
                sx={{ fontWeight: 600 }}
              >
                Ver vídeo
              </Button>
            }
            sx={{
              width: '100%',
              alignItems: 'center',
              minWidth: { xs: 'min(92vw, 360px)', sm: 400 },
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Exportando vídeo...
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {videoExportProgress}%
              </Typography>
            </Stack>
          </Alert>
        </Snackbar>
      )}

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
