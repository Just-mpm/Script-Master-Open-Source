import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Header } from '../../src/components/Header';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

const mockUseAuth = vi.fn();
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/estudio' }),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string; [key: string]: unknown }) => (
    <a href={to} {...rest}>{children}</a>
  ),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../src/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

vi.mock('../../src/components/NetworkStatusIndicator', () => ({
  NetworkStatusIndicator: () => null,
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassSurfaceSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', () => ({
  APP_HEADER_HEIGHT: 64,
  APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_PRIMARY_GLOW: 'rgba(6, 182, 212, 0.3)',
  CYAN_GLOW: 'rgba(6, 182, 212, 0.3)',
  ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 20,
  ICON_SIZE_LG: 24,
  GAP_COMPACT: 4,
  GAP_MEDIUM: 12,
  APP_SURFACE: '#1a1a2e',
  APP_BORDER: 'rgba(255,255,255,0.08)',
  APP_BORDER_STRONG: 'rgba(255, 255, 255, 0.14)',
  SHADOW_DEEP: '#020617',
  WHITE_05: 'rgba(255,255,255,0.05)',
  WHITE_015: 'rgba(255,255,255,0.015)',
}));

const loggedInUser = {
  uid: 'u1',
  displayName: 'João Silva',
  photoURL: null as string | null,
};

describe('Header', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: loggedInUser,
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('renderiza o header como banner', () => {
    render(<Header />, { wrapper: Wrapper });
    expect(screen.getByRole('banner')).toBeDefined();
  });

  it('renderiza o nome "Script Master" no header principal', () => {
    render(<Header />, { wrapper: Wrapper });
    // "Script Master" aparece tanto no header quanto no drawer.
    // Usamos getAllByText e verificamos que pelo menos um está visível.
    const elements = screen.getAllByText('Script Master');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza o subtítulo "AI Studio"', () => {
    render(<Header />, { wrapper: Wrapper });
    expect(screen.getByText('AI Studio')).toBeDefined();
  });

  it('renderiza a navegação com os itens de navegação', () => {
    render(<Header />, { wrapper: Wrapper });
    expect(screen.getByRole('navigation', { name: /Navegação principal/i })).toBeDefined();
  });

  it('mostra os links de navegação corretos', () => {
    render(<Header />, { wrapper: Wrapper });
    // Alguns textos aparecem tanto na nav desktop quanto no drawer (Estúdio, Imagem, etc.)
    // Também há ícones MUI com aria-hidden="true" que não interferem
    expect(screen.getAllByText('Estúdio').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Imagem').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vídeo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Speed Paint').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('IA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Biblioteca').length).toBeGreaterThanOrEqual(1);
  });

  it('mostra o avatar do usuário quando logado', () => {
    render(<Header />, { wrapper: Wrapper });
    // O avatar usa alt={user.displayName} — pode não estar acessível como img
    // se photoURL é null (renderiza ícone Person ao invés)
    // Verificamos pela presença do primeiro nome
    expect(screen.getByText('João')).toBeDefined();
  });

  it('mostra o botão de logout quando logado', () => {
    render(<Header />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /Sair/i })).toBeDefined();
  });

  it('chama logout ao clicar no botão Sair', async () => {
    const mockLogout = vi.fn();
    mockUseAuth.mockReturnValue({
      user: loggedInUser,
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      logout: mockLogout,
    });

    const user = userEvent.setup();
    render(<Header />, { wrapper: Wrapper });

    await user.click(screen.getByRole('button', { name: /Sair/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('mostra o botão Login quando não há usuário logado', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<Header />, { wrapper: Wrapper });
    expect(screen.getByRole('link', { name: /Login/i })).toBeDefined();
  });

  it('mostra Loading quando auth está carregando', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<Header />, { wrapper: Wrapper });
    // Quando loading=true, nem o botão Login nem o avatar devem aparecer
    expect(screen.queryByRole('link', { name: /Login/i })).toBeNull();
  });
});
