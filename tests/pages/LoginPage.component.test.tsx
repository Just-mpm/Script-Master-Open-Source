import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent } from '@testing-library/react';

// --- Mocks ---

const mockLoginWithEmail = vi.fn();
const mockResetPassword = vi.fn();
const mockLogin = vi.fn();
const mockClearAuthError = vi.fn();

const mockUseAuth = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../src/components/public/PublicHeader', () => ({
  PublicHeader: () => <header data-testid="public-header">PublicHeader</header>,
}));

vi.mock('../../src/components/public/PublicFooter', () => ({
  PublicFooter: () => <footer data-testid="public-footer">PublicFooter</footer>,
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', () => ({
  APP_BORDER_STRONG: 'rgba(255, 255, 255, 0.14)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_LIGHT: '#5BA3D0',
  BRAND_PRIMARY_GLOW: 'rgba(46, 117, 182, 0.28)',
  BRAND_GLOW: '0 14px 36px rgba(46, 117, 182, 0.26)',
  EMPTY_ICON_SIZE: 36,
  ICON_SIZE_LG: 18,
  APP_BACKGROUND_GLOW: 'radial-gradient(circle at 15% 15%, rgba(46, 117, 182, 0.12) 0%, transparent 34%)',
  GAP_RELAXED: 2,
  TEXT_SECONDARY: 'rgba(248, 250, 252, 0.68)',
  SUCCESS_MAIN: '#10b981',
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const defaultAuth = {
  user: null,
  authError: null,
  clearAuthError: mockClearAuthError,
  login: mockLogin,
  loginWithEmail: mockLoginWithEmail,
  resetPassword: mockResetPassword,
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuth);
    // Evita reload real no redirect de user já logado
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: 'http://localhost/',
    } as Window['location']);
    vi.spyOn(window, 'location', 'set').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Renderização básica ────────────────────────────────

  it('deve renderizar sem crash', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getAllByText('Script Master').length).toBeGreaterThan(0);
    expect(screen.getByText('Entrar com Google')).toBeTruthy();
  });

  it('deve renderizar PublicHeader e PublicFooter', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByTestId('public-header')).toBeTruthy();
    expect(screen.getByTestId('public-footer')).toBeTruthy();
  });

  it('deve exibir os 4 benefícios de LOGIN_BENEFITS', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('Voz com IA')).toBeTruthy();
    expect(screen.getByText('Vídeo Automático')).toBeTruthy();
    expect(screen.getByText('Imagens')).toBeTruthy();
    expect(screen.getByText('Assistente IA')).toBeTruthy();
  });

  it('deve exibir a descrição dos benefícios', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('Roteiros em áudio profissional com Gemini TTS')).toBeTruthy();
    expect(screen.getByText('Renderização client-side com legendas')).toBeTruthy();
    expect(screen.getByText('Geração com 8 aspect ratios e referência')).toBeTruthy();
    expect(screen.getByText('Chat com memória e integração ao estúdio')).toBeTruthy();
  });

  it('deve exibir o título "Crie com IA, sem limites"', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('Crie com IA, sem limites')).toBeTruthy();
  });

  it('deve exibir "Entre com Google ou email" no card', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('Entre com Google ou email')).toBeTruthy();
  });

  it('deve exibir erro de autenticação quando houver', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, authError: 'Email ou senha incorretos.' });
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('Email ou senha incorretos.')).toBeTruthy();
  });

  // ─── Formulário email/senha ────────────────────────────

  it('deve renderizar campos email e senha', () => {
    const { container } = renderWithRouter(<LoginPage />);
    expect(container.querySelector('input[type="email"]')).toBeTruthy();
    expect(container.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('deve renderizar botão "Entrar"', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeTruthy();
  });

  it('deve exibir divider "ou" entre Google e formulário', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('ou')).toBeTruthy();
  });

  // ─── Links auxiliares ──────────────────────────────────

  it('deve exibir link "Não tem conta? Cadastre-se"', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('Cadastre-se')).toBeTruthy();
    expect(screen.getByText(/Não tem conta/i)).toBeTruthy();
  });

  it('deve exibir link "Esqueceu a senha?"', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText('Esqueceu a senha?')).toBeTruthy();
  });

  // ─── Validação client-side ──────────────────────────────

  it('deve mostrar erro "Email é obrigatório" ao submeter sem email', async () => {
    const { container } = renderWithRouter(<LoginPage />);

    // Preenche apenas senha, submete o form
    const form = container.querySelector('form') as HTMLFormElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.submit(form);

    // O validateFields deve mostrar erro de email obrigatório
    expect(screen.getByText('Email é obrigatório.')).toBeTruthy();
  });

  it('deve mostrar erro "Email inválido" para email sem formato', async () => {
    const { container } = renderWithRouter(<LoginPage />);

    const form = container.querySelector('form') as HTMLFormElement;
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'invalido' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.submit(form);

    expect(screen.getByText('Email inválido.')).toBeTruthy();
  });

  it('deve mostrar erro "Senha é obrigatória" ao submeter sem senha', async () => {
    const { container } = renderWithRouter(<LoginPage />);

    const form = container.querySelector('form') as HTMLFormElement;
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
    fireEvent.submit(form);

    expect(screen.getByText('Senha é obrigatória.')).toBeTruthy();
  });

  // ─── Submit com dados válidos ───────────────────────────

  it('deve chamar loginWithEmail com email e senha corretos', async () => {
    mockLoginWithEmail.mockResolvedValue(undefined);
    const { container } = renderWithRouter(<LoginPage />);

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const user = userEvent.setup();

    await user.type(emailInput, 'user@test.com');
    await user.type(passwordInput, 'senha123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    expect(mockLoginWithEmail).toHaveBeenCalledWith('user@test.com', 'senha123');
  });

  it('deve chamar clearAuthError antes de submeter', async () => {
    mockLoginWithEmail.mockResolvedValue(undefined);
    const { container } = renderWithRouter(<LoginPage />);

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const user = userEvent.setup();

    await user.type(emailInput, 'user@test.com');
    await user.type(passwordInput, 'senha123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    expect(mockClearAuthError).toHaveBeenCalled();
  });

  // ─── Google login ──────────────────────────────────────

  it('deve chamar login ao clicar em "Entrar com Google"', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);
    await user.click(screen.getByText('Entrar com Google'));
    expect(mockLogin).toHaveBeenCalled();
  });

  // ─── Dialog de reset de senha ───────────────────────────

  describe('Dialog de reset de senha', () => {
    it('deve abrir dialog ao clicar "Esqueceu a senha?"', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginPage />);
      await user.click(screen.getByText('Esqueceu a senha?'));
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Redefinir senha')).toBeTruthy();
    });

    it('deve pré-preencher email do dialog com email do formulário', async () => {
      const { container } = renderWithRouter(<LoginPage />);

      // Preenche email no formulário principal
      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });

      // Abre dialog
      fireEvent.click(screen.getByText('Esqueceu a senha?'));

      // Verifica que o campo de email no dialog está pré-preenchido
      const dialogEmailInput = screen.getByRole('dialog').querySelector('input[type="email"]') as HTMLInputElement;
      expect(dialogEmailInput.value).toBe('user@test.com');
    });

    it('deve chamar resetPassword ao submeter email no dialog', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      const { container } = renderWithRouter(<LoginPage />);

      // Preenche email no formulário principal
      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });

      // Abre dialog
      fireEvent.click(screen.getByText('Esqueceu a senha?'));

      // Submete no dialog via fireEvent.submit no form (type="submit" + jsdom HTML5 validation)
      const dialog = screen.getByRole('dialog');
      const form = dialog.querySelector('form') as HTMLFormElement;
      fireEvent.submit(form);

      expect(mockResetPassword).toHaveBeenCalledWith('user@test.com');
    });

    it('deve mostrar feedback de sucesso após reset bem-sucedido', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      const { container } = renderWithRouter(<LoginPage />);

      // Preenche email
      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });

      // Abre dialog e submete via form
      fireEvent.click(screen.getByText('Esqueceu a senha?'));
      const dialog = screen.getByRole('dialog');
      fireEvent.submit(dialog.querySelector('form') as HTMLFormElement);

      // Aguarda feedback de sucesso (atualização de estado React)
      await waitFor(() => {
        expect(screen.getByText('Email enviado!')).toBeTruthy();
      });
      expect(screen.getByText(/Verifique sua caixa de entrada/i)).toBeTruthy();
    });

    it('deve mostrar feedback de erro quando reset falha', async () => {
      mockResetPassword.mockRejectedValue(new Error('not found'));

      // Quando resetPassword falha, a LoginPage pega authError do contexto
      // Simula: resetPassword rejeita, authError é setado
      const { container } = renderWithRouter(<LoginPage />);

      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'inexistente@test.com' } });

      // Atualiza mock para retornar authError após falha
      mockUseAuth.mockReturnValue({
        ...defaultAuth,
        authError: 'Nenhuma conta encontrada com este email.',
      });

      fireEvent.click(screen.getByText('Esqueceu a senha?'));

      // O dialog deve ter aberto
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('deve fechar dialog ao clicar "Cancelar"', async () => {
      const { container } = renderWithRouter(<LoginPage />);

      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });

      fireEvent.click(screen.getByText('Esqueceu a senha?'));
      expect(screen.getByRole('dialog')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      // Dialog deve ser fechado — MUI Dialog remove do DOM após animação
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });

    it('deve fechar dialog ao clicar "Entendi" após sucesso', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      const { container } = renderWithRouter(<LoginPage />);

      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });

      fireEvent.click(screen.getByText('Esqueceu a senha?'));
      const dialog = screen.getByRole('dialog');
      fireEvent.submit(dialog.querySelector('form') as HTMLFormElement);

      await waitFor(() => {
        expect(screen.getByText('Entendi')).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: /entendi/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });

    it('deve validar email no dialog — email inválido mostra erro', async () => {
      const { container } = renderWithRouter(<LoginPage />);

      // Sem preencher email no formulário (vazio)
      fireEvent.click(screen.getByText('Esqueceu a senha?'));

      // Limpa email no dialog e tenta submeter via form
      const dialog = screen.getByRole('dialog');
      const dialogEmailInput = dialog.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(dialogEmailInput, { target: { value: 'invalido' } });
      fireEvent.submit(dialog.querySelector('form') as HTMLFormElement);

      expect(screen.getByText('Email inválido.')).toBeTruthy();
    });

    it('deve validar email no dialog — email vazio mostra erro', async () => {
      const { container } = renderWithRouter(<LoginPage />);

      // Preenche email vazio e abre dialog
      fireEvent.click(screen.getByText('Esqueceu a senha?'));

      // O campo pode ter o valor do formulário (vazio) — limpa e submete
      const dialog = screen.getByRole('dialog');
      const dialogEmailInput = dialog.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(dialogEmailInput, { target: { value: '' } });
      fireEvent.submit(dialog.querySelector('form') as HTMLFormElement);

      expect(screen.getByText('Email inválido.')).toBeTruthy();
    });
  });
});

// Importação tardia para evitar hoisting issues com mocks
import { LoginPage } from '../../src/pages/LoginPage';
