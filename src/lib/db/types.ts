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

export interface ProjectSettings {
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
  customSystemPrompt: string;
  updatedAt: number;
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
}
