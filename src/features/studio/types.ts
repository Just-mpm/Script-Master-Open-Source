import type { Locale } from '../i18n/types';

export type SceneRatio = '16:9' | '9:16' | '1:1';

/** Emoções suportadas pelo TTS — mapeadas para instruções de prompt */
export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'calm' | 'energetic' | 'dramatic' | 'friendly';

/** Opções de emoção para o seletor de UI */
export const EMOTION_OPTIONS: ReadonlyArray<{ value: EmotionType; label: string; promptInstruction: string }> = [
  { value: 'neutral', label: 'Neutro', promptInstruction: '' },
  { value: 'happy', label: 'Feliz', promptInstruction: 'Tom alegre e entusiasmado, como quem compartilha boas notícias.' },
  { value: 'sad', label: 'Triste', promptInstruction: 'Tom melancólico e contemplativo, com pausas reflexivas.' },
  { value: 'angry', label: 'Irritado', promptInstruction: 'Tom firme e irritado, com ênfase em palavras-chave.' },
  { value: 'calm', label: 'Calmo', promptInstruction: 'Tom sereno e tranquilizador, com ritmo pausado.' },
  { value: 'energetic', label: 'Energético', promptInstruction: 'Tom vibrante e dinâmico, com muita energia e entonação variada.' },
  { value: 'dramatic', label: 'Dramático', promptInstruction: 'Tom intenso e dramático, com variações de volume e ritmo.' },
  { value: 'friendly', label: 'Amigável', promptInstruction: 'Tom acolhedor e caloroso, como uma conversa entre amigos.' },
] as const;

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
  speakerAName: string;
  speakerBName: string;
  speakerBVoice: string;
  audioProfile: string;
  scene: string;
  pace: string;
  styleNotes: string;
  generateScenes: boolean;
  sceneRatio: SceneRatio;
  sceneDensity: number;
  visualFramework: string;
  referenceImage: string | null;
  emotion: EmotionType;
  emotionIntensity: number;
  imageTextLanguage: Locale;
}

/** Patch parcial para aplicar configurações do estúdio (usado pelo assistente IA).
 *  Não inclui referenceImage — é session-only (data URL binário), não sugerível via JSON. */
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
  emotion?: EmotionType;
  emotionIntensity?: number;
  imageTextLanguage?: Locale;
}
