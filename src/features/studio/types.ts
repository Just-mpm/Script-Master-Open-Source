export type SceneRatio = '16:9' | '9:16' | '1:1';

export interface StudioScene {
  imageUrl: string;
  timestamp: number;
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
