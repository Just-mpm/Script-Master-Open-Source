import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
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
  useLocation: () => ({ pathname: '/app/estudio' }),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string; [key: string]: unknown }) => (
    <a href={to} {...rest}>{children}</a>
  ),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import useMediaQuery from '@mui/material/useMediaQuery';

vi.mock('@mui/material/useMediaQuery', () => ({
  default: vi.fn(),
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
  email: 'joao@email.com' as string | null,
};

// Novos testes para features atualizadas do Header
describe('Header — Features atualizadas', () => {
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
      deleteAccount: vi.fn(),
    });
  });

  it('mostra link para cada item de navegação no desktop', () => {
    render(<Header />, { wrapper: Wrapper });
    // Verifica que os links de navegação existem (aparecem tanto no nav desktop quanto no drawer)
    expect(screen.getAllByText('Estúdio').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Imagem').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vídeo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Speed Paint').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('IA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Biblioteca').length).toBeGreaterThanOrEqual(1);
  });

  it('mostra navegação com aria-label', () => {
    render(<Header />, { wrapper: Wrapper });
    expect(screen.getByRole('navigation', { name: /Navegação principal/i })).toBeDefined();
  });

  it('mostra o email quando displayName é null', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: null, photoURL: null, email: 'joao@email.com' },
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });

    render(<Header />, { wrapper: Wrapper });
    expect(screen.getAllByText('joao').length).toBeGreaterThanOrEqual(1);
  });

  it('mostra fallback quando displayName e email são null', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: null, photoURL: null, email: null },
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });

    render(<Header />, { wrapper: Wrapper });
    // O fallback é o texto de "Conta" do i18n (studio.header.user.fallback)
    expect(screen.getAllByText('Conta').length).toBeGreaterThanOrEqual(1);
  });

  it('abre dialog de exclusão de conta via evento do MobileBottomNav', async () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);

    render(<Header />, { wrapper: Wrapper });

    // MobileBottomNav dispara evento para Header abrir o dialog de exclusão
    await act(async () => {
      window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));
    });

    // Dialog deve aparecer
    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(screen.getByText('Excluir conta permanentemente')).toBeDefined();

    vi.mocked(useMediaQuery).mockReturnValue(false);
  });

  it('não chama deleteAccount se texto de confirmação não for EXCLUIR', async () => {
    const mockDeleteAccount = vi.fn();
    mockUseAuth.mockReturnValue({
      user: loggedInUser,
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      logout: mockDeleteAccount,
      deleteAccount: mockDeleteAccount,
    });

    vi.mocked(useMediaQuery).mockReturnValue(true);

    render(<Header />, { wrapper: Wrapper });

    // MobileBottomNav dispara evento para Header abrir o dialog
    await act(async () => {
      window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));
    });

    // O botão de confirmar exclusão deve estar desabilitado (texto vazio != EXCLUIR)
    const confirmButton = await screen.findByRole('button', { name: /Excluir conta$/ });
    expect(confirmButton).toBeDisabled();
    expect(mockDeleteAccount).not.toHaveBeenCalled();

    vi.mocked(useMediaQuery).mockReturnValue(false);
  });
});
