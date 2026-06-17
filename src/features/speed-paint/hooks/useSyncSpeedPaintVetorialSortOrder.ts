/**
 * Sincroniza o `vetorialSortOrder` do `useAnimationStore` com UserSettings.
 *
 * Comportamento:
 * - No mount: lê o valor salvo em UserSettings e atualiza a store.
 *   Funciona para logados (Firestore) e visitantes (IndexedDB).
 * - Em mudanças do `vetorialSortOrder`: salva com debounce.
 *   Apenas para usuários logados (visitantes não têm persistência por
 *   enquanto — o default `top-down` é seguro e suficiente para o modo anônimo).
 *
 * Espelha `useSyncSpeedPaintRenderMode` (mesmo padrão Fase 1.3):
 * montado uma vez no `App.tsx`, fora da árvore do Speed Paint, para
 * sobreviver a navegação entre rotas.
 *
 * Não usa `persist` middleware no Zustand (decisão Matheus 2026-06-14).
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAnimationStore } from '../store/animationStore';
import {
  loadSpeedPaintVetorialSortOrder,
  saveSpeedPaintVetorialSortOrder,
} from '../lib/userSettings';
import { createLogger } from '../../../lib/logger';

const log = createLogger('useSyncSpeedPaintVetorialSortOrder');
const DEBOUNCE_MS = 2000;

export function useSyncSpeedPaintVetorialSortOrder(): void {
  const user = useAuth().user;
  const userId = user?.uid;
  const hasLoadedRef = useRef(false);

  // ── Carrega do UserSettings no mount (uma vez, mesmo para visitantes) ──
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    void loadSpeedPaintVetorialSortOrder(userId)
      .then((order) => {
        if (order) {
          useAnimationStore.getState().setVetorialSortOrder(order);
        }
      })
      .catch((err: unknown) =>
        log.warn('Falha ao carregar vetorialSortOrder do UserSettings', { error: err }),
      );
  }, [userId]);

  // ── Salva com debounce quando o usuário logado muda a ordem ──
  useEffect(() => {
    if (!userId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsub = useAnimationStore.subscribe((state, prevState) => {
      if (state.vetorialSortOrder === prevState.vetorialSortOrder) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void saveSpeedPaintVetorialSortOrder(state.vetorialSortOrder, userId).catch((err: unknown) =>
          log.error('Falha ao salvar vetorialSortOrder no UserSettings', { error: err }),
        );
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [userId]);
}
