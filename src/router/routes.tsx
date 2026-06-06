import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import type { RefObject } from 'react';
import type { VideoPreviewHandle } from '../components/VideoPreview';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { GuestRoute } from '../components/GuestRoute';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useLocale } from '../features/i18n';
import { publicCompatRedirects, appCompatRedirects } from './Redirects';
import { RADIUS_SM } from '../theme/tokens';

// ─── Páginas públicas (lazy) — todas usam export default ──

const LandingPage = lazy(async () => {
  const module = await import('../pages/public/LandingPage');
  return { default: module.default };
});

const FuncionalidadesPage = lazy(async () => {
  const module = await import('../pages/public/FuncionalidadesPage');
  return { default: module.default };
});

const OpenSourcePage = lazy(async () => {
  const module = await import('../pages/public/OpenSourcePage');
  return { default: module.default };
});

const FaqPage = lazy(async () => {
  const module = await import('../pages/public/FaqPage');
  return { default: module.default };
});

const ContactPage = lazy(async () => {
  const module = await import('../pages/public/ContactPage');
  return { default: module.default };
});

const AboutPage = lazy(async () => {
  const module = await import('../pages/public/AboutPage');
  return { default: module.default };
});

const TermsPage = lazy(async () => {
  const module = await import('../pages/public/TermsPage');
  return { default: module.default };
});

const PrivacyPage = lazy(async () => {
  const module = await import('../pages/public/PrivacyPage');
  return { default: module.default };
});

const CookiesPage = lazy(async () => {
  const module = await import('../pages/public/CookiesPage');
  return { default: module.default };
});

// ─── Páginas auth (lazy) — export nomeado ─────────────────

const LoginPage = lazy(async () => {
  const module = await import('../pages/LoginPage');
  return { default: module.LoginPage };
});

const RegisterPage = lazy(async () => {
  const module = await import('../pages/RegisterPage');
  return { default: module.RegisterPage };
});

const OnboardingPage = lazy(async () => {
  const module = await import('../pages/OnboardingPage');
  return { default: module.OnboardingPage };
});

const AuthActionPage = lazy(async () => {
  const module = await import('../pages/AuthActionPage');
  return { default: module.AuthActionPage };
});

// ─── Páginas do app (lazy) — export nomeado ───────────────

const StudioPage = lazy(async () => {
  const module = await import('../pages/StudioPage');
  return { default: module.StudioPage };
});

const VideoPage = lazy(async () => {
  const module = await import('../pages/VideoPage');
  return { default: module.VideoPage };
});

const ImageStudio = lazy(async () => {
  const module = await import('../components/ImageStudio');
  return { default: module.ImageStudio };
});

const AssistantPage = lazy(async () => {
  const module = await import('../pages/AssistantPage');
  return { default: module.AssistantPage };
});

const LibraryPage = lazy(async () => {
  const module = await import('../pages/LibraryPage');
  return { default: module.LibraryPage };
});

const SpeedPaintPage = lazy(async () => {
  const module = await import('../pages/SpeedPaintPage');
  return { default: module.SpeedPaintPage };
});

const ConfiguracoesPage = lazy(async () => {
  const module = await import('../pages/ConfiguracoesPage');
  return { default: module.ConfiguracoesPage };
});

const ManualProjectPage = lazy(async () => {
  const module = await import('../features/manual-project/pages/ManualProjectPage');
  return { default: module.ManualProjectPage };
});

const NotFoundPage = lazy(async () => {
  const module = await import('../pages/NotFoundPage');
  return { default: module.NotFoundPage };
});

// ─── Fallback de carregamento ──────────────────────────────

function RouteFallback() {
  const location = useLocation();
  const { t } = useLocale();

  const pageLabel = useMemo(() => {
    const path = location.pathname;

    if (path.startsWith('/app/estudio')) return t('studio.header.nav.studio');
    if (path.startsWith('/app/imagens')) return t('studio.header.nav.image');
    if (path.startsWith('/app/video')) return t('studio.header.nav.video');
    if (path.startsWith('/app/pintura-rapida')) return t('studio.header.nav.speedPaint');
    if (path.startsWith('/app/assistente')) return t('studio.header.nav.ai');
    if (path.startsWith('/app/biblioteca')) return t('studio.header.nav.library');
    if (path.startsWith('/app/configuracoes')) return t('studio.header.nav.settings');

    return null;
  }, [location.pathname, t]);

  return (
    <Stack sx={{ minHeight: '55vh', justifyContent: 'center' }}>
      <Paper
        elevation={0}
        sx={(theme) => ({
          mx: 'auto',
          width: '100%',
          maxWidth: 760,
          overflow: 'hidden',
          borderRadius: { xs: 4, md: 5 },
          border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.background.paper, 0.84)} 100%)`,
          boxShadow: `0 24px 64px ${alpha(theme.palette.common.black, 0.22)}`,
        })}
      >
        <Stack spacing={3} sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={(theme) => ({
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                  color: 'primary.main',
                })}
              >
                <CircularProgress size={20} thickness={5} color="inherit" />
              </Box>
              <Stack spacing={0.35}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {t('common.loading')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('common.loadingPageSubtitle')}
                </Typography>
              </Stack>
            </Stack>

            {pageLabel ? <Chip label={pageLabel} size="small" variant="outlined" /> : null }
          </Stack>

          <Stack spacing={1.2}>
            <Skeleton variant="text" animation="wave" width="36%" height={18} />
            <Skeleton variant="rounded" animation="wave" height={88} sx={{ borderRadius: RADIUS_SM }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <Skeleton variant="rounded" animation="wave" height={64} sx={{ flex: 1, borderRadius: RADIUS_SM }} />
              <Skeleton variant="rounded" animation="wave" height={64} sx={{ flex: 1, borderRadius: RADIUS_SM }} />
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

// ─── Tipos ─────────────────────────────────────────────────

type SceneItem = { imageUrl: string; timestamp: number };

interface AppRoutesProps {
  isGenerating: boolean;
  scenes: SceneItem[];
  handleGenerate: () => void;
  isGenerateDisabled: boolean;
  videoPlayerRef: RefObject<VideoPreviewHandle | null>;
}

// ─── Componente de rotas ───────────────────────────────────

export function AppRoutes({
  isGenerating,
  scenes,
  handleGenerate,
  isGenerateDisabled,
  videoPlayerRef,
}: AppRoutesProps): ReactNode {
  // key={pathname} no ErrorBoundary reseta o estado de erro ao navegar,
  // mas NÃO afeta providers (Auth, I18n, Audio) que estão acima na árvore.
  const location = useLocation();

  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        {/* Rotas para visitantes — logados são redirecionados para /app/assistente */}
        <Route element={<GuestRoute />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
        </Route>

        {/* Rotas públicas */}
        <Route path="/funcionalidades" element={<FuncionalidadesPage />} />
        <Route path="/open-source" element={<OpenSourcePage />} />
        <Route path="/perguntas-frequentes" element={<FaqPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/auth/action" element={<AuthActionPage />} />

        {/* Redirects de compatibilidade (rotas públicas antigas) */}
        {publicCompatRedirects}

        {/* Rotas protegidas do app (prefixo /app/) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app/estudio" element={
            <StudioPage
              isGenerating={isGenerating}
              scenes={scenes}
              handleGenerate={handleGenerate}
              isGenerateDisabled={isGenerateDisabled}
            />
          } />

          <Route
            path="/app/video"
            element={
              <VideoPage
                videoPlayerRef={videoPlayerRef}
              />
            }
          />

          <Route path="/app/imagens" element={<ImageStudio />} />

          <Route
            path="/app/assistente"
            element={<AssistantPage />}
          />

          <Route path="/app/biblioteca" element={<LibraryPage />} />
          <Route path="/app/pintura-rapida" element={<SpeedPaintPage />} />
          <Route path="/app/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/app/projeto/novo" element={<ManualProjectPage />} />

          {/* Redirects de compatibilidade (rotas do app) */}
          {appCompatRedirects}
        </Route>

        {/* Redirect raiz do app */}
        <Route path="/app" element={<Navigate to="/app/assistente" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </ErrorBoundary>
  );
}
