import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../../../src/pages/public/LandingPage';
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
    BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    BRAND_PRIMARY: '#2E75B6',
    BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
    BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)',
    BRAND_SECONDARY: '#F7941E',
    BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
    TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
    ICON_SIZE_MD: 20,
    APP_BORDER: 'rgba(255,255,255,0.08)',
  };
});

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('LandingPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza sem crash', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Nunca foi tão fácil criar vídeos para YouTube')).toBeDefined();
  });

  it('renderiza a seção hero', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Nunca foi tão fácil criar vídeos para YouTube')).toBeDefined();
    expect(screen.getByText(/Cole seu roteiro e gere narração/)).toBeDefined();
  });

  it('renderiza os CTAs do hero', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getAllByRole('link', { name: /Criar meu primeiro vídeo/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Ver como funciona/i })).toBeDefined();
  });

  it('renderiza a barra SocialProofBar', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Voz, cenas e vídeo com IA')).toBeDefined();
  });

  it('renderiza a seção de features highlights', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Do roteiro ao vídeo pronto')).toBeDefined();
  });

  it('renderiza todos os feature cards de destaque', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Narração pronta sem gravar')).toBeDefined();
    expect(screen.getByText('Vídeo montado direto no navegador')).toBeDefined();
    expect(screen.getByText('Cenas para acompanhar o roteiro')).toBeDefined();
    expect(screen.getByText('Speed Paint')).toBeDefined();
    expect(screen.getByText('Assistente criativo')).toBeDefined();
    expect(screen.getByText('Projetos salvos e organizados')).toBeDefined();
  });

  it('renderiza os feature showcases (TTS, Vídeo, IA)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Sua narração pronta em minutos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Vídeo montado sem sair do navegador' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Um parceiro para destravar o roteiro' })).toBeInTheDocument();
  });

  it('renderiza a seção "Como funciona"', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Como funciona' })).toBeDefined();
  });

  it('renderiza os 3 steps', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Escreva seu roteiro')).toBeDefined();
    expect(screen.getByText('Gere voz, cenas e legendas')).toBeDefined();
    expect(screen.getByText('Exporte e publique')).toBeDefined();
  });

  it('renderiza a seção "Detalhes que deixam o fluxo mais leve"', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Detalhes que deixam o fluxo mais leve' })).toBeDefined();
  });

  it('renderiza features extras (Multi-speaker, Chunking, Dual Storage)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Duas vozes no mesmo roteiro')).toBeInTheDocument();
    expect(screen.getByText('Roteiros longos sem dor de cabeça')).toBeInTheDocument();
    expect(screen.getByText('Seus projetos sempre à mão')).toBeInTheDocument();
  });

  it('renderiza a CTA final', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Seu próximo vídeo pode começar pelo roteiro' })).toBeDefined();
    expect(screen.getAllByRole('link', { name: /Criar meu primeiro vídeo/i }).length).toBeGreaterThan(0);
  });

  it('o CTA principal aponta para /cadastro', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    const ctaLinks = screen.getAllByRole('link', { name: /Criar meu primeiro vídeo/i });
    expect(ctaLinks[0].getAttribute('href')).toBe('/cadastro');
  });

  it('o CTA "Ver como funciona" aponta para /funcionalidades', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    const ctaLink = screen.getByRole('link', { name: /Ver como funciona/i });
    expect(ctaLink.getAttribute('href')).toBe('/funcionalidades');
  });

  // ── Novas seções de marketing ───────────────────────────────

  it('renderiza a seção de Casos de Uso (UseCasesSection)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Vídeos para YouTube')).toBeDefined();
    expect(screen.getByText('Podcasts e audiobooks')).toBeDefined();
    expect(screen.getByText('Acessibilidade')).toBeDefined();
  });

  it('renderiza a seção de Métricas (MetricsSection)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Fluxo em 3 etapas')).toBeDefined();
    expect(screen.getByText('Open source')).toBeDefined();
    expect(screen.getByText('BYOK')).toBeDefined();
    expect(screen.getByText('Navegador')).toBeDefined();
  });

  it('renderiza a seção de Demo do Produto (ProductDemoSection)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Meu vídeo para YouTube — Episódio 01')).toBeDefined();
  });

  it('renderiza a seção de Depoimentos (TestimonialsSection)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Lucas Andrade')).toBeDefined();
    expect(screen.getByText('Camila Ferreira')).toBeDefined();
    expect(screen.getByText('Ricardo Mendes')).toBeDefined();
  });

  it('o CTA da Demo aponta para /cadastro', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    const demoCta = screen.getAllByRole('link', { name: /Criar meu primeiro vídeo/i });
    expect(demoCta.length).toBeGreaterThan(0);
    expect(demoCta[0].getAttribute('href')).toBe('/cadastro');
  });
});
