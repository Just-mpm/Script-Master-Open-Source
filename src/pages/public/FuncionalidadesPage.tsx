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
import Subtitles from '@mui/icons-material/Subtitles';
import Hd from '@mui/icons-material/Hd';
import Groups from '@mui/icons-material/Groups';
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { FeatureCard } from '../../components/public/FeatureCard';
import { FeatureShowcase } from '../../components/public/FeatureShowcase';
import { HeroSection } from '../../components/public/HeroSection';
import { CTASection } from '../../components/public/CTASection';
import { BRAND_PRIMARY } from '../../theme/tokens';
import { fadeInUp, VIEWPORT_ONCE } from '../../components/public/animations';
import { useLocale } from '../../features/i18n';

interface FeatureSection {
  id: string;
  titleKey: string;
  features: Array<{ icon: typeof Mic; title: string; description: string }>;
}

export default function FuncionalidadesPage() {
  const { t, locale } = useLocale();

  // ── Features localizadas via t() ──
  const TTS_FEATURES = [
    { icon: Mic, title: t('featureItems.audio.0.title'), description: t('featureItems.audio.0.description') },
    { icon: Speed, title: t('featureItems.audio.1.title'), description: t('featureItems.audio.1.description') },
    { icon: Groups, title: t('featureItems.audio.2.title'), description: t('featureItems.audio.2.description') },
    { icon: EditNote, title: t('featureItems.audio.3.title'), description: t('featureItems.audio.3.description') },
  ];

  const VIDEO_FEATURES = [
    { icon: PlayCircle, title: t('featureItems.video.0.title'), description: t('featureItems.video.0.description') },
    { icon: Subtitles, title: t('featureItems.video.1.title'), description: t('featureItems.video.1.description') },
    { icon: Hd, title: t('featureItems.video.2.title'), description: t('featureItems.video.2.description') },
  ];

  const IMAGE_FEATURES = [
    { icon: ImageIcon, title: t('featureItems.image.0.title'), description: t('featureItems.image.0.description') },
    { icon: Hd, title: t('featureItems.image.1.title'), description: t('featureItems.image.1.description') },
    { icon: LocalLibrary, title: t('featureItems.image.2.title'), description: t('featureItems.image.2.description') },
  ];

  const SPEEDPAINT_FEATURES = [
    { icon: Palette, title: t('featureItems.speedPaint.0.title'), description: t('featureItems.speedPaint.0.description') },
    { icon: Speed, title: t('featureItems.speedPaint.1.title'), description: t('featureItems.speedPaint.1.description') },
    { icon: Storage, title: t('featureItems.speedPaint.2.title'), description: t('featureItems.speedPaint.2.description') },
  ];

  const ASSISTANT_FEATURES = [
    { icon: AutoAwesome, title: t('featureItems.assistant.0.title'), description: t('featureItems.assistant.0.description') },
    { icon: EditNote, title: t('featureItems.assistant.1.title'), description: t('featureItems.assistant.1.description') },
    { icon: Storage, title: t('featureItems.assistant.2.title'), description: t('featureItems.assistant.2.description') },
  ];

  const PLATFORM_FEATURES = [
    { icon: Storage, title: t('featureItems.library.0.title'), description: t('featureItems.library.0.description') },
    { icon: Groups, title: t('featureItems.library.1.title'), description: t('featureItems.library.1.description') },
    { icon: Subtitles, title: t('featureItems.library.2.title'), description: t('featureItems.library.2.description') },
  ];

  // Seções com títulos traduzíveis
  const sections: FeatureSection[] = [
    { id: 'tts', titleKey: 'features.sections.tts', features: TTS_FEATURES },
    { id: 'video', titleKey: 'features.sections.video', features: VIDEO_FEATURES },
    { id: 'images', titleKey: 'features.sections.images', features: IMAGE_FEATURES },
    { id: 'speed-paint', titleKey: 'features.sections.speedPaint', features: SPEEDPAINT_FEATURES },
    { id: 'assistant', titleKey: 'features.sections.assistant', features: ASSISTANT_FEATURES },
    { id: 'platform', titleKey: 'features.sections.platform', features: PLATFORM_FEATURES },
  ];

  const seo = getPageSeo({
    title: t('seo.features.title'),
    description: t('seo.features.description'),
    path: '/funcionalidades',
    jsonLdType: 'software',
  });

  return (
    <>
      <DocumentHead {...seo} locale={locale} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title={t('features.hero.title')}
        subtitle={t('features.hero.subtitle')}
        primaryCta={{ label: t('features.hero.cta'), to: '/cadastro' }}
        secondaryCta={{ label: t('features.hero.ctaSecondary'), to: '/precos' }}
        visual={
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Mic sx={{ fontSize: 80, color: BRAND_PRIMARY, opacity: 0.85 }} />
          </Box>
        }
        showGlow
      />

      {/* Feature Sections */}
      {sections.map((section) => (
        <Box key={section.id} id={section.id} sx={{ scrollMarginTop: 80 }}>
          <Box
            component={motion.div}
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            sx={{ mb: { xs: 3, md: 4 } }}
          >
            <Typography variant="h4" component="h2" sx={{ letterSpacing: '-0.03em' }}>
              {t(section.titleKey)}
            </Typography>
          </Box>
          <Grid container spacing={3} sx={{ mb: { xs: 8, md: 10 } }}>
            {section.features.map((feature, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={feature.title}>
                <FeatureCard {...feature} index={idx} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {/* Deep Dive — TTS */}
      <FeatureShowcase
        icon={Mic}
        title={t('features.ttsShowcase.title')}
        description={t('features.ttsShowcase.description')}
        benefits={[
          t('features.ttsShowcase.benefits.0'),
          t('features.ttsShowcase.benefits.1'),
          t('features.ttsShowcase.benefits.2'),
          t('features.ttsShowcase.benefits.3'),
          t('features.ttsShowcase.benefits.4'),
        ]}
        visual={
          <Box
            component="img"
            src="/images/public/feature-tts.webp"
            alt="Geração de áudio TTS"
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

      {/* Deep Dive — Vídeo */}
      <FeatureShowcase
        icon={PlayCircle}
        title={t('features.videoShowcase.title')}
        description={t('features.videoShowcase.description')}
        benefits={[
          t('features.videoShowcase.benefits.0'),
          t('features.videoShowcase.benefits.1'),
          t('features.videoShowcase.benefits.2'),
          t('features.videoShowcase.benefits.3'),
          t('features.videoShowcase.benefits.4'),
        ]}
        position="left"
        visual={
          <Box
            component="img"
            src="/images/public/feature-video.webp"
            alt="Renderização de vídeo"
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

      {/* Deep Dive — Imagens */}
      <FeatureShowcase
        icon={ImageIcon}
        title={t('features.imagesShowcase.title')}
        description={t('features.imagesShowcase.description')}
        benefits={[
          t('features.imagesShowcase.benefits.0'),
          t('features.imagesShowcase.benefits.1'),
          t('features.imagesShowcase.benefits.2'),
          t('features.imagesShowcase.benefits.3'),
        ]}
        visual={
          <Box
            component="img"
            src="/images/public/feature-images.webp"
            alt="Geração de imagens com IA"
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

      {/* CTA Final */}
      <Box
        sx={{
          pt: { xs: 4, md: 8 },
          mt: { xs: 6, md: 8 },
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CTASection
          title={t('features.cta.title')}
          subtitle={t('features.cta.subtitle')}
          buttonLabel={t('features.cta.button')}
          buttonHref="/cadastro"
        />
      </Box>
    </PageLayout>
    </>
  );
}
