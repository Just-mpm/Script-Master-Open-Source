import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../../src/features/i18n';
import { MobileBottomNav } from '../../../src/components/app/MobileBottomNav';

// ─── Mocks ────────────────────────────────────────────────────

const mockUseAuth = vi.fn();
const mockOpenFeedback = vi.fn();
const mockOpenAnalyticsConsentDialog = vi.fn();

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../src/components/feedback', () => ({
  useFeedbackDialog: () => mockOpenFeedback,
}));

vi.mock('../../../src/features/video-render/store/videoRenderController', () => {
  // Mock que satisfaz o contrato do `useStore` do zustand: precisa de
  // getState/subscribe + aceitar selector via `useStore(store, selector)`.
  const fakeStore = {
    getState: () => ({ isRendering: false, status: 'idle' }),
    subscribe: () => () => undefined,
  };
  return {
    useVideoRenderController: fakeStore,
  };
});

vi.mock('../../../src/components/app/AnalyticsConsentPrompt', () => ({
  openAnalyticsConsentDialog: () => mockOpenAnalyticsConsentDialog(),
}));

// Força isMobile=true — o componente só renderiza em viewport < md.
// O mock abaixo é processado pelo Emotion, então precisa retornar objeto.
vi.mock('@mui/material/useMediaQuery', () => ({
  default: () => true,
}));

// ─── Helpers ──────────────────────────────────────────────────

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>
        <MemoryRouter initialEntries={['/app/assistente']}>{children}</MemoryRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}

const authenticatedUser = {
  user: { uid: 'u1', displayName: 'João Silva', email: 'joao@example.com', photoURL: null },
  loading: false,
  logout: vi.fn(),
  deleteAccount: vi.fn(),
};

// ─── Testes ───────────────────────────────────────────────────

describe('MobileBottomNav — exclusão de conta (dialog local)', () => {
  let dispatchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedUser);
    // Spy no dispatchEvent para garantir que NÃO disparamos o evento global
    // (regressão: o fluxo antigo dependia do `Sidebar` que não existe em mobile)
    dispatchSpy = vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    dispatchSpy.mockRestore();
    cleanup();
  });

  it('clicar em "Excluir conta" no drawer NÃO dispara o evento global (controle agora é local)', () => {
    render(<MobileBottomNav />, { wrapper: Wrapper });

    // Abre o drawer "Mais"
    const moreButton = screen.getByLabelText('Abrir menu');
    fireEvent.click(moreButton);

    // Clica no item "Excluir conta" (último item do drawer de conta)
    const deleteItem = screen.getByText('Excluir conta');
    fireEvent.click(deleteItem);

    // Garante que NENHUM evento global foi disparado — o controle migrou
    // do evento (que dependia da Sidebar desktop) para o dialog local.
    const deleteEventCalls = dispatchSpy.mock.calls.filter(([event]: [Event]) => {
      return event.type === 'open-delete-account-dialog';
    });
    expect(deleteEventCalls).toHaveLength(0);
  });

  it('clicar em "Excluir conta" fecha o drawer lateral', () => {
    render(<MobileBottomNav />, { wrapper: Wrapper });

    const moreButton = screen.getByLabelText('Abrir menu');
    fireEvent.click(moreButton); // abre o drawer

    // Confirma que o drawer está aberto (aria-expanded=true)
    expect(moreButton.getAttribute('aria-expanded')).toBe('true');

    const deleteItem = screen.getByText('Excluir conta');
    fireEvent.click(deleteItem);

    // Após clicar, o drawer deve fechar (closeDrawer é chamado antes de abrir o dialog)
    expect(moreButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicar em "Sair" (logout) também NÃO dispara o evento de exclusão de conta', () => {
    render(<MobileBottomNav />, { wrapper: Wrapper });

    const moreButton = screen.getByLabelText('Abrir menu');
    fireEvent.click(moreButton);

    // Item "Sair" no drawer (ListItemButton com texto "Sair")
    const logoutItems = screen.getAllByText('Sair');
    const logoutInDrawer = logoutItems.find(
      (el) => el.closest('[role="button"]') !== null,
    );
    expect(logoutInDrawer).toBeDefined();
    fireEvent.click(logoutInDrawer!);

    // Logout não pode disparar o evento de exclusão de conta
    const deleteEventCalls = dispatchSpy.mock.calls.filter(([event]: [Event]) => {
      return event.type === 'open-delete-account-dialog';
    });
    expect(deleteEventCalls).toHaveLength(0);
  });
});
