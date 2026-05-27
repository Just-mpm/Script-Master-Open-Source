import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PublicFooter } from '../../../src/components/public/PublicFooter';
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
  APP_BORDER: 'rgba(255,255,255,0.08)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)',
  ICON_SIZE_MD: 20,
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
}));

describe('PublicFooter', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza como elemento footer', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  it('renderiza o nome "Script Master"', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    expect(screen.getByText('Script Master')).toBeDefined();
  });

  it('renderiza a descrição da plataforma', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    expect(screen.getByText(/Transforme roteiros em arte com IA/)).toBeDefined();
  });

  it('renderiza o título de todos os grupos de links', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    expect(screen.getByText('Produto')).toBeDefined();
    expect(screen.getByText('Recursos')).toBeDefined();
    expect(screen.getByText('Empresa')).toBeDefined();
    expect(screen.getByText('Legal')).toBeDefined();
  });

  it('renderiza links do grupo Produto', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    expect(screen.getByText('Funcionalidades')).toBeDefined();
    expect(screen.getByText('Beta')).toBeDefined();
    expect(screen.getByText('Perguntas Frequentes')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
  });

  it('renderiza links do grupo Empresa', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    expect(screen.getByText('Sobre')).toBeDefined();
    expect(screen.getByText('Contato')).toBeDefined();
    expect(screen.getByText('E-mail')).toBeDefined();
  });

  it('renderiza links do grupo Legal', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    expect(screen.getByText('Termos de Uso')).toBeDefined();
    expect(screen.getByText('Privacidade')).toBeDefined();
    expect(screen.getByText('Cookies')).toBeDefined();
  });

  it('renderiza copyright com ano atual', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    const year = new Date().getFullYear();
    // O &copy; renderiza como © no DOM
    expect(screen.getByText(new RegExp(`${year} Script Master\\. Todos os direitos reservados\\.`))).toBeDefined();
  });

  it('renderiza texto "Feito com IA"', () => {
    render(<PublicFooter />, { wrapper: Wrapper });
    expect(screen.getByText('Feito com IA e Gemini')).toBeDefined();
  });
});
