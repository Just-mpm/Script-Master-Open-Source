/**
 * Sincroniza o `renderMode` do `useAnimationStore` com UserSettings.
 *
 * Comportamento:
 * - No mount: lê o valor salvo em UserSettings e atualiza a store.
 *   Funciona para logados (Firestore) e visitantes (IndexedDB).
 * - Em mudanças do `renderMode`: salva com debounce.
 *   Apenas para usuários logados (visitantes não têm persistência por
 *   enquanto — o default `mask` é seguro e suficiente para o modo anônimo).
 *
 * Padrão análogo a `useAutoSaveStudioSettings` (Fase 1.3): montado uma
 * vez no `App.tsx`, fora da árvore do Speed Paint, para sobreviver a
 * navegação entre rotas.
 *
 * Não usa `persist` middleware no Zustand (decisão Matheus 2026-06-14).
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAnimationStore } from '../store/animationStore';
import { loadSpeedPaintRenderMode, saveSpeedPaintRenderMode } from '../lib/userSettings';
import { createLogger } from '../../../lib/logger';

const log = createLogger('useSyncSpeedPaintRenderMode');
const DEBOUNCE_MS = 2000;

export function useSyncSpeedPaintRenderMode(): void {
  const user = useAuth().user;
  const userId = user?.uid;
  const hasLoadedRef = useRef(false);

  // ── Carrega do UserSettings no mount (uma vez, mesmo para visitantes) ──
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    void loadSpeedPaintRenderMode(userId)
      .then((mode) => {
        if (mode) {
          useAnimationStore.getState().setRenderMode(mode);
        }
      })
      .catch((err: unknown) =>
        log.warn('Falha ao carregar renderMode do UserSettings', { error: err }),
      );
  }, [userId]);

  // ── Salva com debounce quando o usuário logado muda o modo ──
  useEffect(() => {
    if (!userId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsub = useAnimationStore.subscribe((state, prevState) => {
      if (state.renderMode === prevState.renderMode) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void saveSpeedPaintRenderMode(state.renderMode, userId).catch((err: unknown) =>
          log.error('Falha ao salvar renderMode no UserSettings', { error: err }),
        );
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [userId]);
}
