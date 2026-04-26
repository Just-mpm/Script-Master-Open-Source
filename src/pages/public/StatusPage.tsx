import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import BuildIcon from '@mui/icons-material/Build';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Timeline from '@mui/icons-material/Timeline';
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
  },
  {
    name: 'Firebase Auth',
    description: 'Autenticação e gerenciamento de contas',
    status: 'operational',
  },
  {
    name: 'Firebase Firestore',
    description: 'Banco de dados e sincronização de projetos',
    status: 'operational',
  },
  {
    name: 'Firebase Storage',
    description: 'Armazenamento de áudios, imagens e vídeos',
    status: 'operational',
  },
  {
    name: 'Renderização de Vídeo',
    description: 'Processamento client-side via WebCodecs',
    status: 'operational',
  },
] as const;

const STATUS_CONFIG: Record<ServiceStatus, StatusConfigItem> = {
  operational: { label: 'Operacional', color: 'success', icon: <CheckCircleIcon /> },
  degraded: { label: 'Degradado', color: 'warning', icon: <WarningIcon /> },
  outage: { label: 'Indisponível', color: 'error', icon: <ErrorIcon /> },
  maintenance: { label: 'Manutenção', color: 'info', icon: <BuildIcon /> },
};

const GLOBAL_STATUS = 'Todos os sistemas operacionais';
const LAST_CHECK = `Última atualização: build ${new Date().toISOString().split('T')[0]} (dados informativos)`;

/** Incidentes recentes (dados estáticos, atualizados manualmente) */
interface Incident {
  date: string;
  title: string;
  description: string;
  severity: 'resolved' | 'degraded';
}

const RECENT_INCIDENTS: readonly Incident[] = [
  {
    date: '2026-04-22',
    title: 'Instabilidade na geração de áudio',
    description: 'A API Gemini apresentou latência elevada por aproximadamente 2 horas, afetando a geração de áudio TTS. O serviço foi normalizado automaticamente.',
    severity: 'resolved',
  },
  {
    date: '2026-04-10',
    title: 'Degradation no Firebase Storage',
    description: 'Uploads de imagens apresentaram lentidão por 45 minutos. O impacto foi limitado ao estúdio de imagens.',
    severity: 'resolved',
  },
];

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
            transition: 'box-shadow 0.3s ease',
          }}
        >
          <VerifiedUserIcon sx={{ fontSize: 28, color: SUCCESS_MAIN }} />
        </Box>
        <Typography variant="h5" component="p" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
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
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { transform: 'translateY(-4px)' },
        })}
      >
        {/* Nome */}
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
          {service.name}
        </Typography>

        {/* Descrição */}
        <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.7, flex: 1 }}>
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

/** Seção de histórico de incidentes com timeline estática */
function IncidentHistory() {
  if (RECENT_INCIDENTS.length === 0) return null;

  return (
    <Box sx={{ pb: { xs: 8, md: 12 }, mx: { xs: 2, sm: 3 } }}>
      <Box sx={(theme) => ({ ...glassPanelSx(theme), p: { xs: 3, md: 4 } })}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
          <Timeline sx={{ fontSize: ICON_SIZE_LG, color: TEXT_SECONDARY }} />
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            Últimos 90 dias
          </Typography>
        </Stack>

        <Stack spacing={2}>
          {RECENT_INCIDENTS.map((incident) => (
            <Box
              key={incident.date + incident.title}
              sx={{
                p: 2,
                borderRadius: 2,
                borderLeft: `3px solid ${incident.severity === 'resolved' ? SUCCESS_MAIN : WARNING_MAIN}`,
                backgroundColor: alpha(incident.severity === 'resolved' ? SUCCESS_MAIN : WARNING_MAIN, 0.04),
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontWeight: 500 }}>
                  {incident.date}
                </Typography>
                <Chip
                  label={incident.severity === 'resolved' ? 'Resolvido' : 'Degradado'}
                  color={incident.severity === 'resolved' ? 'success' : 'warning'}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Stack>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>
                {incident.title}
              </Typography>
              <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6 }}>
                {incident.description}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export default function StatusPage() {
  const seo = getPageSeo({
    title: 'Status dos Serviços',
    description: 'Status informativo dos serviços do Script Master. Dados atualizados manualmente.',
    path: '/status',
  });

  return (
    <>
      <Helmet {...seo} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title="Status dos Serviços"
        subtitle="Status informativo dos serviços do Script Master. Dados atualizados manualmente."
        showGlow={false}
      />

      {/* Disclaimer — dados informativos (antes do banner para evitar falsos positivos) */}
      <Box sx={{ pt: { xs: 6, md: 8 }, pb: { xs: 2, md: 3 }, mx: { xs: 2, sm: 3 } }}>
        <Alert severity="info" variant="outlined" role="status">
          Os dados exibidos nesta página são informativos e não representam monitoramento em tempo real. O status real dos serviços depende de terceiros (Google Gemini, Firebase).
        </Alert>
      </Box>

      {/* Banner de status global */}
      <Box sx={{ pb: { xs: 4, md: 6 } }}>
        <GlobalStatusBanner />
      </Box>

      {/* Grid de serviços */}
      <Box sx={{ pb: { xs: 4, md: 6 } }}>
        <Grid container spacing={3}>
          {SERVICES.map((service) => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </Grid>
      </Box>

      {/* Histórico de incidentes */}
      <IncidentHistory />

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
