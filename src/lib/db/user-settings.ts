import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { createLogger } from '../logger';
import type { UserSetting } from './types';
import {
  OperationType,
  SETTING_STORE,
  createFirestoreConverter,
  getIndexedDbItem,
  handleFirestoreError,
  putIndexedDbItem,
} from './shared';

const log = createLogger('user-settings');

const LOCAL_SETTINGS_ID = 'local_settings';

/** Campos de estúdio persistidos no Firestore (exclui script e referenceImage) */
export interface StudioUserSettings {
  selectedVoice?: string;
  isMultiSpeaker?: boolean;
  speakerAName?: string;
  speakerBName?: string;
  speakerBVoice?: string;
  audioProfile?: string;
  scene?: string;
  pace?: string;
  styleNotes?: string;
  generateScenes?: boolean;
  sceneRatio?: string;
  sceneDensity?: number;
  visualFramework?: string;
  emotion?: string;
  emotionIntensity?: number;
  imageTextLanguage?: string;
}

const userSettingConverter = createFirestoreConverter<UserSetting>();
const userSettingsCollection = (settingId: string) => doc(db, 'user_settings', settingId).withConverter(userSettingConverter);

export async function saveUserSettings(
  customSystemPrompt: string,
  userId?: string,
  profile?: { name?: string; role?: string; goals?: string[] },
  studio?: StudioUserSettings,
): Promise<UserSetting> {
  const settingId = userId ?? LOCAL_SETTINGS_ID;

  // Tenta ler settings existentes para preservar customSystemPrompt.
  // Falha silenciosamente se offline — Firestore SDK enfileira a escrita automaticamente.
  let existingCustomPrompt = '';
  if (userId) {
    try {
      const existing = await getUserSettings(userId);
      if (existing) {
        existingCustomPrompt = existing.customSystemPrompt ?? '';
      }
    } catch (err: unknown) {
      // Offline ou erro de rede — prossegue sem dados existentes
      log.warn('Falha ao ler settings existentes para merge', { error: String(err) });
    }
  }

  const setting: UserSetting = {
    id: settingId,
    userId,
    customSystemPrompt: customSystemPrompt || existingCustomPrompt || '',
    updatedAt: Date.now(),
    ...(profile?.name !== undefined ? { name: profile.name } : {}),
    ...(profile?.role !== undefined ? { role: profile.role } : {}),
    ...(profile?.goals !== undefined ? { goals: profile.goals } : {}),
    // Campos de estúdio (sincronizados via Firestore)
    ...(studio !== undefined ? studio : {}),
  };

  if (userId) {
    try {
      // merge: true — não sobrescreve campos que não foram enviados
      await setDoc(userSettingsCollection(setting.id), setting, { merge: true });
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.WRITE, `user_settings/${setting.id}`);
    }
  } else {
    await putIndexedDbItem(SETTING_STORE, setting);
  }

  return setting;
}

export async function getUserSettings(userId?: string): Promise<UserSetting | null> {
  const settingId = userId ?? LOCAL_SETTINGS_ID;

  if (userId) {
    try {
      const settingDocument = await getDoc(userSettingsCollection(settingId));
      return settingDocument.exists() ? settingDocument.data() : null;
    } catch (error: unknown) {
      handleFirestoreError(error, OperationType.GET, `user_settings/${settingId}`);
    }
  }

  return getIndexedDbItem<UserSetting>(SETTING_STORE, settingId);
}

/**
 * Marca o tour de boas-vindas do assistente como visto para o usuário.
 * Persiste no Firestore (sincroniza entre dispositivos). Visitantes (sem uid) usam IndexedDB.
 * Falha silenciosamente se offline — o caller pode usar localStorage como fallback.
 */
export async function markTourSeen(userId?: string): Promise<void> {
  const settingId = userId ?? LOCAL_SETTINGS_ID;

  if (userId) {
    try {
      await setDoc(
        userSettingsCollection(settingId),
        { tourSeen: true, updatedAt: Date.now() },
        { merge: true },
      );
    } catch (error: unknown) {
      // Não propaga — caller pode usar localStorage como fallback
      handleFirestoreError(error, OperationType.WRITE, `user_settings/${settingId}/tourSeen`);
    }
  } else {
    const existing = await getIndexedDbItem<UserSetting>(SETTING_STORE, settingId);
    const updated: UserSetting = existing
      ? { ...existing, tourSeen: true, updatedAt: Date.now() }
      : {
          id: settingId,
          customSystemPrompt: '',
          tourSeen: true,
          updatedAt: Date.now(),
        };
    await putIndexedDbItem(SETTING_STORE, updated);
  }
}

/**
 * Verifica se o tour de boas-vindas do assistente já foi visto.
 * Retorna true se já visto, false caso contrário ou em caso de erro.
 */
export async function hasTourSeen(userId?: string): Promise<boolean> {
  const settingId = userId ?? LOCAL_SETTINGS_ID;

  if (userId) {
    try {
      const settingDocument = await getDoc(userSettingsCollection(settingId));
      return settingDocument.exists() ? (settingDocument.data()?.tourSeen ?? false) : false;
    } catch (err: unknown) {
      // Offline ou erro — assume não visto para não bloquear o tour
      log.warn('Falha ao verificar tourSeen, assumindo não visto', { error: String(err) });
      return false;
    }
  }

  const local = await getIndexedDbItem<UserSetting>(SETTING_STORE, settingId);
  return local?.tourSeen ?? false;
}
