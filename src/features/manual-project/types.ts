/**
 * Tipos da feature "Projeto Manual" — wizard para criar projetos
 * a partir de áudio e imagens próprios do usuário, sem uso de IA.
 *
 * Esta feature produz um `Project` indistinguível de um gerado
 * pelo estúdio: mesma estrutura de dados, mesmo dual storage
 * (Firestore + IndexedDB), mesmo suporte a Speed Paint e Vídeo.
 */

/** Limite de tamanho do áudio no wizard (defesa em profundidade) */
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50MB

/** Limite de tamanho por imagem (defesa em profundidade) */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

/** Quantidade máxima de imagens por projeto manual */
export const MAX_IMAGES = 30;

/** Duração mínima de áudio em segundos (evita áudios vazios) */
export const MIN_AUDIO_DURATION_SEC = 1;

/** Dimensões mínimas de imagem (largura x altura) */
export const MIN_IMAGE_DIMENSION = 50;

/** Formatos aceitos para áudio */
export const ACCEPTED_AUDIO_MIMES = [
  'audio/mpeg', // .mp3
  'audio/mp3', // .mp3 (alguns browsers)
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4', // .m4a
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
] as const;

/** Formatos aceitos para imagem */
export const ACCEPTED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Item de áudio carregado no wizard (pré-persistência) */
export interface AudioUploadItem {
  /** ID local (gerado no cliente, diferente do ID do Firestore) */
  localId: string;
  /** Arquivo original selecionado */
  file: File;
  /** Blob URL para preview no player */
  previewUrl: string;
  /** Duração detectada via decodeAudioData (segundos) */
  durationSec: number;
  /** MIME do arquivo (já validado) */
  mimeType: string;
  /** Tamanho em bytes (já validado) */
  sizeBytes: number;
}

/** Item de imagem carregada no wizard (pré-persistência) */
export interface ImageUploadItem {
  /** ID local (gerado no cliente) */
  localId: string;
  /** Arquivo original selecionado */
  file: File;
  /** Blob URL para preview no grid */
  previewUrl: string;
  /** Largura detectada (pixels) */
  width: number;
  /** Altura detectada (pixels) */
  height: number;
  /** MIME do arquivo (já validado) */
  mimeType: string;
  /** Tamanho em bytes (já validado) */
  sizeBytes: number;
}

/** Estado de validação de áudio/imagem */
export type ValidationState =
  | { kind: 'idle' }
  | { kind: 'validating' }
  | { kind: 'valid' }
  | { kind: 'invalid'; error: ValidationErrorKind; message: string };

/** Categorias de erro de validação */
export type ValidationErrorKind =
  | 'invalid_mime'
  | 'too_large'
  | 'decode_failed'
  | 'too_short'
  | 'too_small_dimensions'
  | 'empty_file'
  | 'unknown';

/** Resultado de validação de arquivo */
export interface ValidationResult {
  ok: boolean;
  errorKind?: ValidationErrorKind;
  errorMessage?: string;
}

/** Estado completo do rascunho do wizard */
export interface ManualProjectDraft {
  /** Nome do projeto (obrigatório, ≥3 chars) */
  name: string;
  /** Roteiro/script opcional (string vazia se não fornecido) */
  script: string;
  /** Áudio carregado (no máximo 1) */
  audio: AudioUploadItem | null;
  /** Imagens carregadas e ordenadas (ordem = posição no vídeo) */
  images: ImageUploadItem[];
  /** Validação corrente do áudio */
  audioValidation: ValidationState;
  /** Validação corrente de cada imagem (indexada por localId) */
  imageValidations: Record<string, ValidationState>;
}

/** Categorias de erro do save */
export type SaveErrorKind =
  | 'project_save_failed'
  | 'audio_save_failed'
  | 'image_save_failed'
  | 'permission_denied'
  | 'unauthenticated'
  | 'unknown';

/** Resultado de save do projeto manual */
export interface ManualProjectSaveResult {
  ok: boolean;
  projectId?: string;
  errorKind?: SaveErrorKind;
  errorMessage?: string;
}

/** Ações do reducer do wizard */
export type ManualProjectAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_SCRIPT'; script: string }
  | { type: 'SET_AUDIO_VALIDATION'; state: ValidationState }
  | { type: 'SET_IMAGE_VALIDATION'; localId: string; state: ValidationState }
  | { type: 'ADD_AUDIO'; item: AudioUploadItem }
  | { type: 'REMOVE_AUDIO' }
  | { type: 'ADD_IMAGES'; items: ImageUploadItem[] }
  | { type: 'REMOVE_IMAGE'; localId: string }
  | { type: 'MOVE_IMAGE'; fromIndex: number; toIndex: number }
  | { type: 'RESET' };

/** Interface pública do hook `useManualProject` */
export interface UseManualProjectReturn {
  /** Estado atual do draft */
  draft: ManualProjectDraft;
  /** Valida e adiciona um arquivo de áudio; substitui o atual */
  addAudio: (file: File) => Promise<void>;
  /** Remove o áudio atual e revoga o blob URL */
  removeAudio: () => void;
  /** Valida e adiciona múltiplas imagens (libera event loop entre cada) */
  addImages: (files: File[]) => Promise<void>;
  /** Remove uma imagem e revoga o blob URL */
  removeImage: (localId: string) => void;
  /** Move uma imagem de uma posição para outra.
   *  `totalCount` é usado para telemetria do evento `images_reordered`. */
  moveImage: (fromIndex: number, toIndex: number, totalCount: number) => void;
  /** Atualiza o nome do projeto */
  setName: (name: string) => void;
  /** Atualiza o script (pode ser vazio) */
  setScript: (script: string) => void;
  /** Limpa todo o estado */
  reset: () => void;
  /** Indica se o passo atual pode avançar (mínimo: nome + áudio + ≥1 imagem) */
  canAdvance: boolean;
  /** Indica se o save está em andamento */
  isSaving: boolean;
  /** Salva o projeto: project → audio → images (sequencial) */
  save: (userId: string) => Promise<ManualProjectSaveResult>;
}
