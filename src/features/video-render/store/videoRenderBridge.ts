import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Bridge Store — comunicação entre VideoPage (dono dos hooks) e App.tsx/ActionBar
// ---------------------------------------------------------------------------
// O objetivo deste store é evitar que useVideoExporter (que importa @remotion)
// seja carregado sincronamente no App.tsx. Os hooks vivem em VideoPage (rota
// lazy) e sincronizam apenas o estado mínimo necessário para a ActionBar.

interface VideoRenderBridgeState {
  // Estado do plano de edição
  isGeneratingPlan: boolean;
  isPlanDisabled: boolean;
  planError: string | null;

  // Estado do exportador de vídeo
  isExportingVideo: boolean;
  videoExportProgress: number;

  // Estado da transcrição
  isTranscribing: boolean;
  transcriptionProgress: number;
  transcriptionStatusText: string;

  // Callbacks de ação (registrados por VideoPage)
  generatePlanAction: (() => void) | null;
  clearPlanErrorAction: (() => void) | null;

  // Ações de sincronização
  syncPlanState: (generating: boolean, disabled: boolean, error: string | null) => void;
  syncExportState: (rendering: boolean, progress: number) => void;
  syncTranscriptionState: (transcribing: boolean, progress: number, statusText: string) => void;
  setGeneratePlanAction: (action: (() => void) | null) => void;
  setClearPlanErrorAction: (action: (() => void) | null) => void;
  dismissPlanError: () => void;
  resetBridge: () => void;
}

const INITIAL_BRIDGE_STATE = {
  isGeneratingPlan: false,
  isPlanDisabled: true,
  planError: null,
  isExportingVideo: false,
  videoExportProgress: 0,
  isTranscribing: false,
  transcriptionProgress: 0,
  transcriptionStatusText: '',
  generatePlanAction: null,
  clearPlanErrorAction: null,
};

export const useVideoRenderBridge = create<VideoRenderBridgeState>()((set) => ({
  ...INITIAL_BRIDGE_STATE,

  syncPlanState: (generating, disabled, error) =>
    set({ isGeneratingPlan: generating, isPlanDisabled: disabled, planError: error }),

  syncExportState: (rendering, progress) =>
    set({ isExportingVideo: rendering, videoExportProgress: progress }),

  syncTranscriptionState: (transcribing, progress, statusText) =>
    set({ isTranscribing: transcribing, transcriptionProgress: progress, transcriptionStatusText: statusText }),

  setGeneratePlanAction: (action) => set({ generatePlanAction: action }),

  setClearPlanErrorAction: (action) => set({ clearPlanErrorAction: action }),

  dismissPlanError: () => {
    const { clearPlanErrorAction } = useVideoRenderBridge.getState();
    clearPlanErrorAction?.();
    set({ planError: null });
  },

  resetBridge: () => set(INITIAL_BRIDGE_STATE),
}));
