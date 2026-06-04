import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import ContactPage from '../../../src/pages/public/ContactPage';
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
    GAP_COMPACT: 4,
    GAP_DEFAULT: 8,
    GAP_MEDIUM: 12,
    RADIUS_SM: 8,
  };
});

vi.mock('../../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Contato' }),
}));

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    authError: null,
    clearAuthError: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('ContactPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza título "Fale direto com quem está construindo"', () => {
    render(<ContactPage />, { wrapper: Wrapper });
    expect(screen.getByText('Fale direto com quem está construindo')).toBeDefined();
  });

  it('renderiza informações de contato', () => {
    render(<ContactPage />, { wrapper: Wrapper });
    expect(screen.getAllByText('contato@scriptmaster.app').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Em até 24h úteis')).toBeDefined();
    expect(screen.getByText('Português (Brasil)')).toBeDefined();
  });

  it('renderiza campos do formulário (Nome, Email, Assunto, Mensagem)', () => {
    render(<ContactPage />, { wrapper: Wrapper });
    expect(screen.getByPlaceholderText('João da Silva')).toBeDefined();
    expect(screen.getByPlaceholderText('joao@exemplo.com')).toBeDefined();
    // "Assunto" aparece como label e como MenuItem — usar getAllByText
    const assunto = screen.getAllByText('Assunto');
    expect(assunto.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByPlaceholderText('Conte o que você quer criar, qual dúvida apareceu ou que melhoria deixaria o produto mais útil para você...')
    ).toBeDefined();
  });

  it('mostra erro de validação ao enviar sem preencher campos', () => {
    render(<ContactPage />, { wrapper: Wrapper });
    const submitButton = screen.getByRole('button', { name: /Enviar mensagem/i });
    fireEvent.click(submitButton);
    expect(screen.getByText('Nome é obrigatório')).toBeDefined();
    expect(screen.getByText('Email é obrigatório')).toBeDefined();
    expect(screen.getByText('Mensagem é obrigatória')).toBeDefined();
  });

  it('renderiza links de redes sociais', () => {
    render(<ContactPage />, { wrapper: Wrapper });
    expect(screen.getByRole('link', { name: /Instagram/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /YouTube/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Twitter/i })).toBeDefined();
  });
});
