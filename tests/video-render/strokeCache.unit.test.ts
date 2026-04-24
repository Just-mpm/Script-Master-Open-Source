import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStrokeAnimation,
  setStrokeAnimation,
  clearStrokeCache,
  getStrokeCacheStats,
} from '../../src/features/video-render/lib/strokeCache';
import type { StrokeAnimation } from '../../src/features/speed-paint/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMinimalAnimation(overrides?: Partial<StrokeAnimation>): StrokeAnimation {
  return {
    id: 'cache-test-1',
    canvasWidth: 100,
    canvasHeight: 100,
    canvasColor: 'white',
    totalFrames: 10,
    fps: 30,
    totalDurationMs: 333,
    strokes: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('strokeCache', () => {
  beforeEach(() => {
    clearStrokeCache();
  });

  describe('setStrokeAnimation + getStrokeAnimation', () => {
    it('cache hit — retorna a animação armazenada', async () => {
      const animation = createMinimalAnimation({ id: 'hit-test' });

      await setStrokeAnimation('https://example.com/image1.jpg', animation);
      const result = await getStrokeAnimation('https://example.com/image1.jpg');

      expect(result).toBeDefined();
      expect(result?.id).toBe('hit-test');
      expect(result?.canvasWidth).toBe(100);
    });

    it('cache miss — retorna null para URL não armazenada', async () => {
      const result = await getStrokeAnimation('https://example.com/unknown.jpg');
      expect(result).toBeNull();
    });

    it('URLs diferentes geram chaves diferentes', async () => {
      const animation1 = createMinimalAnimation({ id: 'img-a' });
      const animation2 = createMinimalAnimation({ id: 'img-b' });

      await setStrokeAnimation('https://example.com/a.jpg', animation1);
      await setStrokeAnimation('https://example.com/b.jpg', animation2);

      const resultA = await getStrokeAnimation('https://example.com/a.jpg');
      const resultB = await getStrokeAnimation('https://example.com/b.jpg');

      expect(resultA?.id).toBe('img-a');
      expect(resultB?.id).toBe('img-b');
    });

    it('sobrescreve entrada existente para mesma URL', async () => {
      const animation1 = createMinimalAnimation({ id: 'v1' });
      const animation2 = createMinimalAnimation({ id: 'v2' });

      await setStrokeAnimation('https://example.com/same.jpg', animation1);
      await setStrokeAnimation('https://example.com/same.jpg', animation2);

      const result = await getStrokeAnimation('https://example.com/same.jpg');
      expect(result?.id).toBe('v2');
    });
  });

  describe('eviction', () => {
    it('remove a entrada mais antiga quando excede 20 entradas', async () => {
      // Preenche o cache com 20 entradas
      for (let i = 0; i < 20; i++) {
        await setStrokeAnimation(`https://example.com/img-${i}.jpg`, createMinimalAnimation({ id: `anim-${i}` }));
      }

      expect(getStrokeCacheStats().size).toBe(20);

      // A 21ª entrada deve remover a mais antiga (img-0)
      await setStrokeAnimation('https://example.com/img-21.jpg', createMinimalAnimation({ id: 'anim-21' }));

      expect(getStrokeCacheStats().size).toBe(20);

      // A entrada mais antiga (img-0) deve ter sido removida
      const oldest = await getStrokeAnimation('https://example.com/img-0.jpg');
      expect(oldest).toBeNull();

      // A entrada mais recente deve existir
      const newest = await getStrokeAnimation('https://example.com/img-21.jpg');
      expect(newest?.id).toBe('anim-21');

      // Entradas intermediárias ainda existem
      const mid = await getStrokeAnimation('https://example.com/img-10.jpg');
      expect(mid?.id).toBe('anim-10');
    });

    it('não evicta quando a chave já existe no cache', async () => {
      for (let i = 0; i < 20; i++) {
        await setStrokeAnimation(`https://example.com/img-${i}.jpg`, createMinimalAnimation({ id: `anim-${i}` }));
      }

      // Atualizar uma entrada existente NÃO deve causar eviction
      await setStrokeAnimation('https://example.com/img-0.jpg', createMinimalAnimation({ id: 'anim-0-updated' }));

      expect(getStrokeCacheStats().size).toBe(20);

      // Todas as 20 devem existir
      const result = await getStrokeAnimation('https://example.com/img-0.jpg');
      expect(result?.id).toBe('anim-0-updated');
    });
  });

  describe('clearStrokeCache', () => {
    it('limpa todas as entradas do cache', async () => {
      for (let i = 0; i < 5; i++) {
        await setStrokeAnimation(`https://example.com/img-${i}.jpg`, createMinimalAnimation());
      }

      expect(getStrokeCacheStats().size).toBe(5);

      clearStrokeCache();

      expect(getStrokeCacheStats().size).toBe(0);

      // Nenhuma entrada deve ser acessível
      const result = await getStrokeAnimation('https://example.com/img-0.jpg');
      expect(result).toBeNull();
    });

    it('não crasha quando o cache já está vazio', () => {
      expect(() => clearStrokeCache()).not.toThrow();
      expect(getStrokeCacheStats().size).toBe(0);
    });
  });

  describe('getStrokeCacheStats', () => {
    it('retorna tamanho correto e maxSize', () => {
      const stats = getStrokeCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(20);
    });
  });
});
