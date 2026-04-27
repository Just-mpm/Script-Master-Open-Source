import { useCallback, useState } from 'react';
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
import {
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  SUCCESS_MAIN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  APP_BORDER,
} from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { PRICING_FAQ_ITEMS } from '../../data/pricingFaq';
import { staggerContainer, fadeInUp, fadeIn, VIEWPORT_ONCE } from '../../components/public/animations';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Periodo de cobranca selecionado pelo toggle */
type BillingPeriod = 'monthly' | 'annual';

/** Feature individual de um plano */
interface PlanFeature {
  text: string;
  included: boolean;
}

/** Dados completos de um plano de precos */
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

/** Planos disponiveis — OCP: adicionar plano sem alterar componentes */
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
    ctaLabel: 'Em breve',
    ctaVariant: 'outlined',
  },
];

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

/** Rotulo usado para identificar valores "ilimitados" na tabela */
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

/** Celula individual da tabela comparativa — exibe icone para "Ilimitado" */
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
          aria-label="Comparação de planos"
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
                sx={{ width: '42%', pb: 1.5, mb: 0.5, textAlign: 'left' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Funcionalidade
                </Typography>
              </Box>
              <Box
                component="th"
                scope="col"
                sx={{ width: '19.5%', pb: 1.5, mb: 0.5, textAlign: 'center' }}
              >
                <Typography variant="subtitle2">
                  Gratuito
                </Typography>
              </Box>
              <Box
                component="th"
                scope="col"
                sx={{ width: '20%', pb: 1.5, mb: 0.5, textAlign: 'center' }}
              >
                <Typography variant="subtitle2" sx={{ color: BRAND_PRIMARY, fontWeight: 700 }}>
                  Pro
                </Typography>
              </Box>
              <Box
                component="th"
                scope="col"
                sx={{ width: '19.5%', pb: 1.5, mb: 0.5, textAlign: 'center' }}
              >
                <Typography variant="subtitle2">
                  Equipe
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Linhas de dados */}
          <Box component="tbody">
            {COMPARISON_TABLE.map((row, index) => {
              const isLast = index === COMPARISON_TABLE.length - 1;

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
                    <ComparisonCell value={row.gratuito} isHighlighted={false} />
                  </Box>
                  <Box component="td" sx={{ py: 1.5, textAlign: 'center' }}>
                    <ComparisonCell value={row.pro} isHighlighted={true} />
                  </Box>
                  <Box component="td" sx={{ py: 1.5, textAlign: 'center' }}>
                    <ComparisonCell value={row.equipe} isHighlighted={false} />
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
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  /** Resolve o preco exibido com base no periodo de cobranca selecionado */
  const getPrice = useCallback((plan: PlanData): string => {
    if (billingPeriod === 'annual' && plan.priceAnnual) {
      return plan.priceAnnual;
    }
    return plan.priceMonthly;
  }, [billingPeriod]);

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
      <DocumentHead {...seo} />
      <script type="application/ld+json">{JSON.stringify(pricingJsonLd)}</script>
      <PageLayout>
      {/* Hero — H1 + subtitulo + CTAs */}
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
                ctaDisabled={plan.name !== 'Gratuito'}
                ctaTooltip="Pagamentos em breve — fique ligado nas novidades!"
                onCtaClick={plan.name === 'Gratuito' ? () => navigate('/login') : undefined}
                index={idx}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Disclaimer — limites nao aplicados */}
      <Box sx={{ pb: { xs: 6, md: 8 }, mx: { xs: 2, sm: 3 } }}>
        <Alert severity="info" variant="outlined">
          Os limites por plano ainda não são aplicados automaticamente. Todos os recursos estão disponíveis para uso durante o período de desenvolvimento.
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
              Compare os planos em detalhes
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}
            >
              Veja lado a lado tudo que cada plano oferece para escolher o melhor para suas
              necessidades.
            </Typography>
          </Box>
        </Box>
        <ComparisonTable />
      </Box>

      {/* FAQ — Perguntas frequentes sobre precos */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <FAQAccordion items={[...PRICING_FAQ_ITEMS]} title="Perguntas frequentes sobre preços" />
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
