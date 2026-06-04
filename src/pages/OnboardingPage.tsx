import { Navigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../features/i18n';
import { DocumentHead } from '../components/DocumentHead';
import { openAnalyticsConsentDialog } from '../components/app/AnalyticsConsentPrompt';
import { getPageSeo } from '../lib/seo';
import { useWizardStore, WizardContainer, WelcomeStep, ProfileStep, GoalsStep, CompletionStep } from '../features/onboarding-wizard';

export function OnboardingPage() {
  const { user, loading } = useAuth();
  const { t, locale } = useLocale();
  const currentStep = useWizardStore((s) => s.currentStep);
  const isStoreCompleted = useWizardStore((s) => s.isCompleted);
  const isCompleted = isStoreCompleted || localStorage.getItem('s2a_onboarding_completed') === 'true';

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (isCompleted) return <Navigate to="/app/assistente" replace />;

  const seo = getPageSeo({
    title: t('seo.onboarding.title'),
    description: t('seo.onboarding.description'),
    path: '/onboarding',
    locale,
  });

  const steps = [
    <WelcomeStep key="welcome" onNext={useWizardStore.getState().nextStep } />,
    <ProfileStep key="profile" />,
    <GoalsStep key="goals" />,
    <CompletionStep key="completion" />,
  ];

  return (
    <>
      <DocumentHead {...seo} />
      <meta name="robots" content="noindex, nofollow" />
      <WizardContainer>
        {steps[currentStep]}
      </WizardContainer>
      <Button
        size="small"
        color="inherit"
        onClick={openAnalyticsConsentDialog}
        sx={{ position: 'fixed', right: 16, bottom: 12, zIndex: 2, opacity: 0.72 }}
      >
        {t('analyticsConsent.manageCookies')}
      </Button>
    </>
  );
}
