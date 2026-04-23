import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { AudioSegment, AudioSource } from './types';
import {
  AUDIOS_STORE,
  OperationType,
  getAllIndexedDbItems,
  handleFirestoreError,
  updateIndexedDbItem,
} from './shared';
import { createLogger } from '../logger';

const log = createLogger('audio-segments');

/**
 * Salva o mapeamento de segmentos de áudio em uma AudioSource existente.
 *
 * Dual storage:
 * - Se userId presente → Firestore subcoleção projects/{projectId}/audios/{audioId}
 *   usando setDoc com merge=true (só atualiza o campo audioSegments).
 * - Se ausente → IndexedDB store "audios" usando updateIndexedDbItem.
 *
 * Deve ser chamado APÓS saveAudioToProject para garantir que o documento exista.
 */
export async function saveAudioSegments(
  projectId: string,
  audioId: string,
  segments: AudioSegment[],
  userId?: string,
): Promise<void> {
  if (userId) {
    try {
      const audioRef = doc(db, 'projects', projectId, 'audios', audioId);
      await setDoc(audioRef, { audioSegments: segments }, { merge: true });
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/audios/${audioId}`);
    }
  }

  // Caminho IndexedDB: usa audioId como chave (keyPath 'id' da store audios)
  try {
    await updateIndexedDbItem<{ audioSegments?: AudioSegment[] }>(
      AUDIOS_STORE,
      audioId,
      (item) => ({ ...item, audioSegments: segments }),
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Item not found') {
      log.warn(
        `AudioSource não encontrada para audioId="${audioId}". Segmentos não foram salvos.`,
      );
      return;
    }
    throw error;
  }
}

/**
 * Carrega os segmentos de áudio da primeira AudioSource de um projeto.
 *
 * Dual storage:
 * - Se userId presente → Firestore subcoleção projects/{projectId}/audios
 *   (busca o primeiro documento com audioSegments preenchido).
 * - Se ausente → IndexedDB store "audios" (filtra por projectId).
 *
 * Retorna null se não houver AudioSource com segmentos para o projeto.
 */
export async function loadAudioSegments(
  projectId: string,
  userId?: string,
): Promise<AudioSegment[] | null> {
  if (userId) {
    try {
      // Caminho Firestore: busca na subcoleção audios do projeto
      const audiosRef = collection(db, 'projects', projectId, 'audios');
      const snapshot = await getDocs(query(audiosRef, where('projectId', '==', projectId)));

      // Retorna segmentos do primeiro documento que os possua
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const segments = data?.audioSegments as AudioSegment[] | undefined;
        if (segments && segments.length > 0) {
          return segments;
        }
      }

      return null;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}/audios`);
    }
  }

  // Caminho IndexedDB: busca todos os áudios e filtra por projectId
  const allAudios = await getAllIndexedDbItems<AudioSource & { audioSegments?: AudioSegment[] }>(
    AUDIOS_STORE,
  );

  const projectAudio = allAudios.find(
    (audio) => audio.projectId === projectId && audio.audioSegments && audio.audioSegments.length > 0,
  );

  return projectAudio?.audioSegments ?? null;
}
