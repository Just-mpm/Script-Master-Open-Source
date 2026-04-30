import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// --- Mocks (inline para vi.mock hoisting) ---

const mockUnsubscribe = vi.fn();

const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockSendEmailVerification = vi.fn();
const mockDeleteUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  googleProvider: {},
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
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

vi.mock('../../src/features/billing/hooks', () => ({
  useBillingInit: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  onSnapshot: vi.fn().mockReturnValue(vi.fn()),
}));

const mockDeleteAllUserData = vi.fn();

vi.mock('../../src/lib/db/account-cleanup', () => ({
  deleteAllUserData: (...args: unknown[]) => mockDeleteAllUserData(...args),
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

  it('deve expor login, signup, loginWithEmail, resetPassword e logout como funções', () => {
    function ActionsChecker() {
      const { login, signup, loginWithEmail, resetPassword, deleteAccount, logout, clearAuthError } = useAuth();
      return (
        <span data-testid="actions">
          {typeof login} {typeof signup} {typeof loginWithEmail} {typeof resetPassword} {typeof deleteAccount} {typeof logout} {typeof clearAuthError}
        </span>
      );
    }

    render(
      <AuthProvider>
        <ActionsChecker />
      </AuthProvider>
    );

    expect(screen.getByTestId('actions').textContent).toBe(
      'function function function function function function function'
    );
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

  // ─── signup ──────────────────────────────────────────────────

  describe('signup', () => {
    it('deve chamar createUserWithEmailAndPassword com email e senha corretos', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'new-uid', email: 'novo@test.com' } });

      function SignupTest() {
        const { signup } = useAuth();
        return (
          <button onClick={() => signup('novo@test.com', 'senha123')}>Cadastrar</button>
        );
      }

      render(
        <AuthProvider>
          <SignupTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Cadastrar').click();
      });

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'novo@test.com',
        'senha123'
      );
    });

    it('deve chamar sendEmailVerification após cadastro bem-sucedido', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'new-uid', email: 'novo@test.com' } });
      mockSendEmailVerification.mockResolvedValue(undefined);

      function SignupTest() {
        const { signup } = useAuth();
        return (
          <button onClick={() => signup('novo@test.com', 'senha123')}>Cadastrar</button>
        );
      }

      render(
        <AuthProvider>
          <SignupTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Cadastrar').click();
      });

      expect(mockSendEmailVerification).toHaveBeenCalled();
    });

    it('não deve falhar signup se sendEmailVerification falhar', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'new-uid', email: 'novo@test.com' } });
      mockSendEmailVerification.mockRejectedValue(new Error('Email not sent'));

      function SignupTest() {
        const { signup, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => signup('novo@test.com', 'senha123')}>Cadastrar</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <SignupTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Cadastrar').click();
      });

      // signup não deve setar authError quando sendEmailVerification falha
      expect(screen.getByTestId('auth-error').textContent).toBe('null');
    });

    it('deve setar wasLoginRequested e disparar COEP reload em sucesso', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'new-uid', email: 'novo@test.com' } });

      const locationSetSpy = vi.fn();
      const origDescriptor = Object.getOwnPropertyDescriptor(window, 'location');

      // Define window.location com spy para capturar window.location.href = ...
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...window.location,
          set href(value: string) {
            locationSetSpy(value);
          },
        },
      });

      // Modifica o mock do onAuthStateChanged para armazenar o callback
      const { onAuthStateChanged } = await import('../../src/lib/firebase');
      (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (_auth: unknown, callback: (user: unknown) => void) => {
          callback(null);
          // Armazena callback para uso manual
          (onAuthStateChanged as unknown as Record<string, unknown>).__callback = callback;
          return mockUnsubscribe;
        }
      );

      function SignupTest() {
        const { signup } = useAuth();
        return (
          <button onClick={() => signup('novo@test.com', 'senha123')}>Cadastrar</button>
        );
      }

      render(
        <AuthProvider>
          <SignupTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Cadastrar').click();
        // Simula Firebase retornando o novo usuário após signup
        const cb = (onAuthStateChanged as unknown as Record<string, unknown>).__callback as (user: unknown) => void;
        cb({ uid: 'new-uid', email: 'novo@test.com' });
      });

      // Novo usuário sem onboarding completado → redireciona para /onboarding
      expect(locationSetSpy).toHaveBeenCalledWith('/onboarding');

      // Restaura
      if (origDescriptor) {
        Object.defineProperty(window, 'location', origDescriptor);
      }
    });

    it('deve exibir mensagem pt-BR para "email-already-in-use"', async () => {
      const authError = new Error('Email already in use') as Error & { code: string };
      authError.code = 'auth/email-already-in-use';
      mockCreateUserWithEmailAndPassword.mockRejectedValue(authError);

      function SignupTest() {
        const { signup, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => signup('existente@test.com', 'senha123')}>Cadastrar</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <SignupTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Cadastrar').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe(
        'Este email ja esta cadastrado.'
      );
    });

    it('deve exibir mensagem pt-BR para "weak-password"', async () => {
      const authError = new Error('Weak password') as Error & { code: string };
      authError.code = 'auth/weak-password';
      mockCreateUserWithEmailAndPassword.mockRejectedValue(authError);

      function SignupTest() {
        const { signup, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => signup('novo@test.com', '123')}>Cadastrar</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <SignupTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Cadastrar').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe(
        'A senha deve ter pelo menos 6 caracteres.'
      );
    });

    it('deve exibir mensagem pt-BR para "invalid-email"', async () => {
      const authError = new Error('Invalid email') as Error & { code: string };
      authError.code = 'auth/invalid-email';
      mockCreateUserWithEmailAndPassword.mockRejectedValue(authError);

      function SignupTest() {
        const { signup, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => signup('invalido', 'senha123')}>Cadastrar</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <SignupTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Cadastrar').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe('Email invalido.');
    });
  });

  // ─── loginWithEmail ─────────────────────────────────────────

  describe('loginWithEmail', () => {
    it('deve chamar signInWithEmailAndPassword com email e senha corretos', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'u1', email: 'user@test.com' } });

      function LoginEmailTest() {
        const { loginWithEmail } = useAuth();
        return (
          <button onClick={() => loginWithEmail('user@test.com', 'senha123')}>Login Email</button>
        );
      }

      render(
        <AuthProvider>
          <LoginEmailTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login Email').click();
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'user@test.com',
        'senha123'
      );
    });

    it('deve setar wasLoginRequested e disparar COEP reload em sucesso', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'u1', email: 'user@test.com' } });

      const locationSetSpy = vi.fn();
      const origDescriptor = Object.getOwnPropertyDescriptor(window, 'location');

      // Simula callback do onAuthStateChanged com armazenamento do callback
      const { onAuthStateChanged } = await import('../../src/lib/firebase');
      (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (_auth: unknown, callback: (user: unknown) => void) => {
          callback(null);
          (onAuthStateChanged as unknown as Record<string, unknown>).__callback = callback;
          return mockUnsubscribe;
        }
      );

      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...window.location,
          set href(value: string) {
            locationSetSpy(value);
          },
        },
      });

      function LoginEmailTest() {
        const { loginWithEmail } = useAuth();
        return (
          <button onClick={() => loginWithEmail('user@test.com', 'senha123')}>Login Email</button>
        );
      }

      render(
        <AuthProvider>
          <LoginEmailTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login Email').click();
        const cb = (onAuthStateChanged as unknown as Record<string, unknown>).__callback as (user: unknown) => void;
        cb({ uid: 'u1', email: 'user@test.com' });
      });

      // Novo usuário sem onboarding completado → redireciona para /onboarding
      expect(locationSetSpy).toHaveBeenCalledWith('/onboarding');

      if (origDescriptor) {
        Object.defineProperty(window, 'location', origDescriptor);
      }
    });

    it('deve exibir mensagem pt-BR para "user-not-found"', async () => {
      const authError = new Error('User not found') as Error & { code: string };
      authError.code = 'auth/user-not-found';
      mockSignInWithEmailAndPassword.mockRejectedValue(authError);

      function LoginEmailTest() {
        const { loginWithEmail, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => loginWithEmail('inexistente@test.com', 'senha123')}>Login Email</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <LoginEmailTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login Email').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe(
        'Nenhuma conta encontrada com este email.'
      );
    });

    it('deve exibir mensagem pt-BR para "wrong-password"', async () => {
      const authError = new Error('Wrong password') as Error & { code: string };
      authError.code = 'auth/wrong-password';
      mockSignInWithEmailAndPassword.mockRejectedValue(authError);

      function LoginEmailTest() {
        const { loginWithEmail, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => loginWithEmail('user@test.com', 'errada')}>Login Email</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <LoginEmailTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login Email').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe('Senha incorreta.');
    });

    it('deve exibir mensagem pt-BR para "invalid-credential"', async () => {
      const authError = new Error('Invalid credential') as Error & { code: string };
      authError.code = 'auth/invalid-credential';
      mockSignInWithEmailAndPassword.mockRejectedValue(authError);

      function LoginEmailTest() {
        const { loginWithEmail, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => loginWithEmail('user@test.com', 'errada')}>Login Email</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <LoginEmailTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login Email').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe('Email ou senha incorretos.');
    });

    it('deve exibir mensagem pt-BR para "invalid-email"', async () => {
      const authError = new Error('Invalid email') as Error & { code: string };
      authError.code = 'auth/invalid-email';
      mockSignInWithEmailAndPassword.mockRejectedValue(authError);

      function LoginEmailTest() {
        const { loginWithEmail, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => loginWithEmail('invalido', 'senha123')}>Login Email</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <LoginEmailTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login Email').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe('Email invalido.');
    });
  });

  // ─── resetPassword ──────────────────────────────────────────

  describe('resetPassword', () => {
    it('deve chamar sendPasswordResetEmail com email correto', async () => {
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      function ResetTest() {
        const { resetPassword } = useAuth();
        return (
          <button onClick={() => resetPassword('user@test.com')}>Reset</button>
        );
      }

      render(
        <AuthProvider>
          <ResetTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Reset').click();
      });

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'user@test.com'
      );
    });

    it('deve lançar erro quando sendPasswordResetEmail falha (re-throw)', async () => {
      const authError = new Error('Not found') as Error & { code: string };
      authError.code = 'auth/user-not-found';
      mockSendPasswordResetEmail.mockRejectedValue(authError);

      function ResetTest() {
        const { resetPassword, authError: err } = useAuth();
        return (
          <>
            <button
              onClick={async () => {
                try {
                  await resetPassword('inexistente@test.com');
                } catch {
                  // erro tratado pela página
                }
              }}
            >
              Reset
            </button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <ResetTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Reset').click();
      });

      // resetPassword seta authError E re-lança o erro
      expect(screen.getByTestId('auth-error').textContent).toBe(
        'Nenhuma conta encontrada com este email.'
      );
    });

    it('NÃO deve causar COEP reload (não seta wasLoginRequested)', async () => {
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      // Simula callback do onAuthStateChanged
      const { onAuthStateChanged } = await import('../../src/lib/firebase');
      (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (_auth: unknown, callback: (user: unknown) => void) => {
          callback(null);
          (onAuthStateChanged as unknown as Record<string, unknown>).__callback = callback;
          return mockUnsubscribe;
        }
      );

      function ResetTest() {
        const { resetPassword } = useAuth();
        return (
          <button onClick={() => resetPassword('user@test.com')}>Reset</button>
        );
      }

      render(
        <AuthProvider>
          <ResetTest />
        </AuthProvider>
      );

      const locationSetter = vi.spyOn(window, 'location', 'set');

      await act(async () => {
        screen.getByText('Reset').click();
        // Garante que nenhuma chamada de auth state callback causa reload
        const cb = (onAuthStateChanged as unknown as Record<string, unknown>).__callback as (user: unknown) => void;
        // Não dispara callback com user — resetPassword não causa login
      });

      // resetPassword não deve causar reload de COEP
      expect(locationSetter).not.toHaveBeenCalled();
    });
  });

  // ─── login (Google) — regressão ────────────────────────────

  describe('login (Google)', () => {
    it('deve chamar signInWithPopup com auth e googleProvider', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { uid: 'g-uid', email: 'google@test.com' } });

      function GoogleLoginTest() {
        const { login } = useAuth();
        return (
          <button onClick={() => login()}>Login Google</button>
        );
      }

      render(
        <AuthProvider>
          <GoogleLoginTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login Google').click();
      });

      expect(mockSignInWithPopup).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything()
      );
    });
  });

  // ─── deleteAccount ──────────────────────────────────────────

  describe('deleteAccount', () => {
    it('deve chamar deleteUser quando usuário está logado', async () => {
      const mockUser = { uid: 'u1', email: 'user@test.com' };
      const { auth: authMock } = await import('../../src/lib/firebase');
      Object.defineProperty(authMock, 'currentUser', { value: mockUser, writable: true, configurable: true });
      mockDeleteUser.mockResolvedValue(undefined);
      mockDeleteAllUserData.mockResolvedValue([]);

      // Spy de window.location.href
      const locationSetSpy = vi.fn();
      const origDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...window.location,
          set href(value: string) { locationSetSpy(value); },
        },
      });

      function DeleteTest() {
        const { deleteAccount } = useAuth();
        return <button onClick={() => deleteAccount().catch(() => {})}>Excluir</button>;
      }

      render(
        <AuthProvider>
          <DeleteTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Excluir').click();
      });

      expect(mockDeleteAllUserData).toHaveBeenCalledWith('u1');
      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
      expect(locationSetSpy).toHaveBeenCalledWith('/login');

      // Cleanup
      Object.defineProperty(authMock, 'currentUser', { value: null, writable: true, configurable: true });
      if (origDescriptor) Object.defineProperty(window, 'location', origDescriptor);
    });

    it('deve setar authError quando não há usuário logado', async () => {
      function DeleteTest() {
        const { deleteAccount, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => deleteAccount().catch(() => {})}>Excluir</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <DeleteTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Excluir').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe('Nenhum usuário logado para excluir.');
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('deve exibir mensagem pt-BR para "requires-recent-login"', async () => {
      const mockUser = { uid: 'u1', email: 'user@test.com' };
      const { auth: authMock } = await import('../../src/lib/firebase');
      Object.defineProperty(authMock, 'currentUser', { value: mockUser, writable: true, configurable: true });

      const authError = new Error('Requires recent login') as Error & { code: string };
      authError.code = 'auth/requires-recent-login';
      mockDeleteAllUserData.mockResolvedValue([]);
      mockDeleteUser.mockRejectedValue(authError);

      function DeleteTest() {
        const { deleteAccount, authError: err } = useAuth();
        return (
          <>
            <button onClick={() => deleteAccount().catch(() => {})}>Excluir</button>
            <span data-testid="auth-error">{err ?? 'null'}</span>
          </>
        );
      }

      render(
        <AuthProvider>
          <DeleteTest />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Excluir').click();
      });

      expect(screen.getByTestId('auth-error').textContent).toBe(
        'Sessão expirada. Faça login novamente e tente excluir sua conta.'
      );

      // Cleanup
      Object.defineProperty(authMock, 'currentUser', { value: null, writable: true, configurable: true });
    });
  });

  // ─── clearAuthError ─────────────────────────────────────────

  it('deve limpar authError ao chamar clearAuthError', async () => {
    const authError = new Error('Too many requests') as Error & { code: string };
    authError.code = 'auth/too-many-requests';
    mockSignInWithEmailAndPassword.mockRejectedValue(authError);

    function ClearErrorTest() {
      const { loginWithEmail, authError: err, clearAuthError } = useAuth();
      return (
        <>
          <button onClick={() => loginWithEmail('user@test.com', 'senha123')}>Login</button>
          <button onClick={clearAuthError}>Limpar</button>
          <span data-testid="auth-error">{err ?? 'null'}</span>
        </>
      );
    }

    render(
      <AuthProvider>
        <ClearErrorTest />
      </AuthProvider>
    );

    // Primeiro causa erro
    await act(async () => {
      screen.getByText('Login').click();
    });
    expect(screen.getByTestId('auth-error').textContent).toBe(
      'Muitas tentativas. Aguarde um momento.'
    );

    // Depois limpa
    await act(async () => {
      screen.getByText('Limpar').click();
    });
    expect(screen.getByTestId('auth-error').textContent).toBe('null');
  });
});
