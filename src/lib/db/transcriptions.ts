import type { TranscriptionResult } from '../../features/video-render/types';
import { TRANSCRIPTIONS_STORE, getIndexedDbItem, putIndexedDbItem, deleteIndexedDbItem } from './shared';

/** Estrutura persistida no IndexedDB para a transcrição de um projeto */
export interface StoredTranscription {
  id: string; // projectId
  result: TranscriptionResult;
  createdAt: number;
}

/**
 * Salva a transcrição de um projeto no IndexedDB.
 * Dados temporários por projeto — não precisam de sync com Firestore.
 */
export async function saveTranscription(
  projectId: string,
  result: TranscriptionResult,
): Promise<void> {
  const stored: StoredTranscription = {
    id: projectId,
    result,
    createdAt: Date.now(),
  };
  await putIndexedDbItem(TRANSCRIPTIONS_STORE, stored);
}

/**
 * Carrega a transcrição salva de um projeto.
 * Retorna null se não existir transcrição persistida.
 */
export async function loadTranscription(projectId: string): Promise<StoredTranscription | null> {
  return getIndexedDbItem<StoredTranscription>(TRANSCRIPTIONS_STORE, projectId);
}

/**
 * Remove a transcrição persistida de um projeto.
 */
export async function deleteTranscription(projectId: string): Promise<void> {
  await deleteIndexedDbItem(TRANSCRIPTIONS_STORE, projectId);
}
