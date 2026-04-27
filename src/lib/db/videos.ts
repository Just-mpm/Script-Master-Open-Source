import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { ProjectVideo } from './types';
import {
  VIDEOS_STORE,
  OperationType,
  createFirestoreConverter,
  deleteIndexedDbItem,
  deleteStorageObjectSafely,
  getAllIndexedDbItems,
  handleFirestoreError,
  putIndexedDbItem,
  uploadBlobAndGetUrl,
} from './shared';

/** Tipo persistido no Firestore (sem blob) */
type FirestoreProjectVideo = Omit<ProjectVideo, 'videoBlob'>;

const videoConverter = createFirestoreConverter<FirestoreProjectVideo>();

function projectVideosCollection(projectId: string) {
  return collection(db, 'projects', projectId, 'videos').withConverter(videoConverter);
}

/**
 * Salva um vídeo associado a um projeto.
 * - Autenticado: upload do blob para Storage + metadados no Firestore.
 * - Anônimo: salva completo (com blob) no IndexedDB.
 */
export async function saveVideoToProject(
  video: Omit<ProjectVideo, 'id' | 'createdAt'>,
  userId?: string,
): Promise<ProjectVideo> {
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  if (userId && video.videoBlob) {
    try {
      // Determina extensão pelo formato
      const extension = video.format === 'webm' ? 'webm' : 'mp4';
      const videoUrl = await uploadBlobAndGetUrl(
        `projects/${userId}/${video.projectId}/videos/${id}.${extension}`,
        video.videoBlob,
      );

      const firestoreItem: FirestoreProjectVideo = {
        id,
        projectId: video.projectId,
        userId,
        videoUrl,
        format: video.format,
        width: video.width,
        height: video.height,
        fps: video.fps,
        durationInSeconds: video.durationInSeconds,
        fileSizeBytes: video.fileSizeBytes,
        createdAt,
      };

      await setDoc(doc(projectVideosCollection(video.projectId), id), firestoreItem);

      return { ...firestoreItem };
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${video.projectId}/videos/${id}`);
    }
  }

  // Caminho IndexedDB (usuário anônimo)
  const indexedDbItem: ProjectVideo = {
    ...video,
    id,
    createdAt,
    userId: userId ?? '',
  };

  await putIndexedDbItem(VIDEOS_STORE, indexedDbItem);
  return indexedDbItem;
}

/**
 * Lista vídeos de um projeto, ordenados por createdAt descendente.
 * - Autenticado: query na subcoleção Firestore.
 * - Anônimo: filtra da IndexedDB local.
 */
export async function getProjectVideos(projectId: string, userId?: string): Promise<ProjectVideo[]> {
  if (userId) {
    try {
      const snapshot = await getDocs(
        query(projectVideosCollection(projectId), orderBy('createdAt', 'desc'), limit(100)),
      );

      return snapshot.docs.map((docSnapshot) => docSnapshot.data());
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/videos`);
    }
  }

  const allVideos = await getAllIndexedDbItems<ProjectVideo>(VIDEOS_STORE);
  return allVideos
    .filter((video) => video.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Remove um vídeo de um projeto.
 * - Autenticado: deleta do Storage + Firestore.
 * - Anônimo: deleta do IndexedDB.
 */
export async function deleteVideoFromProject(
  videoId: string,
  projectId: string,
  userId?: string,
): Promise<void> {
  if (userId) {
    try {
      // Lê o documento para obter a extensão real do vídeo no Storage
      const videoDoc = await getDoc(doc(projectVideosCollection(projectId), videoId));
      const extension = videoDoc.exists() ? videoDoc.data().format : 'mp4';

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

  await deleteIndexedDbItem(VIDEOS_STORE, videoId);
}
