// ─── Tipos ────────────────────────────────────────────────
export type {
  VideoScene,
  VideoCompositionProps,
  VideoRenderConfig,
} from './types';

// ─── Tipos do plano de edição ─────────────────────────────
export type {
  TransitionType,
  CameraMovement,
  VisualEffect,
  EditingScene,
  EditingPlan,
} from './lib/editingPlan';
export { TRANSITION_PRESETS, CAMERA_MOVEMENTS } from './lib/editingPlan';

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
export { EditingPlanInspector } from './components/EditingPlanInspector';
export { VideoExportPanel } from './components/VideoExportPanel';

// ─── Hooks ────────────────────────────────────────────────
export { useEditingPlan } from './hooks/useEditingPlan';
export type { EditingPlanSceneInput } from './hooks/useEditingPlan';
export { useVideoExporter } from './hooks/useVideoExporter';
export type { VideoExportOptions, VideoExporterState, VideoExporter } from './hooks/useVideoExporter';
