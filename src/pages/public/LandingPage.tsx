import { lazy, Suspense } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { motion } from 'motion/react';
import Mic from '@mui/icons-material/Mic';
import PlayCircle from '@mui/icons-material/PlayCircle';
import ImageIcon from '@mui/icons-material/Image';
import Palette from '@mui/icons-material/Palette';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import LocalLibrary from '@mui/icons-material/LocalLibrary';
import EditNote from '@mui/icons-material/EditNote';
import Speed from '@mui/icons-material/Speed';
import Storage from '@mui/icons-material/Storage';
import { getPageSeo } from '../../lib/seo';
import { DocumentHead } from '../../components/DocumentHead';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { FeatureCard } from '../../components/public/FeatureCard';
import { FeatureShowcase } from '../../components/public/FeatureShowcase';
import { CTASection } from '../../components/public/CTASection';
import { StepCard } from '../../components/public/StepCard';
import { SocialProofBar } from '../../components/public/SocialProofBar';
import { UseCasesSection } from '../../components/public/UseCasesSection';
import { MetricsSection } from '../../components/public/MetricsSection';
import { ProductDemoSection } from '../../components/public/ProductDemoSection';
import { TestimonialsSection } from '../../components/public/TestimonialsSection';
import { staggerContainer, fadeInUp, VIEWPORT_ONCE } from '../../components/public/animations';
import { useLocale } from '../../features/i18n';
import { RADIUS_SM, WHITE_12 } from '../../theme/tokens';

const MarketingDemoPlayer = lazy(async () => {
  const module = await import('../../features/public-demo-video');
  return { default: module.MarketingDemoPlayer };
});

export default function LandingPage() {
  const { t, locale } = useLocale();

  // Arrays de dados i18n — dentro do componente pois precisam de t()
  const HIGHLIGHT_FEATURES = [
    {
      icon: Mic,
      title: t('landing.featureCards.voice.title'),
      description: t('landing.featureCards.voice.description'),
    },
    {
      icon: PlayCircle,
      title: t('landing.featureCards.video.title'),
      description: t('landing.featureCards.video.description'),
    },
    {
      icon: ImageIcon,
      title: t('landing.featureCards.images.title'),
      description: t('landing.featureCards.images.description'),
    },
    {
      icon: Palette,
      title: t('landing.featureCards.speedPaint.title'),
      description: t('landing.featureCards.speedPaint.description'),
    },
    {
      icon: AutoAwesome,
      title: t('landing.featureCards.assistant.title'),
      description: t('landing.featureCards.assistant.description'),
    },
    {
      icon: LocalLibrary,
      title: t('landing.featureCards.library.title'),
      description: t('landing.featureCards.library.description'),
    },
  ];

  const ALL_FEATURES = [
    {
      icon: Mic,
      title: t('landing.moreFeatures.cards.multiSpeaker.title'),
      description: t('landing.moreFeatures.cards.multiSpeaker.description'),
    },
    {
      icon: Speed,
      title: t('landing.moreFeatures.cards.chunking.title'),
      description: t('landing.moreFeatures.cards.chunking.description'),
    },
    {
      icon: Storage,
      title: t('landing.moreFeatures.cards.dualStorage.title'),
      description: t('landing.moreFeatures.cards.dualStorage.description'),
    },
  ];

  const STEPS = [
    {
      number: 1,
      title: t('landing.steps.1.title'),
      description: t('landing.steps.1.description'),
      icon: EditNote,
    },
    {
      number: 2,
      title: t('landing.steps.2.title'),
      description: t('landing.steps.2.description'),
      icon: AutoAwesome,
    },
    {
      number: 3,
      title: t('landing.steps.3.title'),
      description: t('landing.steps.3.description'),
      icon: PlayCircle,
    },
  ];

  const seo = getPageSeo({
    title: t('seo.landing.title'),
    description: t('seo.landing.description'),
    path: '/',
    jsonLdType: 'software',
  });

  return (
    <>
      <DocumentHead {...seo} locale={locale} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title={t('landing.hero.title')}
        subtitle={t('landing.hero.subtitle')}
        primaryCta={{ label: t('landing.hero.cta'), to: '/cadastro' }}
        secondaryCta={{ label: t('landing.hero.ctaSecondary'), to: '/funcionalidades' }}
        visual={
          <Suspense fallback={<HeroDemoFallback alt={t('landing.hero.alt')} />}>
            <MarketingDemoPlayer alt={t('landing.hero.alt')} />
          </Suspense>
        }
      />

      {/* Social Proof */}
      <SocialProofBar
        label={t('landing.socialProof.label')}
        sublabel={t('landing.socialProof.sublabel')}
      />

      {/* Features Highlights — Grid 3x2 */}
      <Box sx={{ pt: { xs: 8, md: 12 } }}>
        <Box
          component={motion.div}
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}
        >
          <Box component={motion.div} variants={fadeInUp}>
            <Typography
              variant="h3"
              component="h2"
              sx={{ mb: 1.5, letterSpacing: 0 }}
            >
              {t('landing.features.title')}
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}>
              {t('landing.features.subtitle')}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {HIGHLIGHT_FEATURES.map((feature, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={feature.title}>
              <FeatureCard {...feature} index={idx} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Casos de Uso */}
      <UseCasesSection />

      {/* Feature Showcase — TTS */}
      <FeatureShowcase
        icon={Mic}
        title={t('landing.ttsShowcase.title')}
        description={t('landing.ttsShowcase.description')}
        benefits={[
          t('landing.ttsShowcase.benefits.0'),
          t('landing.ttsShowcase.benefits.1'),
          t('landing.ttsShowcase.benefits.2'),
          t('landing.ttsShowcase.benefits.3'),
          t('landing.ttsShowcase.benefits.4'),
        ]}
        visual={
          <Box
            component="img"
            src="/images/public/feature-tts.webp"
            alt={t('landingShowcases.audio.alt')}
            loading="lazy"
            sx={{
              maxWidth: { xs: 280, md: 380 },
              width: '100%',
              height: 'auto',
              borderRadius: 4,
            }}
          />
        }
      />

      {/* Feature Showcase — Vídeo */}
      <FeatureShowcase
        icon={PlayCircle}
        title={t('landing.videoShowcase.title')}
        description={t('landing.videoShowcase.description')}
        benefits={[
          t('landing.videoShowcase.benefits.0'),
          t('landing.videoShowcase.benefits.1'),
          t('landing.videoShowcase.benefits.2'),
          t('landing.videoShowcase.benefits.3'),
          t('landing.videoShowcase.benefits.4'),
        ]}
        position="left"
        visual={
          <Box
            component="img"
            src="/images/public/feature-video.webp"
            alt={t('landingShowcases.video.alt')}
            loading="lazy"
            sx={{
              maxWidth: { xs: 280, md: 380 },
              width: '100%',
              height: 'auto',
              borderRadius: 4,
            }}
          />
        }
      />

      {/* Feature Showcase — IA */}
      <FeatureShowcase
        icon={AutoAwesome}
        title={t('landing.assistantShowcase.title')}
        description={t('landing.assistantShowcase.description')}
        benefits={[
          t('landing.assistantShowcase.benefits.0'),
          t('landing.assistantShowcase.benefits.1'),
          t('landing.assistantShowcase.benefits.2'),
          t('landing.assistantShowcase.benefits.3'),
          t('landing.assistantShowcase.benefits.4'),
        ]}
        visual={
          <Box
            component="img"
            src="/images/public/feature-assistant.webp"
            alt={t('landingShowcases.assistant.alt')}
            loading="lazy"
            sx={{
              maxWidth: { xs: 280, md: 380 },
              width: '100%',
              height: 'auto',
              borderRadius: 4,
            }}
          />
        }
      />

      {/* Métricas */}
      <MetricsSection />

      {/* Demo do Produto */}
      <ProductDemoSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Como Funciona — 3 steps */}
      <Box sx={{ pt: { xs: 8, md: 12 } }} id="como-funciona">
        <Box
          component={motion.div}
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}
        >
          <Box component={motion.div} variants={fadeInUp}>
            <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: 0 }}>
              {t('landing.howItWorks.title')}
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
              {t('landing.howItWorks.subtitle')}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {STEPS.map((step, idx) => (
            <Grid size={{ xs: 12, sm: 4 }} key={step.number}>
              <StepCard {...step} index={idx} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Mais Features */}
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          mt: { xs: 4, md: 6 },
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          component={motion.div}
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}
        >
          <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: 0 }}>
            {t('landing.moreFeatures.title')}
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {ALL_FEATURES.map((feature, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={feature.title}>
              <FeatureCard {...feature} index={idx} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* CTA Final */}
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          mt: { xs: 6, md: 8 },
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CTASection
          title={t('landing.cta.title')}
          subtitle={t('landing.cta.subtitle')}
          buttonLabel={t('landing.cta.button')}
          buttonHref="/cadastro"
        />
      </Box>
    </PageLayout>
    </>
  );
}

function HeroDemoFallback({ alt }: { alt: string }) {
  return (
    <Box
      component="img"
      src="/projeto/estudio.png"
      alt={alt}
      sx={{
        maxWidth: { xs: 356, sm: 520, md: 640 },
        width: '100%',
        aspectRatio: { xs: '4 / 5', sm: '16 / 9' },
        objectFit: 'cover',
        objectPosition: 'center top',
        filter: 'drop-shadow(0 24px 48px rgba(46, 117, 182, 0.25))',
        border: `1px solid ${WHITE_12}`,
        borderRadius: RADIUS_SM,
      }}
    />
  );
}
