import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserSetting } from './types';
import {
  OperationType,
  SETTING_STORE,
  createFirestoreConverter,
  getIndexedDbItem,
  handleFirestoreError,
  putIndexedDbItem,
} from './shared';

const LOCAL_SETTINGS_ID = 'local_settings';

const userSettingConverter = createFirestoreConverter<UserSetting>();
const userSettingsCollection = (settingId: string) => doc(db, 'user_settings', settingId).withConverter(userSettingConverter);

export async function saveUserSettings(customSystemPrompt: string, userId?: string, profile?: { name?: string; role?: string; goals?: string[] }): Promise<UserSetting> {
  const settingId = userId ?? LOCAL_SETTINGS_ID;
  const setting: UserSetting = {
    id: settingId,
    userId,
    customSystemPrompt,
    updatedAt: Date.now(),
    ...(profile?.name && { name: profile.name }),
    ...(profile?.role && { role: profile.role }),
    ...(profile?.goals?.length && { goals: profile.goals }),
  };

  if (userId) {
    try {
      await setDoc(userSettingsCollection(setting.id), setting);
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
