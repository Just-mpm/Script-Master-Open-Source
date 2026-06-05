import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectVideo } from '../../src/lib/db/types';

const {
  mockSetDoc,
  mockStorageRef,
  mockUploadBytes,
  mockUploadBytesResumable,
  mockGetDownloadURL,
  mockDeleteObject,
} = vi.hoisted(() => ({
  mockSetDoc: vi.fn().mockResolvedValue(undefined),
  mockStorageRef: vi.fn(),
  mockUploadBytes: vi.fn().mockResolvedValue({}),
  mockUploadBytesResumable: vi.fn(),
  mockGetDownloadURL: vi.fn().mockResolvedValue('https://storage.example/video.mp4'),
  mockDeleteObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  setDoc: mockSetDoc,
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn().mockReturnValue({}),
  where: vi.fn().mockReturnValue({}),
  collection: vi.fn().mockReturnValue({ withConverter: vi.fn().mockReturnValue({}) }),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

vi.mock('firebase/storage', () => ({
  ref: mockStorageRef,
  uploadBytes: mockUploadBytes,
  uploadBytesResumable: mockUploadBytesResumable,
  getDownloadURL: mockGetDownloadURL,
  deleteObject: mockDeleteObject,
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
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

  describe('migrateAnonymousData', () => {
    it('mantém vídeos no IndexedDB e não envia para Firestore ou Storage', async () => {
      const { clearAllIndexedDbStores, getAllIndexedDbItems, putIndexedDbItem, VIDEOS_STORE } = await import('../../src/lib/db/shared');
      const { migrateAnonymousData } = await import('../../src/lib/db/migration');
      await clearAllIndexedDbStores();
      vi.clearAllMocks();

      const video: ProjectVideo = {
        id: 'video-local-1',
        projectId: 'project-1',
        userId: '',
        videoUrl: 'blob:old-url',
        format: 'mp4',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInSeconds: 12,
        fileSizeBytes: 1024,
        createdAt: Date.now(),
        videoBlob: new Blob(['video'], { type: 'video/mp4' }),
      };
      const otherUserVideo: ProjectVideo = {
        ...video,
        id: 'video-user-a',
        userId: 'user-a',
      };
      await putIndexedDbItem<ProjectVideo>(VIDEOS_STORE, video);
      await putIndexedDbItem<ProjectVideo>(VIDEOS_STORE, otherUserVideo);

      const result = await migrateAnonymousData('user-123');
      const videos = await getAllIndexedDbItems<ProjectVideo>(VIDEOS_STORE);

      expect(result.migrated).toBe(0);
      expect(result.details).toContain('1 vídeos locais preservados');
      expect(videos).toHaveLength(2);
      expect(videos.find((item) => item.id === video.id)).toMatchObject({
        id: video.id,
        projectId: video.projectId,
        userId: 'user-123',
        videoUrl: '',
      });
      expect(videos.find((item) => item.id === video.id)?.videoBlob).toBeDefined();
      expect(videos.find((item) => item.id === otherUserVideo.id)).toMatchObject({
        id: otherUserVideo.id,
        userId: 'user-a',
      });
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockUploadBytes).not.toHaveBeenCalled();
      expect(mockUploadBytesResumable).not.toHaveBeenCalled();
    });
  });
});
