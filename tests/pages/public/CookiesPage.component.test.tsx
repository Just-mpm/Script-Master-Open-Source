import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import CookiesPage from '../../../src/pages/public/CookiesPage';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

vi.mock('../../../src/components/public/PageLayout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  APP_BORDER: 'rgba(255,255,255,0.08)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_GLOW: 'rgba(46, 117, 182, 0.28)',
  BRAND_SECONDARY: '#F7941E',
  TEXT_PRIMARY: '#f8fafc',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  SUCCESS_MAIN: '#10b981',
  WARNING_MAIN: '#f59e0b',
  TEXT_DISABLED: 'rgba(248, 250, 252, 0.38)',
  SHADOW_DEEP: '#020617',
  ICON_SIZE_MD: 16,
  WHITE_04: 'rgba(255,255,255,0.04)',
  WHITE_06: 'rgba(255,255,255,0.06)',
  WHITE_12: 'rgba(255,255,255,0.12)',
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Política de Cookies' }),
}));

describe('CookiesPage', () => {
  it('renderiza título "Política de Cookies"', () => {
    render(<CookiesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Política de Cookies')).toBeDefined();
  });

  it('renderiza as 6 seções', () => {
    render(<CookiesPage />, { wrapper: Wrapper });
    // Cada seção aparece no sumário + conteúdo, usamos getAllByText
    const sections = [
      '1. O que são Cookies',
      '2. Cookies que Usamos',
      '3. Cookies de Terceiros',
      '4. Gerenciamento de Cookies',
      '5. Alterações nesta Política',
      '6. Contato',
    ];
    for (const section of sections) {
      const matches = screen.getAllByText(section);
      expect(matches.length).toBeGreaterThanOrEqual(2); // sumário + conteúdo
    }
  });

  it('renderiza sumário clicável', () => {
    render(<CookiesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Sumário')).toBeDefined();
  });

  it('renderiza data de última atualização', () => {
    render(<CookiesPage />, { wrapper: Wrapper });
    expect(screen.getByText(/Última atualização/)).toBeDefined();
  });
});
