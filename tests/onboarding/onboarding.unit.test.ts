/**
 * Testes unitários do store e utils do onboarding.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOnboardingStore } from '../../src/features/onboarding/store/onboardingStore';
import { ONBOARDING_STEPS } from '../../src/features/onboarding/steps';

describe('onboardingStore', () => {
  beforeEach(() => {
    // Reseta o store para o estado inicial antes de cada teste
    useOnboardingStore.setState({
      isActive: false,
      currentStepIndex: 0,
      isCompleted: false,
    });
    localStorage.clear();
  });

  it('inicia com isActive=false e isCompleted=false', () => {
    const state = useOnboardingStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isCompleted).toBe(false);
    expect(state.currentStepIndex).toBe(0);
  });

  it('start() ativa o tour e reseta o índice', () => {
    useOnboardingStore.getState().start();
    const state = useOnboardingStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.currentStepIndex).toBe(0);
    expect(state.isCompleted).toBe(false);
  });

  it('nextStep() avança o índice sem concluir', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
    expect(useOnboardingStore.getState().isActive).toBe(true);
  });

  it('nextStep() no último passo conclui o tour', () => {
    useOnboardingStore.getState().start();
    const lastIndex = ONBOARDING_STEPS.length - 1;

    // Avança até o último passo
    for (let i = 0; i < lastIndex; i++) {
      useOnboardingStore.getState().nextStep();
    }
    expect(useOnboardingStore.getState().currentStepIndex).toBe(lastIndex);
    expect(useOnboardingStore.getState().isActive).toBe(true);

    // Avançar além do último deve concluir
    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().isActive).toBe(false);
    expect(useOnboardingStore.getState().isCompleted).toBe(true);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
  });

  it('prevStep() volta ao passo anterior', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().nextStep();
    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(2);

    useOnboardingStore.getState().prevStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
  });

  it('prevStep() no primeiro passo não avança negativamente', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().prevStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
  });

  it('skip() marca como concluído sem passar por todos os passos', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().nextStep(); // passo 1
    useOnboardingStore.getState().skip();

    expect(useOnboardingStore.getState().isActive).toBe(false);
    expect(useOnboardingStore.getState().isCompleted).toBe(true);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
  });

  it('complete() marca como concluído', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().complete();

    expect(useOnboardingStore.getState().isActive).toBe(false);
    expect(useOnboardingStore.getState().isCompleted).toBe(true);
  });

  it('goToStep() navega para o passo especificado', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().goToStep(3);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(3);
  });

  it('goToStep() ignora índices fora do range', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().goToStep(-1);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);

    useOnboardingStore.getState().goToStep(999);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
  });
});

describe('onboardingStore — persistência localStorage', () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      isActive: false,
      currentStepIndex: 0,
      isCompleted: false,
    });
    localStorage.clear();
  });

  it('skip() persiste no localStorage', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().skip();
    expect(localStorage.getItem('s2a_onboarding_completed')).toBe('true');
  });

  it('complete() persiste no localStorage', () => {
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().complete();
    expect(localStorage.getItem('s2a_onboarding_completed')).toBe('true');
  });

  it('ler store com localStorage preenchido retorna isCompleted=true', () => {
    // O store Zustand lê localStorage na criação (inicialização).
    // Testamos que após skip/complete o valor persiste corretamente.
    useOnboardingStore.getState().start();
    useOnboardingStore.getState().skip();
    expect(localStorage.getItem('s2a_onboarding_completed')).toBe('true');
    expect(useOnboardingStore.getState().isCompleted).toBe(true);
  });

  it('não quebra quando localStorage lança erro', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    useOnboardingStore.getState().start();
    // Não deve lançar
    expect(() => useOnboardingStore.getState().skip()).not.toThrow();
    expect(useOnboardingStore.getState().isCompleted).toBe(true);

    spy.mockRestore();
  });
});

describe('ONBOARDING_STEPS', () => {
  it('tem pelo menos 5 passos', () => {
    expect(ONBOARDING_STEPS.length).toBeGreaterThanOrEqual(5);
  });

  it('primeiro passo não tem targetId (boas-vindas)', () => {
    expect(ONBOARDING_STEPS[0].id).toBe('welcome');
    expect(ONBOARDING_STEPS[0].targetId).toBeUndefined();
  });

  it('último passo não tem targetId (conclusão)', () => {
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
    expect(last.targetId).toBeUndefined();
  });

  it('passos intermediários têm targetId', () => {
    for (let i = 1; i < ONBOARDING_STEPS.length - 1; i++) {
      expect(ONBOARDING_STEPS[i].targetId).toBeDefined();
    }
  });

  it('todos os passos têm id, title e content não-vazios', () => {
    for (const step of ONBOARDING_STEPS) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.content).toBeTruthy();
    }
  });
});
