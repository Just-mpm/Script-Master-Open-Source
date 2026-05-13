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
    batchMode: 'idle' as string,
    speed: 1,
    paintSpeed: 1,
    animationDuration: 15,
    showDrawTool: true,
    canvasColor: 'white' as string,
  },
}));

vi.mock('../../src/features/speed-paint/store/animationStore', () => ({
  useAnimationStore: (selector?: (s: typeof animState) => unknown) =>
    selector ? selector(animState) : animState,
  useShallow: (fn: (s: typeof animState) => unknown) => fn,
}));

vi.mock('../../src/features/speed-paint/components/batch/BatchOrchestrator', () => ({
  BatchOrchestrator: () => <div data-testid="batch-orchestrator">BatchOrchestrator</div>,
}));

vi.mock('../../src/features/speed-paint/components/batch/QueueStaging', () => ({
  QueueStaging: () => <div data-testid="queue-staging">QueueStaging</div>,
}));

vi.mock('../../src/features/speed-paint/components/SpeedPaintPlayer', () => ({
  SpeedPaintPlayer: () => <div data-testid="speed-paint-player">SpeedPaintPlayer</div>,
}));

vi.mock('../../src/features/speed-paint/components/SpeedPaintPlayerControls', () => ({
  SpeedPaintPlayerControls: () => <div data-testid="speed-paint-player-controls">SpeedPaintPlayerControls</div>,
}));

vi.mock('../../src/features/speed-paint/components/SpeedPaintExportPanel', () => ({
  SpeedPaintExportPanel: () => <div data-testid="speed-paint-export-panel">SpeedPaintExportPanel</div>,
}));

vi.mock('../../src/features/speed-paint/hooks/useSpeedPaintExporter', () => ({
  useSpeedPaintExporter: () => ({
    isRendering: false,
    renderProgress: 0,
    renderStatusText: '',
    outputBlob: null,
    outputUrl: null,
    error: null,
    canRender: null,
    resolvedVideoCodec: 'h264',
    resolvedContainer: 'mp4',
    checkSupport: vi.fn(),
    startRender: vi.fn(),
    handleCancel: vi.fn(),
    handleDownload: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('../../src/features/speed-paint/components/upload/ImageUpload', () => ({
  ImageUpload: () => <div data-testid="image-upload">ImageUpload</div>,
}));

vi.mock('../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
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
  SUCCESS_MAIN: '#10b981',
  SUCCESS_GLOW: '0 0 12px rgba(16, 185, 129, 0.25)',
  SUCCESS_BG_SUBTLE: 'rgba(16, 185, 129, 0.08)',
  WARNING_BG_SUBTLE: 'rgba(245, 158, 11, 0.08)',
  ERROR_BG_SUBTLE: 'rgba(239, 68, 68, 0.08)',
  WHITE_08: 'rgba(255, 255, 255, 0.08)',
  WHITE_14: 'rgba(255, 255, 255, 0.14)',
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassSurfaceSx: () => ({}),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('SpeedPaintPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    // Restaura estado padrão
    animState.job = { id: '', inputImage: '', status: 'idle', progress: 0, animation: null };
    animState.queue = [];
    animState.batchMode = 'idle';
    animState.speed = 1;
    animState.paintSpeed = 1;
    animState.animationDuration = 15;
    animState.showDrawTool = true;
    animState.canvasColor = 'white';
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
    expect(screen.getByTestId('speed-paint-player')).toBeDefined();
    expect(screen.getByTestId('speed-paint-player-controls')).toBeDefined();
    // ExportPanel está na aba "Exportar" — não visível por padrão (aba "Reprodução")
    expect(screen.queryByTestId('speed-paint-export-panel')).toBeNull();
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
});