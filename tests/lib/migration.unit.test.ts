import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn().mockReturnValue({}),
  where: vi.fn().mockReturnValue({}),
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

describe('db/migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    indexedDB.deleteDatabase(DB_NAME);
  });

  describe('isMigrationAlreadyHandled', () => {
    it('retorna false quando userId nunca foi marcado', async () => {
      const { isMigrationAlreadyHandled } = await import('../../src/lib/db/migration');
      expect(isMigrationAlreadyHandled('user-abc')).toBe(false);
    });

    it('retorna true quando userId já foi marcado', async () => {
      const { isMigrationAlreadyHandled, markMigrationCompleted } = await import('../../src/lib/db/migration');
      markMigrationCompleted('user-abc');
      expect(isMigrationAlreadyHandled('user-abc')).toBe(true);
    });

    it('não confunde users diferentes', async () => {
      const { isMigrationAlreadyHandled, markMigrationCompleted } = await import('../../src/lib/db/migration');
      markMigrationCompleted('user-1');
      expect(isMigrationAlreadyHandled('user-1')).toBe(true);
      expect(isMigrationAlreadyHandled('user-2')).toBe(false);
    });
  });

  describe('markMigrationCompleted', () => {
    it('salva timestamp no localStorage', async () => {
      const { markMigrationCompleted } = await import('../../src/lib/db/migration');
      markMigrationCompleted('user-x');

      const key = `sm_migration_completed_user-x`;
      const value = localStorage.getItem(key);
      expect(value).not.toBeNull();
      expect(Number(value)).toBeGreaterThan(0);
    });
  });

  describe('checkForMigratableData', () => {
    it('retorna hasData=false quando IndexedDB está vazio', async () => {
      const { checkForMigratableData } = await import('../../src/lib/db/migration');
      const result = await checkForMigratableData();

      expect(result.hasData).toBe(false);
      expect(result.summary.projects).toBe(0);
      expect(result.summary.generations).toBe(0);
      expect(result.summary.imageGenerations).toBe(0);
      expect(result.summary.memories).toBe(0);
      expect(result.summary.chats).toBe(0);
      expect(result.summary.settings).toBe(false);
    });

    it('detecta dados migráveis no IndexedDB', async () => {
      const { putIndexedDbItem } = await import('../../src/lib/db/shared');
      await putIndexedDbItem('projects', { id: 'p1', name: 'Proj', script: '', createdAt: Date.now(), settings: {} as never });
      await putIndexedDbItem('generations', { id: 'g1', name: 'Gen', createdAt: Date.now(), script: '', voice: '' });
      await putIndexedDbItem('memories', { id: 'm1', content: 'Memória', createdAt: Date.now() });

      const { checkForMigratableData } = await import('../../src/lib/db/migration');
      const result = await checkForMigratableData();

      expect(result.hasData).toBe(true);
      expect(result.summary.projects).toBe(1);
      expect(result.summary.generations).toBe(1);
      expect(result.summary.memories).toBe(1);
    });
  });
});
