import { lazy, Suspense, type ReactNode } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { RefObject } from 'react';
import type { VideoPreviewHandle } from '../components/VideoPreview';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { publicCompatRedirects, appCompatRedirects } from './Redirects';

// ─── Páginas públicas (lazy) — todas usam export default ──

const LandingPage = lazy(async () => {
  const module = await import('../pages/public/LandingPage');
  return { default: module.default };
});

const FuncionalidadesPage = lazy(async () => {
  const module = await import('../pages/public/FuncionalidadesPage');
  return { default: module.default };
});

const PricingPage = lazy(async () => {
  const module = await import('../pages/public/PricingPage');
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

const StatusPage = lazy(async () => {
  const module = await import('../pages/public/StatusPage');
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

const NotFoundPage = lazy(async () => {
  const module = await import('../pages/NotFoundPage');
  return { default: module.NotFoundPage };
});

// ─── Fallback de carregamento ──────────────────────────────

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
  return (
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
        <Route path="/onboarding" element={<OnboardingPage />} />

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

          {/* Redirects de compatibilidade (rotas do app) */}
          {appCompatRedirects}
        </Route>

        {/* Redirect raiz do app */}
        <Route path="/app" element={<Navigate to="/app/estudio" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
