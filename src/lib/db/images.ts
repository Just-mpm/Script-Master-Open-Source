import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { SavedImage } from './types';
import {
  IMAGE_STORE,
  OperationType,
  createFirestoreConverter,
  handleFirestoreError,
  putIndexedDbItem,
  uploadBlobAndGetUrl,
} from './shared';

type FirestoreSavedImage = Omit<SavedImage, 'imageBlob'> & {
  imageUrl: string;
};

const imageGenerationConverter = createFirestoreConverter<FirestoreSavedImage>();
const imageGenerationsCollection = collection(db, 'image_generations').withConverter(imageGenerationConverter);

export async function saveImageGeneration(item: SavedImage, userId?: string): Promise<void> {
  if (userId && item.imageBlob) {
    try {
      const imageUrl = await uploadBlobAndGetUrl(`images/${userId}/${item.id}.png`, item.imageBlob);
      const rest = { ...item };
      delete rest.imageBlob;
      const firestoreItem: FirestoreSavedImage = {
        ...rest,
        userId,
        imageUrl,
      };

      await setDoc(doc(imageGenerationsCollection, item.id), firestoreItem);
      return;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.WRITE, `image_generations/${item.id}`);
    }
  }

  await putIndexedDbItem(IMAGE_STORE, item);
}
