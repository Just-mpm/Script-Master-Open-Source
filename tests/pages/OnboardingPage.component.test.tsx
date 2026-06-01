/**
 * Testes do componente OnboardingPage e do store useWizardStore.
 *
 * Cobertura:
 * - Renderizacao condicional (loading, redirect, wizard)
 * - Fluxo de steps (next, prev, direction)
 * - Dados do wizard (updateData, toggleGoal)
 * - Persistencia localStorage (complete, skip, profile)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useWizardStore } from '../../src/features/onboarding-wizard/store/wizardStore';
import { TOTAL_STEPS } from '../../src/features/onboarding-wizard/constants';
import { I18nProvider } from '../../src/features/i18n';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseAuth = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => {
      const MotionDiv = 'div' as React.ElementType;
      return <MotionDiv {...props}>{children}</MotionDiv>;
    },
    h1: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => {
      const MotionH1 = 'h1' as React.ElementType;
      return <MotionH1 {...props}>{children}</MotionH1>;
    },
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', () => ({
  BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)',
  BRAND_GRADIENT_HOVER: 'linear-gradient(135deg, #2563a0 0%, #e08520 100%)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_GLOW: 'rgba(46, 117, 182, 0.28)',
  BRAND_SECONDARY: '#F7941E',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  SUCCESS_MAIN: '#10b981',
  WHITE_04: 'rgba(255, 255, 255, 0.04)',
  WHITE_06: 'rgba(255, 255, 255, 0.06)',
}));

vi.mock('../../src/theme/authStyles', () => ({
  authTextFieldSx: {},
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../src/lib/db/user-settings', () => ({
  saveUserSettings: vi.fn(() => Promise.resolve({ id: 'test' })),
}));

vi.mock('../../src/lib/seo', () => ({
  getPageSeo: () => ({ title: 'Configuracao Inicial', description: 'Configure seu perfil' }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>
        <MemoryRouter>{children}</MemoryRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<Wrapper>{ui}</Wrapper>);
}

const authenticatedUser = { uid: 'user-123', email: 'test@example.com' };

const defaultAuth = {
  user: null,
  loading: false,
  authError: null,
  clearAuthError: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  loginWithEmail: vi.fn(),
  resetPassword: vi.fn(),
  logout: vi.fn(),
};

// ---------------------------------------------------------------------------
// Importacao tardia (depois dos mocks)
// ---------------------------------------------------------------------------

import { OnboardingPage } from '../../src/pages/OnboardingPage';

// ===========================================================================
// 1. Renderizacao da pagina
// ===========================================================================

describe('OnboardingPage — Renderizacao', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuth);
    useWizardStore.setState({
      currentStep: 0,
      direction: 1,
      data: { name: '', role: '', goals: [] },
      isCompleted: false,
    });
  });

  it('renderiza null durante loading', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, loading: true });

    const { container } = renderWithProviders(<OnboardingPage />);
    expect(container.innerHTML).toBe('');
  });

  it('redireciona para /login quando nao ha usuario', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, user: null, loading: false });

    renderWithProviders(<OnboardingPage />);

    // Navigate renderiza internamente — verificamos que nao ha conteudo do wizard
    expect(screen.queryByText('Começar')).toBeNull();
  });

  it('redireciona para /app/assistente quando isCompleted=true no store', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, user: authenticatedUser });
    useWizardStore.setState({ isCompleted: true });

    renderWithProviders(<OnboardingPage />);

    // <Navigate to="/app/assistente" /> não renderiza conteúdo do wizard
    expect(screen.queryByText('Desbloqueie seu potencial criativo.')).toBeNull();
    expect(screen.queryByRole('button', { name: /Começar/i })).toBeNull();
  });

  it('redireciona para /app/assistente quando localStorage s2a_onboarding_completed=true', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, user: authenticatedUser });
    useWizardStore.setState({ isCompleted: false });
    localStorage.setItem('s2a_onboarding_completed', 'true');

    renderWithProviders(<OnboardingPage />);

    // <Navigate to="/app/assistente" /> não renderiza conteúdo do wizard
    expect(screen.queryByText('Desbloqueie seu potencial criativo.')).toBeNull();
    expect(screen.queryByRole('button', { name: /Começar/i })).toBeNull();

    // Cleanup
    localStorage.removeItem('s2a_onboarding_completed');
  });

  it('renderiza o wizard quando usuario esta logado', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, user: authenticatedUser });

    renderWithProviders(<OnboardingPage />);

    // WelcomeStep deve exibir o titulo e o botao "Começar"
    expect(screen.getByText('Desbloqueie seu potencial criativo.')).toBeDefined();
    expect(screen.getByRole('button', { name: /Começar/i })).toBeDefined();
  });

  it('renderiza a mensagem de seguranca no welcome', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, user: authenticatedUser });

    renderWithProviders(<OnboardingPage />);
    expect(screen.getByText('Conexão segura')).toBeDefined();
  });
});

// ===========================================================================
// 2. Fluxo dos steps (store)
// ===========================================================================

describe('useWizardStore — Fluxo de steps', () => {
  beforeEach(() => {
    localStorage.clear();
    useWizardStore.setState({
      currentStep: 0,
      direction: 1,
      data: { name: '', role: '', goals: [] },
      isCompleted: false,
    });
  });

  it('comeca no step 0 (welcome)', () => {
    expect(useWizardStore.getState().currentStep).toBe(0);
  });

  it('nextStep avanca para step 1', () => {
    useWizardStore.getState().nextStep();
    expect(useWizardStore.getState().currentStep).toBe(1);
  });

  it('prevStep volta para step anterior', () => {
    useWizardStore.getState().nextStep();
    useWizardStore.getState().nextStep();
    expect(useWizardStore.getState().currentStep).toBe(2);

    useWizardStore.getState().prevStep();
    expect(useWizardStore.getState().currentStep).toBe(1);
  });

  it('direction muda para 1 ao avancar', () => {
    useWizardStore.getState().nextStep();
    expect(useWizardStore.getState().direction).toBe(1);
  });

  it('direction muda para -1 ao voltar', () => {
    useWizardStore.getState().nextStep();
    useWizardStore.getState().nextStep();
    useWizardStore.getState().prevStep();
    expect(useWizardStore.getState().direction).toBe(-1);
  });

  it('nao avanca alem do ultimo step', () => {
    // Avanca ate o ultimo step (TOTAL_STEPS - 1)
    for (let i = 0; i < TOTAL_STEPS - 1; i++) {
      useWizardStore.getState().nextStep();
    }
    expect(useWizardStore.getState().currentStep).toBe(TOTAL_STEPS - 1);

    // Tenta avancar mais — deve permanecer no ultimo
    useWizardStore.getState().nextStep();
    expect(useWizardStore.getState().currentStep).toBe(TOTAL_STEPS - 1);
  });

  it('nao volta alem do step 0', () => {
    useWizardStore.getState().prevStep();
    expect(useWizardStore.getState().currentStep).toBe(0);
  });
});

// ===========================================================================
// 3. Dados do wizard (store)
// ===========================================================================

describe('useWizardStore — Dados do wizard', () => {
  beforeEach(() => {
    localStorage.clear();
    useWizardStore.setState({
      currentStep: 0,
      direction: 1,
      data: { name: '', role: '', goals: [] },
      isCompleted: false,
    });
  });

  it('updateData atualiza campos corretamente', () => {
    useWizardStore.getState().updateData({ name: 'Joao' });
    expect(useWizardStore.getState().data.name).toBe('Joao');

    useWizardStore.getState().updateData({ role: 'podcaster' });
    expect(useWizardStore.getState().data.role).toBe('podcaster');

    // updateData nao sobrescreve campos nao passados
    expect(useWizardStore.getState().data.name).toBe('Joao');
  });

  it('toggleGoal adiciona goal se nao selecionado', () => {
    useWizardStore.getState().toggleGoal('audio');
    expect(useWizardStore.getState().data.goals).toContain('audio');

    useWizardStore.getState().toggleGoal('video');
    expect(useWizardStore.getState().data.goals).toEqual(['audio', 'video']);
  });

  it('toggleGoal remove goal se ja selecionado', () => {
    useWizardStore.getState().toggleGoal('audio');
    useWizardStore.getState().toggleGoal('video');
    expect(useWizardStore.getState().data.goals).toEqual(['audio', 'video']);

    useWizardStore.getState().toggleGoal('audio');
    expect(useWizardStore.getState().data.goals).toEqual(['video']);
  });

  it('toggleGoal adiciona e depois remove ao segundo clique (nao duplica)', () => {
    useWizardStore.getState().toggleGoal('audio');
    expect(useWizardStore.getState().data.goals).toEqual(['audio']);

    // Segundo clique remove o goal
    useWizardStore.getState().toggleGoal('audio');
    expect(useWizardStore.getState().data.goals).toEqual([]);
  });

  it('complete marca como concluido', () => {
    useWizardStore.getState().complete();
    expect(useWizardStore.getState().isCompleted).toBe(true);
  });

  it('skip marca como concluido', () => {
    useWizardStore.getState().skip();
    expect(useWizardStore.getState().isCompleted).toBe(true);
  });
});

// ===========================================================================
// 4. Persistencia localStorage
// ===========================================================================

describe('useWizardStore — Persistencia localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    useWizardStore.setState({
      currentStep: 0,
      direction: 1,
      data: { name: '', role: '', goals: [] },
      isCompleted: false,
    });
  });

  it('complete escreve s2a_onboarding_completed = true', () => {
    useWizardStore.getState().complete();
    expect(localStorage.getItem('s2a_onboarding_completed')).toBe('true');
  });

  it('skip escreve s2a_onboarding_completed = true', () => {
    useWizardStore.getState().skip();
    expect(localStorage.getItem('s2a_onboarding_completed')).toBe('true');
  });

  it('complete salva perfil em s2a_onboarding_profile', () => {
    useWizardStore.getState().updateData({ name: 'Joao', role: 'podcaster', goals: ['audio'] });
    useWizardStore.getState().complete();

    const raw = localStorage.getItem('s2a_onboarding_profile');
    expect(raw).not.toBeNull();

    const profile = JSON.parse(raw as string) as { name: string; role: string; goals: string[] };
    expect(profile.name).toBe('Joao');
    expect(profile.role).toBe('podcaster');
    expect(profile.goals).toEqual(['audio']);
  });

  it('skip nao salva perfil (apenas marca como concluido)', () => {
    useWizardStore.getState().updateData({ name: 'Joao' });
    useWizardStore.getState().skip();

    const raw = localStorage.getItem('s2a_onboarding_profile');
    expect(raw).toBeNull();
  });

  it('store persiste isCompleted como true apos complete()', () => {
    // Configura localStorage antes de recriar o store
    localStorage.setItem('s2a_onboarding_completed', 'true');

    // O store le localStorage apenas na criacao (create).
    // Como o store ja foi criado, testamos que apos complete/skip o valor persiste.
    useWizardStore.getState().complete();
    expect(useWizardStore.getState().isCompleted).toBe(true);
    expect(localStorage.getItem('s2a_onboarding_completed')).toBe('true');
  });
});

// ===========================================================================
// 5. Fluxo de navegacao com componentes renderizados
// ===========================================================================

describe('OnboardingPage — Navegacao entre etapas', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ ...defaultAuth, user: authenticatedUser });
    useWizardStore.setState({
      currentStep: 0,
      direction: 1,
      data: { name: '', role: '', goals: [] },
      isCompleted: false,
    });
  });

  it('WelcomeStep avanca para ProfileStep ao clicar "Começar"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingPage />);

    await user.click(screen.getByRole('button', { name: /Começar/i }));

    // Deve estar no step 1 (ProfileStep)
    expect(useWizardStore.getState().currentStep).toBe(1);
    expect(screen.getByText('Como podemos te chamar?')).toBeDefined();
  });

  it('ProfileStep exibe campo de nome e opcoes de papel', async () => {
    useWizardStore.setState({ currentStep: 1 });

    renderWithProviders(<OnboardingPage />);

    // Deve exibir o titulo do ProfileStep
    expect(screen.getByText('Como podemos te chamar?')).toBeDefined();
    // Deve exibir as opcoes de role
    expect(screen.getByText('Criador de conteúdo')).toBeDefined();
    expect(screen.getByText('Podcaster')).toBeDefined();
    expect(screen.getByText('Marketer')).toBeDefined();
    expect(screen.getByText('Educador')).toBeDefined();
    expect(screen.getByText('Outro')).toBeDefined();
  });

  it('GoalsStep exibe as opcoes de metas', () => {
    useWizardStore.setState({ currentStep: 2 });

    renderWithProviders(<OnboardingPage />);

    expect(screen.getByText('Defina seu foco.')).toBeDefined();
    expect(screen.getByText('Gerar áudio profissional')).toBeDefined();
    expect(screen.getByText('Criar cenas visuais')).toBeDefined();
    expect(screen.getByText('Produzir vídeos')).toBeDefined();
    expect(screen.getByText('Assistente IA')).toBeDefined();
  });

  it('CompletionStep exibe a tela de conclusao', () => {
    useWizardStore.setState({
      currentStep: 3,
      data: { name: 'Joao Silva', role: 'podcaster', goals: ['audio'] },
    });

    renderWithProviders(<OnboardingPage />);

    // Deve exibir o titulo com o primeiro nome
    expect(screen.getByText(/Tudo pronto, Joao!/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Acessar Plataforma/i })).toBeDefined();
  });
});
