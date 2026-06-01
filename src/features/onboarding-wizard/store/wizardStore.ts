/**
 * Store Zustand para o onboarding wizard.
 *
 * Persistencia: localStorage com chaves `s2a_onboarding_completed` (reaproveitada)
 * e `s2a_onboarding_profile` (nova, para dados do perfil).
 * Segue o padrao de persistencia existente do projeto (prefixo `s2a_`).
 */

import { create } from 'zustand';
import { createLogger } from '../../../lib/logger';
import type { WizardData } from '../types';
import { TOTAL_STEPS } from '../constants';
import { trackAnalyticsEvent } from '../../../lib/analytics';

const log = createLogger('onboardingWizard');

const COMPLETED_KEY = 's2a_onboarding_completed';
const PROFILE_KEY = 's2a_onboarding_profile';

function readCompleted(): boolean {
  try {
    return localStorage.getItem(COMPLETED_KEY) === 'true';
  } catch {
    log.warn('Falha ao ler onboarding completed');
    return false;
  }
}

function writeCompleted(value: boolean): void {
  try {
    localStorage.setItem(COMPLETED_KEY, String(value));
  } catch {
    log.warn('Falha ao persistir onboarding completed');
  }
}

function readProfile(): WizardData | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as WizardData) : null;
  } catch (err: unknown) {
    log.warn('Falha ao ler perfil do onboarding', { error: String(err) });
    return null;
  }
}

function writeProfile(data: WizardData): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch {
    log.warn('Falha ao persistir perfil do wizard');
  }
}

export interface WizardStore {
  /** Etapa atual do wizard (0-based) */
  currentStep: number;
  /** Direcao da navegacao (1 = frente, -1 = tras) — usada nas animacoes */
  direction: number;
  /** Dados coletados no wizard */
  data: WizardData;
  /** Wizard ja foi concluido (verifica localStorage) */
  isCompleted: boolean;
  /** Inicio do wizard ja registrado nesta sessao */
  hasTrackedStart: boolean;

  /** Avanca para a proxima etapa */
  nextStep: () => void;
  /** Volta para a etapa anterior */
  prevStep: () => void;
  /** Atualiza campos do perfil */
  updateData: (fields: Partial<WizardData>) => void;
  /** Alterna selecao de uma meta (multi-select) */
  toggleGoal: (goalId: string) => void;
  /** Conclui o wizard e persiste dados */
  complete: () => void;
  /** Pula o wizard sem coletar dados */
  skip: () => void;
}

export const useWizardStore = create<WizardStore>((set, get) => {
  const savedProfile = readProfile();

  return {
    currentStep: 0,
    direction: 1,
    data: savedProfile ?? { name: '', role: '', goals: [] },
    isCompleted: readCompleted(),
    hasTrackedStart: false,

    nextStep: () => {
      const { currentStep, hasTrackedStart } = get();
      if (currentStep === 0 && !hasTrackedStart) {
        trackAnalyticsEvent('onboarding_started', {});
        set({ hasTrackedStart: true });
      }
      if (currentStep < TOTAL_STEPS - 1) {
        set({ direction: 1, currentStep: currentStep + 1 });
      }
    },

    prevStep: () => {
      const { currentStep } = get();
      if (currentStep > 0) {
        set({ direction: -1, currentStep: currentStep - 1 });
      }
    },

    updateData: (fields) => {
      set((state) => ({ data: { ...state.data, ...fields } }));
    },

    toggleGoal: (goalId) => {
      set((state) => {
        const isSelected = state.data.goals.includes(goalId);
        return {
          data: {
            ...state.data,
            goals: isSelected
              ? state.data.goals.filter((g) => g !== goalId)
              : [...state.data.goals, goalId],
          },
        };
      });
    },

    complete: () => {
      const { data } = get();
      writeProfile(data);
      writeCompleted(true);
      log.debug('Wizard concluido');
      trackAnalyticsEvent('onboarding_completed', {
        role: data.role || 'unknown',
        goals_count: data.goals.length,
      });
      set({ isCompleted: true });
    },

    skip: () => {
      writeCompleted(true);
      log.debug('Wizard pulado');
      trackAnalyticsEvent('onboarding_skipped', {});
      set({ isCompleted: true });
    },
  };
});
