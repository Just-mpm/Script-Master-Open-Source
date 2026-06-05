import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { createLogger } from '../logger';

const log = createLogger('shared');

export const DB_NAME = 'GeminiVoiceStudioDB';
export const DB_VERSION = 10;

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
  userId: string | undefined;
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = request.transaction;

    // IDBOpenDBRequest não tem transação — resolve/rejeita diretamente no request
    if (!transaction) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      return;
    }

    // Resolve na conclusão da transação, não no sucesso individual do request.
    // Isso evita resolver antes de a transação ser commitada (dados podem ser perdidos se abortada).
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new DOMException('Transaction aborted'));
  });
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    userId: currentUser?.uid,
  };

  const errorString = JSON.stringify(errInfo);
  log.error('Firestore Error', { error: errorString });
  throw new Error(errorString, { cause: error });
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

export async function getIndexedDbItemsByIndex<T>(
  storeName: string,
  indexName: string,
  key: IDBValidKey,
): Promise<T[]> {
  const database = await initDB();
  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const index = store.index(indexName);
  return runRequest(index.getAll(key)) as Promise<T[]>;
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

/** Deleta todos os itens de todas as stores IndexedDB (usado no cleanup LGPD) */
export async function clearAllIndexedDbStores(): Promise<void> {
  const database = await initDB();
  const storeNames = Array.from(database.objectStoreNames);

  await Promise.all(
    storeNames.map(async (storeName) => {
      try {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        await runRequest(store.clear());
      } catch (error) {
        log.warn(`Falha ao limpar store ${storeName} no IndexedDB`, { error });
      }
    }),
  );
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

/** Threshold para alternar entre upload one-shot e resumável (10MB) */
const RESUMABLE_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

export async function uploadBlobAndGetUrl(
  storagePath: string,
  blob: Blob,
): Promise<string> {
  const storageRef = ref(storage, storagePath);
  const metadata = { contentType: blob.type || 'application/octet-stream' };

  if (blob.size > RESUMABLE_UPLOAD_THRESHOLD) {
    // Upload resumável para arquivos grandes — evita OOM e permite recuperação em caso de falha
    const task = uploadBytesResumable(storageRef, blob, metadata);
    const snapshot = await task;
    return getDownloadURL(snapshot.ref);
  }

  // Upload one-shot para arquivos pequenos — mais simples e rápido
  await uploadBytes(storageRef, blob, metadata);
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
