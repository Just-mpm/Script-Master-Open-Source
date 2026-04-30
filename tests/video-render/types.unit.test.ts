import { describe, it, expect } from 'vitest';
import type { VideoScene, VideoExportQuality, SpeedPaintSpeed, SpeedPaintMultipliers, VideoCompositionProps } from '../../src/features/video-render/types';
import { DEFAULT_SUBTITLE_STYLE, SPEED_PAINT_MULTIPLIERS, DEFAULT_SPEED_PAINT_MULTIPLIERS } from '../../src/features/video-render/types';

describe('video-render types', () => {
  describe('VideoScene', () => {
    it('aceita strokeAnimation opcional sem quebrar tipo', () => {
      const sceneWithoutAnimation: VideoScene = {
        imageUrl: 'test.png',
        prompt: 'test',
        timestamp: 0,
        durationInFrames: 90,
        // strokeAnimation omitido — opcional
      };
      expect(sceneWithoutAnimation.strokeAnimation).toBeUndefined();
    });

    it('aceita strokeAnimation presente no tipo', () => {
      const sceneWithAnimation: VideoScene = {
        imageUrl: 'test.png',
        prompt: 'test',
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
      };
      expect(sceneWithAnimation.strokeAnimation).toBeDefined();
      expect(sceneWithAnimation.strokeAnimation?.canvasWidth).toBe(1920);
    });

    it('aceita legenda opcional (subtitle)', () => {
      const sceneWithSubtitle: VideoScene = {
        imageUrl: 'test.png',
        prompt: 'test',
        timestamp: 0,
        durationInFrames: 90,
        subtitle: 'Texto da legenda',
      };
      expect(sceneWithSubtitle.subtitle).toBe('Texto da legenda');
    });
  });

  describe('VideoExportQuality', () => {
    it('contém apenas valores válidos', () => {
      const qualities: VideoExportQuality[] = ['720p', '1080p', '1440p', '4k'];
      expect(qualities).toHaveLength(4);
    });
  });

  describe('SpeedPaintSpeed', () => {
    it('contém apenas valores válidos', () => {
      const speeds: SpeedPaintSpeed[] = ['slow', 'normal', 'fast'];
      expect(speeds).toHaveLength(3);
    });
  });

  describe('SPEED_PAINT_MULTIPLIERS', () => {
    it('possui multiplicadores imutáveis (as const)', () => {
      // as const garante tipos literais, mas Object.freeze é necessário para congelar em runtime
      expect(SPEED_PAINT_MULTIPLIERS.slow).toBe(0.5);
      expect(SPEED_PAINT_MULTIPLIERS.normal).toBe(1.0);
      expect(SPEED_PAINT_MULTIPLIERS.fast).toBe(1.5);
    });
  });

  describe('SpeedPaintMultipliers', () => {
    it('aceita valores customizados para sketch e reveal', () => {
      const multipliers: SpeedPaintMultipliers = { sketch: 2.0, reveal: 0.5 };
      expect(multipliers.sketch).toBe(2.0);
      expect(multipliers.reveal).toBe(0.5);
    });

    it('aceita valores no limite mínimo (0.25)', () => {
      const multipliers: SpeedPaintMultipliers = { sketch: 0.25, reveal: 0.25 };
      expect(multipliers.sketch).toBe(0.25);
      expect(multipliers.reveal).toBe(0.25);
    });

    it('aceita valores no limite máximo (4.0)', () => {
      const multipliers: SpeedPaintMultipliers = { sketch: 4.0, reveal: 4.0 };
      expect(multipliers.sketch).toBe(4.0);
      expect(multipliers.reveal).toBe(4.0);
    });

    it('aceita multiplicadores assimétricos', () => {
      const multipliers: SpeedPaintMultipliers = { sketch: 0.5, reveal: 3.0 };
      expect(multipliers.sketch).toBe(0.5);
      expect(multipliers.reveal).toBe(3.0);
    });
  });

  describe('DEFAULT_SPEED_PAINT_MULTIPLIERS', () => {
    it('possui sketch e reveal com valor 0.25 (base 4x mais lenta)', () => {
      expect(DEFAULT_SPEED_PAINT_MULTIPLIERS.sketch).toBe(0.25);
      expect(DEFAULT_SPEED_PAINT_MULTIPLIERS.reveal).toBe(0.25);
    });

    it('é declarado como Readonly no tipo (as const)', () => {
      // as const cria tipo literal readonly, mas não congela em runtime
      // Readonly é uma garantia de TIPO, não de runtime
      const val: Readonly<SpeedPaintMultipliers> = DEFAULT_SPEED_PAINT_MULTIPLIERS;
      expect(typeof val.sketch).toBe('number');
      expect(typeof val.reveal).toBe('number');
    });

    it('satisfaz o tipo SpeedPaintMultipliers', () => {
      const m: SpeedPaintMultipliers = DEFAULT_SPEED_PAINT_MULTIPLIERS;
      expect(typeof m.sketch).toBe('number');
      expect(typeof m.reveal).toBe('number');
    });
  });

  describe('VideoCompositionProps', () => {
    it('aceita speedPaintMultipliers opcional', () => {
      const props: VideoCompositionProps = {
        scenes: [],
        audioUrl: 'audio.wav',
        fps: 30,
      };
      expect(props.speedPaintMultipliers).toBeUndefined();
    });

    it('aceita speedPaintMultipliers fornecido', () => {
      const props: VideoCompositionProps = {
        scenes: [],
        audioUrl: 'audio.wav',
        fps: 30,
        speedPaintMultipliers: { sketch: 2.0, reveal: 1.5 },
      };
      expect(props.speedPaintMultipliers).toBeDefined();
      expect(props.speedPaintMultipliers!.sketch).toBe(2.0);
      expect(props.speedPaintMultipliers!.reveal).toBe(1.5);
    });

    it('aceita isExporting e speedPaintSpeed simultaneamente', () => {
      const props: VideoCompositionProps = {
        scenes: [],
        audioUrl: 'audio.wav',
        fps: 30,
        isExporting: true,
        speedPaintSpeed: 'fast',
        speedPaintMultipliers: { sketch: 1.0, reveal: 1.0 },
      };
      expect(props.isExporting).toBe(true);
      expect(props.speedPaintSpeed).toBe('fast');
      expect(props.speedPaintMultipliers).toBeDefined();
    });
  });

  describe('DEFAULT_SUBTITLE_STYLE', () => {
    it('possui todos os campos obrigatórios com valores padrão', () => {
      expect(DEFAULT_SUBTITLE_STYLE.fontSize).toBe(28);
      expect(DEFAULT_SUBTITLE_STYLE.paddingX).toBe(24);
      expect(DEFAULT_SUBTITLE_STYLE.paddingY).toBe(12);
      expect(DEFAULT_SUBTITLE_STYLE.borderRadius).toBe(12);
      expect(DEFAULT_SUBTITLE_STYLE.backgroundOpacity).toBe(0.5);
      expect(DEFAULT_SUBTITLE_STYLE.gap).toBe(8);
      expect(DEFAULT_SUBTITLE_STYLE.verticalOffset).toBe(0);
      expect(DEFAULT_SUBTITLE_STYLE.position).toBe('bottom');
    });
  });
});
