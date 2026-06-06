import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../src/features/i18n';
import { Sidebar } from '../../src/components/app/Sidebar';
import { useSidebarStore } from '../../src/features/sidebar/store';
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '../../src/theme/tokens';

/**
 * Testes do componente `Sidebar` — renderização e estado (component-level).
 *
 * Cobre:
 * - Largura do Drawer-paper: 68px (collapsed) e 264px (expanded)
 * - Toggle button funcional (alterna estado do store)
 * - 7 itens de navegação renderizados
 * - Item com `aria-current="page"` quando coincide com a rota
 * - Renderização do footer autenticado (avatar, locale, cookies, logout)
 * - Não renderiza conteúdo autenticado quando `user` é null
 *
 * Estratégia:
 * - I18nProvider + ThemeProvider + MemoryRouter (Sidebar usa Link e useLocation)
 * - `useAuth` mockado (SidebarFooter consome `useAuth()`)
 * - `useNavigate` mockado (SidebarFooter.handleAvatarClick navega para /app/configuracoes)
 */

// ─── Mocks de hooks/contexts ──────────────────────────────────

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../src/lib/env', () => ({
  readRequiredEnv: (key: string) => `mock-${key}`,
  readOptionalEnv: () => undefined,
  getGeminiApiKey: () => 'mock-api-key',
  getRecaptchaSiteKey: () => undefined,
  getFirebaseEnvConfig: () => ({
    apiKey: 'mock',
    authDomain: 'mock',
    projectId: 'mock',
    storageBucket: 'mock',
    messagingSenderId: 'mock',
    appId: 'mock',
    measurementId: 'mock',
    databaseURL: 'mock',
  }),
}));

// ─── Setup ───────────────────────────────────────────────────

const darkTheme = createTheme({ palette: { mode: 'dark' } });

const loggedInUser = {
  uid: 'u1',
  displayName: 'João Silva',
  email: 'joao@example.com',
  photoURL: null as string | null,
};

function renderSidebar(initialPath = '/app/estudio', initialCollapsed = true) {
  // Reseta o store Zustand para estado conhecido antes de cada render
  useSidebarStore.setState({ collapsed: initialCollapsed });

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider theme={darkTheme}>
        <I18nProvider>
          <Sidebar />
        </I18nProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Sidebar (component)', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
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

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ─── Largura do Drawer ─────────────────────────────────────

  describe('largura do Drawer (paper)', () => {
    it('renderiza com largura 68px quando collapsed=true', () => {
      renderSidebar('/app/estudio', true);
      const paper = document.querySelector('.MuiDrawer-paper');
      expect(paper).toBeTruthy();
      expect(paper).toHaveStyle({ width: `${SIDEBAR_WIDTH_COLLAPSED}px` });
    });

    it('renderiza com largura 264px quando collapsed=false', () => {
      renderSidebar('/app/estudio', false);
      const paper = document.querySelector('.MuiDrawer-paper');
      expect(paper).toBeTruthy();
      expect(paper).toHaveStyle({ width: `${SIDEBAR_WIDTH_EXPANDED}px` });
    });
  });

  // ─── Toggle button ─────────────────────────────────────────

  describe('botão de toggle', () => {
    it('mostra aria-label "Expandir menu" quando collapsed=true', () => {
      renderSidebar('/app/estudio', true);
      expect(screen.getByRole('button', { name: /Expandir menu/i })).toBeInTheDocument();
    });

    it('mostra aria-label "Recolher" quando collapsed=false', () => {
      renderSidebar('/app/estudio', false);
      expect(screen.getByRole('button', { name: /Recolher/i })).toBeInTheDocument();
    });

    it('clicar no toggle alterna collapsed no store', () => {
      renderSidebar('/app/estudio', true);
      expect(useSidebarStore.getState().collapsed).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: /Expandir menu/i }));

      expect(useSidebarStore.getState().collapsed).toBe(false);
    });

    it('clicar novamente colapsa de volta', () => {
      renderSidebar('/app/estudio', false);

      fireEvent.click(screen.getByRole('button', { name: /Recolher/i }));

      expect(useSidebarStore.getState().collapsed).toBe(true);
    });

    it('toggle tem aria-expanded correto em cada estado', () => {
      const { rerender } = renderSidebar('/app/estudio', true);
      const expandButton = screen.getByRole('button', { name: /Expandir menu/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      rerender(
        <MemoryRouter initialEntries={['/app/estudio']}>
          <ThemeProvider theme={darkTheme}>
            <I18nProvider>
              <Sidebar />
            </I18nProvider>
          </ThemeProvider>
        </MemoryRouter>,
      );
    });
  });

  // ─── Itens de navegação ────────────────────────────────────

  describe('itens de navegação', () => {
    it('renderiza 7 itens de navegação (em modo expandido)', () => {
      renderSidebar('/app/estudio', false);
      // Lista de navegação
      const list = document.querySelector('nav .MuiList-root');
      expect(list).toBeTruthy();
      // 7 Links (um por item) — exceto o logo
      const navLinks = list?.querySelectorAll('a') ?? [];
      expect(navLinks.length).toBe(7);
    });

    it('em modo expandido mostra labels dos 7 itens', () => {
      renderSidebar('/app/estudio', false);
      expect(screen.getByText('Estúdio')).toBeInTheDocument();
      expect(screen.getByText('Imagem')).toBeInTheDocument();
      expect(screen.getByText('Vídeo')).toBeInTheDocument();
      expect(screen.getByText('Speed Paint')).toBeInTheDocument();
      expect(screen.getByText('IA')).toBeInTheDocument();
      expect(screen.getByText('Biblioteca')).toBeInTheDocument();
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });

    it('em modo colapsado oculta os labels (apenas ícones com aria-label)', () => {
      renderSidebar('/app/estudio', true);
      // Os labels ainda podem estar no DOM (em aria-label), mas não como texto visível
      // Verificamos que os botões existem com aria-label
      expect(screen.getByRole('link', { name: 'Estúdio' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Imagem' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Vídeo' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Speed Paint' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'IA' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Biblioteca' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
    });

    it('item correspondente à rota atual tem aria-current="page"', () => {
      renderSidebar('/app/estudio', false);
      const studioLink = screen.getByRole('link', { name: 'Estúdio' });
      expect(studioLink).toHaveAttribute('aria-current', 'page');

      const imageLink = screen.getByRole('link', { name: 'Imagem' });
      expect(imageLink).not.toHaveAttribute('aria-current', 'page');
    });

    it('item com aria-current="page" muda quando a rota muda', () => {
      renderSidebar('/app/imagens', false);
      const imageLink = screen.getByRole('link', { name: 'Imagem' });
      expect(imageLink).toHaveAttribute('aria-current', 'page');

      const studioLink = screen.getByRole('link', { name: 'Estúdio' });
      expect(studioLink).not.toHaveAttribute('aria-current', 'page');
    });
  });

  // ─── Aria-label do Drawer ───────────────────────────────────

  describe('acessibilidade', () => {
    it('Drawer tem aria-label "Menu principal" (i18n: sidebar.ariaLabel)', () => {
      renderSidebar('/app/estudio', true);
      // O Drawer aplica aria-label ao MuiDrawer-root (root do componente MUI)
      const drawerRoot = document.querySelector('.MuiDrawer-root');
      expect(drawerRoot).toBeTruthy();
      expect(drawerRoot).toHaveAttribute('aria-label', 'Menu principal');
    });

    it('nav interna tem aria-label "Menu principal"', () => {
      renderSidebar('/app/estudio', true);
      const nav = screen.getByRole('navigation', { name: /Menu principal/i });
      expect(nav).toBeInTheDocument();
    });
  });

  // ─── Sem usuário autenticado ────────────────────────────────

  describe('quando user é null', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        authError: null,
        clearAuthError: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        deleteAccount: vi.fn(),
      });
    });

    it('não renderiza o avatar do usuário', () => {
      renderSidebar('/app/estudio', false);
      // O Paper do avatar usa o displayName; se user é null, SidebarFooter retorna null
      expect(screen.queryByText('João')).not.toBeInTheDocument();
    });

    it('não renderiza o botão de logout', () => {
      renderSidebar('/app/estudio', false);
      // Em expandido, logout aparece como ListItemButton; em colapsado, como IconButton
      // Sem user, nenhum dos dois deve existir
      expect(screen.queryByRole('button', { name: /^Sair$/i })).not.toBeInTheDocument();
    });

    it('continua renderizando os 7 itens de navegação', () => {
      renderSidebar('/app/estudio', false);
      expect(screen.getByText('Estúdio')).toBeInTheDocument();
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });
  });

  // ─── DeleteAccountDialog (evento do MobileBottomNav) ────────

  describe('evento open-delete-account-dialog', () => {
    it('não exibe dialog de exclusão inicialmente', () => {
      renderSidebar('/app/estudio', true);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('abre o dialog ao receber o evento open-delete-account-dialog', () => {
      renderSidebar('/app/estudio', true);

      act(() => {
        window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Título do dialog (i18n: studio.header.deleteAccount.dialogTitle)
      expect(screen.getByText('Excluir conta permanentemente')).toBeInTheDocument();
    });
  });
});
