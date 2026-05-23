/**
 * Helpers de localStorage para persistência das preferências do estúdio.
 * Funções puras sem dependência React — extraídas de useStudioState.ts.
 */

import { VOICES } from '../../../lib/constants';
import type { Locale } from '../../i18n/types';
import { isValidLocale } from '../../i18n/utils';
import type { SceneRatio, StudioDraftState, EmotionType, StudioSettingsPatch } from '../types';

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
  emotion: 's2a_emotion',
  emotionIntensity: 's2a_emotion_intensity',
  imageTextLanguage: 's2a_image_text_lang',
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
  try {
    return localStorage.getItem(key) ?? fallbackValue;
  } catch {
    // Safari Private Browsing / storage desabilitado — fallback silencioso
    return fallbackValue;
  }
}

export function getStoredBoolean(key: string, fallbackValue = false): boolean {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue === null ? fallbackValue : storedValue === 'true';
  } catch {
    return fallbackValue;
  }
}

export function getStoredNumber(key: string, fallbackValue: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallbackValue;
    const storedValue = Number(raw);
    return Number.isFinite(storedValue) && storedValue >= 0 ? storedValue : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

export function isSceneRatio(value: string | null): value is SceneRatio {
  return value !== null && SCENE_RATIOS.includes(value as SceneRatio);
}

export function getStoredSceneRatio(): SceneRatio {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEYS.sceneRatio);
    return isSceneRatio(storedValue) ? storedValue : '16:9';
  } catch {
    return '16:9';
  }
}

const VALID_EMOTIONS: ReadonlyArray<EmotionType> = [
  'neutral', 'happy', 'sad', 'angry', 'calm', 'energetic', 'dramatic', 'friendly',
];

function isValidEmotion(value: string | null): value is EmotionType {
  return value !== null && (VALID_EMOTIONS as ReadonlyArray<string>).includes(value);
}

export function getStoredEmotion(): EmotionType {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEYS.emotion);
    return isValidEmotion(storedValue) ? storedValue : 'neutral';
  } catch {
    return 'neutral';
  }
}

export function getStoredImageTextLanguage(): Locale {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEYS.imageTextLanguage);
    return storedValue !== null && isValidLocale(storedValue) ? storedValue : 'pt-BR';
  } catch {
    return 'pt-BR';
  }
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
    emotion: getStoredEmotion(),
    emotionIntensity: getStoredNumber(STORAGE_KEYS.emotionIntensity, 0.5),
    imageTextLanguage: getStoredImageTextLanguage(),
  };
}

// ---------------------------------------------------------------------------
// Construtor de opções de geração (DRY — usado por App.tsx e StudioPage.tsx)
// ---------------------------------------------------------------------------

/**
 * Props de configuração que `buildGenerateOptions` aceita do estado do store.
 * Combina StudioDraftState com campos de speaker que não estão no draft.
 */
type GenerateOptionsState = StudioDraftState & {
  speakerAName: string;
  speakerBVoice: string;
  speakerBName: string;
};

function getDefaultProjectLabel(locale: Locale): string {
  switch (locale) {
    case 'en':
      return 'Project';
    case 'es':
      return 'Proyecto';
    case 'pt-BR':
    default:
      return 'Projeto';
  }
}

/**
 * Constrói opções de geração de áudio a partir do estado do store.
 * Recebe o estado via parâmetro para evitar import circular com studioStore.
 *
 * Uso: buildGenerateOptions(userId, useStudioStore.getState())
 */
export function buildGenerateOptions(
  userId: string | undefined,
  state: GenerateOptionsState,
) {
  const locale = state.imageTextLanguage;
  return {
    userId,
    projectName: `${getDefaultProjectLabel(locale)} ${new Date().toLocaleDateString()}`,
    ...state,
    locale,
  };
}

// ---------------------------------------------------------------------------
// Persistência de padrões (página de configurações)
// ---------------------------------------------------------------------------

/** Chaves s2a_* que a página de configurações gerencia (exclui script e referenceImage) */
const DEFAULTS_KEYS: ReadonlyArray<keyof typeof STORAGE_KEYS> = [
  'isMultiSpeaker', 'speakerAName', 'selectedVoice', 'speakerBName', 'speakerBVoice',
  'audioProfile', 'scene', 'styleNotes', 'pace', 'generateScenes', 'sceneDensity',
  'sceneRatio', 'visualFramework', 'emotion', 'emotionIntensity', 'imageTextLanguage',
] as const;

/**
 * Salva defaults do estúdio nas mesmas chaves s2a_*.
 * Define o estado inicial do estúdio na próxima sessão.
 */
export function saveStudioDefaults(defaults: StudioSettingsPatch): void {
  if (defaults.isMultiSpeaker !== undefined) safeSetItem(STORAGE_KEYS.isMultiSpeaker, String(defaults.isMultiSpeaker));
  if (defaults.speakerAName !== undefined) safeSetItem(STORAGE_KEYS.speakerAName, defaults.speakerAName);
  if (defaults.selectedVoice !== undefined) safeSetItem(STORAGE_KEYS.selectedVoice, defaults.selectedVoice);
  if (defaults.speakerBName !== undefined) safeSetItem(STORAGE_KEYS.speakerBName, defaults.speakerBName);
  if (defaults.speakerBVoice !== undefined) safeSetItem(STORAGE_KEYS.speakerBVoice, defaults.speakerBVoice);
  if (defaults.audioProfile !== undefined) safeSetItem(STORAGE_KEYS.audioProfile, defaults.audioProfile);
  if (defaults.scene !== undefined) safeSetItem(STORAGE_KEYS.scene, defaults.scene);
  if (defaults.styleNotes !== undefined) safeSetItem(STORAGE_KEYS.styleNotes, defaults.styleNotes);
  if (defaults.pace !== undefined) safeSetItem(STORAGE_KEYS.pace, defaults.pace);
  if (defaults.generateScenes !== undefined) safeSetItem(STORAGE_KEYS.generateScenes, String(defaults.generateScenes));
  if (defaults.sceneDensity !== undefined) safeSetItem(STORAGE_KEYS.sceneDensity, String(defaults.sceneDensity));
  if (defaults.sceneRatio !== undefined) safeSetItem(STORAGE_KEYS.sceneRatio, defaults.sceneRatio);
  if (defaults.visualFramework !== undefined) safeSetItem(STORAGE_KEYS.visualFramework, defaults.visualFramework);
  if (defaults.emotion !== undefined) safeSetItem(STORAGE_KEYS.emotion, defaults.emotion);
  if (defaults.emotionIntensity !== undefined) safeSetItem(STORAGE_KEYS.emotionIntensity, String(defaults.emotionIntensity));
  if (defaults.imageTextLanguage !== undefined) safeSetItem(STORAGE_KEYS.imageTextLanguage, defaults.imageTextLanguage);
}

/** Remove todas as chaves s2a_* (exceto script) — volta aos hardcodados de getInitialStudioConfig() */
export function clearStudioDefaults(): void {
  for (const key of DEFAULTS_KEYS) {
    try {
      localStorage.removeItem(STORAGE_KEYS[key]);
    } catch {
      // Safari Private Browsing — silencioso
    }
  }
}
