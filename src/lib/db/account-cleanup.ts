import { collection, collectionGroup, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from '../logger';
import { deleteStorageObjectSafely } from './shared';

const log = createLogger('account-cleanup');

/**
 * Pipeline de limpeza completa ao excluir conta (LGPD).
 *
 * Remove todos os dados do usuário do Firestore e Storage:
 * 1. Projetos + subcoleções (audios, images, videos) + transcriptions
 * 2. Gerações flat (audios + cenas)
 * 3. Gerações de imagens
 * 4. Chats
 * 5. Memórias
 * 6. User settings
 * 7. Storage: audios, generations_images, videos
 *
 * Erros parciais são logados mas não impedem a exclusão da conta.
 * A estratégia é "best-effort" para maximizar a limpeza.
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  const errors: string[] = [];

  try {
    await deleteProjectsAndSubcollections(userId);
  } catch (error) {
    log.error('Falha ao deletar projetos', { error });
    errors.push('projetos');
  }

  try {
    await deleteCollectionGroup('audios', userId, `audios/${userId}`);
  } catch (error) {
    log.error('Falha ao deletar gerações de áudio', { error });
    errors.push('gerações');
  }

  try {
    await deleteCollectionGroup('image_generations', userId, `generations_images/${userId}`);
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

  if (errors.length > 0) {
    log.warn('Limpeza parcial — dados não removidos', { errors });
  }
}

// ── Helpers internos ────────────────────────────────────────────

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
      audiosSnapshot.docs.map((audioDoc) => {
        deleteStorageObjectSafely(
          `projects/${userId}/${projectId}/audios/${audioDoc.id}.wav`,
          'Erro ao deletar áudio do storage durante cleanup:',
        );
        return deleteDoc(audioDoc.ref);
      }),
    );

    // Deletar subcoleções de imagens
    const imagesSnapshot = await getDocs(
      collection(db, 'projects', projectId, 'images'),
    );
    await Promise.all(
      imagesSnapshot.docs.map((imageDoc) => {
        deleteStorageObjectSafely(
          `projects/${userId}/${projectId}/images/${imageDoc.id}.png`,
          'Erro ao deletar imagem do storage durante cleanup:',
        );
        return deleteDoc(imageDoc.ref);
      }),
    );

    // Deletar subcoleções de vídeos
    const videosSnapshot = await getDocs(
      collection(db, 'projects', projectId, 'videos'),
    );
    await Promise.all(
      videosSnapshot.docs.map((videoDoc) => {
        deleteStorageObjectSafely(
          `videos/${userId}/${projectId}/${videoDoc.id}.mp4`,
          'Erro ao deletar vídeo do storage durante cleanup:',
        );
        return deleteDoc(videoDoc.ref);
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
    snapshot.docs.map((docSnapshot) => {
      deleteStorageObjectSafely(
        `${storagePrefix}/${docSnapshot.id}`,
        `Erro ao deletar ${collectionGroup} do storage durante cleanup:`,
      );
      return deleteDoc(docSnapshot.ref);
    }),
  );
}

/**
 * Deleta um documento único por ID (user_settings usa userId como ID).
 */
async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, docId));
}
