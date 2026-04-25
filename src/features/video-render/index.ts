// ─── Tipos ────────────────────────────────────────────────
export type {
  VideoScene,
  VideoCompositionProps,
  VideoRenderConfig,
  SubtitleStyle,
  SpeedPaintMultipliers,
} from './types';

export { DEFAULT_SUBTITLE_STYLE, DEFAULT_SPEED_PAINT_MULTIPLIERS } from './types';

// ─── Tipos de legenda/transcrição ──────────────────────────
export type {
  CaptionWord,
  CaptionPhrase,
  CaptionSource,
  TranscriptionResult,
} from './types';

// ─── Utils ────────────────────────────────────────────────
export {
  msToFrames,
  framesToMs,
  getResolutionFromRatio,
  calculateDurationFromWav,
  mapScenesToVideoScenes,
} from './lib/videoUtils';

// ─── Componentes ──────────────────────────────────────────
export { VideoComposition } from './components/VideoComposition';
export { SceneSequence } from './components/SceneSequence';
export { SpeedPaintScene } from './components/SpeedPaintScene';
export { SubtitleOverlay } from './components/SubtitleOverlay';
export { WaveformOverlay } from './components/WaveformOverlay';
export { VideoExportPanel } from './components/VideoExportPanel';
export { SpeedPaintControls } from './components/SpeedPaintControls';
export { CaptionEditorPanel } from './components/CaptionEditorPanel';

// ─── Libs ────────────────────────────────────────────────
export { renderSpeedPaintFrame, generateScenesWithSpeedPaint } from './lib/speedPaintRenderer';

// ─── Hooks ────────────────────────────────────────────────
export { useVideoExporter } from './hooks/useVideoExporter';
export type { VideoExportOptions, VideoExporterState, VideoExporter } from './hooks/useVideoExporter';
