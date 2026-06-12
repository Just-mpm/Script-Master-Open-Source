import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ImageUpload } from '../../src/features/speed-paint/components/upload/ImageUpload';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

// Mock do react-dropzone — captura onDrop para disparar manualmente
let capturedOnDrop: ((files: File[]) => void) | null = null;
const mockOpen = vi.fn();

vi.mock('react-dropzone', () => ({
  useDropzone: (config: { onDrop: (files: File[]) => void; noClick?: boolean; noKeyboard?: boolean }) => {
    capturedOnDrop = config.onDrop ?? null;
    return {
      getRootProps: (props: Record<string, unknown> = {}) => ({
        'data-testid': 'dropzone-root',
        onClick: () => {},
        ...props,
      }),
      getInputProps: () => ({ 'data-testid': 'dropzone-input' }),
      isDragActive: false,
      open: mockOpen,
    };
  },
}));

// Mock do tokens
vi.mock('../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
  return { ...actual, CYAN_GLOW_SOFT: '0 0 15px rgba(0, 229, 255, 0.15)',
  BRAND_PRIMARY_GLOW_SOFT: '0 0 15px rgba(0, 229, 255, 0.15)',
  BRAND_PRIMARY: '#00e5ff',
  BRAND_PRIMARY_LIGHT: '#33d1ff',
  BRAND_PRIMARY_GLOW: 'rgba(0, 229, 255, 0.28)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #2e75b6, #f7941e)', };
});;

describe('ImageUpload', () => {
  beforeEach(() => {
    capturedOnDrop = null;
    mockOpen.mockClear();
    localStorage.setItem('s2a_locale', 'pt-BR');
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().resetJob();
  });

  it('renderiza título "Envie uma ou mais imagens"', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    expect(screen.getByText('Envie uma ou mais imagens')).toBeDefined();
  });

  it('renderiza botão "Escolher arquivos"', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    expect(screen.getByText('Escolher arquivos')).toBeDefined();
  });

  it('renderiza texto de instrução', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    expect(screen.getByText(/Arraste e solte/)).toBeDefined();
    expect(screen.getByText(/JPG, PNG e WebP/)).toBeDefined();
  });

  it('traduz upload para espanhol sem chave crua', () => {
    localStorage.setItem('s2a_locale', 'es');
    render(<ImageUpload />, { wrapper: Wrapper });

    expect(screen.getByText('Sube una o más imágenes')).toBeDefined();
    expect(screen.getByText(/Arrastra y suelta tus imágenes aquí/i)).toBeDefined();
    expect(screen.getByText('Elegir archivos')).toBeDefined();
    expect(screen.queryByText('speedPaint.uploadPrompt')).toBeNull();
  });

  it('mostra ícone CloudUpload', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    const cloudIcon = document.querySelector('[aria-hidden="true"]');
    expect(cloudIcon).not.toBeNull();
  });

  it('adiciona arquivos à queue do store ao fazer drop', async () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    // Dispara onDrop manualmente com arquivo
    const blob = new Blob(['fake-png-data'], { type: 'image/png' });
    const file = new File([blob], 'test-upload.png', { type: 'image/png' });

    await act(async () => {
      if (capturedOnDrop) {
        await capturedOnDrop([file]);
      }
    });

    const queue = useAnimationStore.getState().queue;
    expect(queue).toHaveLength(1);
    expect(queue[0].filename).toBe('test-upload.png');
    expect(queue[0].status).toBe('pending');
    expect(queue[0].id).toBeTruthy();
  });

  it('reseta currentIndex para 0 ao adicionar arquivos', async () => {
    useAnimationStore.getState().setCurrentIndex(5);
    render(<ImageUpload />, { wrapper: Wrapper });

    const blob = new Blob(['fake-data'], { type: 'image/jpeg' });
    const file = new File([blob], 'img.jpg', { type: 'image/jpeg' });

    await act(async () => {
      if (capturedOnDrop) {
        await capturedOnDrop([file]);
      }
    });

    expect(useAnimationStore.getState().currentIndex).toBe(0);
  });

  it('reseta batchMode para idle ao adicionar arquivos', async () => {
    useAnimationStore.getState().setBatchMode('watch');
    render(<ImageUpload />, { wrapper: Wrapper });

    const blob = new Blob(['fake-data'], { type: 'image/jpeg' });
    const file = new File([blob], 'img.jpg', { type: 'image/jpeg' });

    await act(async () => {
      if (capturedOnDrop) {
        await capturedOnDrop([file]);
      }
    });

    expect(useAnimationStore.getState().batchMode).toBe('idle');
  });

  it('não altera queue quando onDrop recebe array vazio', async () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    await act(async () => {
      if (capturedOnDrop) {
        await capturedOnDrop([]);
      }
    });

    expect(useAnimationStore.getState().queue).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // GAP-02: Acessibilidade
  // --------------------------------------------------------------------------

  it('dropzone root tem role="button" e tabIndex={0}', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    const root = screen.getByTestId('dropzone-root');
    expect(root.getAttribute('role')).toBe('button');
    expect(root.getAttribute('tabindex')).toBe('0');
  });

  it('dropzone root tem aria-label', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    const root = screen.getByTestId('dropzone-root');
    expect(root.getAttribute('aria-label')).toBe('Envie uma ou mais imagens');
  });

  it('abre file dialog ao pressionar Enter no dropzone root', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    const root = screen.getByTestId('dropzone-root');
    fireEvent.keyDown(root, { key: 'Enter' });

    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('abre file dialog ao pressionar Espaço no dropzone root', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    const root = screen.getByTestId('dropzone-root');
    fireEvent.keyDown(root, { key: ' ' });

    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // GAP-01: open() via botão
  // --------------------------------------------------------------------------

  it('chama open ao clicar no botão Escolher arquivos', () => {
    render(<ImageUpload />, { wrapper: Wrapper });

    const button = screen.getByText('Escolher arquivos');
    fireEvent.click(button);

    // O botão tem stopPropagation + open
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });
});
