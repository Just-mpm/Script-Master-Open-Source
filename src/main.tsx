import {StrictMode} from 'react';
import GlobalStyles from '@mui/material/GlobalStyles';
import { StyledEngineProvider } from '@mui/material/styles';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AudioProvider } from './contexts/AudioContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { AppThemeProvider } from './theme/AppThemeProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <AppThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AudioProvider>
              <App />
            </AudioProvider>
          </AuthProvider>
        </BrowserRouter>
      </AppThemeProvider>
    </StyledEngineProvider>
  </StrictMode>,
);
