/**
 * Helpers de localStorage para persistência das preferências do estúdio.
 * Funções puras sem dependência React — extraídas de useStudioState.ts.
 */

import { VOICES } from '../../../lib/constants';
import type { SceneRatio } from '../types';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  script: 's2a_script',
  isMultiSpeaker: 's2a_multi',
  speakerAName: 's2a_spaname',
  selectedVoice: 's2a_voice',
  speakerBName: 's2a_spbname',
  speakerBVoice: 's2a_spbvoice',
  audioProfile: 's2a_profile',
  scene: 's2a_scene',
  styleNotes: 's2a_notes',
  pace: 's2a_pace',
  generateScenes: 's2a_gen_scenes',
  sceneDensity: 's2a_scene_density',
  sceneRatio: 's2a_scene_ratio',
  visualFramework: 's2a_visual_framework',
} as const;

export const SCENE_RATIOS: SceneRatio[] = ['16:9', '9:16', '1:1'];

/** FPS padrão para composição de vídeo Remotion */
export const VIDEO_FPS = 30;

// ---------------------------------------------------------------------------
// Helpers de leitura/escrita
// ---------------------------------------------------------------------------

/** Salva no localStorage silenciando erros de quota/segurança (preferências não-críticas) */
export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Safari Private Browsing lança SecurityError; quota cheia lança QuotaExceededError
    // Preferências não são críticas — falha silenciosa
  }
}

export function getStoredValue(key: string, fallbackValue: string): string {
  return localStorage.getItem(key) ?? fallbackValue;
}

export function getStoredBoolean(key: string, fallbackValue = false): boolean {
  const storedValue = localStorage.getItem(key);
  return storedValue === null ? fallbackValue : storedValue === 'true';
}

export function getStoredNumber(key: string, fallbackValue: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallbackValue;
  const storedValue = Number(raw);
  return Number.isFinite(storedValue) && storedValue >= 0 ? storedValue : fallbackValue;
}

export function isSceneRatio(value: string | null): value is SceneRatio {
  return value !== null && SCENE_RATIOS.includes(value as SceneRatio);
}

export function getStoredSceneRatio(): SceneRatio {
  const storedValue = localStorage.getItem(STORAGE_KEYS.sceneRatio);
  return isSceneRatio(storedValue) ? storedValue : '16:9';
}

// ---------------------------------------------------------------------------
// Valores iniciais lidos do localStorage
// ---------------------------------------------------------------------------

export function getInitialStudioConfig() {
  return {
    script: getStoredValue(STORAGE_KEYS.script, ''),
    isMultiSpeaker: getStoredBoolean(STORAGE_KEYS.isMultiSpeaker),
    speakerAName: getStoredValue(STORAGE_KEYS.speakerAName, 'Voz A'),
    selectedVoice: getStoredValue(STORAGE_KEYS.selectedVoice, VOICES[0]?.id ?? ''),
    speakerBName: getStoredValue(STORAGE_KEYS.speakerBName, 'Voz B'),
    speakerBVoice: getStoredValue(STORAGE_KEYS.speakerBVoice, VOICES[1]?.id ?? VOICES[0]?.id ?? ''),
    audioProfile: getStoredValue(STORAGE_KEYS.audioProfile, ''),
    scene: getStoredValue(STORAGE_KEYS.scene, ''),
    styleNotes: getStoredValue(STORAGE_KEYS.styleNotes, ''),
    pace: getStoredValue(STORAGE_KEYS.pace, 'normal'),
    generateScenes: getStoredBoolean(STORAGE_KEYS.generateScenes),
    sceneDensity: getStoredNumber(STORAGE_KEYS.sceneDensity, 15),
    sceneRatio: getStoredSceneRatio(),
    visualFramework: getStoredValue(STORAGE_KEYS.visualFramework, 'general'),
    referenceImage: null as string | null,
  };
}

// ---------------------------------------------------------------------------
// Construtor de opções de geração (DRY — usado por App.tsx e StudioPage.tsx)
// ---------------------------------------------------------------------------

/**
 * Constrói opções de geração de áudio a partir do estado do store.
 * Recebe o estado via parâmetro para evitar import circular com studioStore.
 *
 * Uso: buildGenerateOptions(userId, useStudioStore.getState())
 */
export function buildGenerateOptions(
  userId: string | undefined,
  state: {
    script: string;
    selectedVoice: string;
    audioProfile: string;
    scene: string;
    pace: string;
    styleNotes: string;
    generateScenes: boolean;
    isMultiSpeaker: boolean;
    speakerAName: string;
    speakerBVoice: string;
    speakerBName: string;
    sceneDensity: number;
    sceneRatio: SceneRatio;
    visualFramework: string;
    referenceImage: string | null;
  },
) {
  return {
    userId,
    projectName: `Projeto ${new Date().toLocaleDateString()}`,
    script: state.script,
    selectedVoice: state.selectedVoice,
    audioProfile: state.audioProfile,
    scene: state.scene,
    pace: state.pace,
    styleNotes: state.styleNotes,
    generateScenes: state.generateScenes,
    isMultiSpeaker: state.isMultiSpeaker,
    speakerAName: state.speakerAName,
    speakerBVoice: state.speakerBVoice,
    speakerBName: state.speakerBName,
    sceneDensity: state.sceneDensity,
    sceneRatio: state.sceneRatio,
    visualFramework: state.visualFramework,
    referenceImage: state.referenceImage,
  };
}
