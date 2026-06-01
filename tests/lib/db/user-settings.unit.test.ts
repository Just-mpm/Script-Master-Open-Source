/**
 * Testes unitários para markTourSeen e hasTourSeen.
 *
 * Cobertura:
 * - markTourSeen com userId: setDoc com tourSeen, updatedAt e merge: true
 * - markTourSeen sem userId: salva no IndexedDB (novo registro)
 * - markTourSeen com userId, Firestore falha: handleFirestoreError chamado, não propaga
 * - markTourSeen sem userId, IndexedDB existente: merge com dados existentes
 * - hasTourSeen com userId, doc com tourSeen true: retorna true
 * - hasTourSeen com userId, doc sem tourSeen: retorna false
 * - hasTourSeen com userId, doc não existe: retorna false
 * - hasTourSeen com userId, Firestore falha: retorna false (não propaga)
 * - hasTourSeen sem userId, IndexedDB com tourSeen true: retorna true
 * - hasTourSeen sem userId, IndexedDB vazio: retorna false
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UserSetting } from '../../../src/lib/db/types';

// ---------------------------------------------------------------------------
// Hoisted mocks (acessíveis dentro das factories de vi.mock)
// ---------------------------------------------------------------------------

const mockSetDoc = vi.hoisted(() => vi.fn());
const mockGetDoc = vi.hoisted(() => vi.fn());
const mockDoc = vi.hoisted(() => vi.fn());
const mockGetIndexedDbItem = vi.hoisted(() => vi.fn());
const mockPutIndexedDbItem = vi.hoisted(() => vi.fn());
const mockHandleFirestoreError = vi.hoisted(() => vi.fn());

// Ref retornado por doc().withConverter() — reutilizado nas asserções
const mockDocRef = vi.hoisted(() => ({
  withConverter: vi.fn().mockReturnThis(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
}));

vi.mock('../../../src/lib/firebase', () => ({
  db: {},
}));

vi.mock('../../../src/lib/db/shared', () => ({
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  },
  SETTING_STORE: 'user_settings',
  createFirestoreConverter: vi.fn(() => ({
    toFirestore: vi.fn((v: unknown) => v),
    fromFirestore: vi.fn((snap: { data: () => unknown }) => snap.data()),
  })),
  getIndexedDbItem: mockGetIndexedDbItem,
  putIndexedDbItem: mockPutIndexedDbItem,
  handleFirestoreError: mockHandleFirestoreError,
}));

// ---------------------------------------------------------------------------
// Importação tardia (após mocks)
// ---------------------------------------------------------------------------

import { markTourSeen, hasTourSeen } from '../../../src/lib/db/user-settings';

// ---------------------------------------------------------------------------
// Suite de testes
// ---------------------------------------------------------------------------

describe('user-settings — markTourSeen e hasTourSeen', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // doc(db, path, id) retorna ref com withConverter que retorna this
    mockDoc.mockReturnValue(mockDocRef);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── markTourSeen ─────────────────────────────────────────────

  describe('markTourSeen', () => {
    it('com userId: chama setDoc com tourSeen true, updatedAt e merge true', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

      await markTourSeen('user-123');

      // doc(db, 'user_settings', 'user-123')
      expect(mockDoc).toHaveBeenCalledWith({}, 'user_settings', 'user-123');

      // setDoc(ref, { tourSeen: true, updatedAt }, { merge: true })
      expect(mockSetDoc).toHaveBeenCalledWith(
        mockDocRef,
        { tourSeen: true, updatedAt: 1700000000000 },
        { merge: true },
      );
    });

    it('sem userId: salva no IndexedDB como novo registro', async () => {
      mockGetIndexedDbItem.mockResolvedValue(null);
      mockPutIndexedDbItem.mockResolvedValue(undefined);
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

      await markTourSeen();

      expect(mockGetIndexedDbItem).toHaveBeenCalledWith('user_settings', 'local_settings');
      expect(mockPutIndexedDbItem).toHaveBeenCalledWith('user_settings', {
        id: 'local_settings',
        customSystemPrompt: '',
        tourSeen: true,
        updatedAt: 1700000000000,
      });
    });

    it('com userId, Firestore falha: chama handleFirestoreError e não propaga', async () => {
      const firestoreError = new Error('offline');
      mockSetDoc.mockRejectedValue(firestoreError);

      // Não deve lançar — handleFirestoreError é chamado (mock não lança)
      await markTourSeen('user-123');

      expect(mockHandleFirestoreError).toHaveBeenCalledWith(
        firestoreError,
        'write',
        'user_settings/user-123/tourSeen',
      );
    });

    it('sem userId, IndexedDB existente: merge sem sobrescrever outros campos', async () => {
      const existing: UserSetting = {
        id: 'local_settings',
        customSystemPrompt: 'meu prompt',
        updatedAt: 1600000000000,
        selectedVoice: 'Puck',
        isMultiSpeaker: true,
      };
      mockGetIndexedDbItem.mockResolvedValue(existing);
      mockPutIndexedDbItem.mockResolvedValue(undefined);
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

      await markTourSeen();

      expect(mockPutIndexedDbItem).toHaveBeenCalledWith('user_settings', {
        id: 'local_settings',
        customSystemPrompt: 'meu prompt',
        selectedVoice: 'Puck',
        isMultiSpeaker: true,
        tourSeen: true,
        updatedAt: 1700000000000,
      });
    });
  });

  // ─── hasTourSeen ──────────────────────────────────────────────

  describe('hasTourSeen', () => {
    it('com userId, doc com tourSeen true: retorna true', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ tourSeen: true }),
      });

      const result = await hasTourSeen('user-123');

      expect(result).toBe(true);
      expect(mockDoc).toHaveBeenCalledWith({}, 'user_settings', 'user-123');
    });

    it('com userId, doc existe sem tourSeen: retorna false', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ customSystemPrompt: 'prompt' }),
      });

      const result = await hasTourSeen('user-123');

      expect(result).toBe(false);
    });

    it('com userId, doc não existe: retorna false', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => undefined,
      });

      const result = await hasTourSeen('user-123');

      expect(result).toBe(false);
    });

    it('com userId, Firestore falha: retorna false sem propagar erro', async () => {
      mockGetDoc.mockRejectedValue(new Error('offline'));

      const result = await hasTourSeen('user-123');

      expect(result).toBe(false);
      // hasTourSeen NÃO chama handleFirestoreError — faz catch silencioso
      expect(mockHandleFirestoreError).not.toHaveBeenCalled();
    });

    it('sem userId, IndexedDB com tourSeen true: retorna true', async () => {
      mockGetIndexedDbItem.mockResolvedValue({ tourSeen: true } as UserSetting);

      const result = await hasTourSeen();

      expect(result).toBe(true);
      expect(mockGetIndexedDbItem).toHaveBeenCalledWith('user_settings', 'local_settings');
    });

    it('sem userId, IndexedDB vazio: retorna false', async () => {
      mockGetIndexedDbItem.mockResolvedValue(null);

      const result = await hasTourSeen();

      expect(result).toBe(false);
    });
  });
});
