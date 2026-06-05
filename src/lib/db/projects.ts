import { collection, collectionGroup, deleteDoc, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from '../logger';
import type { AudioSource, Project, ProjectImage, ProjectVideo } from './types';
import {
  AUDIOS_STORE,
  IMAGES_STORE,
  OperationType,
  PROJECTS_STORE,
  createFirestoreConverter,
  deleteIndexedDbItem,
  deleteStorageObjectSafely,
  getAllIndexedDbItems,
  handleFirestoreError,
  putIndexedDbItem,
  updateIndexedDbItem,
  uploadBlobAndGetUrl,
} from './shared';
import { deleteTranscription } from './transcriptions';
import {
  deleteVideoFromProject,
  getLocalProjectVideos,
  getLocalVideosForUser,
  getProjectVideos,
} from './videos';

const log = createLogger('projects');

type FirestoreAudioSource = Omit<AudioSource, 'audioBlob'>;
type FirestoreProjectImage = Omit<ProjectImage, 'imageBlob'>;
type FirestoreProjectVideo = Omit<ProjectVideo, 'videoBlob'>;
type ProjectDetails = { audios: AudioSource[]; images: ProjectImage[]; videos: ProjectVideo[] };

const projectConverter = createFirestoreConverter<Project>();
const audioSourceConverter = createFirestoreConverter<FirestoreAudioSource>();
const projectImageConverter = createFirestoreConverter<FirestoreProjectImage>();
const firestoreVideoConverter = createFirestoreConverter<FirestoreProjectVideo>();

const projectsCollection = collection(db, 'projects').withConverter(projectConverter);

function projectDocument(projectId: string) {
  return doc(projectsCollection, projectId);
}

function projectAudiosCollection(projectId: string) {
  return collection(db, 'projects', projectId, 'audios').withConverter(audioSourceConverter);
}

function projectImagesCollection(projectId: string) {
  return collection(db, 'projects', projectId, 'images').withConverter(projectImageConverter);
}

function sortProjects(items: Project[]): Project[] {
  return [...items].sort((firstItem, secondItem) => secondItem.createdAt - firstItem.createdAt);
}

function sortProjectAudios(items: AudioSource[]): AudioSource[] {
  return [...items].sort((firstItem, secondItem) => firstItem.createdAt - secondItem.createdAt);
}

function sortProjectImages(items: ProjectImage[]): ProjectImage[] {
  return [...items].sort((firstItem, secondItem) => firstItem.timestamp - secondItem.timestamp);
}

function getOrCreateProjectDetails(
  detailsMap: Map<string, ProjectDetails>,
  projectId: string,
): ProjectDetails {
  const current = detailsMap.get(projectId);
  if (current) {
    return current;
  }

  const details: ProjectDetails = { audios: [], images: [], videos: [] };
  detailsMap.set(projectId, details);
  return details;
}

function upsertProjectVideo(detailsMap: Map<string, ProjectDetails>, video: ProjectVideo): void {
  const current = getOrCreateProjectDetails(detailsMap, video.projectId);
  const existingIndex = current.videos.findIndex((existingVideo) => existingVideo.id === video.id);

  if (existingIndex >= 0) {
    current.videos[existingIndex] = video;
    return;
  }

  current.videos.push(video);
}

export async function saveProject(project: Project, userId?: string): Promise<void> {
  if (userId) {
    try {
      await setDoc(projectDocument(project.id), {
        ...project,
        userId,
      });
      log.debug('Projeto salvo no Firestore', { projectId: project.id, name: project.name });
      return;
    } catch (error: unknown) {
      log.warn('saveProject falhou no Firestore, caindo para IndexedDB', {
        error: error instanceof Error ? error.message : String(error),
        projectId: project.id,
      });
      handleFirestoreError(error, OperationType.WRITE, `projects/${project.id}`);
    }
  }

  await putIndexedDbItem(PROJECTS_STORE, project);
}

export async function getProjects(userId?: string): Promise<Project[]> {
  if (userId) {
    try {
      const snapshot = await getDocs(query(projectsCollection, where('userId', '==', userId), limit(100)));
      return sortProjects(snapshot.docs.map((projectDoc) => projectDoc.data()));
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    }
  }

  return sortProjects(await getAllIndexedDbItems<Project>(PROJECTS_STORE));
}

export async function saveAudioToProject(audio: AudioSource, userId?: string): Promise<string> {
  if (userId && audio.audioBlob) {
    try {
      const audioUrl = await uploadBlobAndGetUrl(
        `projects/${userId}/${audio.projectId}/audios/${audio.id}.wav`,
        audio.audioBlob,
      );

      const rest = { ...audio };
      delete rest.audioBlob;
      const firestoreItem: FirestoreAudioSource = {
        ...rest,
        userId,
        audioUrl,
      };

      await setDoc(doc(projectAudiosCollection(audio.projectId), audio.id), firestoreItem);
      return audioUrl;
    } catch (error: unknown) {
      log.warn('Falha ao salvar áudio no Firebase, salvando localmente', { error });
    }
  }

  await putIndexedDbItem(AUDIOS_STORE, audio);
  return audio.audioUrl;
}

export async function saveImageToProject(image: ProjectImage, userId?: string): Promise<string> {
  if (userId && image.imageBlob) {
    try {
      const imageUrl = await uploadBlobAndGetUrl(
        `projects/${userId}/${image.projectId}/images/${image.id}.png`,
        image.imageBlob,
      );

      const rest = { ...image };
      delete rest.imageBlob;
      const firestoreItem: FirestoreProjectImage = {
        ...rest,
        userId,
        imageUrl,
      };

      log.debug('Tentando salvar imagem no Firestore', {
        path: `projects/${image.projectId}/images/${image.id}`,
        fields: Object.keys(firestoreItem),
        imageUrlType: typeof imageUrl,
        imageUrlPrefix: imageUrl.slice(0, 20),
        hasUserId: !!firestoreItem.userId,
      });

      await setDoc(doc(projectImagesCollection(image.projectId), image.id), firestoreItem);
      return imageUrl;
    } catch (error: unknown) {
      log.warn('Falha ao salvar imagem no Firebase, salvando localmente', { error });
    }
  }

  await putIndexedDbItem(IMAGES_STORE, image);
  return image.imageUrl;
}

export async function getProjectDetails(projectId: string, userId?: string): Promise<ProjectDetails> {
  if (userId) {
    try {
      const [audioSnapshot, imageSnapshot, projectVideos] = await Promise.all([
        getDocs(query(projectAudiosCollection(projectId))),
        getDocs(query(projectImagesCollection(projectId))),
        getProjectVideos(projectId, userId),
      ]);

      return {
        audios: sortProjectAudios(audioSnapshot.docs.map((audioDoc) => audioDoc.data())),
        images: sortProjectImages(imageSnapshot.docs.map((imageDoc) => imageDoc.data())),
        videos: projectVideos,
      };
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
    }
  }

  const [allAudios, allImages, projectVideos] = await Promise.all([
    getAllIndexedDbItems<AudioSource>(AUDIOS_STORE),
    getAllIndexedDbItems<ProjectImage>(IMAGES_STORE),
    getLocalProjectVideos(projectId),
  ]);

  return {
    audios: allAudios.filter((audio) => audio.projectId === projectId),
    images: allImages.filter((image) => image.projectId === projectId),
    videos: projectVideos,
  };
}

export async function getProjectsDetailsMap(
  userId?: string,
): Promise<Record<string, ProjectDetails>> {
  if (userId) {
    try {
      const [audioSnapshot, imageSnapshot, videoSnapshot, localVideos] = await Promise.all([
        getDocs(query(collectionGroup(db, 'audios').withConverter(audioSourceConverter), where('userId', '==', userId))),
        getDocs(query(collectionGroup(db, 'images').withConverter(projectImageConverter), where('userId', '==', userId))),
        getDocs(query(collectionGroup(db, 'videos').withConverter(firestoreVideoConverter), where('userId', '==', userId))),
        getLocalVideosForUser(userId),
      ]);

      const detailsMap = new Map<string, ProjectDetails>();

      for (const audio of audioSnapshot.docs.map((audioDoc) => audioDoc.data())) {
        const current = getOrCreateProjectDetails(detailsMap, audio.projectId);
        current.audios.push(audio);
      }

      for (const image of imageSnapshot.docs.map((imageDoc) => imageDoc.data())) {
        const current = getOrCreateProjectDetails(detailsMap, image.projectId);
        current.images.push(image);
      }

      for (const video of videoSnapshot.docs.map((videoDoc) => videoDoc.data())) {
        upsertProjectVideo(detailsMap, video);
      }

      for (const video of localVideos) {
        upsertProjectVideo(detailsMap, video);
      }

      return Object.fromEntries(
        [...detailsMap.entries()].map(([projectId, details]) => [projectId, {
          audios: sortProjectAudios(details.audios),
          images: sortProjectImages(details.images),
          videos: details.videos.sort((a, b) => b.createdAt - a.createdAt),
        }]),
      );
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.GET, 'projects');
    }
  }

  const [allAudios, allImages, localVideos] = await Promise.all([
    getAllIndexedDbItems<AudioSource>(AUDIOS_STORE),
    getAllIndexedDbItems<ProjectImage>(IMAGES_STORE),
    getLocalVideosForUser(),
  ]);

  const detailsMap = new Map<string, ProjectDetails>();

  for (const audio of allAudios) {
    const current = getOrCreateProjectDetails(detailsMap, audio.projectId);
    current.audios.push(audio);
  }

  for (const image of allImages) {
    const current = getOrCreateProjectDetails(detailsMap, image.projectId);
    current.images.push(image);
  }

  for (const video of localVideos) {
    upsertProjectVideo(detailsMap, video);
  }

  return Object.fromEntries(
    [...detailsMap.entries()].map(([projectId, details]) => [projectId, {
      audios: sortProjectAudios(details.audios),
      images: sortProjectImages(details.images),
      videos: details.videos.sort((a, b) => b.createdAt - a.createdAt),
    }]),
  );
}

export async function deleteProject(projectId: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      const details = await getProjectDetails(projectId, userId);

      const operations: Promise<unknown>[] = [deleteDoc(projectDocument(projectId))];

      for (const audio of details.audios) {
        operations.push(deleteDoc(doc(projectAudiosCollection(projectId), audio.id)));
        operations.push(deleteStorageObjectSafely(
          `projects/${userId}/${projectId}/audios/${audio.id}.wav`,
          'Erro ao deletar áudio do projeto do storage:',
        ));
      }

      for (const image of details.images) {
        operations.push(deleteDoc(doc(projectImagesCollection(projectId), image.id)));
        operations.push(deleteStorageObjectSafely(
          `projects/${userId}/${projectId}/images/${image.id}.png`,
          'Erro ao deletar imagem do projeto do storage:',
        ));
      }

      for (const video of details.videos) {
        operations.push(deleteVideoFromProject(video.id, projectId, userId));
      }

      await Promise.all(operations);
      await deleteTranscription(projectId);
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
    }
  }

  const [allAudios, allImages, projectVideos] = await Promise.all([
    getAllIndexedDbItems<AudioSource>(AUDIOS_STORE),
    getAllIndexedDbItems<ProjectImage>(IMAGES_STORE),
    getLocalProjectVideos(projectId),
  ]);

  await deleteIndexedDbItem(PROJECTS_STORE, projectId);

  await Promise.all([
    ...allAudios
      .filter((audio) => audio.projectId === projectId)
      .map((audio) => deleteIndexedDbItem(AUDIOS_STORE, audio.id)),
    ...allImages
      .filter((image) => image.projectId === projectId)
      .map((image) => deleteIndexedDbItem(IMAGES_STORE, image.id)),
    ...projectVideos.map((video) => deleteVideoFromProject(video.id, projectId)),
    deleteTranscription(projectId),
  ]);
}

export async function updateProjectName(projectId: string, newName: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      await setDoc(projectDocument(projectId), { name: newName }, { merge: true });
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${projectId}`);
    }
  }

  await updateIndexedDbItem<Project>(PROJECTS_STORE, projectId, (project) => ({
    ...project,
    name: newName,
  }));
}
