/**
 * Testes do `SpeedPaintPlayer` — discriminação entre modo mask e modo
 * vetorial (GAP-01 da reauditoria F5.5).
 *
 * Valida que o wrapper do `@remotion/player`:
 * (1) Renderiza `SpeedPaintComposition` quando recebe `StrokeAnimation`
 *     (modo `'mask'` — comportamento legado preservado).
 * (2) Renderiza `WhiteboardComposition` quando recebe `VetorialAnimation`
 *     (modo `'vetorial'` — corrige o preview que quebrava).
 * (3) Faz narrowing real via type guard (`'paths' in animation`) — sem
 *     `as` bypass.
 * (4) Em modo vetorial, NÃO exige `imageSource` (campo ignorado pela
 *     Composição whiteboard).
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { StrokeAnimation, VetorialAnimation } from '../../src/features/speed-paint/types';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

// ─── Estado mutável para inspeção dos mocks ──────────────────────────

const { playerState } = vi.hoisted(() => ({
  playerState: {
    componentName: null as string | null,
    inputProps: null as Record<string, unknown> | null,
  },
}));

// ─── Mocks ───────────────────────────────────────────────────────────

// Mock do @remotion/player: em vez de montar o Player real (que precisa
// de DOM canvas + contexto de preview que jsdom não tem), capturamos o
// `component` e `inputProps` em `playerState` para asserções.
vi.mock('@remotion/player', () => ({
  Player: ({
    component: Component,
    inputProps,
  }: {
    component: { displayName?: string; name?: string } | unknown;
    inputProps: Record<string, unknown>;
  }) => {
    const name =
      (Component as { displayName?: string; name?: string } | null)?.displayName ??
      (Component as { displayName?: string; name?: string } | null)?.name ??
      'Unknown';
    playerState.componentName = name;
    playerState.inputProps = inputProps;
    return (
      <div data-testid="remotion-player" data-component={name}>
        Remotion Player
      </div>
    );
  },
}));

vi.mock('../../src/features/speed-paint/components/SpeedPaintComposition', () => ({
  SpeedPaintComposition: Object.assign(
    function SpeedPaintComposition() {
      return <div data-testid="speed-paint-composition" />;
    },
    { displayName: 'SpeedPaintComposition' },
  ),
}));

vi.mock('../../src/features/speed-paint/components/WhiteboardComposition', () => ({
  WhiteboardComposition: Object.assign(
    function WhiteboardComposition() {
      return <div data-testid="whiteboard-composition" />;
    },
    { displayName: 'WhiteboardComposition' },
  ),
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

// ─── Fixtures ────────────────────────────────────────────────────────

function createStrokeAnimation(): StrokeAnimation {
  return {
    id: 'stroke-anim-1',
    canvasWidth: 1920,
    canvasHeight: 1080,
    canvasColor: 'white',
    totalFrames: 60,
    fps: 30,
    totalDurationMs: 2000,
    revealThreshold: 0.8,
    strokes: [],
  };
}

function createVetorialAnimation(): VetorialAnimation {
  return {
    id: 'vetorial-anim-1',
    canvasWidth: 1920,
    canvasHeight: 1080,
    canvasColor: 'white',
    paths: [
      { d: 'M 10 10 L 90 90', length: 113, color: '#000', strokeWidth: 2 },
    ],
    totalLength: 113,
    fps: 60,
    totalDurationMs: 4000,
    sourcePreset: 'default',
  };
}

// ─── Testes ──────────────────────────────────────────────────────────

describe('SpeedPaintPlayer', () => {
  beforeEach(() => {
    playerState.componentName = null;
    playerState.inputProps = null;
  });

  it('renderiza SpeedPaintComposition quando recebe StrokeAnimation (modo mask)', async () => {
    const { SpeedPaintPlayer } = await import(
      '../../src/features/speed-paint/components/SpeedPaintPlayer'
    );

    render(
      <SpeedPaintPlayer
        animation={createStrokeAnimation()}
        imageSource="data:image/png;base64,abc"
        animationDuration={5}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('remotion-player')).toBeDefined();
    expect(playerState.componentName).toBe('SpeedPaintComposition');
    // inputProps no modo mask inclui `imageSource` + `timingMode`
    expect(playerState.inputProps).toMatchObject({
      imageSource: 'data:image/png;base64,abc',
      timingMode: 'duration-based',
    });
  });

  it('renderiza WhiteboardComposition quando recebe VetorialAnimation (modo vetorial)', async () => {
    const { SpeedPaintPlayer } = await import(
      '../../src/features/speed-paint/components/SpeedPaintPlayer'
    );

    render(
      // `imageSource` ausente é proposital — modo vetorial não precisa.
      <SpeedPaintPlayer animation={createVetorialAnimation()} animationDuration={5} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('remotion-player')).toBeDefined();
    expect(playerState.componentName).toBe('WhiteboardComposition');
    // inputProps no modo vetorial NÃO inclui `imageSource` nem `timingMode`
    expect(playerState.inputProps).not.toHaveProperty('imageSource');
    expect(playerState.inputProps).not.toHaveProperty('timingMode');
    // mas inclui `animation` com a `VetorialAnimation` discriminada
    expect(playerState.inputProps).toMatchObject({
      animation: expect.objectContaining({
        paths: expect.any(Array),
        totalLength: 113,
        sourcePreset: 'default',
      }),
    });
  });

  it('discrimina via type guard (sem as bypass) — `paths` decide o branch', async () => {
    const { SpeedPaintPlayer } = await import(
      '../../src/features/speed-paint/components/SpeedPaintPlayer'
    );

    // O narrowing acontece dentro de `SpeedPaintPlayer` via
    // `isVetorialAnimation()`. Aqui validamos que a função type guard
    // retorna o esperado para cada tipo, refletindo a lógica do componente.
    const strokeAnim = createStrokeAnimation();
    const vetorialAnim = createVetorialAnimation();

    // Type guard manual — espelha o que o componente faz.
    const isVetorial = (a: StrokeAnimation | VetorialAnimation): boolean => 'paths' in a;

    expect(isVetorial(strokeAnim)).toBe(false);
    expect(isVetorial(vetorialAnim)).toBe(true);

    // Validação adicional: renderizar cada tipo produz o componente certo.
    const { rerender } = render(
      <SpeedPaintPlayer animation={strokeAnim} animationDuration={5} />,
      { wrapper: Wrapper },
    );
    expect(playerState.componentName).toBe('SpeedPaintComposition');

    rerender(<SpeedPaintPlayer animation={vetorialAnim} animationDuration={5} />);
    expect(playerState.componentName).toBe('WhiteboardComposition');
  });

  it('modo mask aceita `imageSource` undefined (fallback para string vazia)', async () => {
    const { SpeedPaintPlayer } = await import(
      '../../src/features/speed-paint/components/SpeedPaintPlayer'
    );

    render(
      // imageSource omitido propositalmente — modo mask usa fallback.
      <SpeedPaintPlayer animation={createStrokeAnimation()} animationDuration={5} />,
      { wrapper: Wrapper },
    );

    expect(playerState.componentName).toBe('SpeedPaintComposition');
    // Fallback para string vazia preserva o comportamento legado.
    expect(playerState.inputProps).toMatchObject({
      imageSource: '',
    });
  });
});
