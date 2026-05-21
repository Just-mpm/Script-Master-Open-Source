/**
 * useCredits — saldo global de créditos compartilhado entre toda a aplicação.
 *
 * A leitura continua vindo do Firestore em tempo real, mas agora o estado,
 * o listener e a lógica de reconciliação vivem em uma store única para evitar
 * duplicação entre áudio, imagem, assistente e header.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, type DocumentSnapshot, type Unsubscribe } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db, functions } from '../lib/firebase';
import { createLogger } from '../lib/logger';

const log = createLogger('useCredits');
const CREDIT_SNAPSHOT_FAILURE_COOLDOWN_MS = 30_000;
const CREDIT_SNAPSHOT_COOLDOWN_ERROR = 'creditSnapshot cooldown active';
const MAX_RECONCILE_ATTEMPTS = 5;
const BASE_RECONCILE_DELAY_MS = 1000;
const MAX_RECONCILE_DELAY_MS = 30_000;

interface BetaAccessDocument {
  availableCredits?: number;
  usedCredits?: number;
  reservedCredits?: number;
  baseCredits?: number;
  bonusCredits?: number;
  feedbackBonusGranted?: boolean;
  unlimitedCredits?: boolean;
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
  /** Se o saldo atual já foi confirmado e pode ser usado para bloqueio */
  canEnforceBalance: boolean;
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

interface CreditStore extends CreditState {
  syncAuth: (uid: string | null, authLoading: boolean) => void;
  refreshCredits: (setLoading?: boolean) => Promise<void>;
  reset: () => void;
}

interface CreditsControllerState {
  authLoading: boolean;
  currentUid: string | null;
  syncedAuthKey: string | null;
  unsubscribe: Unsubscribe | null;
  bootstrapCompleted: boolean;
  balanceResolved: boolean;
  successfulSnapshot: boolean;
  refreshInFlight: boolean;
  reconcileAttempt: number;
  reconcileTimer: ReturnType<typeof setTimeout> | null;
  lastBlockedReconcileKey: string | null;
}

const creditSnapshotCallable = httpsCallable<Record<string, never>, CreditSnapshotCallableOutput>(
  functions,
  'creditSnapshot',
);

const creditSnapshotRequests = new Map<string, Promise<CreditSnapshotCallableOutput>>();
const creditSnapshotCooldowns = new Map<string, number>();

const initialState: CreditState = {
  availableCredits: 0,
  usedCredits: 0,
  reservedCredits: 0,
  baseCredits: 0,
  bonusCredits: 0,
  feedbackBonusGranted: false,
  unlimitedCredits: false,
  canEnforceBalance: false,
  loading: true,
  error: null,
};

const controller: CreditsControllerState = {
  authLoading: true,
  currentUid: null,
  syncedAuthKey: null,
  unsubscribe: null,
  bootstrapCompleted: false,
  balanceResolved: false,
  successfulSnapshot: false,
  refreshInFlight: false,
  reconcileAttempt: 0,
  reconcileTimer: null,
  lastBlockedReconcileKey: null,
};

function resetControllerState(): void {
  controller.authLoading = true;
  controller.currentUid = null;
  controller.syncedAuthKey = null;
  controller.bootstrapCompleted = false;
  controller.balanceResolved = false;
  controller.successfulSnapshot = false;
  controller.refreshInFlight = false;
  controller.reconcileAttempt = 0;
  controller.lastBlockedReconcileKey = null;
}

function clearReconcileTimer(): void {
  if (controller.reconcileTimer !== null) {
    clearTimeout(controller.reconcileTimer);
    controller.reconcileTimer = null;
  }
}

function teardownCreditsListener(): void {
  controller.unsubscribe?.();
  controller.unsubscribe = null;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number(value) || 0;
}

function readCreditState(store: CreditStore): CreditState {
  return {
    availableCredits: store.availableCredits,
    usedCredits: store.usedCredits,
    reservedCredits: store.reservedCredits,
    baseCredits: store.baseCredits,
    bonusCredits: store.bonusCredits,
    feedbackBonusGranted: store.feedbackBonusGranted,
    unlimitedCredits: store.unlimitedCredits,
    canEnforceBalance: store.canEnforceBalance,
    loading: store.loading,
    error: store.error,
  };
}

function setCreditState(updater: (state: CreditState) => Partial<CreditState>): void {
  useCreditsStore.setState((store) => updater(readCreditState(store)));
  evaluateCreditReconciliation();
}

async function requestCreditSnapshot(
  uid: string,
  fetchSnapshot: () => Promise<CreditSnapshotCallableOutput>,
): Promise<CreditSnapshotCallableOutput> {
  const cooldownUntil = creditSnapshotCooldowns.get(uid) ?? 0;
  if (cooldownUntil > Date.now()) {
    throw new Error(CREDIT_SNAPSHOT_COOLDOWN_ERROR);
  }

  const inFlightRequest = creditSnapshotRequests.get(uid);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = fetchSnapshot()
    .catch((error: unknown) => {
      creditSnapshotCooldowns.set(uid, Date.now() + CREDIT_SNAPSHOT_FAILURE_COOLDOWN_MS);
      throw error;
    })
    .finally(() => {
      creditSnapshotRequests.delete(uid);
    });

  creditSnapshotRequests.set(uid, request);
  return request;
}

function handleCreditSnapshot(snapshot: DocumentSnapshot): void {
  const fromCache = snapshot.metadata?.fromCache === true;
  const canEnforceBalance = !fromCache || controller.successfulSnapshot;

  if (snapshot.exists()) {
    controller.balanceResolved = true;
    controller.successfulSnapshot = canEnforceBalance;

    const data = snapshot.data() as BetaAccessDocument;
    const availableCredits = readNumber(data.availableCredits);
    const usedCredits = readNumber(data.usedCredits);
    const reservedCredits = readNumber(data.reservedCredits);
    const baseCredits = readNumber(data.baseCredits);
    const bonusCredits = readNumber(data.bonusCredits);
    const feedbackBonusGranted = data.feedbackBonusGranted === true;
    const unlimitedCredits = typeof data.unlimitedCredits === 'boolean'
      ? data.unlimitedCredits
      : undefined;

    setCreditState((prev) => ({
      availableCredits,
      usedCredits,
      reservedCredits,
      baseCredits,
      bonusCredits,
      feedbackBonusGranted,
      unlimitedCredits: unlimitedCredits ?? prev.unlimitedCredits,
      canEnforceBalance,
      loading: false,
      error: canEnforceBalance ? null : prev.error,
    }));
    return;
  }

  controller.balanceResolved = true;
  controller.successfulSnapshot = canEnforceBalance;

  setCreditState((prev) => ({
    availableCredits: canEnforceBalance ? 0 : prev.availableCredits,
    usedCredits: canEnforceBalance ? 0 : prev.usedCredits,
    reservedCredits: canEnforceBalance ? 0 : prev.reservedCredits,
    baseCredits: canEnforceBalance ? 0 : prev.baseCredits,
    bonusCredits: canEnforceBalance ? 0 : prev.bonusCredits,
    feedbackBonusGranted: canEnforceBalance ? false : prev.feedbackBonusGranted,
    canEnforceBalance,
    loading: false,
    error: canEnforceBalance ? null : prev.error,
  }));
}

function handleCreditSnapshotError(error: unknown): void {
  log.error('Falha ao carregar documento beta_access', { error: String(error) });
  setCreditState((prev) => ({
    loading: false,
    error: prev.canEnforceBalance || controller.balanceResolved
      ? prev.error
      : 'Erro ao carregar saldo de créditos.',
  }));
}

function subscribeToCredits(uid: string): void {
  teardownCreditsListener();
  const creditsRef = doc(db, 'users', uid, 'beta_access', 'current');

  controller.unsubscribe = onSnapshot(
    creditsRef,
    (snapshot) => {
      if (uid !== controller.currentUid) {
        return;
      }

      handleCreditSnapshot(snapshot);
    },
    (error) => {
      if (uid !== controller.currentUid) {
        return;
      }

      handleCreditSnapshotError(error);
    },
  );
}

function evaluateCreditReconciliation(): void {
  const state = readCreditState(useCreditsStore.getState());

  if (
    controller.authLoading ||
    !controller.currentUid ||
    state.loading ||
    state.unlimitedCredits ||
    state.error
  ) {
    controller.lastBlockedReconcileKey = null;
    controller.reconcileAttempt = 0;
    clearReconcileTimer();
    return;
  }

  const needsInitialSnapshotConfirmation =
    state.availableCredits <= 0 &&
    state.reservedCredits === 0 &&
    !controller.successfulSnapshot;
  const isPotentiallyStaleBlockedState =
    needsInitialSnapshotConfirmation ||
    (state.availableCredits <= 0 && state.reservedCredits > 0);

  if (!isPotentiallyStaleBlockedState) {
    controller.lastBlockedReconcileKey = null;
    controller.reconcileAttempt = 0;
    clearReconcileTimer();
    return;
  }

  if (controller.reconcileAttempt >= MAX_RECONCILE_ATTEMPTS) {
    return;
  }

  const reconcileKey = `${controller.currentUid}:${state.availableCredits}:${state.reservedCredits}`;
  if (controller.lastBlockedReconcileKey === reconcileKey && controller.reconcileTimer !== null) {
    return;
  }

  controller.lastBlockedReconcileKey = reconcileKey;
  clearReconcileTimer();

  const delayMs = Math.min(
    BASE_RECONCILE_DELAY_MS * Math.pow(2, controller.reconcileAttempt),
    MAX_RECONCILE_DELAY_MS,
  );

  controller.reconcileAttempt += 1;
  controller.reconcileTimer = setTimeout(() => {
    controller.reconcileTimer = null;
    void useCreditsStore.getState().refreshCredits(false);
  }, delayMs);
}

export const useCreditsStore = create<CreditStore>()((set, get) => ({
  ...initialState,

  syncAuth: (uid: string | null, authLoading: boolean) => {
    const authKey = authLoading ? 'loading' : uid ?? 'anonymous';
    if (controller.syncedAuthKey === authKey) {
      return;
    }

    controller.syncedAuthKey = authKey;
    controller.authLoading = authLoading;

    if (authLoading) {
      teardownCreditsListener();
      clearReconcileTimer();
      controller.currentUid = null;
      controller.bootstrapCompleted = false;
      controller.balanceResolved = false;
      controller.successfulSnapshot = false;
      controller.refreshInFlight = false;
      controller.reconcileAttempt = 0;
      controller.lastBlockedReconcileKey = null;
      set((store) => ({
        ...readCreditState(store),
        loading: true,
        error: null,
      }));
      return;
    }

    if (!uid) {
      teardownCreditsListener();
      clearReconcileTimer();
      resetControllerState();
      set({ ...initialState, loading: false });
      return;
    }

    const shouldResetForNewUser = controller.currentUid !== uid;
    controller.currentUid = uid;

    if (shouldResetForNewUser) {
      clearReconcileTimer();
      controller.bootstrapCompleted = false;
      controller.balanceResolved = false;
      controller.successfulSnapshot = false;
      controller.refreshInFlight = false;
      controller.reconcileAttempt = 0;
      controller.lastBlockedReconcileKey = null;
      set({ ...initialState });
    }

    if (!controller.unsubscribe) {
      subscribeToCredits(uid);
    }

    if (shouldResetForNewUser || get().loading) {
      void get().refreshCredits(true);
    }
  },

  refreshCredits: async (setLoading = false) => {
    const uid = controller.currentUid;
    if (controller.authLoading || !uid || controller.refreshInFlight) {
      return;
    }

    controller.refreshInFlight = true;
    if (setLoading) {
      setCreditState(() => ({ loading: true }));
    }

    try {
      const resultData = await requestCreditSnapshot(uid, async () => {
        const result = await creditSnapshotCallable({});
        return result.data;
      });

      controller.bootstrapCompleted = true;
      controller.balanceResolved = true;
      controller.successfulSnapshot = true;

      setCreditState(() => ({
        availableCredits: resultData.availableCredits,
        usedCredits: resultData.usedCredits,
        reservedCredits: resultData.reservedCredits,
        baseCredits: resultData.baseCredits,
        bonusCredits: resultData.bonusCredits,
        feedbackBonusGranted: resultData.feedbackBonusGranted,
        unlimitedCredits: resultData.unlimitedCredits,
        canEnforceBalance: true,
        loading: false,
        error: null,
      }));
    } catch (error: unknown) {
      controller.bootstrapCompleted = true;

      if (error instanceof Error && error.message === CREDIT_SNAPSHOT_COOLDOWN_ERROR) {
        setCreditState((prev) => ({
          loading: false,
          error: prev.canEnforceBalance ? null : prev.error,
        }));
        return;
      }

      log.error('Falha ao reconciliar saldo de créditos', { error: String(error) });
      setCreditState((prev) => ({
        loading: false,
        error: prev.canEnforceBalance || controller.balanceResolved
          ? prev.error
          : 'Erro ao carregar saldo de créditos.',
      }));
    } finally {
      controller.refreshInFlight = false;
    }
  },

  reset: () => {
    teardownCreditsListener();
    clearReconcileTimer();
    resetControllerState();
    set(initialState);
  },
}));

export function resetUseCreditsTestState(): void {
  teardownCreditsListener();
  clearReconcileTimer();
  creditSnapshotRequests.clear();
  creditSnapshotCooldowns.clear();
  resetControllerState();
  useCreditsStore.setState(initialState);
}

export function useCredits(): CreditState {
  const { user, loading: authLoading } = useAuth();
  const syncAuth = useCreditsStore((store) => store.syncAuth);
  const state = useCreditsStore(useShallow((store) => ({
    availableCredits: store.availableCredits,
    usedCredits: store.usedCredits,
    reservedCredits: store.reservedCredits,
    baseCredits: store.baseCredits,
    bonusCredits: store.bonusCredits,
    feedbackBonusGranted: store.feedbackBonusGranted,
    unlimitedCredits: store.unlimitedCredits,
    canEnforceBalance: store.canEnforceBalance,
    loading: store.loading,
    error: store.error,
  })));

  useEffect(() => {
    syncAuth(user?.uid ?? null, authLoading);
  }, [authLoading, syncAuth, user?.uid]);

  return state;
}
