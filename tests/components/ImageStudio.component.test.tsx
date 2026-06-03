import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ImageStudio } from '../../src/components/ImageStudio';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, loading: false, authError: null, clearAuthError: vi.fn(), login: vi.fn(), logout: vi.fn() }),
}));

const mockGenerateImage = vi.fn();
const mockSetError = vi.fn();

vi.mock('../../src/hooks/useImageGenerator', () => ({
  useImageGenerator: () => ({
    isGenerating: false,
    imageUrl: null,
    imageBlob: null,
    error: null,
    setError: mockSetError,
    generateImage: mockGenerateImage,
  }),
}));

vi.mock('../../src/lib/db', () => ({
  getImageGenerations: vi.fn().mockResolvedValue([]),
  saveImageGeneration: vi.fn().mockResolvedValue(undefined),
  deleteImageGeneration: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../../src/theme/tokens', async () => {
  // vi.mock é hoisted; dynamic import para acessar createTokensMock
  // sem violar a ordem de inicialização do vitest.
  const { createTokensMock: factory } = await import('../__mocks__/tokensMock');
  return factory({
    extras: {
      SHADOW_IMAGE: 'rgba(0,0,0,0.2)',
      ICON_SIZE_SM: 16,
      ICON_SIZE_MD: 20,
      ICON_SIZE_LG: 24,
      GAP_COMPACT: 4,
      GAP_DEFAULT: 8,
      GAP_MEDIUM: 12,
      RADIUS_SM: 8,
      EMPTY_ICON_SIZE: 48,
      EMPTY_WRAPPER_MAX_WIDTH: 400,
      BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)',
      BRAND_PRIMARY: '#2E75B6',
    },
  });
});

describe('ImageStudio', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('renderiza o título da página', () => {
    render(<ImageStudio />, { wrapper: Wrapper });
    expect(screen.getByText('Criação visual com mais clareza')).toBeDefined();
  });

  it('renderiza o textarea do prompt', () => {
    render(<ImageStudio />, { wrapper: Wrapper });
    expect(screen.getByPlaceholderText(/Descreva a composição/i)).toBeDefined();
  });

  it('renderiza o botão Gerar imagem desabilitado sem prompt', () => {
    render(<ImageStudio />, { wrapper: Wrapper });
    const btn = screen.getByRole('button', { name: /Gerar imagem/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('habilita o botão Gerar imagem quando há prompt', async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<ImageStudio />, { wrapper: Wrapper });

    const textarea = screen.getByPlaceholderText(/Descreva a composição/i);
    await user.type(textarea, 'X');

    const btn = screen.getByRole('button', { name: /Gerar imagem/i });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('chama generateImage ao clicar no botão', { timeout: 15_000 }, async () => {
    const user = userEvent.setup({ delay: 0 });
    render(<ImageStudio />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText(/Descreva a composição/i), 'Gato');
    await user.click(screen.getByRole('button', { name: /Gerar imagem/i }));

    expect(mockGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'Gato' }),
    );
  });

  it('renderiza o estado vazio da prévia', () => {
    render(<ImageStudio />, { wrapper: Wrapper });
    expect(screen.getByText('Sua prévia aparece aqui')).toBeDefined();
  });

  it('mostra o select de proporção', () => {
    render(<ImageStudio />, { wrapper: Wrapper });
    // Usa getByLabelText para encontrar o select (evita Found multiple)
    expect(screen.getByLabelText('Proporção')).toBeDefined();
  });

  it('mostra chip com aspect ratio selecionado', () => {
    render(<ImageStudio />, { wrapper: Wrapper });
    expect(screen.getByText('1:1')).toBeDefined();
  });

  it('mostra seção de galeria de imagens salvas', () => {
    render(<ImageStudio />, { wrapper: Wrapper });
    expect(screen.getByText('Imagens salvas')).toBeDefined();
  });

  it('traduz a aba de stock para espanhol', () => {
    localStorage.setItem('s2a_locale', 'es');
    render(<ImageStudio />, { wrapper: Wrapper });
    expect(screen.getByRole('tab', { name: 'Imágenes de stock' })).toBeDefined();
    expect(screen.queryByRole('tab', { name: 'Mídia Stock' })).toBeNull();
  });

  it('mostra skeletons na galeria durante carregamento', () => {
    render(<ImageStudio />, { wrapper: Wrapper });
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('mostra mensagem vazia na galeria quando não há imagens', async () => {
    render(<ImageStudio />, { wrapper: Wrapper });

    await screen.findByText(/Nenhuma imagem salva ainda/i);
  });

  it('não chama generateImage quando prompt está vazio', () => {
    render(<ImageStudio />, { wrapper: Wrapper });

    // O botão está desabilitado quando o prompt está vazio
    const btn = screen.getByRole('button', { name: /Gerar imagem/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });
});
