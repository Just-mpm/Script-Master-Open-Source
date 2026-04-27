import { collection, collectionGroup, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from '../logger';
import { deleteStorageObjectSafely, clearAllIndexedDbStores } from './shared';
import type { SavedAudioScene } from './types';

const log = createLogger('account-cleanup');

/**
 * Pipeline de limpeza completa ao excluir conta (LGPD).
 *
 * Remove todos os dados do usuário do Firestore e Storage:
 * 1. Projetos + subcoleções (audios, images, videos) + transcriptions
 * 2. Gerações de áudio + imagens de cena (coleção `generations`)
 * 3. Gerações de áudio flat (audios)
 * 4. Gerações de imagens standalone
 * 5. Chats
 * 6. Memórias
 * 7. User settings
 *
 * Erros parciais são logados mas não impedem a exclusão da conta.
 * A estratégia é "best-effort" para maximizar a limpeza.
 */
export async function deleteAllUserData(userId: string): Promise<string[]> {
  const errors: string[] = [];

  try {
    await deleteProjectsAndSubcollections(userId);
  } catch (error) {
    log.error('Falha ao deletar projetos', { error });
    errors.push('projetos');
  }

  try {
    await deleteGenerationsAndSceneImages(userId);
  } catch (error) {
    log.error('Falha ao deletar gerações de áudio e imagens de cena', { error });
    errors.push('gerações de áudio');
  }

  try {
    await deleteCollectionGroup('audios', userId, `audios/${userId}`);
  } catch (error) {
    log.error('Falha ao deletar gerações de áudio', { error });
    errors.push('gerações');
  }

  // W7: imagens standalone usam path `images/${userId}/{id}.png` (ver images.ts)
  try {
    await deleteCollectionGroup('image_generations', userId, `images/${userId}`);
  } catch (error) {
    log.error('Falha ao deletar gerações de imagem', { error });
    errors.push('imagens');
  }

  try {
    await deleteCollection('chats', userId);
  } catch (error) {
    log.error('Falha ao deletar chats', { error });
    errors.push('chats');
  }

  try {
    await deleteCollection('memories', userId);
  } catch (error) {
    log.error('Falha ao deletar memórias', { error });
    errors.push('memórias');
  }

  try {
    await deleteDocument('user_settings', userId);
  } catch (error) {
    log.error('Falha ao deletar configurações', { error });
    errors.push('configurações');
  }

  // Storage: a limpeza dos Storage objects é feita inline durante a exclusão
  // dos documentos Firestore (deleteProjectsAndSubcollections e deleteCollectionGroup).
  // Diretórios vazios são removidos automaticamente pelo Firebase Storage.

  // Limpa IndexedDB local (dados pessoais que ficam no navegador)
  try {
    await clearAllIndexedDbStores();
  } catch (error) {
    log.error('Falha ao limpar IndexedDB local', { error });
    errors.push('indexeddb');
  }

  if (errors.length > 0) {
    log.warn('Limpeza parcial — dados não removidos', { errors });
  }

  return errors;
}

// ── Helpers internos ────────────────────────────────────────────

/**
 * C1: Deleta todos os documentos da coleção `generations` do usuário,
 * incluindo imagens de cena do Storage e o áudio WAV.
 * Lê o campo `scenes` de cada documento para construir os paths corretos
 * (generations_images/{userId}/{id}_scene_{index}.png).
 */
async function deleteGenerationsAndSceneImages(userId: string): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, 'generations'), where('userId', '==', userId)),
  );

  await Promise.all(
    snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      const scenes: SavedAudioScene[] | undefined = data?.scenes;

      // Deleta cada imagem de cena individualmente com o path correto
      const sceneDeletions = (scenes ?? []).map(
        (_scene: SavedAudioScene, index: number) =>
          deleteStorageObjectSafely(
            `generations_images/${userId}/${docSnapshot.id}_scene_${index}.png`,
            `Imagem de cena Storage não encontrada durante cleanup: ${docSnapshot.id}_scene_${index}`,
          ),
      );

      await Promise.all([
        ...sceneDeletions,
        // Deleta também o áudio WAV se existir
        deleteStorageObjectSafely(
          `audios/${userId}/${docSnapshot.id}.wav`,
          'Erro ao deletar áudio do storage durante cleanup:',
        ),
        deleteDoc(docSnapshot.ref),
      ]);
    }),
  );
}

/**
 * Deleta todos os projetos do usuário e suas subcoleções (audios, images, videos).
 * Remove também transcrições e Storage objects.
 */
async function deleteProjectsAndSubcollections(userId: string): Promise<void> {
  const projectsSnapshot = await getDocs(
    query(collection(db, 'projects'), where('userId', '==', userId)),
  );

  for (const projectDoc of projectsSnapshot.docs) {
    const projectId = projectDoc.id;

    // Deletar subcoleções de áudio
    const audiosSnapshot = await getDocs(
      collection(db, 'projects', projectId, 'audios'),
    );
    await Promise.all(
      audiosSnapshot.docs.map((audioDoc) =>
        Promise.all([
          deleteStorageObjectSafely(
            `projects/${userId}/${projectId}/audios/${audioDoc.id}.wav`,
            'Erro ao deletar áudio do storage durante cleanup:',
          ),
          deleteDoc(audioDoc.ref),
        ]),
      ),
    );

    // Deletar subcoleções de imagens
    const imagesSnapshot = await getDocs(
      collection(db, 'projects', projectId, 'images'),
    );
    await Promise.all(
      imagesSnapshot.docs.map((imageDoc) =>
        Promise.all([
          deleteStorageObjectSafely(
            `projects/${userId}/${projectId}/images/${imageDoc.id}.png`,
            'Erro ao deletar imagem do storage durante cleanup:',
          ),
          deleteDoc(imageDoc.ref),
        ]),
      ),
    );

    // Deletar subcoleções de vídeos (C2: path corrige para `projects/{userId}/{projectId}/videos/`)
    const videosSnapshot = await getDocs(
      collection(db, 'projects', projectId, 'videos'),
    );
    await Promise.all(
      videosSnapshot.docs.map((videoDoc) => {
        const videoFormat = videoDoc.data()?.format === 'webm' ? 'webm' : 'mp4';
        return Promise.all([
          deleteStorageObjectSafely(
            `projects/${userId}/${projectId}/videos/${videoDoc.id}.${videoFormat}`,
            'Erro ao deletar vídeo do storage durante cleanup:',
          ),
          deleteDoc(videoDoc.ref),
        ]);
      }),
    );

    // Deletar transcrição do projeto
    try {
      await deleteDoc(doc(db, 'transcriptions', projectId));
    } catch {
      // Transcrição pode não existir — ignorar
    }

    // Deletar o documento do projeto
    await deleteDoc(projectDoc.ref);
  }
}

/**
 * Deleta todos os documentos de uma coleção filtrados por userId.
 */
async function deleteCollection(collectionName: string, userId: string): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where('userId', '==', userId)),
  );

  await Promise.all(snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));
}

/**
 * Deleta documentos de uma collectionGroup filtrados por userId
 * e os objetos correspondentes no Storage.
 */
async function deleteCollectionGroup(
  collectionGroupName: string,
  userId: string,
  storagePrefix: string,
): Promise<void> {
  const snapshot = await getDocs(
    query(
      collectionGroup(db, collectionGroupName),
      where('userId', '==', userId),
    ),
  );

  await Promise.all(
    snapshot.docs.map((docSnapshot) =>
      Promise.all([
        deleteStorageObjectSafely(
          `${storagePrefix}/${docSnapshot.id}`,
          `Erro ao deletar ${collectionGroupName} do storage durante cleanup:`,
        ),
        deleteDoc(docSnapshot.ref),
      ]),
    ),
  );
}

/**
 * Deleta um documento único por ID (user_settings usa userId como ID).
 */
async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, docId));
}
