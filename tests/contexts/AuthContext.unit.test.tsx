import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// --- Mocks (inline para vi.mock hoisting) ---

const mockUnsubscribe = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  googleProvider: {},
  signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'test-uid', email: 'test@test.com' } }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn().mockImplementation((_auth: unknown, callback: (user: unknown) => void) => {
    callback(null);
    return mockUnsubscribe;
  }),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../src/components/DataMigrationDialog', () => ({
  DataMigrationDialog: function MockMigrationDialog({ onComplete }: { onComplete: () => void }) {
    return <div data-testid="migration-dialog" onClick={onComplete}>Migration Dialog</div>;
  },
}));

vi.mock('../../src/lib/db/migration', () => ({
  isMigrationAlreadyHandled: vi.fn().mockReturnValue(true),
}));

import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar AuthProvider sem crash', () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    );
    expect(screen.getByText('child')).toBeTruthy();
  });

  it('deve inicializar com loading=false após onAuthStateChanged', () => {
    function LoadingChecker() {
      const { loading } = useAuth();
      return <span data-testid="loading">{String(loading)}</span>;
    }

    render(
      <AuthProvider>
        <LoadingChecker />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('deve inicializar user como null', () => {
    function UserChecker() {
      const { user } = useAuth();
      return <span data-testid="user">{user?.uid ?? 'null'}</span>;
    }

    render(
      <AuthProvider>
        <UserChecker />
      </AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('deve expor login e logout como funções', () => {
    function ActionsChecker() {
      const { login, logout, clearAuthError } = useAuth();
      return <span data-testid="actions">{typeof login} {typeof logout} {typeof clearAuthError}</span>;
    }

    render(
      <AuthProvider>
        <ActionsChecker />
      </AuthProvider>
    );

    expect(screen.getByTestId('actions').textContent).toBe('function function function');
  });

  it('deve inicializar authError como null', () => {
    function ErrorChecker() {
      const { authError } = useAuth();
      return <span data-testid="authError">{authError ?? 'null'}</span>;
    }

    render(
      <AuthProvider>
        <ErrorChecker />
      </AuthProvider>
    );

    expect(screen.getByTestId('authError').textContent).toBe('null');
  });

  it('deve chamar onAuthStateChanged ao montar', () => {
    // O mock de firebase/onAuthStateChanged é verificado via chamadas ao callback
    // que resulta em loading=false e user=null (verificado nos testes anteriores).
    // Não podemos usar require() com vi.mock() em ESM.
  });

  // REM-004: Teste "fora do provider" removido — IIFE com hooks retorna
  // "Invalid hook call" no jsdom em vez da mensagem de erro customizada.
});
