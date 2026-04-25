import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent } from '@testing-library/react';

// --- Mocks ---

const mockSignup = vi.fn();
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
}));

vi.mock('../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Cadastro', description: 'Crie sua conta' }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const defaultAuth = {
  user: null,
  loading: false,
  authError: null,
  clearAuthError: mockClearAuthError,
  login: mockLogin,
  signup: mockSignup,
};

/**
 * Helpers para encontrar campos do formulário de cadastro.
 * MUI TextField no jsdom não conecta label flutuante ao input via htmlFor,
 * então usamos seletores CSS por tipo de input.
 */
function getEmailInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="email"]') as HTMLInputElement;
}

function getPasswordInputs(container: HTMLElement): [HTMLInputElement, HTMLInputElement] {
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="password"]');
  return [inputs[0] as HTMLInputElement, inputs[1] as HTMLInputElement];
}

describe('RegisterPage', () => {
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

  // ─── Renderização ───────────────────────────────────────

  it('deve renderizar sem crash', () => {
    const { container } = renderWithRouter(<RegisterPage />);
    // "Criar conta" aparece no título e no botão — usa getAllByText
    const criarContaElements = screen.getAllByText('Criar conta');
    expect(criarContaElements.length).toBeGreaterThanOrEqual(2);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('deve exibir PublicHeader e PublicFooter', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByTestId('public-header')).toBeTruthy();
    expect(screen.getByTestId('public-footer')).toBeTruthy();
  });

  it('deve renderizar os 3 campos do formulário: email, senha, confirmar senha', () => {
    const { container } = renderWithRouter(<RegisterPage />);
    expect(getEmailInput(container)).toBeTruthy();
    const [pw1, pw2] = getPasswordInputs(container);
    expect(pw1).toBeTruthy();
    expect(pw2).toBeTruthy();
    expect(container.querySelectorAll('input[type="email"]').length).toBe(1);
    expect(container.querySelectorAll('input[type="password"]').length).toBe(2);
  });

  it('deve exibir botão "Cadastrar com Google"', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText('Cadastrar com Google')).toBeTruthy();
  });

  it('deve exibir botão "Criar conta" no formulário', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeTruthy();
  });

  it('deve exibir link "Faça login"', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText('Faça login')).toBeTruthy();
  });

  it('deve exibir os 4 benefícios', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText('Voz com IA')).toBeTruthy();
    expect(screen.getByText('Vídeo Automático')).toBeTruthy();
    expect(screen.getByText('Imagens')).toBeTruthy();
    expect(screen.getByText('Assistente IA')).toBeTruthy();
  });

  it('deve exibir helper text "Pelo menos 6 caracteres" no campo senha', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText('Pelo menos 6 caracteres')).toBeTruthy();
  });

  it('deve exibir loading quando auth está carregando', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, loading: true });
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText('Verificando sessão...')).toBeTruthy();
  });

  // ─── Validação client-side ──────────────────────────────

  it('deve mostrar erro "Email inválido" para email sem formato válido', async () => {
    const { container } = renderWithRouter(<RegisterPage />);

    const form = container.querySelector('form') as HTMLFormElement;
    const emailInput = getEmailInput(container);
    const [passwordInput, confirmInput] = getPasswordInputs(container);

    fireEvent.change(emailInput, { target: { value: 'invalido' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.change(confirmInput, { target: { value: 'senha123' } });
    fireEvent.submit(form);

    expect(screen.getByText('Email inválido.')).toBeTruthy();
  });

  it('deve mostrar erro "A senha deve ter pelo menos 6 caracteres" para senha curta', async () => {
    const { container } = renderWithRouter(<RegisterPage />);

    const form = container.querySelector('form') as HTMLFormElement;
    const emailInput = getEmailInput(container);
    const [passwordInput, confirmInput] = getPasswordInputs(container);

    fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmInput, { target: { value: '123' } });
    fireEvent.submit(form);

    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeTruthy();
  });

  it('deve mostrar erro "As senhas não conferem" para senhas diferentes', async () => {
    const { container } = renderWithRouter(<RegisterPage />);

    const form = container.querySelector('form') as HTMLFormElement;
    const emailInput = getEmailInput(container);
    const [passwordInput, confirmInput] = getPasswordInputs(container);

    fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.change(confirmInput, { target: { value: 'senha456' } });
    fireEvent.submit(form);

    expect(screen.getByText('As senhas não conferem.')).toBeTruthy();
  });

  it('deve mostrar erro "Confirme sua senha" quando confirmar senha está vazio', async () => {
    const { container } = renderWithRouter(<RegisterPage />);

    const form = container.querySelector('form') as HTMLFormElement;
    const emailInput = getEmailInput(container);
    const [passwordInput] = getPasswordInputs(container);

    fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.submit(form);

    expect(screen.getByText('Confirme sua senha.')).toBeTruthy();
  });

  // ─── Submit com dados válidos ───────────────────────────

  it('deve chamar signup com email e senha corretos ao submeter formulário válido', async () => {
    mockSignup.mockResolvedValue(undefined);
    const { container } = renderWithRouter(<RegisterPage />);

    const form = container.querySelector('form') as HTMLFormElement;
    const emailInput = getEmailInput(container);
    const [passwordInput, confirmInput] = getPasswordInputs(container);

    fireEvent.change(emailInput, { target: { value: 'novo@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.change(confirmInput, { target: { value: 'senha123' } });
    fireEvent.submit(form);

    expect(mockSignup).toHaveBeenCalledWith('novo@test.com', 'senha123');
  });

  it('deve chamar clearAuthError antes de submeter', async () => {
    mockSignup.mockResolvedValue(undefined);
    const { container } = renderWithRouter(<RegisterPage />);

    const form = container.querySelector('form') as HTMLFormElement;
    const emailInput = getEmailInput(container);
    const [passwordInput, confirmInput] = getPasswordInputs(container);

    fireEvent.change(emailInput, { target: { value: 'novo@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });
    fireEvent.change(confirmInput, { target: { value: 'senha123' } });
    fireEvent.submit(form);

    expect(mockClearAuthError).toHaveBeenCalled();
  });

  // ─── Google signup ──────────────────────────────────────

  it('deve chamar login ao clicar em "Cadastrar com Google"', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);
    await user.click(screen.getByText('Cadastrar com Google'));
    expect(mockLogin).toHaveBeenCalled();
  });

  // ─── authError ──────────────────────────────────────────

  it('deve exibir Alert de erro quando authError está definido', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, authError: 'Este email ja esta cadastrado.' });
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText('Este email ja esta cadastrado.')).toBeTruthy();
  });

  // ─── Redirect de usuário autenticado ────────────────────

  it('deve redirecionar para /app/estudio quando usuário já está autenticado', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      user: { uid: 'logged-in', email: 'user@test.com' },
      loading: false,
    });

    // delete window.location para recriar com spy acessível
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    const locationSetSpy = vi.fn();

    // O useEffect da RegisterPage faz: window.location.href = '/app/estudio'
    // No jsdom, isso passa pelo setter de window.location.href
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        set href(value: string) {
          locationSetSpy(value);
        },
      },
    });

    renderWithRouter(<RegisterPage />);

    expect(locationSetSpy).toHaveBeenCalledWith('/app/estudio');

    // Restaura
    if (locationDescriptor) {
      Object.defineProperty(window, 'location', locationDescriptor);
    }
  });

  // ─── Skip-to-content ────────────────────────────────────

  it('deve exibir link skip-to-content para acessibilidade', () => {
    renderWithRouter(<RegisterPage />);
    const skipLink = screen.getByText('Pular para o conteúdo');
    expect(skipLink).toBeDefined();
    const anchor = skipLink.closest('a');
    expect(anchor?.getAttribute('href')).toBe('#main-content');
  });
});

// Importação tardia para evitar hoisting issues com mocks
import { RegisterPage } from '../../src/pages/RegisterPage';
