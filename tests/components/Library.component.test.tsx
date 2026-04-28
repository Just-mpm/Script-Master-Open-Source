import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Library } from '../../src/components/Library';
import type { Project, AudioSource, ProjectImage } from '../../src/lib/db';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

const mockUser = { uid: 'user-123', displayName: 'Test', photoURL: null };

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, loading: false, authError: null, clearAuthError: vi.fn(), login: vi.fn(), signup: vi.fn(), loginWithEmail: vi.fn(), resetPassword: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../../src/contexts/AudioContext', () => ({
  useGlobalAudioState: () => ({
    isPlaying: false,
    activeId: null,
    play: vi.fn(),
    toggle: vi.fn(),
    currentTime: 0,
    duration: 0,
    progress: 0,
    formatTime: (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
  }),
  useGlobalAudioActions: () => ({
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    seek: vi.fn(),
  }),
  useAudioIsPlaying: vi.fn(() => false),
  useAudioCurrentTime: vi.fn(() => 0),
  useAudioActiveId: vi.fn(() => null),
  useAudioDuration: vi.fn(() => 0),
  useAudioProgress: vi.fn(() => 0),
}));

vi.mock('../../src/lib/db', () => ({
  getProjects: vi.fn().mockResolvedValue([]),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  updateProjectName: vi.fn().mockResolvedValue(undefined),
  getProjectDetails: vi.fn().mockResolvedValue({ audios: [], images: [] }),
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
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
  insetPanelSx: () => ({}),
  searchFieldSx: {},
}));

vi.mock('../../src/components/video-library/DeleteConfirmationDialog', () => ({
  DeleteConfirmationDialog: ({ open, titleIdleLabel }: { open: boolean; titleIdleLabel?: string }) =>
    open ? <div role="dialog">{titleIdleLabel ?? 'Excluir?'}</div> : null,
}));

vi.mock('../../src/theme/tokens', () => ({
  ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 20,
  ICON_SIZE_LG: 24,
  GAP_COMPACT: 4,
  GAP_DEFAULT: 8,
  GAP_MEDIUM: 12,
  GAP_RELAXED: 16,
  RADIUS_SM: 8,
  EMPTY_ICON_SIZE: 48,
  EMPTY_WRAPPER_MAX_WIDTH: 400,
  EMPTY_WRAPPER_PADDING_XS: 16,
  EMPTY_WRAPPER_PADDING_MD: 24,
  BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)',
  BRAND_PRIMARY: '#2E75B6',
}));

describe('Library', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('renderiza o título Biblioteca', () => {
    render(<Library />, { wrapper: Wrapper });
    expect(screen.getByText('Biblioteca')).toBeDefined();
  });

  it('renderiza o subtítulo Projetos salvos', () => {
    render(<Library />, { wrapper: Wrapper });
    expect(screen.getByText('Projetos salvos')).toBeDefined();
  });

  it('mostra skeletons de loading inicialmente', () => {
    render(<Library />, { wrapper: Wrapper });
    // Deve ter skeletons
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('mostra estado vazio quando não há projetos', async () => {
    const { getProjects } = await import('../../src/lib/db');
    vi.mocked(getProjects).mockResolvedValue([]);

    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Sua biblioteca ainda está vazia')).toBeDefined();
    });
  });

  it('mostra erro quando carregamento falha', async () => {
    const { getProjects } = await import('../../src/lib/db');
    vi.mocked(getProjects).mockRejectedValue(new Error('Network error'));

    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar/i)).toBeDefined();
    });
  });

  it('mostra projetos na lista quando carregados', async () => {
    const { getProjects } = await import('../../src/lib/db');
    const mockProjects: Project[] = [
      {
        id: 'p1',
        name: 'Meu Podcast',
        script: 'Olá mundo',
        createdAt: Date.now(),
        userId: 'user-123',
      } as Project,
    ];
    vi.mocked(getProjects).mockResolvedValue(mockProjects);

    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Meu Podcast')).toBeDefined();
    });
  });

  it('mostra chip com contagem de projetos', async () => {
    const { getProjects } = await import('../../src/lib/db');
    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Projeto A', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
      { id: 'p2', name: 'Projeto B', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);

    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('2 projetos')).toBeDefined();
    });
  });

  it('filtra projetos pela busca', async () => {
    const { getProjects } = await import('../../src/lib/db');
    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Podcast de Tech', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
      { id: 'p2', name: 'Aula de Matemática', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);

    const user = userEvent.setup();
    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Podcast de Tech')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar projeto/i);
    await user.type(searchInput, 'Tech');

    expect(screen.getByText('Podcast de Tech')).toBeDefined();
    expect(screen.queryByText('Aula de Matemática')).toBeNull();
  });

  it('mostra estado "nenhum encontrado" quando busca não retorna resultados', async () => {
    const { getProjects } = await import('../../src/lib/db');
    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Podcast de Tech', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);

    const user = userEvent.setup();
    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Podcast de Tech')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar projeto/i);
    await user.type(searchInput, 'Inexistente');

    expect(screen.getByText('Nenhum projeto encontrado')).toBeDefined();
  });

  it('abre dialog de exclusão ao clicar em Excluir', async () => {
    const { getProjects } = await import('../../src/lib/db');
    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Projeto X', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);

    const user = userEvent.setup();
    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Projeto X')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Excluir/i }));

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Excluir projeto?')).toBeDefined();
  });

  it('mostra alerta de info quando user é null', async () => {
    // Sobrescreve mock para simular user null
    const authModule = await import('../../src/contexts/AuthContext');
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      authError: null,
      clearAuthError: vi.fn(),
      login: vi.fn(),
      signup: vi.fn(),
      loginWithEmail: vi.fn(),
      resetPassword: vi.fn(),
      deleteAccount: vi.fn(),
      logout: vi.fn(),
    });

    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Sem login, a biblioteca usa armazenamento local/i)).toBeDefined();
    });

    // Restaura o mock original
    vi.restoreAllMocks();
  });
});
