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
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { FAQAccordion } from '../../components/public/FAQAccordion';
import { CTASection } from '../../components/public/CTASection';
import { BRAND_PRIMARY, TEXT_SECONDARY, BRAND_PRIMARY_GLOW_SOFT } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { PRICING_FAQ_ITEMS } from '../../data/pricingFaq';
import { fadeInUp, fadeIn, VIEWPORT_ONCE } from '../../components/public/animations';

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

/** Categorias de FAQ — OCP: adicionar categoria sem tocar em componentes */
const FAQ_CATEGORIES: readonly FaqCategory[] = [
  {
    id: 'geral',
    label: 'Geral',
    icon: ContactSupportIcon,
    items: [
      {
        question: 'O que é o Script Master?',
        answer:
          'O Script Master é uma plataforma completa para transformar roteiros em áudio profissional com vozes geradas por IA. Além disso, você pode gerar imagens, renderizar vídeos e contar com um assistente IA para ajudar na criação de conteúdo.',
      },
      {
        question: 'Preciso de conta para usar?',
        answer:
          'Você pode explorar o Script Master sem conta, mas para salvar projetos, gerar áudio e acessar todas as funcionalidades, é necessário criar uma conta gratuita. Oferecemos login com Google ou por email e senha.',
      },
      {
        question: 'Meus dados estão seguros?',
        answer:
          'Sim. Utilizamos o Firebase do Google com criptografia em trânsito e em repouso. Seus roteiros e projetos são armazenados de forma segura e nunca são compartilhados com terceiros.',
      },
      {
        question: 'Funciona offline?',
        answer:
          'O Script Master é uma aplicação web (SPA) que funciona no navegador. Alguns recursos como reprodução de áudios já gerados funcionam offline graças ao Service Worker, mas a geração de conteúdo requer conexão com a internet.',
      },
      {
        question: 'Quais navegadores são suportados?',
        answer:
          'Recomendamos Google Chrome, Microsoft Edge ou Firefox nas versões mais recentes. O Safari tem suporte parcial — algumas funcionalidades avançadas como renderização de vídeo podem não funcionar corretamente.',
      },
      {
        question: 'Posso usar no celular?',
        answer:
          'Sim! O Script Master é responsivo e funciona em dispositivos móveis. No entanto, a experiência de edição de roteiros e renderização de vídeo é otimizada para telas maiores.',
      },
    ],
  },
  {
    id: 'precos',
    label: 'Preços',
    icon: PaymentsOutlined,
    items: PRICING_FAQ_ITEMS,
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    icon: BuildOutlined,
    items: [
      {
        question: 'Quais vozes estão disponíveis?',
        answer:
          'Oferecemos diversas vozes em português brasileiro com diferentes tons e estilos: narrativa, conversacional, jornalística e mais. Você pode ouvir previews de cada voz antes de gerar seu áudio.',
      },
      {
        question: 'Qual o limite de tamanho do roteiro?',
        answer:
          'O limite máximo é de 50.000 caracteres por roteiro. Roteiros maiores que 500 caracteres são automaticamente divididos em segmentos para garantir a consistência da voz.',
      },
      {
        question: 'Como funcionam os vídeos?',
        answer:
          'Os vídeos são renderizados diretamente no seu navegador usando WebCodecs. Você pode combinar áudio gerado, imagens de cena e legendas automáticas. A renderização é 100% client-side — seu roteiro nunca sai do seu dispositivo.',
      },
      {
        question: 'Qual a qualidade do áudio gerado?',
        answer:
          'O áudio é gerado em WAV 24kHz mono 16-bit PCM, com qualidade profissional.',
      },
      {
        question: 'Como funcionam as legendas automáticas?',
        answer:
          'Usamos o modelo Whisper para transcrição automática do áudio. As legendas são geradas com timestamps precisos e podem ser editadas manualmente no editor de legendas.',
      },
    ],
  },
  {
    id: 'conta',
    label: 'Conta',
    icon: AccountCircleOutlined,
    items: [
      {
        question: 'Como faço login?',
        answer:
          'Você pode fazer login de duas formas: com sua conta Google (um clique) ou com email e senha. Clique em "Entrar" no canto superior direito para acessar sua conta. Também oferecemos recuperação de senha caso esqueça.',
      },
      {
        question: 'Posso usar em mais de um dispositivo?',
        answer:
          'Sim! Seus projetos e configurações são sincronizados via Firebase. Basta fazer login em qualquer dispositivo para acessar seu conteúdo.',
      },
      {
        question: 'Como excluo minha conta?',
        answer:
          'Você pode excluir sua conta diretamente pelo app: clique no seu avatar no canto superior direito e selecione "Excluir conta". Todos os seus dados (projetos, áudios, chats, memórias e configurações) são removidos permanentemente em conformidade com a LGPD. Também é possível solicitar a exclusão pelo formulário de contato.',
      },
    ],
  },
] as const;

/** Texto do heading da secao "ainda tem duvidas" */
const STILL_HAVE_DOUBTS_TITLE = 'Ainda tem dúvidas?';

/** Texto do paragrafo da secao "ainda tem duvidas" */
const STILL_HAVE_DOUBTS_TEXT =
  'Não encontrou o que procurava? Entre em contato com nossa equipe e responderemos o mais rápido possível.';

/** Label do botao de contato */
const CONTACT_BUTTON_LABEL = 'Fale conosco';

/** Rota de destino do botao de contato */
const CONTACT_ROUTE = '/contato';

/** aria-label do conjunto de tabs */
const TABS_ARIA_LABEL = 'Categorias de perguntas frequentes';

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
  const activeCategory = FAQ_CATEGORIES[activeTab];

  const seo = getPageSeo({
    title: 'Perguntas Frequentes',
    description: 'Encontre respostas rápidas para as dúvidas mais comuns sobre o Script Master.',
    path: '/perguntas-frequentes',
  });

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_CATEGORIES.flatMap((cat) =>
      cat.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    ),
  };

  return (
    <>
      <DocumentHead {...seo} />
      <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      <PageLayout>
      {/* Hero — H1 + subtitulo */}
      <HeroSection
        title="Perguntas Frequentes"
        subtitle="Encontre respostas rápidas para as dúvidas mais comuns sobre o Script Master."
        primaryCta={{ label: 'Criar conta gratuita', to: '/cadastro' }}
        secondaryCta={{ label: 'Ver planos', to: '/precos' }}
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
            aria-label={TABS_ARIA_LABEL}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: { xs: 48, md: 56 },
              '& .MuiTabs-list': {
                gap: 0.5,
                justifyContent: { xs: 'flex-start', md: 'center' },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: BRAND_PRIMARY,
                height: 3,
                borderRadius: 3,
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
                    borderRadius: 2,
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
            {STILL_HAVE_DOUBTS_TITLE}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: TEXT_SECONDARY, mb: 4, lineHeight: 1.7 }}
          >
            {STILL_HAVE_DOUBTS_TEXT}
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
              borderRadius: 3,
              '&:hover': {
                backgroundColor: alpha(BRAND_PRIMARY, 0.08),
                boxShadow: `0 4px 20px ${BRAND_PRIMARY_GLOW_SOFT}`,
              },
            }}
          >
            {CONTACT_BUTTON_LABEL}
          </Button>
        </Box>
      </Box>

      {/* CTA Final */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <CTASection
          title="Pronto para começar?"
          subtitle="Crie sua primeira narração gratuitamente. Sem compromisso, sem cartão de crédito."
          buttonLabel="Começar agora"
          buttonHref="/cadastro"
        />
      </Box>
    </PageLayout>
    </>
  );
}
