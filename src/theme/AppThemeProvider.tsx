import type { PropsWithChildren } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import appTheme from './appTheme';

type AppThemeProviderProps = PropsWithChildren;

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <ThemeProvider theme={appTheme} defaultMode="dark" noSsr disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
