import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from '../logger';
import type { AttachmentRecord, ChatSession } from './types';
import {
  CHAT_STORE,
  OperationType,
  createFirestoreConverter,
  deleteIndexedDbItem,
  getAllIndexedDbItems,
  handleFirestoreError,
  putIndexedDbItem,
} from './shared';

const log = createLogger('chats');

const chatSessionConverter = createFirestoreConverter<ChatSession>();
const chatsCollection = collection(db, 'chats').withConverter(chatSessionConverter);

/** Limite seguro do Firestore (~1MB) com margem para metadados do documento */
export const FIRESTORE_MAX_DOC_SIZE_BYTES = 900_000;

function sortChatSessions(items: ChatSession[]): ChatSession[] {
  return [...items].sort((firstItem, secondItem) => secondItem.updatedAt - firstItem.updatedAt);
}

/** Estima o tamanho em bytes que o documento ocupará no Firestore (JSON serializado). */
export function estimateDocumentSize(session: ChatSession, userId: string): number {
  const docData = { ...session, userId };
  return JSON.stringify(docData).length;
}

/** Soma o tamanho dos anexos base64 de todas as mensagens. */
function sumAttachmentSize(messages: ChatSession['messages']): number {
  return messages.reduce((total: number, message) => {
    const attachments: AttachmentRecord[] = message.attachments ?? [];
    for (const attachment of attachments) {
      total += attachment.data.length;
    }
    return total;
  }, 0);
}

export async function saveChatSession(session: ChatSession, userId?: string): Promise<void> {
  if (userId) {
    // Valida tamanho do documento antes de tentar salvar no Firestore
    const estimatedSize = estimateDocumentSize(session, userId);
    if (estimatedSize > FIRESTORE_MAX_DOC_SIZE_BYTES) {
      const totalAttachmentSize = sumAttachmentSize(session.messages);
      log.warn('Sessão excede limite do Firestore — salvamento no Firestore omitido', {
        sessionId: session.id,
        estimatedSizeBytes: estimatedSize,
        attachmentSizeBytes: totalAttachmentSize,
        maxAllowedBytes: FIRESTORE_MAX_DOC_SIZE_BYTES,
      });
      // Recai para IndexedDB local que não tem limite de documento
    } else {
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
