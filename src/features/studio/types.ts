export type SceneRatio = '16:9' | '9:16' | '1:1';

export interface StudioScene {
  imageUrl: string;
  timestamp: number;
  /** Prompt descritivo da cena (usado no plano de edição) */
  prompt?: string;
}

export interface StudioDraftState {
  script: string;
  selectedVoice: string;
  isMultiSpeaker: boolean;
  audioProfile: string;
  scene: string;
  pace: string;
  styleNotes: string;
  generateScenes: boolean;
  sceneRatio: SceneRatio;
  sceneDensity: number;
  visualFramework: string;
  referenceImage: string | null;
}

export interface StudioSettingsPatch {
  script?: string;
  isMultiSpeaker?: boolean;
  selectedVoice?: string;
  speakerAName?: string;
  speakerBVoice?: string;
  speakerBName?: string;
  audioProfile?: string;
  scene?: string;
  pace?: string;
  styleNotes?: string;
  generateScenes?: boolean;
  sceneDensity?: number;
  sceneRatio?: SceneRatio;
  visualFramework?: string;
}

// Props agrupadas para Inspector — reduz prop drilling (bp #1)
export interface InspectorController {
  isMultiSpeaker: boolean;
  setIsMultiSpeaker: (value: boolean) => void;
  speakerAName: string;
  setSpeakerAName: (value: string) => void;
  selectedVoice: string;
  setSelectedVoice: (value: string) => void;
  speakerBName: string;
  setSpeakerBName: (value: string) => void;
  speakerBVoice: string;
  setSpeakerBVoice: (value: string) => void;
  audioProfile: string;
  setAudioProfile: (value: string) => void;
  scene: string;
  setScene: (value: string) => void;
  pace: string;
  setPace: (value: string) => void;
  styleNotes: string;
  setStyleNotes: (value: string) => void;
  isGenerating: boolean;
  generateScenes: boolean;
  setGenerateScenes: (value: boolean) => void;
  sceneDensity: number;
  setSceneDensity: (value: number) => void;
  sceneRatio: SceneRatio;
  setSceneRatio: (value: SceneRatio) => void;
  visualFramework: string;
  setVisualFramework: (value: string) => void;
  referenceImage: string | null;
  setReferenceImage: (value: string | null) => void;
}

// Props agrupadas para ScriptEditor
export interface ScriptEditorController {
  script: string;
  setScript: (value: string) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  isGenerateDisabled: boolean;
  scenes: StudioScene[];
  currentTime: number;
}
