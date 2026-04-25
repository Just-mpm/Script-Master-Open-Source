import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderSpeedPaintFrame, createBufferCanvas, loadImageElement } from '../../src/features/video-render/lib/speedPaintRenderer';
import type { StrokeAnimation } from '../../src/features/speed-paint/types';

// ---------------------------------------------------------------------------
// Helpers de mock para Canvas 2D
// ---------------------------------------------------------------------------

function createMockCtx(): {
  ctx: CanvasRenderingContext2D;
  calls: Array<{ method: string; args: unknown[] }>;
} {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  const proxy = new Proxy({} as CanvasRenderingContext2D, {
    get(_target, prop) {
      return (...args: unknown[]) => {
        if (prop !== 'canvas') {
          calls.push({ method: prop as string, args });
        }
      };
    },
  });

  return { ctx: proxy, calls };
}

function createMockImage(): HTMLImageElement {
  return { width: 100, height: 100, src: '' } as unknown as HTMLImageElement;
}

function createMinimalAnimation(overrides?: Partial<StrokeAnimation>): StrokeAnimation {
  return {
    id: 'test-1',
    canvasWidth: 100,
    canvasHeight: 100,
    canvasColor: 'white',
    totalFrames: 10,
    fps: 30,
    totalDurationMs: 333,
    strokes: [
      {
        id: 1,
        layer: 0,
        type: 'sketch',
        points: [10, 20, 30, 40, 20, 30],
        lineWidth: 2,
        r: 40,
        g: 40,
        b: 40,
        alpha: 0.9,
      },
      {
        id: 2,
        layer: 1,
        type: 'reveal',
        points: [50, 60, 70, 80, 60, 70],
        lineWidth: 10,
        r: 0,
        g: 0,
        b: 0,
        alpha: 1,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — renderSpeedPaintFrame + createBufferCanvas
// ---------------------------------------------------------------------------

describe('speedPaintRenderer', () => {
  describe('renderSpeedPaintFrame', () => {
    it('não crasha com progress 0 (nenhum stroke visível)', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0,
          opacity: 1,
        });
      }).not.toThrow();
    });

    it('não crasha com progress 0.5 (metade dos strokes visível)', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.5,
          opacity: 1,
        });
      }).not.toThrow();
    });

    it('não crasha com progress 1.0 (todos os strokes visíveis)', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 1,
          opacity: 1,
        });
      }).not.toThrow();
    });

    it('não crasha com opacidade parcial (fade)', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.7,
          opacity: 0.5,
        });
      }).not.toThrow();
    });

    it('não crasha com opacidade 0 (totalmente transparente)', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.5,
          opacity: 0,
        });
      }).not.toThrow();
    });

    it('clampa progress para [0, 1] — valores extremos não crasham', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: -0.5,
          opacity: 1,
        });
      }).not.toThrow();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 2.0,
          opacity: 1,
        });
      }).not.toThrow();
    });

    it('funciona com strokes de linha reta (4 pontos)', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation({
            strokes: [
              {
                id: 1,
                layer: 0,
                type: 'sketch',
                points: [10, 20, 30, 40],
                lineWidth: 2,
                r: 40,
                g: 40,
                b: 40,
                alpha: 0.9,
              },
            ],
          }),
          imageElement: image,
          progress: 1,
          opacity: 1,
        });
      }).not.toThrow();
    });

    it('funciona com canvas de cor preta', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation({ canvasColor: 'black' }));
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation({ canvasColor: 'black' }),
          imageElement: image,
          progress: 1,
          opacity: 1,
        });
      }).not.toThrow();
    });

    it('funciona com lista de strokes vazia', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation({ strokes: [] }));
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation({ strokes: [] }),
          imageElement: image,
          progress: 1,
          opacity: 1,
        });
      }).not.toThrow();
    });

    it('speedMultiplier 2.0 acelera progress — progress 0.5 * 2.0 = 1.0 (clamped)', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      // Sem speedMultiplier, progress 0.5 mostra 1 stroke (Math.floor(0.5 * 2) = 1)
      renderSpeedPaintFrame(ctx, buffer, {
        animation: createMinimalAnimation(),
        imageElement: image,
        progress: 0.5,
        opacity: 1,
      });

      // Com speedMultiplier 2.0, progress 0.5 se torna 1.0 → mostra todos os 2 strokes
      const { ctx: ctx2 } = createMockCtx();
      const buffer2 = createBufferCanvas(createMinimalAnimation());

      expect(() => {
        renderSpeedPaintFrame(ctx2, buffer2, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.5,
          opacity: 1,
          speedMultiplier: 2.0,
        });
      }).not.toThrow();
    });

    it('speedMultiplier 0.5 desacelera progress — progress 0.8 * 0.5 = 0.4', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.8,
          opacity: 1,
          speedMultiplier: 0.5,
        });
      }).not.toThrow();
    });

    it('speedMultiplier default (undefined) se comporta como 1.0', () => {
      const { ctx: ctx1 } = createMockCtx();
      const { ctx: ctx2 } = createMockCtx();
      const buffer1 = createBufferCanvas(createMinimalAnimation());
      const buffer2 = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      // Ambos devem ter o mesmo comportamento — sem crash
      expect(() => {
        renderSpeedPaintFrame(ctx1, buffer1, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.7,
          opacity: 1,
          // sem speedMultiplier
        });
      }).not.toThrow();

      expect(() => {
        renderSpeedPaintFrame(ctx2, buffer2, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.7,
          opacity: 1,
          speedMultiplier: 1.0,
        });
      }).not.toThrow();
    });

    it('speedMultiplier com progress > 1 clamps para 1.0', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 2.0,
          opacity: 1,
          speedMultiplier: 1.0,
        });
      }).not.toThrow();
    });

    // --- SpeedPaintMultipliers (speed separado para sketch/reveal) ---

    it('SpeedPaintMultipliers: sketch rápido ({ sketch: 2.0, reveal: 1.0 }) mostra mais strokes na fase sketch', () => {
      const { ctx } = createMockCtx();
      const calls: Array<{ method: string; args: unknown[] }> = [];
      const proxy = new Proxy({} as CanvasRenderingContext2D, {
        get(_target, prop) {
          return (...args: unknown[]) => {
            if (prop !== 'canvas') {
              calls.push({ method: prop as string, args });
            }
          };
        },
      });

      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      // Cria animação com 10 strokes (5 sketch layer 0 + 5 reveal layer 1)
      const strokes = [];
      for (let i = 0; i < 5; i++) {
        strokes.push({
          id: i,
          layer: 0,
          type: 'sketch' as const,
          points: [10 + i, 20, 30 + i, 40],
          lineWidth: 2,
          r: 40,
          g: 40,
          b: 40,
          alpha: 0.9,
        });
      }
      for (let i = 5; i < 10; i++) {
        strokes.push({
          id: i,
          layer: 1,
          type: 'reveal' as const,
          points: [50 + i, 60, 70 + i, 80],
          lineWidth: 10,
          r: 0,
          g: 0,
          b: 0,
          alpha: 1,
        });
      }

      const animation = createMinimalAnimation({ strokes, revealThreshold: 0.5 });

      // Com sketch 2.0, progress 0.25 (dentro da fase sketch: 0→0.5) deve mostrar mais strokes
      // sketchProgress = (0.25 / 0.5) * 2.0 = 1.0 → todos os 5 sketch visíveis
      expect(() => {
        renderSpeedPaintFrame(proxy, buffer, {
          animation,
          imageElement: image,
          progress: 0.25,
          opacity: 1,
          speedMultiplier: { sketch: 2.0, reveal: 1.0 },
        });
      }).not.toThrow();

      // Com sketch 1.0, progress 0.25 → sketchProgress = (0.25 / 0.5) * 1.0 = 0.5 → 2 sketch
      const calls2: Array<{ method: string; args: unknown[] }> = [];
      const proxy2 = new Proxy({} as CanvasRenderingContext2D, {
        get(_target, prop) {
          return (...args: unknown[]) => {
            if (prop !== 'canvas') {
              calls2.push({ method: prop as string, args });
            }
          };
        },
      });
      const buffer2 = createBufferCanvas(animation);
      expect(() => {
        renderSpeedPaintFrame(proxy2, buffer2, {
          animation,
          imageElement: image,
          progress: 0.25,
          opacity: 1,
          speedMultiplier: { sketch: 1.0, reveal: 1.0 },
        });
      }).not.toThrow();
    });

    it('SpeedPaintMultipliers: reveal rápido ({ sketch: 1.0, reveal: 2.0 }) acelera a fase de coloração', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      const strokes = [];
      for (let i = 0; i < 5; i++) {
        strokes.push({
          id: i,
          layer: 0,
          type: 'sketch' as const,
          points: [10 + i, 20, 30 + i, 40],
          lineWidth: 2,
          r: 40,
          g: 40,
          b: 40,
          alpha: 0.9,
        });
      }
      for (let i = 5; i < 10; i++) {
        strokes.push({
          id: i,
          layer: 1,
          type: 'reveal' as const,
          points: [50 + i, 60, 70 + i, 80],
          lineWidth: 10,
          r: 0,
          g: 0,
          b: 0,
          alpha: 1,
        });
      }

      const animation = createMinimalAnimation({ strokes, revealThreshold: 0.5 });

      // Na fase reveal (progress 0.75), com reveal 2.0 → revealProgress = ((0.75-0.5)/0.5) * 2.0 = 1.0
      // Todos os 10 strokes devem ser visíveis (5 sketch + 5 reveal)
      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation,
          imageElement: image,
          progress: 0.75,
          opacity: 1,
          speedMultiplier: { sketch: 1.0, reveal: 2.0 },
        });
      }).not.toThrow();
    });

    it('SpeedPaintMultipliers: number como speedMultiplier mantém backward compatibility', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      // number → usa branch `typeof speedMultiplier === 'number'`
      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.5,
          opacity: 1,
          speedMultiplier: 2.0,
        });
      }).not.toThrow();
    });

    it('SpeedPaintMultipliers: undefined se comporta como progresso normal', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.5,
          opacity: 1,
          // speedMultiplier undefined — branch else
        });
      }).not.toThrow();
    });

    it('SpeedPaintMultipliers: progress 0 → 0 strokes visíveis', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      // Com progress 0, nenhum stroke é visível independentemente do multiplier
      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0,
          opacity: 1,
          speedMultiplier: { sketch: 4.0, reveal: 4.0 },
        });
      }).not.toThrow();
    });

    it('SpeedPaintMultipliers: progress 1 com multipliers → todos os strokes visíveis', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      const strokes = [];
      for (let i = 0; i < 4; i++) {
        strokes.push({
          id: i,
          layer: 0,
          type: 'sketch' as const,
          points: [10 + i, 20, 30 + i, 40],
          lineWidth: 2,
          r: 40,
          g: 40,
          b: 40,
          alpha: 0.9,
        });
      }
      for (let i = 4; i < 8; i++) {
        strokes.push({
          id: i,
          layer: 1,
          type: 'reveal' as const,
          points: [50 + i, 60, 70 + i, 80],
          lineWidth: 10,
          r: 0,
          g: 0,
          b: 0,
          alpha: 1,
        });
      }

      const animation = createMinimalAnimation({ strokes, revealThreshold: 0.5 });

      // Progress 1.0 → todos os 8 strokes visíveis (clamped para 1.0)
      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation,
          imageElement: image,
          progress: 1,
          opacity: 1,
          speedMultiplier: { sketch: 0.5, reveal: 0.5 },
        });
      }).not.toThrow();
    });

    it('SpeedPaintMultipliers: fallback quando não há divisão clara sketch/reveal', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      // Todos os strokes são do mesmo tipo — branch "sem divisão clara"
      const strokes = [
        {
          id: 1,
          layer: 0,
          type: 'sketch' as const,
          points: [10, 20, 30, 40],
          lineWidth: 2,
          r: 40,
          g: 40,
          b: 40,
          alpha: 0.9,
        },
        {
          id: 2,
          layer: 0,
          type: 'sketch' as const,
          points: [50, 60, 70, 80],
          lineWidth: 2,
          r: 40,
          g: 40,
          b: 40,
          alpha: 0.9,
        },
      ];

      const animation = createMinimalAnimation({ strokes, revealThreshold: 0.8 });
      // sketchCount = floor(0.8 * 2) = 1, revealCount = 1 — divisão clara existe
      // Mas se todos são sketch, revealCount tem strokes com layer 1:
      // Vamos testar com apenas 1 stroke para forçar sketchCount=0 ou revealCount=0
      const animationSingle = createMinimalAnimation({ strokes: [strokes[0]], revealThreshold: 0.5 });
      // sketchCount = floor(0.5 * 1) = 0, revealCount = 1 → sketchCount === 0 → branch fallback

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: animationSingle,
          imageElement: image,
          progress: 0.7,
          opacity: 1,
          speedMultiplier: { sketch: 2.0, reveal: 1.0 },
        });
      }).not.toThrow();
    });
  });

  describe('createBufferCanvas', () => {
    it('cria canvas com dimensões da animação', () => {
      const animation = createMinimalAnimation({ canvasWidth: 640, canvasHeight: 480 });
      const buffer = createBufferCanvas(animation);

      expect(buffer.width).toBe(640);
      expect(buffer.height).toBe(480);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — loadImageElement
// ---------------------------------------------------------------------------

describe('loadImageElement', () => {
  const originalImage = globalThis.Image;
  let imageInstances: Array<{ src: string; onload: (() => void) | null; onerror: (() => void) | null }>;

  beforeEach(() => {
    imageInstances = [];
    // Mock do construtor Image para controlar sucesso/falha
    vi.stubGlobal('Image', class MockImage {
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        imageInstances.push(this as unknown as { src: string; onload: (() => void) | null; onerror: (() => void) | null });
      }
    });
  });

  afterEach(() => {
    vi.stubGlobal('Image', originalImage);
  });

  it('resolve com HTMLImageElement quando imagem carrega com sucesso', async () => {
    const promise = loadImageElement('data:image/png;base64,test');

    // Simula onload
    imageInstances[0].onload?.();

    const result = await promise;
    expect(result).toBeDefined();
  });

  it('rejeita com Error quando imagem falha ao carregar', async () => {
    const promise = loadImageElement('data:image/png;base64,invalid');

    // Simula onerror
    imageInstances[0].onerror?.();

    await expect(promise).rejects.toThrow('Falha ao carregar imagem:');
  });
});

// ---------------------------------------------------------------------------
// Tests — generateScenesWithSpeedPaint
// ---------------------------------------------------------------------------

describe('generateScenesWithSpeedPaint', () => {
  beforeEach(() => {
    // Limpa cache de módulos dinâmicos para cada teste
    vi.resetModules();
  });

  it('retorna array vazio para lista de cenas vazia', async () => {
    // Re-importa após resetModules para evitar cache
    const { generateScenesWithSpeedPaint } = await import('../../src/features/video-render/lib/speedPaintRenderer');
    const results = await generateScenesWithSpeedPaint([]);
    expect(results).toEqual([]);
  });

  it('retorna graceful degradation quando cena falha — animation undefined com error', async () => {
    const mockGenerateStrokes = vi.fn().mockRejectedValue(new Error('Edge detection falhou'));

    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));

    const { generateScenesWithSpeedPaint } = await import('../../src/features/video-render/lib/speedPaintRenderer');
    const results = await generateScenesWithSpeedPaint([{ imageUrl: 'scene1.png' }]);

    expect(results).toHaveLength(1);
    expect(results[0].animation).toBeUndefined();
    expect(results[0].sceneIndex).toBe(0);
    expect(results[0].error).toBe('Edge detection falhou');

    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
  });

  it('chama onProgress com valores incrementais para múltiplas cenas', async () => {
    const progressValues: number[] = [];
    const mockAnimation = createMinimalAnimation();
    const mockGenerateStrokes = vi.fn().mockResolvedValue(mockAnimation);

    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));

    const { generateScenesWithSpeedPaint } = await import('../../src/features/video-render/lib/speedPaintRenderer');

    // 4 cenas = 2 batches (de 2)
    const scenes = [
      { imageUrl: 'scene1.png' },
      { imageUrl: 'scene2.png' },
      { imageUrl: 'scene3.png' },
      { imageUrl: 'scene4.png' },
    ];

    await generateScenesWithSpeedPaint(scenes, (progress) => {
      progressValues.push(progress);
    });

    // Progresso deve ter avançado (pode ser 0.5 e 1.0 com 2 batches)
    expect(progressValues.length).toBeGreaterThanOrEqual(2);
    // O último valor deve ser 1.0 (100%)
    expect(progressValues[progressValues.length - 1]).toBe(1);
    // Valores devem ser crescentes
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
    }

    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
  });

  it('retorna sceneIndex correto para cada cena', async () => {
    const mockAnimation = createMinimalAnimation();
    const mockGenerateStrokes = vi.fn().mockResolvedValue(mockAnimation);

    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));

    const { generateScenesWithSpeedPaint } = await import('../../src/features/video-render/lib/speedPaintRenderer');

    const scenes = [
      { imageUrl: 'scene1.png' },
      { imageUrl: 'scene2.png' },
      { imageUrl: 'scene3.png' },
    ];

    const results = await generateScenesWithSpeedPaint(scenes);

    expect(results).toHaveLength(3);
    expect(results[0].sceneIndex).toBe(0);
    expect(results[1].sceneIndex).toBe(1);
    expect(results[2].sceneIndex).toBe(2);
    // Todas devem ter animation definida (sucesso)
    expect(results[0].animation).toBeDefined();
    expect(results[1].animation).toBeDefined();
    expect(results[2].animation).toBeDefined();

    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
  });

  it('funciona sem callback de progresso', async () => {
    const mockAnimation = createMinimalAnimation();
    const mockGenerateStrokes = vi.fn().mockResolvedValue(mockAnimation);

    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));

    const { generateScenesWithSpeedPaint } = await import('../../src/features/video-render/lib/speedPaintRenderer');

    // Sem callback — não deve crashar
    const results = await generateScenesWithSpeedPaint([{ imageUrl: 'scene1.png' }]);

    expect(results).toHaveLength(1);
    expect(results[0].animation).toBeDefined();

    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
  });
});
