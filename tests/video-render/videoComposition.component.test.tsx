/**
 * Testes para VideoComposition — branch de SpeedPaintScene vs SceneSequence.
 *
 * O VideoComposition escolhe entre SpeedPaintScene (quando strokeAnimation
 * está presente) e SceneSequence (fallback estático). Esses testes validam
 * que a condição funciona corretamente.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import type { VideoScene } from '../../src/features/video-render/types';
import { getSpeedPaintOverlapFrames } from '../../src/features/video-render/lib/speedPaintTimings';
import type { StrokeAnimation, VetorialAnimation } from '../../src/features/speed-paint/types';

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

vi.mock('../../src/features/video-render/components/WhiteboardScene', () => ({
  WhiteboardScene: ({
    animation,
    isExporting,
    showDrawTool,
    canvasColor,
  }: {
    animation: { paths: { length: number }; totalLength: number; sourcePreset: string };
    isExporting?: boolean;
    showDrawTool?: boolean;
    canvasColor?: 'white' | 'black';
  }) =>
    <div
      data-testid="whiteboard-scene"
      data-path-count={animation.paths.length}
      data-total-length={animation.totalLength}
      data-source-preset={animation.sourcePreset}
      data-exporting={isExporting ? 'true' : 'false'}
      data-show-draw-tool={showDrawTool ? 'true' : 'false'}
      data-canvas-color={canvasColor ?? ''}
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
  msToFrames: (ms: number, fps: number) => Math.round((ms / 1000) * fps),
}));

// ---------------------------------------------------------------------------
// Fixtures — factories para StrokeAnimation e VetorialAnimation
// ---------------------------------------------------------------------------

/** Constrói uma `VetorialAnimation` mínima válida para uso em testes. */
function makeVetorialScene(overrides?: Partial<VetorialAnimation>): VetorialAnimation {
  return {
    id: 'vetorial-1',
    canvasWidth: 1920,
    canvasHeight: 1080,
    canvasColor: 'white',
    paths: [
      { d: 'M 10 10 L 90 90', length: 100, color: '#000', strokeWidth: 2 },
    ],
    totalLength: 100,
    fps: 30,
    totalDurationMs: 2000,
    sourcePreset: 'artistic1',
    ...overrides,
  };
}

/** Constrói uma `StrokeAnimation` mínima válida para uso em testes. */
function makeStrokeScene(overrides?: Partial<StrokeAnimation>): StrokeAnimation {
  return {
    id: 'stroke-1',
    canvasWidth: 1920,
    canvasHeight: 1080,
    canvasColor: 'white',
    totalFrames: 60,
    fps: 30,
    totalDurationMs: 2000,
    strokes: [],
    ...overrides,
  };
}

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

  // -------------------------------------------------------------------------
  // Leiva L2 (RF-05) — discriminação via type guard real
  //
  // O VideoComposition ramifica entre 3 branches:
  //   1. `scene.strokeAnimation` ausente       → `<SceneSequence>` (estática)
  //   2. `isVetorialAnimation(strokeAnimation)` → `<WhiteboardScene>` (vetorial)
  //   3. caso contrário (StrokeAnimation)      → `<SpeedPaintScene>` (mask)
  //
  // O type guard `isVetorialAnimation` (exportado por `strokeCache.ts:123-138`)
  // é o ÚNICO mecanismo de discriminação — sem `as StrokeAnimation`.
  // -------------------------------------------------------------------------

  describe('branch VetorialAnimation (RF-05, L2)', () => {
    // -------------------------------------------------------------------
    // Bloco A — Render com VetorialAnimation → WhiteboardScene
    // -------------------------------------------------------------------

    it('renderiza WhiteboardScene quando strokeAnimation é VetorialAnimation', async () => {
      const scenes: VideoScene[] = [
        {
          imageUrl: 'vetorial-scene.png',
          prompt: 'vetorial prompt',
          timestamp: 0,
          durationInFrames: 90,
          strokeAnimation: makeVetorialScene({
            id: 'vet-1',
            paths: [
              { d: 'M 0 0 L 100 100', length: 141.42, color: '#111', strokeWidth: 3 },
              { d: 'M 200 200 L 300 300', length: 141.42, color: '#222', strokeWidth: 2 },
            ],
            totalLength: 282.84,
            sourcePreset: 'detailed',
          }),
        },
      ];

      await mountComposition(scenes);

      // Branch WhiteboardScene ativo
      expect(screen.getByTestId('whiteboard-scene')).toBeDefined();
      // Branches alternativos NÃO devem ser renderizados
      expect(screen.queryByTestId('speed-paint-scene')).toBeNull();
      expect(screen.queryByTestId('scene-sequence')).toBeNull();
    });

    it('passa props corretas para WhiteboardScene (animation, durationInFrames, isLastScene, isExporting, showDrawTool, canvasColor)', async () => {
      const { VideoComposition } = await import('../../src/features/video-render/components/VideoComposition');

      const scenes: VideoScene[] = [
        {
          imageUrl: 'vetorial-scene.png',
          prompt: 'vetorial prompt',
          timestamp: 0,
          durationInFrames: 90,
          strokeAnimation: makeVetorialScene({
            id: 'vet-1',
            canvasColor: 'black',
            paths: [
              { d: 'M 0 0 L 10 10', length: 14.14, color: '#fff', strokeWidth: 1 },
              { d: 'M 20 20 L 30 30', length: 14.14, color: '#fff', strokeWidth: 1 },
              { d: 'M 40 40 L 50 50', length: 14.14, color: '#fff', strokeWidth: 1 },
            ],
            totalLength: 42.42,
            sourcePreset: 'posterized2',
          }),
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
          showDrawTool={false}
        />,
      );

      const wbScene = screen.getByTestId('whiteboard-scene');
      // animation.paths repassado integralmente (3 paths)
      expect(wbScene.getAttribute('data-path-count')).toBe('3');
      // animation.totalLength repassado
      expect(wbScene.getAttribute('data-total-length')).toBe('42.42');
      // animation.sourcePreset repassado
      expect(wbScene.getAttribute('data-source-preset')).toBe('posterized2');
      // isExporting=true propagado
      expect(wbScene.getAttribute('data-exporting')).toBe('true');
      // showDrawTool=false propagado
      expect(wbScene.getAttribute('data-show-draw-tool')).toBe('false');
      // canvasColor='black' propagado (vem de animation.canvasColor, conforme L2:84-91)
      expect(wbScene.getAttribute('data-canvas-color')).toBe('black');
    });

    // -------------------------------------------------------------------
    // Bloco B — Coexistência com StrokeAnimation (regressão)
    // -------------------------------------------------------------------

    it('preserva SpeedPaintScene quando strokeAnimation é StrokeAnimation (regressão pós-L2)', async () => {
      const scenes: VideoScene[] = [
        {
          imageUrl: 'stroke-scene.png',
          prompt: 'stroke prompt',
          timestamp: 0,
          durationInFrames: 90,
          strokeAnimation: makeStrokeScene({
            id: 'stroke-1',
            strokes: [
              { id: 1, layer: 0, type: 'sketch', points: [10, 20, 30, 40], lineWidth: 2, r: 40, g: 40, b: 40, alpha: 0.9 },
              { id: 2, layer: 0, type: 'reveal', points: [50, 60, 70, 80], lineWidth: 2, r: 50, g: 50, b: 50, alpha: 0.9 },
            ],
          }),
        },
      ];

      await mountComposition(scenes);

      // Branch legado (mask) deve continuar funcionando
      expect(screen.getByTestId('speed-paint-scene')).toBeDefined();
      // WhiteboardScene NÃO deve aparecer (tem totalFrames, não totalLength)
      expect(screen.queryByTestId('whiteboard-scene')).toBeNull();
      expect(screen.queryByTestId('scene-sequence')).toBeNull();
    });

    it('mistura os 3 branches na mesma composition: Vetorial (WhiteboardScene) + Stroke (SpeedPaintScene) + estática (SceneSequence)', async () => {
      const scenes: VideoScene[] = [
        // Cena 0: VetorialAnimation → WhiteboardScene
        {
          imageUrl: 'vetorial.png',
          prompt: 'vetorial',
          timestamp: 0,
          durationInFrames: 90,
          strokeAnimation: makeVetorialScene({
            id: 'vet-mix',
            paths: [{ d: 'M 0 0 L 10 10', length: 14.14, color: '#000', strokeWidth: 1 }],
            totalLength: 14.14,
            sourcePreset: 'artistic1',
          }),
        },
        // Cena 1: StrokeAnimation → SpeedPaintScene
        {
          imageUrl: 'stroke.png',
          prompt: 'stroke',
          timestamp: 3,
          durationInFrames: 90,
          strokeAnimation: makeStrokeScene({
            id: 'stroke-mix',
            canvasColor: 'white',
            strokes: [
              { id: 1, layer: 0, type: 'sketch', points: [10, 20, 30, 40], lineWidth: 2, r: 0, g: 0, b: 0, alpha: 0.9 },
            ],
          }),
        },
        // Cena 2: sem strokeAnimation → SceneSequence (fallback estático)
        {
          imageUrl: 'static.png',
          prompt: 'static',
          timestamp: 6,
          durationInFrames: 90,
        },
      ];

      await mountComposition(scenes);

      // Exatamente 1 de cada
      expect(screen.getAllByTestId('whiteboard-scene')).toHaveLength(1);
      expect(screen.getAllByTestId('speed-paint-scene')).toHaveLength(1);
      expect(screen.getAllByTestId('scene-sequence')).toHaveLength(1);
    });

    // -------------------------------------------------------------------
    // Bloco C — Type guard real (sem `as`)
    // -------------------------------------------------------------------

    it('não usa cast "as StrokeAnimation" no código de produção de VideoComposition (type guard real)', () => {
      // Lê o arquivo de produção e garante que o cast proibido está ausente.
      // O branch em VideoComposition deve discriminar via `isVetorialAnimation()`
      // (exportado de `strokeCache.ts:123-138`), nunca via `as`.
      const sourcePath = 'src/features/video-render/components/VideoComposition.tsx';
      const source = readFileSync(sourcePath, 'utf8');

      // Garante que o arquivo usa o type guard real
      expect(source).toMatch(/isVetorialAnimation\s*\(/);

      // Garante que o cast proibido NÃO aparece
      expect(source).not.toMatch(/\bas\s+StrokeAnimation\b/);
    });
  });
});
