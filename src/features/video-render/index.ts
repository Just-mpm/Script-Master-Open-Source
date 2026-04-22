// ─── Tipos ────────────────────────────────────────────────
export type {
  VideoScene,
  VideoCompositionProps,
  VideoRenderConfig,
} from './types';

// ─── Tipos de legenda/transcrição ──────────────────────────
export type {
  CaptionWord,
  TranscriptionResult,
  SubtitleMode,
} from './types';

// ─── Tipos do plano de edição ─────────────────────────────
export type {
  TransitionType,
  CameraMovement,
  VisualEffect,
  EditingScene,
  EditingPlan,
  TitleOverlayStyle,
} from './lib/editingPlan';
export {
  TRANSITION_PRESETS,
  CAMERA_MOVEMENTS,
  TRANSITION_TYPE_LIST,
  CAMERA_MOVEMENT_LIST,
  VISUAL_EFFECT_LIST,
  TITLE_OVERLAY_STYLES,
  TITLE_OVERLAY_LABELS,
  DEFAULT_EFFECT_INTENSITY,
  effectBlurPx,
} from './lib/editingPlan';

// ─── Utils ────────────────────────────────────────────────
export {
  msToFrames,
  framesToMs,
  framesToSeconds,
  getResolutionFromRatio,
  calculateDurationFromWav,
  mapScenesToVideoScenes,
} from './lib/videoUtils';

// ─── Componentes ──────────────────────────────────────────
export { VideoComposition } from './components/VideoComposition';
export { SceneSequence } from './components/SceneSequence';
export { SubtitleOverlay } from './components/SubtitleOverlay';
export { TitleOverlay } from './components/TitleOverlay';
export { WaveformOverlay } from './components/WaveformOverlay';
export { EditingPlanInspector } from './components/EditingPlanInspector';
export { VideoExportPanel } from './components/VideoExportPanel';

// ─── Hooks ────────────────────────────────────────────────
export { useEditingPlan } from './hooks/useEditingPlan';
export type { EditingPlanSceneInput } from './hooks/useEditingPlan';
export { useVideoExporter } from './hooks/useVideoExporter';
export type { VideoExportOptions, VideoExporterState, VideoExporter } from './hooks/useVideoExporter';
