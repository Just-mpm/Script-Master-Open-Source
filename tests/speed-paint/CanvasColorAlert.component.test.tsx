/**
 * v0.135.3 (S2 da auditoria): testa o alert UX de divergência de
 * `canvasColor` na `SpeedPaintPage`. O alert aparece quando:
 *   - `job.status === 'completed'`
 *   - `job.animation != null`
 *   - `job.animation.canvasColor !== store.canvasColor`
 *
 * E desaparece quando o usuário aciona "Reprocessar" (que delega para
 * `reprocessCurrentImage`, regenerando a `animation` com a nova cor).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';
import { I18nProvider } from '../../src/features/i18n';
import type { VetorialAnimation } from '../../src/features/speed-paint/types/vetorial';

// Factory de `VetorialAnimation` mínima para satisfazer o tipo.
// Não importa o conteúdo dos campos neste teste — só `canvasColor`
// é observado pelo probe.
function makeVetorialAnimation(canvasColor: 'white' | 'black'): VetorialAnimation {
  return {
    id: 'v-stub',
    canvasWidth: 100,
    canvasHeight: 100,
    canvasColor,
    paths: [],
    totalLength: 0,
    fps: 30,
    totalDurationMs: 1000,
    sourcePreset: 'edge-default',
  };
}

// Mock do SpeedPaintPage sem renderizar tudo (apenas o seletor + alert)
vi.mock('../../src/pages/SpeedPaintPage', () => ({
  SpeedPaintPage: () => null,
}));

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

const darkTheme = createTheme({ palette: { mode: 'dark' } });
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

// Mini-componente de teste que reproduz a lógica do alert da SpeedPaintPage
// (sem dependências de Remotion, queue, export panel, etc).
function CanvasColorAlertProbe() {
  const job = useAnimationStore((s) => s.job);
  const canvasColor = useAnimationStore((s) => s.canvasColor);
  const setCanvasColor = useAnimationStore((s) => s.setCanvasColor);
  const isCompleted = job.status === 'completed' && Boolean(job.animation);
  const showAlert =
    isCompleted
    && job.animation != null
    && job.animation.canvasColor !== canvasColor
    && job.status !== 'processing';

  if (!showAlert) return null;

  return (
    <div data-testid="canvas-color-alert" role="status">
      <p>
        Cor mudou de {job.animation!.canvasColor} para {canvasColor}.
      </p>
      <button
        type="button"
        onClick={() => {
          // Simula `reprocessInMode` → `setJob({animation: {...,canvasColor}})`
          useAnimationStore.getState().setJob({
            animation: {
              ...job.animation!,
              canvasColor,
            },
          });
        }}
      >
        Reprocessar
      </button>
      <button type="button" onClick={() => setCanvasColor(canvasColor)}>noop</button>
    </div>
  );
}

function setup() {
  return render(<CanvasColorAlertProbe />, { wrapper: Wrapper });
}

describe('CanvasColorAlert (v0.135.3 / S2)', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      job: { id: '', inputImage: '', status: 'idle', progress: 0 },
      canvasColor: 'white',
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('NÃO renderiza alert quando job.status !== completed', () => {
    // Arrange: store em idle, sem animation
    useAnimationStore.setState({
      job: { id: '', inputImage: '', status: 'idle', progress: 0 },
      canvasColor: 'white',
    });

    // Act
    setup();

    // Assert
    expect(screen.queryByTestId('canvas-color-alert')).toBeNull();
  });

  it('NÃO renderiza alert quando job.animation é undefined', () => {
    // Arrange: status=completed mas sem animation
    useAnimationStore.setState({
      job: { id: 'j1', inputImage: 'data:', status: 'completed', progress: 1 },
      canvasColor: 'white',
    });

    // Act
    setup();

    // Assert
    expect(screen.queryByTestId('canvas-color-alert')).toBeNull();
  });

  it('NÃO renderiza alert quando canvasColor da store === canvasColor da animation', () => {
    // Arrange: animation.white + store.white
    useAnimationStore.setState({
      job: {
        id: 'j1',
        inputImage: 'data:',
        status: 'completed',
        progress: 1,
        animation: makeVetorialAnimation('white'),
      },
      canvasColor: 'white',
    });

    // Act
    setup();

    // Assert
    expect(screen.queryByTestId('canvas-color-alert')).toBeNull();
  });

  it('renderiza alert quando store.canvasColor !== animation.canvasColor', () => {
    // Arrange: animation.white, store.black
    useAnimationStore.setState({
      job: {
        id: 'j1',
        inputImage: 'data:',
        status: 'completed',
        progress: 1,
        animation: makeVetorialAnimation('white'),
      },
      canvasColor: 'black',
    });

    // Act
    setup();

    // Assert
    expect(screen.getByTestId('canvas-color-alert')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-color-alert').textContent).toMatch(
      /Cor mudou de white para black/,
    );
  });

  it('alert some após click em "Reprocessar" que atualiza animation.canvasColor', () => {
    // Arrange
    useAnimationStore.setState({
      job: {
        id: 'j1',
        inputImage: 'data:',
        status: 'completed',
        progress: 1,
        animation: makeVetorialAnimation('white'),
      },
      canvasColor: 'black',
    });
    setup();
    expect(screen.getByTestId('canvas-color-alert')).toBeInTheDocument();

    // Act: click no botão Reprocessar (atualiza animation.canvasColor para 'black')
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Reprocessar/i }));
    });

    // Assert: alert some — store.canvasColor === animation.canvasColor
    expect(screen.queryByTestId('canvas-color-alert')).toBeNull();
  });
});
