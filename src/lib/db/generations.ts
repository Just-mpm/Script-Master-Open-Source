import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { SavedAudio, SavedAudioScene } from './types';
import {
  OperationType,
  STORE_NAME,
  createFirestoreConverter,
  deleteIndexedDbItem,
  deleteStorageObjectSafely,
  getAllIndexedDbItems,
  handleFirestoreError,
  putIndexedDbItem,
  uploadBlobAndGetUrl,
} from './shared';

type FirestoreSavedAudio = Omit<SavedAudio, 'audioBlob'> & {
  audioUrl: string;
  scenes: SavedAudioScene[];
};

const generationConverter = createFirestoreConverter<FirestoreSavedAudio>();
const generationsCollection = collection(db, 'generations').withConverter(generationConverter);

async function uploadSceneIfNeeded(
  scene: SavedAudioScene,
  userId: string,
  generationId: string,
  sceneIndex: number,
): Promise<SavedAudioScene> {
  if (!scene.imageUrl.startsWith('data:image')) {
    return scene;
  }

  const response = await fetch(scene.imageUrl);
  const blob = await response.blob();
  const imageUrl = await uploadBlobAndGetUrl(
    `generations_images/${userId}/${generationId}_scene_${sceneIndex}.png`,
    blob,
  );

  return {
    ...scene,
    imageUrl,
  };
}

function sortGenerations(items: SavedAudio[]): SavedAudio[] {
  return [...items].sort((firstItem, secondItem) => secondItem.createdAt - firstItem.createdAt);
}

export async function saveGeneration(item: SavedAudio, userId?: string): Promise<void> {
  if (userId && item.audioBlob) {
    try {
      const audioUrl = await uploadBlobAndGetUrl(`audios/${userId}/${item.id}.wav`, item.audioBlob);
      const sceneList = item.scenes ?? [];
      const processedScenes = await Promise.all(
        sceneList.map((scene, index) => uploadSceneIfNeeded(scene, userId, item.id, index)),
      );

      const rest = { ...item };
      delete rest.audioBlob;
      const firestoreItem: FirestoreSavedAudio = {
        ...rest,
        userId,
        audioUrl,
        scenes: processedScenes,
      };

      await setDoc(doc(generationsCollection, item.id), firestoreItem);
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.WRITE, `generations/${item.id}`);
    }
  }

  await putIndexedDbItem(STORE_NAME, item);
}

export async function getGenerations(userId?: string): Promise<SavedAudio[]> {
  if (userId) {
    try {
      const snapshot = await getDocs(query(generationsCollection, where('userId', '==', userId), limit(100)));
      return sortGenerations(snapshot.docs.map((generationDocument) => generationDocument.data()));
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.LIST, 'generations');
    }
  }

  return sortGenerations(await getAllIndexedDbItems<SavedAudio>(STORE_NAME));
}

/** Exclui uma geração de áudio. Remove do Firestore, Storage (áudio + cenas) e/ou IndexedDB conforme o modo do usuário. */
export async function deleteGeneration(id: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      // Busca o doc para obter as cenas e seus paths de Storage
      const documentSnapshot = await getDoc(doc(generationsCollection, id));
      const generationData = documentSnapshot.data();

      // Remove imagens de cena do Storage (se existirem no doc)
      if (generationData?.scenes) {
        const sceneDeletions = generationData.scenes.map(
          (scene: SavedAudioScene, index: number) =>
            deleteStorageObjectSafely(
              `generations_images/${userId}/${id}_scene_${index}.png`,
              `Imagem de cena Storage não encontrada (esperado na exclusão): ${id}_scene_${index}`,
            ),
        );
        await Promise.all(sceneDeletions);
      }

      // Remove o documento do Firestore
      await deleteDoc(doc(generationsCollection, id));

      // Remove o áudio do Storage (fire-and-forget com segurança)
      await deleteStorageObjectSafely(
        `audios/${userId}/${id}.wav`,
        `Áudio Storage não encontrado (esperado na exclusão): ${id}`,
      );
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.DELETE, `generations/${id}`);
    }
  }

  await deleteIndexedDbItem(STORE_NAME, id);
}

