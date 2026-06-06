// ---------------------------------------------------------------------------
// Flow de preflight de áudio — validação técnica antes da geração (BYOK)
// ---------------------------------------------------------------------------
//
// Retorna estimativas técnicas (duração, chunks, cenas) sem chamar modelos.
// A validação de API key é feita pelo flow de áudio principal (BYOK).
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
// ---------------------------------------------------------------------------

import { onCallGenkit, isSignedIn } from 'firebase-functions/v2/https';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import {
  AudioPreflightInputSchema,
  type AudioPreflightOutput,
} from '../genkit/schemas/common.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import {
  isRequestIdValid,
} from '../usage/index.js';
import { CHUNK_LIMIT } from '../genkit/constants.js';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PACE_CHARS_PER_SECOND: Record<string, number> = {
  slow: 11,
  normal: 14,
  fast: 17,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .length;
}

function estimateDurationSeconds(
  script: string,
  pace: string | null | undefined,
  isMultiSpeaker: boolean | null | undefined,
): number {
  const baseCharsPerSecond = PACE_CHARS_PER_SECOND[pace ?? 'normal'] ?? 14;
  const multiSpeakerFactor = isMultiSpeaker ? 1.08 : 1;
  const wordCount = countWords(script);
  const punctuationBoost = Math.ceil((script.match(/[,.!?;:]/g) ?? []).length / 6);
  const charsDuration = script.length / baseCharsPerSecond;
  const wordsDuration = wordCount / (pace === 'fast' ? 2.9 : pace === 'slow' ? 2.1 : 2.5);
  const conservativeSeconds = Math.max(charsDuration, wordsDuration) * multiSpeakerFactor;

  return Math.max(8, Math.ceil(conservativeSeconds + punctuationBoost));
}

function estimateChunkCount(script: string): number {
  return Math.max(1, Math.ceil(script.length / CHUNK_LIMIT));
}

function estimateSceneCount(durationSeconds: number, densitySeconds?: number | null): number {
  const density = densitySeconds && densitySeconds > 0 ? densitySeconds : 15;
  return Math.max(1, Math.ceil(durationSeconds / density));
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export const audioPreflight = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'audioPreflight',
      inputSchema: AudioPreflightInputSchema,
      outputSchema: undefined, // Retorna JSON genérico
    },
    async (input, flowContext): Promise<AudioPreflightOutput> => {
      // Valida autenticação (apenas confirma que está logado)
      getCallableUidOrThrow(flowContext);

      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new Error('requestId inválido — deve ser UUID v4');
      }

      const estimatedDurationSeconds = estimateDurationSeconds(
        input.script,
        input.voiceConfig?.pace,
        input.isMultiSpeaker,
      );
      const estimatedChunkCount = estimateChunkCount(input.script);
      const estimatedSceneCount = input.generateScenes
        ? estimateSceneCount(estimatedDurationSeconds, input.sceneDensity)
        : 0;

      // Passos técnicos exibidos ao usuário antes de iniciar a geração.
      const steps: Array<{
        type: 'audio' | 'chunking' | 'scene_prompts' | 'image';
        label: string;
        plannedCount: number;
        details: string[];
      }> = [
        {
          type: 'audio',
          label: 'Síntese do áudio',
          plannedCount: estimatedChunkCount,
          details: [
            `${estimatedChunkCount} parte(s) previstas para o roteiro atual.`,
            `Voz principal: ${input.voiceConfig?.voiceId ?? 'padrão'}.`,
          ],
        },
      ];

      if (estimatedChunkCount > 1) {
        steps.push({
          type: 'chunking',
          label: 'Divisão inteligente do roteiro',
          plannedCount: estimatedChunkCount,
          details: [
            'Pré-processamento para manter consistência do TTS.',
            `Limite alvo: ${CHUNK_LIMIT} caracteres por parte.`,
            'Esta etapa já está incluída no processamento do áudio.',
          ],
        });
      }

      if (input.generateScenes) {
        steps.push({
          type: 'scene_prompts',
          label: 'Roteiro visual das cenas',
          plannedCount: estimatedSceneCount,
          details: [
            `Estimativa baseada em ${estimatedDurationSeconds}s e densidade de ${input.sceneDensity ?? 15}s.`,
            `Framework visual: ${input.visualFramework ?? 'general'}.`,
          ],
        });

        steps.push({
          type: 'image',
          label: 'Geração das imagens das cenas',
          plannedCount: estimatedSceneCount,
          details: [
            `${estimatedSceneCount} imagem(ns) previstas.`,
          ],
        });
      }

      return {
        summary: input.generateScenes
          ? 'Áudio com pipeline visual estimado.'
          : 'Áudio pronto para geração.',
        estimatedDurationSeconds,
        estimatedChunkCount,
        estimatedSceneCount,
        confidence: input.generateScenes ? 'medium' : 'high',
        steps,
        canProceed: true,
        notes: [
          'Esta prévia não chama o modelo nem inicia geração.',
          'O custo é cobrado diretamente pela sua API key do Gemini.',
        ],
      };
    },
  ),
);
