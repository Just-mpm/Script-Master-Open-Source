import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// --- Mocks ---

const mockUseAuth = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

// --- Helpers ---

function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
}

const defaultAuth = {
  user: null,
  loading: false,
};

describe('GuestRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuth);
  });

  // --- Visitante nao autenticado ---

  it('deve renderizar Outlet quando usuario nao esta autenticado', () => {
    renderWithRouter(
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Route>
      </Routes>,
      ['/login']
    );

    expect(screen.getByTestId('login-page')).toBeTruthy();
  });

  // --- Loading ---

  it('deve exibir spinner de "Verificando sessao..." quando loading e true', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, loading: true });
    renderWithRouter(<GuestRoute />);

    expect(screen.getByText('Verificando sessão...')).toBeTruthy();
  });

  it('deve ter role="status" e aria-live="polite" no container de loading', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, loading: true });
    renderWithRouter(<GuestRoute />);

    const statusContainer = document.querySelector('[role="status"]');
    expect(statusContainer).toBeTruthy();
    expect(statusContainer?.getAttribute('aria-live')).toBe('polite');
  });

  // --- Usuario autenticado (redirect) ---

  it('deve redirecionar para /app/assistente quando usuario esta autenticado', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      user: { uid: 'abc123', email: 'user@test.com', providerData: [] },
    });

    renderWithRouter(
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Route>
        <Route path="/app/assistente" element={<div data-testid="assistant-page">Assistant</div>} />
      </Routes>,
      ['/login']
    );

    // Navigate deve redirecionar para o assistente — pagina de login nao renderiza
    expect(screen.queryByTestId('login-page')).toBeNull();
    expect(screen.getByTestId('assistant-page')).toBeTruthy();
  });
});

// Importacao tardia para evitar hoisting issues com mocks
import { GuestRoute } from '../../src/components/GuestRoute';
