/**
 * Store Zustand — estado de configuração do estúdio de produção.
 *
 * Gerencia 14 preferências persistidas no localStorage + referenceImage (session-only).
 * Segue o padrão flat das stores existentes (videoRenderBridge, animationStore):
 * - interface + INITIAL_STATE + create + ações inline
 * - sem immer, sem persist middleware
 * - subscribe para sync automático com localStorage
 *
 * Nota: Usa sync manual (subscribe + PERSIST_MAP) em vez do middleware persist
 * deliberadamente — mantém consistência com as demais stores do projeto.
 * O middleware persist oferece cross-tab sync nativo, mas adiciona complexidade
 * async à inicialização. Para revisão futura, vide Zustand Guide refs [7][8][9].
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { EMOTION_OPTIONS, type SceneRatio, type StudioDraftState, type StudioSettingsPatch, type EmotionType } from '../types';
import type { Locale } from '../../i18n/types';
import { isValidLocale } from '../../i18n/utils';
import {
  SCENE_RATIOS,
  STORAGE_KEYS,
  safeSetItem,
  getInitialStudioConfig,
  VIDEO_FPS,
} from './studio.utils';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface StudioConfigState {
  // Estado de configuração (14 persistidos + 1 session-only)
  script: string;
  isMultiSpeaker: boolean;
  speakerAName: string;
  selectedVoice: string;
  speakerBName: string;
  speakerBVoice: string;
  audioProfile: string;
  scene: string;
  styleNotes: string;
  pace: string;
  generateScenes: boolean;
  sceneDensity: number;
  sceneRatio: SceneRatio;
  visualFramework: string;
  referenceImage: string | null;
  emotion: EmotionType;
  emotionIntensity: number;
  imageTextLanguage: Locale;

  // Setters
  setScript: (value: string) => void;
  setIsMultiSpeaker: (value: boolean) => void;
  setSpeakerAName: (value: string) => void;
  setSelectedVoice: (value: string) => void;
  setSpeakerBName: (value: string) => void;
  setSpeakerBVoice: (value: string) => void;
  setAudioProfile: (value: string) => void;
  setScene: (value: string) => void;
  setStyleNotes: (value: string) => void;
  setPace: (value: string) => void;
  setGenerateScenes: (value: boolean) => void;
  setSceneDensity: (value: number) => void;
  setSceneRatio: (value: SceneRatio) => void;
  setVisualFramework: (value: string) => void;
  setReferenceImage: (value: string | null) => void;
  setEmotion: (value: EmotionType) => void;
  setEmotionIntensity: (value: number) => void;
  setImageTextLanguage: (value: Locale) => void;

  // Ações
  applySettings: (patch: StudioSettingsPatch) => void;
  /** Restaura ao estado inicial (import-time). Não re-lê localStorage — use para "voltar aos padrões do app". */
  reset: () => void;
  /** Carrega preferências do Firestore (merge — só aplica campos diferentes do estado atual) */
  loadFromFirestore: (settings: Partial<StudioDraftState>) => void;

  // Valores derivados
  videoFps: number;
}

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

const INITIAL_STATE = {
  ...getInitialStudioConfig(),
  videoFps: VIDEO_FPS,
};

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Selector: deriva StudioDraftState do state atual */
function toDraftState(state: StudioConfigState): StudioDraftState {
  return {
    script: state.script,
    selectedVoice: state.selectedVoice,
    isMultiSpeaker: state.isMultiSpeaker,
    speakerAName: state.speakerAName,
    speakerBName: state.speakerBName,
    speakerBVoice: state.speakerBVoice,
    audioProfile: state.audioProfile,
    scene: state.scene,
    pace: state.pace,
    styleNotes: state.styleNotes,
    generateScenes: state.generateScenes,
    sceneRatio: state.sceneRatio,
    sceneDensity: state.sceneDensity,
    visualFramework: state.visualFramework,
    referenceImage: state.referenceImage,
    emotion: state.emotion,
    emotionIntensity: state.emotionIntensity,
    imageTextLanguage: state.imageTextLanguage,
  };
}

function isEmotionType(value: string): value is EmotionType {
  return EMOTION_OPTIONS.some((option) => option.value === value);
}

function sanitizeStudioSettingsPatch(patch: StudioSettingsPatch): Partial<StudioConfigState> {
  const updates: Partial<StudioConfigState> = {};

  for (const [key, value] of Object.entries(patch)) {
    switch (key) {
      case 'script':
      case 'selectedVoice':
      case 'speakerAName':
      case 'speakerBVoice':
      case 'speakerBName':
      case 'audioProfile':
      case 'scene':
      case 'pace':
      case 'styleNotes':
      case 'visualFramework':
        if (typeof value === 'string') updates[key] = value;
        break;
      case 'isMultiSpeaker':
      case 'generateScenes':
        if (typeof value === 'boolean') updates[key] = value;
        break;
      case 'sceneDensity':
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          updates.sceneDensity = value;
        }
        break;
      case 'emotionIntensity':
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1) {
          updates.emotionIntensity = value;
        }
        break;
      case 'sceneRatio':
        if (typeof value === 'string' && SCENE_RATIOS.includes(value as SceneRatio)) {
          updates.sceneRatio = value as SceneRatio;
        }
        break;
      case 'emotion':
        if (typeof value === 'string' && isEmotionType(value)) {
          updates.emotion = value;
        }
        break;
      case 'imageTextLanguage':
        if (typeof value === 'string' && isValidLocale(value)) {
          updates.imageTextLanguage = value;
        }
        break;
      default:
        break;
    }
  }

  return updates;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStudioStore = create<StudioConfigState>()((set) => ({
  ...INITIAL_STATE,

  // --- Setters ---
  setScript: (value) => set({ script: value }),
  setIsMultiSpeaker: (value) => set({ isMultiSpeaker: value }),
  setSpeakerAName: (value) => set({ speakerAName: value }),
  setSelectedVoice: (value) => set({ selectedVoice: value }),
  setSpeakerBName: (value) => set({ speakerBName: value }),
  setSpeakerBVoice: (value) => set({ speakerBVoice: value }),
  setAudioProfile: (value) => set({ audioProfile: value }),
  setScene: (value) => set({ scene: value }),
  setStyleNotes: (value) => set({ styleNotes: value }),
  setPace: (value) => set({ pace: value }),
  setGenerateScenes: (value) => set({ generateScenes: value }),
  setSceneDensity: (value) => set({ sceneDensity: value }),
  setSceneRatio: (value) => set({ sceneRatio: value }),
  setVisualFramework: (value) => set({ visualFramework: value }),
  setReferenceImage: (value) => set({ referenceImage: value }),
  setEmotion: (value) => set({ emotion: value }),
  setEmotionIntensity: (value) => set({ emotionIntensity: value }),
  setImageTextLanguage: (value) => set({ imageTextLanguage: value }),

  // --- Ações ---
  applySettings: (patch) => set((state) => {
    const updates: Partial<StudioConfigState> = {};
    const sanitizedPatch = sanitizeStudioSettingsPatch(patch);
    const stateRecord = state as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(sanitizedPatch)) {
      if (value !== undefined && value !== stateRecord[key]) {
        (updates as unknown as Record<string, unknown>)[key] = value;
      }
    }
    return updates;
  }),

  reset: () => set(INITIAL_STATE),

  loadFromFirestore: (settings) => set((state) => {
    const updates: Partial<StudioConfigState> = {};
    const allowedKeys = new Set([
      'selectedVoice', 'isMultiSpeaker', 'speakerAName', 'speakerBName',
      'speakerBVoice', 'audioProfile', 'scene', 'pace', 'styleNotes',
      'generateScenes', 'sceneDensity', 'sceneRatio', 'visualFramework',
      'emotion', 'emotionIntensity', 'imageTextLanguage',
    ]);
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && allowedKeys.has(key) && value !== (state as unknown as Record<string, unknown>)[key]) {
        (updates as Record<string, unknown>)[key] = value;
      }
    }
    return updates;
  }),
}));

// ---------------------------------------------------------------------------
// Selector derivado: StudioDraftState
// ---------------------------------------------------------------------------

/** Hook que deriva StudioDraftState do store. Usa useShallow para evitar re-renders quando campos não selecionados mudam. */
export function useCurrentStudioState(): StudioDraftState {
  return useStudioStore(useShallow(toDraftState));
}

// ---------------------------------------------------------------------------
// Subscribe: sync com localStorage
// ---------------------------------------------------------------------------

/** Mapeamento de campo do store → chave do localStorage + serializador */
const PERSIST_MAP: ReadonlyArray<{
  key: keyof Pick<StudioConfigState,
    | 'script' | 'isMultiSpeaker' | 'speakerAName' | 'selectedVoice'
    | 'speakerBName' | 'speakerBVoice' | 'audioProfile' | 'scene'
    | 'styleNotes' | 'pace' | 'generateScenes' | 'sceneDensity'
    | 'sceneRatio' | 'visualFramework' | 'emotion' | 'emotionIntensity'
    | 'imageTextLanguage'
  >;
  storageKey: string;
  serialize: (value: unknown) => string;
}> = [
  { key: 'script', storageKey: STORAGE_KEYS.script, serialize: String },
  { key: 'isMultiSpeaker', storageKey: STORAGE_KEYS.isMultiSpeaker, serialize: String },
  { key: 'speakerAName', storageKey: STORAGE_KEYS.speakerAName, serialize: String },
  { key: 'selectedVoice', storageKey: STORAGE_KEYS.selectedVoice, serialize: String },
  { key: 'speakerBName', storageKey: STORAGE_KEYS.speakerBName, serialize: String },
  { key: 'speakerBVoice', storageKey: STORAGE_KEYS.speakerBVoice, serialize: String },
  { key: 'audioProfile', storageKey: STORAGE_KEYS.audioProfile, serialize: String },
  { key: 'scene', storageKey: STORAGE_KEYS.scene, serialize: String },
  { key: 'styleNotes', storageKey: STORAGE_KEYS.styleNotes, serialize: String },
  { key: 'pace', storageKey: STORAGE_KEYS.pace, serialize: String },
  { key: 'generateScenes', storageKey: STORAGE_KEYS.generateScenes, serialize: String },
  { key: 'sceneDensity', storageKey: STORAGE_KEYS.sceneDensity, serialize: String },
  { key: 'sceneRatio', storageKey: STORAGE_KEYS.sceneRatio, serialize: String },
  { key: 'visualFramework', storageKey: STORAGE_KEYS.visualFramework, serialize: String },
  { key: 'emotion', storageKey: STORAGE_KEYS.emotion, serialize: String },
  { key: 'emotionIntensity', storageKey: STORAGE_KEYS.emotionIntensity, serialize: String },
  { key: 'imageTextLanguage', storageKey: STORAGE_KEYS.imageTextLanguage, serialize: String },
];

// Listener de subscribe — apenas persiste, nunca chama set() (sem loop)
useStudioStore.subscribe((state, previousState) => {
  for (const { key, storageKey, serialize } of PERSIST_MAP) {
    if (state[key] !== previousState[key]) {
      safeSetItem(storageKey, serialize(state[key]));
    }
  }
});

// ---------------------------------------------------------------------------
// Cleanup de flag obsoleto (executado uma vez na importação do módulo)
// ---------------------------------------------------------------------------

try {
  localStorage.removeItem('s2a_has_ref_image');
} catch {
  // Safari Private Browsing — ignorar silenciosamente
}

// ---------------------------------------------------------------------------
// Helper: extrai campos persistíveis no Firestore (exclui script e referenceImage)
// ---------------------------------------------------------------------------

import type { StudioUserSettings } from '../../../lib/db/user-settings';

/** Extrai campos persistíveis no Firestore (exclui script e referenceImage) */
export function getStudioSettingsPatch(state: StudioConfigState): StudioUserSettings {
  return {
    selectedVoice: state.selectedVoice,
    isMultiSpeaker: state.isMultiSpeaker,
    speakerAName: state.speakerAName,
    speakerBName: state.speakerBName,
    speakerBVoice: state.speakerBVoice,
    audioProfile: state.audioProfile,
    scene: state.scene,
    pace: state.pace,
    styleNotes: state.styleNotes,
    generateScenes: state.generateScenes,
    sceneDensity: state.sceneDensity,
    sceneRatio: state.sceneRatio,
    visualFramework: state.visualFramework,
    emotion: state.emotion,
    emotionIntensity: state.emotionIntensity,
    imageTextLanguage: state.imageTextLanguage,
  };
}
