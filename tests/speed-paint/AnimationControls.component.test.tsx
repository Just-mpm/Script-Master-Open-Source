import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnimationControls } from '../../src/features/speed-paint/components/canvas/AnimationControls';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

// Mock do stageRef
vi.mock('../../src/features/speed-paint/lib/stageRef', () => ({
  getStageRef: vi.fn().mockReturnValue(null),
}));

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
  glassSurfaceSx: () => ({}),
}));

describe('AnimationControls', () => {
  beforeEach(() => {
    useAnimationStore.getState().resetJob();
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().setIsPlaying(false);
    useAnimationStore.getState().setProgress(0);
    useAnimationStore.getState().setSpeed(1);
    useAnimationStore.getState().setPaintSpeed(1);
    useAnimationStore.getState().setHasAutoPlayed(false);
  });

  it('mostra "Pronto" como fase inicial', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [
          { id: 0, layer: 0, type: 'sketch', points: [0, 0, 10, 10, 20, 0], lineWidth: 1, r: 40, g: 40, b: 40, alpha: 0.9 },
        ],
      },
    });
    render(<AnimationControls />, { wrapper: Wrapper });

    expect(screen.getByText('Pronto')).toBeDefined();
  });

  it('mostra "Concluído" quando progress é 1', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [],
      },
    });
    useAnimationStore.getState().setProgress(1);
    render(<AnimationControls />, { wrapper: Wrapper });

    expect(screen.getByText('Concluído')).toBeDefined();
  });

  it('mostra porcentagem de progresso', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [],
      },
    });
    useAnimationStore.getState().setProgress(0.45);
    render(<AnimationControls />, { wrapper: Wrapper });

    expect(screen.getByText('45%')).toBeDefined();
  });

  it('mostra 0% no início', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [],
      },
    });
    render(<AnimationControls />, { wrapper: Wrapper });

    expect(screen.getByText('0%')).toBeDefined();
  });

  it('botão Play/Pause alterna isPlaying', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [],
      },
    });
    render(<AnimationControls />, { wrapper: Wrapper });

    const playBtn = screen.getByLabelText('Reproduzir animação');
    expect(playBtn).toBeDefined();

    fireEvent.click(playBtn);
    expect(useAnimationStore.getState().isPlaying).toBe(true);
  });

  it('botão Reiniciar reseta progress e para animação', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [],
      },
    });
    useAnimationStore.getState().setProgress(0.7);
    useAnimationStore.getState().setIsPlaying(true);
    render(<AnimationControls />, { wrapper: Wrapper });

    const resetBtn = screen.getByLabelText('Reiniciar animação');
    fireEvent.click(resetBtn);

    expect(useAnimationStore.getState().progress).toBe(0);
    expect(useAnimationStore.getState().isPlaying).toBe(false);
  });

  it('mostra fase "Desenhando Objetos..." durante sketch com progress entre 0 e 1', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 100,
        fps: 60,
        totalDurationMs: 5000,
        revealThreshold: 0.5,
        strokes: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          layer: i < 50 ? 0 : 1,
          type: i < 50 ? 'sketch' as const : 'reveal' as const,
          points: [0, 0, 10, 10, 20, 0],
          lineWidth: 1,
          r: 40, g: 40, b: 40, alpha: 0.9,
        })),
      },
    });
    // progress=0.3 → stroke index ~30, que é sketch (layer 0)
    useAnimationStore.getState().setProgress(0.3);
    render(<AnimationControls />, { wrapper: Wrapper });

    expect(screen.getByText('Desenhando Objetos...')).toBeDefined();
  });

  it('mostra fase "Colorindo..." durante reveal', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 100,
        fps: 60,
        totalDurationMs: 5000,
        revealThreshold: 0.5,
        strokes: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          layer: i < 50 ? 0 : 1,
          type: i < 50 ? 'sketch' as const : 'reveal' as const,
          points: [0, 0, 10, 10, 20, 0],
          lineWidth: 1,
          r: 40, g: 40, b: 40, alpha: 0.9,
        })),
      },
    });
    // progress=0.7 → stroke index ~70, que é reveal (layer 1)
    useAnimationStore.getState().setProgress(0.7);
    render(<AnimationControls />, { wrapper: Wrapper });

    expect(screen.getByText('Colorindo...')).toBeDefined();
  });

  it('botão "Nova Imagem" dispara resetJob quando batchMode é idle', () => {
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [],
      },
    });
    render(<AnimationControls />, { wrapper: Wrapper });

    const newImageBtn = screen.getByText('Nova Imagem');
    fireEvent.click(newImageBtn);

    expect(useAnimationStore.getState().job.status).toBe('idle');
  });

  it('botão mostra "Sair/Cancelar" quando batchMode não é idle', () => {
    useAnimationStore.getState().setBatchMode('watch');
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [],
      },
    });
    render(<AnimationControls />, { wrapper: Wrapper });

    expect(screen.getByText('Sair/Cancelar')).toBeDefined();
  });

  it('"Sair/Cancelar" dispara clearQueue quando batchMode ativo', () => {
    useAnimationStore.getState().setQueue([
      { id: '1', dataUrl: 'data:image/png;base64,abc', filename: 'test.png', status: 'pending' },
    ]);
    useAnimationStore.getState().setBatchMode('watch');
    useAnimationStore.getState().setJob({
      status: 'completed',
      animation: {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white',
        totalFrames: 50,
        fps: 60,
        totalDurationMs: 5000,
        strokes: [],
      },
    });
    render(<AnimationControls />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText('Sair/Cancelar'));
    expect(useAnimationStore.getState().queue).toEqual([]);
    expect(useAnimationStore.getState().batchMode).toBe('idle');
  });
});
