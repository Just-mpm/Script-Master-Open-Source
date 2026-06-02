import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../src/features/i18n';
import { Sidebar } from '../../src/components/app/Sidebar';
import { useSidebarStore } from '../../src/features/sidebar/store';

/**
 * Testes de feature (fluxos completos) do componente `Sidebar`.
 *
 * Cobre:
 * - Item ativo (`aria-current="page"`) reflete a rota atual do `MemoryRouter`
 * - Click em item de navegação funciona como link (renderiza `<a href="/app/...">`)
 * - Toggle button altera o estado persistido em localStorage (chave `s2a_sidebar_collapsed`)
 * - Evento `open-delete-account-dialog` abre o `DeleteAccountDialog`
 *
 * Diferente do `Sidebar.component.test.tsx`, este arquivo foca em fluxos
 * end-to-end do componente (integração entre store + Router + DOM + eventos globais).
 */

// ─── Mocks ────────────────────────────────────────────────────

const mockUseAuth = vi.fn();
const mockUseCredits = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../src/hooks/useCredits', () => ({
  useCredits: () => mockUseCredits(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../src/lib/env', () => ({
  isOpenBetaEnabled: () => true,
  isBillingEnabled: () => false,
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

function renderSidebarAt(path: string, initialCollapsed = true) {
  useSidebarStore.setState({ collapsed: initialCollapsed });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider theme={darkTheme}>
        <I18nProvider>
          <Sidebar />
        </I18nProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Sidebar (features)', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    localStorage.removeItem('s2a_sidebar_collapsed');
    mockUseAuth.mockReturnValue({
      user: loggedInUser,
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });
    mockUseCredits.mockReturnValue({
      availableCredits: 320,
      usedCredits: 80,
      reservedCredits: 0,
      baseCredits: 300,
      bonusCredits: 100,
      feedbackBonusGranted: false,
      unlimitedCredits: false,
      canEnforceBalance: true,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem('s2a_sidebar_collapsed');
    vi.restoreAllMocks();
  });

  // ─── Navegação: links com href correto ──────────────────────

  describe('links de navegação', () => {
    it('item Estúdio renderiza como link com href="/app/estudio"', () => {
      renderSidebarAt('/app/imagens', true);
      const studioLink = screen.getByRole('link', { name: 'Estúdio' });
      expect(studioLink).toHaveAttribute('href', '/app/estudio');
    });

    it('item Imagem renderiza como link com href="/app/imagens"', () => {
      renderSidebarAt('/app/estudio', true);
      const imageLink = screen.getByRole('link', { name: 'Imagem' });
      expect(imageLink).toHaveAttribute('href', '/app/imagens');
    });

    it('item Vídeo renderiza como link com href="/app/video"', () => {
      renderSidebarAt('/app/estudio', true);
      const videoLink = screen.getByRole('link', { name: 'Vídeo' });
      expect(videoLink).toHaveAttribute('href', '/app/video');
    });

    it('item Speed Paint renderiza como link com href="/app/pintura-rapida"', () => {
      renderSidebarAt('/app/estudio', true);
      const speedPaintLink = screen.getByRole('link', { name: 'Speed Paint' });
      expect(speedPaintLink).toHaveAttribute('href', '/app/pintura-rapida');
    });

    it('item IA (Assistente) renderiza como link com href="/app/assistente"', () => {
      renderSidebarAt('/app/estudio', true);
      const aiLink = screen.getByRole('link', { name: 'IA' });
      expect(aiLink).toHaveAttribute('href', '/app/assistente');
    });

    it('item Biblioteca renderiza como link com href="/app/biblioteca"', () => {
      renderSidebarAt('/app/estudio', true);
      const libraryLink = screen.getByRole('link', { name: 'Biblioteca' });
      expect(libraryLink).toHaveAttribute('href', '/app/biblioteca');
    });

    it('item Configurações renderiza como link com href="/app/configuracoes"', () => {
      renderSidebarAt('/app/estudio', true);
      const settingsLink = screen.getByRole('link', { name: 'Configurações' });
      expect(settingsLink).toHaveAttribute('href', '/app/configuracoes');
    });
  });

  // ─── Active state ───────────────────────────────────────────

  describe('active state (aria-current)', () => {
    it('em /app/estudio, item Estúdio tem aria-current="page" e outros não', () => {
      renderSidebarAt('/app/estudio', false);
      expect(screen.getByRole('link', { name: 'Estúdio' })).toHaveAttribute('aria-current', 'page');

      const otherItems = ['Imagem', 'Vídeo', 'Speed Paint', 'IA', 'Biblioteca', 'Configurações'];
      for (const name of otherItems) {
        const link = screen.getByRole('link', { name });
        expect(link).not.toHaveAttribute('aria-current', 'page');
      }
    });

    it('em /app/assistente, item IA tem aria-current="page"', () => {
      renderSidebarAt('/app/assistente', false);
      expect(screen.getByRole('link', { name: 'IA' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Estúdio' })).not.toHaveAttribute('aria-current', 'page');
    });

    it('em /app/biblioteca, item Biblioteca tem aria-current="page"', () => {
      renderSidebarAt('/app/biblioteca', false);
      expect(screen.getByRole('link', { name: 'Biblioteca' })).toHaveAttribute('aria-current', 'page');
    });

    it('em rota desconhecida (/app/foo), nenhum item tem aria-current="page"', () => {
      renderSidebarAt('/app/foo', false);
      const items = ['Estúdio', 'Imagem', 'Vídeo', 'Speed Paint', 'IA', 'Biblioteca', 'Configurações'];
      for (const name of items) {
        const link = screen.getByRole('link', { name });
        expect(link).not.toHaveAttribute('aria-current', 'page');
      }
    });
  });

  // ─── Toggle persiste em localStorage ────────────────────────

  describe('persistência do toggle', () => {
    it('clicar no toggle persiste collapsed=false em localStorage', () => {
      renderSidebarAt('/app/estudio', true);

      // Antes do click: collapsed=true, sem chave no localStorage
      expect(useSidebarStore.getState().collapsed).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: /Expandir menu/i }));

      // Após click: collapsed=false e persistido
      expect(useSidebarStore.getState().collapsed).toBe(false);
      const serialized = localStorage.getItem('s2a_sidebar_collapsed');
      expect(serialized).not.toBeNull();
      const parsed = JSON.parse(serialized as string);
      expect(parsed.state.collapsed).toBe(false);
    });

    it('clicar no toggle duas vezes restaura collapsed=true persistido', () => {
      renderSidebarAt('/app/estudio', true);

      // Expande
      fireEvent.click(screen.getByRole('button', { name: /Expandir menu/i }));
      expect(useSidebarStore.getState().collapsed).toBe(false);

      // Colapsa novamente
      fireEvent.click(screen.getByRole('button', { name: /Recolher/i }));
      expect(useSidebarStore.getState().collapsed).toBe(true);

      const serialized = localStorage.getItem('s2a_sidebar_collapsed');
      expect(serialized).not.toBeNull();
      const parsed = JSON.parse(serialized as string);
      expect(parsed.state.collapsed).toBe(true);
    });

    it('clicar no toggle atualiza o aria-label do botão', () => {
      renderSidebarAt('/app/estudio', true);
      // Inicialmente: Expandir
      expect(screen.getByRole('button', { name: /Expandir menu/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Expandir menu/i }));

      // Após: Recolher
      expect(screen.getByRole('button', { name: /Recolher/i })).toBeInTheDocument();
    });
  });

  // ─── Delete account dialog (evento do MobileBottomNav) ──────

  describe('DeleteAccountDialog via evento', () => {
    it('evento open-delete-account-dialog abre o dialog', () => {
      renderSidebarAt('/app/estudio', true);

      // Antes do evento: sem dialog
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Dispara evento (simulando MobileBottomNav)
      act(() => {
        window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));
      });

      // Dialog aparece
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Título do dialog (i18n: studio.header.deleteAccount.dialogTitle)
      expect(screen.getByText('Excluir conta permanentemente')).toBeInTheDocument();
    });

    it('botão "Excluir conta" do dialog fica desabilitado sem digitar EXCLUIR', () => {
      renderSidebarAt('/app/estudio', true);

      act(() => {
        window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));
      });

      // O TextField tem placeholder "EXCLUIR" e o botão é desabilitado até digitar
      const confirmButton = screen.getByRole('button', { name: /Excluir conta$/ });
      expect(confirmButton).toBeDisabled();
    });

    it('remove o listener ao desmontar o componente', () => {
      const { unmount } = renderSidebarAt('/app/estudio', true);
      unmount();

      // Após desmontar, evento não deve abrir dialog
      act(() => {
        window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));
      });

      // Como não há mais nada renderizado, queryByRole retorna null
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ─── Avatar: clique navega para /app/configuracoes ─────────

  describe('avatar (clique navega para configurações)', () => {
    it('clicar no Paper do avatar chama useNavigate com "/app/configuracoes"', () => {
      renderSidebarAt('/app/estudio', false);

      // Em expandido, o Paper do avatar usa role="button" com aria-label "Usuário"
      const avatar = screen.getByRole('button', { name: /Usuário/i });
      fireEvent.click(avatar);

      expect(mockNavigate).toHaveBeenCalledWith('/app/configuracoes');
    });
  });
});
