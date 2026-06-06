import { describe, it, expect } from 'vitest';
import {
  removeUndefinedFields,
  createFirestoreConverter,
  clearAllIndexedDbStores,
  DB_NAME,
  DB_VERSION,
  STORE_NAME,
  IMAGE_STORE,
  PROJECTS_STORE,
  AUDIOS_STORE,
  IMAGES_STORE,
  MEMORY_STORE,
  CHAT_STORE,
  SETTING_STORE,
  VIDEOS_STORE,
  TRANSCRIPTIONS_STORE,
  getIndexedDbItemsByIndex,
  putIndexedDbItem,
} from '../../src/lib/db/shared';
import type { ProjectVideo } from '../../src/lib/db/types';

describe('db/shared', () => {
  // -------------------------------------------------------------------------
  // Constantes
  // -------------------------------------------------------------------------
  describe('constantes', () => {
    it('DB_NAME deve ser "GeminiVoiceStudioDB"', () => {
      expect(DB_NAME).toBe('GeminiVoiceStudioDB');
    });

    it('DB_VERSION deve ser 11', () => {
      expect(DB_VERSION).toBe(11);
    });

    it('nomes de store devem ser strings não vazias', () => {
      const stores = [
        STORE_NAME, IMAGE_STORE, PROJECTS_STORE, AUDIOS_STORE,
        IMAGES_STORE, MEMORY_STORE, CHAT_STORE, SETTING_STORE,
        VIDEOS_STORE, TRANSCRIPTIONS_STORE,
      ];
      for (const store of stores) {
        expect(typeof store).toBe('string');
        expect(store.length).toBeGreaterThan(0);
      }
    });

    it('STORE_NAME deve ser "generations"', () => {
      expect(STORE_NAME).toBe('generations');
    });

    it('IMAGE_STORE deve ser "image_generations"', () => {
      expect(IMAGE_STORE).toBe('image_generations');
    });
  });

  // -------------------------------------------------------------------------
  // removeUndefinedFields
  // -------------------------------------------------------------------------
  describe('removeUndefinedFields', () => {
    it('remove campos undefined de um objeto plano', () => {
      const input = { a: 1, b: undefined, c: 'text' };
      const result = removeUndefinedFields(input);
      expect(result).toEqual({ a: 1, c: 'text' });
    });

    it('remove campos undefined aninhados recursivamente', () => {
      const input = {
        name: 'test',
        meta: {
          value: 42,
          extra: undefined,
        },
      };
      const result = removeUndefinedFields(input);
      expect(result).toEqual({ name: 'test', meta: { value: 42 } });
    });

    it('preserva campos null (não remove)', () => {
      const input = { a: null, b: 'ok', c: undefined };
      const result = removeUndefinedFields(input);
      expect(result).toEqual({ a: null, b: 'ok' });
    });

    it('preserva campos zero e string vazia', () => {
      const input = { count: 0, text: '', active: false };
      const result = removeUndefinedFields(input);
      expect(result).toEqual({ count: 0, text: '', active: false });
    });

    it('lida com arrays — remove undefined dos itens', () => {
      const input = { items: [1, undefined, 3] };
      const result = removeUndefinedFields(input);
      expect(result).toEqual({ items: [1, undefined, 3] });
    });

    it('preserva instâncias de Blob intactas', () => {
      const blob = new Blob(['test'], { type: 'audio/wav' });
      const input = { data: blob, extra: undefined };
      const result = removeUndefinedFields(input);
      expect(result.data).toBe(blob);
      expect(result.extra).toBeUndefined();
    });

    it('preserva instâncias de Date intactas', () => {
      const date = new Date('2026-01-01');
      const input = { createdAt: date, extra: undefined };
      const result = removeUndefinedFields(input);
      expect(result.createdAt).toBe(date);
      expect(result.extra).toBeUndefined();
    });

    it('retorna o mesmo valor para tipos primitivos', () => {
      expect(removeUndefinedFields('text')).toBe('text');
      expect(removeUndefinedFields(42)).toBe(42);
      expect(removeUndefinedFields(true)).toBe(true);
      expect(removeUndefinedFields(null)).toBe(null);
    });

    it('retorna objeto vazio quando todos os campos são undefined', () => {
      const result = removeUndefinedFields({ a: undefined, b: undefined });
      expect(result).toEqual({});
    });

    it('retorna objeto inalterado quando não há campos undefined', () => {
      const input = { a: 1, b: 'two', c: true };
      const result = removeUndefinedFields(input);
      expect(result).toEqual(input);
    });
  });

  // -------------------------------------------------------------------------
  // createFirestoreConverter
  // -------------------------------------------------------------------------
  describe('createFirestoreConverter', () => {
    it('retorna converter com toFirestore e fromFirestore', () => {
      const converter = createFirestoreConverter<{ id: string; name: string }>();
      expect(converter).toHaveProperty('toFirestore');
      expect(converter).toHaveProperty('fromFirestore');
    });

    it('toFirestore remove campos undefined', () => {
      const converter = createFirestoreConverter<{ id: string; name?: string }>();
      const result = converter.toFirestore({ id: '1', name: undefined });
      expect(result).toEqual({ id: '1' });
    });

    it('fromFirestore retorna data do snapshot', () => {
      const converter = createFirestoreConverter<{ id: string }>();
      const mockData = { id: 'abc', extra: 'data' };
      const mockSnapshot = {
        data: () => mockData,
      };
      const result = converter.fromFirestore(mockSnapshot as never, {});
      expect(result).toEqual(mockData);
    });
  });

  describe('getIndexedDbItemsByIndex', () => {
    it('busca vídeos locais pelo índice projectId', async () => {
      await clearAllIndexedDbStores();
      const projectId = `project-${Date.now()}`;
      const video: ProjectVideo = {
        id: 'video-indexed',
        projectId,
        userId: '',
        videoUrl: '',
        format: 'mp4',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInSeconds: 10,
        fileSizeBytes: 1024,
        createdAt: Date.now(),
        videoBlob: new Blob(['video'], { type: 'video/mp4' }),
      };
      await putIndexedDbItem<ProjectVideo>(VIDEOS_STORE, video);

      const videos = await getIndexedDbItemsByIndex<ProjectVideo>(VIDEOS_STORE, 'projectId', projectId);

      expect(videos).toHaveLength(1);
      expect(videos[0].id).toBe(video.id);
    });
  });
});
