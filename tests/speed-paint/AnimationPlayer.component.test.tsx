import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimationPlayer } from '../../src/features/speed-paint/components/canvas/AnimationPlayer';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

// Mock do StrokeRenderer (depende do Konva que não funciona no jsdom)
vi.mock('../../src/features/speed-paint/components/canvas/StrokeRenderer', () => ({
  StrokeRenderer: () => <div data-testid="stroke-renderer">StrokeRenderer</div>,
}));

// Mock do AnimationControls
vi.mock('../../src/features/speed-paint/components/canvas/AnimationControls', () => ({
  AnimationControls: () => <div data-testid="animation-controls">AnimationControls</div>,
}));

describe('AnimationPlayer', () => {
  beforeEach(() => {
    useAnimationStore.getState().resetJob();
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().setIsPlaying(false);
    useAnimationStore.getState().setProgress(0);
    useAnimationStore.getState().setHasAutoPlayed(false);
  });

  it('retorna null quando job status é idle', () => {
    const { container } = render(<AnimationPlayer />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('retorna null quando job status é failed', () => {
    useAnimationStore.getState().setJob({ status: 'failed' });
    const { container } = render(<AnimationPlayer />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('mostra estado de processamento com spinner', () => {
    useAnimationStore.getState().setJob({ status: 'processing', progress: 0.35 });
    render(<AnimationPlayer />, { wrapper: Wrapper });

    expect(screen.getByText(/Gerando Animação/)).toBeDefined();
  });

  it('mostra porcentagem de progresso durante processamento', () => {
    useAnimationStore.getState().setJob({ status: 'processing', progress: 0.75 });
    render(<AnimationPlayer />, { wrapper: Wrapper });

    expect(screen.getByText('Gerando Animação (75%)...')).toBeDefined();
  });

  it('tem role="status" para screen readers durante processamento', () => {
    useAnimationStore.getState().setJob({ status: 'processing', progress: 0.5 });
    render(<AnimationPlayer />, { wrapper: Wrapper });

    const status = screen.getByRole('status');
    expect(status).toBeDefined();
  });

  it('mostra 0% quando progresso é 0 durante processamento', () => {
    useAnimationStore.getState().setJob({ status: 'processing', progress: 0 });
    render(<AnimationPlayer />, { wrapper: Wrapper });

    expect(screen.getByText('Gerando Animação (0%)...')).toBeDefined();
  });

  it('mostra 100% quando progresso é 1 durante processamento', () => {
    useAnimationStore.getState().setJob({ status: 'processing', progress: 1 });
    render(<AnimationPlayer />, { wrapper: Wrapper });

    expect(screen.getByText('Gerando Animação (100%)...')).toBeDefined();
  });

  it('renderiza StrokeRenderer e AnimationControls quando status é completed', () => {
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

    render(<AnimationPlayer />, { wrapper: Wrapper });

    expect(screen.getByTestId('stroke-renderer')).toBeDefined();
    expect(screen.getByTestId('animation-controls')).toBeDefined();
  });

  it('retorna null quando status é idle (default)', () => {
    const { container } = render(<AnimationPlayer />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });
});
