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

const TTS_FEATURES = [
  { icon: Mic, title: 'Geração de Áudio TTS', description: 'Transforme roteiros em áudio profissional com Gemini TTS (24kHz mono 16-bit PCM).' },
  { icon: Speed, title: 'Chunking Inteligente', description: 'Divisão otimizada via LLM + fallback programático. Limite de 500 chars por chunk.' },
  { icon: Groups, title: 'Multi-speaker', description: 'Suporte a 2 locutores (Speaker A + B) com configuração independente de voz e nome.' },
  { icon: EditNote, title: 'Controle de Voz', description: 'Seleção de voz, pace, pitch e audio profile (podcast, audiobook, conversa, narração).' },
];

const VIDEO_FEATURES = [
  { icon: PlayCircle, title: 'Composição de Vídeo', description: 'Vídeos client-side com Remotion e WebCodecs. Sem backend, sem custo de renderização.' },
  { icon: Subtitles, title: 'Legendas Automáticas', description: '3 fontes de sincronização: segment-timing > whisper-aligned > proportional.' },
  { icon: Hd, title: '3 Resoluções', description: '16:9 (1920x1080), 9:16 (1080x1920) e 1:1 (1080x1080).' },
];

const IMAGE_FEATURES = [
  { icon: ImageIcon, title: 'Estúdio de Imagem', description: 'Geração de imagens com Gemini a partir de prompts + referência visual opcional.' },
  { icon: Hd, title: '8 Aspect Ratios', description: '1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9.' },
  { icon: LocalLibrary, title: 'Galeria Integrada', description: 'Histórico de imagens geradas com visualização, exclusão e persistência dual.' },
];

const SPEEDPAINT_FEATURES = [
  { icon: Palette, title: 'Animação de Pintura', description: 'Upload > edge detection > clusterização BFS > vetorização > renderização progressiva.' },
  { icon: Speed, title: 'Batch Processing', description: 'Fila de imagens com modos watch (auto-avança) e record (grava + avança).' },
  { icon: Storage, title: 'Exportação Mídia', description: 'Export PNG (2x) e WebM (H.264 > VP9 > padrão, 12Mbps).' },
];

const ASSISTANT_FEATURES = [
  { icon: AutoAwesome, title: 'Chat Conversacional', description: 'Streaming com Gemini, memórias, anexos (5 por msg: imagem 10MB, documento 5MB).' },
  { icon: EditNote, title: 'Integração com Estúdio', description: 'Modelo sugere alterações em bloco JSON, botão "Aplicar no estúdio" para patch parcial.' },
  { icon: Storage, title: 'Sistema de Memória', description: 'Memórias curtas (texto) + upload de documentos (.md/.txt/.csv até 500KB).' },
];

const PLATFORM_FEATURES = [
  { icon: Storage, title: 'Persistência Dual', description: 'Firestore (autenticado) + IndexedDB (local), migração automática ao logar.' },
  { icon: Groups, title: 'Autenticação Google', description: 'Login via Google popup com contexto de auth e proteção de rotas.' },
  { icon: Subtitles, title: 'Transcrição Whisper', description: 'Modelo WASM Whisper para legendas automáticas (apenas IndexedDB).' },
];

interface FeatureSection {
  id: string;
  title: string;
  features: typeof TTS_FEATURES;
}

const SECTIONS: FeatureSection[] = [
  { id: 'tts', title: 'Estúdio de Voz (TTS)', features: TTS_FEATURES },
  { id: 'video', title: 'Renderização de Vídeo', features: VIDEO_FEATURES },
  { id: 'images', title: 'Geração de Imagens', features: IMAGE_FEATURES },
  { id: 'speed-paint', title: 'Speed Paint & Animação', features: SPEEDPAINT_FEATURES },
  { id: 'assistant', title: 'Assistente IA', features: ASSISTANT_FEATURES },
  { id: 'platform', title: 'Plataforma', features: PLATFORM_FEATURES },
];

export default function FuncionalidadesPage() {
  const seo = getPageSeo({
    title: 'Funcionalidades',
    description: 'Conheça todas as funcionalidades do Script Master: geração de áudio, imagens, vídeos, assistente IA e mais.',
    path: '/funcionalidades',
  });

  return (
    <>
      <DocumentHead {...seo} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title="Tudo que você precisa para criar"
        subtitle="Explore todas as ferramentas integradas do Script Master para transformar seus roteiros em conteúdo profissional."
        primaryCta={{ label: 'Começar Grátis', to: '/cadastro' }}
        secondaryCta={{ label: 'Ver preços', to: '/precos' }}
        visual={
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Mic sx={{ fontSize: 80, color: BRAND_PRIMARY, opacity: 0.85 }} />
          </Box>
        }
        showGlow
      />

      {/* Feature Sections */}
      {SECTIONS.map((section) => (
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
              {section.title}
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
        title="Áudio Profissional com Gemini TTS"
        description="Nosso motor de TTS usa o modelo mais avançado do Gemini para gerar narrações naturais com controle total sobre todos os parâmetros de voz."
        benefits={[
          'Suporte a 14+ parâmetros de estúdio no Inspector',
          'Detecção automática de cenas via análise RMS do áudio gerado',
          'Calibra automática do threshold de silêncio em até 3 iterações',
          'Retry inteligente: 3 tentativas com jitter e backoff exponencial',
          'Voice previews estáticos WAV para playback instantâneo',
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
        title="Vídeo Sem Servidor"
        description="Toda a renderização acontece no seu navegador. Nenhum upload de vídeo, nenhum custo de processamento. Total privacidade e controle."
        benefits={[
          'Codec fallback: H.264+AAC+MP4 > H.264 > VP8+Opus+WebM',
          'Transcrição Whisper WASM embutida (sem backend)',
          'Editor inline de estilo de legendas (fontSize, padding, borderRadius, opacity)',
          'Waveform overlay que desabilita durante exportação para performance',
          'Canvas patch para correção de bug font-stretch no Remotion',
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
        title="Imagens com Referência Visual"
        description="Gere imagens com Gemini usando prompts textuais e, opcionalmente, uma imagem de referência para guiar o estilo e composição."
        benefits={[
          '8 aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9',
          'Frameworks visuais: cinema/fotografia ou whiteboard',
          'Geração de cenas automática a partir do roteiro',
          'Persistência dual: Firestore + IndexedDB',
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
      <Box sx={{ pt: { xs: 4, md: 8 } }}>
        <CTASection
          title="Pronto para criar?"
          subtitle="Comece a usar todas essas features gratuitamente."
          buttonLabel="Começar Grátis"
          buttonHref="/login"
        />
      </Box>
    </PageLayout>
    </>
  );
}
