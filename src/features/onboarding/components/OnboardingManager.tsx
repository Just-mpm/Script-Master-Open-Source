/**
 * Gerenciador do onboarding — coordena WelcomeDialog + TourTooltip + overlay de destaque.
 *
 * - Verifica se o onboarding já foi concluído (localStorage via store)
 * - Se não: exibe WelcomeDialog
 * - Após iniciar: exibe TourTooltip para o passo atual
 * - Overlay escuro semi-transparente destaca o elemento alvo
 * - O usuário pode fechar a qualquer momento (nunca bloqueia a UI)
 */

import { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import { useOnboardingStore } from '../store/onboardingStore';
import { ONBOARDING_STEPS } from '../steps';
import { WelcomeDialog } from './WelcomeDialog';
import { TourTooltip } from './TourTooltip';

const TOTAL_STEPS = ONBOARDING_STEPS.length;

interface OnboardingManagerProps {
  children: React.ReactNode;
}

export function OnboardingManager({ children }: OnboardingManagerProps) {
  const isActive = useOnboardingStore((s) => s.isActive);
  const isCompleted = useOnboardingStore((s) => s.isCompleted);
  const currentStepIndex = useOnboardingStore((s) => s.currentStepIndex);
  const start = useOnboardingStore((s) => s.start);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const skip = useOnboardingStore((s) => s.skip);

  // Passo atual
  const currentStep = useMemo(
    () => ONBOARDING_STEPS[currentStepIndex],
    [currentStepIndex],
  );

  // Ação customizada do passo (ex: abrir templates)
  const handleAction = useCallback(() => {
    const templateBtn = document.querySelector<HTMLButtonElement>(
      '[data-template-selector-trigger]',
    );
    if (templateBtn) {
      templateBtn.click();
    }
  }, []);

  const handleStart = useCallback(() => {
    start();
  }, [start]);

  const handleSkip = useCallback(() => {
    skip();
  }, [skip]);

  // Se já completou, renderiza apenas children sem overhead
  if (isCompleted) {
    return <>{children}</>;
  }

  // Se não está ativo e não completou → mostrar WelcomeDialog
  if (!isActive && !isCompleted) {
    return (
      <>
        {children}
        <WelcomeDialog open onStart={handleStart} onSkip={handleSkip} />
      </>
    );
  }

  // Tour ativo — renderiza children + overlay + tooltip
  return (
    <>
      {children}

      {/* Overlay escuro semi-transparente */}
      <Box
        onClick={handleSkip}
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.52)',
          zIndex: 11999,
        }}
        aria-hidden="true"
      />

      {/* Tooltip do passo atual */}
      <TourTooltip
        step={currentStep}
        stepIndex={currentStepIndex}
        totalSteps={TOTAL_STEPS}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={handleSkip}
        onAction={currentStep.action ? handleAction : undefined}
      />
    </>
  );
}
