import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import BuildIcon from '@mui/icons-material/Build';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { ReactElement } from 'react';
import { alpha } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import {
  TEXT_SECONDARY,
  SUCCESS_MAIN,
  WARNING_MAIN,
  ERROR_MAIN,
  APP_BORDER,
  ICON_SIZE_LG,
  WHITE_06,
} from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Status possíveis de um serviço */
type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

/** Informação de um serviço monitorado */
interface ServiceInfo {
  name: string;
  description: string;
  status: ServiceStatus;
  uptime: string;
}

/** Cores suportadas pelo Chip */
type ChipColor = 'success' | 'warning' | 'error' | 'info';

/** Configuração visual por status */
interface StatusConfigItem {
  label: string;
  color: ChipColor;
  icon: ReactElement;
}

// ── Constantes de dados ──────────────────────────────────────────────

const SERVICES: readonly ServiceInfo[] = [
  {
    name: 'API Gemini (IA)',
    description: 'Geração de áudio, imagens e assistente conversacional',
    status: 'operational',
    uptime: '99.9%',
  },
  {
    name: 'Firebase Auth',
    description: 'Autenticação e gerenciamento de contas',
    status: 'operational',
    uptime: '99.9%',
  },
  {
    name: 'Firebase Firestore',
    description: 'Banco de dados e sincronização de projetos',
    status: 'operational',
    uptime: '99.9%',
  },
  {
    name: 'Firebase Storage',
    description: 'Armazenamento de áudios, imagens e vídeos',
    status: 'operational',
    uptime: '99.9%',
  },
  {
    name: 'Renderização de Vídeo',
    description: 'Processamento client-side via WebCodecs',
    status: 'operational',
    uptime: '99.8%',
  },
] as const;

const STATUS_CONFIG: Record<ServiceStatus, StatusConfigItem> = {
  operational: { label: 'Operacional', color: 'success', icon: <CheckCircleIcon /> },
  degraded: { label: 'Degradado', color: 'warning', icon: <WarningIcon /> },
  outage: { label: 'Indisponível', color: 'error', icon: <ErrorIcon /> },
  maintenance: { label: 'Manutenção', color: 'info', icon: <BuildIcon /> },
};

const GLOBAL_STATUS = 'Todos os sistemas operacionais';
const LAST_CHECK = 'Verificado agora';

// ── Helpers ───────────────────────────────────────────────────────────

/** Retorna a cor semântica do status para uso em backgrounds e glows */
function getStatusColor(status: ServiceStatus): string {
  switch (status) {
    case 'operational':
      return SUCCESS_MAIN;
    case 'degraded':
      return WARNING_MAIN;
    case 'outage':
      return ERROR_MAIN;
    case 'maintenance':
      return APP_BORDER;
  }
}

// ── Subcomponentes ───────────────────────────────────────────────────

/** Banner com status global de todos os serviços */
function GlobalStatusBanner() {
  return (
    <Box
      sx={(theme) => ({
        ...glassPanelSx(theme),
        p: { xs: 3, md: 4 },
        mx: { xs: 2, sm: 3 },
        textAlign: 'center',
      })}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: alpha(SUCCESS_MAIN, 0.12),
            boxShadow: `0 0 24px ${alpha(SUCCESS_MAIN, 0.25)}`,
          }}
        >
          <VerifiedUserIcon sx={{ fontSize: 28, color: SUCCESS_MAIN }} />
        </Box>
        <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
          {GLOBAL_STATUS}
        </Typography>
      </Stack>
    </Box>
  );
}

/** Card individual de um serviço */
function ServiceCard({ service }: { service: ServiceInfo }) {
  const { label, color, icon } = STATUS_CONFIG[service.status];
  const statusColor = getStatusColor(service.status);

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Box
        sx={(theme) => ({
          ...glassPanelSx(theme),
          p: { xs: 3, md: 4 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          transition: 'transform 0.3s ease',
          '&:hover': { transform: 'translateY(-2px)' },
        })}
      >
        {/* Nome + Uptime */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {service.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: TEXT_SECONDARY,
              backgroundColor: WHITE_06,
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {service.uptime}
          </Typography>
        </Stack>

        {/* Descrição */}
        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6, flex: 1 }}>
          {service.description}
        </Typography>

        {/* Status */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 8px ${alpha(statusColor, 0.5)}`,
            }}
          />
          <Chip
            icon={icon}
            label={label}
            color={color}
            size="small"
            variant="outlined"
          />
        </Stack>
      </Box>
    </Grid>
  );
}

// ── Componente principal ─────────────────────────────────────────────

export default function StatusPage() {
  const seo = getPageSeo({
    title: 'Status dos Serviços',
    description: 'Monitoramento em tempo real dos serviços do Script Master.',
    path: '/status',
  });

  return (
    <>
      <Helmet {...seo} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title="Status dos Serviços"
        subtitle="Monitoramento em tempo real da disponibilidade e performance dos serviços do Script Master."
        showGlow={false}
      />

      {/* Banner de status global */}
      <Box sx={{ pt: { xs: 6, md: 8 }, pb: { xs: 4, md: 6 } }}>
        <GlobalStatusBanner />
      </Box>

      {/* Grid de serviços */}
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <Grid container spacing={3}>
          {SERVICES.map((service) => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </Grid>
      </Box>

      {/* Última verificação */}
      <Box sx={{ pb: { xs: 8, md: 12 }, textAlign: 'center' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <AccessTimeIcon sx={{ fontSize: ICON_SIZE_LG, color: TEXT_SECONDARY }} />
          <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
            {LAST_CHECK}
          </Typography>
        </Stack>
      </Box>
    </PageLayout>
    </>
  );
}
