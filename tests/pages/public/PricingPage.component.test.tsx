import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import PricingPage from '../../../src/pages/public/PricingPage';
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

// Mock PageLayout como pass-through
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
  GAP_DEFAULT: 1,
  TEXT_PRIMARY: '#f8fafc',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  SUCCESS_MAIN: '#10b981',
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
  getPageSeo: () => ({ title: 'Preços e Planos' }),
}));

describe('PricingPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza o título "Escolha o plano ideal para você"', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Escolha o plano ideal para você')).toBeDefined();
  });

  it('renderiza os 3 cards de plano (Gratuito, Pro, Equipe)', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    // "Gratuito" e "Pro" aparecem no card + tabela comparativa
    expect(screen.getAllByText('Gratuito').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Equipe').length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza badge "Popular" no plano Pro', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Popular')).toBeDefined();
  });

  it('renderiza a seção de FAQ', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Perguntas frequentes sobre preços')).toBeDefined();
    expect(screen.getByText('É realmente grátis?')).toBeDefined();
  });

  it('renderiza a tabela comparativa', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Compare os planos em detalhes')).toBeDefined();
    expect(screen.getByText('Geração de áudio TTS')).toBeDefined();
    expect(screen.getByText('Renderização de vídeo')).toBeDefined();
  });

  it('alterna entre Mensal e Anual ao clicar no toggle', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    // Accessible name inclui o Chip "-20%"
    const anualButton = screen.getByRole('button', { name: 'Anual -20%' });
    fireEvent.click(anualButton);
    // Após clicar em Anual, o preço do Pro deve mudar para R$ 23
    expect(screen.getByText('R$ 23')).toBeDefined();
  });
});
