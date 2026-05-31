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
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { useLocale } from '../../features/i18n';
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

// ── Dados estáticos ──────────────────────────────────────────────────

/** Incidentes recentes — dados invariantes (datas e severidade) */
interface Incident {
  date: string;
  severity: 'resolved' | 'degraded';
}

const RECENT_INCIDENTS: readonly Incident[] = [
  { date: '2026-04-22', severity: 'resolved' },
  { date: '2026-04-10', severity: 'resolved' },
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
  const { t } = useLocale();

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
          <VerifiedUserIcon aria-hidden="true" sx={{ fontSize: 28, color: SUCCESS_MAIN }} />
        </Box>
        <Typography variant="h5" component="p" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
          {t('status.globalStatus')}
        </Typography>
      </Stack>
    </Box>
  );
}

/** Card individual de um serviço */
function ServiceCard({
  service,
  statusConfig,
}: {
  service: ServiceInfo;
  statusConfig: Record<ServiceStatus, StatusConfigItem>;
}) {
  const { label, color, icon } = statusConfig[service.status];
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

/** Seção de histórico de incidentes com timeline estática */
function IncidentHistory() {
  const { t } = useLocale();

  if (RECENT_INCIDENTS.length === 0) return null;

  return (
    <Box sx={{ pb: { xs: 8, md: 12 }, mx: { xs: 2, sm: 3 } }}>
      <Box sx={(theme) => ({ ...glassPanelSx(theme), p: { xs: 3, md: 4 } })}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
          <Timeline aria-hidden="true" sx={{ fontSize: ICON_SIZE_LG, color: TEXT_SECONDARY }} />
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            {t('status.incidents.title')}
          </Typography>
        </Stack>

        <Stack spacing={2}>
          {RECENT_INCIDENTS.map((incident, index) => (
            <Box
              key={incident.date}
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
                  label={incident.severity === 'resolved' ? t('status.incidents.resolved') : t('status.incidents.degraded')}
                  color={incident.severity === 'resolved' ? 'success' : 'warning'}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Stack>
              <Typography variant="subtitle2" component="p" sx={{ fontWeight: 600, mb: 0.25 }}>
                {t(`status.incidents.items.${index}.title`)}
              </Typography>
              <Typography variant="body2" sx={{ color: TEXT_SECONDARY, lineHeight: 1.6 }}>
                {t(`status.incidents.items.${index}.description`)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

// ── Componente principal ─────────────────────────────────────────────

export default function StatusPage() {
  const { t, locale } = useLocale();

  const seo = getPageSeo({
    title: t('seo.status.title'),
    description: t('seo.status.description'),
    path: '/status',
    jsonLdType: 'webpage',
  });

  // ── Serviços monitorados — dentro do componente para acessar t() ──
  const SERVICES: readonly ServiceInfo[] = [
    {
      name: t('status.services.api.name'),
      description: t('status.services.api.description'),
      status: 'operational',
    },
    {
      name: t('status.services.auth.name'),
      description: t('status.services.auth.description'),
      status: 'operational',
    },
    {
      name: t('status.services.firestore.name'),
      description: t('status.services.firestore.description'),
      status: 'operational',
    },
    {
      name: t('status.services.storage.name'),
      description: t('status.services.storage.description'),
      status: 'operational',
    },
    {
      name: t('status.services.video.name'),
      description: t('status.services.video.description'),
      status: 'operational',
    },
  ];

  // ── Configuração visual por status — dentro do componente para acessar t() ──
  const STATUS_CONFIG: Record<ServiceStatus, StatusConfigItem> = {
    operational: { label: t('status.statusLabels.operational'), color: 'success', icon: <CheckCircleIcon /> },
    degraded: { label: t('status.statusLabels.degraded'), color: 'warning', icon: <WarningIcon /> },
    outage: { label: t('status.statusLabels.outage'), color: 'error', icon: <ErrorIcon /> },
    maintenance: { label: t('status.statusLabels.maintenance'), color: 'info', icon: <BuildIcon /> },
  };

  return (
    <>
      <DocumentHead {...seo} locale={locale} />
      <PageLayout>
      {/* Hero */}
      <HeroSection
        title={t('status.hero.title')}
        subtitle={t('status.hero.subtitle')}
        showGlow={false}
      />

      {/* Disclaimer — dados informativos (antes do banner para evitar falsos positivos) */}
      <Box sx={{ pt: { xs: 6, md: 8 }, pb: { xs: 2, md: 3 }, mx: { xs: 2, sm: 3 } }}>
        <Alert severity="info" variant="outlined" role="status">
          {t('status.disclaimer')}
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
            <ServiceCard key={service.name} service={service} statusConfig={STATUS_CONFIG} />
          ))}
        </Grid>
      </Box>

      {/* Histórico de incidentes */}
      <IncidentHistory />

      {/* Última verificação */}
      <Box sx={{ pb: { xs: 8, md: 12 }, textAlign: 'center' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <AccessTimeIcon aria-hidden="true" sx={{ fontSize: ICON_SIZE_LG, color: TEXT_SECONDARY }} />
          <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
            {t('status.lastCheck', { date: new Date().toISOString().split('T')[0] })}
          </Typography>
        </Stack>
      </Box>
    </PageLayout>
    </>
  );
}
