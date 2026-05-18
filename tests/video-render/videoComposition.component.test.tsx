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
import { getSpeedPaintOverlapFrames } from '../../src/features/video-render/lib/speedPaintTimings';

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
  SpeedPaintScene: ({
    animation,
    isExporting,
    drawSpeed,
    paintSpeed,
  }: {
    animation: { strokes: { length: number } };
    isExporting?: boolean;
    drawSpeed?: number;
    paintSpeed?: number;
  }) =>
    <div
      data-testid="speed-paint-scene"
      data-stroke-count={animation.strokes.length}
      data-exporting={isExporting ? 'true' : 'false'}
      data-draw-speed={drawSpeed ?? ''}
      data-paint-speed={paintSpeed ?? ''}
    />,
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

  it('usa o mesmo overlap compartilhado para cenas speed paint no /video', async () => {
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

    const sequences = screen.getAllByTestId('sequence');
    const expectedOverlap = getSpeedPaintOverlapFrames('default', 30);

    expect(sequences[0]?.getAttribute('data-from')).toBe('0');
    expect(sequences[0]?.getAttribute('data-duration')).toBe(String(90 + expectedOverlap));
    expect(sequences[1]?.getAttribute('data-from')).toBe(String(90 - expectedOverlap));
    expect(sequences[1]?.getAttribute('data-duration')).toBe(String(90 + expectedOverlap));
  });

  describe('speedPaintMultipliers — propagação para SpeedPaintScene', () => {
    it('passa isExporting=true para SpeedPaintScene quando isExporting é true', async () => {
      const { VideoComposition } = await import('../../src/features/video-render/components/VideoComposition');

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

      render(
        <VideoComposition
          scenes={scenes}
          audioUrl="audio.wav"
          fps={30}
          captions={undefined}
          subtitleStyle={undefined}
          isExporting={true}
          speedPaintMultipliers={{ sketch: 2.0, reveal: 0.5 }}
        />,
      );

      const spScene = screen.getByTestId('speed-paint-scene');
      expect(spScene.getAttribute('data-exporting')).toBe('true');
      expect(spScene.getAttribute('data-draw-speed')).toBe('2');
      expect(spScene.getAttribute('data-paint-speed')).toBe('0.5');
    });

    it('passa isExporting=false para SpeedPaintScene quando isExporting é false', async () => {
      const { VideoComposition } = await import('../../src/features/video-render/components/VideoComposition');

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

      render(
        <VideoComposition
          scenes={scenes}
          audioUrl="audio.wav"
          fps={30}
          captions={undefined}
          subtitleStyle={undefined}
          isExporting={false}
          speedPaintMultipliers={{ sketch: 1.5, reveal: 1.0 }}
        />,
      );

      const spScene = screen.getByTestId('speed-paint-scene');
      expect(spScene.getAttribute('data-exporting')).toBe('false');
      expect(spScene.getAttribute('data-draw-speed')).toBe('1.5');
      expect(spScene.getAttribute('data-paint-speed')).toBe('1');
    });

    it('usa speedPaintSpeed (global) quando speedPaintMultipliers não é fornecido', async () => {
      const { VideoComposition } = await import('../../src/features/video-render/components/VideoComposition');

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

      render(
        <VideoComposition
          scenes={scenes}
          audioUrl="audio.wav"
          fps={30}
          captions={undefined}
          subtitleStyle={undefined}
          isExporting={false}
          speedPaintSpeed="fast"
          // sem speedPaintMultipliers → SpeedPaintScene recebe speedMultiplier numérico
        />,
      );

      const spScene = screen.getByTestId('speed-paint-scene');
      // drawSpeed e paintSpeed vazios (undefined) → usando speedMultiplier global
      expect(spScene.getAttribute('data-draw-speed')).toBe('');
      expect(spScene.getAttribute('data-paint-speed')).toBe('');
    });
  });
});
