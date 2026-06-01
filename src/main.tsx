import {StrictMode} from 'react';
import GlobalStyles from '@mui/material/GlobalStyles';
import { StyledEngineProvider } from '@mui/material/styles';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AudioProvider } from './contexts/AudioContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { AppThemeProvider } from './theme/AppThemeProvider';
import { I18nProvider } from './features/i18n';
import { getRecaptchaSiteKey } from './lib/env';
import { initErrorTracking } from './lib/logger';
import './index.css';

// Inicializa captura automática de erros globais (window.onerror, unhandledrejection).
// Logs de warn/error são enviados em batch para a collection errorLogs do Firestore.
initErrorTracking();

// NOTA: O registro do service worker agora é feito pelo hook useRegisterSW
// dentro do componente PwaUpdatePrompt, que também gerencia o prompt de
// atualização para o usuário (registerType: 'prompt' no vite.config.ts).

// ── Validação de produção: reCAPTCHA obrigatório ─────────────────────────
// Em produção sem VITE_RECAPTCHA_SITE_KEY, o App Check não inicializa e
// todas as chamadas httpsCallable do Firebase falham.
if (import.meta.env.PROD && !getRecaptchaSiteKey()) {
  const root = document.getElementById('root')!;
  root.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      background: #0a0a0f;
      color: #e0e0e0;
      font-family: Inter, system-ui, sans-serif;
      padding: 2rem;
      text-align: center;
    ">
      <h1 style="font-size: 1.5rem; margin-bottom: 1rem; color: #ffa726;">
        Configuração necessária
      </h1>
      <p style="max-width: 480px; line-height: 1.6; color: #9e9e9e;">
        A chave <code style="background:#1e1e2e;padding:2px 6px;border-radius:4px;">VITE_RECAPTCHA_SITE_KEY</code>
        não está configurada. O App Check do Firebase exige essa chave em produção
        para validar as chamadas às Cloud Functions.
      </p>
      <p style="max-width: 480px; line-height: 1.6; color: #9e9e9e;">
        Adicione a variável ao <code style="background:#1e1e2e;padding:2px 6px;border-radius:4px;">.env</code>
        e reinicie o build.
      </p>
    </div>
  `;
} else {

// ── Providers estáveis ────────────────────────────────────────────────────
// Providers (Auth, I18n, Audio) ficam ACIMA de qualquer ErrorBoundary,
// garantindo que NÃO sejam destruídos em mudanças de rota.
// O ErrorBoundary com reset por pathname fica DENTRO do App, envolvendo
// apenas as Routes — sem afetar providers.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <AppThemeProvider>
        <BrowserRouter>
          <I18nProvider>
            <AuthProvider>
              <AudioProvider>
                <App />
              </AudioProvider>
            </AuthProvider>
          </I18nProvider>
        </BrowserRouter>
      </AppThemeProvider>
    </StyledEngineProvider>
  </StrictMode>,
);

}
