import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn().mockReturnValue({}),
  where: vi.fn().mockReturnValue({}),
  collectionGroup: vi.fn(),
  collection: vi.fn().mockReturnValue({}),
  orderBy: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { DB_NAME } from '../../src/lib/db/shared';

describe('db/transcriptions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    indexedDB.deleteDatabase(DB_NAME);
  });

  it('saveTranscription salva no IndexedDB', async () => {
    const { saveTranscription, loadTranscription } = await import('../../src/lib/db/transcriptions');

    await saveTranscription('proj-1', {
      words: [{ text: 'Olá', startFrame: 0, endFrame: 15, bold: false }],
      source: 'segment-timing',
    });

    const stored = await loadTranscription('proj-1');
    expect(stored).not.toBeNull();
    expect(stored!.id).toBe('proj-1');
    expect(stored!.result.words).toHaveLength(1);
    expect(stored!.createdAt).toBeGreaterThan(0);
  });

  it('loadTranscription retorna null quando não existe', async () => {
    const { loadTranscription } = await import('../../src/lib/db/transcriptions');
    const result = await loadTranscription('inexistente');
    expect(result).toBeNull();
  });

  it('deleteTranscription remove do IndexedDB', async () => {
    const { saveTranscription, loadTranscription, deleteTranscription } = await import('../../src/lib/db/transcriptions');

    await saveTranscription('proj-del', {
      words: [],
      source: 'segment-timing',
    });

    await deleteTranscription('proj-del');
    const result = await loadTranscription('proj-del');
    expect(result).toBeNull();
  });

  it('saveTranscription usa projectId como id', async () => {
    const { saveTranscription, loadTranscription } = await import('../../src/lib/db/transcriptions');

    await saveTranscription('my-custom-project-id', {
      words: [],
      source: 'segment-timing',
    });

    const stored = await loadTranscription('my-custom-project-id');
    expect(stored!.id).toBe('my-custom-project-id');
  });

  it('transcriptions sempre usam IndexedDB (sem dual storage)', async () => {
    // Mesmo com userId, deve usar IndexedDB (transcriptions.ts não aceita userId)
    const { saveTranscription, loadTranscription } = await import('../../src/lib/db/transcriptions');

    await saveTranscription('proj-nouser', {
      words: [{ text: 'test', startFrame: 0, endFrame: 30, bold: false }],
      source: 'segment-timing',
    });

    const stored = await loadTranscription('proj-nouser');
    expect(stored).not.toBeNull();
  });
});
