import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Code from '@mui/icons-material/Code';
import VpnKey from '@mui/icons-material/VpnKey';
import Savings from '@mui/icons-material/Savings';
import Login from '@mui/icons-material/Login';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Visibility from '@mui/icons-material/Visibility';
import GitHub from '@mui/icons-material/GitHub';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import type { ElementType } from 'react';
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { FAQAccordion } from '../../components/public/FAQAccordion';
import { CTASection } from '../../components/public/CTASection';
import { StepCard } from '../../components/public/StepCard';
import {
  TEXT_SECONDARY,
  BRAND_PRIMARY,
  BRAND_SECONDARY } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { getLocalizedByokFaq } from '../../data/byokFaq';
import { useLocale } from '../../features/i18n';
import { staggerContainer, fadeInUp, VIEWPORT_ONCE } from '../../components/public/animations';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Card individual exibindo uma informação sobre o modelo open source */
interface FeatureCardData {
  icon: ElementType;
  title: string;
  description: string;
  accentColor: string;
}

// ── Subcomponente: Card de feature ────────────────────────────────────

/** Card individual exibindo uma informação sobre o modelo BYOK */
function OpenSourceCard({
  data,
  index,
}: {
  data: FeatureCardData;
  index: number;
}) {
  const Icon = data.icon;

  return (
    <Grid size={{ xs: 12, md: 4 }}>
      <Box
        component={motion.div}
        variants={{
          ...fadeInUp,
          visible: {
            ...fadeInUp.visible,
            transition: { duration: 0.5, delay: index * 0.12 },
          },
        }}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
      >
        <Paper
          elevation={0}
          sx={(theme) => ({
            ...glassPanelSx(theme),
            p: { xs: 3, md: 4 },
            height: '100%',
            textAlign: 'center',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: `0 16px 48px ${alpha(data.accentColor, 0.15)}`,
            },
          })}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '16px',
              backgroundColor: alpha(data.accentColor, 0.12),
              color: data.accentColor,
              mb: 2.5,
            }}
          >
            <Icon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, mb: 1 }}>
            {data.title}
          </Typography>
          <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.7 }}>
            {data.description}
          </Typography>
        </Paper>
      </Box>
    </Grid>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export default function OpenSourcePage() {
  const { t, locale } = useLocale();

  const localizedByokFaq = getLocalizedByokFaq(locale);

  // ── Cards de feature (dados localizados) ──
  const featureCards: readonly FeatureCardData[] = [
    {
      icon: Code,
      title: t('openSource.features.openSource'),
      description: t('openSource.features.openSourceDesc'),
      accentColor: BRAND_PRIMARY,
    },
    {
      icon: VpnKey,
      title: t('openSource.features.byok'),
      description: t('openSource.features.byokDesc'),
      accentColor: BRAND_SECONDARY,
    },
    {
      icon: Savings,
      title: t('openSource.features.noHiddenFees'),
      description: t('openSource.features.noHiddenFeesDesc'),
      accentColor: '#22c55e',
    },
  ];

  // ── Passos de "como funciona" ──
  const steps: readonly { icon: ElementType; title: string; description: string }[] = [
    { icon: Login, title: t('openSource.howItWorks.step1Title'), description: t('openSource.howItWorks.step1Desc') },
    { icon: AutoAwesome, title: t('openSource.howItWorks.step2Title'), description: t('openSource.howItWorks.step2Desc') },
    { icon: Visibility, title: t('openSource.howItWorks.step3Title'), description: t('openSource.howItWorks.step3Desc') },
  ];

  const seo = getPageSeo({
    title: t('seo.openSource.title'),
    description: t('seo.openSource.description'),
    path: '/open-source',
    jsonLdType: 'software',
  });

  return (
    <>
      <DocumentHead {...seo} locale={locale} />
      <PageLayout>
        {/* Hero — H1 + subtítulo + CTAs */}
        <HeroSection
          title={t('openSource.hero.title')}
          subtitle={t('openSource.hero.subtitle')}
          primaryCta={{ label: t('openSource.hero.cta'), to: '/cadastro' }}
          secondaryCta={{ label: t('openSource.hero.ctaSecondary'), to: '#how-it-works' }}
          visual={
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Code sx={{ fontSize: 80, color: BRAND_PRIMARY, opacity: 0.85 }} />
            </Box>
          }
          showGlow
        />

        {/* ── Seção de Features (Open Source / BYOK / Sem taxas) ── */}
        <Box sx={{ pt: { xs: 8, md: 10 }, pb: { xs: 4, md: 6 } }}>
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
                {t('openSource.features.title')}
              </Typography>
            </Box>
            <Box component={motion.div} variants={fadeInUp}>
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}
              >
                {t('openSource.features.subtitle')}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {featureCards.map((card, idx) => (
              <OpenSourceCard key={card.title} data={card} index={idx} />
            ))}
          </Grid>

          {/* CTA GitHub */}
          <Box sx={{ textAlign: 'center', mt: { xs: 4, md: 6 } }}>
            <Button
              href="https://github.com/Just-mpm/Script-Master-Open-Source"
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<GitHub />}
              sx={(theme) => ({
                px: 4,
                py: 1.5,
                borderWidth: 1.5,
                color: theme.palette.text.primary,
                borderColor: 'rgba(99, 179, 237, 0.42)',
                backgroundColor: 'rgba(46, 117, 182, 0.08)',
                transition: 'border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  borderWidth: 1.5,
                  borderColor: theme.palette.primary.light,
                  backgroundColor: 'rgba(46, 117, 182, 0.16)',
                  transform: 'translateY(-1px)',
                },
              })}
            >
              {t('openSource.githubCta')}
            </Button>
          </Box>
        </Box>

        {/* ── Seção Como Funciona ── */}
        <Box sx={{ pb: { xs: 6, md: 8 } }} id="how-it-works">
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
                {t('openSource.howItWorks.title')}
              </Typography>
            </Box>
            <Box component={motion.div} variants={fadeInUp}>
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}
              >
                {t('openSource.howItWorks.subtitle')}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {steps.map((step, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={step.title}>
                <StepCard
                  number={idx + 1 }
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                  index={idx}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ── FAQ — Perguntas frequentes sobre BYOK e open source ── */}
        <Box sx={{ pb: { xs: 8, md: 12 } }}>
          <FAQAccordion items={[...localizedByokFaq]} title={t('openSource.faq.title')} />
        </Box>

        {/* ── CTA Final ── */}
        <CTASection
          title={t('openSource.cta.title')}
          subtitle={t('openSource.cta.subtitle')}
          buttonLabel={t('openSource.cta.button')}
          buttonHref="/cadastro"
        />
      </PageLayout>
    </>
  );
}
