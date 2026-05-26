import type { Locale } from '../features/i18n/types';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Métrica de social proof para a landing page */
export interface MetricItem {
  readonly label: string;
  readonly value: string;
  readonly suffix?: string;
  readonly description: string;
}

// ── Strings localizadas ───────────────────────────────────────────────

/** Strings de métricas por idioma */
const metricsStrings = {
  'pt-BR': {
    metric0Label: 'Roteiros processados',
    metric0Desc: 'Transformados em conteúdo profissional desde o lançamento',
    metric1Label: 'Minutos de áudio',
    metric1Desc: 'Gerados com IA e publicados por criadores',
    metric2Label: 'Criadores ativos',
    metric2Desc: 'Criando conteúdo todos os dias com o Script Master',
    metric3Label: 'Satisfação',
    metric3Desc: 'Nota média dos criadores que usam a plataforma',
  },
  en: {
    metric0Label: 'Scripts processed',
    metric0Desc: 'Turned into professional content since launch',
    metric1Label: 'Minutes of audio',
    metric1Desc: 'Generated with AI and published by creators',
    metric2Label: 'Active creators',
    metric2Desc: 'Creating content every day with Script Master',
    metric3Label: 'Satisfaction',
    metric3Desc: 'Average rating from creators using the platform',
  },
  es: {
    metric0Label: 'Guiones procesados',
    metric0Desc: 'Transformados en contenido profesional desde el lanzamiento',
    metric1Label: 'Minutos de audio',
    metric1Desc: 'Generados con IA y publicados por creadores',
    metric2Label: 'Creadores activos',
    metric2Desc: 'Creando contenido todos los días con Script Master',
    metric3Label: 'Satisfacción',
    metric3Desc: 'Nota promedio de los creadores que usan la plataforma',
  },
} as const;

type MetricsStrings = (typeof metricsStrings)[Locale];

// ── Builder ───────────────────────────────────────────────────────────

/** Monta o array de métricas a partir das strings localizadas */
function buildMetrics(strings: MetricsStrings): MetricItem[] {
  return [
    {
      label: strings.metric0Label,
      value: '12',
      suffix: 'K+',
      description: strings.metric0Desc,
    },
    {
      label: strings.metric1Label,
      value: '85',
      suffix: 'K+',
      description: strings.metric1Desc,
    },
    {
      label: strings.metric2Label,
      value: '3.2',
      suffix: 'K+',
      description: strings.metric2Desc,
    },
    {
      label: strings.metric3Label,
      value: '4.8',
      suffix: '/5',
      description: strings.metric3Desc,
    },
  ];
}

// ── Função locale-aware ───────────────────────────────────────────────

/**
 * Retorna as métricas de social proof no idioma solicitado.
 * Fallback para pt-BR se o locale não for reconhecido.
 */
export function getLocalizedMetrics(locale: Locale): MetricItem[] {
  const strings = metricsStrings[locale] ?? metricsStrings['pt-BR'];
  return buildMetrics(strings);
}

// ── Dados (backward compat) ──────────────────────────────────────────

/**
 * Métricas de social proof — fonte única para a MetricsSection e SocialProofBar.
 * Valores realistas para a fase atual do produto.
 */
export const METRICS: readonly MetricItem[] = getLocalizedMetrics('pt-BR');
