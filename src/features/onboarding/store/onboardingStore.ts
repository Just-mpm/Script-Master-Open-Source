/**
 * Store Zustand para o estado do onboarding.
 *
 * Persistência: `localStorage` com chave `s2a_onboarding_completed` (booleano).
 * Segue o padrão de persistência existente do projeto (prefixo `s2a_`).
 */

import { create } from 'zustand';
import { ONBOARDING_STEPS } from '../steps';
import { createLogger } from '../../../lib/logger';

const log = createLogger('onboardingStore');

const STORAGE_KEY = 's2a_onboarding_completed';

function readCompletedFromStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    log.warn('Falha ao ler estado do onboarding do localStorage');
    return false;
  }
}

function writeCompletedToStorage(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    log.warn('Falha ao persistir estado do onboarding no localStorage');
  }
}

export interface OnboardingStore {
  /** Tour está ativo no momento */
  isActive: boolean;
  /** Índice do passo atual (0-based) */
  currentStepIndex: number;
  /** Tour já foi concluído (verifica localStorage) */
  isCompleted: boolean;

  /** Inicia o tour a partir do primeiro passo */
  start: () => void;
  /** Avança para o próximo passo */
  nextStep: () => void;
  /** Volta ao passo anterior */
  prevStep: () => void;
  /** Pula o tour e marca como concluído */
  skip: () => void;
  /** Conclui o tour naturalmente (último passo) */
  complete: () => void;
  /** Pula para um passo específico */
  goToStep: (index: number) => void;
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  isActive: false,
  currentStepIndex: 0,
  isCompleted: readCompletedFromStorage(),

  start: () => {
    log.debug('Tour iniciado');
    set({ isActive: true, currentStepIndex: 0 });
  },

  nextStep: () => {
    const { currentStepIndex } = get();
    const next = currentStepIndex + 1;

    if (next >= ONBOARDING_STEPS.length) {
      // Último passo — conclui automaticamente
      writeCompletedToStorage(true);
      log.debug('Tour concluído (último passo)');
      set({ isActive: false, isCompleted: true, currentStepIndex: 0 });
    } else {
      log.debug(`Avançando para passo ${next + 1}`);
      set({ currentStepIndex: next });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      log.debug(`Voltando para passo ${currentStepIndex}`);
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  skip: () => {
    writeCompletedToStorage(true);
    log.debug('Tour pulado pelo usuário');
    set({ isActive: false, isCompleted: true, currentStepIndex: 0 });
  },

  complete: () => {
    writeCompletedToStorage(true);
    log.debug('Tour concluído pelo usuário');
    set({ isActive: false, isCompleted: true, currentStepIndex: 0 });
  },

  goToStep: (index: number) => {
    if (index >= 0 && index < ONBOARDING_STEPS.length) {
      log.debug(`Navegando para passo ${index + 1}`);
      set({ currentStepIndex: index });
    }
  },
}));
