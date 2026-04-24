import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';
import type { PaintingJob, QueuedImage } from '../../src/features/speed-paint/types';

describe('animationStore', () => {
  beforeEach(() => {
    // Reset store para estado inicial antes de cada teste
    useAnimationStore.getState().resetJob();
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().setIsPlaying(false);
    useAnimationStore.getState().setProgress(0);
    useAnimationStore.getState().setSpeed(1);
    useAnimationStore.getState().setPaintSpeed(1);
    useAnimationStore.getState().setHasAutoPlayed(false);
  });

  describe('estado inicial', () => {
    it('tem job com valores padrão', () => {
      const { job } = useAnimationStore.getState();
      expect(job).toEqual({
        id: '',
        inputImage: '',
        status: 'idle',
        progress: 0,
      });
    });

    it('tem queue vazio e currentIndex 0', () => {
      const { queue, currentIndex } = useAnimationStore.getState();
      expect(queue).toEqual([]);
      expect(currentIndex).toBe(0);
    });

    it('tem batchMode idle', () => {
      const { batchMode } = useAnimationStore.getState();
      expect(batchMode).toBe('idle');
    });

    it('tem isPlaying false e progress 0', () => {
      const { isPlaying, progress } = useAnimationStore.getState();
      expect(isPlaying).toBe(false);
      expect(progress).toBe(0);
    });

    it('tem speed e paintSpeed padrão 1', () => {
      const { speed, paintSpeed } = useAnimationStore.getState();
      expect(speed).toBe(1);
      expect(paintSpeed).toBe(1);
    });

    it('tem hasAutoPlayed false', () => {
      const { hasAutoPlayed } = useAnimationStore.getState();
      expect(hasAutoPlayed).toBe(false);
    });
  });

  describe('setJob', () => {
    it('faz merge parcial no job existente', () => {
      useAnimationStore.getState().setJob({ id: 'job-1' });
      useAnimationStore.getState().setJob({ status: 'processing' });

      const { job } = useAnimationStore.getState();
      expect(job.id).toBe('job-1');
      expect(job.status).toBe('processing');
      expect(job.inputImage).toBe(''); // preservado do inicial
    });

    it('aceita animation no merge', () => {
      const animation = {
        id: 'anim-1',
        canvasWidth: 100,
        canvasHeight: 100,
        canvasColor: 'white' as const,
        totalFrames: 10,
        fps: 60,
        totalDurationMs: 1000,
        strokes: [],
      };

      useAnimationStore.getState().setJob({ animation, status: 'completed' });

      const { job } = useAnimationStore.getState();
      expect(job.animation).toEqual(animation);
      expect(job.status).toBe('completed');
    });

    it('aceita inputImage e progress juntos', () => {
      useAnimationStore.getState().setJob({
        inputImage: 'data:image/png;base64,abc',
        progress: 0.5,
        status: 'processing',
      });

      const { job } = useAnimationStore.getState();
      expect(job.inputImage).toBe('data:image/png;base64,abc');
      expect(job.progress).toBe(0.5);
      expect(job.status).toBe('processing');
    });
  });

  describe('resetJob', () => {
    it('reseta job para estado inicial', () => {
      useAnimationStore.getState().setJob({ id: 'job-1', status: 'processing', progress: 0.5 });
      useAnimationStore.getState().resetJob();

      const { job } = useAnimationStore.getState();
      expect(job).toEqual({
        id: '',
        inputImage: '',
        status: 'idle',
        progress: 0,
      });
    });

    it('reseta isPlaying, progress e hasAutoPlayed junto', () => {
      useAnimationStore.getState().setIsPlaying(true);
      useAnimationStore.getState().setProgress(0.7);
      useAnimationStore.getState().setHasAutoPlayed(true);
      useAnimationStore.getState().resetJob();

      const { isPlaying, progress, hasAutoPlayed } = useAnimationStore.getState();
      expect(isPlaying).toBe(false);
      expect(progress).toBe(0);
      expect(hasAutoPlayed).toBe(false);
    });
  });

  describe('setQueue', () => {
    it('substitui queue com array', () => {
      const items: QueuedImage[] = [
        { id: '1', dataUrl: 'url1', filename: 'img1.png', status: 'pending' },
        { id: '2', dataUrl: 'url2', filename: 'img2.png', status: 'pending' },
      ];

      useAnimationStore.getState().setQueue(items);

      const { queue } = useAnimationStore.getState();
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBe('1');
    });

    it('aceita callback para atualizar queue', () => {
      const items: QueuedImage[] = [
        { id: '1', dataUrl: 'url1', filename: 'img1.png', status: 'pending' },
      ];
      useAnimationStore.getState().setQueue(items);

      useAnimationStore.getState().setQueue((prev) => [
        ...prev,
        { id: '2', dataUrl: 'url2', filename: 'img2.png', status: 'pending' },
      ]);

      const { queue } = useAnimationStore.getState();
      expect(queue).toHaveLength(2);
      expect(queue[1].id).toBe('2');
    });

    it('callback recebe estado anterior corretamente', () => {
      useAnimationStore.getState().setQueue((prev) => {
        expect(prev).toEqual([]);
        return prev;
      });
    });
  });

  describe('setCurrentIndex', () => {
    it('atualiza currentIndex', () => {
      useAnimationStore.getState().setCurrentIndex(5);
      expect(useAnimationStore.getState().currentIndex).toBe(5);
    });

    it('aceita 0', () => {
      useAnimationStore.getState().setCurrentIndex(10);
      useAnimationStore.getState().setCurrentIndex(0);
      expect(useAnimationStore.getState().currentIndex).toBe(0);
    });
  });

  describe('setBatchMode', () => {
    it('aceita "watch"', () => {
      useAnimationStore.getState().setBatchMode('watch');
      expect(useAnimationStore.getState().batchMode).toBe('watch');
    });

    it('aceita "record"', () => {
      useAnimationStore.getState().setBatchMode('record');
      expect(useAnimationStore.getState().batchMode).toBe('record');
    });

    it('retorna para "idle"', () => {
      useAnimationStore.getState().setBatchMode('watch');
      useAnimationStore.getState().setBatchMode('idle');
      expect(useAnimationStore.getState().batchMode).toBe('idle');
    });
  });

  describe('clearQueue', () => {
    it('reseta queue, currentIndex, batchMode, job, isPlaying, progress, hasAutoPlayed', () => {
      const items: QueuedImage[] = [
        { id: '1', dataUrl: 'url1', filename: 'img1.png', status: 'pending' },
      ];
      useAnimationStore.getState().setQueue(items);
      useAnimationStore.getState().setCurrentIndex(1);
      useAnimationStore.getState().setBatchMode('watch');
      useAnimationStore.getState().setJob({ id: 'job-1', status: 'processing' });
      useAnimationStore.getState().setIsPlaying(true);
      useAnimationStore.getState().setProgress(0.5);
      useAnimationStore.getState().setHasAutoPlayed(true);

      useAnimationStore.getState().clearQueue();

      const state = useAnimationStore.getState();
      expect(state.queue).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.batchMode).toBe('idle');
      expect(state.job.id).toBe('');
      expect(state.isPlaying).toBe(false);
      expect(state.progress).toBe(0);
      expect(state.hasAutoPlayed).toBe(false);
    });
  });

  describe('player state', () => {
    it('setIsPlaying altera isPlaying', () => {
      useAnimationStore.getState().setIsPlaying(true);
      expect(useAnimationStore.getState().isPlaying).toBe(true);
      useAnimationStore.getState().setIsPlaying(false);
      expect(useAnimationStore.getState().isPlaying).toBe(false);
    });

    it('setProgress altera progress', () => {
      useAnimationStore.getState().setProgress(0.5);
      expect(useAnimationStore.getState().progress).toBe(0.5);
      useAnimationStore.getState().setProgress(1);
      expect(useAnimationStore.getState().progress).toBe(1);
    });

    it('setSpeed altera speed', () => {
      useAnimationStore.getState().setSpeed(4);
      expect(useAnimationStore.getState().speed).toBe(4);
    });

    it('setPaintSpeed altera paintSpeed', () => {
      useAnimationStore.getState().setPaintSpeed(8);
      expect(useAnimationStore.getState().paintSpeed).toBe(8);
    });
  });

  describe('hasAutoPlayed', () => {
    it('setHasAutoPlayed altera o valor', () => {
      useAnimationStore.getState().setHasAutoPlayed(true);
      expect(useAnimationStore.getState().hasAutoPlayed).toBe(true);
    });

    it('resetAutoPlay reseta para false', () => {
      useAnimationStore.getState().setHasAutoPlayed(true);
      useAnimationStore.getState().resetAutoPlay();
      expect(useAnimationStore.getState().hasAutoPlayed).toBe(false);
    });
  });
});
