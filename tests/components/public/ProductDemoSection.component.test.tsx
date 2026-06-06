import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ProductDemoSection } from '../../../src/components/public/ProductDemoSection';
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

vi.mock('../../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/theme/tokens')>();
  return { ...actual, APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  BRAND_SECONDARY: '#F7941E',
  APP_BORDER: 'rgba(255,255,255,0.08)', };
});;

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('ProductDemoSection', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza o título da seção como h2', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });

  it('renderiza o subtítulo descritivo', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    const paragraphs = screen.getAllByRole('paragraph');
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza o header do mock do estúdio com nome do app', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    expect(screen.getByText('Script Master — AI Studio')).toBeDefined();
  });

  it('renderiza os 4 ícones da toolbar (Áudio, Vídeo, Imagens, Assistente)', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    // A toolbar tem 4 ícones com aria-hidden, os labels são os nomes
    expect(screen.getByText('Áudio')).toBeDefined();
    expect(screen.getByText('Vídeo')).toBeDefined();
    expect(screen.getByText('Imagens')).toBeDefined();
    expect(screen.getByText('Assistente')).toBeDefined();
  });

  it('renderiza o título do roteiro no editor mock', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    // t('landing.demo.scriptTitle')
    expect(screen.getByText('Meu vídeo para YouTube — Episódio 01')).toBeDefined();
  });

  it('renderiza as 4 linhas do editor de roteiro', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    expect(screen.getByText('Hoje vamos transformar uma ideia simples em vídeo.')).toBeDefined();
    expect(screen.getByText('Primeiro vem o roteiro, depois a narração.')).toBeDefined();
    expect(screen.getByText('As cenas ajudam o público a acompanhar cada ponto.')).toBeDefined();
    expect(screen.getByText('No final, você exporta e publica.')).toBeDefined();
  });

  it('renderiza o botão de gerar no mock do estúdio', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    expect(screen.getByText('Gerar narração')).toBeDefined();
  });

  it('renderiza a linha de estatísticas', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    // t('landing.demo.statsLine', { lines: 4, chars: 150 })
    expect(screen.getByText('4 linhas · ~150 caracteres')).toBeDefined();
  });

  it('renderiza o CTA principal com link para /cadastro', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    const ctaLink = screen.getByRole('link', { name: /Criar meu primeiro vídeo/i });
    expect(ctaLink).toBeDefined();
    expect(ctaLink.getAttribute('href')).toBe('/cadastro');
  });

  it('renderiza texto sobre open source e configuração rápida', () => {
    render(<ProductDemoSection />, { wrapper: Wrapper });
    expect(screen.getByText(/Open source e gratuito/)).toBeDefined();
  });
});
