import { describe, it, expect } from 'vitest';
import { DEFAULT_SUBTITLE_STYLE } from '../../src/features/video-render/types';

describe('types', () => {
  describe('DEFAULT_SUBTITLE_STYLE', () => {
    it('tem valores padrão documentados', () => {
      expect(DEFAULT_SUBTITLE_STYLE.fontSize).toBe(28);
      expect(DEFAULT_SUBTITLE_STYLE.paddingX).toBe(24);
      expect(DEFAULT_SUBTITLE_STYLE.paddingY).toBe(12);
      expect(DEFAULT_SUBTITLE_STYLE.borderRadius).toBe(12);
      expect(DEFAULT_SUBTITLE_STYLE.backgroundOpacity).toBe(0.5);
      expect(DEFAULT_SUBTITLE_STYLE.gap).toBe(8);
      expect(DEFAULT_SUBTITLE_STYLE.verticalOffset).toBe(0);
    });

    it('contém apenas as propriedades esperadas', () => {
      const keys = Object.keys(DEFAULT_SUBTITLE_STYLE);
      expect(keys).toHaveLength(8);
      expect(keys.sort()).toEqual([
        'backgroundOpacity',
        'borderRadius',
        'fontSize',
        'gap',
        'paddingX',
        'paddingY',
        'position',
        'verticalOffset',
      ]);
    });
  });
});
