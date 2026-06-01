import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do logger antes de importar o módulo que o usa
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

describe('canvasFontStretchPatch', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exporta patchCanvasFontStretch como função', async () => {
    const mod = await import('../../src/features/video-render/lib/canvasFontStretchPatch');
    expect(typeof mod.patchCanvasFontStretch).toBe('function');
  });

  it('patchCanvasFontStretch pode ser chamado sem erro', async () => {
    const { patchCanvasFontStretch } = await import('../../src/features/video-render/lib/canvasFontStretchPatch');
    expect(() => patchCanvasFontStretch()).not.toThrow();
  });

  it('patchCanvasFontStretch é idempotente', async () => {
    const { patchCanvasFontStretch } = await import('../../src/features/video-render/lib/canvasFontStretchPatch');
    // Primeira chamada
    patchCanvasFontStretch();
    // Segunda chamada deve ser no-op sem erro
    expect(() => patchCanvasFontStretch()).not.toThrow();
  });
});
