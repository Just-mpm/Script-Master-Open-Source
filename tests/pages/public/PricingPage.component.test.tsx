import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('../../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/theme/tokens')>();
  return {
    ...actual,
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
  getPageSeo: () => ({ title: 'Beta Aberto' }),
}));

describe('PricingPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza o título "Entre agora enquanto o beta está aberto"', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Entre agora enquanto o beta está aberto')).toBeDefined();
  });

  it('renderiza o subtítulo sobre o beta', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText(/Crie vídeos com IA gratuitamente/)).toBeDefined();
  });

  it('renderiza a seção de créditos com 3 cards', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('500 créditos mensais gratuitos')).toBeDefined();
    expect(screen.getByText('+250 créditos ao enviar feedback')).toBeDefined();
    expect(screen.getByText('Sem cartão de crédito')).toBeDefined();
  });

  it('renderiza a seção "Como começar no beta" com 3 passos', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: 'Como começar no beta' })).toBeDefined();
    expect(screen.getByText('Faça login')).toBeDefined();
    expect(screen.getByText('Teste seu roteiro')).toBeDefined();
    expect(screen.getByText('Acompanhe seu saldo')).toBeDefined();
  });

  it('renderiza o aviso de pagamentos pausados', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Pagamentos e assinaturas estão temporariamente pausados.')).toBeDefined();
  });

  it('renderiza a seção de FAQ do beta', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Perguntas frequentes sobre o beta')).toBeDefined();
  });

  it('renderiza a CTA final com link para cadastro', () => {
    render(<PricingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Quer testar antes de virar plano pago?')).toBeDefined();
    // CTA aponta para /cadastro
    const ctaLinks = screen.getAllByRole('link', { name: /Criar conta gratuita/i });
    expect(ctaLinks[0].getAttribute('href')).toBe('/cadastro');
  });
});
