import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Memory } from './types';
import {
  MEMORY_STORE,
  OperationType,
  createFirestoreConverter,
  deleteIndexedDbItem,
  getAllIndexedDbItems,
  handleFirestoreError,
  putIndexedDbItem,
} from './shared';

const memoryConverter = createFirestoreConverter<Memory>();
const memoriesCollection = collection(db, 'memories').withConverter(memoryConverter);

export async function saveMemory(content: string, userId?: string): Promise<Memory> {
  const memory: Memory = {
    id: crypto.randomUUID(),
    userId,
    content,
    createdAt: Date.now(),
  };

  if (userId) {
    try {
      await setDoc(doc(memoriesCollection, memory.id), memory);
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.WRITE, `memories/${memory.id}`);
    }
  } else {
    await putIndexedDbItem(MEMORY_STORE, memory);
  }

  return memory;
}

export async function getMemories(userId?: string): Promise<Memory[]> {
  if (userId) {
    try {
      const snapshot = await getDocs(query(memoriesCollection, where('userId', '==', userId)));
      return snapshot.docs.map((memoryDocument) => memoryDocument.data());
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.LIST, 'memories');
    }
  }

  return getAllIndexedDbItems<Memory>(MEMORY_STORE);
}

export async function deleteMemory(id: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      await deleteDoc(doc(memoriesCollection, id));
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.DELETE, `memories/${id}`);
    }
  }

  await deleteIndexedDbItem(MEMORY_STORE, id);
}
