import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import { alpha } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { CTASection } from '../../components/public/CTASection';
import {
  BRAND_PRIMARY,
  TEXT_SECONDARY,
  SUCCESS_MAIN,
  APP_BORDER,
} from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Entrada individual do changelog */
interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: readonly string[];
}

// ── Constantes de dados ──────────────────────────────────────────────

const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: '0.17.0',
    date: '24 de abril de 2026',
    title: 'Páginas Públicas e Design System',
    changes: [
      'Landing Page e página de Funcionalidades com design premium',
      '10 componentes públicos reutilizáveis (Header, Footer, Hero, Cards, etc.)',
      'Paleta de marca atualizada (azul + laranja)',
      'PWA base com service worker e manifest',
      'SEO otimizado (OG, Twitter Cards, Schema.org)',
      'Keyboard shortcuts para o estúdio',
      'COEP simplificado em rotas autenticadas',
      'Prefixo /app/ em todas as rotas do app',
      '77 testes novos (total: 857)',
    ],
  },
  {
    version: '0.16.1',
    date: 'Abril de 2026',
    title: 'Player de Vídeo Integrado',
    changes: [
      'Estado do player centralizado no videoRenderBridge',
      'ActionBar e VideoPreview consomem bridge compartilhada',
      'Conversão de frames (frameToSeconds/secondsToFrame)',
    ],
  },
  {
    version: '0.16.0',
    date: 'Março de 2026',
    title: 'Suite de Testes',
    changes: [
      '62 testes cobrindo todas as áreas do projeto',
      'Scripts de teste com watch mode',
      'Configuração Vitest com jsdom + fake-indexeddb',
      'Normalização de bold markdown no subtitleUtils',
    ],
  },
  {
    version: '0.15.0',
    date: 'Março de 2026',
    title: 'UX e Biblioteca',
    changes: [
      'Navigation drawer mobile no Header',
      'CaptionEditorPanel redesign com PhraseCard',
      'Botão copiar no ScriptEditor e AssistantMessages',
      'Diálogos de exclusão em VideoLibrary e Assistant',
    ],
  },
  {
    version: '0.14.0',
    date: 'Fevereiro de 2026',
    title: 'Editor de Legendas',
    changes: [
      'SubtitleInlineEditor — editor inline de estilo de legendas',
      'Estilo configurável (fontSize, padding, borderRadius, opacity)',
      'Limpeza de código morto',
    ],
  },
  {
    version: '0.13.0',
    date: 'Fevereiro de 2026',
    title: 'Biblioteca e Gerenciamento',
    changes: [
      'Busca na Biblioteca e histórico do assistente',
      'Gallery de imagens com exclusão',
      'Audio segments dual storage (Firestore + IndexedDB)',
      'deleteImageGeneration e saveChatSession',
    ],
  },
  {
    version: '0.12.0',
    date: 'Janeiro de 2026',
    title: 'Autenticação e Páginas',
    changes: [
      'LoginPage dedicada com ProtectedRoute',
      'COEP em produção via firebase.json',
      'Rota /estudio separada da landing page',
    ],
  },
  {
    version: '0.9.0',
    date: 'Dezembro de 2025',
    title: 'Foco em TTS e Vídeo',
    changes: [
      'Remoção completa do plano de edição IA',
      'Fade in/out padrão em todas as cenas',
      'Rate limiter reutilizável',
    ],
  },
  {
    version: '0.8.0',
    date: 'Novembro de 2025',
    title: 'Whisper e Legendas',
    changes: [
      'Transcrição automática via Whisper WASM',
      'Modos de legenda: scroll-phrases e word-karaoke',
      'WaveformOverlay com frame relativo',
    ],
  },
] as const;

const PAGE_TITLE = 'Novidades';
const PAGE_SUBTITLE = 'Acompanhe as últimas atualizações do Script Master';
const LATEST_LABEL = 'Mais recente';

// ── Subcomponentes ───────────────────────────────────────────────────

/** Card de uma versão com badge, data e lista de mudanças */
function ChangelogCard({
  entry,
  isLatest,
}: {
  entry: ChangelogEntry;
  isLatest: boolean;
}) {
  return (
    <Box
      sx={(theme) => ({
        ...glassPanelSx(theme),
        p: { xs: 3, md: 4 },
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: `0 28px 88px ${alpha(theme.palette.common.black, 0.35)}`,
        },
        ...(isLatest && {
          border: `1px solid ${alpha(BRAND_PRIMARY, 0.3)}`,
        }),
      })}
    >
      {/* Cabeçalho: versão + data */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <Chip
          label={`v${entry.version}`}
          size="small"
          sx={(theme) => ({
            fontWeight: 700,
            fontSize: '0.8rem',
            bgcolor: alpha(theme.palette.primary.main, 0.14),
            color: theme.palette.primary.main,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
          })}
        />
        {isLatest && (
          <Chip
            icon={<StarIcon sx={{ fontSize: 14 }} />}
            label={LATEST_LABEL}
            size="small"
            color="secondary"
            variant="filled"
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
        )}
        <Typography
          variant="body2"
          sx={{ color: TEXT_SECONDARY, ml: 'auto', display: { xs: 'none', sm: 'block' } }}
        >
          {entry.date}
        </Typography>
      </Stack>
      {/* Data visível em mobile, abaixo dos chips */}
      <Typography
        variant="body2"
        sx={{ color: TEXT_SECONDARY, mb: 2, display: { xs: 'block', sm: 'none' } }}
      >
        {entry.date}
      </Typography>

      {/* Título */}
      <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
        {entry.title}
      </Typography>

      {/* Lista de mudanças */}
      <Stack spacing={1}>
        {entry.changes.map((change) => (
          <Stack
            key={change}
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'flex-start' }}
          >
            <CheckCircleIcon
              sx={{ fontSize: 18, color: SUCCESS_MAIN, mt: 0.25, flexShrink: 0 }}
            />
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.7 }}>
              {change}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ── Componente principal ─────────────────────────────────────────────

export default function ChangelogPage() {
  const seo = getPageSeo({
    title: 'Novidades',
    description: 'Acompanhe as últimas atualizações e novidades do Script Master.',
    path: '/novidades',
  });

  return (
    <>
      <Helmet {...seo} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title={PAGE_TITLE}
        subtitle={PAGE_SUBTITLE}
        primaryCta={{ label: 'Começar Grátis', to: '/login' }}
        secondaryCta={{ label: 'Ver Funcionalidades', to: '/funcionalidades' }}
      />

      {/* Timeline de versões */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        {CHANGELOG.map((entry, index) => {
          const isFirst = index === 0;
          const isLast = index === CHANGELOG.length - 1;

          return (
            <Box key={entry.version} sx={{ position: 'relative' }}>
              {/* Linha conectora vertical */}
              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 20, sm: 24 },
                  top: 32,
                  bottom: isLast ? 32 : 0,
                  width: 2,
                  background: isFirst
                    ? `linear-gradient(180deg, ${alpha(BRAND_PRIMARY, 0.4)} 0%, ${APP_BORDER} 100%)`
                    : APP_BORDER,
                  zIndex: 0,
                  ...(isLast && { display: 'none' }),
                }}
              />

              {/* Dot + Card */}
              <Box sx={{ display: 'flex', position: 'relative', zIndex: 1 }}>
                {/* Dot na timeline */}
                <Box
                  sx={{
                    flexShrink: 0,
                    width: { xs: 40, sm: 48 },
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Box
                    sx={(theme) => ({
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: isFirst ? BRAND_PRIMARY : APP_BORDER,
                      border: '2px solid',
                      borderColor: theme.palette.background.default,
                      boxShadow: isFirst
                        ? `0 0 14px ${alpha(BRAND_PRIMARY, 0.5)}`
                        : `0 0 6px ${alpha(APP_BORDER, 0.3)}`,
                    })}
                  />
                </Box>

                {/* Card */}
                <Box sx={{ flex: 1, pb: { xs: 4, md: 5 } }}>
                  <ChangelogCard entry={entry} isLatest={isFirst} />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* CTA Final */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <CTASection
          title="Comece a criar agora"
          subtitle="Todas essas atualizações estão disponíveis gratuitamente. Transforme seus roteiros em produções profissionais."
          buttonLabel="Entrar com Google"
          buttonHref="/login"
        />
      </Box>
    </PageLayout>
    </>
  );
}
