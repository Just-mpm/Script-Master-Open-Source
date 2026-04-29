import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SavingsIcon from '@mui/icons-material/Savings';
import Alert from '@mui/material/Alert';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PricingCard } from '../../components/public/PricingCard';
import { FAQAccordion } from '../../components/public/FAQAccordion';
import { CTASection } from '../../components/public/CTASection';
import { PLANS as BILLING_PLANS, formatPrice } from '../../features/billing';
import type { PlanId } from '../../features/billing';
import {
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  SUCCESS_MAIN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  APP_BORDER,
} from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { getLocalizedPricingFaq } from '../../data/pricingFaq';
import { useLocale } from '../../features/i18n';
import { staggerContainer, fadeInUp, fadeIn, VIEWPORT_ONCE } from '../../components/public/animations';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Periodo de cobranca selecionado pelo toggle */
type BillingPeriod = 'monthly' | 'annual';

/** Feature individual de um plano */
interface PlanFeature {
  text: string;
  included: boolean;
}

/** Dados completos de um plano de precos (UI + dados do billing) */
interface PlanData {
  name: string;
  planId: PlanId;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  priceSubtitle: string;
  description: string;
  features: readonly PlanFeature[];
  recommended: boolean;
  ctaLabel: string;
  ctaVariant: 'primary' | 'secondary' | 'outlined';
}

/** Linha da tabela comparativa entre planos */
interface ComparisonRow {
  feature: string;
  gratuito: string;
  pro: string;
  business: string;
}

// ── Constantes de dados ───────────────────────────────────────────────

// ── Subcomponentes ────────────────────────────────────────────────────

/** Toggle Mensal/Anual com badge de desconto no anual */
function BillingToggle({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}) {
  const { t } = useLocale();

  return (
    <Box
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 4, md: 6 } }}
    >
      <ToggleButtonGroup
        exclusive
        value={value}
        onChange={(_, newValue: BillingPeriod | null) => {
          if (newValue !== null) onChange(newValue);
        }}
        aria-label={t('pricing.billing.ariaLabel')}
        sx={(theme) => ({
          bgcolor: alpha(theme.palette.common.white, 0.04),
          borderRadius: 3,
          p: 0.5,
          '& .MuiToggleButton-root': {
            px: 3,
            py: 1,
            border: 'none',
            borderRadius: '12px !important',
            textTransform: 'none',
            fontWeight: 500,
            color: TEXT_SECONDARY,
            '&.Mui-selected': {
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              color: BRAND_PRIMARY,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
              },
            },
          },
        })}
      >
        <ToggleButton value="monthly">{t('pricing.billing.monthly')}</ToggleButton>
        <ToggleButton value="annual">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {t('pricing.billing.annual')}
            <Chip
              label="-20%"
              size="small"
              sx={(theme) => ({
                bgcolor: alpha(theme.palette.secondary.main, 0.15),
                color: BRAND_SECONDARY,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 20,
              })}
            />
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

/** Celula individual da tabela comparativa — exibe icone para "Ilimitado" */
function ComparisonCell({
  value,
  isHighlighted,
  unlimitedLabel,
}: {
  value: string;
  isHighlighted: boolean;
  unlimitedLabel: string;
}) {
  const isUnlimited = value === unlimitedLabel;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
      {isUnlimited && (
        <CheckCircleIcon sx={{ fontSize: 18, color: SUCCESS_MAIN, flexShrink: 0 }} />
      )}
      <Typography
        variant="body2"
        sx={{
          fontWeight: isHighlighted ? 600 : 400,
          color: isHighlighted ? TEXT_PRIMARY : TEXT_SECONDARY,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/** Tabela comparativa de planos com scroll horizontal em telas pequenas */
function ComparisonTable({ rows }: { rows: readonly ComparisonRow[] }) {
  const { t } = useLocale();
  const unlimitedLabel = t('pricing.unlimited');

  return (
    <Box
      component={motion.div}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <Box
        sx={(theme) => ({ ...glassPanelSx(theme), p: { xs: 3, md: 5 }, minWidth: 560 })}
      >
        <Box
          component="table"
          aria-label={t('pricing.comparison.ariaLabel')}
          sx={{ width: '100%', borderCollapse: 'collapse' }}
        >
          {/* Cabecalho da tabela */}
          <Box component="thead">
            <Box
              component="tr"
              sx={{ borderBottom: `1px solid ${APP_BORDER}` }}
            >
              <Box
                component="th"
                scope="col"
                sx={{ width: '42%', pb: 1.5, textAlign: 'left' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('pricing.comparison.feature')}
                </Typography>
              </Box>
              <Box
                component="th"
                scope="col"
                sx={{ width: '19.5%', pb: 1.5, textAlign: 'center' }}
              >
                <Typography variant="subtitle2">
                  {t('pricing.plans.free.name')}
                </Typography>
              </Box>
              <Box
                component="th"
                scope="col"
                sx={{ width: '20%', pb: 1.5, textAlign: 'center' }}
              >
                <Typography variant="subtitle2" sx={{ color: BRAND_PRIMARY, fontWeight: 700 }}>
                  {t('pricing.plans.pro.name')}
                </Typography>
              </Box>
              <Box
                component="th"
                scope="col"
                sx={{ width: '19.5%', pb: 1.5, textAlign: 'center' }}
              >
                <Typography variant="subtitle2">
                  {t('pricing.plans.business.name')}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Linhas de dados */}
          <Box component="tbody">
            {rows.map((row, index) => {
              const isLast = index === rows.length - 1;

              return (
                <Box
                  component="tr"
                  key={row.feature}
                  sx={{
                    borderBottom: isLast ? 'none' : `1px solid ${APP_BORDER}`,
                  }}
                >
                  <Box component="td" sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {row.feature}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ py: 1.5, textAlign: 'center' }}>
                    <ComparisonCell value={row.gratuito} isHighlighted={false} unlimitedLabel={unlimitedLabel} />
                  </Box>
                  <Box component="td" sx={{ py: 1.5, textAlign: 'center' }}>
                    <ComparisonCell value={row.pro} isHighlighted={true} unlimitedLabel={unlimitedLabel} />
                  </Box>
                  <Box component="td" sx={{ py: 1.5, textAlign: 'center' }}>
                    <ComparisonCell value={row.business} isHighlighted={false} unlimitedLabel={unlimitedLabel} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export default function PricingPage() {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const localizedPricingFaq = getLocalizedPricingFaq(locale);

  // ── Metadados de UI por plano (campos que não existem no billing) ──
  const PLAN_UI_META: Record<PlanId, { recommended: boolean; ctaVariant: 'primary' | 'secondary' | 'outlined' }> = {
    free: { recommended: false, ctaVariant: 'outlined' },
    pro: { recommended: true, ctaVariant: 'primary' },
    business: { recommended: false, ctaVariant: 'outlined' },
  };

  // ── Planos — fonte de verdade: billing/plans.ts ──
  const PLAN_ORDER: readonly PlanId[] = ['free', 'pro', 'business'];

  const PLANS: readonly PlanData[] = PLAN_ORDER.map((id) => {
    const billingPlan = BILLING_PLANS[id];
    const meta = PLAN_UI_META[id];

    return {
      name: t(`pricing.plans.${id}.name`),
      planId: id,
      priceMonthlyCents: billingPlan.price.monthly,
      priceYearlyCents: billingPlan.price.yearly,
      priceSubtitle: t(`pricing.plans.${id}.priceSubtitle`),
      description: billingPlan.description,
      features: billingPlan.features.map((_, i) => ({
        text: t(`pricing.plans.${id}.features.${i}`),
        included: true,
      })),
      recommended: meta.recommended,
      ctaLabel: t(`pricing.plans.${id}.cta`),
      ctaVariant: meta.ctaVariant,
    };
  });

  // ── Tabela comparativa localizada via t() ──
  const COMPARISON_TABLE: readonly ComparisonRow[] = Array.from({ length: 9 }, (_, i) => ({
    feature: t(`pricingComparison.features.${i}.name`),
    gratuito: t(`pricingComparison.features.${i}.free`),
    pro: t(`pricingComparison.features.${i}.pro`),
    business: t(`pricingComparison.features.${i}.business`),
  }));

  /** Resolve o preco formatado com base no periodo de cobranca selecionado */
  const getPrice = (plan: PlanData): string => {
    if (billingPeriod === 'annual') {
      // Equivalente mensal do preço anual
      return formatPrice(Math.round(plan.priceYearlyCents / 12));
    }
    return formatPrice(plan.priceMonthlyCents);
  };

  const seo = getPageSeo({
    title: t('seo.pricing.title'),
    description: t('seo.pricing.description'),
    path: '/precos',
  });

  const pricingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Script Master',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description: t('seo.pricing.description'),
    offers: [
      { '@type': 'Offer', name: t('pricing.plans.free.name'), price: '0', priceCurrency: 'BRL' },
      { '@type': 'Offer', name: t('pricing.plans.pro.name'), price: (BILLING_PLANS.pro.price.monthly / 100).toFixed(2), priceCurrency: 'BRL' },
      { '@type': 'Offer', name: t('pricing.plans.business.name'), price: (BILLING_PLANS.business.price.monthly / 100).toFixed(2), priceCurrency: 'BRL' },
    ],
  };

  return (
    <>
      <DocumentHead {...seo} locale={locale} />
      <script type="application/ld+json">{JSON.stringify(pricingJsonLd)}</script>
      <PageLayout>
      {/* Hero — H1 + subtitulo + CTAs */}
      <HeroSection
        title={t('pricing.hero.title')}
        subtitle={t('pricing.hero.subtitle')}
        primaryCta={{ label: t('pricing.hero.cta'), to: '/cadastro' }}
        secondaryCta={{ label: t('pricing.hero.ctaSecondary'), to: '#comparison' }}
        visual={
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <SavingsIcon sx={{ fontSize: 80, color: BRAND_SECONDARY, opacity: 0.85 }} />
          </Box>
        }
        showGlow
      />

      {/* Toggle Mensal/Anual */}
      <Box sx={{ pt: { xs: 8, md: 10 } }}>
        <BillingToggle value={billingPeriod} onChange={setBillingPeriod} />
      </Box>

      {/* Cards de planos — Grid 3 colunas */}
      <Box sx={{ pb: { xs: 4, md: 6 } }}>
        <Grid container spacing={3}>
          {PLANS.map((plan, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={plan.name}>
              <PricingCard
                name={plan.name}
                price={getPrice(plan)}
                priceSubtitle={plan.priceSubtitle}
                description={plan.description}
                features={[...plan.features]}
                recommended={plan.recommended}
                ctaLabel={plan.ctaLabel}
                ctaVariant={plan.ctaVariant}
                ctaDisabled={plan.planId !== 'free'}
                ctaTooltip={t('pricing.tooltip.comingSoon')}
                onCtaClick={plan.planId === 'free' ? () => navigate('/cadastro') : undefined}
                index={idx}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Disclaimer — limites nao aplicados */}
      <Box sx={{ pb: { xs: 6, md: 8 }, mx: { xs: 2, sm: 3 } }}>
        <Alert severity="info" variant="outlined">
          {t('pricing.disclaimer')}
        </Alert>
      </Box>

      {/* Tabela Comparativa */}
      <Box sx={{ pb: { xs: 8, md: 12 } }} id="comparison">
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
              {t('pricing.comparison.title')}
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}
            >
              {t('pricing.comparison.subtitle')}
            </Typography>
          </Box>
        </Box>
        <ComparisonTable rows={COMPARISON_TABLE} />
      </Box>

      {/* FAQ — Perguntas frequentes sobre precos */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <FAQAccordion items={[...localizedPricingFaq]} title={t('pricing.faq.title')} />
      </Box>

      {/* CTA Final */}
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
