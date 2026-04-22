import type { TranscriptionResult } from '../../features/video-render/types';
import { TRANSCRIPTIONS_STORE, getIndexedDbItem, putIndexedDbItem, deleteIndexedDbItem } from './shared';
import { createLogger } from '../logger';

const log = createLogger('transcriptions');

/**
 * @module transcriptions
 *
 * ⚠️ APENAS IndexedDB — sem dual storage (Firestore).
 *
 * Transcrições são dados temporários por projeto e não fazem sync com a nuvem.
 * Em mudanças de dispositivo ou limpeza de dados do navegador, elas são perdidas.
 * Isso é intencional: transcrições são regeneráveis a partir do áudio (via Whisper WASM)
 * e implementar dual storage completo seria overengineering para o benefício.
 *
 * Se o usuário precisar de persistência cruzada, o fluxo correto é re-renderizar
 * o vídeo com legendas no mesmo dispositivo.
 */

/** Estrutura persistida no IndexedDB para a transcrição de um projeto */
export interface StoredTranscription {
  id: string; // projectId
  result: TranscriptionResult;
  createdAt: number;
}

/** Flag para emitir aviso apenas na primeira chamada */
let hasLoggedNotice = false;

/**
 * Salva a transcrição de um projeto no IndexedDB.
 *
 * @note Dados locais apenas — não sincronizam com Firestore em nenhuma circunstância.
 * Se userId for necessário futuramente, a arquitetura dual storage precisará ser expandida.
 */
export async function saveTranscription(
  projectId: string,
  result: TranscriptionResult,
): Promise<void> {
  if (!hasLoggedNotice) {
    hasLoggedNotice = true;
    log.info(
      'Transcrições são salvas apenas no IndexedDB local. ' +
      'Elas não sincronizam entre dispositivos e podem ser perdidas ao limpar dados do navegador.',
    );
  }

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
