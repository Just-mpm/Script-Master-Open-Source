/**
 * Store central de animação do Speed Paint.
 *
 * TECH DEBT (hasAutoPlayed):
 * O estado `hasAutoPlayed` é resetado indiretamente pela mudança de `job.id`.
 * Isso funciona porque cada novo job gera um id único, mas é frágil — qualquer
 * lógica que reutilize o mesmo id ou não atualize job.id corretamente pode burlar
 * o reset. Futuramente, considerar um campo `hasAutoPlayed` explícito no store
 * com reset controlado por uma ação dedicada (ex: `resetAutoPlay()`).
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
  resetJob: () => set({ job: initialJob, isPlaying: false, progress: 0 }),

  queue: [],
  currentIndex: 0,
  batchMode: 'idle',
  setQueue: (queueUpdate) => set((state) => ({
    queue: typeof queueUpdate === 'function' ? queueUpdate(state.queue) : queueUpdate,
  })),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setBatchMode: (mode) => set({ batchMode: mode }),
  clearQueue: () => set({ queue: [], currentIndex: 0, batchMode: 'idle', job: initialJob, isPlaying: false, progress: 0 }),

  isPlaying: false,
  progress: 0,
  speed: 1,
  paintSpeed: 1,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progress) => set({ progress }),
  setSpeed: (speed) => set({ speed }),
  setPaintSpeed: (paintSpeed) => set({ paintSpeed }),
}));
