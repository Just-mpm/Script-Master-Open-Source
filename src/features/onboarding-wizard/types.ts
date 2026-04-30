/**
 * Tipos do onboarding wizard — perfil do usuario e opcoes de selecao.
 */

/** Dados coletados durante o wizard */
export interface WizardData {
  name: string;
  role: string;
  goals: string[];
}

/** Papel/funcao do usuario no projeto */
export type WizardRole = 'contentCreator' | 'podcaster' | 'marketer' | 'educator' | 'other';

/** Objetivo de uso selecionado pelo usuario */
export type WizardGoal = 'audio' | 'scenes' | 'video' | 'assistant';
