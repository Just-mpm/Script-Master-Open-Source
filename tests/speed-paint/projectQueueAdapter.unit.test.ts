import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectImage } from '../../src/lib/db';
import { prepareProjectImagesForSpeedPaint } from '../../src/features/speed-paint/lib/projectQueueAdapter';

describe('prepareProjectImagesForSpeedPaint', () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;

  beforeEach(() => {
    global.fetch = vi.fn();
    URL.createObjectURL = vi.fn((blob: Blob) => `blob:${blob.size}`) as typeof URL.createObjectURL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    vi.restoreAllMocks();
  });

  it('preserva a ordem por timestamp e cria itens da fila a partir de blobs locais', async () => {
    const result = await prepareProjectImagesForSpeedPaint('Meu Projeto', [
      {
        id: 'img-2',
        projectId: 'proj-1',
        imageUrl: '',
        imageBlob: new Blob(['segundo']),
        prompt: '',
        timestamp: 20,
        createdAt: 2,
      },
      {
        id: 'img-1',
        projectId: 'proj-1',
        imageUrl: '',
        imageBlob: new Blob(['primeiro']),
        prompt: '',
        timestamp: 10,
        createdAt: 1,
      },
    ] as ProjectImage[]);

    expect(result.failedCount).toBe(0);
    expect(result.queue).toHaveLength(2);
    expect(result.queue.map((item) => item.id)).toEqual(['img-1', 'img-2']);
    expect(result.queue[0].filename).toBe('meu-projeto-cena-1.png');
    expect(result.queue[1].shouldRevokeObjectUrl).toBe(true);
  });

  it('baixa imagens remotas antes de gerar blob URLs locais', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['remota']),
    } as Response);

    const result = await prepareProjectImagesForSpeedPaint('Projeto', [
      {
        id: 'img-remote',
        projectId: 'proj-1',
        imageUrl: 'https://cdn.example.com/cena.png',
        prompt: '',
        timestamp: 10,
        createdAt: 1,
      } as ProjectImage,
    ]);

    expect(global.fetch).toHaveBeenCalledWith('https://cdn.example.com/cena.png');
    expect(result.failedCount).toBe(0);
    expect(result.queue[0].dataUrl).toBe('blob:6');
  });

  it('ignora imagens que falham no carregamento e informa quantas falharam', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('network'));

    const result = await prepareProjectImagesForSpeedPaint('Projeto', [
      {
        id: 'img-bad',
        projectId: 'proj-1',
        imageUrl: 'https://cdn.example.com/cena.png',
        prompt: '',
        timestamp: 10,
        createdAt: 1,
      } as ProjectImage,
    ]);

    expect(result.queue).toEqual([]);
    expect(result.failedCount).toBe(1);
  });
});
