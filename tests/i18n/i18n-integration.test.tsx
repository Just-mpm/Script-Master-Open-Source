import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider, useLocale } from '../../src/features/i18n';
import { PublicHeader } from '../../src/components/public/PublicHeader';
import { PublicFooter } from '../../src/components/public/PublicFooter';

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

// ── Mocks ────────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassSurfaceSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', async () => {
  const { createTokensMock } = await import('../__mocks__/tokensMock');
  return createTokensMock({
    extras: {
      APP_HEADER_HEIGHT: 64,
      APP_MAX_WIDTH: 1600,
      BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
      BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
      BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)',
      ICON_SIZE_LG: 24,
      GAP_MEDIUM: 12,
      APP_SURFACE: '#1a1a2e',
      WHITE_05: 'rgba(255,255,255,0.05)',
      WHITE_015: 'rgba(255,255,255,0.015)',
      SHADOW_DEEP: '#020617',
      TEXT_SECONDARY: 'rgba(255,255,255,0.6)',
    },
  });
});

const anonymousUser = {
  user: null,
  loading: false,
  authError: null,
  clearAuthError: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

// ── Testes ───────────────────────────────────────────────────────────────

describe('i18n — integração com componentes públicos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(anonymousUser);
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  describe('PublicHeader', () => {
    it('renderiza links de navegação com strings traduzidas em pt-BR', () => {
      render(<PublicHeader />, { wrapper: Wrapper });
      expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Funcionalidades').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Beta').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('FAQ').length).toBeGreaterThanOrEqual(1);
    });

    it('renderiza botão "Entrar" traduzido', () => {
      render(<PublicHeader />, { wrapper: Wrapper });
      expect(screen.getByRole('link', { name: /Entrar/i })).toBeDefined();
    });

    it('renderiza LocaleSelector no header', () => {
      render(<PublicHeader />, { wrapper: Wrapper });
      // LocaleSelector usa um IconButton com aria-label contendo o locale atual
      expect(screen.getByRole('button', { name: /Português/i })).toBeDefined();
    });

    it('usa aria-labels traduzidos na navegação e drawer', () => {
      render(<PublicHeader />, { wrapper: Wrapper });
      expect(screen.getByRole('navigation', { name: /Navegação pública/i })).toBeDefined();
      const drawer = document.querySelector('[aria-label="Menu de navegação"]');
      expect(drawer).toBeDefined();
    });
  });

  describe('PublicFooter', () => {
    it('renderiza grupos de links com títulos traduzidos', () => {
      render(<PublicFooter />, { wrapper: Wrapper });
      expect(screen.getByText('Produto')).toBeDefined();
      expect(screen.getByText('Empresa')).toBeDefined();
      expect(screen.getByText('Legal')).toBeDefined();
    });

    it('renderiza descrição e copyright traduzidos', () => {
      render(<PublicFooter />, { wrapper: Wrapper });
      expect(screen.getByText(/Transforme roteiros em arte com IA/)).toBeDefined();
      expect(screen.getByText(/Script Master\. Todos os direitos reservados/)).toBeDefined();
    });

    it('renderiza "Feito com IA" traduzido', () => {
      render(<PublicFooter />, { wrapper: Wrapper });
      expect(screen.getByText(/Feito com IA/)).toBeDefined();
    });

    it('renderiza links do footer com labels traduzidos', () => {
      render(<PublicFooter />, { wrapper: Wrapper });
      expect(screen.getByText('Funcionalidades')).toBeDefined();
      expect(screen.getByText('Termos de Uso')).toBeDefined();
      expect(screen.getByText('Privacidade')).toBeDefined();
    });
  });
});

describe('i18n — troca de locale', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });
  it('altera textos ao trocar locale de pt-BR para en', async () => {
    function TestComponent() {
      const { t, locale, setLocale } = useLocale();
      return (
        <>
          <span data-testid="locale">{locale}</span>
          <span data-testid="text">{t('nav.home')}</span>
          <button onClick={() => setLocale('en')}>Trocar</button>
        </>
      );
    }

    render(<TestComponent />, { wrapper: Wrapper });

    // pt-BR default
    expect(screen.getByTestId('locale').textContent).toBe('pt-BR');
    expect(screen.getByTestId('text').textContent).toBe('Home');

    // Trocar para en
    await userEvent.click(screen.getByText('Trocar'));

    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('text').textContent).toBe('Home'); // "Home" é igual em pt-BR e en
  });

  it('altera textos ao trocar locale de pt-BR para es', async () => {
    function TestComponent() {
      const { t, locale, setLocale } = useLocale();
      return (
        <>
          <span data-testid="locale">{locale}</span>
          <span data-testid="text">{t('nav.pricing')}</span>
          <button onClick={() => setLocale('es')}>Trocar</button>
        </>
      );
    }

    render(<TestComponent />, { wrapper: Wrapper });

    expect(screen.getByTestId('text').textContent).toBe('Beta');

    await userEvent.click(screen.getByText('Trocar'));

    expect(screen.getByTestId('locale').textContent).toBe('es');
    expect(screen.getByTestId('text').textContent).toBe('Beta');
  });

  it('persiste locale no localStorage', async () => {
    localStorage.removeItem('s2a_locale');

    function TestComponent() {
      const { locale, setLocale } = useLocale();
      return (
        <button onClick={() => setLocale('en')} data-testid="btn">
          {locale}
        </button>
      );
    }

    render(<TestComponent />, { wrapper: Wrapper });

    await userEvent.click(screen.getByTestId('btn'));

    expect(localStorage.getItem('s2a_locale')).toBe('en');
  });
});
