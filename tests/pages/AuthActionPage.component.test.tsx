import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockApplyActionCode = vi.fn();
const mockCheckActionCode = vi.fn();
const mockVerifyPasswordResetCode = vi.fn();
const mockConfirmPasswordReset = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  auth: {},
  applyActionCode: (...args: unknown[]) => mockApplyActionCode(...args),
  checkActionCode: (...args: unknown[]) => mockCheckActionCode(...args),
  verifyPasswordResetCode: (...args: unknown[]) => mockVerifyPasswordResetCode(...args),
  confirmPasswordReset: (...args: unknown[]) => mockConfirmPasswordReset(...args),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../src/components/public/PublicHeader', () => ({
  PublicHeader: () => <header data-testid="public-header">PublicHeader</header>,
}));

vi.mock('../../src/components/public/PublicFooter', () => ({
  PublicFooter: () => <footer data-testid="public-footer">PublicFooter</footer>,
}));

vi.mock('../../src/components/DocumentHead', () => ({
  DocumentHead: () => null,
}));

vi.mock('../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Teste', description: 'Teste SEO' }),
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
  return {
    ...actual,
    APP_BACKGROUND_GLOW:
      'radial-gradient(circle at 15% 15%, rgba(46, 117, 182, 0.12) 0%, transparent 34%)',
    BRAND_PRIMARY_GLOW: 'rgba(46, 117, 182, 0.28)',
    EMPTY_ICON_SIZE: 36,
    GAP_RELAXED: 2,
    SUCCESS_MAIN: '#10b981',
    TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  };
});

vi.mock('../../src/theme/authStyles', () => ({
  authTextFieldSx: {},
}));

vi.mock('../../src/assets/logos', () => ({
  default: { mark: { round: '/logo-round.webp' } },
}));

// ─── Helper ────────────────────────────────────────────────────────────────

/**
 * Renderiza AuthActionPage com rotas completas (MemoryRouter).
 * O search string inclui ?mode=...&oobCode=...
 * Rota /login renderiza um marcador para testar redirecionamentos.
 */
function renderWithSearchParams(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/action${search}`]}>
      <Routes>
        <Route path="/auth/action" element={<AuthActionPage />} />
        <Route path="/login" element={<div data-testid="login-redirect">Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Cria erro Firebase com código para simular rejeição */
function createFirebaseError(code: string): Error & { code: string } {
  const error = new Error(`Firebase: ${code}`);
  Object.defineProperty(error, 'code', { value: code });
  return error as Error & { code: string };
}

// ─── Testes ────────────────────────────────────────────────────────────────

describe('AuthActionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Routing ────────────────────────────────────────────────

  describe('Routing — redirecionamentos', () => {
    it('deve redirecionar para /login quando mode e oobCode estão ausentes', () => {
      renderWithSearchParams('');

      expect(screen.getByTestId('login-redirect')).toBeTruthy();
    });

    it('deve redirecionar para /login quando mode é inválido', () => {
      renderWithSearchParams('?mode=invalidMode&oobCode=some-code');

      expect(screen.getByTestId('login-redirect')).toBeTruthy();
    });

    it('deve redirecionar para /login quando mode=verifyEmail sem oobCode', () => {
      renderWithSearchParams('?mode=verifyEmail');

      expect(screen.getByTestId('login-redirect')).toBeTruthy();
    });

    it('deve redirecionar para /login quando oobCode existe mas mode está ausente', () => {
      renderWithSearchParams('?oobCode=some-code');

      expect(screen.getByTestId('login-redirect')).toBeTruthy();
    });
  });

  // ─── VerifyEmailView ────────────────────────────────────────

  describe('VerifyEmailView — verificação de email', () => {
    it('deve mostrar estado de carregamento inicialmente', () => {
      mockApplyActionCode.mockReturnValue(new Promise(() => {})); // nunca resolve
      renderWithSearchParams('?mode=verifyEmail&oobCode=valid-code');

      expect(screen.getByText('Processando...')).toBeTruthy();
    });

    it('deve mostrar mensagem de sucesso quando applyActionCode resolve', async () => {
      mockApplyActionCode.mockResolvedValue(undefined);
      renderWithSearchParams('?mode=verifyEmail&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByText('Email verificado!')).toBeTruthy();
      });
      expect(screen.getByText('Seu email foi confirmado com sucesso. Agora você pode fazer login normalmente.')).toBeTruthy();
      expect(screen.getByText('Ir para login')).toBeTruthy();
    });

    it('deve mostrar erro "expirado" quando applyActionCode falha com auth/expired-action-code', async () => {
      mockApplyActionCode.mockRejectedValue(createFirebaseError('auth/expired-action-code'));
      renderWithSearchParams('?mode=verifyEmail&oobCode=expired-code');

      await waitFor(() => {
        expect(screen.getByText('Não foi possível verificar')).toBeTruthy();
      });
      expect(screen.getByText('Este link expirou. Solicite um novo.')).toBeTruthy();
      expect(screen.getByText('Voltar ao login')).toBeTruthy();
    });

    it('deve mostrar erro "inválido" quando applyActionCode falha com auth/invalid-action-code', async () => {
      mockApplyActionCode.mockRejectedValue(createFirebaseError('auth/invalid-action-code'));
      renderWithSearchParams('?mode=verifyEmail&oobCode=invalid-code');

      await waitFor(() => {
        expect(screen.getByText('Não foi possível verificar')).toBeTruthy();
      });
      expect(screen.getByText('Este link é inválido. Verifique se copiou corretamente.')).toBeTruthy();
    });

    it('deve mostrar erro genérico quando applyActionCode falha com código desconhecido', async () => {
      mockApplyActionCode.mockRejectedValue(createFirebaseError('auth/unknown-error'));
      renderWithSearchParams('?mode=verifyEmail&oobCode=unknown-code');

      await waitFor(() => {
        expect(screen.getByText('Não foi possível verificar')).toBeTruthy();
      });
      expect(screen.getByText('Ocorreu um erro inesperado. Tente novamente.')).toBeTruthy();
    });

    it('deve mostrar erro genérico quando applyActionCode falha com erro sem código', async () => {
      mockApplyActionCode.mockRejectedValue(new Error('generic error'));
      renderWithSearchParams('?mode=verifyEmail&oobCode=some-code');

      await waitFor(() => {
        expect(screen.getByText('Ocorreu um erro inesperado. Tente novamente.')).toBeTruthy();
      });
    });
  });

  // ─── ResetPasswordView ──────────────────────────────────────

  describe('ResetPasswordView — redefinição de senha', () => {
    it('deve mostrar estado de carregamento durante verificação do código', () => {
      mockVerifyPasswordResetCode.mockReturnValue(new Promise(() => {}));
      renderWithSearchParams('?mode=resetPassword&oobCode=valid-code');

      expect(screen.getByText('Processando...')).toBeTruthy();
    });

    it('deve mostrar formulário com email mascarado quando verifyPasswordResetCode resolve', async () => {
      mockVerifyPasswordResetCode.mockResolvedValue('usuario@example.com');
      renderWithSearchParams('?mode=resetPassword&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 6, name: 'Redefinir senha' })).toBeTruthy();
      });
      // Email mascarado: us***@example.com
      expect(screen.getByText('us***@example.com')).toBeTruthy();
      expect(screen.getByText('Defina sua nova senha abaixo.')).toBeTruthy();
    });

    it('deve mostrar erro quando verifyPasswordResetCode falha', async () => {
      mockVerifyPasswordResetCode.mockRejectedValue(createFirebaseError('auth/expired-action-code'));
      renderWithSearchParams('?mode=resetPassword&oobCode=expired-code');

      await waitFor(() => {
        expect(screen.getByText('Erro ao redefinir')).toBeTruthy();
      });
      expect(screen.getByText('Este link expirou. Solicite um novo.')).toBeTruthy();
    });

    it('deve mostrar erro de validação quando senhas não conferem', async () => {
      mockVerifyPasswordResetCode.mockResolvedValue('user@test.com');
      const { container } = renderWithSearchParams('?mode=resetPassword&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 6, name: 'Redefinir senha' })).toBeTruthy();
      });

      const form = container.querySelector('form') as HTMLFormElement;
      const inputs = form.querySelectorAll('input[type="password"]');

      fireEvent.change(inputs[0], { target: { value: 'senha123' } });
      fireEvent.change(inputs[1], { target: { value: 'senha456' } });
      fireEvent.submit(form);

      expect(screen.getByText('As senhas não conferem.')).toBeTruthy();
    });

    it('deve mostrar erro de validação quando senha tem menos de 6 caracteres', async () => {
      mockVerifyPasswordResetCode.mockResolvedValue('user@test.com');
      const { container } = renderWithSearchParams('?mode=resetPassword&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 6, name: 'Redefinir senha' })).toBeTruthy();
      });

      const form = container.querySelector('form') as HTMLFormElement;
      const inputs = form.querySelectorAll('input[type="password"]');

      fireEvent.change(inputs[0], { target: { value: 'abc' } });
      fireEvent.change(inputs[1], { target: { value: 'abc' } });
      fireEvent.submit(form);

      expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeTruthy();
    });

    it('deve mostrar mensagem de sucesso quando confirmPasswordReset resolve', async () => {
      mockVerifyPasswordResetCode.mockResolvedValue('user@test.com');
      mockConfirmPasswordReset.mockResolvedValue(undefined);
      const { container } = renderWithSearchParams('?mode=resetPassword&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 6, name: 'Redefinir senha' })).toBeTruthy();
      });

      const form = container.querySelector('form') as HTMLFormElement;
      const inputs = form.querySelectorAll('input[type="password"]');

      fireEvent.change(inputs[0], { target: { value: 'senha123456' } });
      fireEvent.change(inputs[1], { target: { value: 'senha123456' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Senha redefinida!')).toBeTruthy();
      });
      expect(screen.getByText('Sua senha foi alterada com sucesso. Faça login com a nova senha.')).toBeTruthy();
    });

    it('deve mostrar erro "senha fraca" quando confirmPasswordReset falha com auth/weak-password', async () => {
      mockVerifyPasswordResetCode.mockResolvedValue('user@test.com');
      mockConfirmPasswordReset.mockRejectedValue(createFirebaseError('auth/weak-password'));
      const { container } = renderWithSearchParams('?mode=resetPassword&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 6, name: 'Redefinir senha' })).toBeTruthy();
      });

      const form = container.querySelector('form') as HTMLFormElement;
      const inputs = form.querySelectorAll('input[type="password"]');

      fireEvent.change(inputs[0], { target: { value: '123456' } });
      fireEvent.change(inputs[1], { target: { value: '123456' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Erro ao redefinir')).toBeTruthy();
      });
      expect(screen.getByText('A senha é muito fraca. Use pelo menos 6 caracteres.')).toBeTruthy();
    });
  });

  // ─── RecoverEmailView ───────────────────────────────────────

  describe('RecoverEmailView — recuperação de email', () => {
    const mockActionInfo = {
      operation: 2,
      data: {
        email: 'novo@example.com',
        previousEmail: 'antigo@example.com',
      },
    };

    it('deve mostrar estado de carregamento durante verificação do código', () => {
      mockCheckActionCode.mockReturnValue(new Promise(() => {}));
      renderWithSearchParams('?mode=recoverEmail&oobCode=some-code');

      expect(screen.getByText('Processando...')).toBeTruthy();
    });

    it('deve mostrar info de recover com emails quando checkActionCode resolve', async () => {
      mockCheckActionCode.mockResolvedValue(mockActionInfo);
      renderWithSearchParams('?mode=recoverEmail&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByText('Reverter alteração de email')).toBeTruthy();
      });
      expect(screen.getByText('O email da sua conta foi alterado. Confirme abaixo se deseja reverter para o email anterior.')).toBeTruthy();
      // Emails mascarados: an***@example.com e no***@example.com
      expect(screen.getByText('an***@example.com')).toBeTruthy();
      expect(screen.getByText('no***@example.com')).toBeTruthy();
      expect(screen.getByText('De:')).toBeTruthy();
      expect(screen.getByText('Para:')).toBeTruthy();
    });

    it('deve mostrar erro quando checkActionCode falha', async () => {
      mockCheckActionCode.mockRejectedValue(createFirebaseError('auth/invalid-action-code'));
      renderWithSearchParams('?mode=recoverEmail&oobCode=invalid-code');

      await waitFor(() => {
        expect(screen.getByText('Erro ao reverter')).toBeTruthy();
      });
      expect(screen.getByText('Este link é inválido. Verifique se copiou corretamente.')).toBeTruthy();
    });

    it('deve mostrar sucesso quando applyActionCode resolve após confirmar reversão', async () => {
      mockCheckActionCode.mockResolvedValue(mockActionInfo);
      mockApplyActionCode.mockResolvedValue(undefined);
      renderWithSearchParams('?mode=recoverEmail&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByText('Reverter alteração')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Reverter alteração'));

      await waitFor(() => {
        expect(screen.getByText('Email revertido!')).toBeTruthy();
      });
      expect(screen.getByText('Seu email foi restaurado com sucesso. Faça login com o email original.')).toBeTruthy();
      expect(screen.getByText('Ir para login')).toBeTruthy();
    });

    it('deve mostrar erro quando applyActionCode falha durante reversão', async () => {
      mockCheckActionCode.mockResolvedValue(mockActionInfo);
      mockApplyActionCode.mockRejectedValue(createFirebaseError('auth/expired-action-code'));
      renderWithSearchParams('?mode=recoverEmail&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByText('Reverter alteração')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Reverter alteração'));

      await waitFor(() => {
        expect(screen.getByText('Erro ao reverter')).toBeTruthy();
      });
      expect(screen.getByText('Este link expirou. Solicite um novo.')).toBeTruthy();
    });

    it('deve renderizar botão "Cancelar" com link para /login', async () => {
      mockCheckActionCode.mockResolvedValue(mockActionInfo);
      renderWithSearchParams('?mode=recoverEmail&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByText('Cancelar')).toBeTruthy();
      });

      const cancelBtn = screen.getByText('Cancelar').closest('a');
      expect(cancelBtn?.getAttribute('href')).toBe('/login');
    });
  });

  // ─── Renderização geral ─────────────────────────────────────

  describe('Renderização geral', () => {
    it('deve renderizar PublicHeader e PublicFooter em fluxos válidos', async () => {
      mockApplyActionCode.mockResolvedValue(undefined);
      renderWithSearchParams('?mode=verifyEmail&oobCode=valid-code');

      await waitFor(() => {
        expect(screen.getByTestId('public-header')).toBeTruthy();
      });
      expect(screen.getByTestId('public-footer')).toBeTruthy();
    });
  });
});

// Importação tardia para evitar hoisting issues com mocks
import { AuthActionPage } from '../../src/pages/AuthActionPage';
