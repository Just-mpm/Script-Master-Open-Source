import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import AboutPage from '../../../src/pages/public/AboutPage';
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

vi.mock('../../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/theme/tokens')>();
  return {
    ...actual,
    APP_MAX_WIDTH: 1600,
    APP_BORDER: 'rgba(255,255,255,0.08)',
    BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    BRAND_PRIMARY: '#2E75B6',
    BRAND_PRIMARY_GLOW: 'rgba(46, 117, 182, 0.28)',
    BRAND_SECONDARY: '#F7941E',
    BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
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
  };
});

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Sobre' }),
}));

describe('AboutPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza título "Uma ferramenta feita para tirar roteiros da gaveta"', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    expect(screen.getByText('Uma ferramenta feita para tirar roteiros da gaveta')).toBeDefined();
  });

  it('renderiza seção de missão e visão', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    expect(screen.getByText('Por que isso existe')).toBeDefined();
    expect(screen.getByText('O que estamos construindo')).toBeDefined();
  });

  it('renderiza os 3 cards de valores', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    expect(screen.getByText('Criatividade')).toBeDefined();
    expect(screen.getByText('Simplicidade')).toBeDefined();
    expect(screen.getByText('Inovação')).toBeDefined();
  });

  it('renderiza seção de roadmap com versões', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    expect(screen.getByText('Entrada simples e segura')).toBeDefined();
    expect(screen.getByText('Cenas e vídeo no navegador')).toBeDefined();
    expect(screen.getByText('Estúdio de Produção')).toBeDefined();
    expect(screen.getByText('Planos justos')).toBeDefined();
    expect(screen.getByText('Lançamento oficial')).toBeDefined();
  });

  it('renderiza status "Concluído" e "Planejado" no roadmap', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    const concluido = screen.getAllByText('Concluído');
    expect(concluido.length).toBeGreaterThanOrEqual(1);
    const planejado = screen.getAllByText('Planejado');
    expect(planejado.length).toBeGreaterThanOrEqual(1);
  });
});
