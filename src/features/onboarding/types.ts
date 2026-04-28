/**
 * Tipos do módulo de onboarding guiado.
 */

/** Posicionamento do tooltip em relação ao elemento alvo */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/** Ação opcional dentro de um passo do tour */
export interface OnboardingStepAction {
  label: string;
  type: 'primary' | 'secondary';
}

/** Um passo individual do tour de onboarding */
export interface OnboardingStep {
  /** Identificador único do passo */
  id: string;
  /** ID do elemento DOM para ancorar o tooltip/Popper (vazio = passo sem alvo) */
  targetId?: string;
  /** Título exibido no tooltip/dialog */
  title: string;
  /** Conteúdo descritivo do passo */
  content: string;
  /** Posicionamento do tooltip em relação ao alvo */
  placement?: TooltipPlacement;
  /** Ação customizada opcional (ex: abrir template gallery) */
  action?: OnboardingStepAction;
}

/** Estado persistido do onboarding */
export interface OnboardingState {
  /** Tour está ativo no momento */
  isActive: boolean;
  /** Índice do passo atual */
  currentStepIndex: number;
  /** Tour já foi concluído (não exibe novamente) */
  isCompleted: boolean;
}
