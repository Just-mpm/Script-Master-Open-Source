/**
 * Store Zustand — estado de geração de áudio TTS compartilhado globalmente.
 *
 * Resolve o bug de estado isolado entre App.tsx e VideoPage.tsx:
 * ambos agora leem/escrevem no mesmo store, garantindo que o áudio
 * gerado no estúdio esteja disponível na página de vídeo sem
 * instanciar o hook duas vezes.
 *
 * Padrão: interface + INITIAL_STATE + create + ações inline.
 * Sem immer, sem persist middleware.
 */

import { create } from 'zustand';
import type { AudioSegment } from '../../../lib/db/types';
import { calculateDurationFromWav } from '../../video-render/lib/videoUtils';
import { createLogger } from '../../../lib/logger';

const log = createLogger('audioGeneratorStore');

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type SceneItem = { imageUrl: string; timestamp: number };

export interface AudioGeneratorState {
  // Estado de geração
  isGenerating: boolean;
  statusText: string;
  generationProgress: number;
  error: string | null;
  sceneGenerationWarning: string | null;

  // Estado de resultado (compartilhado entre App e VideoPage)
  audioUrl: string | null;
  audioBlob: Blob | null;
  scenes: SceneItem[];
  audioSegments: AudioSegment[];
  projectId: string | null;
  audioDuration: number; // duração via metadados de URL (fallback)

  // ── Setters (usados pelo hook useAudioGenerator) ──
  setIsGenerating: (value: boolean) => void;
  setStatusText: (value: string) => void;
  setGenerationProgress: (value: number) => void;
  setError: (value: string | null) => void;
  setSceneGenerationWarning: (value: string | null) => void;
  setAudioUrl: (value: string | null) => void;
  setAudioBlob: (value: Blob | null) => void;
  setScenes: (value: SceneItem[]) => void;
  setAudioSegments: (value: AudioSegment[]) => void;
  setProjectId: (value: string | null) => void;
  setAudioDuration: (value: number) => void;

  // ── Ações compostas ──
  /** Carrega dados de um projeto (da biblioteca). Revoga blob URL anterior. */
  loadProjectData: (url: string, scenes: SceneItem[], audioBlob?: Blob, id?: string) => Promise<void>;
  /** Reseta todo o estado de geração e resultado */
  resetGeneration: () => void;
}

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

const INITIAL_STATE = {
  isGenerating: false,
  statusText: '',
  generationProgress: 0,
  error: null as string | null,
  sceneGenerationWarning: null as string | null,
  audioUrl: null as string | null,
  audioBlob: null as Blob | null,
  scenes: [] as SceneItem[],
  audioSegments: [] as AudioSegment[],
  projectId: null as string | null,
  audioDuration: 0,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAudioGeneratorStore = create<AudioGeneratorState>()((set, get) => ({
  ...INITIAL_STATE,

  // Setters
  setIsGenerating: (value) => set({ isGenerating: value }),
  setStatusText: (value) => set({ statusText: value }),
  setGenerationProgress: (value) => set({ generationProgress: value }),
  setError: (value) => set({ error: value }),
  setSceneGenerationWarning: (value) => set({ sceneGenerationWarning: value }),
  setAudioUrl: (value) => set({ audioUrl: value }),
  setAudioBlob: (value) => set({ audioBlob: value }),
  setScenes: (value) => set({ scenes: value }),
  setAudioSegments: (value) => set({ audioSegments: value }),
  setProjectId: (value) => set({ projectId: value }),
  setAudioDuration: (value) => set({ audioDuration: value }),

  // Ações compostas
  loadProjectData: async (url, scenesData, audioBlobData, id) => {
    const { audioUrl } = get();

    // Revoga blob URL anterior para evitar memory leak
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }

    set({
      audioUrl: url,
      scenes: scenesData,
      projectId: id ?? null,
      audioDuration: 0, // reseta duração ao carregar novo projeto
    });

    if (audioBlobData) {
      set({ audioBlob: audioBlobData });
    } else if (url) {
      if (url.startsWith('blob:')) {
        // Blob URL: fetch para obter blob (sem problema de CORS)
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          set({ audioBlob: blob });
        } catch (err) {
          log.warn('Falha ao buscar blob do áudio', { error: err });
        }
      } else {
        // URL externa (ex: Firebase Storage): usa <audio> para obter
        // a duração via loadedmetadata, sem baixar o arquivo inteiro
        const audio = new Audio();
        const handleLoaded = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            set({ audioDuration: audio.duration });
          }
          audio.removeEventListener('loadedmetadata', handleLoaded);
          audio.removeEventListener('error', handleError);
        };
        const handleError = () => {
          log.warn('Falha ao carregar metadados do áudio remoto — duração indisponível, a exportação de vídeo pode ser afetada');
          audio.removeEventListener('loadedmetadata', handleLoaded);
          audio.removeEventListener('error', handleError);
        };
        audio.addEventListener('loadedmetadata', handleLoaded);
        audio.addEventListener('error', handleError);
        audio.preload = 'metadata';
        audio.src = url;
      }
    }
  },

  resetGeneration: () => set(INITIAL_STATE),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Duração em segundos — prioriza blob WAV (tamanho exato), fallback para metadados de URL */
export function getAudioDurationSeconds(state: { audioBlob: Blob | null; audioDuration: number }): number {
  if (state.audioBlob && state.audioBlob.size > 44) {
    return calculateDurationFromWav(state.audioBlob.size, 24000);
  }
  return state.audioDuration;
}
