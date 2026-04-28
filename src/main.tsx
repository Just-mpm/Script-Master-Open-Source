import {StrictMode, type ReactNode} from 'react';
import GlobalStyles from '@mui/material/GlobalStyles';
import { StyledEngineProvider } from '@mui/material/styles';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AudioProvider } from './contexts/AudioContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { AppThemeProvider } from './theme/AppThemeProvider';
import { I18nProvider } from './features/i18n';
import './index.css';

// Registra o service worker apenas em produção
if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

/**
 * Wrapper que usa useLocation para resetar o ErrorBoundary a cada mudança de rota.
 * O key dinâmico força o React a destruir e recriar o ErrorBoundary,
 * limpando o estado de erro automaticamente.
 */
function RoutableErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <ErrorBoundary key={location.pathname}>
      {children}
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <AppThemeProvider>
        <BrowserRouter>
          <RoutableErrorBoundary>
            <I18nProvider>
            <AuthProvider>
              <AudioProvider>
                  <App />
                </AudioProvider>
            </AuthProvider>
            </I18nProvider>
          </RoutableErrorBoundary>
        </BrowserRouter>
      </AppThemeProvider>
    </StyledEngineProvider>
  </StrictMode>,
);
