import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { ChatSession } from './types';
import {
  CHAT_STORE,
  OperationType,
  createFirestoreConverter,
  deleteIndexedDbItem,
  getAllIndexedDbItems,
  handleFirestoreError,
  putIndexedDbItem,
} from './shared';

const chatSessionConverter = createFirestoreConverter<ChatSession>();
const chatsCollection = collection(db, 'chats').withConverter(chatSessionConverter);

function sortChatSessions(items: ChatSession[]): ChatSession[] {
  return [...items].sort((firstItem, secondItem) => secondItem.updatedAt - firstItem.updatedAt);
}

export async function saveChatSession(session: ChatSession, userId?: string): Promise<void> {
  if (userId) {
    try {
      await setDoc(doc(chatsCollection, session.id), {
        ...session,
        userId,
      });
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${session.id}`);
    }
  }

  await putIndexedDbItem(CHAT_STORE, session);
}

export async function getChatSessions(userId?: string): Promise<ChatSession[]> {
  if (userId) {
    try {
      const snapshot = await getDocs(query(chatsCollection, where('userId', '==', userId)));
      return sortChatSessions(snapshot.docs.map((chatDocument) => chatDocument.data()));
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    }
  }

  return sortChatSessions(await getAllIndexedDbItems<ChatSession>(CHAT_STORE));
}

export async function deleteChatSession(id: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      await deleteDoc(doc(chatsCollection, id));
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${id}`);
    }
  }

  await deleteIndexedDbItem(CHAT_STORE, id);
}
