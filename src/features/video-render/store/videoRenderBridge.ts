import { create } from 'zustand';

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

  // Ações de sincronização
  syncExportState: (rendering: boolean, progress: number) => void;
  syncTranscriptionState: (transcribing: boolean, progress: number, statusText: string) => void;
  resetBridge: () => void;
}

const INITIAL_BRIDGE_STATE = {
  isExportingVideo: false,
  videoExportProgress: 0,
  isTranscribing: false,
  transcriptionProgress: 0,
  transcriptionStatusText: '',
};

export const useVideoRenderBridge = create<VideoRenderBridgeState>()((set) => ({
  ...INITIAL_BRIDGE_STATE,

  syncExportState: (rendering, progress) =>
    set({ isExportingVideo: rendering, videoExportProgress: progress }),

  syncTranscriptionState: (transcribing, progress, statusText) =>
    set({ isTranscribing: transcribing, transcriptionProgress: progress, transcriptionStatusText: statusText }),

  resetBridge: () => set(INITIAL_BRIDGE_STATE),
}));
