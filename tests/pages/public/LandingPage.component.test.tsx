import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../../../src/pages/public/LandingPage';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

// Mock PageLayout como pass-through
vi.mock('../../../src/components/public/PageLayout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  ICON_SIZE_MD: 20,
  APP_BORDER: 'rgba(255,255,255,0.08)',
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('LandingPage', () => {
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
    expect(screen.getByRole('link', { name: /Começar Grátis/i })).toBeDefined();
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
    expect(screen.getByRole('heading', { level: 2, name: 'Voz Profissional com Gemini TTS' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Vídeo Client-Side com Remotion' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Assistente IA Integrado' })).toBeDefined();
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
    expect(screen.getByText('Multi-speaker')).toBeDefined();
    expect(screen.getByText('Chunking Inteligente')).toBeDefined();
    expect(screen.getByText('Dual Storage')).toBeDefined();
  });

  it('renderiza a CTA final', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Comece a criar agora' })).toBeDefined();
    expect(screen.getByRole('link', { name: /Entrar com Google/i })).toBeDefined();
  });

  it('o CTA principal aponta para /login', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    const ctaLink = screen.getByRole('link', { name: /Começar Grátis/i });
    expect(ctaLink.getAttribute('href')).toBe('/login');
  });

  it('o CTA "Ver Funcionalidades" aponta para /funcionalidades', () => {
    render(<LandingPage />, { wrapper: Wrapper });
    const ctaLink = screen.getByRole('link', { name: /Ver Funcionalidades/i });
    expect(ctaLink.getAttribute('href')).toBe('/funcionalidades');
  });
});
