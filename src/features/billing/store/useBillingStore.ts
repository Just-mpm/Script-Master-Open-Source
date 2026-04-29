// ---------------------------------------------------------------------------
// useBillingStore — estado global de billing (Zustand)
// ---------------------------------------------------------------------------
//
// Gerencia o plano ativo e o uso do usuário.
// Carrega dados do Firestore (subcollection users/{uid}/subscription/current).
// Se o usuário não tem documento de assinatura, assume plano Free.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import {
  doc,
  getDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { createLogger } from '../../../lib/logger';
import type { PlanId, UsageResource, UsageRecord, UsageState } from '../types';

const log = createLogger('useBillingStore');

// ---------------------------------------------------------------------------
// Estado da store
// ---------------------------------------------------------------------------

interface BillingState {
  /** Plano ativo do usuário */
  planId: PlanId;
  /** ID do customer no Stripe (null se não tiver) */
  stripeCustomerId: string | null;
  /** ID da assinatura no Stripe (null se não tiver) */
  stripeSubscriptionId: string | null;
  /** Status da assinatura (active, canceled, past_due, etc.) */
  subscriptionStatus: string;
  /** Data de fim do período atual (timestamp ms) */
  currentPeriodEnd: number | null;
  /** Indica se a assinatura será cancelada ao fim do período */
  cancelAtPeriodEnd: boolean;
  /** Dados de uso do usuário */
  usage: UsageState;
  /** Carregando dados iniciais */
  loading: boolean;
  /** Erro no carregamento */
  error: string | null;
  /** Stripe está disponível (chave configurada) */
  stripeAvailable: boolean;
}

interface BillingActions {
  /** Carrega dados de assinatura do Firestore (uma vez) */
  loadSubscription: () => Promise<void>;
  /** Escuta mudanças em tempo real na assinatura */
  subscribeToSubscription: () => Unsubscribe;
  /** Atualiza o estado de uso (chamado após cada geração) */
  updateUsage: (resource: string, increment: number) => void;
  /** Reseta o estado (desconexão) */
  reset: () => void;
}

type BillingStore = BillingState & BillingActions;

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

const initialState: BillingState = {
  planId: 'free',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: 'none',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  usage: {
    planId: 'free',
    records: [],
    updatedAt: Date.now(),
  },
  loading: true,
  error: null,
  stripeAvailable: Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY),
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBillingStore = create<BillingStore>((set, get) => ({
  ...initialState,

  loadSubscription: async () => {
    const user = auth.currentUser;
    if (!user) {
      set({ ...initialState, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const subDoc = await getDoc(doc(db, 'users', user.uid, 'subscription', 'current'));

      if (subDoc.exists()) {
        const data = subDoc.data();

        set({
          planId: (data.planId as PlanId) ?? 'free',
          stripeCustomerId: (data.stripeCustomerId as string) ?? null,
          stripeSubscriptionId: (data.stripeSubscriptionId as string) ?? null,
          subscriptionStatus: (data.status as string) ?? 'none',
          currentPeriodEnd: (data.currentPeriodEnd as number) ?? null,
          cancelAtPeriodEnd: (data.cancelAtPeriodEnd as boolean) ?? false,
          usage: {
            planId: (data.planId as PlanId) ?? 'free',
            records: [],
            updatedAt: (data.updatedAt as number) ?? Date.now(),
          },
          loading: false,
        });

        log.info('Assinatura carregada', { planId: data.planId, status: data.status });
      } else {
        // Sem documento = plano Free
        set({
          ...initialState,
          loading: false,
          usage: {
            planId: 'free',
            records: [],
            updatedAt: Date.now(),
          },
        });

        log.info('Nenhuma assinatura encontrada — plano Free');
      }
    } catch (error) {
      log.error('Erro ao carregar assinatura', { error });
      set({
        ...initialState,
        loading: false,
        error: 'Erro ao carregar dados de assinatura',
      });
    }
  },

  subscribeToSubscription: () => {
    const user = auth.currentUser;
    if (!user) {
      set({ ...initialState, loading: false });
      return () => {};
    }

    const subRef = doc(db, 'users', user.uid, 'subscription', 'current');

    const unsubscribe = onSnapshot(
      subRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();

          set({
            planId: (data.planId as PlanId) ?? 'free',
            stripeCustomerId: (data.stripeCustomerId as string) ?? null,
            stripeSubscriptionId: (data.stripeSubscriptionId as string) ?? null,
            subscriptionStatus: (data.status as string) ?? 'none',
            currentPeriodEnd: (data.currentPeriodEnd as number) ?? null,
            cancelAtPeriodEnd: (data.cancelAtPeriodEnd as boolean) ?? false,
            loading: false,
            error: null,
          });
        }
      },
      (error) => {
        log.error('Erro no snapshot de assinatura', { error });
        // Não atualiza o estado — mantém o último conhecido
      },
    );

    return unsubscribe;
  },

  updateUsage: (resource: string, increment: number) => {
    const { usage } = get();

    const existingRecord = usage.records.find((r: UsageRecord) => r.resource === resource);

    let updatedRecords: UsageRecord[];

    if (existingRecord) {
      updatedRecords = usage.records.map((r: UsageRecord) =>
        r.resource === resource
          ? { ...r, used: r.used + increment }
          : r,
      );
    } else {
      updatedRecords = [
        ...usage.records,
        {
          resource: resource as UsageResource,
          used: increment,
          limit: 0, // Será preenchido pelo plano
          resetDate: 0,
        },
      ];
    }

    set({
      usage: {
        ...usage,
        records: updatedRecords,
        updatedAt: Date.now(),
      },
    });
  },

  reset: () => {
    set(initialState);
  },
}));

// ---------------------------------------------------------------------------
// Selectors otimizados (useShallow)
// ---------------------------------------------------------------------------

/** Retorna true se o usuário está no plano Free */
export function useIsFreePlan(): boolean {
  return useBillingStore((s) => s.planId === 'free');
}

/** Retorna true se o Stripe está disponível */
export function useIsStripeAvailable(): boolean {
  return useBillingStore((s) => s.stripeAvailable);
}

/** Retorna true se o usuário tem assinatura ativa */
export function useHasActiveSubscription(): boolean {
  return useBillingStore((s) =>
    s.subscriptionStatus === 'active' || s.subscriptionStatus === 'trialing',
  );
}
