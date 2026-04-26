import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import AboutPage from '../../../src/pages/public/AboutPage';

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
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Sobre' }),
}));

describe('AboutPage', () => {
  it('renderiza título "Sobre o Script Master"', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    expect(screen.getByText('Sobre o Script Master')).toBeDefined();
  });

  it('renderiza seção de missão e visão', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    expect(screen.getByText('Nossa Missão')).toBeDefined();
    expect(screen.getByText('Nossa Visão')).toBeDefined();
  });

  it('renderiza os 3 cards de valores', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    expect(screen.getByText('Criatividade')).toBeDefined();
    expect(screen.getByText('Simplicidade')).toBeDefined();
    expect(screen.getByText('Inovação')).toBeDefined();
  });

  it('renderiza seção de roadmap com versões', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    expect(screen.getByText('Roadmap Público')).toBeDefined();
    expect(screen.getByText('Speed Paint e Vídeo Avançado')).toBeDefined();
    expect(screen.getByText('Planos e Pagamentos')).toBeDefined();
    expect(screen.getByText('Lançamento Oficial')).toBeDefined();
  });

  it('renderiza status "Concluído" e "Planejado" no roadmap', () => {
    render(<AboutPage />, { wrapper: Wrapper });
    const concluido = screen.getAllByText('Concluído');
    expect(concluido.length).toBeGreaterThanOrEqual(1);
    const planejado = screen.getAllByText('Planejado');
    expect(planejado.length).toBeGreaterThanOrEqual(1);
  });
});
