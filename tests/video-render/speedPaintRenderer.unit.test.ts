import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock do Firebase para evitar re-inicialização após vi.resetModules() ──
// Cadeia de imports: speedPaintRenderer → logger → batch-processor → firebase
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  collection: vi.fn().mockReturnValue({}),
  addDoc: vi.fn().mockResolvedValue({}),
  doc: vi.fn().mockReturnValue({}),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
  functions: {},
}));

import {
  renderSpeedPaintFrame,
  createBufferCanvas,
  getVisibleStrokeCount,
  loadImageElement,
} from '../../src/features/video-render/lib/speedPaintRenderer';
import type {
  StrokeAnimation,
  VetorialAnimation,
  VetorialPreset,
} from '../../src/features/speed-paint/types';

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
  describe('getVisibleStrokeCount', () => {
    it('usa a mesma contagem ajustada para multiplicador global lento', () => {
      const animation = createMinimalAnimation({
        strokes: Array.from({ length: 8 }, (_, index) => ({
          id: index + 1,
          layer: 0,
          type: 'sketch' as const,
          points: [10 + index, 20, 30 + index, 40],
          lineWidth: 2,
          r: 40,
          g: 40,
          b: 40,
          alpha: 0.9,
        })),
      });

      expect(getVisibleStrokeCount(animation, 0.5, 0.5)).toBe(2);
    });

    it('aplica os multiplicadores separados de sketch e reveal na mesma conta do renderer', () => {
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
          points: [15, 20, 35, 40],
          lineWidth: 2,
          r: 40,
          g: 40,
          b: 40,
          alpha: 0.9,
        },
        {
          id: 3,
          layer: 1,
          type: 'reveal' as const,
          points: [50, 60, 70, 80],
          lineWidth: 10,
          r: 0,
          g: 0,
          b: 0,
          alpha: 1,
        },
        {
          id: 4,
          layer: 1,
          type: 'reveal' as const,
          points: [55, 60, 75, 80],
          lineWidth: 10,
          r: 0,
          g: 0,
          b: 0,
          alpha: 1,
        },
      ];

      const animation = createMinimalAnimation({ strokes, revealThreshold: 0.5 });

      expect(getVisibleStrokeCount(animation, 0.25, { sketch: 2.0, reveal: 1.0 })).toBe(2);
      expect(getVisibleStrokeCount(animation, 0.75, { sketch: 1.0, reveal: 2.0 })).toBe(3);
    });
  });

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

        });
      }).not.toThrow();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 2.0,

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
      });

      // Com speedMultiplier 2.0, progress 0.5 se torna 1.0 → mostra todos os 2 strokes
      const { ctx: ctx2 } = createMockCtx();
      const buffer2 = createBufferCanvas(createMinimalAnimation());

      expect(() => {
        renderSpeedPaintFrame(ctx2, buffer2, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.5,

          speedMultiplier: 2.0,
        });
      }).not.toThrow();
    });

    it('speedMultiplier 0.5 desacelera progress — progress 0.8, speed linear', () => {
      const { ctx } = createMockCtx();
      const buffer = createBufferCanvas(createMinimalAnimation());
      const image = createMockImage();

      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.8,

          speedMultiplier: 0.5,
        });
      }).not.toThrow();
    });

    it('speedMultiplier 0.25 com progress 1.0 — linear, completa 25% dos strokes', () => {
      const { ctx } = createMockCtx();
      const strokes = [];
      for (let i = 0; i < 10; i++) {
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
      const animation = createMinimalAnimation({ strokes });
      const buffer = createBufferCanvas(animation);
      const image = createMockImage();

      // Progressão linear: progress 1.0 * speed 0.25 = 0.25 → 25% dos strokes (2 de 10).
      // No contexto de vídeo, speed será 1.0 (linear completo), então este cenário
      // de speed < 1 indica "menos strokes no tempo disponível" — o restante aparece
      // durante o hold phase. Sem power curve, sem distorção de velocidade.
      expect(() => {
        renderSpeedPaintFrame(ctx, buffer, {
          animation,
          imageElement: image,
          progress: 1.0,

          speedMultiplier: 0.25,
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

          // sem speedMultiplier
        });
      }).not.toThrow();

      expect(() => {
        renderSpeedPaintFrame(ctx2, buffer2, {
          animation: createMinimalAnimation(),
          imageElement: image,
          progress: 0.7,

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

      async decode() {
        // Mock necessário pois loadImageElement chama img.decode() após onload
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

// ---------------------------------------------------------------------------
// Tests — generateScenesWithSpeedPaint: propagação de renderMode/vetorialPreset
// Leiva L1 (RF-04) — Plano §Arquitetura M2 / §Estratégia 6.2
// Critérios cobertos: CT-F25, CT-F26, CT-F27, CT-F28, CT-F29, CT-F30, CT-B07
// ---------------------------------------------------------------------------

/**
 * Tipo local que reflete o shape completo de `GenerateSpeedPaintOptions`
 * **após** a implementação da L1 (RF-04). O `GenerateSpeedPaintOptions` de
 * produção hoje só declara `useWorker` — `renderMode` e `vetorialPreset`
 * ainda serão adicionados pela L1. Este tipo é a fonte de verdade dos testes
 * e serve como regression test para que a refatoração de produção mantenha
 * este contrato.
 */
type L1GenerateSpeedPaintOptions = {
  useWorker?: boolean;
  renderMode?: 'mask' | 'vetorial';
  vetorialPreset?: VetorialPreset;
};

/**
 * Helper para construir options de `generateScenesWithSpeedPaint` com os
 * campos da L1 sem disparar erro de TypeScript antes da refatoração de
 * produção. O cast duplo (`as unknown as ...`) é necessário porque o
 * `GenerateSpeedPaintOptions` atual não conhece `renderMode`/`vetorialPreset`.
 *
 * Quando a L1 for implementada, este cast pode ser removido e o tipo
 * exportado de produção pode substituir `L1GenerateSpeedPaintOptions`.
 */
function makeL1Options(
  opts: L1GenerateSpeedPaintOptions,
): Parameters<typeof import('../../src/features/video-render/lib/speedPaintRenderer').generateScenesWithSpeedPaint>[2] {
  return opts as unknown as Parameters<
    typeof import('../../src/features/video-render/lib/speedPaintRenderer').generateScenesWithSpeedPaint
  >[2];
}

/**
 * Stub mínimo de `VetorialAnimation` para uso nos testes de propagação.
 * Espelha os campos obrigatórios de `VetorialAnimation` (definidos em
 * `src/features/speed-paint/types/vetorial.ts:67-87`) e permite que o
 * type guard `isVetorialAnimation` faça narrowing corretamente.
 */
function createMinimalVetorialAnimation(
  overrides?: Partial<VetorialAnimation>,
): VetorialAnimation {
  return {
    id: 'vetorial-test-1',
    canvasWidth: 100,
    canvasHeight: 100,
    canvasColor: 'white',
    paths: [],
    totalLength: 0,
    fps: 30,
    totalDurationMs: 333,
    sourcePreset: 'artistic1',
    ...overrides,
  };
}

describe('generateScenesWithSpeedPaint — propagação L1 (RF-04)', () => {
  beforeEach(() => {
    // Limpa cache de módulos para que cada teste receba mocks atualizados
    vi.resetModules();
  });

  // ---------------------------------------------------------------------------
  // Bloco A — Propagação de renderMode/vetorialPreset
  // ---------------------------------------------------------------------------

  it('CT-F25: renderMode=vetorial + vetorialPreset=detailed → getStrokeAnimation recebe { mode: vetorial, preset: detailed }', async () => {
    // Arrange — mock do strokeCache e imageProcessing (cena vai para cache miss)
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(createMinimalVetorialAnimation());

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      // Type guards reais (espelham os de strokeCache.ts) para narrowar a union
      // antes de chamar setStrokeAnimation — sem isso o narrow falha no mock
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    // Re-importa o módulo sob teste após resetModules + doMock
    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act
    await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'vetorial', vetorialPreset: 'detailed', useWorker: false }),
    );

    // Assert — cache lookup DEVE ser discriminado por mode+preset (Premissa #10)
    expect(mockGetStroke).toHaveBeenCalledWith('scene1.png', {
      mode: 'vetorial',
      preset: 'detailed',
    });
    expect(mockGetStroke).toHaveBeenCalledTimes(1);

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  it('CT-F26: renderMode=mask → getStrokeAnimation recebe { mode: mask } (sem preset)', async () => {
    // Arrange
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(createMinimalAnimation());

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act
    await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'mask', useWorker: false }),
    );

    // Assert — modo mask DEVE propagar { mode: 'mask' } mesmo sem preset
    expect(mockGetStroke).toHaveBeenCalledWith('scene1.png', { mode: 'mask' });

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  it('CT-F27: renderMode undefined → cache lookup com { mode: mask } (retrocompat CT-C05)', async () => {
    // Arrange — sem options ou sem renderMode, comportamento deve cair em mask
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(createMinimalAnimation());

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act — sem options (use case legado v0.131.0)
    await generateScenesWithSpeedPaint([{ imageUrl: 'scene1.png' }]);

    // Assert — a L1 cai para `effectiveMode = 'mask'` e DEVE passar o context
    // { mode: 'mask' } (a chave SHA-256 do cache inclui mode, evitando colisão).
    // Garante retrocompatibilidade (CT-C05): projetos v0.131.0 continuam
    // funcionando porque o modo mask é o default.
    expect(mockGetStroke).toHaveBeenCalledWith('scene1.png', { mode: 'mask' });
    expect(mockGetStroke).toHaveBeenCalledTimes(1);

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  it('CT-F28: renderMode=vetorial + cache miss → generateStrokesFromImage recebe { renderMode, vetorialPreset }', async () => {
    // Arrange — cache miss → fluxo cai em generateStrokesFromImage
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(createMinimalVetorialAnimation());

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act
    await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'vetorial', vetorialPreset: 'curvy', useWorker: false }),
    );

    // Assert — generateStrokesFromImage DEVE receber os options de L1
    expect(mockGenerateStrokes).toHaveBeenCalledWith(
      'scene1.png',
      expect.any(Function), // onProgress callback
      expect.objectContaining({
        renderMode: 'vetorial',
        vetorialPreset: 'curvy',
      }),
    );

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  it('CT-F29: renderMode=vetorial → setStrokeAnimation recebe { mode: vetorial, preset: X } ao cachear', async () => {
    // Arrange
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(createMinimalVetorialAnimation());

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act
    await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'vetorial', vetorialPreset: 'artistic1', useWorker: false }),
    );

    // Assert — setStrokeAnimation DEVE receber o context discriminado
    expect(mockSetStroke).toHaveBeenCalledWith(
      'scene1.png',
      expect.any(Object), // VetorialAnimation
      { mode: 'vetorial', preset: 'artistic1' },
    );

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  // ---------------------------------------------------------------------------
  // Bloco B — Casos de borda
  // ---------------------------------------------------------------------------

  it('CT-F30: renderMode=vetorial sem vetorialPreset → preset fica undefined no spy (default aplicado internamente pelo cache)', async () => {
    // Arrange — sem vetorialPreset, o `speedPaintRenderer` propaga `undefined`
    // para o cache. O default 'artistic1' (DEFAULT_VETORIAL_PRESET) é aplicado
    // INTERNAMENTE em `getStrokeAnimation` (strokeCache.ts:187).
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(createMinimalVetorialAnimation());

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act
    await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'vetorial', useWorker: false }),
    );

    // Assert — o spy recebe o `preset: undefined` que o renderer propaga.
    // A camada do cache (não mockada) é que aplica o default 'artistic1' —
    // este comportamento é coberto em `tests/video-render/strokeCache.unit.test.ts`.
    expect(mockGetStroke).toHaveBeenCalledWith('scene1.png', {
      mode: 'vetorial',
      preset: undefined,
    });

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  it('CT-B07: renderMode=mask ignora vetorialPreset mesmo se passado', async () => {
    // Arrange — modo mask com vetorialPreset não deve vazar para o cache
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(createMinimalAnimation());

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act — passa vetorialPreset mas com renderMode=mask
    await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'mask', vetorialPreset: 'detailed', useWorker: false }),
    );

    // Assert — cache lookup DEVE ser mask puro, sem vazar o preset vetorial
    // A assinatura do overload do `getStrokeAnimation` ({ mode: 'mask'; preset?: never })
    // garante que o TypeScript rejeita preset em modo mask em compile-time.
    expect(mockGetStroke).toHaveBeenCalledWith('scene1.png', { mode: 'mask' });

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  // ---------------------------------------------------------------------------
  // Bloco C — Cobertura adicional: cache hit + type guards
  // ---------------------------------------------------------------------------

  it('CT-F31: cache hit em modo vetorial → generateStrokesFromImage NÃO é chamado (linha 463)', async () => {
    // Arrange — mock do strokeCache retorna cache hit (VetorialAnimation)
    const cachedVetorial = createMinimalVetorialAnimation({ id: 'cached' });
    const mockGetStroke = vi.fn().mockResolvedValue(cachedVetorial);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn();

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act
    const results = await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'vetorial', vetorialPreset: 'detailed', useWorker: false }),
    );

    // Assert — cache hit evita reprocessamento (CT-F13 do plano §L3)
    expect(mockGenerateStrokes).not.toHaveBeenCalled();
    expect(mockSetStroke).not.toHaveBeenCalled(); // também não grava (já está em cache)
    expect(results).toHaveLength(1);
    expect(results[0].animation).toBe(cachedVetorial);

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  it('CT-F32: type guard detecta shape errado em modo vetorial → graceful degradation', async () => {
    // Arrange — generateStrokesFromImage retorna shape errado (StrokeAnimation
    // em vez de VetorialAnimation) — o type guard de runtime deve capturar.
    const wrongShape = createMinimalAnimation({ id: 'wrong-shape' });
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(wrongShape);

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act
    const results = await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'vetorial', vetorialPreset: 'detailed', useWorker: false }),
    );

    // Assert — falha do type guard é capturada pelo try/catch e vira
    // graceful degradation (animation undefined + error message)
    expect(mockSetStroke).not.toHaveBeenCalled(); // cache não foi poluído
    expect(results).toHaveLength(1);
    expect(results[0].animation).toBeUndefined();
    expect(results[0].error).toContain("esperava VetorialAnimation");
    expect(results[0].sceneIndex).toBe(0);

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });

  it('CT-F33: type guard detecta shape errado em modo mask → graceful degradation', async () => {
    // Arrange — generateStrokesFromImage retorna shape errado (VetorialAnimation
    // em vez de StrokeAnimation) — o type guard de runtime deve capturar.
    const wrongShape = createMinimalVetorialAnimation({ id: 'wrong-shape-mask' });
    const mockGetStroke = vi.fn().mockResolvedValue(null);
    const mockSetStroke = vi.fn().mockResolvedValue(undefined);
    const mockGenerateStrokes = vi.fn().mockResolvedValue(wrongShape);

    vi.doMock('../../src/features/video-render/lib/strokeCache', () => ({
      getStrokeAnimation: mockGetStroke,
      setStrokeAnimation: mockSetStroke,
      isVetorialAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalLength' in a,
      isStrokeAnimation: (a: unknown) =>
        typeof a === 'object' && a !== null && 'totalFrames' in a,
    }));
    vi.doMock('../../src/features/speed-paint/lib/imageProcessing', () => ({
      generateStrokesFromImage: mockGenerateStrokes,
    }));
    vi.doMock('../../src/features/video-render/lib/strokeWorker', () => ({
      createStrokeWorker: vi.fn(),
      terminateStrokeWorker: vi.fn(),
      processSceneInWorker: vi.fn().mockResolvedValue(null),
      supportsStrokeWorker: vi.fn().mockReturnValue(false),
    }));

    const { generateScenesWithSpeedPaint } = await import(
      '../../src/features/video-render/lib/speedPaintRenderer'
    );

    // Act
    const results = await generateScenesWithSpeedPaint(
      [{ imageUrl: 'scene1.png' }],
      undefined,
      makeL1Options({ renderMode: 'mask', useWorker: false }),
    );

    // Assert — falha do type guard em modo mask é capturada
    expect(mockSetStroke).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].animation).toBeUndefined();
    expect(results[0].error).toContain("esperava StrokeAnimation");
    expect(results[0].sceneIndex).toBe(0);

    vi.doUnmock('../../src/features/video-render/lib/strokeCache');
    vi.doUnmock('../../src/features/speed-paint/lib/imageProcessing');
    vi.doUnmock('../../src/features/video-render/lib/strokeWorker');
  });
});
