import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Library } from '../../src/components/Library';
import type { Project, AudioSource, ProjectImage, ProjectVideo } from '../../src/lib/db';
import { I18nProvider } from '../../src/features/i18n';
const darkTheme = createTheme({ palette: { mode: 'dark' } });
const mockNavigate = vi.fn();
const mockLoadLibraryQueue = vi.fn();

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

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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
  getProjectDetails: vi.fn().mockResolvedValue({ audios: [], images: [], videos: [] }),
  deleteGeneration: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/features/speed-paint/store/animationStore', () => ({
  useAnimationStore: (selector?: (state: { loadLibraryQueue: typeof mockLoadLibraryQueue }) => unknown) => {
    const state = { loadLibraryQueue: mockLoadLibraryQueue };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../src/features/speed-paint/lib/projectQueueAdapter', () => ({
  prepareProjectImagesForSpeedPaint: vi.fn(),
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
  insetPanelSx: () => ({}),
  searchFieldSx: {},
}));

vi.mock('../../src/components/video-library/DeleteConfirmationDialog', () => ({
  DeleteConfirmationDialog: ({ open, titleIdleLabel }: { open: boolean; titleIdleLabel?: string }) =>
    open ? <div role="dialog">{titleIdleLabel ?? 'Excluir?'}</div> : null,
}));

vi.mock('../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
  return { ...actual, ICON_SIZE_SM: 16,
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
  BRAND_PRIMARY: '#2E75B6', };
});;

describe('Library', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockLoadLibraryQueue.mockReset();
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

  it('envia imagens do projeto para o Speed Paint e navega para a rota correta', async () => {
    const { getProjects, getProjectDetails } = await import('../../src/lib/db');
    const { prepareProjectImagesForSpeedPaint } = await import('../../src/features/speed-paint/lib/projectQueueAdapter');

    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Projeto X', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);

    vi.mocked(getProjectDetails).mockResolvedValue({
      audios: [] as AudioSource[],
      images: [
        {
          id: 'img-1',
          projectId: 'p1',
          userId: 'u1',
          imageUrl: 'https://cdn.example.com/1.png',
          prompt: 'Cena 1',
          timestamp: 10,
          createdAt: Date.now(),
        } as ProjectImage,
      ],
      videos: [],
    });

    vi.mocked(prepareProjectImagesForSpeedPaint).mockResolvedValue({
      queue: [
        {
          id: 'img-1',
          dataUrl: 'blob:scene-1',
          filename: 'projeto-x-cena-1.png',
          status: 'pending',
          shouldRevokeObjectUrl: true,
        },
      ],
      failedCount: 0,
    });

    const user = userEvent.setup();
    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Projeto X')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Levar cenas ao Speed Paint/i }));

    await waitFor(() => {
      expect(prepareProjectImagesForSpeedPaint).toHaveBeenCalled();
      expect(mockLoadLibraryQueue).toHaveBeenCalledWith(expect.any(Array), 'Projeto X', null);
      expect(mockNavigate).toHaveBeenCalledWith('/app/pintura-rapida');
    });
  });

  it('mostra erro ao tentar enviar para o Speed Paint sem imagens válidas', async () => {
    const { getProjects, getProjectDetails } = await import('../../src/lib/db');
    const { prepareProjectImagesForSpeedPaint } = await import('../../src/features/speed-paint/lib/projectQueueAdapter');

    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Projeto X', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);

    vi.mocked(getProjectDetails).mockResolvedValue({
      audios: [] as AudioSource[],
      images: [
        {
          id: 'img-1',
          projectId: 'p1',
          userId: 'u1',
          imageUrl: '',
          prompt: 'Cena 1',
          timestamp: 10,
          createdAt: Date.now(),
        } as ProjectImage,
      ],
      videos: [],
    });

    vi.mocked(prepareProjectImagesForSpeedPaint).mockResolvedValue({
      queue: [],
      failedCount: 1,
    });

    const user = userEvent.setup();
    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Projeto X')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Levar cenas ao Speed Paint/i }));

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível preparar as imagens para o Speed Paint/i)).toBeDefined();
    });

    expect(mockLoadLibraryQueue).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('refaz o fetch dos detalhes ao enviar para Speed Paint depois de um erro ao expandir', async () => {
    const { getProjects, getProjectDetails } = await import('../../src/lib/db');
    const { prepareProjectImagesForSpeedPaint } = await import('../../src/features/speed-paint/lib/projectQueueAdapter');

    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Projeto X', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);

    vi.mocked(getProjectDetails)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        audios: [] as AudioSource[],
        images: [
          {
            id: 'img-1',
            projectId: 'p1',
            userId: 'u1',
            imageUrl: 'https://cdn.example.com/1.png',
            prompt: 'Cena 1',
            timestamp: 10,
            createdAt: Date.now(),
          } as ProjectImage,
        ],
        videos: [],
      });

    vi.mocked(prepareProjectImagesForSpeedPaint).mockResolvedValue({
      queue: [
        {
          id: 'img-1',
          dataUrl: 'blob:scene-1',
          filename: 'projeto-x-cena-1.png',
          status: 'pending',
          shouldRevokeObjectUrl: true,
        },
      ],
      failedCount: 0,
    });

    const user = userEvent.setup();
    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Projeto X')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Ver detalhes/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Não foi possível carregar os detalhes do projeto/i).length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: /Levar cenas ao Speed Paint/i }));

    await waitFor(() => {
      expect(getProjectDetails).toHaveBeenCalledTimes(2);
      expect(mockLoadLibraryQueue).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/app/pintura-rapida');
    });
  });

  it('repasse o aviso parcial para a store antes da navegação', async () => {
    const { getProjects, getProjectDetails } = await import('../../src/lib/db');
    const { prepareProjectImagesForSpeedPaint } = await import('../../src/features/speed-paint/lib/projectQueueAdapter');

    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Projeto X', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);

    vi.mocked(getProjectDetails).mockResolvedValue({
      audios: [] as AudioSource[],
      images: [
        {
          id: 'img-1',
          projectId: 'p1',
          userId: 'u1',
          imageUrl: 'https://cdn.example.com/1.png',
          prompt: 'Cena 1',
          timestamp: 10,
          createdAt: Date.now(),
        } as ProjectImage,
      ],
      videos: [],
    });

    vi.mocked(prepareProjectImagesForSpeedPaint).mockResolvedValue({
      queue: [
        {
          id: 'img-1',
          dataUrl: 'blob:scene-1',
          filename: 'projeto-x-cena-1.png',
          status: 'pending',
          shouldRevokeObjectUrl: true,
        },
      ],
      failedCount: 2,
    });

    const user = userEvent.setup();
    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Projeto X')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Levar cenas ao Speed Paint/i }));

    await waitFor(() => {
      expect(mockLoadLibraryQueue).toHaveBeenCalledWith(
        expect.any(Array),
        'Projeto X',
        expect.stringContaining('2 imagem(ns) ficaram de fora'),
      );
    });
  });

  it('mostra caminho para reexportar quando não há vídeo salvo localmente', async () => {
    const { getProjects, getProjectDetails } = await import('../../src/lib/db');
    vi.mocked(getProjects).mockResolvedValue([
      { id: 'p1', name: 'Projeto X', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
    ]);
    vi.mocked(getProjectDetails).mockResolvedValue({
      audios: [] as AudioSource[],
      images: [] as ProjectImage[],
      videos: [] as ProjectVideo[],
    });

    const user = userEvent.setup();
    render(<Library />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Projeto X')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Ver detalhes/i }));

    await waitFor(() => {
      expect(screen.getByText('Nenhum vídeo salvo neste navegador.')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Abrir exportador de vídeo/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/app/video');
  });

  it('usa URL local recriada para baixar vídeo salvo com Blob', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:local-video') as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;

    try {
      const { getProjects, getProjectDetails } = await import('../../src/lib/db');
      const { downloadFile } = await import('../../src/lib/download');
      const videoBlob = new Blob(['video'], { type: 'video/mp4' });
      vi.mocked(getProjects).mockResolvedValue([
        { id: 'p1', name: 'Projeto X', script: '', createdAt: Date.now(), userId: 'u1' } as Project,
      ]);
      vi.mocked(getProjectDetails).mockResolvedValue({
        audios: [] as AudioSource[],
        images: [] as ProjectImage[],
        videos: [{
          id: 'video-1',
          projectId: 'p1',
          userId: 'u1',
          videoUrl: '',
          format: 'mp4',
          width: 1920,
          height: 1080,
          fps: 30,
          durationInSeconds: 10,
          fileSizeBytes: videoBlob.size,
          createdAt: Date.now(),
          videoBlob,
        } as ProjectVideo],
      });

      const user = userEvent.setup();
      render(<Library />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Projeto X')).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /Ver detalhes/i }));

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalledWith(videoBlob);
      });

      await user.click(screen.getByRole('button', { name: /Baixar vídeo/i }));

      expect(downloadFile).toHaveBeenCalledWith('blob:local-video', 'Projeto X-video-1.mp4');
    } finally {
      cleanup();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });
});
