import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import TermsPage from '../../../src/pages/public/TermsPage';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

vi.mock('../../../src/components/public/PageLayout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  APP_BORDER: 'rgba(255,255,255,0.08)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_GLOW: 'rgba(46, 117, 182, 0.28)',
  BRAND_SECONDARY: '#F7941E',
  TEXT_PRIMARY: '#f8fafc',
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  SUCCESS_MAIN: '#10b981',
  WARNING_MAIN: '#f59e0b',
  TEXT_DISABLED: 'rgba(248, 250, 252, 0.38)',
  SHADOW_DEEP: '#020617',
  ICON_SIZE_MD: 16,
  WHITE_04: 'rgba(255,255,255,0.04)',
  WHITE_06: 'rgba(255,255,255,0.06)',
  WHITE_12: 'rgba(255,255,255,0.12)',
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Termos de Uso' }),
}));

describe('TermsPage', () => {
  it('renderiza título "Termos de Uso"', () => {
    render(<TermsPage />, { wrapper: Wrapper });
    expect(screen.getByText('Termos de Uso')).toBeDefined();
  });

  it('renderiza as 10 seções', () => {
    render(<TermsPage />, { wrapper: Wrapper });
    // Cada seção aparece 2x (sumário + conteúdo), então usamos getAllByText
    const headings = screen.getAllByRole('heading', { level: 2 });
    const headingTexts = headings.map((h) => h.textContent);
    expect(headingTexts).toContain('1. Aceitação dos Termos');
    expect(headingTexts).toContain('2. Descrição do Serviço');
    expect(headingTexts).toContain('3. Conta do Usuário');
    expect(headingTexts).toContain('4. Uso Permitido');
    expect(headingTexts).toContain('5. Conteúdo do Usuário');
    expect(headingTexts).toContain('6. Limitação de Responsabilidade');
    expect(headingTexts).toContain('7. Propriedade Intelectual');
    expect(headingTexts).toContain('8. Modificações nos Termos');
    expect(headingTexts).toContain('9. Encerramento');
    expect(headingTexts).toContain('10. Disposições Gerais');
  });

  it('renderiza sumário clicável', () => {
    render(<TermsPage />, { wrapper: Wrapper });
    expect(screen.getByText('Sumário')).toBeDefined();
    // Links de sumário devem ter href com âncoras
    const sumarioLinks = screen.getAllByRole('link');
    const anchorLinks = sumarioLinks.filter(
      (link) => link.getAttribute('href')?.startsWith('#') === true,
    );
    expect(anchorLinks.length).toBe(10);
  });
});
