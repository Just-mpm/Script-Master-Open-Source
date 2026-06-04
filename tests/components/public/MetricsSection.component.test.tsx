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
    // Métricas pt-BR: Fluxo em 3 etapas, Créditos mensais, Bônus por feedback, Sem cartão
    expect(screen.getByText('Fluxo em 3 etapas')).toBeDefined();
    expect(screen.getByText('Créditos mensais')).toBeDefined();
    expect(screen.getByText('Bônus por feedback')).toBeDefined();
    expect(screen.getByText('Sem cartão')).toBeDefined();
  });

  it('renderiza os valores numéricos das métricas', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('500')).toBeDefined();
    expect(screen.getByText('+250')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });

  it('não renderiza sufixos K+ nas métricas (valores brutos)', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    // Os novos valores são brutos: 3, 500, +250, 0 (sem K+).
    expect(screen.queryByText('K+')).toBeNull();
    expect(screen.queryByText('/5')).toBeNull();
  });

  it('renderiza as descrições de cada métrica', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('Roteiro, geração e exportação no mesmo lugar')).toBeDefined();
    expect(screen.getByText('Para testar narração, imagens, assistente e vídeo')).toBeDefined();
    expect(screen.getByText('Ajude a melhorar o beta e ganhe mais espaço para criar')).toBeDefined();
    expect(screen.getByText('Acesso gratuito enquanto o beta aberto estiver ativo')).toBeDefined();
  });

  it('renderiza em inglês quando locale é "en"', () => {
    localStorage.setItem('s2a_locale', 'en');
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('3-step workflow')).toBeDefined();
    expect(screen.getByText('Monthly credits')).toBeDefined();
    expect(screen.getByText('Feedback bonus')).toBeDefined();
    expect(screen.getByText('No card')).toBeDefined();
  });

  it('renderiza em espanhol quando locale é "es"', () => {
    localStorage.setItem('s2a_locale', 'es');
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('Flujo en 3 etapas')).toBeDefined();
    expect(screen.getByText('Créditos mensuales')).toBeDefined();
    expect(screen.getByText('Bono por feedback')).toBeDefined();
    expect(screen.getByText('Sin tarjeta')).toBeDefined();
  });
});
