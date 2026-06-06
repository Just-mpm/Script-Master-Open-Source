import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MetricsSection } from '../../../src/components/public/MetricsSection';
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
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)', };
});;

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('MetricsSection', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza o título da seção como h2', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });

  it('renderiza o subtítulo descritivo', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    // Subtítulo localizado via t('landing.metrics.subtitle')
    const paragraphs = screen.getAllByRole('paragraph');
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza as 4 métricas de social proof', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    // Métricas pt-BR: Fluxo em 3 etapas, Open source, BYOK, Navegador
    expect(screen.getByText('Fluxo em 3 etapas')).toBeDefined();
    expect(screen.getByText('Open source')).toBeDefined();
    expect(screen.getByText('BYOK')).toBeDefined();
    expect(screen.getByText('Navegador')).toBeDefined();
  });

  it('renderiza os valores das métricas', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('∞')).toBeDefined();
    expect(screen.getByText('🔑')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });

  it('não renderiza sufixos K+ nas métricas (valores brutos)', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    // Os novos valores são brutos: 3, ∞, 🔑, 0 (sem K+).
    expect(screen.queryByText('K+')).toBeNull();
    expect(screen.queryByText('/5')).toBeNull();
  });

  it('renderiza as descrições de cada métrica', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('Roteiro, geração e exportação no mesmo lugar')).toBeDefined();
    expect(screen.getByText('Código aberto, gratuito e com contribuição da comunidade')).toBeDefined();
    expect(screen.getByText('Use sua própria chave Gemini e mantenha controle direto no Google')).toBeDefined();
    expect(screen.getByText('Tudo roda no navegador, sem instalar nada')).toBeDefined();
  });

  it('renderiza em inglês quando locale é "en"', () => {
    localStorage.setItem('s2a_locale', 'en');
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('3-step workflow')).toBeDefined();
    expect(screen.getByText('Open source')).toBeDefined();
    expect(screen.getByText('BYOK')).toBeDefined();
    expect(screen.getByText('Browser')).toBeDefined();
  });

  it('renderiza em espanhol quando locale é "es"', () => {
    localStorage.setItem('s2a_locale', 'es');
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('Flujo en 3 etapas')).toBeDefined();
    expect(screen.getByText('Open source')).toBeDefined();
    expect(screen.getByText('BYOK')).toBeDefined();
    expect(screen.getByText('Navegador')).toBeDefined();
  });
});
