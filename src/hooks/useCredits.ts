/**
 * Hook useCredits em vez de store Zustand — a leitura é via onSnapshot
 * do Firestore (tempo real), e o estado é local a cada componente consumidor.
 * Uma store global não traria benefício porque o Firestore já é a fonte
 * da verdade.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { functions } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { createLogger } from '../lib/logger';

const log = createLogger('useCredits');

interface UserEntitlements {
  unlimitedCredits?: boolean;
}

interface UserProfile {
  entitlements?: UserEntitlements;
}

/** Estado do saldo de créditos do usuário (subcoleção beta_access) */
export interface CreditState {
  /** Créditos disponíveis para consumo neste mês */
  availableCredits: number;
  /** Créditos já consumidos neste mês */
  usedCredits: number;
  /** Créditos temporariamente reservados por requests em andamento */
  reservedCredits: number;
  /** Créditos base do plano */
  baseCredits: number;
  /** Créditos bônus (ex: feedback) */
  bonusCredits: number;
  /** Se o bônus de feedback já foi concedido */
  feedbackBonusGranted: boolean;
  /** Se a conta tem créditos ilimitados */
  unlimitedCredits: boolean;
  /** Se está carregando o documento */
  loading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
}

interface CreditSnapshotCallableOutput {
  availableCredits: number;
  usedCredits: number;
  reservedCredits: number;
  baseCredits: number;
  bonusCredits: number;
  feedbackBonusGranted: boolean;
  unlimitedCredits: boolean;
}

// NOTE: creditsExhausted é gerenciado por hook individualmente — uma store global
// (ex: useCreditsStore) centralizaria no futuro, evitando o estado fragmentado entre
// useAudioGenerator, useAssistant, useImageGenerator e useInlineAssistant.
/** Hook que lê o saldo de créditos do usuário via listener em tempo real no Firestore */
export function useCredits(): CreditState {
  const { user } = useAuth();
  const [state, setState] = useState<CreditState>({
    availableCredits: 0,
    usedCredits: 0,
    reservedCredits: 0,
    baseCredits: 0,
    bonusCredits: 0,
    feedbackBonusGranted: false,
    unlimitedCredits: false,
    loading: true,
    error: null,
  });
  const bootstrapCompletedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const lastBlockedReconcileKeyRef = useRef<string | null>(null);
  // Backoff exponencial para evitar loop de chamadas quando creditSnapshot falha.
  // Cada tentativa dobra o delay (1s → 2s → 4s → 8s → 16s → 30s máx).
  // Após 5 tentativas consecutivas, para de tentar até o próximo ciclo.
  const reconcileAttemptRef = useRef(0);
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RECONCILE_ATTEMPTS = 5;
  const BASE_RECONCILE_DELAY_MS = 1000;
  const MAX_RECONCILE_DELAY_MS = 30_000;
  const creditSnapshotCallable = useMemo(
    () => httpsCallable<Record<string, never>, CreditSnapshotCallableOutput>(functions, 'creditSnapshot'),
    [],
  );

  const applySnapshot = useCallback((snapshot: CreditSnapshotCallableOutput) => {
    setState((prev) => ({
      ...prev,
      availableCredits: snapshot.availableCredits,
      usedCredits: snapshot.usedCredits,
      reservedCredits: snapshot.reservedCredits,
      baseCredits: snapshot.baseCredits,
      bonusCredits: snapshot.bonusCredits,
      feedbackBonusGranted: snapshot.feedbackBonusGranted,
      unlimitedCredits: snapshot.unlimitedCredits,
      loading: false,
      error: null,
    }));
  }, []);

  const refreshCredits = useCallback(async (setLoading = false) => {
    if (!user || refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    if (setLoading) {
      setState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const result = await creditSnapshotCallable({});
      bootstrapCompletedRef.current = true;
      applySnapshot(result.data);
    } catch (error: unknown) {
      bootstrapCompletedRef.current = true;
      log.error('Falha ao reconciliar saldo de créditos', { error: String(error) });
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar saldo de créditos.',
      }));
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [applySnapshot, creditSnapshotCallable, user]);

  useEffect(() => {
    if (!user) {
      bootstrapCompletedRef.current = false;
      refreshInFlightRef.current = false;
      lastBlockedReconcileKeyRef.current = null;
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    bootstrapCompletedRef.current = false;
    void refreshCredits(true);

    const creditsRef = doc(db, 'users', user.uid, 'beta_access', 'current');
    const userRef = doc(db, 'users', user.uid);

    const unsubscribeCredits = onSnapshot(
      creditsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Validação runtime: Firestore pode retornar strings, NaN, etc.
          setState((prev) => ({
            ...prev,
            availableCredits: typeof data.availableCredits === 'number' ? data.availableCredits : Number(data.availableCredits) || 0,
            usedCredits: typeof data.usedCredits === 'number' ? data.usedCredits : Number(data.usedCredits) || 0,
            reservedCredits: typeof data.reservedCredits === 'number' ? data.reservedCredits : Number(data.reservedCredits) || 0,
            baseCredits: typeof data.baseCredits === 'number' ? data.baseCredits : Number(data.baseCredits) || 0,
            bonusCredits: typeof data.bonusCredits === 'number' ? data.bonusCredits : Number(data.bonusCredits) || 0,
            feedbackBonusGranted: typeof data.feedbackBonusGranted === 'boolean' ? data.feedbackBonusGranted : Boolean(data.feedbackBonusGranted),
            loading: false,
            error: null,
          }));
        } else {
          if (bootstrapCompletedRef.current) {
            setState((prev) => ({ ...prev, loading: false }));
          }
        }
      },
      (err) => {
        log.error('Falha ao carregar documento beta_access', { error: String(err) });
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar saldo de créditos.',
        }));
      },
    );

    const unsubscribeUser = onSnapshot(
      userRef,
      (snapshot) => {
        const userData = snapshot.exists()
          ? snapshot.data() as UserProfile
          : null;

        setState((prev) => ({
          ...prev,
          unlimitedCredits: userData?.entitlements?.unlimitedCredits === true,
          loading: false,
          error: null,
        }));
      },
      (err) => {
        log.error('Falha ao carregar documento do usuário', { error: String(err) });
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar permissões da conta.',
        }));
      },
    );

    return () => {
      unsubscribeCredits();
      unsubscribeUser();
    };
  }, [refreshCredits, user]);

  useEffect(() => {
    // Limpa timer e reseta contador quando o usuário muda ou desloga
    if (!user || state.loading || state.unlimitedCredits) {
      lastBlockedReconcileKeyRef.current = null;
      reconcileAttemptRef.current = 0;
      if (reconcileTimerRef.current !== null) {
        clearTimeout(reconcileTimerRef.current);
        reconcileTimerRef.current = null;
      }
      return;
    }

    const isPotentiallyStaleBlockedState = state.availableCredits <= 0 && state.reservedCredits > 0;
    if (!isPotentiallyStaleBlockedState) {
      lastBlockedReconcileKeyRef.current = null;
      reconcileAttemptRef.current = 0;
      if (reconcileTimerRef.current !== null) {
        clearTimeout(reconcileTimerRef.current);
        reconcileTimerRef.current = null;
      }
      return;
    }

    // Limite de tentativas consecutivas — evita loop infinito quando
    // creditSnapshot está consistentemente retornando 500.
    if (reconcileAttemptRef.current >= MAX_RECONCILE_ATTEMPTS) {
      return;
    }

    const reconcileKey = `${user.uid}:${state.availableCredits}:${state.reservedCredits}`;
    // Só tenta de novo se a chave mudou (ex: reservedCredits aumentou)
    // OU se o timer expirou (retry após falha)
    if (lastBlockedReconcileKeyRef.current === reconcileKey && reconcileTimerRef.current !== null) {
      return;
    }

    lastBlockedReconcileKeyRef.current = reconcileKey;

    // Backoff exponencial: 1s, 2s, 4s, 8s, 16s, 30s (máx)
    const delayMs = Math.min(
      BASE_RECONCILE_DELAY_MS * Math.pow(2, reconcileAttemptRef.current),
      MAX_RECONCILE_DELAY_MS,
    );

    reconcileAttemptRef.current += 1;

    reconcileTimerRef.current = setTimeout(() => {
      reconcileTimerRef.current = null;
      void refreshCredits(false);
    }, delayMs);

    return () => {
      if (reconcileTimerRef.current !== null) {
        clearTimeout(reconcileTimerRef.current);
        reconcileTimerRef.current = null;
      }
    };
  }, [
    refreshCredits,
    state.availableCredits,
    state.loading,
    state.reservedCredits,
    state.unlimitedCredits,
    user,
  ]);

  return state;
}
