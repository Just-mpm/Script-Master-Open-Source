import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrokeAnimation } from '../../src/features/speed-paint/types';
import type { SpeedPaintFrameOptions } from '../../src/features/video-render/lib/speedPaintRenderer';

const testState = vi.hoisted(() => ({
  calls: [] as string[],
  mockCancelRender: vi.fn<(error: Error) => void>(),
  mockContinueRender: vi.fn<(handle: string) => void>(() => {
    testState.calls.push('continue');
  }),
  mockCreateBufferCanvas: vi.fn<(animation: StrokeAnimation) => HTMLCanvasElement>(() => document.createElement('canvas')),
  mockDelayRender: vi.fn<(label: string) => string>(() => 'speed-paint-handle'),
  mockGetVisibleStrokeCount: vi.fn<(
    animation: StrokeAnimation,
    progress: number,
    speedMultiplier?: SpeedPaintFrameOptions['speedMultiplier'],
  ) => number>(() => 0),
  mockLoadImageElement: vi.fn<(src: string) => Promise<HTMLImageElement>>(async () => document.createElement('img')),
  mockRenderSpeedPaintFrame: vi.fn<(
    ctx: CanvasRenderingContext2D,
    buffer: HTMLCanvasElement,
    options: SpeedPaintFrameOptions,
  ) => void>(() => {
    testState.calls.push('draw');
  }),
}));

vi.mock('remotion', () => ({
  AbsoluteFill: ({ children, style }: React.PropsWithChildren<{ style?: React.CSSProperties }>) => (
    <div data-testid="absolute-fill" style={style}>{children}</div>
  ),
  cancelRender: (error: Error) => testState.mockCancelRender(error),
  continueRender: (handle: string) => testState.mockContinueRender(handle),
  delayRender: (label: string) => testState.mockDelayRender(label),
  interpolate: vi.fn((value: number, inputRange: number[], outputRange: number[]) => {
    const [inputStart, inputEnd] = [inputRange[0], inputRange[inputRange.length - 1]];
    const [outputStart, outputEnd] = [outputRange[0], outputRange[outputRange.length - 1]];
    if (inputEnd === inputStart) return outputStart;
    const clamped = Math.max(inputStart, Math.min(inputEnd, value));
    const progress = (clamped - inputStart) / (inputEnd - inputStart);
    return outputStart + progress * (outputEnd - outputStart);
  }),
  useCurrentFrame: () => 30,
  useVideoConfig: () => ({
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 90,
    id: 'speed-paint-test',
  }),
}));

vi.mock('../../src/features/video-render/lib/speedPaintRenderer', () => ({
  createBufferCanvas: (animation: StrokeAnimation) => testState.mockCreateBufferCanvas(animation),
  getVisibleStrokeCount: (
    animation: StrokeAnimation,
    progress: number,
    speedMultiplier?: SpeedPaintFrameOptions['speedMultiplier'],
  ) => testState.mockGetVisibleStrokeCount(animation, progress, speedMultiplier),
  loadImageElement: (src: string) => testState.mockLoadImageElement(src),
  renderSpeedPaintFrame: (
    ctx: CanvasRenderingContext2D,
    buffer: HTMLCanvasElement,
    options: SpeedPaintFrameOptions,
  ) => testState.mockRenderSpeedPaintFrame(ctx, buffer, options),
}));

function createAnimation(): StrokeAnimation {
  return {
    id: 'animation-1',
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

describe('SpeedPaintScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.calls = [];

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as CanvasRenderingContext2D,
    );
  });

  it('desenha o primeiro frame antes de liberar a renderização do Remotion', async () => {
    const { SpeedPaintScene } = await import('../../src/features/video-render/components/SpeedPaintScene');

    render(
      <SpeedPaintScene
        animation={createAnimation()}
        imageSource="data:image/png;base64,test"
        durationInFrames={90}
        isExporting
      />,
    );

    await waitFor(() => {
      expect(testState.mockRenderSpeedPaintFrame).toHaveBeenCalledTimes(1);
      expect(testState.mockContinueRender).toHaveBeenCalledWith('speed-paint-handle');
    });

    expect(testState.calls).toEqual(['draw', 'continue']);
  });
});
