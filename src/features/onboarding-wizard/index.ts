/**
 * Barrel exports do modulo onboarding-wizard.
 */

export { useWizardStore } from './store/wizardStore';
export type { WizardStore } from './store/wizardStore';
export { WizardContainer } from './components/WizardContainer';
export { WelcomeStep } from './components/WelcomeStep';
export { ProfileStep } from './components/ProfileStep';
export { GoalsStep } from './components/GoalsStep';
export { CompletionStep } from './components/CompletionStep';
export { StepNavigation } from './components/StepNavigation';
export { SelectionCard } from './components/SelectionCard';
export type { WizardData, WizardRole, WizardGoal } from './types';
