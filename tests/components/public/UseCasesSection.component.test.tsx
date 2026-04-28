import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UseCasesSection } from '../../../src/components/public/UseCasesSection';
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
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  BRAND_SECONDARY: '#F7941E',
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('UseCasesSection', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza o título da seção como h2', () => {
    render(<UseCasesSection />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });

  it('renderiza o subtítulo descritivo', () => {
    render(<UseCasesSection />, { wrapper: Wrapper });
    const paragraphs = screen.getAllByRole('paragraph');
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza os 6 casos de uso como links', () => {
    render(<UseCasesSection />, { wrapper: Wrapper });
    // Cada caso de uso é um Paper com component={Link}
    const links = screen.getAllByRole('link');
    // 6 use case cards + textos internos de "Saiba mais"
    const useCaseLinks = links.filter(
      (link) => link.getAttribute('href')?.startsWith('/funcionalidades#') === true,
    );
    expect(useCaseLinks.length).toBe(6);
  });

  it('renderiza os títulos dos 6 casos de uso', () => {
    render(<UseCasesSection />, { wrapper: Wrapper });
    expect(screen.getByText('Vídeos para YouTube')).toBeDefined();
    expect(screen.getByText('Podcasts e áudios')).toBeDefined();
    expect(screen.getByText('Conteúdo educacional')).toBeDefined();
    expect(screen.getByText('Marketing digital')).toBeDefined();
    expect(screen.getByText('Storytelling e narrativas')).toBeDefined();
    expect(screen.getByText('Acessibilidade')).toBeDefined();
  });

  it('cada card de caso de uso tem heading h3', () => {
    render(<UseCasesSection />, { wrapper: Wrapper });
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.length).toBe(6);
  });

  it('renderiza link "Saiba mais" em cada caso de uso', () => {
    render(<UseCasesSection />, { wrapper: Wrapper });
    const saibaMais = screen.getAllByText('Saiba mais');
    expect(saibaMais.length).toBe(6);
  });

  it('renderiza descrições de cada caso de uso', () => {
    render(<UseCasesSection />, { wrapper: Wrapper });
    expect(screen.getByText(/Roteiros longos divididos em cenas/)).toBeDefined();
    expect(screen.getByText(/Multi-speaker com vozes distintas/)).toBeDefined();
    expect(screen.getByText(/Audiodescrição, aulas narradas/)).toBeDefined();
    expect(screen.getByText(/Escalabilidade para campanhas/)).toBeDefined();
    expect(screen.getByText(/Do roteiro à cena/)).toBeDefined();
    expect(screen.getByText(/Audiodescrição de qualidade profissional/)).toBeDefined();
  });

  it('links apontam para anchors corretos em /funcionalidades', () => {
    render(<UseCasesSection />, { wrapper: Wrapper });
    const links = screen.getAllByRole('link');
    const useCaseLinks = links.filter(
      (link) => link.getAttribute('href')?.startsWith('/funcionalidades#') === true,
    );
    const anchors = useCaseLinks.map((l) => l.getAttribute('href'));
    // Anchors esperados: audio, audio, assistant, video, images, video
    expect(anchors).toContain('/funcionalidades#audio');
    expect(anchors).toContain('/funcionalidades#assistant');
    expect(anchors).toContain('/funcionalidades#video');
    expect(anchors).toContain('/funcionalidades#images');
  });

  it('localiza títulos para en', () => {
    localStorage.setItem('s2a_locale', 'en');
    render(<UseCasesSection />, { wrapper: Wrapper });
    expect(screen.getByText('YouTube Videos')).toBeDefined();
    expect(screen.getByText('Podcasts & Audio')).toBeDefined();
    expect(screen.getByText('Educational Content')).toBeDefined();
    expect(screen.getByText('Digital Marketing')).toBeDefined();
    expect(screen.getByText('Storytelling & Narratives')).toBeDefined();
    expect(screen.getByText('Accessibility')).toBeDefined();
  });
});
