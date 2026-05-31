export interface SavedAudioScene {
  imageUrl: string;
  timestamp: number;
}

export interface SavedAudio {
  id: string;
  userId?: string;
  name: string;
  createdAt: number;
  audioBlob?: Blob;
  audioUrl?: string;
  script: string;
  voice: string;
  scenes?: SavedAudioScene[];
}

interface ProjectSettings {
  selectedVoice: string;
  pace: string;
  styleNotes: string;
  isMultiSpeaker: boolean;
  speakerAName: string;
  speakerBName: string;
  speakerBVoice: string;
  audioProfile: string;
  scene: string;
  sceneDensity: number;
  sceneRatio: string;
  visualFramework?: string;
  emotion?: string;
  emotionIntensity?: number;
}

export interface Project {
  id: string;
  userId?: string;
  name: string;
  script: string;
  createdAt: number;
  settings: ProjectSettings;
}

export interface AudioSource {
  id: string;
  projectId: string;
  userId?: string;
  audioUrl: string;
  createdAt: number;
  audioBlob?: Blob;
  /** Mapeamento chunk→timestamp do áudio gerado */
  audioSegments?: AudioSegment[];
}

export interface ProjectImage {
  id: string;
  projectId: string;
  userId?: string;
  imageUrl: string;
  prompt: string;
  timestamp: number;
  createdAt: number;
  imageBlob?: Blob;
}

export interface Memory {
  id: string;
  userId?: string;
  content: string;
  createdAt: number;
}

export interface SavedImage {
  id: string;
  userId?: string;
  name: string;
  imageUrl?: string;
  prompt: string;
  createdAt: number;
  imageBlob?: Blob;
  aspectRatio: string;
}

export interface UserSetting {
  id: string;
  userId?: string;
  name?: string;
  role?: string;
  goals?: string[];
  customSystemPrompt: string;
  updatedAt: number;
  // Preferências do estúdio (opcionais — sincronizadas via Firestore)
  selectedVoice?: string;
  isMultiSpeaker?: boolean;
  speakerAName?: string;
  speakerBName?: string;
  speakerBVoice?: string;
  audioProfile?: string;
  scene?: string;
  pace?: string;
  styleNotes?: string;
  generateScenes?: boolean;
  sceneRatio?: string;
  sceneDensity?: number;
  visualFramework?: string;
  emotion?: string;
  emotionIntensity?: number;
  imageTextLanguage?: string;
}

export interface AttachmentRecord {
  mimeType: string;
  data: string;
  name?: string;
}

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: AttachmentRecord[];
}

export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  messages: ChatMessageRecord[];
  updatedAt: number;
  /** Plano de tarefas ativo (persistido para resiliência a reload) */
  activePlan?: import('../../features/assistant/types').AssistantPlan;
  /** Entrevista pendente (persistida para resiliência a reload) */
  pendingInterview?: import('../../features/assistant/types').InterviewDatum;
  /** Histórico completo do Genkit (MessageData[]) — preserva tool calls/responses entre mensagens */
  fullHistory?: unknown[];
}

// ⚠️ DUPLICADO: Esta interface também existe em functions/src/flows/audio.ts (AudioSegment local).
// Qualquer mudança nos campos deve ser sincronizada entre ambos.
/** Segmento de áudio gerado a partir de um chunk do roteiro.
 *  Permite reconstruir o mapeamento texto→tempo sem depender de Whisper. */
export interface AudioSegment {
  /** Texto do roteiro enviado ao TTS para este chunk */
  text: string;
  /** Timestamp de início em segundos (relativo ao áudio final) */
  startSec: number;
  /** Timestamp de fim em segundos */
  endSec: number;
  /** Índice do chunk na sequência de geração */
  chunkIndex: number;
}

export interface ProjectVideo {
  id: string;
  projectId: string;
  userId: string;
  videoUrl: string;
  format: 'mp4' | 'webm';
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  fileSizeBytes: number;
  createdAt: number;
  /** Blob local para IndexedDB (não persistido no Firestore) */
  videoBlob?: Blob;
}
