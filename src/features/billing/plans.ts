import type { Plan, PlanId, PlanLimits } from './types';

// ---------------------------------------------------------------------------
// Limites por plano
// ---------------------------------------------------------------------------

/** 0 = ilimitado (convenção do domínio) */
const UNLIMITED = 0;

export const FREE_PLAN_LIMITS: PlanLimits = {
  maxScriptChars: 5_000,
  maxAudioGenerationsPerMonth: 10,
  maxImageGenerationsPerMonth: 10,
  maxVideoExportsPerMonth: 3,
  maxProjectCount: 5,
  maxStorageMB: 500,
  hasMultiSpeaker: false,
  hasEmotionalTTS: false,
  hasStockMedia: false,
  hasPriorityQueue: false,
};

export const PRO_PLAN_LIMITS: PlanLimits = {
  maxScriptChars: 50_000,
  maxAudioGenerationsPerMonth: 100,
  maxImageGenerationsPerMonth: 100,
  maxVideoExportsPerMonth: 30,
  maxProjectCount: 50,
  maxStorageMB: 10_000,
  hasMultiSpeaker: true,
  hasEmotionalTTS: true,
  hasStockMedia: true,
  hasPriorityQueue: true,
};

export const BUSINESS_PLAN_LIMITS: PlanLimits = {
  maxScriptChars: UNLIMITED,
  maxAudioGenerationsPerMonth: UNLIMITED,
  maxImageGenerationsPerMonth: UNLIMITED,
  maxVideoExportsPerMonth: UNLIMITED,
  maxProjectCount: UNLIMITED,
  maxStorageMB: UNLIMITED,
  hasMultiSpeaker: true,
  hasEmotionalTTS: true,
  hasStockMedia: true,
  hasPriorityQueue: true,
};

// ---------------------------------------------------------------------------
// Definição completa dos planos
// ---------------------------------------------------------------------------

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    description: 'Para experimentar e projetos pessoais.',
    price: { monthly: 0, yearly: 0 },
    limits: FREE_PLAN_LIMITS,
    features: [
      'Geração de áudio com TTS',
      'Geração de imagens com IA',
      'Exportação de vídeo (até 720p)',
      'Biblioteca de projetos',
      'Assistente IA',
      '5 projetos no total',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para criadores de conteúdo regulares.',
    price: { monthly: 49_90, yearly: 499_00 },
    limits: PRO_PLAN_LIMITS,
    features: [
      'Tudo do plano Gratuito',
      'Multi-speaker (2 locutores)',
      'Mídia stock ilimitada',
      'Exportação de vídeo até 4K',
      'Fila prioritária de geração',
      '100 gerações/mês por recurso',
      '50 projetos no total',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'Para equipes e produção profissional.',
    price: { monthly: 149_90, yearly: 1_499_00 },
    limits: BUSINESS_PLAN_LIMITS,
    features: [
      'Tudo do plano Pro',
      'Limites ilimitados',
      'Armazenamento ilimitado',
      'Suporte prioritário',
      'Scripts de até 50K caracteres',
    ],
  },
};

/** Mapa de recursos → chave de UsageResource correspondente */
const RESOURCE_TO_USAGE: Partial<Record<keyof PlanLimits, string>> = {
  maxScriptChars: 'script_chars',
  maxAudioGenerationsPerMonth: 'audio_generations',
  maxImageGenerationsPerMonth: 'image_generations',
  maxVideoExportsPerMonth: 'video_exports',
  maxStorageMB: 'storage_mb',
};

/**
 * Retorna a chave de UsageResource correspondente a um limite do plano.
 * Retorna `null` se o limite não for rastreável (booleanos como hasMultiSpeaker).
 */
export function getUsageResourceKey(resource: keyof PlanLimits): string | null {
  return RESOURCE_TO_USAGE[resource] ?? null;
}

/**
 * Retorna o preço formatado em BRL.
 */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
}
