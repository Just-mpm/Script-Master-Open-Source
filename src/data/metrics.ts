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
    metric0Label: 'Fluxo em 3 etapas',
    metric0Desc: 'Roteiro, geração e exportação no mesmo lugar',
    metric1Label: 'Créditos mensais',
    metric1Desc: 'Para testar narração, imagens, assistente e vídeo',
    metric2Label: 'Bônus por feedback',
    metric2Desc: 'Ajude a melhorar o beta e ganhe mais espaço para criar',
    metric3Label: 'Sem cartão',
    metric3Desc: 'Acesso gratuito enquanto o beta aberto estiver ativo',
  },
  en: {
    metric0Label: '3-step workflow',
    metric0Desc: 'Script, generation, and export in the same place',
    metric1Label: 'Monthly credits',
    metric1Desc: 'To test narration, images, assistant, and video',
    metric2Label: 'Feedback bonus',
    metric2Desc: 'Help improve the beta and get more room to create',
    metric3Label: 'No card',
    metric3Desc: 'Free access while the open beta is active',
  },
  es: {
    metric0Label: 'Flujo en 3 etapas',
    metric0Desc: 'Guion, generación y exportación en el mismo lugar',
    metric1Label: 'Créditos mensuales',
    metric1Desc: 'Para probar narración, imágenes, asistente y video',
    metric2Label: 'Bono por feedback',
    metric2Desc: 'Ayuda a mejorar el beta y gana más espacio para crear',
    metric3Label: 'Sin tarjeta',
    metric3Desc: 'Acceso gratuito mientras el beta abierto esté activo',
  },
} as const;

type MetricsStrings = (typeof metricsStrings)[Locale];

// ── Builder ───────────────────────────────────────────────────────────

/** Monta o array de métricas a partir das strings localizadas */
function buildMetrics(strings: MetricsStrings): MetricItem[] {
  return [
    {
      label: strings.metric0Label,
      value: '3',
      suffix: '',
      description: strings.metric0Desc,
    },
    {
      label: strings.metric1Label,
      value: '500',
      suffix: '',
      description: strings.metric1Desc,
    },
    {
      label: strings.metric2Label,
      value: '+250',
      suffix: '',
      description: strings.metric2Desc,
    },
    {
      label: strings.metric3Label,
      value: '0',
      suffix: '',
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
