import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';
import type { PaintingJob, QueuedImage } from '../../src/features/speed-paint/types';

describe('animationStore', () => {
  beforeEach(() => {
    // Reset store para estado inicial antes de cada teste
    useAnimationStore.getState().resetJob();
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().setSpeed(1);
    useAnimationStore.getState().setPaintSpeed(1);
    useAnimationStore.getState().setAnimationDuration(15);
    useAnimationStore.getState().setShowDrawTool(true);
    useAnimationStore.getState().setCanvasColor('white');
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

    it('não tem origem de fila inicialmente', () => {
      const { queueSource, queueSourceProjectName } = useAnimationStore.getState();
      expect(queueSource).toBeNull();
      expect(queueSourceProjectName).toBeNull();
    });

    it('tem speed e paintSpeed padrão 1', () => {
      const { speed, paintSpeed } = useAnimationStore.getState();
      expect(speed).toBe(1);
      expect(paintSpeed).toBe(1);
    });

    it('tem animationDuration padrão 15', () => {
      const { animationDuration } = useAnimationStore.getState();
      expect(animationDuration).toBe(15);
    });

    it('tem showDrawTool padrão true', () => {
      const { showDrawTool } = useAnimationStore.getState();
      expect(showDrawTool).toBe(true);
    });

    it('tem canvasColor padrão white', () => {
      const { canvasColor } = useAnimationStore.getState();
      expect(canvasColor).toBe('white');
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

    it('reseta animationDuration, showDrawTool, canvasColor junto', () => {
      useAnimationStore.getState().setAnimationDuration(30);
      useAnimationStore.getState().setShowDrawTool(false);
      useAnimationStore.getState().setCanvasColor('black');
      useAnimationStore.getState().resetJob();

      const { animationDuration, showDrawTool, canvasColor } = useAnimationStore.getState();
      expect(animationDuration).toBe(15);
      expect(showDrawTool).toBe(true);
      expect(canvasColor).toBe('white');
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
    it('reseta queue, currentIndex, batchMode, job, animationDuration, showDrawTool, canvasColor', () => {
      const items: QueuedImage[] = [
        { id: '1', dataUrl: 'url1', filename: 'img1.png', status: 'pending' },
      ];
      useAnimationStore.getState().setQueue(items);
      useAnimationStore.getState().setCurrentIndex(1);
      useAnimationStore.getState().setBatchMode('watch');
      useAnimationStore.getState().setJob({ id: 'job-1', status: 'processing' });
      useAnimationStore.getState().setAnimationDuration(30);
      useAnimationStore.getState().setShowDrawTool(false);
      useAnimationStore.getState().setCanvasColor('black');

      useAnimationStore.getState().clearQueue();

      const state = useAnimationStore.getState();
      expect(state.queue).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.batchMode).toBe('idle');
      expect(state.job.id).toBe('');
      expect(state.animationDuration).toBe(15);
      expect(state.showDrawTool).toBe(true);
      expect(state.canvasColor).toBe('white');
    });

    it('revoga blob URLs temporárias ao limpar a fila', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

      useAnimationStore.getState().setQueue([
        {
          id: '1',
          dataUrl: 'blob:temp-url',
          filename: 'img1.png',
          status: 'pending',
          shouldRevokeObjectUrl: true,
        },
      ]);

      useAnimationStore.getState().clearQueue();

      expect(revokeSpy).toHaveBeenCalledWith('blob:temp-url');
      revokeSpy.mockRestore();
    });
  });

  describe('loadLibraryQueue', () => {
    it('carrega fila pronta com metadados de origem', () => {
      const queue: QueuedImage[] = [
        { id: '1', dataUrl: 'blob:item-1', filename: 'img1.png', status: 'pending', shouldRevokeObjectUrl: true },
      ];

      useAnimationStore.getState().loadLibraryQueue(queue, 'Projeto Biblioteca', 'Aviso parcial');

      const state = useAnimationStore.getState();
      expect(state.queue).toEqual(queue);
      expect(state.currentIndex).toBe(0);
      expect(state.batchMode).toBe('idle');
      expect(state.queueSource).toBe('library');
      expect(state.queueSourceProjectName).toBe('Projeto Biblioteca');
      expect(state.queueSourceNotice).toBe('Aviso parcial');
    });

    it('revoga blob URLs antigos ao substituir a fila por outra da biblioteca', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

      useAnimationStore.getState().setQueue([
        {
          id: 'old-1',
          dataUrl: 'blob:old-item',
          filename: 'old.png',
          status: 'pending',
          shouldRevokeObjectUrl: true,
        },
      ]);

      useAnimationStore.getState().loadLibraryQueue([
        {
          id: 'new-1',
          dataUrl: 'blob:new-item',
          filename: 'new.png',
          status: 'pending',
          shouldRevokeObjectUrl: true,
        },
      ], 'Novo Projeto');

      expect(revokeSpy).toHaveBeenCalledWith('blob:old-item');
      revokeSpy.mockRestore();
    });
  });

  describe('config da composição Remotion', () => {
    it('setSpeed altera speed', () => {
      useAnimationStore.getState().setSpeed(4);
      expect(useAnimationStore.getState().speed).toBe(4);
    });

    it('setPaintSpeed altera paintSpeed', () => {
      useAnimationStore.getState().setPaintSpeed(8);
      expect(useAnimationStore.getState().paintSpeed).toBe(8);
    });

    it('setAnimationDuration altera animationDuration', () => {
      useAnimationStore.getState().setAnimationDuration(30);
      expect(useAnimationStore.getState().animationDuration).toBe(30);
    });

    it('setShowDrawTool altera showDrawTool', () => {
      useAnimationStore.getState().setShowDrawTool(false);
      expect(useAnimationStore.getState().showDrawTool).toBe(false);
    });

    it('setCanvasColor altera canvasColor', () => {
      useAnimationStore.getState().setCanvasColor('black');
      expect(useAnimationStore.getState().canvasColor).toBe('black');
    });
  });

  describe('reorderQueue', () => {
    it('reordena itens da fila', () => {
      useAnimationStore.getState().setQueue([
        { id: 'a', dataUrl: 'data:1', filename: '1.png', status: 'pending' },
        { id: 'b', dataUrl: 'data:2', filename: '2.png', status: 'pending' },
        { id: 'c', dataUrl: 'data:3', filename: '3.png', status: 'pending' },
      ]);
      useAnimationStore.getState().reorderQueue(0, 2);
      expect(useAnimationStore.getState().queue.map((q) => q.id)).toEqual(['b', 'c', 'a']);
    });

it('não altera fila quando oldIndex === newIndex', () => {
       useAnimationStore.getState().setQueue([
         { id: 'a', dataUrl: 'data:1', filename: '1.png', status: 'pending' },
         { id: 'b', dataUrl: 'data:2', filename: '2.png', status: 'pending' },
       ]);
       useAnimationStore.getState().reorderQueue(1, 1);
       expect(useAnimationStore.getState().queue.map((q) => q.id)).toEqual(['a', 'b']);
     });

     it('não altera fila vazia', () => {
       useAnimationStore.getState().clearQueue();
       useAnimationStore.getState().reorderQueue(0, 1);
       expect(useAnimationStore.getState().queue).toEqual([]);
     });
   });

   describe('removeFromQueue', () => {
     it('remove o item correto e não altera currentIndex quando item removido está antes', () => {
       useAnimationStore.getState().setQueue([
         { id: 'a', dataUrl: 'data:1', filename: '1.png', status: 'pending' },
         { id: 'b', dataUrl: 'data:2', filename: '2.png', status: 'pending' },
         { id: 'c', dataUrl: 'data:3', filename: '3.png', status: 'pending' },
       ]);
       useAnimationStore.getState().setCurrentIndex(2);
       useAnimationStore.getState().removeFromQueue('a');
       const { queue, currentIndex } = useAnimationStore.getState();
       expect(queue.map((q) => q.id)).toEqual(['b', 'c']);
       expect(currentIndex).toBe(1); // ajustado: 2 → 1 porque 'a' (índice 0) era < currentIndex
     });

     it('não ajusta currentIndex quando item removido está depois', () => {
       useAnimationStore.getState().setQueue([
         { id: 'a', dataUrl: 'data:1', filename: '1.png', status: 'pending' },
         { id: 'b', dataUrl: 'data:2', filename: '2.png', status: 'pending' },
         { id: 'c', dataUrl: 'data:3', filename: '3.png', status: 'pending' },
       ]);
       useAnimationStore.getState().setCurrentIndex(0);
       useAnimationStore.getState().removeFromQueue('c');
       const { queue, currentIndex } = useAnimationStore.getState();
       expect(queue.map((q) => q.id)).toEqual(['a', 'b']);
       expect(currentIndex).toBe(0);
     });

     it('atualiza currentIndex para último item se ele estava apontando para além da fila', () => {
       useAnimationStore.getState().setQueue([
         { id: 'a', dataUrl: 'data:1', filename: '1.png', status: 'pending' },
       ]);
       useAnimationStore.getState().setCurrentIndex(0);
       useAnimationStore.getState().removeFromQueue('a');
       const { queue, currentIndex } = useAnimationStore.getState();
       expect(queue).toEqual([]);
       expect(currentIndex).toBe(0); // Math.max(0, 0 - 1) → 0
     });

     it('não faz nada se o id não existe na fila', () => {
       useAnimationStore.getState().setQueue([
         { id: 'a', dataUrl: 'data:1', filename: '1.png', status: 'pending' },
       ]);
       useAnimationStore.getState().removeFromQueue('inexistente');
       expect(useAnimationStore.getState().queue).toHaveLength(1);
     });

     it('revoga blob URL ao remover item temporário da fila', () => {
       const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

       useAnimationStore.getState().setQueue([
         { id: 'temp', dataUrl: 'blob:temp-item', filename: '1.png', status: 'pending', shouldRevokeObjectUrl: true },
       ]);

       useAnimationStore.getState().removeFromQueue('temp');

       expect(revokeSpy).toHaveBeenCalledWith('blob:temp-item');
       revokeSpy.mockRestore();
     });
   });
});
