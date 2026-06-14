/**
 * Helpers de persistência do `renderMode` do Speed Paint em UserSettings.
 *
 * Usa o padrão dual storage do projeto:
 * - Usuário logado → Firestore (`user_settings/{uid}`)
 * - Visitante (sem uid) → IndexedDB local (`user_settings/local_settings`)
 *
 * O campo é persistido dentro do objeto `studio` (StudioUserSettings) e
 * sincronizado via `merge: true` no Firestore — não sobrescreve outros
 * campos de UserSettings.
 */

import { getUserSettings, saveUserSettings } from '../../../lib/db';
import type { SpeedPaintRenderMode } from '../types/vetorial';

/**
 * Lê o `speedPaintRenderMode` salvo no UserSettings.
 * Retorna `undefined` se não houver valor salvo (ex.: primeira visita).
 */
export async function loadSpeedPaintRenderMode(
  userId?: string,
): Promise<SpeedPaintRenderMode | undefined> {
  const settings = await getUserSettings(userId);
  return settings?.speedPaintRenderMode;
}

/**
 * Salva o `speedPaintRenderMode` no UserSettings (merge com campos existentes).
 * O `customSystemPrompt` é preservado via `saveUserSettings` — passamos
 * string vazia para forçar fallback ao prompt já persistido.
 */
export async function saveSpeedPaintRenderMode(
  mode: SpeedPaintRenderMode,
  userId?: string,
): Promise<void> {
  await saveUserSettings('', userId, undefined, { speedPaintRenderMode: mode });
}
