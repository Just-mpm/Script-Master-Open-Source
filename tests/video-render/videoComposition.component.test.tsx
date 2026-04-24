/**
 * Testes para VideoComposition — branch de SpeedPaintScene vs SceneSequence.
 *
 * O VideoComposition escolhe entre SpeedPaintScene (quando strokeAnimation
 * está presente) e SceneSequence (fallback estático). Esses testes validam
 * que a condição funciona corretamente.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { VideoScene } from '../../src/features/video-render/types';

// ---------------------------------------------------------------------------
// Mocks — Remotion
// ---------------------------------------------------------------------------

vi.mock('remotion', () => ({
  AbsoluteFill: ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) =>
    <div data-testid="absolute-fill" style={style}>{children}</div>,
  Sequence: ({ children, from, durationInFrames }: { children?: React.ReactNode; from?: number; durationInFrames?: number }) =>
    <div data-testid="sequence" data-from={from} data-duration={durationInFrames}>{children}</div>,
  useCurrentFrame: () => 0,
  useVideoConfig: () => ({ fps: 30 }),
  spring: () => 1,
}));

vi.mock('@remotion/media', () => ({
  Audio: ({ src }: { src: string }) => <audio data-testid="audio" src={src} />,
}));

// ---------------------------------------------------------------------------
// Mocks — componentes internos
// ---------------------------------------------------------------------------

vi.mock('../../src/features/video-render/components/SpeedPaintScene', () => ({
  SpeedPaintScene: ({ animation }: { animation: { strokes: { length: number } } }) =>
    <div data-testid="speed-paint-scene" data-stroke-count={animation.strokes.length} />,
}));

vi.mock('../../src/features/video-render/components/SceneSequence', () => ({
  SceneSequence: ({ imageUrl }: { imageUrl: string }) =>
    <div data-testid="scene-sequence" data-url={imageUrl} />,
}));

vi.mock('../../src/features/video-render/components/SubtitleOverlay', () => ({
  SubtitleOverlay: () => <div data-testid="subtitle-overlay" />,
}));

vi.mock('../../src/features/video-render/components/WaveformOverlay', () => ({
  WaveformOverlay: () => <div data-testid="waveform-overlay" />,
}));

vi.mock('../../src/features/video-render/lib/videoUtils', () => ({
  msToFrames: (ms: number, _fps: number) => Math.round(ms / 33.33),
}));

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('VideoComposition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function mountComposition(scenes: VideoScene[], audioUrl = 'audio.wav') {
    const { VideoComposition } = await import('../../src/features/video-render/components/VideoComposition');
    return render(
      <VideoComposition
        scenes={scenes}
        audioUrl={audioUrl}
        fps={30}
        captions={undefined}
        subtitleStyle={undefined}
        isExporting={false}
      />,
    );
  }

  it('renderiza SceneSequence quando strokeAnimation está ausente (fallback estático)', async () => {
    const scenes: VideoScene[] = [
      { imageUrl: 'scene1.png', prompt: 'prompt1', timestamp: 0, durationInFrames: 90 },
    ];

    await mountComposition(scenes);

    expect(screen.getByTestId('scene-sequence')).toBeDefined();
    expect(screen.queryByTestId('speed-paint-scene')).toBeNull();
  });

  it('renderiza SpeedPaintScene quando strokeAnimation está presente', async () => {
    const scenes: VideoScene[] = [
      {
        imageUrl: 'scene1.png',
        prompt: 'prompt1',
        timestamp: 0,
        durationInFrames: 90,
        strokeAnimation: {
          id: 'anim-1',
          canvasWidth: 1920,
          canvasHeight: 1080,
          canvasColor: 'white',
          totalFrames: 60,
          fps: 30,
          totalDurationMs: 2000,
          strokes: [
            { id: 1, layer: 0, type: 'sketch', points: [10, 20, 30, 40], lineWidth: 2, r: 40, g: 40, b: 40, alpha: 0.9 },
          ],
        },
      },
    ];

    await mountComposition(scenes);

    expect(screen.getByTestId('speed-paint-scene')).toBeDefined();
    expect(screen.queryByTestId('scene-sequence')).toBeNull();
  });

  it('mistura cenas animadas e estáticas na mesma composition', async () => {
    const scenes: VideoScene[] = [
      {
        imageUrl: 'scene1.png',
        prompt: 'prompt1',
        timestamp: 0,
        durationInFrames: 90,
        strokeAnimation: {
          id: 'anim-1',
          canvasWidth: 1920,
          canvasHeight: 1080,
          canvasColor: 'white',
          totalFrames: 60,
          fps: 30,
          totalDurationMs: 2000,
          strokes: [],
        },
      },
      { imageUrl: 'scene2.png', prompt: 'prompt2', timestamp: 3, durationInFrames: 90 },
    ];

    await mountComposition(scenes);

    // Cena 1 → SpeedPaintScene
    expect(screen.getByTestId('speed-paint-scene')).toBeDefined();
    // Cena 2 → SceneSequence (fallback)
    expect(screen.getByTestId('scene-sequence')).toBeDefined();
  });

  it('renderiza áudio master quando audioUrl está presente', async () => {
    const scenes: VideoScene[] = [
      { imageUrl: 'scene1.png', prompt: 'prompt1', timestamp: 0, durationInFrames: 90 },
    ];

    await mountComposition(scenes, 'audio.mp3');

    const audio = screen.getByTestId('audio');
    expect(audio.getAttribute('src')).toBe('audio.mp3');
  });

  it('não renderiza áudio quando audioUrl está vazio', async () => {
    const scenes: VideoScene[] = [
      { imageUrl: 'scene1.png', prompt: 'prompt1', timestamp: 0, durationInFrames: 90 },
    ];

    await mountComposition(scenes, '');

    expect(screen.queryByTestId('audio')).toBeNull();
  });

  it('passa props corretas para SpeedPaintScene (durationInFrames, fadeFrames, isLastScene)', async () => {
    const scenes: VideoScene[] = [
      {
        imageUrl: 'scene1.png',
        prompt: 'prompt1',
        timestamp: 0,
        durationInFrames: 90,
        strokeAnimation: {
          id: 'anim-1',
          canvasWidth: 1920,
          canvasHeight: 1080,
          canvasColor: 'white',
          totalFrames: 60,
          fps: 30,
          totalDurationMs: 2000,
          strokes: [],
        },
      },
    ];

    await mountComposition(scenes);

    const spScene = screen.getByTestId('speed-paint-scene');
    // Deve ter recebido a animation com strokes
    expect(spScene.getAttribute('data-stroke-count')).toBe('0');
  });

  it('passa isLastScene true para a última cena (SpeedPaint)', async () => {
    const scenes: VideoScene[] = [
      { imageUrl: 'scene1.png', prompt: 'prompt1', timestamp: 0, durationInFrames: 90 },
      {
        imageUrl: 'scene2.png',
        prompt: 'prompt2',
        timestamp: 3,
        durationInFrames: 90,
        strokeAnimation: {
          id: 'anim-2',
          canvasWidth: 1920,
          canvasHeight: 1080,
          canvasColor: 'white',
          totalFrames: 60,
          fps: 30,
          totalDurationMs: 2000,
          strokes: [],
        },
      },
    ];

    await mountComposition(scenes);

    // A última cena (index 1) tem strokeAnimation → SpeedPaintScene
    const spScenes = screen.getAllByTestId('speed-paint-scene');
    expect(spScenes).toHaveLength(1);
  });
});
