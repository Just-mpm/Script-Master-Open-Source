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
import { getPageSeo, DEFAULT_DESCRIPTION } from '../../lib/seo';
import { DocumentHead } from '../../components/DocumentHead';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { FeatureCard } from '../../components/public/FeatureCard';
import { FeatureShowcase } from '../../components/public/FeatureShowcase';
import { CTASection } from '../../components/public/CTASection';
import { StepCard } from '../../components/public/StepCard';
import { SocialProofBar } from '../../components/public/SocialProofBar';
import { staggerContainer, fadeInUp, VIEWPORT_ONCE } from '../../components/public/animations';

const HIGHLIGHT_FEATURES = [
  {
    icon: Mic,
    title: 'Voz com IA',
    description: 'Transforme roteiros em áudio profissional com Gemini TTS. Controle de voz, pace e multi-speaker.',
  },
  {
    icon: PlayCircle,
    title: 'Vídeo Automático',
    description: 'Crie vídeos client-side com legendas, transições e waveform. Nenhum backend necessário.',
  },
  {
    icon: ImageIcon,
    title: 'Geração de Imagens',
    description: '8 aspect ratios, referência visual e galeria completa com persistência na nuvem.',
  },
  {
    icon: Palette,
    title: 'Speed Paint',
    description: 'Animação de pintura progressiva com edge detection, batch processing e exportação.',
  },
  {
    icon: AutoAwesome,
    title: 'Assistente IA',
    description: 'Chat com streaming, memórias, anexos e integração direta com o estúdio de produção.',
  },
  {
    icon: LocalLibrary,
    title: 'Biblioteca',
    description: 'Gestão completa de projetos com áudios, cenas, vídeos e persistência dual.',
  },
];

const ALL_FEATURES = [
  {
    icon: Mic,
    title: 'Multi-speaker',
    description: 'Suporte a 2 locutores com configuração independente de voz e nome.',
  },
  {
    icon: Speed,
    title: 'Chunking Inteligente',
    description: 'Divisão otimizada via LLM + fallback programático. Limite de 500 chars por chunk.',
  },
  {
    icon: Storage,
    title: 'Dual Storage',
    description: 'Firestore (autenticado) + IndexedDB (local) com migração automática.',
  },
];

const STEPS = [
  {
    number: 1,
    title: 'Escreva seu roteiro',
    description: 'Use o editor integrado ou cole seu texto. O assistente IA pode ajudar a melhorar seu roteiro.',
    icon: EditNote,
  },
  {
    number: 2,
    title: 'Gere com IA',
    description: 'Um clique para transformar seu roteiro em áudio, imagens e vídeo com Gemini.',
    icon: AutoAwesome,
  },
  {
    number: 3,
    title: 'Exporte e compartilhe',
    description: 'Baixe seu áudio WAV, vídeo MP4/WebM ou imagens PNG em alta resolução.',
    icon: PlayCircle,
  },
];

export default function LandingPage() {
  const seo = getPageSeo({
    title: 'Roteiros em Áudio com IA',
    description: DEFAULT_DESCRIPTION,
    path: '/',
  });

  return (
    <>
      <DocumentHead {...seo} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title="Transforme roteiros em arte com IA"
        subtitle="Plataforma completa para criar áudio, vídeo e imagens profissionais a partir de roteiros. Tudo client-side com Gemini AI."
        primaryCta={{ label: 'Criar conta gratuita', to: '/cadastro' }}
        secondaryCta={{ label: 'Ver Funcionalidades', to: '/funcionalidades' }}
        visual={
          <Box
            component="img"
            src="/images/public/hero-illustration.webp"
            alt="Ilustração do Script Master — transformação de roteiros em arte com IA"
            sx={{
              maxWidth: { xs: 320, sm: 420, md: 520 },
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 24px 48px rgba(46, 117, 182, 0.25))',
              borderRadius: 2,
            }}
          />
        }
      />

      {/* Social Proof */}
      <SocialProofBar
        label="Powered by Gemini AI"
        sublabel="TTS, geração de imagens e assistente conversacional"
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
              sx={{ mb: 1.5, letterSpacing: '-0.035em' }}
            >
              Tudo que você precisa para criar
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}>
              Seis ferramentas integradas em uma única plataforma para transformar suas ideias em conteúdo profissional.
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

      {/* Feature Showcase — TTS */}
      <FeatureShowcase
        icon={Mic}
        title="Voz Profissional com Gemini TTS"
        description="Transforme qualquer roteiro em narração profissional com vozes naturais e controle total sobre pace, pitch e perfil de áudio."
        benefits={[
          'Multi-speaker com 2 locutores independentes',
          'Detecção automática de cenas via análise de silêncio (RMS)',
          'Controle de pace, pitch e perfil de áudio (podcast, audiobook, narração)',
          'Voice previews para cada voz disponível',
          'Áudio 24kHz mono 16-bit PCM de alta qualidade',
        ]}
        visual={
          <Box
            component="img"
            src="/images/public/feature-tts.webp"
            alt="Geração de áudio TTS com IA"
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
        title="Vídeo Client-Side com Remotion"
        description="Renderize vídeos completos diretamente no navegador. Nenhum servidor, nenhum custo de renderização. WebCodecs + Whisper para legendas automáticas."
        benefits={[
          'Codec fallback: H.264+AAC+MP4 > H.264 sem áudio > VP8+Opus+WebM',
          'Legendas automáticas com Whisper WASM (3 fontes de sincronização)',
          'Crossfade entre cenas com spring animation (400ms overlap)',
          '3 resoluções: 16:9, 9:16, 1:1',
          'Waveform overlay sincronizado com o vídeo',
        ]}
        position="left"
        visual={
          <Box
            component="img"
            src="/images/public/feature-video.webp"
            alt="Renderização de vídeo client-side"
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
        title="Assistente IA Integrado"
        description="Chat conversacional com streaming Gemini, memórias de longo prazo e integração direta com o estúdio. O assistente sugere alterações que você aplica com um clique."
        benefits={[
          'Streaming em tempo real com Gemini 3.1 Flash',
          'Sistema de memória: textos curtos + upload de documentos (.md, .txt, .csv)',
          'Anexos: 5 por mensagem (imagens 10MB, documentos 5MB)',
          'Extração de JSON do chat com botão "Aplicar no estúdio"',
          'Auto-save de sessões com histórico completo',
        ]}
        visual={
          <Box
            component="img"
            src="/images/public/feature-assistant.webp"
            alt="Assistente IA conversacional"
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

      {/* Como Funciona — 3 steps */}
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
            <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: '-0.035em' }}>
              Como Funciona
            </Typography>
          </Box>
          <Box component={motion.div} variants={fadeInUp}>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
              Três passos para transformar seu roteiro em conteúdo profissional.
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
      <Box sx={{ pt: { xs: 8, md: 12 } }}>
        <Box
          component={motion.div}
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}
        >
          <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: '-0.035em' }}>
            E Muito Mais
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
      <Box sx={{ pt: { xs: 8, md: 12 } }}>
        <CTASection
          title="Comece a criar agora"
          subtitle="Crie sua primeira narração gratuitamente. Sem cartão de crédito."
          buttonLabel="Começar agora"
          buttonHref="/cadastro"
        />
      </Box>
    </PageLayout>
    </>
  );
}
