import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { VideoLibrary } from '../../src/components/VideoLibrary';
import { I18nProvider } from '../../src/features/i18n';
const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

const mockNavigate = vi.fn();
const mockAuthState = {
  user: { uid: 'u1' },
  loading: false,
  authError: null,
  clearAuthError: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MotionDiv = 'div' as any;
      return <MotionDiv {...props}>{children}</MotionDiv>;
    },
  },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('../../src/lib/db', () => ({
  getProjects: vi.fn().mockResolvedValue([]),
  getGenerations: vi.fn().mockResolvedValue([]),
  getProjectsDetailsMap: vi.fn().mockResolvedValue({}),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  deleteVideoFromProject: vi.fn().mockResolvedValue(undefined),
  deleteGeneration: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/download', () => ({
  downloadFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
  return { ...actual, ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 20,
  GAP_COMPACT: 4,
  GAP_DEFAULT: 8,
  GAP_MEDIUM: 12,
  GAP_RELAXED: 16,
  RADIUS_SM: 8,
  RADIUS_CHIP: 16,
  EMPTY_WRAPPER_PADDING_XS: 16,
  EMPTY_WRAPPER_PADDING_MD: 24,
  BLACK_66: 'rgba(0,0,0,0.66)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)', };
});;

describe('VideoLibrary', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('mostra skeletons de loading inicialmente', () => {
    render(<VideoLibrary onSelect={onSelect} />, { wrapper: Wrapper });
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('mostra estado vazio quando não há projetos', async () => {
    render(<VideoLibrary onSelect={onSelect} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Sua biblioteca ainda está vazia')).toBeDefined();
    });
  });

  it('mostra o botão Ir para o Estúdio no estado vazio', async () => {
    render(<VideoLibrary onSelect={onSelect} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Sua biblioteca ainda está vazia')).toBeDefined();
      // O botão "Ir para o Estúdio" está no estado vazio
      expect(screen.getByRole('button', { name: /Ir para o Estúdio/i })).toBeDefined();
    }, { timeout: 5000 });
  });

  it('mostra mensagem de erro e botão Tentar novamente quando carregamento falha', async () => {
    const { getProjects } = vi.mocked(await import('../../src/lib/db'));
    getProjects.mockRejectedValue(new Error('Network error'));

    render(<VideoLibrary onSelect={onSelect} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar a galeria/i)).toBeDefined();
    });
  });
});
