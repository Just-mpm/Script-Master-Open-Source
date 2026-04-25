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
import type { SceneRatio, StudioDraftState, StudioSettingsPatch } from '../types';
import {
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

  // Ações
  applySettings: (patch: StudioSettingsPatch) => void;
  /** Restaura ao estado inicial (import-time). Não re-lê localStorage — use para "voltar aos padrões do app". */
  reset: () => void;

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
    audioProfile: state.audioProfile,
    scene: state.scene,
    pace: state.pace,
    styleNotes: state.styleNotes,
    generateScenes: state.generateScenes,
    sceneRatio: state.sceneRatio,
    sceneDensity: state.sceneDensity,
    visualFramework: state.visualFramework,
    referenceImage: state.referenceImage,
  };
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

  // --- Ações ---
  applySettings: (patch) => set((state) => {
    const updates: Partial<StudioConfigState> = {};
    if (patch.script !== undefined && patch.script !== state.script) updates.script = patch.script;
    if (patch.isMultiSpeaker !== undefined && patch.isMultiSpeaker !== state.isMultiSpeaker) updates.isMultiSpeaker = patch.isMultiSpeaker;
    if (patch.speakerAName !== undefined && patch.speakerAName !== state.speakerAName) updates.speakerAName = patch.speakerAName;
    if (patch.speakerBVoice !== undefined && patch.speakerBVoice !== state.speakerBVoice) updates.speakerBVoice = patch.speakerBVoice;
    if (patch.speakerBName !== undefined && patch.speakerBName !== state.speakerBName) updates.speakerBName = patch.speakerBName;
    if (patch.selectedVoice !== undefined && patch.selectedVoice !== state.selectedVoice) updates.selectedVoice = patch.selectedVoice;
    if (patch.audioProfile !== undefined && patch.audioProfile !== state.audioProfile) updates.audioProfile = patch.audioProfile;
    if (patch.scene !== undefined && patch.scene !== state.scene) updates.scene = patch.scene;
    if (patch.pace !== undefined && patch.pace !== state.pace) updates.pace = patch.pace;
    if (patch.styleNotes !== undefined && patch.styleNotes !== state.styleNotes) updates.styleNotes = patch.styleNotes;
    if (patch.generateScenes !== undefined && patch.generateScenes !== state.generateScenes) updates.generateScenes = patch.generateScenes;
    if (patch.sceneDensity !== undefined && patch.sceneDensity !== state.sceneDensity) updates.sceneDensity = patch.sceneDensity;
    if (patch.sceneRatio !== undefined && patch.sceneRatio !== state.sceneRatio) updates.sceneRatio = patch.sceneRatio;
    if (patch.visualFramework !== undefined && patch.visualFramework !== state.visualFramework) updates.visualFramework = patch.visualFramework;
    return updates;
  }),

  reset: () => set(INITIAL_STATE),
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
    | 'sceneRatio' | 'visualFramework'
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
