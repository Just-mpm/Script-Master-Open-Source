import { collection, deleteDoc, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from '../logger';
import type {
  AssistantHistoryMessage,
  AssistantHistoryPart,
  AttachmentRecord,
  ChatMessageRecord,
  ChatSession,
  StoredAttachment,
} from './types';
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

function sanitizeStoredAttachments(message: ChatMessageRecord): ChatMessageRecord {
  const attachments = message.attachments?.map<StoredAttachment>((attachment) => ({
    mimeType: attachment.mimeType,
    name: attachment.name,
    processed: true,
  }));

  return { ...message, attachments };
}

function sanitizeHistoryPart(part: AssistantHistoryPart): AssistantHistoryPart | null {
  const hasInlineData = Boolean(part.inlineData);
  const hasEmbeddedMedia = part.media?.url.startsWith('data:') ?? false;

  if (!hasInlineData && !hasEmbeddedMedia) {
    return part;
  }

  const sanitizedPart = { ...part };
  delete sanitizedPart.inlineData;
  if (hasEmbeddedMedia) {
    delete sanitizedPart.media;
  }
  return Object.keys(sanitizedPart).length > 0 ? sanitizedPart : null;
}

/** Remove dados binários antigos antes de persistir ou reutilizar uma sessão. */
export function sanitizeAssistantHistoryAttachments(
  history: AssistantHistoryMessage[] | undefined,
): AssistantHistoryMessage[] | undefined {
  return history?.map((message) => ({
    ...message,
    content: message.content
      .map(sanitizeHistoryPart)
      .filter((part): part is AssistantHistoryPart => part !== null),
  }));
}

/** Mantém somente cartões leves dos anexos na persistência. */
export function sanitizeChatSessionForPersistence(session: ChatSession): ChatSession {
  return {
    ...session,
    messages: session.messages.map(sanitizeStoredAttachments),
    fullHistory: sanitizeAssistantHistoryAttachments(session.fullHistory),
  };
}

/** Soma o tamanho dos anexos base64 de todas as mensagens. */
function sumAttachmentSize(messages: ChatSession['messages']): number {
  return messages.reduce((total: number, message) => {
    const attachments: AttachmentRecord[] = message.attachments ?? [];
    for (const attachment of attachments) {
      total += 'data' in attachment ? attachment.data.length : 0;
    }
    return total;
  }, 0);
}

export async function saveChatSession(session: ChatSession, userId?: string): Promise<boolean> {
  const sanitizedSession = sanitizeChatSessionForPersistence(session);

  if (userId) {
    // Valida tamanho do documento antes de tentar salvar no Firestore
    const estimatedSize = estimateDocumentSize(sanitizedSession, userId);
    if (estimatedSize > FIRESTORE_MAX_DOC_SIZE_BYTES) {
      const totalAttachmentSize = sumAttachmentSize(sanitizedSession.messages);
      log.warn('Sessão excede limite do Firestore — salvamento no IndexedDB', {
        sessionId: sanitizedSession.id,
        estimatedSizeBytes: estimatedSize,
        attachmentSizeBytes: totalAttachmentSize,
        maxAllowedBytes: FIRESTORE_MAX_DOC_SIZE_BYTES,
      });
      await putIndexedDbItem(CHAT_STORE, sanitizedSession);
      return true; // fallback para IndexedDB
    } else {
      try {
        await setDoc(doc(chatsCollection, sanitizedSession.id), {
          ...sanitizedSession,
          userId,
        });
        return false;
      } catch (firestoreError: unknown) {
        log.warn('Falha ao salvar chat no Firestore — fallback para IndexedDB', {
          sessionId: sanitizedSession.id,
          error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
        });
        await putIndexedDbItem(CHAT_STORE, sanitizedSession);
        return true; // fallback para IndexedDB
      }
    }
  }

  await putIndexedDbItem(CHAT_STORE, sanitizedSession);
  return false; // sem userId, comportamento normal
}

export async function getChatSessions(userId?: string): Promise<ChatSession[]> {
  if (userId) {
    try {
      const snapshot = await getDocs(query(chatsCollection, where('userId', '==', userId), limit(100)));
      const firestoreSessions = snapshot.docs.map((chatDocument) => chatDocument.data());

      try {
        const indexedDbSessions = (await getAllIndexedDbItems<ChatSession>(CHAT_STORE))
          .filter((s) => !s.userId || s.userId === userId);

        // Merge e deduplica por id, preferindo updatedAt mais recente
        const sessionMap = new Map<string, ChatSession>();
        for (const session of firestoreSessions) {
          sessionMap.set(session.id, session);
        }
        for (const session of indexedDbSessions) {
          const existing = sessionMap.get(session.id);
          if (!existing || session.updatedAt > existing.updatedAt) {
            sessionMap.set(session.id, session);
          }
        }

        return sortChatSessions([...sessionMap.values()]);
      } catch {
        // Fallback: se IndexedDB falhar, retorna apenas Firestore
        return sortChatSessions(firestoreSessions);
      }
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    }
  }

  return sortChatSessions(await getAllIndexedDbItems<ChatSession>(CHAT_STORE));
}

export async function deleteChatSession(id: string, userId?: string): Promise<void> {
  if (userId) {
    // Deleta de ambos — getChatSessions faz merge de Firestore + IndexedDB
    await Promise.all([
      deleteDoc(doc(chatsCollection, id)).catch((error: unknown) => {
        handleFirestoreError(error, OperationType.DELETE, `chats/${id}`);
      }),
      deleteIndexedDbItem(CHAT_STORE, id),
    ]);
    return;
  }

  await deleteIndexedDbItem(CHAT_STORE, id);
}
