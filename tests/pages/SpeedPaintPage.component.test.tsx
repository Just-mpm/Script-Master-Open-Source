import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { SpeedPaintPage } from '../../src/pages/SpeedPaintPage';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

// Estado mutável para testes — vi.hoisted para funcionar com vi.mock
const { animState } = vi.hoisted(() => ({
  animState: {
    job: { id: '', inputImage: '', status: 'idle' as string, progress: 0, animation: null as unknown },
    queue: [] as unknown[],
    currentIndex: 0,
    batchMode: 'idle' as string,
    queueSource: null as string | null,
    queueSourceProjectName: null as string | null,
    queueSourceNotice: null as string | null,
    animationDuration: 15,
    showDrawTool: true,
    canvasColor: 'white' as string,
  },
}));

const { exporterState } = vi.hoisted(() => ({
  exporterState: {
    isRendering: false,
    renderProgress: 0,
    renderStatusText: '',
    outputBlob: null as Blob | null,
    outputUrl: null as string | null,
    error: null as string | null,
    wasCancelled: false,
    canRender: null as boolean | null,
    resolvedVideoCodec: 'h264',
    resolvedContainer: 'mp4',
    checkSupport: vi.fn(),
    startRender: vi.fn(),
    startBatchRender: vi.fn(),
    handleCancel: vi.fn(),
    handleDownload: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('../../src/features/speed-paint/store/animationStore', () => ({
  useAnimationStore: Object.assign(
    (selector?: (s: typeof animState & Record<string, unknown>) => unknown) =>
      selector ? selector(animState as typeof animState & Record<string, unknown>) : animState,
    {
      getState: () => animState,
    },
  ),
  useShallow: (fn: (s: typeof animState) => unknown) => fn,
}));

vi.mock('../../src/features/speed-paint/components/batch/BatchOrchestrator', () => ({
  BatchOrchestrator: () => <div data-testid="batch-orchestrator">BatchOrchestrator</div>,
}));

vi.mock('../../src/features/speed-paint/components/batch/QueueStaging', () => ({
  QueueStaging: () => <div data-testid="queue-staging">QueueStaging</div>,
}));

vi.mock('../../src/features/speed-paint/components/SpeedPaintPlayer', () => ({
  SpeedPaintPlayer: ({
    timingMode,
    isLastScene,
  }: {
    timingMode?: string;
    isLastScene?: boolean;
  }) => (
    <div
      data-testid="speed-paint-player"
      data-timing-mode={timingMode ?? ''}
      data-is-last-scene={isLastScene ? 'true' : 'false'}
    >
      SpeedPaintPlayer
    </div>
  ),
}));

vi.mock('../../src/features/speed-paint/components/SpeedPaintPlayerControls', () => ({
  SpeedPaintPlayerControls: () => <div data-testid="speed-paint-player-controls">SpeedPaintPlayerControls</div>,
}));

vi.mock('../../src/features/speed-paint/components/SpeedPaintExportPanel', () => ({
  SpeedPaintExportPanel: () => <div data-testid="speed-paint-export-panel">SpeedPaintExportPanel</div>,
}));

vi.mock('../../src/features/speed-paint/hooks/useSpeedPaintExporter', () => ({
  useSpeedPaintExporter: () => ({ ...exporterState }),
}));

vi.mock('../../src/features/speed-paint/components/upload/ImageUpload', () => ({
  ImageUpload: () => <div data-testid="image-upload">ImageUpload</div>,
}));

vi.mock('../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
  return { ...actual, APP_MAX_WIDTH: 1600,
  APP_BORDER: 'rgba(255, 255, 255, 0.08)',
  GLASS_BG: 'rgba(16, 23, 42, 0.78)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)',
  BRAND_GRADIENT_HOVER: 'linear-gradient(135deg, #5BA3D0 0%, #F7941E 100%)',
  BRAND_GLOW: '0 14px 36px rgba(46, 117, 182, 0.26)',
  BRAND_PRIMARY: '#2E75B6',
  BRAND_PRIMARY_GLOW_SOFT: '0 0 12px rgba(46,117,182,0.25)',
  BRAND_PRIMARY_LIGHT: '#5BA3D0',
  EMPTY_WRAPPER_MAX_WIDTH: 400,
  EMPTY_WRAPPER_PADDING_MD: 24,
  GAP_COMPACT: 0.75,
  GAP_DEFAULT: 1,
  GAP_MEDIUM: 1.5,
  ICON_SIZE_MD: 16,
  RADIUS_CHIP: 6,
  RADIUS_SM: 3,
  RADIUS_XS: 2,
  SUCCESS_MAIN: '#10b981',
  SUCCESS_BORDER: 'rgba(16, 185, 129, 0.18)',
  SUCCESS_GLOW: '0 0 12px rgba(16, 185, 129, 0.25)',
  SUCCESS_BG_SUBTLE: 'rgba(16, 185, 129, 0.08)',
  ERROR_BORDER: 'rgba(239, 68, 68, 0.14)',
  ERROR_GLOW: 'rgba(239, 68, 68, 0.15)',
  WARNING_BG_SUBTLE: 'rgba(245, 158, 11, 0.08)',
  WARNING_BORDER: 'rgba(245, 158, 11, 0.14)',
  WARNING_GLOW: 'rgba(245, 158, 11, 0.15)',
  ERROR_BG_SUBTLE: 'rgba(239, 68, 68, 0.08)',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247, 148, 30, 0.12)',
  WHITE_08: 'rgba(255, 255, 255, 0.08)',
  WHITE_14: 'rgba(255, 255, 255, 0.14)', };
});;

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
  glassSurfaceSx: () => ({}),
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

describe('SpeedPaintPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    // Restaura estado padrão
    animState.job = { id: '', inputImage: '', status: 'idle', progress: 0, animation: null };
    animState.queue = [];
    animState.currentIndex = 0;
    animState.batchMode = 'idle';
    animState.queueSource = null;
    animState.queueSourceProjectName = null;
    animState.queueSourceNotice = null;
    animState.animationDuration = 15;
    animState.showDrawTool = true;
    animState.canvasColor = 'white';
    (animState as Record<string, unknown>).setBatchMode = vi.fn((mode: string) => {
      animState.batchMode = mode;
    });
    (animState as Record<string, unknown>).clearQueue = vi.fn(() => {
      animState.queue = [];
      animState.batchMode = 'idle';
    });
    (animState as Record<string, unknown>).resetJob = vi.fn(() => {
      animState.job = { id: '', inputImage: '', status: 'idle', progress: 0, animation: null };
    });
    (animState as Record<string, unknown>).setCurrentIndex = vi.fn();
    exporterState.isRendering = false;
    exporterState.renderProgress = 0;
    exporterState.renderStatusText = '';
    exporterState.outputBlob = null;
    exporterState.outputUrl = null;
    exporterState.error = null;
    exporterState.wasCancelled = false;
    exporterState.canRender = null;
    exporterState.resolvedVideoCodec = 'h264';
    exporterState.resolvedContainer = 'mp4';
  });

  it('renderiza o título da página', () => {
    render(<SpeedPaintPage />, { wrapper: Wrapper });
    expect(screen.getByText('Transforme Imagens em')).toBeDefined();
  });

  it('renderiza o BatchOrchestrator', () => {
    render(<SpeedPaintPage />, { wrapper: Wrapper });
    expect(screen.getByTestId('batch-orchestrator')).toBeDefined();
  });

  it('renderiza ImageUpload quando a fila está vazia e batchMode é idle', () => {
    render(<SpeedPaintPage />, { wrapper: Wrapper });
    expect(screen.getByTestId('image-upload')).toBeDefined();
  });

  it('renderiza QueueStaging quando há itens na fila e batchMode é idle', () => {
    animState.queue = [{ id: '1' }];

    render(<SpeedPaintPage />, { wrapper: Wrapper });
    expect(screen.getByTestId('queue-staging')).toBeDefined();
    expect(screen.queryByTestId('image-upload')).toBeNull();
  });

  it('mostra contexto quando a fila veio da biblioteca', () => {
    animState.queue = [{ id: '1' }];
    animState.queueSource = 'library';
    animState.queueSourceProjectName = 'Projeto Biblioteca';

    render(<SpeedPaintPage />, { wrapper: Wrapper });

    expect(screen.getByText(/Projeto Biblioteca/)).toBeDefined();
  });

  it('mostra o aviso parcial quando a biblioteca descartou algumas imagens', () => {
    animState.queue = [{ id: '1' }];
    animState.queueSource = 'library';
    animState.queueSourceProjectName = 'Projeto Biblioteca';
    animState.queueSourceNotice = '1 imagem foi descartada por falha no carregamento.';

    render(<SpeedPaintPage />, { wrapper: Wrapper });

    expect(screen.getByText('1 imagem foi descartada por falha no carregamento.')).toBeDefined();
  });

  it('renderiza SpeedPaintPlayer quando job está completado', () => {
    animState.job = {
      id: 'job-1',
      inputImage: 'data:image/png;base64,abc',
      status: 'completed',
      progress: 0,
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 450,
        fps: 30,
        totalDurationMs: 15000,
        strokes: [],
      },
    };

    render(<SpeedPaintPage />, { wrapper: Wrapper });
    const player = screen.getByTestId('speed-paint-player');
    expect(player).toBeDefined();
    expect(player.getAttribute('data-timing-mode')).toBe('duration-based');
    expect(player.getAttribute('data-is-last-scene')).toBe('true');
    expect(screen.getByTestId('speed-paint-player-controls')).toBeDefined();
    // ExportPanel está na aba "Exportar" — não visível por padrão (aba "Reprodução")
    expect(screen.queryByTestId('speed-paint-export-panel')).toBeNull();
  });

  it('usa timing sequencial no preview do lote enquanto batchMode é watch', () => {
    animState.batchMode = 'watch';
    animState.currentIndex = 0;
    animState.queue = [
      { id: '1', dataUrl: 'data:image/png;base64,aaa', status: 'completed' },
      { id: '2', dataUrl: 'data:image/png;base64,bbb', status: 'pending' },
    ];
    animState.job = {
      id: 'job-1',
      inputImage: 'data:image/png;base64,abc',
      status: 'completed',
      progress: 0,
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 450,
        fps: 30,
        totalDurationMs: 15000,
        strokes: [],
      },
    };

    render(<SpeedPaintPage />, { wrapper: Wrapper });

    const player = screen.getByTestId('speed-paint-player');
    expect(player.getAttribute('data-timing-mode')).toBe('sequenced-batch');
    expect(player.getAttribute('data-is-last-scene')).toBe('false');
  });

  it('renderiza ExportPanel quando a aba Exportar está ativa', () => {
    animState.job = {
      id: 'job-1',
      inputImage: 'data:image/png;base64,abc',
      status: 'completed',
      progress: 0,
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 450,
        fps: 30,
        totalDurationMs: 15000,
        strokes: [],
      },
    };

    render(<SpeedPaintPage />, { wrapper: Wrapper });
    // Clica na aba "Exportar"
    const exportTab = screen.getByRole('tab', { name: /Exportar/i });
    fireEvent.click(exportTab);
    expect(screen.getByTestId('speed-paint-export-panel')).toBeDefined();
  });

  it('renderiza indicador de processamento quando job está processando', () => {
    animState.job = { id: 'job-1', inputImage: 'data:image/png;base64,abc', status: 'processing', progress: 0.5, animation: undefined };

    render(<SpeedPaintPage />, { wrapper: Wrapper });
    expect(screen.getByText(/Gerando Animação/)).toBeDefined();
  });

  it('inicia a exportação final do lote uma única vez quando batchMode é record', () => {
    animState.batchMode = 'record';
    animState.queue = [
      { id: '1', dataUrl: 'data:image/png;base64,aaa', status: 'completed' },
      { id: '2', dataUrl: 'data:image/png;base64,bbb', status: 'pending' },
    ];

    const { rerender } = render(<SpeedPaintPage />, { wrapper: Wrapper });

    expect(exporterState.startBatchRender).toHaveBeenCalledTimes(1);
    expect(exporterState.startBatchRender).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        { imageSource: 'data:image/png;base64,aaa' },
        { imageSource: 'data:image/png;base64,bbb' },
      ],
    }));

    rerender(<SpeedPaintPage />);
    expect(exporterState.startBatchRender).toHaveBeenCalledTimes(1);
  });

  it('repassa a duração atual do store para a exportação em lote', () => {
    animState.batchMode = 'record';
    animState.animationDuration = 30;
    animState.queue = [
      { id: '1', dataUrl: 'data:image/png;base64,aaa', status: 'completed' },
      { id: '2', dataUrl: 'data:image/png;base64,bbb', status: 'completed' },
    ];

    render(<SpeedPaintPage />, { wrapper: Wrapper });

    expect(exporterState.startBatchRender).toHaveBeenCalledWith(expect.objectContaining({
      sceneDurationSeconds: 30,
    }));
  });

  it('não reenfileira no vídeo final itens que já falharam no preview', () => {
    animState.batchMode = 'record';
    animState.queue = [
      { id: '1', dataUrl: 'data:image/png;base64,aaa', status: 'completed' },
      { id: '2', dataUrl: 'data:image/png;base64,bbb', status: 'failed' },
      { id: '3', dataUrl: 'data:image/png;base64,ccc', status: 'pending' },
    ];

    render(<SpeedPaintPage />, { wrapper: Wrapper });

    expect(exporterState.startBatchRender).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        { imageSource: 'data:image/png;base64,aaa' },
        { imageSource: 'data:image/png;base64,ccc' },
      ],
      fileName: expect.stringContaining('2itens'),
    }));
  });

  it('mantém um estado claro quando a exportação do lote é cancelada', () => {
    animState.batchMode = 'idle';
    animState.queue = [{ id: '1', dataUrl: 'data:image/png;base64,aaa' }];
    exporterState.wasCancelled = true;
    exporterState.renderStatusText = 'Exportação cancelada.';

    render(<SpeedPaintPage />, { wrapper: Wrapper });

    expect(screen.getByText(/Nada foi perdido/)).toBeDefined();
    expect(screen.getByText('Voltar para a fila')).toBeDefined();
    expect(screen.getByText('Limpar fila')).toBeDefined();
  });

  it('não duplica o cabeçalho enquanto o vídeo final do lote está renderizando', () => {
    animState.batchMode = 'record';
    animState.queue = [
      { id: '1', dataUrl: 'data:image/png;base64,aaa', status: 'completed' },
      { id: '2', dataUrl: 'data:image/png;base64,bbb', status: 'completed' },
    ];
    exporterState.isRendering = true;
    exporterState.renderProgress = 51;
    exporterState.renderStatusText = 'Renderizando vídeo final... 51%';

    render(<SpeedPaintPage />, { wrapper: Wrapper });

    expect(screen.getAllByText('Vídeo Final da Fila')).toHaveLength(1);
    expect(screen.getByText('Renderizando vídeo final... 51%')).toBeDefined();
    expect(screen.getByText('2 imagens entrarão no vídeo final.')).toBeDefined();
  });

  it('mantém o resumo de itens ignorados durante a renderização do vídeo final do lote', () => {
    animState.batchMode = 'record';
    animState.queue = [
      { id: '1', dataUrl: 'data:image/png;base64,aaa', status: 'completed' },
      { id: '2', dataUrl: 'data:image/png;base64,bbb', status: 'failed' },
      { id: '3', dataUrl: 'data:image/png;base64,ccc', status: 'completed' },
    ];
    exporterState.isRendering = true;
    exporterState.renderProgress = 51;
    exporterState.renderStatusText = 'Renderizando vídeo final... 51%';

    render(<SpeedPaintPage />, { wrapper: Wrapper });

    expect(screen.getByText('2 imagens entrarão no vídeo final. 1 imagem será ignorada por falha anterior no preview.')).toBeDefined();
  });
});
