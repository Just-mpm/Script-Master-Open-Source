// ---------------------------------------------------------------------------
// useBillingInit — hook de inicialização do billing
// ---------------------------------------------------------------------------
//
// Carrega dados de assinatura quando o usuário autenticado muda.
// Escuta mudanças em tempo real via Firestore onSnapshot.
// Deve ser usado uma única vez no nível do App (AuthContext).
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { auth } from '../../../lib/firebase';
import { useBillingStore } from '../store/useBillingStore';
import { createLogger } from '../../../lib/logger';
import { isBillingEnabled } from '../../../lib/env';

const log = createLogger('useBillingInit');

/**
 * Hook que inicializa o billing quando o usuário autenticado muda.
 * Carrega dados uma vez e depois escuta mudanças em tempo real.
 *
 * Deve ser chamado dentro do AuthProvider para ter acesso ao estado de auth.
 */
export function useBillingInit(userAuthReady: boolean): void {
  const loadSubscription = useBillingStore((s) => s.loadSubscription);
  const subscribeToSubscription = useBillingStore((s) => s.subscribeToSubscription);
  const reset = useBillingStore((s) => s.reset);
  const lastUserId = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const billingEnabled = isBillingEnabled();

  useEffect(() => {
    // Se billing desabilitado, não faz nada — evita chamadas Firestore
    if (!billingEnabled) return;

    if (!userAuthReady) {
      return;
    }

    const userId = auth.currentUser?.uid ?? null;

    // Reset quando desconecta
    if (!userId) {
      if (lastUserId.current !== null) {
        log.info('Usuário desconectado — resetando billing');
        reset();
        lastUserId.current = null;
      }
      return;
    }

    // Evita recarregar para o mesmo usuário
    if (userId === lastUserId.current) {
      return;
    }

    lastUserId.current = userId;

    // Carrega dados iniciais + escuta mudanças em tempo real
    loadSubscription().then(() => {
      unsubscribeRef.current = subscribeToSubscription();
    });

    // Cleanup: cancela o listener quando o usuário muda ou o componente desmonta
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [billingEnabled, userAuthReady, loadSubscription, subscribeToSubscription, reset]);
}
