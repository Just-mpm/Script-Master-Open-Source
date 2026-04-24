import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BatchOrchestrator } from '../../src/features/speed-paint/components/batch/BatchOrchestrator';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

// Mock do logger
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock do tokens
vi.mock('../../src/theme/tokens', () => ({
  ERROR_MAIN: '#ef4444',
}));

// Mock do surfaces
vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('BatchOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().resetJob();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retorna null quando batchMode é idle', () => {
    const { container } = render(<BatchOrchestrator />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('retorna null quando batchMode é watch mas queue está vazia', () => {
    useAnimationStore.getState().setBatchMode('watch');
    const { container } = render(<BatchOrchestrator />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('retorna null quando batchMode é record mas queue está vazia', () => {
    useAnimationStore.getState().setBatchMode('record');
    const { container } = render(<BatchOrchestrator />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('não renderiza mensagem de erro quando job falha e batchMode é idle', () => {
    useAnimationStore.getState().setJob({ status: 'failed' });
    useAnimationStore.getState().setBatchMode('idle');

    const { container } = render(<BatchOrchestrator />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('processa imagem quando batchMode é watch e há queue', async () => {
    // O BatchOrchestrator é um componente orquestrador invisível.
    // Quando batchMode !== 'idle' e há queue, ele:
    // 1. Define job como processing
    // 2. Chama generateStrokesFromImage
    // 3. Se sucesso, define job como completed
    // 4. Se falha, define job como failed e renderiza mensagem de erro

    // Verifica que o estado processing é setado
    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    render(<BatchOrchestrator />, { wrapper: Wrapper });

    // Após render, o useEffect deve ter setado job como processing
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(useAnimationStore.getState().job.status).toBe('processing');
  });

  it('retorna null (não mostra erro) durante processing', async () => {
    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    const { container } = render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // Durante processing, BatchOrchestrator retorna null (renderiza nada)
    expect(container.innerHTML).toBe('');
  });

  it('retorna null quando queue acabou (currentIndex >= queue.length)', async () => {
    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setCurrentIndex(1); // Fora do range
    useAnimationStore.getState().setBatchMode('watch');

    render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // currentImg é undefined → setBatchMode('idle') → retorna null
    expect(useAnimationStore.getState().batchMode).toBe('idle');
  });

  it('renderiza erro quando job.status é failed e batchMode está ativo', async () => {
    // Para testar o caminho de erro, precisamos:
    // 1. Queue + batchMode ativo
    // 2. Fazer job falhar depois do setup inicial
    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    // Renderiza para montar o componente
    const { rerender } = render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // Agora force o estado de erro diretamente no store
    // (simulando o que aconteceria se generateStrokesFromImage falhasse)
    useAnimationStore.getState().setJob({ status: 'failed' });

    // Re-renderiza para refletir o novo estado
    rerender(<BatchOrchestrator />);

    // O componente deve mostrar a UI de erro
    expect(screen.getByText('Falha ao processar imagem')).toBeDefined();
  });

  it('mostra mensagem de avançar quando há próxima imagem na fila após falha', async () => {
    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
      { id: '2', dataUrl: 'data:image/png;base64,def', filename: 'test2.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    const { rerender } = render(<BatchOrchestrator />, { wrapper: Wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    useAnimationStore.getState().setJob({ status: 'failed' });
    rerender(<BatchOrchestrator />);

    expect(screen.getByText(/Avançando automaticamente/)).toBeDefined();
  });

  it('mostra mensagem de pulagem quando é a última da fila após falha', async () => {
    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    const { rerender } = render(<BatchOrchestrator />, { wrapper: Wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    useAnimationStore.getState().setJob({ status: 'failed' });
    rerender(<BatchOrchestrator />);

    expect(screen.getByText(/Todas as imagens restantes na fila serão puladas/)).toBeDefined();
  });

  it('tem role="alert" no container de erro', async () => {
    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    const { rerender } = render(<BatchOrchestrator />, { wrapper: Wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    useAnimationStore.getState().setJob({ status: 'failed' });
    rerender(<BatchOrchestrator />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
  });
});
