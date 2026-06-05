/**
 * Barrel export da feature "Projeto Manual".
 * Wizard para criar projetos a partir de áudio e imagens próprios.
 */

export type {
  AudioUploadItem,
  ImageUploadItem,
  ManualProjectAction,
  ManualProjectDraft,
  ManualProjectSaveResult,
  SaveErrorKind,
  UseManualProjectReturn,
  ValidationErrorKind,
  ValidationResult,
  ValidationState,
} from './types';

export {
  ACCEPTED_AUDIO_MIMES,
  ACCEPTED_IMAGE_MIMES,
  MAX_AUDIO_BYTES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  MIN_AUDIO_DURATION_SEC,
  MIN_IMAGE_DIMENSION,
} from './types';

export {
  validateAudioFile,
  validateImageFile,
  validateProjectName,
} from './lib/manualProjectValidation';

export {
  DEFAULT_MANUAL_PROJECT_SETTINGS,
  buildAudioSource,
  buildProjectFromDraft,
  buildProjectImages,
  buildVideoScenes,
  computeUniformTimestamps,
  generateLocalId,
} from './lib/manualProjectHelpers';

export type { VideoSceneSeed } from './lib/manualProjectHelpers';
