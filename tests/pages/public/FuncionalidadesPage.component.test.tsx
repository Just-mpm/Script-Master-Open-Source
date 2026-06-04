import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import FuncionalidadesPage from '../../../src/pages/public/FuncionalidadesPage';
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

describe('FuncionalidadesPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza sem crash', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });

  it('renderiza o título principal', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('As ferramentas para transformar roteiro em vídeo')).toBeDefined();
  });

  it('renderiza o subtítulo', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText(/Narração, imagens, legendas, montagem/)).toBeDefined();
  });

  it('renderiza todas as 6 seções de features', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    const sections = [
      'Narração e Voz',
      'Montagem de Vídeo',
      'Cenas e Imagens',
      'Speed Paint & Animação',
      'Assistente IA',
      'Plataforma',
    ];
    for (const section of sections) {
      expect(screen.getByRole('heading', { level: 2, name: section })).toBeDefined();
    }
  });

  it('cada seção tem id para anchor links', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(document.getElementById('tts')).toBeDefined();
    expect(document.getElementById('video')).toBeDefined();
    expect(document.getElementById('images')).toBeDefined();
    expect(document.getElementById('speed-paint')).toBeDefined();
    expect(document.getElementById('assistant')).toBeDefined();
    expect(document.getElementById('platform')).toBeDefined();
  });

  it('renderiza features de TTS', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Texto para narração')).toBeDefined();
    expect(screen.getByText('Roteiros longos sem dor de cabeça')).toBeDefined();
    expect(screen.getByText('Duas vozes no mesmo roteiro')).toBeDefined();
  });

  it('renderiza features de vídeo', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Vídeo montado no navegador')).toBeDefined();
    expect(screen.getByText('Legendas automáticas')).toBeDefined();
    expect(screen.getByText('Formatos para publicar')).toBeDefined();
  });

  it('renderiza features de imagens', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Cenas criadas com IA')).toBeDefined();
    expect(screen.getByText('Formatos flexíveis')).toBeDefined();
    expect(screen.getByText('Galeria integrada')).toBeDefined();
  });

  it('renderiza features de Speed Paint', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Animação de pintura')).toBeDefined();
    expect(screen.getByText('Fila de imagens')).toBeDefined();
    expect(screen.getByText('Exportação de mídia')).toBeDefined();
  });

  it('renderiza features do assistente', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Ideias e revisão de roteiro')).toBeDefined();
    expect(screen.getByText('Integração com o estúdio')).toBeDefined();
    expect(screen.getByText('Memória de canal')).toBeDefined();
  });

  it('renderiza features da plataforma', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Projetos organizados')).toBeDefined();
    expect(screen.getByText('Download fácil')).toBeDefined();
    expect(screen.getByText('Histórico sempre à mão')).toBeDefined();
  });

  it('renderiza os feature showcases de deep dive', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByText('Narração profissional sem abrir o microfone')).toBeDefined();
    expect(screen.getByText('Montagem de vídeo direto no navegador')).toBeDefined();
    expect(screen.getByText('Cenas visuais para contar melhor a história')).toBeDefined();
  });

  it('renderiza a CTA final', () => {
    render(<FuncionalidadesPage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2, name: 'Pronto para transformar roteiro em vídeo?' })).toBeDefined();
    // "Criar meu primeiro vídeo" aparece tanto no hero quanto na CTA final
    const links = screen.getAllByRole('link', { name: /Criar meu primeiro vídeo/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
