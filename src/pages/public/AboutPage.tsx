import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ScheduleIcon from '@mui/icons-material/Schedule';
import type { ReactNode } from 'react';
import { alpha } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { CTASection } from '../../components/public/CTASection';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  TEXT_SECONDARY,
  SUCCESS_MAIN,
  WARNING_MAIN,
  APP_BORDER,
} from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Card de valor com ícone, título e descrição */
interface ValueCard {
  icon: ReactNode;
  title: string;
  description: string;
}

/** Membro do time */
interface TeamMember {
  name: string;
  role: string;
  avatarUrl?: string;
}

/** Status do item do roadmap */
type RoadmapStatus = 'done' | 'current' | 'planned';

/** Item do roadmap público */
interface RoadmapItem {
  version: string;
  title: string;
  description: string;
  status: RoadmapStatus;
}

// ── Constantes de dados ──────────────────────────────────────────────

const VALUES: readonly ValueCard[] = [
  {
    icon: <LightbulbIcon />,
    title: 'Criatividade',
    description:
      'Acreditamos que a tecnologia deve amplificar a criatividade humana, não substituí-la. Por isso, construímos ferramentas que dão poder ao criador.',
  },
  {
    icon: <TouchAppIcon />,
    title: 'Simplicidade',
    description:
      'Transformar roteiros em produções profissionais não deveria ser complicado. Cada funcionalidade é pensada para ser intuitiva e acessível.',
  },
  {
    icon: <RocketLaunchIcon />,
    title: 'Inovação',
    description:
      'Estamos na fronteira da IA generativa aplicada à produção de conteúdo. Nosso compromisso é trazer o que há de mais avançado para seu dia a dia.',
  },
];

const TEAM: readonly TeamMember[] = [
  { name: 'Koda AI Studio', role: 'Criação e Desenvolvimento' },
];

const ROADMAP: readonly RoadmapItem[] = [
  {
    version: '0.17',
    title: 'Autenticação e Navegação',
    description: 'Login com Google e email/senha, cadastro, rotas protegidas e SEO com páginas públicas',
    status: 'done',
  },
  {
    version: '0.20',
    title: 'Speed Paint e Vídeo Avançado',
    description: 'Animação de pintura progressiva, Web Worker para renderização, cache LRU e exportação WebM',
    status: 'done',
  },
  {
    version: '0.22',
    title: 'Estúdio de Produção',
    description: 'Refatoração completa do estúdio com Zustand, persistência de preferências e controle granular de speed paint',
    status: 'done',
  },
  {
    version: '0.23',
    title: 'Exclusão de Conta LGPD',
    description: 'Pipeline de exclusão completo (Firestore + Storage + IndexedDB), verificação de email e UI centralizada do assistente',
    status: 'done',
  },
  {
    version: '0.24',
    title: 'Qualidade de Vídeo e Exportação',
    description: 'Export quality (720p–4k), estimativa de tamanho, multiplicadores de speed paint por fase e 1185 testes',
    status: 'done',
  },
  {
    version: 'next',
    title: 'Planos e Pagamentos',
    description: 'Integração com Stripe para assinaturas, pagamentos e gerenciamento de plano',
    status: 'planned',
  },
  {
    version: '1.0',
    title: 'Lançamento Oficial',
    description: 'Versão estável com todas as funcionalidades core e documentação completa',
    status: 'planned',
  },
];

const MISSION_TITLE = 'Nossa Missão';
const MISSION_TEXT =
  'Democratizar a produção de conteúdo de áudio e vídeo, permitindo que qualquer pessoa transforme suas ideias em produções profissionais com o poder da inteligência artificial.';

const VISION_TITLE = 'Nossa Visão';
const VISION_TEXT =
  'Ser a plataforma líder em criação de conteúdo assistida por IA no Brasil, reconhecida pela qualidade, simplicidade e inovação.';

const TEAM_TITLE = 'Quem Somos';
const TEAM_DESCRIPTION =
  'Somos uma equipe apaixonada por tecnologia e criação de conteúdo, construindo o futuro da produção audiovisual com inteligência artificial.';

const ROADMAP_TITLE = 'Roadmap Público';
const ROADMAP_DESCRIPTION =
  'Conheça os marcos que já alcançamos e o que está por vir.';

type ChipColor = 'success' | 'warning' | 'info';

/** Mapeamento de status para labels e cores */
const STATUS_CONFIG: Record<RoadmapStatus, { label: string; color: ChipColor }> = {
  done: { label: 'Concluído', color: 'success' },
  current: { label: 'Em andamento', color: 'warning' },
  planned: { label: 'Planejado', color: 'info' },
};

// ── Helpers de cor por status ────────────────────────────────────────

function getDotColor(status: RoadmapStatus): string {
  switch (status) {
    case 'done':
      return SUCCESS_MAIN;
    case 'current':
      return WARNING_MAIN;
    case 'planned':
      return APP_BORDER;
  }
}

function getStatusIcon(status: RoadmapStatus) {
  switch (status) {
    case 'done':
      return <CheckCircleIcon sx={{ fontSize: 14 }} />;
    case 'current':
      return <AutorenewIcon sx={{ fontSize: 14 }} />;
    case 'planned':
      return <ScheduleIcon sx={{ fontSize: 14 }} />;
  }
}

// ── Subcomponentes ───────────────────────────────────────────────────

/** Card de valor individual com ícone em gradiente */
function ValueCardComponent({ icon, title, description }: ValueCard) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        ...glassPanelSx(theme),
        p: { xs: 3, md: 4 },
        textAlign: 'center',
        height: '100%',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: `0 28px 80px ${alpha(theme.palette.common.black, 0.3)}`,
        },
      })}
    >
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: BRAND_GRADIENT,
            color: 'common.white',
            boxShadow: `0 8px 24px ${alpha(BRAND_PRIMARY_GLOW, 0.3)}`,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="h3" sx={{ letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.7 }}>
          {description}
        </Typography>
      </Stack>
    </Paper>
  );
}

/** Card de membro do time */
function TeamCard({ name, role, avatarUrl }: TeamMember) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        ...glassPanelSx(theme),
        p: 3,
        textAlign: 'center',
        height: '100%',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 24px 64px ${alpha(theme.palette.common.black, 0.25)}`,
        },
      })}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar
          src={avatarUrl}
          alt={name}
          sx={(theme) => ({
            width: 80,
            height: 80,
            fontSize: '1.5rem',
            bgcolor: theme.palette.primary.main,
            color: 'common.white',
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
          })}
        >
          {name.charAt(0)}
        </Avatar>
        <Typography variant="h6" component="h3" sx={{ letterSpacing: '-0.02em' }}>
          {name}
        </Typography>
        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6 }}>
          {role}
        </Typography>
      </Stack>
    </Paper>
  );
}

/** Linha do roadmap com dot, badge de versão e descrição */
function RoadmapRow({ item, isLast }: { item: RoadmapItem; isLast: boolean }) {
  const { label, color } = STATUS_CONFIG[item.status];
  const dotColor = getDotColor(item.status);
  const isCurrent = item.status === 'current';

  return (
    <Box sx={{ display: 'flex', position: 'relative', pb: isLast ? 0 : 4 }}>
      {/* Coluna do dot + linha vertical */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          width: 40,
          mr: 2,
        }}
      >
        <Box
          sx={(theme) => ({
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
            mt: '5px',
            boxShadow: isCurrent
              ? `0 0 16px ${alpha(WARNING_MAIN, 0.6)}`
              : `0 0 10px ${alpha(dotColor, 0.35)}`,
            animation: isCurrent ? 'pulse 2s ease-in-out infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { boxShadow: `0 0 16px ${alpha(WARNING_MAIN, 0.6)}` },
              '50%': { boxShadow: `0 0 24px ${alpha(WARNING_MAIN, 0.9)}` },
            },
            border: '2px solid',
            borderColor: theme.palette.background.default,
          })}
        />
        {/* Linha conectora */}
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flexGrow: 1,
              mt: 0.5,
              backgroundColor:
                item.status === 'planned'
                  ? APP_BORDER
                  : alpha(dotColor, 0.35),
            }}
          />
        )}
      </Box>

      {/* Conteúdo */}
      <Box sx={{ flex: 1, pb: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}
        >
          <Chip
            label={`v${item.version}`}
            size="small"
            sx={(theme) => ({
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.main,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            })}
          />
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {item.title}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, mb: 1, lineHeight: 1.6 }}>
          {item.description}
        </Typography>
        <Chip
          icon={getStatusIcon(item.status)}
          label={label}
          color={color}
          size="small"
          variant="outlined"
        />
      </Box>
    </Box>
  );
}

// ── Componente principal ─────────────────────────────────────────────

export default function AboutPage() {
  const seo = getPageSeo({
    title: 'Sobre',
    description: 'Conheça o Script Master: missão, valores e roadmap de desenvolvimento.',
    path: '/sobre',
  });

  return (
    <>
      <Helmet {...seo} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title="Sobre o Script Master"
        subtitle="Conheça a história, os valores e o roadmap da plataforma que está transformando a produção de conteúdo com inteligência artificial."
        primaryCta={{ label: 'Criar conta gratuita', to: '/cadastro' }}
        secondaryCta={{ label: 'Ver Funcionalidades', to: '/funcionalidades' }}
        visual={
          <Box
            component="img"
            src="/images/public/hero-illustration.webp"
            alt="Ilustração do Script Master"
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

      {/* Missão & Visão */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Box
          sx={(theme) => ({
            ...glassPanelSx(theme),
            p: { xs: 4, md: 6 },
            mx: { xs: 2, sm: 3 },
            textAlign: 'center',
          })}
        >
          <Stack spacing={4}>
            <Box>
              <Typography variant="h3" component="h2" sx={{ mb: 2 }}>
                {MISSION_TITLE}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: TEXT_SECONDARY, maxWidth: 640, mx: 'auto', lineHeight: 1.7 }}
              >
                {MISSION_TEXT}
              </Typography>
            </Box>
            <Box sx={{ width: 80, height: 2, mx: 'auto', background: BRAND_GRADIENT, borderRadius: 1 }} />
            <Box>
              <Typography variant="h3" component="h2" sx={{ mb: 2 }}>
                {VISION_TITLE}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: TEXT_SECONDARY, maxWidth: 640, mx: 'auto', lineHeight: 1.7 }}
              >
                {VISION_TEXT}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Nossos Valores */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: '-0.035em' }}>
            Nossos Valores
          </Typography>
          <Typography variant="body1" sx={{ color: TEXT_SECONDARY, maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}>
            Três pilares que guiam cada decisão e funcionalidade da plataforma.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {VALUES.map((value) => (
            <Grid size={{ xs: 12, sm: 4 }} key={value.title}>
              <ValueCardComponent {...value} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Time */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: '-0.035em' }}>
            {TEAM_TITLE}
          </Typography>
          <Typography variant="body1" sx={{ color: TEXT_SECONDARY, maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}>
            {TEAM_DESCRIPTION}
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
          {TEAM.map((member) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={member.name}>
              <TeamCard {...member} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Roadmap Público */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography variant="h3" component="h2" sx={{ mb: 1.5, letterSpacing: '-0.035em' }}>
            {ROADMAP_TITLE}
          </Typography>
          <Typography variant="body1" sx={{ color: TEXT_SECONDARY, maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}>
            {ROADMAP_DESCRIPTION}
          </Typography>
        </Box>

        <Box sx={{ mx: { xs: 2, sm: 3 }, maxWidth: 720 }}>
          {ROADMAP.map((item, index) => (
            <RoadmapRow
              key={item.version}
              item={item}
              isLast={index === ROADMAP.length - 1}
            />
          ))}
        </Box>
      </Box>

      {/* CTA Final */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <CTASection
          title="Faça parte dessa história"
          subtitle="Comece a criar conteúdo profissional com IA. Gratuito, sem cartão de crédito."
          buttonLabel="Começar agora"
          buttonHref="/cadastro"
        />
      </Box>
    </PageLayout>
    </>
  );
}
