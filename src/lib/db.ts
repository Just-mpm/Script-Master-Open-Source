import { db, storage, auth } from './firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  const errorString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorString);
  throw new Error(errorString);
}

export interface SavedAudio {
  id: string;
  userId?: string;
  name: string;
  createdAt: number;
  audioBlob?: Blob;
  audioUrl?: string;
  script: string;
  voice: string;
  scenes?: { imageUrl: string; timestamp: number }[];
}

export interface Project {
  id: string;
  userId?: string;
  name: string;
  script: string;
  createdAt: number;
  settings: {
    selectedVoice: string;
    pace: string;
    styleNotes: string;
    isMultiSpeaker: boolean;
    speakerAName: string;
    speakerBName: string;
    speakerBVoice: string;
    audioProfile: string;
    scene: string;
    sceneDensity: number;
    sceneRatio: string;
    visualFramework?: string;
  };
}

export interface AudioSource {
  id: string;
  projectId: string;
  userId?: string;
  audioUrl: string;
  createdAt: number;
  audioBlob?: Blob;
}

export interface ProjectImage {
  id: string;
  projectId: string;
  userId?: string;
  imageUrl: string;
  prompt: string;
  timestamp: number;
  createdAt: number;
  imageBlob?: Blob;
}

export interface Memory {
  id: string;
  userId?: string;
  content: string;
  createdAt: number;
}

export interface SavedImage {
  id: string;
  userId?: string;
  name: string;
  imageUrl?: string;
  prompt: string;
  createdAt: number;
  imageBlob?: Blob;
  aspectRatio: string;
}

export interface UserSetting {
  id: string;
  userId?: string;
  customSystemPrompt: string;
  updatedAt: number;
}

const DB_NAME = 'GeminiVoiceStudioDB';
const STORE_NAME = 'generations';
const IMAGE_STORE = 'image_generations';
const PROJECTS_STORE = 'projects';
const AUDIOS_STORE = 'audios';
const IMAGES_STORE = 'project_images';
const MEMORY_STORE = 'memories';
const CHAT_STORE = 'chats';
const SETTING_STORE = 'user_settings';
const DB_VERSION = 6;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(AUDIOS_STORE)) {
        db.createObjectStore(AUDIOS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MEMORY_STORE)) {
        db.createObjectStore(MEMORY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTING_STORE)) {
        db.createObjectStore(SETTING_STORE, { keyPath: 'id' });
      }
    };
  });
};

// --- MEMORIES ---

export const saveMemory = async (content: string, userId?: string): Promise<Memory> => {
  const memory: Memory = {
    id: crypto.randomUUID(),
    userId,
    content,
    createdAt: Date.now()
  };

  if (userId) {
    try {
      await setDoc(doc(db, 'memories', memory.id), memory);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `memories/${memory.id}`);
    }
  } else {
    // Save to IndexedDB
    const idb = await initDB();
    const transaction = idb.transaction(MEMORY_STORE, 'readwrite');
    const store = transaction.objectStore(MEMORY_STORE);
    await new Promise((resolve, reject) => {
      const request = store.put(memory);
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
  }
  return memory;
};

export const getMemories = async (userId?: string): Promise<Memory[]> => {
  if (userId) {
    try {
      const q = query(collection(db, 'memories'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Memory);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'memories');
      return [];
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(MEMORY_STORE, 'readonly');
      const store = transaction.objectStore(MEMORY_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};

export const deleteMemory = async (id: string, userId?: string): Promise<void> => {
  if (userId) {
    try {
      await deleteDoc(doc(db, 'memories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `memories/${id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(MEMORY_STORE, 'readwrite');
      const store = transaction.objectStore(MEMORY_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

// --- USER SETTINGS ---

export const saveUserSettings = async (customSystemPrompt: string, userId?: string): Promise<UserSetting> => {
  const settingId = userId ? userId : 'local_settings';
  const setting: UserSetting = {
    id: settingId,
    userId,
    customSystemPrompt,
    updatedAt: Date.now()
  };

  if (userId) {
    try {
      await setDoc(doc(db, 'user_settings', setting.id), setting);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_settings/${setting.id}`);
    }
  } else {
    const idb = await initDB();
    const transaction = idb.transaction(SETTING_STORE, 'readwrite');
    const store = transaction.objectStore(SETTING_STORE);
    await new Promise((resolve, reject) => {
      const request = store.put(setting);
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
  }
  return setting;
};

export const getUserSettings = async (userId?: string): Promise<UserSetting | null> => {
  const settingId = userId ? userId : 'local_settings';
  if (userId) {
    try {
      const docRef = doc(db, 'user_settings', settingId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserSetting;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `user_settings/${settingId}`);
      return null;
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(SETTING_STORE, 'readonly');
      const store = transaction.objectStore(SETTING_STORE);
      const request = store.get(settingId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
};

// --- GENERATIONS ---

export const saveGeneration = async (item: SavedAudio, userId?: string): Promise<void> => {
  if (userId && item.audioBlob) {
    try {
      // Upload to Storage
      const storageRef = ref(storage, `audios/${userId}/${item.id}.wav`);
      await uploadBytes(storageRef, item.audioBlob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const processedScenes = [];
      if (item.scenes && item.scenes.length > 0) {
        for (let i = 0; i < item.scenes.length; i++) {
          const scene = item.scenes[i];
          if (scene.imageUrl.startsWith('data:image')) {
            const res = await fetch(scene.imageUrl);
            const blob = await res.blob();
            const sceneStorageRef = ref(storage, `generations_images/${userId}/${item.id}_scene_${i}.png`);
            await uploadBytes(sceneStorageRef, blob);
            const sceneUrl = await getDownloadURL(sceneStorageRef);
            processedScenes.push({
              ...scene,
              imageUrl: sceneUrl
            });
          } else {
            processedScenes.push(scene);
          }
        }
      }
      
      // Save to Firestore
      const firestoreItem: any = {
        ...item,
        userId,
        audioUrl: downloadUrl
      };
      
      if (processedScenes.length > 0) {
        firestoreItem.scenes = processedScenes;
      } else {
        // Ensure scenes is at least an empty array or remove it to avoid 'undefined' error
        firestoreItem.scenes = [];
      }

      delete firestoreItem.audioBlob; // Don't save blob to firestore

      // Sanitize: ensure no undefined values are sent to Firestore
      Object.keys(firestoreItem).forEach(key => {
        if (firestoreItem[key] === undefined) {
          delete firestoreItem[key];
        }
      });
      
      await setDoc(doc(db, 'generations', item.id), firestoreItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `generations/${item.id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export const getGenerations = async (userId?: string): Promise<SavedAudio[]> => {
  if (userId) {
    try {
      const q = query(collection(db, 'generations'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => doc.data() as SavedAudio);
      return items.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'generations');
      return [];
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as SavedAudio[];
        resolve(items.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  }
};

export const deleteGeneration = async (id: string, userId?: string): Promise<void> => {
  if (userId) {
    try {
      const docRef = doc(db, 'generations', id);
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() as SavedAudio : null;
      
      await deleteDoc(docRef);
      
      try {
        const storageRef = ref(storage, `audios/${userId}/${id}.wav`);
        await deleteObject(storageRef);
      } catch (storageError) {
        console.warn('Erro ao deletar arquivo do storage (pode não existir):', storageError);
      }

      if (data && data.scenes) {
        for (let i = 0; i < data.scenes.length; i++) {
          try {
            const sceneStorageRef = ref(storage, `generations_images/${userId}/${id}_scene_${i}.png`);
            await deleteObject(sceneStorageRef);
          } catch (sceneError) {
            console.warn(`Erro ao deletar cena ${i} do storage:`, sceneError);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `generations/${id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export const updateGenerationName = async (id: string, newName: string, userId?: string): Promise<void> => {
  if (userId) {
    try {
      const docRef = doc(db, 'generations', id);
      await setDoc(docRef, { name: newName }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `generations/${id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.name = newName;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
};

// --- IMAGE GENERATIONS ---

export const saveImageGeneration = async (item: SavedImage, userId?: string): Promise<void> => {
  if (userId && item.imageBlob) {
    try {
      const storageRef = ref(storage, `images/${userId}/${item.id}.png`);
      await uploadBytes(storageRef, item.imageBlob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const firestoreItem = {
        ...item,
        userId,
        imageUrl: downloadUrl
      };
      delete firestoreItem.imageBlob;
      await setDoc(doc(db, 'image_generations', item.id), firestoreItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `image_generations/${item.id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(IMAGE_STORE, 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export const getImageGenerations = async (userId?: string): Promise<SavedImage[]> => {
  if (userId) {
    try {
      const q = query(collection(db, 'image_generations'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => doc.data() as SavedImage);
      return items.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'image_generations');
      return [];
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(IMAGE_STORE, 'readonly');
      const store = transaction.objectStore(IMAGE_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as SavedImage[];
        resolve(items.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  }
};

export const deleteImageGeneration = async (id: string, userId?: string): Promise<void> => {
  if (userId) {
    try {
      await deleteDoc(doc(db, 'image_generations', id));
      try {
        const storageRef = ref(storage, `images/${userId}/${id}.png`);
        await deleteObject(storageRef);
      } catch (storageError) {
        console.warn('Erro ao deletar imagem do storage (pode não existir):', storageError);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `image_generations/${id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(IMAGE_STORE, 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export const updateImageGenerationName = async (id: string, newName: string, userId?: string): Promise<void> => {
  if (userId) {
    try {
      const docRef = doc(db, 'image_generations', id);
      await setDoc(docRef, { name: newName }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `image_generations/${id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(IMAGE_STORE, 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.name = newName;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
};

// --- PROJECTS ---

export const getProjectAudios = async (projectId: string, userId?: string): Promise<AudioSource[]> => {
  const details = await getProjectDetails(projectId, userId);
  return details.audios;
};

export const getProjectImages = async (projectId: string, userId?: string): Promise<ProjectImage[]> => {
  const details = await getProjectDetails(projectId, userId);
  return details.images;
};

export const saveProject = async (project: Project, userId?: string): Promise<void> => {
  if (userId) {
    try {
      await setDoc(doc(db, 'projects', project.id), { ...project, userId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${project.id}`);
    }
  } else {
    const idb = await initDB();
    const transaction = idb.transaction(PROJECTS_STORE, 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    await new Promise((resolve, reject) => {
      const request = store.put(project);
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
  }
};

export const getProjects = async (userId?: string): Promise<Project[]> => {
  if (userId) {
    try {
      const q = query(collection(db, 'projects'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => doc.data() as Project);
      return items.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'projects');
      return [];
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(PROJECTS_STORE, 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as Project[];
        resolve(items.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  }
};

export const saveAudioToProject = async (audio: AudioSource, userId?: string): Promise<string> => {
  if (userId && audio.audioBlob) {
    try {
      const storageRef = ref(storage, `projects/${userId}/${audio.projectId}/audios/${audio.id}.wav`);
      await uploadBytes(storageRef, audio.audioBlob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const firestoreItem = {
        ...audio,
        userId,
        audioUrl: downloadUrl
      };
      delete firestoreItem.audioBlob;
      
      await setDoc(doc(db, 'projects', audio.projectId, 'audios', audio.id), firestoreItem);
      return downloadUrl;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${audio.projectId}/audios/${audio.id}`);
      throw error;
    }
  } else {
    const idb = await initDB();
    const transaction = idb.transaction(AUDIOS_STORE, 'readwrite');
    const store = transaction.objectStore(AUDIOS_STORE);
    await new Promise((resolve, reject) => {
      const request = store.put(audio);
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
    return audio.audioUrl;
  }
};

export const saveImageToProject = async (image: ProjectImage, userId?: string): Promise<string> => {
  if (userId && image.imageBlob) {
    try {
      const storageRef = ref(storage, `projects/${userId}/${image.projectId}/images/${image.id}.png`);
      await uploadBytes(storageRef, image.imageBlob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const firestoreItem = {
        ...image,
        userId,
        imageUrl: downloadUrl
      };
      delete (firestoreItem as any).imageBlob;
      
      await setDoc(doc(db, 'projects', image.projectId, 'images', image.id), firestoreItem);
      return downloadUrl;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${image.projectId}/images/${image.id}`);
      throw error;
    }
  } else {
    const idb = await initDB();
    const transaction = idb.transaction(IMAGES_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    await new Promise((resolve, reject) => {
      const request = store.put(image);
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
    return image.imageUrl;
  }
};

export const getProjectDetails = async (projectId: string, userId?: string): Promise<{ audios: AudioSource[], images: ProjectImage[] }> => {
  if (userId) {
    try {
      const audiosQ = query(collection(db, 'projects', projectId, 'audios'));
      const imagesQ = query(collection(db, 'projects', projectId, 'images'));
      
      const [audiosSnap, imagesSnap] = await Promise.all([
        getDocs(audiosQ),
        getDocs(imagesQ)
      ]);
      
      return {
        audios: audiosSnap.docs.map(doc => doc.data() as AudioSource).sort((a, b) => a.createdAt - b.createdAt),
        images: imagesSnap.docs.map(doc => doc.data() as ProjectImage).sort((a, b) => a.timestamp - b.timestamp)
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
      return { audios: [], images: [] };
    }
  } else {
    // IndexedDB local search (simplified)
    const idb = await initDB();
    const audios: AudioSource[] = await new Promise((resolve, reject) => {
      const transaction = idb.transaction(AUDIOS_STORE, 'readonly');
      const store = transaction.objectStore(AUDIOS_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as AudioSource[]).filter(a => a.projectId === projectId));
      request.onerror = () => reject(request.error);
    });
    const images: ProjectImage[] = await new Promise((resolve, reject) => {
      const transaction = idb.transaction(IMAGES_STORE, 'readonly');
      const store = transaction.objectStore(IMAGES_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as ProjectImage[]).filter(i => i.projectId === projectId));
      request.onerror = () => reject(request.error);
    });
    return { audios, images };
  }
};

export const deleteProject = async (projectId: string, userId?: string): Promise<void> => {
  if (userId) {
    try {
      // Deleting subcollections is complex in Firestore, normally and in AI Studio Build we do it client side for simplicity if the volume is low
      const details = await getProjectDetails(projectId, userId);
      
      const promises: Promise<any>[] = [
        deleteDoc(doc(db, 'projects', projectId))
      ];
      
      details.audios.forEach(audio => {
        promises.push(deleteDoc(doc(db, 'projects', projectId, 'audios', audio.id)));
        promises.push(deleteObject(ref(storage, `projects/${userId}/${projectId}/audios/${audio.id}.wav`)).catch(() => {}));
      });
      
      details.images.forEach(image => {
        promises.push(deleteDoc(doc(db, 'projects', projectId, 'images', image.id)));
        promises.push(deleteObject(ref(storage, `projects/${userId}/${projectId}/images/${image.id}.png`)).catch(() => {}));
      });
      
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
    }
  } else {
    const idb = await initDB();
    const promises = [
      new Promise((resolve) => {
         const t = idb.transaction(PROJECTS_STORE, 'readwrite');
         t.objectStore(PROJECTS_STORE).delete(projectId).onsuccess = () => resolve(null);
      })
    ];
    // Local cleanup would need a more robust approach but this is minimal
    await Promise.all(promises);
  }
};

export const updateProjectName = async (projectId: string, newName: string, userId?: string): Promise<void> => {
  if (userId) {
    try {
      await setDoc(doc(db, 'projects', projectId), { name: newName }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${projectId}`);
    }
  } else {
    const idb = await initDB();
    const transaction = idb.transaction(PROJECTS_STORE, 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const getRequest = store.get(projectId);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.name = newName;
        store.put(item);
      }
    };
  }
};

export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  messages: any[];
  updatedAt: number;
}

export const saveChatSession = async (session: ChatSession, userId?: string): Promise<void> => {
  if (userId) {
    try {
      await setDoc(doc(db, 'chats', session.id), { ...session, userId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${session.id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(CHAT_STORE, 'readwrite');
      const store = transaction.objectStore(CHAT_STORE);
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export const getChatSessions = async (userId?: string): Promise<ChatSession[]> => {
  if (userId) {
    try {
      const q = query(collection(db, 'chats'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => doc.data() as ChatSession);
      return items.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'chats');
      return [];
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(CHAT_STORE, 'readonly');
      const store = transaction.objectStore(CHAT_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as ChatSession[];
        resolve(items.sort((a, b) => b.updatedAt - a.updatedAt));
      };
      request.onerror = () => reject(request.error);
    });
  }
};

export const deleteChatSession = async (id: string, userId?: string): Promise<void> => {
  if (userId) {
    try {
      await deleteDoc(doc(db, 'chats', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${id}`);
    }
  } else {
    const idb = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(CHAT_STORE, 'readwrite');
      const store = transaction.objectStore(CHAT_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
