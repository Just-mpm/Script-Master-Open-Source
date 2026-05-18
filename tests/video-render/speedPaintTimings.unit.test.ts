import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEED_PAINT_FADE_SECONDS,
  DEFAULT_SPEED_PAINT_HOLD_SECONDS,
  getSpeedPaintOverlapFrames,
  getSpeedPaintSequenceTiming,
  getSpeedPaintTimingConfig,
} from '../../src/features/video-render/lib/speedPaintTimings';

describe('speedPaintTimings', () => {
  it('usa a mesma configuração base para default e sequenced-batch', () => {
    expect(getSpeedPaintTimingConfig('default')).toEqual({
      fadeSeconds: DEFAULT_SPEED_PAINT_FADE_SECONDS,
      holdSeconds: DEFAULT_SPEED_PAINT_HOLD_SECONDS,
    });

    expect(getSpeedPaintTimingConfig('sequenced-batch')).toEqual(
      getSpeedPaintTimingConfig('default'),
    );
  });

  it('calcula overlap de speed paint em frames a partir da fonte de verdade compartilhada', () => {
    expect(getSpeedPaintOverlapFrames('default', 30)).toBe(30);
    expect(getSpeedPaintOverlapFrames('sequenced-batch', 30)).toBe(30);
  });

  it('calcula step e duração total do lote com overlap real', () => {
    expect(getSpeedPaintSequenceTiming(900, 2, 30, 'sequenced-batch')).toEqual({
      overlapFrames: 30,
      sceneStepFrames: 870,
      totalDurationInFrames: 1770,
    });
  });
});
