/**
 * Store central de animação do Speed Paint.
 */

import { create } from 'zustand';
import type { PaintingJob, QueuedImage } from '../types';

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

  // Player state
  isPlaying: boolean;
  progress: number; // 0 to 1
  speed: number;
  paintSpeed: number;
  setIsPlaying: (isPlaying: boolean) => void;
  setProgress: (progress: number) => void;
  setSpeed: (speed: number) => void;
  setPaintSpeed: (speed: number) => void;

  // Auto-play control
  hasAutoPlayed: boolean;
  setHasAutoPlayed: (value: boolean) => void;
  resetAutoPlay: () => void;
}

const initialJob: PaintingJob = {
  id: '',
  inputImage: '',
  status: 'idle',
  progress: 0,
};

export const useAnimationStore = create<AnimationState>()((set) => ({
  job: initialJob,
  setJob: (jobUpdate) => set((state) => ({ job: { ...state.job, ...jobUpdate } })),
  resetJob: () => set({ job: initialJob, isPlaying: false, progress: 0, hasAutoPlayed: false }),

  queue: [],
  currentIndex: 0,
  batchMode: 'idle',
  setQueue: (queueUpdate) => set((state) => ({
    queue: typeof queueUpdate === 'function' ? queueUpdate(state.queue) : queueUpdate,
  })),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setBatchMode: (mode) => set({ batchMode: mode }),
  clearQueue: () => set({ queue: [], currentIndex: 0, batchMode: 'idle', job: initialJob, isPlaying: false, progress: 0, hasAutoPlayed: false }),

  isPlaying: false,
  progress: 0,
  speed: 1,
  paintSpeed: 1,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progress) => set({ progress }),
  setSpeed: (speed) => set({ speed }),
  setPaintSpeed: (paintSpeed) => set({ paintSpeed }),

  // Auto-play: controla se a reprodução automática já foi disparada para o job atual
  hasAutoPlayed: false,
  setHasAutoPlayed: (value) => set({ hasAutoPlayed: value }),
  resetAutoPlay: () => set({ hasAutoPlayed: false }),
}));
