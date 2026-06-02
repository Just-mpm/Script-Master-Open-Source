import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User, UserInfo } from 'firebase/auth';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';

const { mockSendEmailVerification, mockUseAuth } = vi.hoisted(() => ({
  mockSendEmailVerification: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({
  sendEmailVerification: mockSendEmailVerification,
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../src/features/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.verification.verifyingSession': 'Verificando sessão...',
        'auth.verification.verifyEmailTitle': 'Verifique seu email',
        'auth.verification.verifyEmailDesc': 'Enviamos um link de verificação para seu email. Verifique sua caixa de entrada e spam.',
        'auth.verification.verifyEmailHint': 'Depois de clicar no link, volte para esta aba. Atualizamos o status automaticamente em alguns segundos.',
        'auth.verification.refreshStatusBtn': 'Ja verifiquei meu email',
        'auth.verification.refreshingStatus': 'Atualizando status...',
        'auth.verification.resendBtn': 'Reenviar email de verificação',
        'auth.verification.resending': 'Enviando...',
        'auth.verification.backToLogin': 'Voltar ao login',
      };
      return translations[key] ?? key;
    },
  }),
}));

function createMockUser(overrides: {
  emailVerified: boolean;
  providerIds?: string[];
  reload?: () => Promise<void>;
}): User {
  const providerIds = overrides.providerIds ?? ['password'];
  const providerData = providerIds.map((providerId) => ({ providerId }) as UserInfo);

  return {
    uid: 'user-1',
    emailVerified: overrides.emailVerified,
    providerData,
    reload: overrides.reload ?? vi.fn(async () => {}),
  } as unknown as User;
}

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/app/estudio']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app/estudio" element={<div>Studio page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: vi.fn(),
    });
  });

  it('redireciona para /login quando usuário não está autenticado', async () => {
    renderProtectedRoute();
    expect(await screen.findByText('Login page')).toBeTruthy();
  });

  it('renderiza a rota filha quando o email já está verificado', async () => {
    mockUseAuth.mockReturnValue({
      user: createMockUser({ emailVerified: true }),
      loading: false,
      logout: vi.fn(),
    });

    renderProtectedRoute();

    expect(await screen.findByText('Studio page')).toBeTruthy();
  });

  it('bloqueia acesso e exibe ações de verificação para login por senha sem email verificado', async () => {
    mockUseAuth.mockReturnValue({
      user: createMockUser({ emailVerified: false }),
      loading: false,
      logout: vi.fn(),
    });

    renderProtectedRoute();

    expect(await screen.findByText('Verifique seu email')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ja verifiquei meu email' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reenviar email de verificação' })).toBeTruthy();
  });

  it('reenvia o email de verificação quando o usuário solicita', async () => {
    const user = createMockUser({ emailVerified: false });
    mockUseAuth.mockReturnValue({
      user,
      loading: false,
      logout: vi.fn(),
    });

    renderProtectedRoute();

    const userActions = userEvent.setup();
    await userActions.click(await screen.findByRole('button', { name: 'Reenviar email de verificação' }));

    await waitFor(() => {
      expect(mockSendEmailVerification).toHaveBeenCalledWith(user, expect.objectContaining({ handleCodeInApp: true }));
    });
  });

  it('libera a rota assim que a verificação é atualizada', async () => {
    const user = createMockUser({
      emailVerified: false,
      reload: async () => {
        Object.assign(user, { emailVerified: true });
      },
    });

    mockUseAuth.mockReturnValue({
      user,
      loading: false,
      logout: vi.fn(),
    });

    renderProtectedRoute();

    const userActions = userEvent.setup();
    await userActions.click(await screen.findByRole('button', { name: 'Ja verifiquei meu email' }));

    expect(await screen.findByText('Studio page')).toBeTruthy();
  });

  it('encerra a sessão quando o usuário volta para o login pela tela de verificação', async () => {
    const mockLogout = vi.fn(async () => {});
    mockUseAuth.mockReturnValue({
      user: createMockUser({ emailVerified: false }),
      loading: false,
      logout: mockLogout,
    });

    renderProtectedRoute();

    const userActions = userEvent.setup();
    await userActions.click(await screen.findByRole('button', { name: 'Voltar ao login' }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
