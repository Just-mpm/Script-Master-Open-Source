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
    metric1Label: 'Open source',
    metric1Desc: 'Código aberto, gratuito e com contribuição da comunidade',
    metric2Label: 'BYOK',
    metric2Desc: 'Use sua própria chave Gemini e mantenha controle direto no Google',
    metric3Label: 'Navegador',
    metric3Desc: 'Tudo roda no navegador, sem instalar nada',
  },
  en: {
    metric0Label: '3-step workflow',
    metric0Desc: 'Script, generation, and export in the same place',
    metric1Label: 'Open source',
    metric1Desc: 'Free and open code with community contributions',
    metric2Label: 'BYOK',
    metric2Desc: 'Use your own Gemini key and keep direct control in Google',
    metric3Label: 'Browser',
    metric3Desc: 'Everything runs in the browser, nothing to install',
  },
  es: {
    metric0Label: 'Flujo en 3 etapas',
    metric0Desc: 'Guion, generación y exportación en el mismo lugar',
    metric1Label: 'Open source',
    metric1Desc: 'Código abierto, gratuito y con contribución de la comunidad',
    metric2Label: 'BYOK',
    metric2Desc: 'Usa tu propia clave Gemini y mantén control directo en Google',
    metric3Label: 'Navegador',
    metric3Desc: 'Todo corre en el navegador, sin instalar nada',
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
      value: '∞',
      suffix: '',
      description: strings.metric1Desc,
    },
    {
      label: strings.metric2Label,
      value: '🔑',
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
 * Refletem o modelo open source + BYOK.
 */
export const METRICS: readonly MetricItem[] = getLocalizedMetrics('pt-BR');
