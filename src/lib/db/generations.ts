import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { SavedAudio, SavedAudioScene } from './types';
import {
  OperationType,
  STORE_NAME,
  createFirestoreConverter,
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
      const snapshot = await getDocs(query(generationsCollection, where('userId', '==', userId)));
      return sortGenerations(snapshot.docs.map((generationDocument) => generationDocument.data()));
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.LIST, 'generations');
    }
  }

  return sortGenerations(await getAllIndexedDbItems<SavedAudio>(STORE_NAME));
}


