import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import ChangelogPage from '../../../src/pages/public/ChangelogPage';

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
  getPageSeo: () => ({ title: 'Novidades' }),
}));

describe('ChangelogPage', () => {
  it('renderiza título "Novidades"', () => {
    render(<ChangelogPage />, { wrapper: Wrapper });
    expect(screen.getByText('Novidades')).toBeDefined();
  });

  it('renderiza as versões do changelog', () => {
    render(<ChangelogPage />, { wrapper: Wrapper });
    expect(screen.getByText('Páginas Públicas e Design System')).toBeDefined();
    expect(screen.getByText('Player de Vídeo Integrado')).toBeDefined();
    expect(screen.getByText('Suite de Testes')).toBeDefined();
    expect(screen.getByText('Whisper e Legendas')).toBeDefined();
  });

  it('renderiza badge "Mais recente" na primeira versão', () => {
    render(<ChangelogPage />, { wrapper: Wrapper });
    expect(screen.getByText('Mais recente')).toBeDefined();
  });

  it('renderiza lista de mudanças com check icons', () => {
    render(<ChangelogPage />, { wrapper: Wrapper });
    expect(screen.getByText('Landing Page e página de Funcionalidades com design premium')).toBeDefined();
    expect(screen.getByText('Paleta de marca atualizada (azul + laranja)')).toBeDefined();
    expect(screen.getByText('77 testes novos (total: 857)')).toBeDefined();
  });
});
