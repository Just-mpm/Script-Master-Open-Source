import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { createLogger } from '../logger';

const log = createLogger('shared');

export const DB_NAME = 'GeminiVoiceStudioDB';
export const DB_VERSION = 9;

export const STORE_NAME = 'generations';
export const IMAGE_STORE = 'image_generations';
export const PROJECTS_STORE = 'projects';
export const AUDIOS_STORE = 'audios';
export const IMAGES_STORE = 'project_images';
export const MEMORY_STORE = 'memories';
export const CHAT_STORE = 'chats';
export const SETTING_STORE = 'user_settings';
export const VIDEOS_STORE = 'videos';
export const TRANSCRIPTIONS_STORE = 'transcriptions';

// Removido no v0.9.0: EDITING_PLAN_STORE ('editing_plans')
// Feature de planos de edição foi removida. A store pode existir em bancos antigos
// ( IndexedDB não permite deletar stores via upgrade ), mas nenhum código a acessa.

const STORE_DEFINITIONS = [
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
] as const;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) ?? [],
    },
    operationType,
    path,
  };

  const errorString = JSON.stringify(errInfo);
  log.error('Firestore Error', { error: errorString });
  throw new Error(errorString);
}

export function removeUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedFields(item)) as T;
  }

  if (
    value !== null
    && typeof value === 'object'
    && !(value instanceof Blob)
    && !(value instanceof Date)
  ) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, removeUndefinedFields(entryValue)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function createFirestoreConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: WithFieldValue<T>): DocumentData {
      return removeUndefinedFields(modelObject as T) as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>, options: SnapshotOptions): T {
      return snapshot.data(options) as T;
    },
  };
}

// Lazy singleton: cacheia a Promise da conexão para reutilizar entre chamadas
let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null; // permite retry em caso de falha
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      for (const storeName of STORE_DEFINITIONS) {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id' });
        }
      }

      // Indexes para a store de vídeos
      if (database.objectStoreNames.contains(VIDEOS_STORE)) {
        const upgradeTransaction = (event.target as IDBOpenDBRequest).transaction;
        if (upgradeTransaction) {
          const videosStore = upgradeTransaction.objectStore(VIDEOS_STORE);
          if (!videosStore.indexNames.contains('projectId')) {
            videosStore.createIndex('projectId', 'projectId');
          }
          if (!videosStore.indexNames.contains('userId')) {
            videosStore.createIndex('userId', 'userId');
          }
        }
      }
    };
  });

  return dbPromise;
};

export async function putIndexedDbItem<T>(storeName: string, value: T): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  await runRequest(store.put(value));
}

export async function getAllIndexedDbItems<T>(storeName: string): Promise<T[]> {
  const database = await initDB();
  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  return runRequest(store.getAll()) as Promise<T[]>;
}

export async function getIndexedDbItem<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const database = await initDB();
  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const result = await runRequest(store.get(key));
  return (result as T | undefined) ?? null;
}

export async function deleteIndexedDbItem(storeName: string, key: IDBValidKey): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  await runRequest(store.delete(key));
}

/** Conta itens de uma store sem carregar dados — ideal para checagens leves */
export async function countIndexedDbItems(storeName: string): Promise<number> {
  const database = await initDB();
  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  return runRequest(store.count());
}

export async function updateIndexedDbItem<T>(
  storeName: string,
  key: IDBValidKey,
  updater: (item: T) => T,
): Promise<void> {
  const database = await initDB();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(key);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const currentValue = getRequest.result as T | undefined;

      if (!currentValue) {
        reject(new Error('Item not found'));
        return;
      }

      const putRequest = store.put(updater(currentValue));
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
}

export async function uploadBlobAndGetUrl(
  storagePath: string,
  blob: Blob,
): Promise<string> {
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: blob.type || 'application/octet-stream',
  });
  return getDownloadURL(storageRef);
}

/** Códigos de erro do Firebase Storage que indicam que o objeto não existe */
const STORAGE_OBJECT_NOT_FOUND = 'storage/object-not-found';

export async function deleteStorageObjectSafely(storagePath: string, warningMessage: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error: unknown) {
    // object-not-found é esperado em exclusões idempotentes — sucesso silencioso
    const errorCode = (error as { code?: string })?.code ?? '';
    if (errorCode === STORAGE_OBJECT_NOT_FOUND) {
      log.warn(warningMessage, { reason: 'object-not-found' });
    } else {
      log.error(warningMessage, { error });
    }
  }
}

export { OperationType };
