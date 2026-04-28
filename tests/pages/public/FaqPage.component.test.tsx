import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import FaqPage from '../../../src/pages/public/FaqPage';
import { I18nProvider } from '../../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>
        <MemoryRouter>{children}</MemoryRouter>
      </ThemeProvider>
    </I18nProvider>
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
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46, 117, 182, 0.12)',
  BRAND_SECONDARY: '#F7941E',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  GAP_DEFAULT: 1,
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
  getPageSeo: () => ({ title: 'Perguntas Frequentes' }),
}));

describe('FaqPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza título "Perguntas Frequentes"', () => {
    render(<FaqPage />, { wrapper: Wrapper });
    expect(screen.getByText('Perguntas Frequentes')).toBeDefined();
  });

  it('renderiza as 4 categorias de tabs', () => {
    render(<FaqPage />, { wrapper: Wrapper });
    expect(screen.getByRole('tab', { name: 'Geral' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Preços' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Técnico' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Conta' })).toBeDefined();
  });

  it('renderiza perguntas da categoria ativa (Geral)', () => {
    render(<FaqPage />, { wrapper: Wrapper });
    expect(screen.getByText('O que é o Script Master?')).toBeDefined();
    expect(screen.getByText('Preciso de conta para usar?')).toBeDefined();
    expect(screen.getByText('Meus dados estão seguros?')).toBeDefined();
  });

  it('renderiza seção "Ainda tem dúvidas?" com link para contato', () => {
    render(<FaqPage />, { wrapper: Wrapper });
    expect(screen.getByText('Ainda tem dúvidas?')).toBeDefined();
    const contactLink = screen.getByRole('link', { name: /Fale conosco/i });
    expect(contactLink.getAttribute('href')).toBe('/contato');
  });
});
