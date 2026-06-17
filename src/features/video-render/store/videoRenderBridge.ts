import { create } from 'zustand';
import type { SpeedPaintRenderMode, VetorialPreset } from '../../speed-paint/types';

// ---------------------------------------------------------------------------
// Bridge Store — comunicação entre VideoPage (dono dos hooks) e App.tsx/ActionBar
// ---------------------------------------------------------------------------
// O objetivo deste store é evitar que useVideoExporter (que importa @remotion)
// seja carregado sincronamente no App.tsx. Os hooks vivem em VideoPage (rota
// lazy) e sincronizam apenas o estado mínimo necessário para a ActionBar.

interface VideoRenderBridgeState {
  // Estado do exportador de vídeo
  isExportingVideo: boolean;
  videoExportProgress: number;

  // Estado da transcrição
  isTranscribing: boolean;
  transcriptionProgress: number;
  transcriptionStatusText: string;

  // Estado do player (frame e reprodução)
  currentFrame: number;
  isPlaying: boolean;

  // Modo de renderização do Speed Paint (L7 / RF-06) — escopo de sessão:
  // sincronizado com `useAnimationStore` ao entrar na VideoPage; override
  // local não vaza para a SpeedPaintPage. Default `mask` preserva o
  // comportamento legado de projetos v0.131.0.
  renderMode: SpeedPaintRenderMode;
  /** Preset do `imagetracerjs` aplicado quando `renderMode === 'vetorial'`.
   *  Default `artistic1` alinha com `animationStore.DEFAULT_VETORIAL_PRESET`. */
  vetorialPreset: VetorialPreset;

  // Ações de sincronização
  syncExportState: (rendering: boolean, progress: number) => void;
  syncTranscriptionState: (transcribing: boolean, progress: number, statusText: string) => void;
  syncCurrentFrame: (frame: number) => void;
  syncIsPlaying: (playing: boolean) => void;
  /** Sincroniza modo + preset de uma só vez (chamado pela VideoPage ao montar
   *  a partir de `useAnimationStore`). Aceita literais de `SpeedPaintRenderMode`
   *  e `VetorialPreset` — type-narrowing automático na origem. */
  syncRenderMode: (mode: SpeedPaintRenderMode, preset: VetorialPreset) => void;
  resetBridge: () => void;
}

const INITIAL_BRIDGE_STATE = {
  isExportingVideo: false,
  videoExportProgress: 0,
  isTranscribing: false,
  transcriptionProgress: 0,
  transcriptionStatusText: '',
  currentFrame: 0,
  isPlaying: false,
  renderMode: 'mask' as SpeedPaintRenderMode,
  vetorialPreset: 'artistic1' as VetorialPreset,
};

export const useVideoRenderBridge = create<VideoRenderBridgeState>()((set) => ({
  ...INITIAL_BRIDGE_STATE,

  syncExportState: (rendering, progress) =>
    set({ isExportingVideo: rendering, videoExportProgress: progress }),

  syncTranscriptionState: (transcribing, progress, statusText) =>
    set({ isTranscribing: transcribing, transcriptionProgress: progress, transcriptionStatusText: statusText }),

  syncCurrentFrame: (frame) =>
    set({ currentFrame: frame }),

  syncIsPlaying: (playing) =>
    set({ isPlaying: playing }),

  syncRenderMode: (mode, preset) =>
    set({ renderMode: mode, vetorialPreset: preset }),

  resetBridge: () => set(INITIAL_BRIDGE_STATE),
}));
