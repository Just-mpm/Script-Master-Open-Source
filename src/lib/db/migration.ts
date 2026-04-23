import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from '../logger';

const log = createLogger('migration');
import {
  AUDIOS_STORE,
  CHAT_STORE,
  IMAGE_STORE,
  IMAGES_STORE,
  MEMORY_STORE,
  PROJECTS_STORE,
  SETTING_STORE,
  STORE_NAME,
  VIDEOS_STORE,
  countIndexedDbItems,
  deleteIndexedDbItem,
  getAllIndexedDbItems,
} from './shared';
import type {
  AudioSource,
  ChatSession,
  Memory,
  Project,
  ProjectImage,
  ProjectVideo,
  SavedAudio,
  SavedImage,
  UserSetting,
} from './types';

/** Resultado da verificação de dados migráveis */
export interface MigrationCheckResult {
  hasData: boolean;
  summary: MigrationSummary;
}

/** Resumo dos dados encontrados no IndexedDB */
export interface MigrationSummary {
  projects: number;
  generations: number;
  imageGenerations: number;
  memories: number;
  chats: number;
  settings: boolean;
}

/** Resultado da migração com contadores de sucesso/erro */
export interface MigrationResult {
  migrated: number;
  errors: number;
  details: string;
}

const MIGRATION_FLAG_PREFIX = 'sm_migration_completed_';

/**
 * Verifica se o IndexedDB contém dados que podem ser migrados.
 * Usa count() para evitar carregar blobs pesados na memória.
 */
export async function checkForMigratableData(): Promise<MigrationCheckResult> {
  const [projects, generations, imageGenerations, memories, chats, settings] = await Promise.all([
    countIndexedDbItems(PROJECTS_STORE),
    countIndexedDbItems(STORE_NAME),
    countIndexedDbItems(IMAGE_STORE),
    countIndexedDbItems(MEMORY_STORE),
    countIndexedDbItems(CHAT_STORE),
    countIndexedDbItems(SETTING_STORE),
  ]);

  const totalCount = projects + generations + imageGenerations
    + memories + chats + (settings > 0 ? 1 : 0);

  return {
    hasData: totalCount > 0,
    summary: {
      projects,
      generations,
      imageGenerations,
      memories,
      chats,
      settings: settings > 0,
    },
  };
}

/**
 * Verifica se a migração já foi oferecida/completada para um userId.
 */
export function isMigrationAlreadyHandled(userId: string): boolean {
  return localStorage.getItem(`${MIGRATION_FLAG_PREFIX}${userId}`) !== null;
}

/**
 * Marca a migração como concluída para um userId.
 */
export function markMigrationCompleted(userId: string): void {
  localStorage.setItem(`${MIGRATION_FLAG_PREFIX}${userId}`, Date.now().toString());
}

/**
 * Migra dados do IndexedDB para o Firestore de um usuário autenticado.
 * Usa as funções de salvamento existentes para manter consistência.
 * Itens com blobs (gerações, imagens) são salvos sem upload de blob —
 * apenas os metadados são migrados. Blobs locais não podem ser transferidos
 * via Firestore ( Storage requer re-upload, que não é viável em migração).
 *
 * Após migração bem-sucedida, remove itens do IndexedDB para evitar dados fantasmas.
 */
export async function migrateAnonymousData(userId: string): Promise<MigrationResult> {
  let migrated = 0;
  let errors = 0;

  // Rastreia IDs migrados com sucesso para cleanup do IndexedDB
  const migratedIds: Map<string, string[]> = new Map();

  /**
   * Cria promise de migração que rastreia o ID em caso de sucesso.
   * Cada entrada usa (storeName, id) para permitir cleanup seletivo.
   */
  function trackMigration(
    storeName: string,
    itemId: string,
    migrationPromise: Promise<void>,
  ): void {
    migrations.push(
      migrationPromise
        .then(() => {
          migrated++;
          const ids = migratedIds.get(storeName);
          if (ids) {
            ids.push(itemId);
          } else {
            migratedIds.set(storeName, [itemId]);
          }
        })
        .catch((err: unknown) => {
          log.error('Erro ao migrar item', { store: storeName, id: itemId, error: err });
          errors++;
        }),
    );
  }

  const migrations: Promise<void>[] = [];

  // --- Projects ---
  const projects = await getAllIndexedDbItems<Project>(PROJECTS_STORE);
  for (const project of projects) {
    trackMigration(
      PROJECTS_STORE,
      project.id,
      setDoc(doc(db, 'projects', project.id), { ...project, userId }),
    );
  }

  // --- Memories ---
  const memories = await getAllIndexedDbItems<Memory>(MEMORY_STORE);
  for (const memory of memories) {
    trackMigration(
      MEMORY_STORE,
      memory.id,
      setDoc(doc(db, 'memories', memory.id), { ...memory, userId }),
    );
  }

  // --- Chats ---
  const chats = await getAllIndexedDbItems<ChatSession>(CHAT_STORE);
  for (const chat of chats) {
    trackMigration(
      CHAT_STORE,
      chat.id,
      setDoc(doc(db, 'chats', chat.id), { ...chat, userId }),
    );
  }

  // --- User Settings (ID local → ID do userId) ---
  const settings = await getAllIndexedDbItems<UserSetting>(SETTING_STORE);
  for (const setting of settings) {
    trackMigration(
      SETTING_STORE,
      setting.id,
      setDoc(doc(db, 'user_settings', userId), { ...setting, id: userId, userId }),
    );
  }

  // --- Generations (metadados apenas — blobs locais não são migrados) ---
  const generations = await getAllIndexedDbItems<SavedAudio>(STORE_NAME);
  for (const generation of generations) {
    trackMigration(
      STORE_NAME,
      generation.id,
      setDoc(doc(db, 'generations', generation.id), {
        id: generation.id,
        userId: generation.userId,
        name: generation.name,
        createdAt: generation.createdAt,
        script: generation.script,
        voice: generation.voice,
        audioUrl: generation.audioUrl ?? '',
        scenes: generation.scenes ?? [],
      }),
    );
  }

  // --- Image Generations (metadados apenas) ---
  const imageGenerations = await getAllIndexedDbItems<SavedImage>(IMAGE_STORE);
  for (const imageGeneration of imageGenerations) {
    trackMigration(
      IMAGE_STORE,
      imageGeneration.id,
      setDoc(doc(db, 'image_generations', imageGeneration.id), {
        id: imageGeneration.id,
        userId: imageGeneration.userId,
        name: imageGeneration.name,
        createdAt: imageGeneration.createdAt,
        prompt: imageGeneration.prompt,
        aspectRatio: imageGeneration.aspectRatio,
        imageUrl: imageGeneration.imageUrl ?? '',
      }),
    );
  }

  // --- Project Audios (metadados apenas) ---
  const projectAudios = await getAllIndexedDbItems<AudioSource>(AUDIOS_STORE);
  for (const audio of projectAudios) {
    trackMigration(
      AUDIOS_STORE,
      audio.id,
      setDoc(doc(db, 'projects', audio.projectId, 'audios', audio.id), {
        id: audio.id,
        projectId: audio.projectId,
        userId,
        audioUrl: audio.audioUrl ?? '',
        createdAt: audio.createdAt,
      }),
    );
  }

  // --- Project Images (metadados apenas) ---
  const projectImages = await getAllIndexedDbItems<ProjectImage>(IMAGES_STORE);
  for (const projectImage of projectImages) {
    trackMigration(
      IMAGES_STORE,
      projectImage.id,
      setDoc(doc(db, 'projects', projectImage.projectId, 'images', projectImage.id), {
        id: projectImage.id,
        projectId: projectImage.projectId,
        userId,
        imageUrl: projectImage.imageUrl ?? '',
        prompt: projectImage.prompt,
        timestamp: projectImage.timestamp,
        createdAt: projectImage.createdAt,
      }),
    );
  }

  // --- Videos (metadados apenas) ---
  const videos = await getAllIndexedDbItems<ProjectVideo>(VIDEOS_STORE);
  for (const video of videos) {
    trackMigration(
      VIDEOS_STORE,
      video.id,
      setDoc(doc(db, 'projects', video.projectId, 'videos', video.id), {
        id: video.id,
        projectId: video.projectId,
        userId,
        videoUrl: video.videoUrl,
        format: video.format,
        width: video.width,
        height: video.height,
        fps: video.fps,
        durationInSeconds: video.durationInSeconds,
        fileSizeBytes: video.fileSizeBytes,
        createdAt: video.createdAt,
      }),
    );
  }

  await Promise.allSettled(migrations);

  // Limpa itens migrados com sucesso do IndexedDB para evitar dados fantasmas
  await cleanupMigratedItems(migratedIds);

  const details = [
    `${projects.length} projetos`,
    `${generations.length} gerações`,
    `${imageGenerations.length} imagens`,
    `${memories.length} memórias`,
    `${chats.length} chats`,
    `${videos.length} vídeos`,
  ].join(', ');

  return { migrated, errors, details };
}

/**
 * Remove do IndexedDB os itens que foram migrados com sucesso para o Firestore.
 * Usa Promise.allSettled para que falhas no cleanup não revertam o status da migração.
 */
async function cleanupMigratedItems(migratedIds: Map<string, string[]>): Promise<void> {
  const cleanups: Promise<void>[] = [];

  for (const [storeName, ids] of migratedIds) {
    if (ids.length === 0) continue;

    for (const id of ids) {
      cleanups.push(
        deleteIndexedDbItem(storeName, id).catch((err: unknown) => {
          log.warn('Falha ao remover item migrado do IndexedDB', { store: storeName, id, error: err });
        }),
      );
    }
  }

  if (cleanups.length > 0) {
    await Promise.allSettled(cleanups);
  }
}
