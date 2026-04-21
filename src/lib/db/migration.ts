import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
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
 * Não lê dados pesados (blobs) — apenas contabiliza itens.
 */
export async function checkForMigratableData(): Promise<MigrationCheckResult> {
  const [projects, generations, imageGenerations, memories, chats, settings] = await Promise.all([
    getAllIndexedDbItems<Project>(PROJECTS_STORE),
    getAllIndexedDbItems<SavedAudio>(STORE_NAME),
    getAllIndexedDbItems<SavedImage>(IMAGE_STORE),
    getAllIndexedDbItems<Memory>(MEMORY_STORE),
    getAllIndexedDbItems<ChatSession>(CHAT_STORE),
    getAllIndexedDbItems<UserSetting>(SETTING_STORE),
  ]);

  const totalCount = projects.length + generations.length + imageGenerations.length
    + memories.length + chats.length + (settings.length > 0 ? 1 : 0);

  return {
    hasData: totalCount > 0,
    summary: {
      projects: projects.length,
      generations: generations.length,
      imageGenerations: imageGenerations.length,
      memories: memories.length,
      chats: chats.length,
      settings: settings.length > 0,
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
 */
export async function migrateAnonymousData(userId: string): Promise<MigrationResult> {
  let migrated = 0;
  let errors = 0;

  const migrations: Promise<void>[] = [];

  // --- Projects ---
  const projects = await getAllIndexedDbItems<Project>(PROJECTS_STORE);
  for (const project of projects) {
    migrations.push(
      setDoc(doc(db, 'projects', project.id), { ...project, userId })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Projeto:', project.id, err); errors++; }),
    );
  }

  // --- Memories ---
  const memories = await getAllIndexedDbItems<Memory>(MEMORY_STORE);
  for (const memory of memories) {
    migrations.push(
      setDoc(doc(db, 'memories', memory.id), { ...memory, userId })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Memória:', memory.id, err); errors++; }),
    );
  }

  // --- Chats ---
  const chats = await getAllIndexedDbItems<ChatSession>(CHAT_STORE);
  for (const chat of chats) {
    migrations.push(
      setDoc(doc(db, 'chats', chat.id), { ...chat, userId })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Chat:', chat.id, err); errors++; }),
    );
  }

  // --- User Settings (ID local → ID do userId) ---
  const settings = await getAllIndexedDbItems<UserSetting>(SETTING_STORE);
  for (const setting of settings) {
    migrations.push(
      setDoc(doc(db, 'user_settings', userId), { ...setting, id: userId, userId })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Settings:', err); errors++; }),
    );
  }

  // --- Generations (metadados apenas — blobs locais não são migrados) ---
  const generations = await getAllIndexedDbItems<SavedAudio>(STORE_NAME);
  for (const generation of generations) {
    migrations.push(
      setDoc(doc(db, 'generations', generation.id), {
        id: generation.id,
        userId: generation.userId,
        name: generation.name,
        createdAt: generation.createdAt,
        script: generation.script,
        voice: generation.voice,
        audioUrl: generation.audioUrl ?? '',
        scenes: generation.scenes ?? [],
      })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Geração:', generation.id, err); errors++; }),
    );
  }

  // --- Image Generations (metadados apenas) ---
  const imageGenerations = await getAllIndexedDbItems<SavedImage>(IMAGE_STORE);
  for (const imageGeneration of imageGenerations) {
    migrations.push(
      setDoc(doc(db, 'image_generations', imageGeneration.id), {
        id: imageGeneration.id,
        userId: imageGeneration.userId,
        name: imageGeneration.name,
        createdAt: imageGeneration.createdAt,
        prompt: imageGeneration.prompt,
        aspectRatio: imageGeneration.aspectRatio,
        imageUrl: imageGeneration.imageUrl ?? '',
      })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Imagem:', imageGeneration.id, err); errors++; }),
    );
  }

  // --- Project Audios (metadados apenas) ---
  const projectAudios = await getAllIndexedDbItems<AudioSource>(AUDIOS_STORE);
  for (const audio of projectAudios) {
    migrations.push(
      setDoc(doc(db, 'projects', audio.projectId, 'audios', audio.id), {
        id: audio.id,
        projectId: audio.projectId,
        userId,
        audioUrl: audio.audioUrl ?? '',
        createdAt: audio.createdAt,
      })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Áudio:', audio.id, err); errors++; }),
    );
  }

  // --- Project Images (metadados apenas) ---
  const projectImages = await getAllIndexedDbItems<ProjectImage>(IMAGES_STORE);
  for (const projectImage of projectImages) {
    migrations.push(
      setDoc(doc(db, 'projects', projectImage.projectId, 'images', projectImage.id), {
        id: projectImage.id,
        projectId: projectImage.projectId,
        userId,
        imageUrl: projectImage.imageUrl ?? '',
        prompt: projectImage.prompt,
        timestamp: projectImage.timestamp,
        createdAt: projectImage.createdAt,
      })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Imagem de projeto:', projectImage.id, err); errors++; }),
    );
  }

  // --- Videos (metadados apenas) ---
  const videos = await getAllIndexedDbItems<ProjectVideo>(VIDEOS_STORE);
  for (const video of videos) {
    migrations.push(
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
      })
        .then(() => { migrated++; })
        .catch((err: unknown) => { console.error('[Migração] Vídeo:', video.id, err); errors++; }),
    );
  }

  await Promise.allSettled(migrations);

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
