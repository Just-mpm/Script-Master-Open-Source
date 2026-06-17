import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BatchOrchestrator } from '../../src/features/speed-paint/components/batch/BatchOrchestrator';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';
import { I18nProvider } from '../../src/features/i18n';

const mockGenerateStrokesFromImage = vi.fn();

vi.mock('../../src/features/speed-paint/lib/imageProcessing', () => ({
  generateStrokesFromImage: (...args: unknown[]) => mockGenerateStrokesFromImage(...args),
}));

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

// Mock do logger
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

// Mock do tokens
vi.mock('../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
  return { ...actual, ERROR_MAIN: '#ef4444',
  BRAND_GRADIENT: 'linear-gradient(135deg, #2e75b6, #f7941e)', };
});;

// Mock do surfaces
vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

describe('BatchOrchestrator', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGenerateStrokesFromImage.mockReset();
    mockGenerateStrokesFromImage.mockImplementation(() => new Promise(() => {}));
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

    expect(useAnimationStore.getState().job.id).toBe('1');
    expect(useAnimationStore.getState().job.status).toBe('processing');
    expect(useAnimationStore.getState().queue[0]?.status).toBe('processing');
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

  it('ignora resultado atrasado quando a fila é limpa durante o processamento', async () => {
    let resolveGeneration: ((value: {
      id: string;
      canvasWidth: number;
      canvasHeight: number;
      canvasColor: 'white';
      totalFrames: number;
      fps: number;
      totalDurationMs: number;
      strokes: never[];
    }) => void) | null = null;

    mockGenerateStrokesFromImage.mockImplementationOnce(() => new Promise((resolve) => {
      resolveGeneration = resolve;
    }));

    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    useAnimationStore.getState().clearQueue();

    await act(async () => {
      resolveGeneration?.({
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 10,
        fps: 30,
        totalDurationMs: 1000,
        strokes: [],
      });
      await Promise.resolve();
    });

    expect(useAnimationStore.getState().queue).toEqual([]);
    expect(useAnimationStore.getState().job.status).toBe('idle');
  });

  it('limpar a fila neutraliza o auto-skip pendente após falha', async () => {
    mockGenerateStrokesFromImage.mockRejectedValueOnce(new Error('boom'));

    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
      { id: '2', dataUrl: 'data:image/png;base64,def', filename: 'test2.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    useAnimationStore.getState().clearQueue();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(useAnimationStore.getState().queue).toEqual([]);
    expect(useAnimationStore.getState().currentIndex).toBe(0);
    expect(useAnimationStore.getState().job.status).toBe('idle');
  });

  it('marca item como completed quando o processamento termina com sucesso', async () => {
    let resolveGeneration: ((value: {
      id: string;
      canvasWidth: number;
      canvasHeight: number;
      canvasColor: 'white';
      totalFrames: number;
      fps: number;
      totalDurationMs: number;
      strokes: never[];
    }) => void) | null = null;

    mockGenerateStrokesFromImage.mockImplementationOnce(() => new Promise((resolve) => {
      resolveGeneration = resolve;
    }));

    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      resolveGeneration?.({
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 10,
        fps: 30,
        totalDurationMs: 1000,
        strokes: [],
      });
      await Promise.resolve();
    });

    expect(useAnimationStore.getState().job.status).toBe('completed');
    expect(useAnimationStore.getState().queue[0]?.status).toBe('completed');
  });

  // ---------------------------------------------------------------------------
  // Regressão: o signal não pode ser abortado por re-renders do próprio effect.
  // O effect chama `setJob` e `setQueue` (atualiza o status do item para
  // 'processing'), o que muda a identidade de `currentImg` (= queue[currentIndex])
  // e dispara o effect novamente. O cleanup do effect anterior aborta o signal,
  // o worker é terminado e a promise rejeita com AbortError, deixando o job
  // travado em `status: 'processing'` e `progress: 0` para sempre.
  // ---------------------------------------------------------------------------

  it('NÃO aborta o signal durante o processing por re-render do próprio effect (regressão)', async () => {
    const receivedSignals: AbortSignal[] = [];
    let resolveGeneration: ((value: {
      id: string;
      canvasWidth: number;
      canvasHeight: number;
      canvasColor: 'white';
      totalFrames: number;
      fps: number;
      totalDurationMs: number;
      strokes: never[];
    }) => void) | null = null;

    mockGenerateStrokesFromImage.mockImplementationOnce((_dataUrl, _onProgress, opts: { signal?: AbortSignal } = {}) => {
      if (opts.signal) receivedSignals.push(opts.signal);
      return new Promise((resolve) => {
        resolveGeneration = resolve;
      });
    });

    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    render(<BatchOrchestrator />, { wrapper: Wrapper });

    // Espera microtasks para que o effect rode, dispare setJob/setQueue,
    // o componente re-renderize (currentImg muda de identidade) e o React
    // execute o cleanup do effect anterior.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // O signal da primeira (e única) chamada NÃO pode ter sido abortado
    // por re-render do próprio effect.
    expect(receivedSignals).toHaveLength(1);
    expect(receivedSignals[0]?.aborted).toBe(false);

    // O job deve estar em processing — o signal segue vivo.
    expect(useAnimationStore.getState().job.status).toBe('processing');

    // Resolve a promise → o job deve virar completed normalmente.
    await act(async () => {
      resolveGeneration?.({
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 10,
        fps: 30,
        totalDurationMs: 1000,
        strokes: [],
      });
      await Promise.resolve();
    });

    expect(useAnimationStore.getState().job.status).toBe('completed');
  });

  it('avança para próxima imagem sem abortar o signal da atual por mudança de identidade', async () => {
    // Garante que mudar o status do item atual (de pending → processing) não
    // dispara re-processamento da mesma imagem. O id permanece estável.
    const calls: string[] = [];
    let resolveFirst: ((value: {
      id: string;
      canvasWidth: number;
      canvasHeight: number;
      canvasColor: 'white';
      totalFrames: number;
      fps: number;
      totalDurationMs: number;
      strokes: never[];
    }) => void) | null = null;

    mockGenerateStrokesFromImage.mockImplementation((dataUrl: string) => {
      calls.push(dataUrl);
      return new Promise((resolve) => {
        resolveFirst = resolve;
      });
    });

    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'a.png', status: 'pending' },
      { id: '2', dataUrl: 'data:image/png;base64,def', filename: 'b.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Apenas 1 chamada (id 1). O re-render causado pelo setQueue não deve
    // disparar uma segunda chamada para o mesmo id.
    expect(calls).toHaveLength(1);

    // Resolve a primeira imagem → job vira completed.
    await act(async () => {
      resolveFirst?.({
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 10,
        fps: 30,
        totalDurationMs: 1000,
        strokes: [],
      });
      await Promise.resolve();
    });

    expect(useAnimationStore.getState().job.status).toBe('completed');
  });

  // ---------------------------------------------------------------------------
  // L5 (RF-08): propagação de `renderMode` + `vetorialPreset` da store.
  //
  // O `BatchOrchestrator` lê `renderMode` e `vetorialPreset` da store via
  // `useAnimationStore.getState()` (linhas 102-108) para evitar closure stale
  // e passa para `generateStrokesFromImage` no terceiro argumento. Esses
  // testes fixam o comportamento e protegem contra regressão.
  // ---------------------------------------------------------------------------

  it('CT-T05: propaga renderMode "vetorial" + vetorialPreset para generateStrokesFromImage', async () => {
    // Arrange: store configurada para modo vetorial com preset artistic1
    useAnimationStore.setState({
      renderMode: 'vetorial',
      vetorialPreset: 'artistic1',
      job: { id: '', inputImage: '', status: 'idle', progress: 0 },
    });
    useAnimationStore.getState().setQueue([
      { id: 'img-1', dataUrl: 'data:image/png;base64,xxx', filename: 'a.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    // Act: renderiza e espera o effect rodar
    render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Assert: a chamada para generateStrokesFromImage inclui renderMode e vetorialPreset
    expect(mockGenerateStrokesFromImage).toHaveBeenCalledTimes(1);
    expect(mockGenerateStrokesFromImage).toHaveBeenCalledWith(
      'data:image/png;base64,xxx',
      expect.any(Function),
      expect.objectContaining({
        renderMode: 'vetorial',
        vetorialPreset: 'artistic1',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('propaga renderMode "mask" e força vetorialPreset=undefined mesmo se store tiver preset definido', async () => {
    // Arrange: store com vetorialPreset setado, mas renderMode='mask' deve descartá-lo
    useAnimationStore.setState({
      renderMode: 'mask',
      vetorialPreset: 'detailed',
      job: { id: '', inputImage: '', status: 'idle', progress: 0 },
    });
    useAnimationStore.getState().setQueue([
      { id: 'img-1', dataUrl: 'data:image/png;base64,xxx', filename: 'a.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    // Act
    render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Assert: renderMode='mask' e vetorialPreset=undefined (preset da store é ignorado)
    expect(mockGenerateStrokesFromImage).toHaveBeenCalledTimes(1);
    expect(mockGenerateStrokesFromImage).toHaveBeenCalledWith(
      'data:image/png;base64,xxx',
      expect.any(Function),
      expect.objectContaining({
        renderMode: 'mask',
        vetorialPreset: undefined,
      }),
    );
  });

  it('CT-F47: trocar renderMode durante o processamento NÃO interrompe o job atual (race protection)', async () => {
    // Arrange: começa em modo vetorial com preset artistic1
    useAnimationStore.setState({
      renderMode: 'vetorial',
      vetorialPreset: 'artistic1',
      job: { id: '', inputImage: '', status: 'idle', progress: 0 },
    });
    useAnimationStore.getState().setQueue([
      { id: 'img-1', dataUrl: 'data:image/png;base64,xxx', filename: 'a.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');

    // Act: renderiza e espera o effect rodar (inicia processamento)
    render(<BatchOrchestrator />, { wrapper: Wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Assert intermediário: a chamada inicial foi feita com os valores ORIGINAIS
    expect(mockGenerateStrokesFromImage).toHaveBeenCalledTimes(1);
    expect(mockGenerateStrokesFromImage).toHaveBeenCalledWith(
      'data:image/png;base64,xxx',
      expect.any(Function),
      expect.objectContaining({
        renderMode: 'vetorial',
        vetorialPreset: 'artistic1',
      }),
    );

    // Act: usuário troca o modo/preset enquanto o job está em andamento
    act(() => {
      useAnimationStore.getState().setRenderMode('mask');
      useAnimationStore.getState().setVetorialPreset('curvy');
    });

    // Assert: a chamada NÃO é refeita e mantém os valores ORIGINAIS
    // (race protection via getState() síncrono dentro do effect — ler
    //  `processingIdRef.current` no callback de progresso preserva o job atual)
    expect(mockGenerateStrokesFromImage).toHaveBeenCalledTimes(1);
    expect(mockGenerateStrokesFromImage).toHaveBeenCalledWith(
      'data:image/png;base64,xxx',
      expect.any(Function),
      expect.objectContaining({
        renderMode: 'vetorial',
        vetorialPreset: 'artistic1',
      }),
    );
    // Confirma que a store realmente mudou (a race protection é apenas sobre
    //  o job em voo, não sobre o estado da store)
    expect(useAnimationStore.getState().renderMode).toBe('mask');
    expect(useAnimationStore.getState().vetorialPreset).toBe('curvy');
  });
});
