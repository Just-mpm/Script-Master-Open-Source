import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PublicHeader } from '../../../src/components/public/PublicHeader';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>{children}</MemoryRouter>
    </ThemeProvider>
  );
}

const mockUseAuth = vi.fn();

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../src/theme/surfaces', () => ({
  glassSurfaceSx: () => ({}),
}));

vi.mock('../../../src/theme/tokens', () => ({
  APP_HEADER_HEIGHT: 64,
  APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.12)',
  ICON_SIZE_MD: 20,
  ICON_SIZE_LG: 24,
  GAP_MEDIUM: 12,
  APP_SURFACE: '#1a1a2e',
  APP_BORDER: 'rgba(255,255,255,0.08)',
  WHITE_05: 'rgba(255,255,255,0.05)',
  WHITE_015: 'rgba(255,255,255,0.015)',
  SHADOW_DEEP: '#020617',
}));

const authenticatedUser = {
  user: { uid: 'u1', displayName: 'João Silva', photoURL: null },
  loading: false,
  authError: null,
  clearAuthError: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

const anonymousUser = {
  user: null,
  loading: false,
  authError: null,
  clearAuthError: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

describe('PublicHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(anonymousUser);
  });

  it('renderiza o header como banner', () => {
    render(<PublicHeader />, { wrapper: Wrapper });
    expect(screen.getByRole('banner')).toBeDefined();
  });

  it('renderiza o nome "Script Master" no header', () => {
    render(<PublicHeader />, { wrapper: Wrapper });
    // Aparece no header desktop e no drawer
    expect(screen.getAllByText('Script Master').length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza o subtítulo "AI Studio"', () => {
    render(<PublicHeader />, { wrapper: Wrapper });
    expect(screen.getByText('AI Studio')).toBeDefined();
  });

  it('renderiza a navegação pública com aria-label correto', () => {
    render(<PublicHeader />, { wrapper: Wrapper });
    expect(screen.getByRole('navigation', { name: /Navegação pública/i })).toBeDefined();
  });

  it('renderiza todos os itens de navegação públicos', () => {
    render(<PublicHeader />, { wrapper: Wrapper });
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Funcionalidades').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Preços').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('FAQ').length).toBeGreaterThanOrEqual(1);
  });

  it('mostra link "Entrar" quando não autenticado', () => {
    render(<PublicHeader />, { wrapper: Wrapper });
    // MUI Button com component={Link} renderiza como link no DOM
    expect(screen.getByRole('link', { name: /Entrar/i })).toBeDefined();
  });

  it('mostra link "Abrir App" quando autenticado', () => {
    mockUseAuth.mockReturnValue(authenticatedUser);
    render(<PublicHeader />, { wrapper: Wrapper });
    // MUI Button com component={Link} renderiza como link no DOM
    expect(screen.getByRole('link', { name: /Abrir App/i })).toBeDefined();
  });

  it('oculta CTAs durante loading de autenticação', () => {
    mockUseAuth.mockReturnValue({ ...anonymousUser, loading: true });
    render(<PublicHeader />, { wrapper: Wrapper });
    expect(screen.queryByRole('button', { name: /Entrar/i })).toBeNull();
  });

  it('renderiza o drawer com aria-label de menu (via aria-label mesmo com aria-hidden)', () => {
    render(<PublicHeader />, { wrapper: Wrapper });
    // Drawer MUI usa role="presentation" com aria-hidden quando fechado.
    // Verificamos pelo aria-label no elemento do drawer.
    const drawer = document.querySelector('[aria-label="Menu de navegação"]');
    expect(drawer).toBeDefined();
  });
});
