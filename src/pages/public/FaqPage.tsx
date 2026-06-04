import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import EmailIcon from '@mui/icons-material/Email';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { motion } from 'motion/react';
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { FAQAccordion } from '../../components/public/FAQAccordion';
import { CTASection } from '../../components/public/CTASection';
import { BRAND_PRIMARY, TEXT_SECONDARY, BRAND_PRIMARY_GLOW_SOFT, RADIUS_SM, RADIUS_XS } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { getLocalizedPricingFaq } from '../../data/pricingFaq';
import { fadeInUp, fadeIn, VIEWPORT_ONCE } from '../../components/public/animations';
import { useLocale } from '../../features/i18n';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Item individual de FAQ com pergunta e resposta */
interface FAQItem {
  question: string;
  answer: string;
}

/** Categoria de FAQ agrupando itens por tema */
interface FaqCategory {
  id: string;
  label: string;
  icon: typeof ContactSupportIcon;
  items: readonly FAQItem[];
}

// ── Constantes de dados ──────────────────────────────────────────────

/** Rota de destino do botao de contato */
const CONTACT_ROUTE = '/contato';

// ── Helpers de acessibilidade ────────────────────────────────────────

/** Gera atributos ARIA para conectar Tab ao TabPanel correspondente */
function tabA11yProps(index: number) {
  return {
    id: `faq-tab-${index}`,
    'aria-controls': `faq-tabpanel-${index}`,
  };
}

// ── Componente principal ─────────────────────────────────────────────

export default function FaqPage() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const { t, locale } = useLocale();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // ── FAQ items localizados via t() ──
  const GENERAL_FAQ_ITEMS: readonly FAQItem[] = [
    { question: t('faqItems.general.0.question'), answer: t('faqItems.general.0.answer') },
    { question: t('faqItems.general.1.question'), answer: t('faqItems.general.1.answer') },
    { question: t('faqItems.general.2.question'), answer: t('faqItems.general.2.answer') },
    { question: t('faqItems.general.3.question'), answer: t('faqItems.general.3.answer') },
    { question: t('faqItems.general.4.question'), answer: t('faqItems.general.4.answer') },
    { question: t('faqItems.general.5.question'), answer: t('faqItems.general.5.answer') },
  ];

  const TECHNICAL_FAQ_ITEMS: readonly FAQItem[] = [
    { question: t('faqItems.technical.0.question'), answer: t('faqItems.technical.0.answer') },
    { question: t('faqItems.technical.1.question'), answer: t('faqItems.technical.1.answer') },
    { question: t('faqItems.technical.2.question'), answer: t('faqItems.technical.2.answer') },
    { question: t('faqItems.technical.3.question'), answer: t('faqItems.technical.3.answer') },
    { question: t('faqItems.technical.4.question'), answer: t('faqItems.technical.4.answer') },
  ];

  const ACCOUNT_FAQ_ITEMS: readonly FAQItem[] = [
    { question: t('faqItems.account.0.question'), answer: t('faqItems.account.0.answer') },
    { question: t('faqItems.account.1.question'), answer: t('faqItems.account.1.answer') },
    { question: t('faqItems.account.2.question'), answer: t('faqItems.account.2.answer') },
  ];

  const localizedPricingFaq = getLocalizedPricingFaq(locale);

  // ── Categorias de FAQ — dentro do componente para acessar t() ──
  const FAQ_CATEGORIES: readonly FaqCategory[] = [
    {
      id: 'geral',
      label: t('faq.categories.general'),
      icon: ContactSupportIcon,
      items: GENERAL_FAQ_ITEMS,
    },
    {
      id: 'precos',
      label: t('faq.categories.pricing'),
      icon: PaymentsOutlined,
      items: localizedPricingFaq,
    },
    {
      id: 'tecnico',
      label: t('faq.categories.technical'),
      icon: BuildOutlined,
      items: TECHNICAL_FAQ_ITEMS,
    },
    {
      id: 'conta',
      label: t('faq.categories.account'),
      icon: AccountCircleOutlined,
      items: ACCOUNT_FAQ_ITEMS,
    },
  ];

  const activeCategory = FAQ_CATEGORIES[activeTab];

  const seo = getPageSeo({
    title: t('seo.faq.title'),
    description: t('seo.faq.description'),
    path: '/perguntas-frequentes',
    jsonLdType: 'webpage',
  });

  return (
    <>
      <DocumentHead {...seo} locale={locale} />
      <PageLayout>
      {/* Hero — H1 + subtitulo */}
      <HeroSection
        title={t('faq.hero.title')}
        subtitle={t('faq.hero.subtitle')}
        primaryCta={{ label: t('faq.hero.cta'), to: '/cadastro' }}
        secondaryCta={{ label: t('faq.hero.ctaSecondary'), to: '/precos' }}
        visual={
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <QuestionAnswerIcon sx={{ fontSize: 80, color: BRAND_PRIMARY, opacity: 0.85 }} />
          </Box>
        }
        showGlow
      />

      {/* Navegacao por categorias — Tabs scrollaveis */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Box
          component={motion.div}
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          sx={(theme) => ({ ...glassPanelSx(theme), mx: { xs: 2, sm: 3 }, p: { xs: 2, md: 3 }, mb: { xs: 4, md: 6 } })}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue: number) => setActiveTab(newValue)}
            aria-label={t('faq.categories.ariaLabel')}
            variant={isMobile ? 'fullWidth' : 'scrollable'}
            scrollButtons={isMobile ? false : 'auto'}
            allowScrollButtonsMobile={!isMobile }
            sx={{
              minHeight: { xs: 48, md: 56 },
              '& .MuiTabs-list': {
                gap: isMobile ? 0 : 0.5,
                justifyContent: { xs: 'flex-start', md: 'center' },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: BRAND_PRIMARY,
                height: 3,
                borderRadius: RADIUS_SM,
              },
              // Botoes de scroll estilizados
              '& .MuiTabs-scrollButtons': {
                color: BRAND_PRIMARY,
                '&.Mui-disabled': { opacity: 0.3 },
              },
            }}
          >
            {FAQ_CATEGORIES.map((category, index) => {
              const IconComponent = category.icon;
              const isActive = index === activeTab;

              return (
                <Tab
                  key={category.id}
                  label={category.label}
                  icon={<IconComponent sx={{ fontSize: 20 }} />}
                  iconPosition="start"
                  {...tabA11yProps(index)}
                  sx={(theme) => ({
                    textTransform: 'none',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: { xs: '0.85rem', md: '0.95rem' },
                    color: isActive
                      ? theme.palette.primary.main
                      : alpha(theme.palette.text.primary, 0.6),
                    minHeight: { xs: 48, md: 56 },
                    px: { xs: 2, md: 3 },
                    py: 1,
                    borderRadius: RADIUS_XS,
                    transition: 'color 200ms ease-in-out, background-color 200ms ease-in-out',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    },
                    '& .MuiTab-icon': {
                      mr: 0.75,
                    },
                  })}
                />
              );
            })}
          </Tabs>
        </Box>

        {/* Painel de conteudo — FAQAccordion da categoria ativa */}
        <Box
          role="tabpanel"
          id={`faq-tabpanel-${activeTab}`}
          aria-labelledby={`faq-tab-${activeTab}`}
          tabIndex={0}
          sx={{ outline: 'none' }}
        >
          <Box sx={{ mx: { xs: 2, sm: 3 } }}>
            <FAQAccordion
              items={[...activeCategory.items]}
              title={activeCategory.label}
            />
          </Box>
        </Box>
      </Box>

      {/* Secao "Ainda tem duvidas?" */}
      <Box
        component={motion.div}
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        sx={{ py: { xs: 6, md: 8 }, textAlign: 'center' }}
      >
        <Box sx={{ maxWidth: 560, mx: 'auto', px: 2 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 2, letterSpacing: '-0.03em' }}>
            {t('faq.stillHaveQuestions.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: TEXT_SECONDARY, mb: 4, lineHeight: 1.7 }}
          >
            {t('faq.stillHaveQuestions.text')}
          </Typography>
          <Button
            component={Link}
            to={CONTACT_ROUTE}
            variant="text"
            startIcon={<EmailIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              color: BRAND_PRIMARY,
              px: 3,
              py: 1.25,
              borderRadius: RADIUS_SM,
              '&:hover': {
                backgroundColor: alpha(BRAND_PRIMARY, 0.08),
                boxShadow: `0 4px 20px ${BRAND_PRIMARY_GLOW_SOFT}`,
              },
            }}
          >
            {t('faq.stillHaveQuestions.button')}
          </Button>
        </Box>
      </Box>

      {/* CTA Final */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <CTASection
          title={t('faq.cta.title')}
          subtitle={t('faq.cta.subtitle')}
          buttonLabel={t('faq.cta.button')}
          buttonHref="/cadastro"
        />
      </Box>
    </PageLayout>
    </>
  );
}
