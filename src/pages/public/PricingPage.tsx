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
import { alpha } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PricingCard } from '../../components/public/PricingCard';
import { FAQAccordion } from '../../components/public/FAQAccordion';
import { CTASection } from '../../components/public/CTASection';
import {
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  SUCCESS_MAIN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  APP_BORDER,
} from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Período de cobrança selecionado pelo toggle */
type BillingPeriod = 'monthly' | 'annual';

/** Feature individual de um plano */
interface PlanFeature {
  text: string;
  included: boolean;
}

/** Dados completos de um plano de preços */
interface PlanData {
  name: string;
  priceMonthly: string;
  priceAnnual?: string;
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
  equipe: string;
}

// ── Constantes de dados ───────────────────────────────────────────────

/** Planos disponíveis — OCP: adicionar plano sem alterar componentes */
const PLANS: readonly PlanData[] = [
  {
    name: 'Gratuito',
    priceMonthly: 'R$ 0',
    priceSubtitle: 'para sempre',
    description: 'Perfeito para experimentar e projetos pessoais',
    features: [
      { text: '5 roteiros TTS por mês', included: true },
      { text: '10 gerações de imagens por mês', included: true },
      { text: 'Renderização em 720p', included: true },
      { text: 'Vídeos de até 30 segundos', included: true },
      { text: '20 mensagens/dia no assistente', included: true },
      { text: '3 pinturas rápidas por mês', included: true },
      { text: '5 projetos na biblioteca', included: true },
      { text: 'Exportar áudio WAV', included: true },
      { text: 'Suporte prioritário', included: false },
    ],
    recommended: false,
    ctaLabel: 'Começar grátis',
    ctaVariant: 'outlined',
  },
  {
    name: 'Pro',
    priceMonthly: 'R$ 29',
    priceAnnual: 'R$ 23',
    priceSubtitle: '/mês',
    description: 'Para criadores que produzem conteúdo regularmente',
    features: [
      { text: 'Roteiros TTS ilimitados', included: true },
      { text: '200 gerações de imagens por mês', included: true },
      { text: 'Renderização em 1080p', included: true },
      { text: 'Vídeos de até 5 minutos', included: true },
      { text: 'Assistente IA ilimitado', included: true },
      { text: '50 pinturas rápidas por mês', included: true },
      { text: '100 projetos na biblioteca', included: true },
      { text: 'Exportar áudio WAV', included: true },
      { text: 'Suporte por email', included: true },
      { text: 'Suporte prioritário', included: false },
    ],
    recommended: true,
    ctaLabel: 'Assinar Pro',
    ctaVariant: 'primary',
  },
  {
    name: 'Equipe',
    priceMonthly: 'Sob demanda',
    priceSubtitle: '',
    description: 'Para times e produções em grande escala',
    features: [
      { text: 'Roteiros TTS ilimitados', included: true },
      { text: 'Gerações de imagens ilimitadas', included: true },
      { text: 'Renderização em 1080p', included: true },
      { text: 'Vídeos de até 10 minutos', included: true },
      { text: 'Assistente IA ilimitado', included: true },
      { text: 'Pinturas rápidas ilimitadas', included: true },
      { text: 'Projetos ilimitados', included: true },
      { text: 'Exportar áudio WAV', included: true },
      { text: 'Suporte por email', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    recommended: false,
    ctaLabel: 'Falar com vendas',
    ctaVariant: 'outlined',
  },
];

/** Perguntas frequentes sobre preços */
const PRICING_FAQ = [
  {
    question: 'É realmente grátis?',
    answer:
      'Sim! O plano Gratuito não exige cartão de crédito e não possui data de expiração. Você pode usar quantas vezes quiser dentro dos limites do plano.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Ainda estamos desenvolvendo nosso sistema de pagamentos. Assim que estiver disponível, você poderá cancelar sua assinatura a qualquer momento.',
  },
  {
    question: 'Quais as formas de pagamento?',
    answer:
      'Nosso sistema de pagamentos ainda está em desenvolvimento. Em breve aceitaremos cartão de crédito, PIX e boleto bancário.',
  },
  {
    question: 'O que acontece se exceder os limites do plano?',
    answer:
      'Você será notificado quando estiver próximo do limite. Após exceder, poderá continuar usando no plano Gratuito até o próximo ciclo.',
  },
  {
    question: 'Existe desconto para pagamento anual?',
    answer:
      'Ainda estamos desenvolvendo nosso sistema de pagamentos. Planos anuais com desconto estarão disponíveis em breve.',
  },
  {
    question: 'Posso trocar de plano?',
    answer:
      'Ainda estamos desenvolvendo nosso sistema de pagamentos. Assim que disponível, você poderá fazer upgrade ou downgrade a qualquer momento.',
  },
] as const;

/** Tabela comparativa de funcionalidades por plano */
const COMPARISON_TABLE: readonly ComparisonRow[] = [
  { feature: 'Geração TTS', gratuito: '5/mês', pro: 'Ilimitado', equipe: 'Ilimitado' },
  { feature: 'Geração de imagens', gratuito: '10/mês', pro: '200/mês', equipe: 'Ilimitado' },
  { feature: 'Resolução de vídeo', gratuito: '720p', pro: '1080p', equipe: '1080p' },
  { feature: 'Duração do vídeo', gratuito: '30s', pro: '5 min', equipe: '10 min' },
  { feature: 'Assistente IA', gratuito: '20 msgs/dia', pro: 'Ilimitado', equipe: 'Ilimitado' },
  { feature: 'Pintura Rápida', gratuito: '3/mês', pro: '50/mês', equipe: 'Ilimitado' },
  { feature: 'Biblioteca', gratuito: '5 projetos', pro: '100 projetos', equipe: 'Ilimitado' },
  { feature: 'Exportar áudio', gratuito: 'WAV', pro: 'WAV', equipe: 'WAV' },
  { feature: 'Suporte', gratuito: 'Comunidade', pro: 'Email', equipe: 'Prioritário' },
];

/** Rótulo usado para identificar valores "ilimitados" na tabela */
const UNLIMITED_LABEL = 'Ilimitado';

// ── Subcomponentes ────────────────────────────────────────────────────

/** Toggle Mensal/Anual com badge de desconto no anual */
function BillingToggle({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 4, md: 6 } }}>
      <ToggleButtonGroup
        exclusive
        value={value}
        onChange={(_, newValue: BillingPeriod | null) => {
          if (newValue !== null) onChange(newValue);
        }}
        aria-label="Ciclo de pagamento"
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
        <ToggleButton value="monthly">Mensal</ToggleButton>
        <ToggleButton value="annual">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Anual
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

/** Célula individual da tabela comparativa — exibe ícone para "Ilimitado" */
function ComparisonCell({
  value,
  isHighlighted,
}: {
  value: string;
  isHighlighted: boolean;
}) {
  const isUnlimited = value === UNLIMITED_LABEL;

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
function ComparisonTable() {
  return (
    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Box sx={(theme) => ({ ...glassPanelSx(theme), p: { xs: 3, md: 5 }, minWidth: 560 })}>
        {/* Cabeçalho da tabela */}
        <Grid
          container
          spacing={2}
          sx={{ pb: 2, mb: 1, borderBottom: `1px solid ${APP_BORDER}` }}
        >
          <Grid size={5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Funcionalidade
            </Typography>
          </Grid>
          <Grid size={2.33}>
            <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
              Gratuito
            </Typography>
          </Grid>
          <Grid size={2.34}>
            <Typography
              variant="subtitle2"
              sx={{ textAlign: 'center', color: BRAND_PRIMARY, fontWeight: 700 }}
            >
              Pro
            </Typography>
          </Grid>
          <Grid size={2.33}>
            <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
              Equipe
            </Typography>
          </Grid>
        </Grid>

        {/* Linhas de dados */}
        {COMPARISON_TABLE.map((row, index) => {
          const isLast = index === COMPARISON_TABLE.length - 1;

          return (
            <Grid
              container
              spacing={2}
              key={row.feature}
              sx={{
                py: 1.5,
                borderBottom: isLast ? 'none' : `1px solid ${APP_BORDER}`,
              }}
            >
              <Grid size={5}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {row.feature}
                </Typography>
              </Grid>
              <Grid size={2.33}>
                <ComparisonCell value={row.gratuito} isHighlighted={false} />
              </Grid>
              <Grid size={2.34}>
                <ComparisonCell value={row.pro} isHighlighted={true} />
              </Grid>
              <Grid size={2.33}>
                <ComparisonCell value={row.equipe} isHighlighted={false} />
              </Grid>
            </Grid>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export default function PricingPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  /** Resolve o preço exibido com base no período de cobrança selecionado */
  const getPrice = (plan: PlanData): string => {
    if (billingPeriod === 'annual' && plan.priceAnnual) {
      return plan.priceAnnual;
    }
    return plan.priceMonthly;
  };

  const seo = getPageSeo({
    title: 'Preços e Planos',
    description: 'Planos e preços do Script Master. Gratuito, Pro e Equipe. Comece grátis sem cartão de crédito.',
    path: '/precos',
  });

  const pricingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Script Master',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description: 'Transforme roteiros em áudio profissional com IA',
    offers: [
      { '@type': 'Offer', name: 'Gratuito', price: '0', priceCurrency: 'BRL' },
      { '@type': 'Offer', name: 'Pro', price: '29', priceCurrency: 'BRL' },
    ],
  };

  return (
    <>
      <Helmet {...seo} />
      <script type="application/ld+json">{JSON.stringify(pricingJsonLd)}</script>
      <PageLayout>
      {/* Hero — H1 + subtítulo + CTAs */}
      <HeroSection
        title="Escolha o plano ideal para você"
        subtitle="Comece grátis, sem cartão de crédito. Cancele quando quiser."
        primaryCta={{ label: 'Começar Grátis', to: '/login' }}
        secondaryCta={{ label: 'Comparar planos', to: '#comparison' }}
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
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <Grid container spacing={3}>
          {PLANS.map((plan) => (
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
                onCtaClick={() => navigate('/login')}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tabela Comparativa */}
      <Box sx={{ pb: { xs: 8, md: 12 } }} id="comparison">
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>
            Compare os planos em detalhes
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto' }}
          >
            Veja lado a lado tudo que cada plano oferece para escolher o melhor para suas
            necessidades.
          </Typography>
        </Box>
        <ComparisonTable />
      </Box>

      {/* FAQ — Perguntas frequentes sobre preços */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <FAQAccordion items={[...PRICING_FAQ]} title="Perguntas frequentes sobre preços" />
      </Box>

      {/* CTA Final */}
      <CTASection
        title="Comece grátis, sem cartão de crédito"
        subtitle="Crie sua primeira narração gratuitamente. Sem compromisso, sem cartão."
        buttonLabel="Entrar com Google"
        buttonHref="/login"
      />
    </PageLayout>
    </>
  );
}
