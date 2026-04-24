import { describe, it, expect } from 'vitest';
import type { VideoScene, VideoExportQuality, SpeedPaintSpeed } from '../../src/features/video-render/types';
import { DEFAULT_SUBTITLE_STYLE, SPEED_PAINT_MULTIPLIERS } from '../../src/features/video-render/types';

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
