import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DB_NAME, DB_VERSION, STORE_NAME, IMAGE_STORE, PROJECTS_STORE } from '../../src/lib/db/shared';

// Mock firebase/auth para shared.ts (usa auth.currentUser)
vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

// Mock logger para evitar poluição de console
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  putIndexedDbItem,
  getAllIndexedDbItems,
  getIndexedDbItem,
  deleteIndexedDbItem,
  countIndexedDbItems,
  updateIndexedDbItem,
} from '../../src/lib/db/shared';

describe('db/shared IndexedDB', () => {
  // Usa IDs únicos para evitar colisão entre testes (não é possível
  // recriar o DB entre testes porque o módulo cacheia a conexão)
  const testId = (name: string) => `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  it('putIndexedDbItem salva item e getIndexedDbItem recupera', async () => {
    const id = testId('putget');
    const item = { id, name: 'Meu Projeto', createdAt: Date.now() };
    await putIndexedDbItem(PROJECTS_STORE, item);

    const result = await getIndexedDbItem<typeof item>(PROJECTS_STORE, id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(id);
    expect(result!.name).toBe('Meu Projeto');
  });

  it('getIndexedDbItem retorna null para item inexistente', async () => {
    const result = await getIndexedDbItem(PROJECTS_STORE, 'inexistente-xyz-999');
    expect(result).toBeNull();
  });

  it('getAllIndexedDbItems retorna todos os itens da store', async () => {
    const prefix = testId('all');
    const items = [
      { id: `${prefix}-1`, name: 'Gen 1', createdAt: 100 },
      { id: `${prefix}-2`, name: 'Gen 2', createdAt: 200 },
      { id: `${prefix}-3`, name: 'Gen 3', createdAt: 300 },
    ];

    for (const item of items) {
      await putIndexedDbItem(STORE_NAME, item);
    }

    const result = await getAllIndexedDbItems(STORE_NAME);
    const filtered = result.filter((r) => (r as { id: string }).id.startsWith(prefix));
    expect(filtered).toHaveLength(3);
  });

  it('deleteIndexedDbItem remove item existente', async () => {
    const id = testId('del');
    const item = { id, value: 42 };
    await putIndexedDbItem(STORE_NAME, item);

    await deleteIndexedDbItem(STORE_NAME, id);
    const result = await getIndexedDbItem(STORE_NAME, id);
    expect(result).toBeNull();
  });

  it('deleteIndexedDbItem não lança erro para item inexistente', async () => {
    await expect(
      deleteIndexedDbItem(STORE_NAME, 'nao-existe-xyz'),
    ).resolves.not.toThrow();
  });

  it('countIndexedDbItems retorna contagem correta (store específica)', async () => {
    const prefix = testId('count');
    const before = await countIndexedDbItems(STORE_NAME);

    await putIndexedDbItem(STORE_NAME, { id: `${prefix}-1`, name: 'Img 1' });
    await putIndexedDbItem(STORE_NAME, { id: `${prefix}-2`, name: 'Img 2' });

    const after = await countIndexedDbItems(STORE_NAME);
    expect(after).toBeGreaterThanOrEqual(before + 2);
  });

  it('updateIndexedDbItem atualiza item existente', async () => {
    const id = testId('upd');
    const item = { id, name: 'Original', count: 1 } as { id: string; name: string; count: number };
    await putIndexedDbItem(STORE_NAME, item);

    await updateIndexedDbItem<{ id: string; name: string; count: number }>(STORE_NAME, id, (current) => ({
      ...current,
      name: 'Atualizado',
      count: current.count + 10,
    }));

    const result = await getIndexedDbItem<{ id: string; name: string; count: number }>(STORE_NAME, id);
    expect(result!.name).toBe('Atualizado');
    expect(result!.count).toBe(11);
  });

  it('updateIndexedDbItem lança "Item not found" para item inexistente', async () => {
    await expect(
      updateIndexedDbItem(STORE_NAME, 'inexistente-xyz', () => ({ id: 'x', name: 'y' })),
    ).rejects.toThrow('Item not found');
  });

  it('putIndexedDbItem sobrescreve item existente (upsert)', async () => {
    const id = testId('upsert');
    await putIndexedDbItem(STORE_NAME, { id, version: 1 } as { id: string; version: number });
    await putIndexedDbItem(STORE_NAME, { id, version: 2 } as { id: string; version: number });

    const result = await getIndexedDbItem<{ id: string; version: number }>(STORE_NAME, id);
    expect(result!.version).toBe(2);
  });

  it('operações em stores diferentes são isoladas', async () => {
    const id = testId('iso');
    await putIndexedDbItem(STORE_NAME, { id, type: 'generation' } as { id: string; type: string });
    await putIndexedDbItem(IMAGE_STORE, { id, type: 'image' } as { id: string; type: string });

    const gen = await getIndexedDbItem<{ id: string; type: string }>(STORE_NAME, id);
    const img = await getIndexedDbItem<{ id: string; type: string }>(IMAGE_STORE, id);

    expect(gen!.type).toBe('generation');
    expect(img!.type).toBe('image');
  });
});
