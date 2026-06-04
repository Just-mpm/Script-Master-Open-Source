import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcard from '@mui/icons-material/CardGiftcard';
import CreditCardOff from '@mui/icons-material/CreditCardOff';
import Login from '@mui/icons-material/Login';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Visibility from '@mui/icons-material/Visibility';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import type { ElementType, ReactNode } from 'react';
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
  BRAND_SECONDARY, RADIUS_SM } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { getLocalizedPricingFaq } from '../../data/pricingFaq';
import { useLocale } from '../../features/i18n';
import { staggerContainer, fadeInUp, fadeIn, VIEWPORT_ONCE } from '../../components/public/animations';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Card individual de crédito na seção de créditos */
interface CreditCardData {
  icon: ElementType;
  title: string;
  description: string;
  accentColor: string;
}

// ── Subcomponente: Card de crédito ────────────────────────────────────

/** Card individual exibindo uma informação sobre créditos do beta */
function CreditInfoCard({
  data,
  index,
}: {
  data: CreditCardData;
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

// ── Subcomponente: Aviso ──────────────────────────────────────────────

/** Aviso sobre pagamentos pausados com fundo destacado */
function BetaNotice({ children }: { children: ReactNode }) {
  return (
    <Box
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
    >
      <Alert
        severity="info"
        variant="outlined"
        sx={(theme) => ({
          borderRadius: RADIUS_SM,
          borderColor: alpha(theme.palette.info.main, 0.3),
          bgcolor: alpha(theme.palette.info.main, 0.06),
          '& .MuiAlert-message': { width: '100%' },
        })}
      >
        {children}
      </Alert>
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export default function PricingPage() {
  const { t, locale } = useLocale();

  const localizedPricingFaq = getLocalizedPricingFaq(locale);

  // ── Cards de crédito (dados localizados) ──
  const creditCards: readonly CreditCardData[] = [
    {
      icon: AccountBalanceWallet,
      title: t('pricing.credits.monthly'),
      description: t('pricing.credits.monthlyDesc'),
      accentColor: BRAND_PRIMARY,
    },
    {
      icon: CardGiftcard,
      title: t('pricing.credits.bonus'),
      description: t('pricing.credits.bonusDesc'),
      accentColor: BRAND_SECONDARY,
    },
    {
      icon: CreditCardOff,
      title: t('pricing.credits.noPayment'),
      description: t('pricing.credits.noPaymentDesc'),
      accentColor: '#22c55e',
    },
  ];

  // ── Passos de "como funciona" ──
  const steps: readonly { icon: ElementType; title: string; description: string }[] = [
    { icon: Login, title: t('pricing.howItWorks.step1Title'), description: t('pricing.howItWorks.step1Desc') },
    { icon: AutoAwesome, title: t('pricing.howItWorks.step2Title'), description: t('pricing.howItWorks.step2Desc') },
    { icon: Visibility, title: t('pricing.howItWorks.step3Title'), description: t('pricing.howItWorks.step3Desc') },
  ];

  const seo = getPageSeo({
    title: t('seo.pricing.title'),
    description: t('seo.pricing.description'),
    path: '/precos',
    jsonLdType: 'software-with-offers',
  });

  return (
    <>
      <DocumentHead {...seo} locale={locale} />
      <PageLayout>
        {/* Hero — H1 + subtítulo + CTAs */}
        <HeroSection
          title={t('pricing.hero.title')}
          subtitle={t('pricing.hero.subtitle')}
          primaryCta={{ label: t('pricing.hero.cta'), to: '/cadastro' }}
          secondaryCta={{ label: t('pricing.hero.ctaSecondary'), to: '#how-it-works' }}
          visual={
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <AccountBalanceWallet sx={{ fontSize: 80, color: BRAND_SECONDARY, opacity: 0.85 }} />
            </Box>
          }
          showGlow
        />

        {/* ── Seção de Créditos ── */}
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
              <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: '-0.035em' }}>
                {t('pricing.credits.title')}
              </Typography>
            </Box>
            <Box component={motion.div} variants={fadeInUp}>
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}
              >
                {t('pricing.credits.subtitle')}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {creditCards.map((card, idx) => (
              <CreditInfoCard key={card.title} data={card} index={idx} />
            ))}
          </Grid>
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
              <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: '-0.035em' }}>
                {t('pricing.howItWorks.title')}
              </Typography>
            </Box>
            <Box component={motion.div} variants={fadeInUp}>
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}
              >
                {t('pricing.howItWorks.subtitle')}
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

        {/* ── Aviso: pagamentos pausados ── */}
        <Box sx={{ pb: { xs: 8, md: 12 }, mx: { xs: 2, sm: 3 } }}>
          <BetaNotice>
            <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700, mb: 0.5 }}>
              {t('pricing.notice.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
              {t('pricing.notice.description')}
            </Typography>
          </BetaNotice>
        </Box>

        {/* ── FAQ — Perguntas frequentes sobre o beta ── */}
        <Box sx={{ pb: { xs: 8, md: 12 } }}>
          <FAQAccordion items={[...localizedPricingFaq]} title={t('pricing.faq.title')} />
        </Box>

        {/* ── CTA Final ── */}
        <CTASection
          title={t('pricing.cta.title')}
          subtitle={t('pricing.cta.subtitle')}
          buttonLabel={t('pricing.cta.button')}
          buttonHref="/cadastro"
        />
      </PageLayout>
    </>
  );
}
