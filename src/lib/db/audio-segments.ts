import type { AudioSegment } from './types';
import { AUDIOS_STORE, getIndexedDbItem, updateIndexedDbItem } from './shared';
import { createLogger } from '../logger';

const log = createLogger('audio-segments');

/**
 * Salva o mapeamento de segmentos de áudio em uma AudioSource existente.
 * Usa updateIndexedDbItem para não sobrescrever outros campos (audioBlob, etc).
 * Se não existir AudioSource para o projeto, loga warning e ignora
 * (não cria AudioSource fantasma).
 */
export async function saveAudioSegments(
  projectId: string,
  segments: AudioSegment[],
): Promise<void> {
  try {
    await updateIndexedDbItem<{ audioSegments?: AudioSegment[] }>(
      AUDIOS_STORE,
      projectId,
      (item) => ({ ...item, audioSegments: segments }),
    );
  } catch (error: unknown) {
    // updateIndexedDbItem lança 'Item not found' se não existir
    if (error instanceof Error && error.message === 'Item not found') {
      log.warn(
        `AudioSource não encontrada para o projeto "${projectId}". Segmentos de áudio não foram salvos. Gere o áudio primeiro.`,
      );
      return;
    }
    throw error;
  }
}

/**
 * Carrega os segmentos de áudio de um projeto.
 * Retorna null se não houver AudioSource ou se audioSegments não existir.
 */
export async function loadAudioSegments(
  projectId: string,
): Promise<AudioSegment[] | null> {
  const audioSource = await getIndexedDbItem<{ audioSegments?: AudioSegment[] }>(
    AUDIOS_STORE,
    projectId,
  );
  return audioSource?.audioSegments ?? null;
}
