/**
 * Helpers de construção do projeto manual: geração de IDs,
 * defaults de settings, conversão de uploads para entidades de domínio.
 *
 * Funções puras — testáveis isoladamente.
 */

import { buildUniformTimestamps } from '../../../lib/audio-analysis';
import type { AudioSource, Project, ProjectImage } from '../../../lib/db/types';
import type { ManualProjectDraft } from '../types';

/** Gera ID local único para itens de upload (não colide com Firestore IDs) */
export function generateLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Defaults de `ProjectSettings` para projeto manual.
 *
 *  NÃO herda do `useStudioStore` — o wizard pode ser acessado sem
 *  o estúdio ter sido visitado. Campos opcionais ficam vazios. */
export const DEFAULT_MANUAL_PROJECT_SETTINGS: Project['settings'] = {
  selectedVoice: '',
  pace: '',
  styleNotes: '',
  isMultiSpeaker: false,
  speakerAName: '',
  speakerBName: '',
  speakerBVoice: '',
  audioProfile: 'narrative',
  scene: 'general',
  sceneDensity: 5,
  sceneRatio: '16:9',
  visualFramework: 'general',
  emotion: '',
  emotionIntensity: 0,
};

/** Calcula timestamps uniformes para N imagens distribuídas na duração */
export function computeUniformTimestamps(imageCount: number, durationSec: number): number[] {
  return buildUniformTimestamps(imageCount, durationSec);
}

/** Constrói `Project` a partir do draft validado */
export function buildProjectFromDraft(draft: ManualProjectDraft, projectId: string): Project {
  return {
    id: projectId,
    name: draft.name.trim(),
    script: draft.script.trim(),
    createdAt: Date.now(),
    settings: DEFAULT_MANUAL_PROJECT_SETTINGS,
  };
}

/** Constrói `AudioSource` a partir do item validado */
export function buildAudioSource(
  draft: ManualProjectDraft,
  projectId: string,
  audioId: string,
): AudioSource {
  if (!draft.audio) {
    throw new Error('buildAudioSource chamado sem áudio no draft');
  }
  return {
    id: audioId,
    projectId,
    audioUrl: draft.audio.previewUrl, // blob URL temporário; será substituído por Storage
    createdAt: Date.now(),
    audioBlob: draft.audio.file,
    // audioSegments: [] — Whisper cobre transcrição (vazio é correto)
  };
}

/** Constrói `ProjectImage[]` a partir dos itens ordenados e timestamps uniformes */
export function buildProjectImages(
  draft: ManualProjectDraft,
  projectId: string,
  audioDurationSec: number,
): ProjectImage[] {
  if (draft.images.length === 0) return [];
  const timestamps = computeUniformTimestamps(draft.images.length, audioDurationSec);
  return draft.images.map((img, index) => ({
    id: generateLocalId(),
    projectId,
    imageUrl: img.previewUrl, // blob URL temporário; será substituído por Storage
    prompt: '', // sem prompt — gerado pelo usuário fora da plataforma
    timestamp: timestamps[index] ?? 0,
    createdAt: Date.now(),
    imageBlob: img.file,
  }));
}

/** Constrói `AudioSource` para o `useAudioGeneratorStore` (consumo em /app/video).
 *  Diferente do `AudioSource` persistido: usa imageUrl/timestamp das cenas do projeto. */
export interface VideoSceneSeed {
  imageUrl: string;
  timestamp: number;
}

/** Gera array de cenas para o VideoPage a partir das imagens do projeto manual */
export function buildVideoScenes(
  images: ProjectImage[],
): VideoSceneSeed[] {
  return images
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((img) => ({ imageUrl: img.imageUrl, timestamp: img.timestamp }));
}
