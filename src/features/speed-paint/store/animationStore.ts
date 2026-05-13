/**
 * Store central de animação do Speed Paint.
 * Migrado de Konva/RAF para Remotion Player.
 */

import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/helpers';
import type { PaintingJob, QueuedImage } from '../types';

// ---------------------------------------------------------------------------
// Estado padrão dos novos campos
// ---------------------------------------------------------------------------

const DEFAULT_ANIMATION_DURATION = 15;
const DEFAULT_SHOW_DRAW_TOOL = true;
const DEFAULT_CANVAS_COLOR = 'white' as const;

// ---------------------------------------------------------------------------
// Interface do estado
// ---------------------------------------------------------------------------

interface AnimationState {
  job: PaintingJob;
  setJob: (job: Partial<PaintingJob>) => void;
  resetJob: () => void;

  // Batch processing
  queue: QueuedImage[];
  currentIndex: number;
  batchMode: 'idle' | 'watch' | 'record';
  setQueue: (queue: QueuedImage[] | ((prev: QueuedImage[]) => QueuedImage[])) => void;
  setCurrentIndex: (index: number) => void;
  setBatchMode: (mode: 'idle' | 'watch' | 'record') => void;
  clearQueue: () => void;
  reorderQueue: (oldIndex: number, newIndex: number) => void;
  removeFromQueue: (id: string) => void;

  // Velocidade da animação (derivada do PlayerRef, não do RAF)
  speed: number;
  paintSpeed: number;
  setSpeed: (speed: number) => void;
  setPaintSpeed: (speed: number) => void;

  // Configuração da composição Remotion
  animationDuration: number;
  setAnimationDuration: (duration: number) => void;
  showDrawTool: boolean;
  setShowDrawTool: (show: boolean) => void;
  canvasColor: 'white' | 'black';
  setCanvasColor: (color: 'white' | 'black') => void;
}

// ---------------------------------------------------------------------------
// Estado inicial do job
// ---------------------------------------------------------------------------

const initialJob: PaintingJob = {
  id: '',
  inputImage: '',
  status: 'idle',
  progress: 0,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAnimationStore = create<AnimationState>()((set) => ({
  job: initialJob,
  setJob: (jobUpdate) => set((state) => ({ job: { ...state.job, ...jobUpdate } })),
  resetJob: () => set({
    job: initialJob,
    animationDuration: DEFAULT_ANIMATION_DURATION,
    showDrawTool: DEFAULT_SHOW_DRAW_TOOL,
    canvasColor: DEFAULT_CANVAS_COLOR,
  }),

  queue: [],
  currentIndex: 0,
  batchMode: 'idle',
  setQueue: (queueUpdate) => set((state) => ({
    queue: typeof queueUpdate === 'function' ? queueUpdate(state.queue) : queueUpdate,
  })),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setBatchMode: (mode) => set({ batchMode: mode }),
  clearQueue: () => set({
    queue: [],
    currentIndex: 0,
    batchMode: 'idle',
    job: initialJob,
    animationDuration: DEFAULT_ANIMATION_DURATION,
    showDrawTool: DEFAULT_SHOW_DRAW_TOOL,
    canvasColor: DEFAULT_CANVAS_COLOR,
  }),
  reorderQueue: (oldIndex, newIndex) =>
    set((state) => {
      if (state.queue.length === 0) return state;
      if (oldIndex < 0 || oldIndex >= state.queue.length) return state;
      if (newIndex < 0 || newIndex >= state.queue.length) return state;
      return { queue: arrayMove(state.queue, oldIndex, newIndex) };
    }),
  removeFromQueue: (id) =>
    set((state) => {
      const index = state.queue.findIndex((img) => img.id === id);
      if (index === -1) return state;
      const newQueue = state.queue.filter((img) => img.id !== id);
      const newCurrentIndex =
        state.currentIndex >= newQueue.length
          ? Math.max(0, newQueue.length - 1)
          : index < state.currentIndex
            ? state.currentIndex - 1
            : state.currentIndex;
      return { queue: newQueue, currentIndex: newCurrentIndex };
    }),

  speed: 1,
  paintSpeed: 1,
  setSpeed: (speed) => set({ speed }),
  setPaintSpeed: (paintSpeed) => set({ paintSpeed }),

  // Configuração da composição Remotion
  animationDuration: DEFAULT_ANIMATION_DURATION,
  setAnimationDuration: (animationDuration) => set({ animationDuration }),
  showDrawTool: DEFAULT_SHOW_DRAW_TOOL,
  setShowDrawTool: (showDrawTool) => set({ showDrawTool }),
  canvasColor: DEFAULT_CANVAS_COLOR,
  setCanvasColor: (canvasColor) => set({ canvasColor }),
}));
