import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from '../logger';
import type { ProjectVideo } from './types';
import {
  VIDEOS_STORE,
  createFirestoreConverter,
  deleteIndexedDbItem,
  deleteStorageObjectSafely,
  getIndexedDbItem,
  getIndexedDbItemsByIndex,
  handleFirestoreError,
  putIndexedDbItem,
  OperationType,
} from './shared';

/** Tipo persistido no Firestore (sem blob) */
type FirestoreProjectVideo = Omit<ProjectVideo, 'videoBlob'>;

const log = createLogger('videos');
const videoConverter = createFirestoreConverter<FirestoreProjectVideo>();

function projectVideosCollection(projectId: string) {
  return collection(db, 'projects', projectId, 'videos').withConverter(videoConverter);
}

function sortVideos(items: ProjectVideo[]): ProjectVideo[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

function mergeLocalAndLegacyVideos(localVideos: ProjectVideo[], legacyVideos: ProjectVideo[]): ProjectVideo[] {
  const merged = new Map<string, ProjectVideo>();

  for (const video of legacyVideos) {
    merged.set(video.id, video);
  }
  for (const video of localVideos) {
    merged.set(video.id, video);
  }

  return sortVideos([...merged.values()]);
}

function isVisibleLocalVideo(video: ProjectVideo, userId?: string): boolean {
  if (userId) {
    return video.userId === userId;
  }

  return !video.userId;
}

export async function getLocalProjectVideos(projectId: string, userId?: string): Promise<ProjectVideo[]> {
  const projectVideos = await getIndexedDbItemsByIndex<ProjectVideo>(VIDEOS_STORE, 'projectId', projectId);
  return projectVideos.filter((video) => isVisibleLocalVideo(video, userId));
}

export async function getLocalVideosForUser(userId?: string): Promise<ProjectVideo[]> {
  return getIndexedDbItemsByIndex<ProjectVideo>(VIDEOS_STORE, 'userId', userId ?? '');
}

async function getLegacyFirestoreVideos(projectId: string): Promise<ProjectVideo[]> {
  const snapshot = await getDocs(
    query(projectVideosCollection(projectId), orderBy('createdAt', 'desc'), limit(100)),
  );

  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

/**
 * Salva um vídeo associado a um projeto apenas no IndexedDB local.
 * Vídeos exportados não são mais enviados para Firestore/Storage.
 */
export async function saveVideoToProject(
  video: Omit<ProjectVideo, 'id' | 'createdAt'>,
  userId?: string,
): Promise<ProjectVideo> {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const indexedDbItem: ProjectVideo = {
    ...video,
    id,
    createdAt,
    userId: userId ?? '',
    videoUrl: video.videoUrl.startsWith('blob:') ? '' : video.videoUrl,
  };

  await putIndexedDbItem(VIDEOS_STORE, indexedDbItem);
  return indexedDbItem;
}

/**
 * Lista vídeos de um projeto, ordenados por createdAt descendente.
 * - IndexedDB local: fonte principal para novos vídeos.
 * - Firestore: leitura de vídeos legados já salvos na nuvem.
 */
export async function getProjectVideos(projectId: string, userId?: string): Promise<ProjectVideo[]> {
  const localVideos = await getLocalProjectVideos(projectId, userId);

  if (userId) {
    try {
      const legacyVideos = await getLegacyFirestoreVideos(projectId);
      return mergeLocalAndLegacyVideos(localVideos, legacyVideos);
    } catch (error: unknown) {
      log.warn('Falha ao carregar vídeos legados do Firestore; usando vídeos locais', {
        error,
        projectId,
      });
      return sortVideos(localVideos);
    }
  }

  return sortVideos(localVideos);
}

/**
 * Remove um vídeo de um projeto.
 * Sempre remove do IndexedDB local. Se houver documento legado na nuvem,
 * também remove o documento e o arquivo antigo no Storage.
 */
export async function deleteVideoFromProject(
  videoId: string,
  projectId: string,
  userId?: string,
): Promise<void> {
  const localVideo = await getIndexedDbItem<ProjectVideo>(VIDEOS_STORE, videoId);
  if (
    localVideo
    && localVideo.projectId === projectId
    && isVisibleLocalVideo(localVideo, userId)
  ) {
    await deleteIndexedDbItem(VIDEOS_STORE, videoId);
  }

  if (userId) {
    try {
      const videoDoc = await getDoc(doc(projectVideosCollection(projectId), videoId));
      if (!videoDoc.exists()) {
        return;
      }

      const extension = videoDoc.data().format;

      await Promise.all([
        deleteDoc(doc(projectVideosCollection(projectId), videoId)),
        deleteStorageObjectSafely(
          `projects/${userId}/${projectId}/videos/${videoId}.${extension}`,
          'Erro ao deletar vídeo do storage:',
        ),
      ]);
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/videos/${videoId}`);
    }
  }
}
