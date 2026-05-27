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

vi.mock('../../../src/theme/tokens', () => ({
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
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('LandingPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza sem crash', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Transforme roteiros em arte com IA')).toBeDefined();
  });

  it('renderiza a seção hero', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Transforme roteiros em arte com IA')).toBeDefined();
    expect(screen.getByText(/Plataforma completa para criar áudio, vídeo e imagens/)).toBeDefined();
  });

  it('renderiza os CTAs do hero', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('link', { name: /Criar conta gratuita/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Ver Funcionalidades/i })).toBeDefined();
  });

  it('renderiza a barra SocialProofBar', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Powered by Gemini AI')).toBeDefined();
  });

  it('renderiza a seção de features highlights', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Tudo que você precisa para criar')).toBeDefined();
  });

  it('renderiza todos os feature cards de destaque', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Voz com IA')).toBeDefined();
    expect(screen.getByText('Vídeo Automático')).toBeDefined();
    expect(screen.getByText('Geração de Imagens')).toBeDefined();
    expect(screen.getByText('Speed Paint')).toBeDefined();
    expect(screen.getByText('Assistente IA')).toBeDefined();
    expect(screen.getByText('Biblioteca')).toBeDefined();
  });

it('renderiza os feature showcases (TTS, Vídeo, IA)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Voz Profissional com Gemini TTS' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Vídeo Client-Side com Remotion' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Assistente IA Integrado' })).toBeInTheDocument();
  });

  it('renderiza a seção "Como Funciona"', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Como Funciona' })).toBeDefined();
  });

  it('renderiza os 3 steps', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Escreva seu roteiro')).toBeDefined();
    expect(screen.getByText('Gere com IA')).toBeDefined();
    expect(screen.getByText('Exporte e compartilhe')).toBeDefined();
  });

  it('renderiza a seção "E Muito Mais"', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'E Muito Mais' })).toBeDefined();
  });

it('renderiza features extras (Multi-speaker, Chunking, Dual Storage)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Multi-speaker')).toBeInTheDocument();
    expect(screen.getByText('Chunking Inteligente')).toBeInTheDocument();
    expect(screen.getByText('Dual Storage')).toBeInTheDocument();
  });

  it('renderiza a CTA final', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Comece a criar agora' })).toBeDefined();
    expect(screen.getByRole('link', { name: /Começar agora/i })).toBeDefined();
  });

  it('o CTA principal aponta para /cadastro', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    const ctaLink = screen.getByRole('link', { name: /Criar conta gratuita/i });
    expect(ctaLink.getAttribute('href')).toBe('/cadastro');
  });

  it('o CTA "Ver Funcionalidades" aponta para /funcionalidades', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    const ctaLink = screen.getByRole('link', { name: /Ver Funcionalidades/i });
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
    expect(screen.getByText('Roteiros processados')).toBeDefined();
    expect(screen.getByText('Minutos de áudio')).toBeDefined();
    expect(screen.getByText('Criadores ativos')).toBeDefined();
    expect(screen.getByText('Satisfação')).toBeDefined();
  });

  it('renderiza a seção de Demo do Produto (ProductDemoSection)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Script Master — Estúdio de Produção')).toBeDefined();
  });

  it('renderiza a seção de Depoimentos (TestimonialsSection)', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByText('Lucas Andrade')).toBeDefined();
    expect(screen.getByText('Camila Ferreira')).toBeDefined();
    expect(screen.getByText('Ricardo Mendes')).toBeDefined();
  });

  it('o CTA da Demo aponta para /cadastro', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    const demoCta = screen.getByRole('link', { name: /Experimente grátis/i });
    expect(demoCta).toBeDefined();
    expect(demoCta.getAttribute('href')).toBe('/cadastro');
  });
});
