// ---------------------------------------------------------------------------
// Configuração de modelo compartilhada
// ---------------------------------------------------------------------------
//
// Centraliza a lógica de resolução de modelo + thinking config
// usada por assistant.ts e inline-assistant.ts.
//
// Uso:
//   import { resolveModelConfig } from '../genkit/utils/model-config.js';
//   const { model, thinkingConfig } = resolveModelConfig('specialist', 'high');
// ---------------------------------------------------------------------------

export const MODEL_FAST = 'googleai/gemini-3.1-flash-lite';
export const MODEL_SPECIALIST = 'googleai/gemini-3.5-flash';

const VALID_THINKING_LEVELS = ['minimal', 'low', 'medium', 'high'] as const;

export type ThinkingLevel = (typeof VALID_THINKING_LEVELS)[number];

export interface ModelConfig {
  model: string;
  thinkingConfig?: Record<string, unknown>;
}

/**
 * Determina a configuração do modelo com base na escolha do usuário.
 *
 * @param model - 'fast' ou 'specialist'. Default: 'fast'
 * @param thinkingLevel - Nível de pensamento. Omitido = sem thinkingConfig
 * @returns Config pronta para passar em ai.generate / ai.generateStream
 */
export function resolveModelConfig(
  model?: 'fast' | 'specialist',
  thinkingLevel?: string,
): ModelConfig {
  const resolvedModel = model === 'specialist' ? MODEL_SPECIALIST : MODEL_FAST;

  if (thinkingLevel && VALID_THINKING_LEVELS.includes(thinkingLevel as ThinkingLevel)) {
    return {
      model: resolvedModel,
      thinkingConfig: { thinkingLevel },
    };
  }

  return { model: resolvedModel };
}
