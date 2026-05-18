export type SpeedPaintTimingMode = 'default' | 'duration-based' | 'sequenced-batch';

export const DEFAULT_SPEED_PAINT_HOLD_SECONDS = 3;
export const DEFAULT_SPEED_PAINT_FADE_SECONDS = 1;
export const DURATION_BASED_SKETCH_RATIO = 0.8;

interface SpeedPaintTimingConfig {
  fadeSeconds: number;
  holdSeconds: number;
}

export interface SpeedPaintSequenceTiming {
  overlapFrames: number;
  sceneStepFrames: number;
  totalDurationInFrames: number;
}

function getTimingConfig(mode: Extract<SpeedPaintTimingMode, 'default' | 'sequenced-batch'>): SpeedPaintTimingConfig {
  void mode;

  return {
    fadeSeconds: DEFAULT_SPEED_PAINT_FADE_SECONDS,
    holdSeconds: DEFAULT_SPEED_PAINT_HOLD_SECONDS,
  };
}

export function getSpeedPaintTimingConfig(mode: Extract<SpeedPaintTimingMode, 'default' | 'sequenced-batch'>): SpeedPaintTimingConfig {
  return getTimingConfig(mode);
}

export function getSpeedPaintOverlapFrames(
  mode: Extract<SpeedPaintTimingMode, 'default' | 'sequenced-batch'>,
  fps: number,
): number {
  const { fadeSeconds } = getTimingConfig(mode);
  return Math.max(1, Math.round(fadeSeconds * fps));
}

export function getSpeedPaintSequenceTiming(
  sceneDurationInFrames: number,
  sceneCount: number,
  fps: number,
  mode: Extract<SpeedPaintTimingMode, 'default' | 'sequenced-batch'> = 'sequenced-batch',
): SpeedPaintSequenceTiming {
  const overlapFrames = getSpeedPaintOverlapFrames(mode, fps);
  const sceneStepFrames = Math.max(1, sceneDurationInFrames - overlapFrames);
  const totalDurationInFrames = sceneCount <= 0
    ? 0
    : sceneDurationInFrames + (sceneStepFrames * Math.max(0, sceneCount - 1));

  return {
    overlapFrames,
    sceneStepFrames,
    totalDurationInFrames,
  };
}
