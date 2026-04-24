// ─── Tipos ────────────────────────────────────────────────
export type {
  VideoScene,
  VideoCompositionProps,
  VideoRenderConfig,
  SubtitleStyle,
} from './types';

export { DEFAULT_SUBTITLE_STYLE } from './types';

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
export { SubtitleOverlay } from './components/SubtitleOverlay';
export { WaveformOverlay } from './components/WaveformOverlay';
export { VideoExportPanel } from './components/VideoExportPanel';
export { CaptionEditorPanel } from './components/CaptionEditorPanel';

// ─── Hooks ────────────────────────────────────────────────
export { useVideoExporter } from './hooks/useVideoExporter';
export type { VideoExportOptions, VideoExporterState, VideoExporter } from './hooks/useVideoExporter';
