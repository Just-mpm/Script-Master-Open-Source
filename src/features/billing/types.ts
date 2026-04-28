// ---------------------------------------------------------------------------
// Tipos de billing — fundação para planos, limites e uso
// ---------------------------------------------------------------------------

/** Identificador de plano */
export type PlanId = 'free' | 'pro' | 'business';

/** Descrição de um plano com limites e funcionalidades */
export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: {
    /** Preço mensal em BRL (0 = gratuito) */
    monthly: number;
    /** Preço anual em BRL */
    yearly: number;
  };
  limits: PlanLimits;
  /** Descrição textual das funcionalidades (para exibição em cards de preço) */
  features: string[];
}

/** Limites numéricos de um plano */
export interface PlanLimits {
  maxScriptChars: number;
  maxAudioGenerationsPerMonth: number;
  maxImageGenerationsPerMonth: number;
  maxVideoExportsPerMonth: number;
  maxProjectCount: number;
  maxStorageMB: number;
  hasMultiSpeaker: boolean;
  hasEmotionalTTS: boolean;
  hasStockMedia: boolean;
  hasPriorityQueue: boolean;
}

/** Recurso rastreável de uso */
export type UsageResource =
  | 'audio_generations'
  | 'image_generations'
  | 'video_exports'
  | 'script_chars'
  | 'storage_mb';

/** Registro individual de uso de um recurso */
export interface UsageRecord {
  resource: UsageResource;
  used: number;
  limit: number;
  /** Timestamp do próximo reset (início do próximo ciclo de faturamento) */
  resetDate: number;
}

/** Estado completo de uso do usuário */
export interface UsageState {
  planId: PlanId;
  records: UsageRecord[];
  updatedAt: number;
}

/** Resultado de uma verificação de entitlement */
export interface EntitlementCheck {
  resource: keyof PlanLimits;
  allowed: boolean;
  currentUsage: number;
  limit: number;
  /** Plano necessário caso não permitido */
  upgradeRequired?: PlanId;
}
