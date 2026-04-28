import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    queue: [] as unknown[],
    batchMode: 'idle' as string,
  },
}));

vi.mock('../../src/features/speed-paint/store/animationStore', () => ({
  useAnimationStore: (selector?: (s: typeof animState) => unknown) =>
    selector ? selector(animState) : animState,
}));

vi.mock('../../src/features/speed-paint/components/batch/BatchOrchestrator', () => ({
  BatchOrchestrator: () => <div data-testid="batch-orchestrator">BatchOrchestrator</div>,
}));

vi.mock('../../src/features/speed-paint/components/batch/QueueStaging', () => ({
  QueueStaging: () => <div data-testid="queue-staging">QueueStaging</div>,
}));

vi.mock('../../src/features/speed-paint/components/canvas/AnimationPlayer', () => ({
  AnimationPlayer: () => <div data-testid="animation-player">AnimationPlayer</div>,
}));

vi.mock('../../src/features/speed-paint/components/upload/ImageUpload', () => ({
  ImageUpload: () => <div data-testid="image-upload">ImageUpload</div>,
}));

vi.mock('../../src/theme/tokens', () => ({
  APP_MAX_WIDTH: 1600,
  BRAND_GRADIENT: 'linear-gradient(135deg, #2E75B6 0%, #F7941E 100%)',
  EMPTY_WRAPPER_MAX_WIDTH: 400,
  EMPTY_WRAPPER_PADDING_MD: 24,
}));

describe('SpeedPaintPage', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    // Restaura estado padrão
    animState.queue = [];
    animState.batchMode = 'idle';
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

  it('renderiza AnimationPlayer quando batchMode não é idle', () => {
    animState.queue = [{ id: '1' }];
    animState.batchMode = 'record';

    render(<SpeedPaintPage />, { wrapper: Wrapper });
    expect(screen.getByTestId('animation-player')).toBeDefined();
  });
});
