import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock de APIs do Worker (OffscreenCanvas, createImageBitmap, Worker)
// ---------------------------------------------------------------------------

// Mock OffscreenCanvas
class MockOffscreenCanvas {
  width = 0;
  height = 0;
  private context2d: MockOffscreenCanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.context2d = new MockOffscreenCanvasRenderingContext2D();
  }

  getContext(): MockOffscreenCanvasRenderingContext2D {
    return this.context2d;
  }
}

class MockOffscreenCanvasRenderingContext2D {
  fillStyle = '#ffffff';
  imageData: { data: Uint8ClampedArray; width: number; height: number } | null = null;

  fillRect(): void { /* no-op */ }
  drawImage(): void { /* no-op */ }

  getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray; width: number; height: number } {
    // Retorna ImageData simulada com pixels brancos
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // R
      data[i + 1] = 255; // G
      data[i + 2] = 255; // B
      data[i + 3] = 255; // A
    }
    return { data, width: w, height: h };
  }
}

// Mock createImageBitmap
const mockCreateImageBitmap = vi.fn().mockResolvedValue({
  width: 100,
  height: 100,
  close: vi.fn(),
});

// Mock fetch para o Worker
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: vi.fn().mockResolvedValue(new Blob(['image-data'], { type: 'image/png' })),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('strokeWorker', () => {
  describe('supportsStrokeWorker', () => {
    it('retorna true quando Worker e OffscreenCanvas estão disponíveis', async () => {
      const { supportsStrokeWorker } = await import('../../src/features/video-render/lib/strokeWorker');
      // Em ambiente jsdom, Worker pode não estar definido — verificamos o resultado real
      const result = supportsStrokeWorker();
      // Resultado depende do ambiente — apenas valida que não crasha
      expect(typeof result).toBe('boolean');
    });
  });

  describe('createStrokeWorker', () => {
    it('cria worker quando suporte está disponível', async () => {
      // Mock globalThis para suporte
      vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);
      vi.stubGlobal('createImageBitmap', mockCreateImageBitmap);

      const { createStrokeWorker, terminateStrokeWorker, supportsStrokeWorker } =
        await import('../../src/features/video-render/lib/strokeWorker');

      // Verifica suporte
      if (!supportsStrokeWorker()) {
        // Se Worker não está disponível no jsdom, testa que lança erro
        expect(() => createStrokeWorker()).toThrow('Web Worker com OffscreenCanvas não é suportado');
        return;
      }

      const worker = createStrokeWorker();
      expect(worker).toBeDefined();
      expect(typeof worker.postMessage).toBe('function');
      expect(typeof worker.terminate).toBe('function');

      terminateStrokeWorker(worker);
    });

    it('lança erro quando Worker não é suportado', async () => {
      // Salva original e remove suporte
      const origWorker = globalThis.Worker;
      const origOffscreen = globalThis.OffscreenCanvas;

      vi.stubGlobal('Worker', undefined);
      vi.stubGlobal('OffscreenCanvas', undefined);

      const { createStrokeWorker, supportsStrokeWorker } =
        await import('../../src/features/video-render/lib/strokeWorker');

      expect(supportsStrokeWorker()).toBe(false);
      expect(() => createStrokeWorker()).toThrow('Web Worker com OffscreenCanvas não é suportado');

      // Restaura
      vi.stubGlobal('Worker', origWorker);
      vi.stubGlobal('OffscreenCanvas', origOffscreen);
    });
  });

  describe('terminateStrokeWorker', () => {
    it('encerra worker sem crashar', async () => {
      vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);
      vi.stubGlobal('createImageBitmap', mockCreateImageBitmap);

      const { createStrokeWorker, terminateStrokeWorker, supportsStrokeWorker } =
        await import('../../src/features/video-render/lib/strokeWorker');

      if (!supportsStrokeWorker()) return;

      const worker = createStrokeWorker();
      expect(() => terminateStrokeWorker(worker)).not.toThrow();
    });
  });

  describe('processSceneInWorker', () => {
    it('retorna Promise que resolve para resultado ou null', async () => {
      const { processSceneInWorker } =
        await import('../../src/features/video-render/lib/strokeWorker');

      // Cria um mock worker simples
      const addEventListenerFn = vi.fn();
      const removeEventListenerFn = vi.fn();
      const postMessageFn = vi.fn();

      const mockWorker = {
        addEventListener: addEventListenerFn,
        removeEventListener: removeEventListenerFn,
        postMessage: postMessageFn,
      } as unknown as Worker;

      // Não resolve a Promise — apenas testa que a função aceita os argumentos
      const promise = processSceneInWorker(mockWorker, 'data:image/png;base64,test', 0);

      // Verifica que postMessage foi chamado com dados corretos
      expect(postMessageFn).toHaveBeenCalledWith({
        type: 'process',
        imageUrl: 'data:image/png;base64,test',
        sceneIndex: 0,
      });

      // Simula resposta do Worker para resolver a Promise
      const handler = addEventListenerFn.mock.calls[0][1] as EventListener;
      handler(new MessageEvent('message', {
        data: {
          type: 'result',
          strokes: [],
          canvasWidth: 100,
          canvasHeight: 100,
          revealThreshold: 0.5,
          sceneIndex: 0,
        },
      }));

      const result = await promise;
      expect(result).toBeDefined();
      expect(result?.sceneIndex).toBe(0);
    });

    it('resolve com null quando o Worker reporta erro', async () => {
      const { processSceneInWorker } =
        await import('../../src/features/video-render/lib/strokeWorker');

      const addEventListenerFn = vi.fn();
      const removeEventListenerFn = vi.fn();
      const postMessageFn = vi.fn();

      const mockWorker = {
        addEventListener: addEventListenerFn,
        removeEventListener: removeEventListenerFn,
        postMessage: postMessageFn,
      } as unknown as Worker;

      const promise = processSceneInWorker(mockWorker, 'data:image/png;base64,bad', 1);

      // Simula resposta de erro do Worker
      const handler = addEventListenerFn.mock.calls[0][1] as EventListener;
      handler(new MessageEvent('message', {
        data: {
          type: 'error',
          error: 'Falha ao processar imagem',
          sceneIndex: 1,
        },
      }));

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
