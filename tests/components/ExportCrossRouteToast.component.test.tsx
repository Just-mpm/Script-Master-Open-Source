/**
 * Testes do componente ExportCrossRouteToast (M6).
 *
 * Valida que:
 * - Aparece em `/app/assistente` com render ativo
 * - NÃO aparece em `/app/video` nem em `/app/pintura-rapida` (lá já tem painel)
 * - Mostra botões corretos para cada estado (rendering / completed / failed)
 * - Mostra mensagem de erro no estado `failed`
 * - Não renderiza nada quando idle (Snackbar fechado)
 *
 * @see ExportCrossRouteToast contract — `docs/plan/video-render-survive-navigation-architecture.md §3 M6`
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExportCrossRouteToast } from '../../src/components/app/ExportCrossRouteToast';

// ─── Estado mockado dos controllers ────────────────────────────
// Declarado no escopo do módulo para que as factories de `vi.mock`
// (hoisted) possam fechá-lo e os testes possam mutá-lo entre cenários.

type RenderStatus =
  | 'idle'
  | 'preparing'
  | 'rendering'
  | 'completed'
  | 'cancelled'
  | 'failed';

interface MockVideoState {
  isRendering: boolean;
  status: RenderStatus;
  renderProgress: number;
  renderStatusText: string;
  outputUrl: string | null;
  outputBlob: Blob | null;
  error: string | null;
  codec: string;
  container: string;
  speedPaintWarnings: string[];
}

interface MockSpeedPaintState {
  isRendering: boolean;
  status: RenderStatus;
  renderProgress: number;
  renderStatusText: string;
  error: string | null;
}

const mockVideoState: MockVideoState = {
  isRendering: false,
  status: 'idle',
  renderProgress: 0,
  renderStatusText: '',
  outputUrl: null,
  outputBlob: null,
  error: null,
  codec: 'h264',
  container: 'mp4',
  speedPaintWarnings: [],
};

const mockSpeedPaintState: MockSpeedPaintState = {
  isRendering: false,
  status: 'idle',
  renderProgress: 0,
  renderStatusText: '',
  error: null,
};

// ─── Mocks de módulos ───────────────────────────────────────────

vi.mock('zustand', () => ({
  // useStore aplicado sobre controllers Zustand vanilla.
  // O componente usa `useStore(ctrl, (s) => s.field)` com seletores
  // primitivos — basta invocar o seletor sobre o estado atual.
  useStore: <T,>(store: { getState: () => T }, selector: (state: T) => unknown): unknown =>
    selector(store.getState()),
}));

vi.mock('../../src/features/video-render/store/videoRenderController', () => ({
  useVideoRenderController: {
    getState: () => mockVideoState,
  },
  getCurrentExportFileName: () => 'test-video',
}));

vi.mock('../../src/features/speed-paint/store/speedPaintRenderController', () => ({
  useSpeedPaintRenderController: {
    getState: () => mockSpeedPaintState,
  },
}));

vi.mock('../../src/lib/download', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('../../src/lib/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}));

vi.mock('../../src/features/i18n', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'exportCrossRoute.renderingTitle': 'Renderizando vídeo',
        'exportCrossRoute.completedTitle': 'Vídeo pronto!',
        'exportCrossRoute.failedTitle': 'Falha na exportação',
        'exportCrossRoute.actionViewVideo': 'Ver Vídeo',
        'exportCrossRoute.actionCancel': 'Cancelar',
        'exportCrossRoute.actionDownload': 'Baixar',
        'exportCrossRoute.actionClose': 'Fechar',
        'exportCrossRoute.actionSeeDetails': 'Ver detalhes',
        'common.error': 'Erro',
      };
      return map[key] ?? key;
    },
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────

function renderAtPath(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ExportCrossRouteToast />
    </MemoryRouter>,
  );
}

function resetMocks(): void {
  mockVideoState.isRendering = false;
  mockVideoState.status = 'idle';
  mockVideoState.renderProgress = 0;
  mockVideoState.renderStatusText = '';
  mockVideoState.outputUrl = null;
  mockVideoState.outputBlob = null;
  mockVideoState.error = null;
  mockSpeedPaintState.isRendering = false;
  mockSpeedPaintState.status = 'idle';
  mockSpeedPaintState.renderProgress = 0;
  mockSpeedPaintState.renderStatusText = '';
  mockSpeedPaintState.error = null;
}

// ─── Testes ─────────────────────────────────────────────────────

describe('ExportCrossRouteToast (M6)', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('aparece em /app/assistente com render ativo', () => {
    mockVideoState.isRendering = true;
    mockVideoState.status = 'rendering';
    mockVideoState.renderProgress = 45;
    mockVideoState.renderStatusText = 'Renderizando... 45%';

    renderAtPath('/app/assistente');

    // Alert do MUI recebe role="alert" via slotProps
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Renderizando vídeo')).toBeInTheDocument();
  });

  it('mostra estado rendering com botões Ver Vídeo e Cancelar', () => {
    mockVideoState.isRendering = true;
    mockVideoState.status = 'rendering';
    mockVideoState.renderProgress = 30;
    mockVideoState.renderStatusText = 'Renderizando... 30%';

    renderAtPath('/app/assistente');

    expect(screen.getByText('Renderizando vídeo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver V.deo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('NÃO aparece em /app/video (lá o painel já mostra)', () => {
    mockVideoState.isRendering = true;
    mockVideoState.status = 'rendering';
    mockVideoState.renderProgress = 45;

    renderAtPath('/app/video');

    // Em /app/video, isVideoRoute=true faz showInThisRoute=false.
    // Com toastKind='rendering', isOpen=false → Snackbar fechado, sem Alert.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar/i })).toBeNull();
  });

  it('NÃO aparece em /app/pintura-rapida (lá o painel já mostra)', () => {
    mockSpeedPaintState.isRendering = true;
    mockSpeedPaintState.status = 'rendering';
    mockSpeedPaintState.renderProgress = 60;

    renderAtPath('/app/pintura-rapida');

    // Em /app/pintura-rapida, isSpeedPaintPage=true faz showInThisRoute=false.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar/i })).toBeNull();
  });

  it('mostra estado completed com botões Ver Vídeo, Baixar e Fechar', () => {
    mockVideoState.status = 'completed';
    mockVideoState.outputBlob = new Blob(['fake'], { type: 'video/mp4' });
    mockVideoState.outputUrl = 'blob:http://localhost/fake-url';

    renderAtPath('/app/assistente');

    expect(screen.getByText('Vídeo pronto!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver V.deo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Baixar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fechar/i })).toBeInTheDocument();
  });

  it('mostra estado failed com mensagem de erro e botão Ver detalhes', () => {
    mockVideoState.status = 'failed';
    mockVideoState.error = 'Codec não suportado';

    renderAtPath('/app/assistente');

    // O título e a mensagem de erro são concatenados no mesmo Typography
    expect(screen.getByText(/Falha na exporta..o/)).toBeInTheDocument();
    expect(screen.getByText(/Codec n.o suportado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver detalhes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fechar/i })).toBeInTheDocument();
  });

  it('não renderiza nada quando status é idle e isRendering é false', () => {
    // Estados default (idle + false em ambos os controllers)
    renderAtPath('/app/assistente');

    // Snackbar com open={false} — sem Alert visível, sem botões
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Baixar/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ver detalhes/i })).toBeNull();
  });
});
