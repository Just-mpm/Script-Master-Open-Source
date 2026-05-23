import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudioStore, getStudioSettingsPatch } from '../features/studio/store';
import { saveUserSettings } from '../lib/db';
import { createLogger } from '../lib/logger';

const log = createLogger('useAutoSaveStudioSettings');
const DEBOUNCE_MS = 2000;

/**
 * Hook que observa mudanças no studioStore e salva automaticamente
 * no Firestore com debounce quando o usuário está logado.
 * Montado uma vez no App.tsx.
 */
export function useAutoSaveStudioSettings(): void {
  const user = useAuth().user;
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsub = useStudioStore.subscribe((state, prevState) => {
      const patch = getStudioSettingsPatch(state);
      const prevPatch = getStudioSettingsPatch(prevState);

      const hasChanges = Object.keys(patch).some(
        (key) => (patch as Record<string, unknown>)[key] !== (prevPatch as Record<string, unknown>)[key],
      );

      if (!hasChanges) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        saveUserSettings('', userId, undefined, patch)
          .catch((err: unknown) => log.error('Falha ao salvar settings no Firestore', { error: err }));
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [userId]);
}
