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

vi.mock('../../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
}));

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
    // Métricas pt-BR: Roteiros processados, Minutos de áudio, Criadores ativos, Satisfação
    expect(screen.getByText('Roteiros processados')).toBeDefined();
    expect(screen.getByText('Minutos de áudio')).toBeDefined();
    expect(screen.getByText('Criadores ativos')).toBeDefined();
    expect(screen.getByText('Satisfação')).toBeDefined();
  });

  it('renderiza os valores numéricos das métricas', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('85')).toBeDefined();
    expect(screen.getByText('3.2')).toBeDefined();
    expect(screen.getByText('4.8')).toBeDefined();
  });

  it('renderiza os sufixos das métricas', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    const kPlusElements = screen.getAllByText('K+');
    // 3 métricas usam "K+": 12K+, 85K+, 3.2K+
    expect(kPlusElements.length).toBe(3);
    // Satisfação usa "/5"
    expect(screen.getByText('/5')).toBeDefined();
  });

  it('renderiza as descrições de cada métrica', () => {
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('Transformados em conteúdo profissional desde o lançamento')).toBeDefined();
    expect(screen.getByText('Gerados com IA e publicados por criadores')).toBeDefined();
    expect(screen.getByText('Criando conteúdo todos os dias com o Script Master')).toBeDefined();
    expect(screen.getByText('Nota média dos criadores que usam a plataforma')).toBeDefined();
  });

  it('renderiza em inglês quando locale é "en"', () => {
    localStorage.setItem('s2a_locale', 'en');
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('Scripts processed')).toBeDefined();
    expect(screen.getByText('Minutes of audio')).toBeDefined();
    expect(screen.getByText('Active creators')).toBeDefined();
    expect(screen.getByText('Satisfaction')).toBeDefined();
  });

  it('renderiza em espanhol quando locale é "es"', () => {
    localStorage.setItem('s2a_locale', 'es');
    render(<MetricsSection />, { wrapper: Wrapper });
    expect(screen.getByText('Guiones procesados')).toBeDefined();
    expect(screen.getByText('Minutos de audio')).toBeDefined();
    expect(screen.getByText('Creadores activos')).toBeDefined();
    expect(screen.getByText('Satisfacción')).toBeDefined();
  });
});
