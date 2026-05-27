import type { AudioInput, AudioPreflightOutput } from '../genkit/schemas/common.js';
import { calculateCreditCost } from './credit-policy.js';

export interface CreditSnapshot {
  availableCredits: number;
  unlimitedCredits: boolean;
}

interface AudioPreflightStep {
  type: 'audio' | 'chunking' | 'scene_prompts' | 'image';
  label: string;
  plannedCount: number;
  credits: number;
  details: string[];
}

const CHUNK_LIMIT = 500;

const PACE_CHARS_PER_SECOND: Record<string, number> = {
  slow: 11,
  normal: 14,
  fast: 17,
};

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .length;
}

function estimateDurationSeconds(input: AudioInput): number {
  const baseCharsPerSecond = PACE_CHARS_PER_SECOND[input.voiceConfig.pace ?? 'normal'] ?? 14;
  const multiSpeakerFactor = input.isMultiSpeaker ? 1.08 : 1;
  const wordCount = countWords(input.script);
  const punctuationBoost = Math.ceil((input.script.match(/[,.!?;:]/g) ?? []).length / 6);
  const charsDuration = input.script.length / baseCharsPerSecond;
  const wordsDuration = wordCount / (input.voiceConfig.pace === 'fast' ? 2.9 : input.voiceConfig.pace === 'slow' ? 2.1 : 2.5);
  const conservativeSeconds = Math.max(charsDuration, wordsDuration) * multiSpeakerFactor;

  return Math.max(8, Math.ceil(conservativeSeconds + punctuationBoost));
}

function estimateChunkCount(script: string): number {
  return Math.max(1, Math.ceil(script.length / CHUNK_LIMIT));
}

function estimateSceneCount(durationSeconds: number, densitySeconds?: number): number {
  const density = densitySeconds && densitySeconds > 0 ? densitySeconds : 15;
  return Math.max(1, Math.ceil(durationSeconds / density));
}

function buildSteps(input: AudioInput, durationSeconds: number): AudioPreflightStep[] {
  const steps: AudioPreflightStep[] = [];
  const chunkCount = estimateChunkCount(input.script);

  const audioCredits = calculateCreditCost({
    operationType: 'audio',
    inputChars: input.script.length,
  });

  steps.push({
    type: 'audio',
    label: 'Síntese do áudio',
    plannedCount: chunkCount,
    credits: audioCredits,
    details: [
      `${chunkCount} parte(s) previstas para o roteiro atual.`,
      `Voz principal: ${input.voiceConfig.voiceId}.`,
    ],
  });

  if (chunkCount > 1) {
    steps.push({
      type: 'chunking',
      label: 'Divisão inteligente do roteiro',
      plannedCount: chunkCount,
      credits: 0,
      details: [
        'Pré-processamento para manter consistência do TTS.',
        `Limite alvo: ${CHUNK_LIMIT} caracteres por parte.`,
        'Esta etapa já está incluída no processamento do áudio, sem custo adicional.',
      ],
    });
  }

  if (input.generateScenes) {
    const sceneCount = estimateSceneCount(durationSeconds, input.sceneDensity ?? undefined);
    const scenePromptCredits = calculateCreditCost({
      operationType: 'scene_prompts',
      itemCount: sceneCount,
    });
    const imageCreditsPerScene = calculateCreditCost({
      operationType: 'image',
      hasReferenceImage: false,
    });
    const referenceExtraPerScene = input.referenceImage
      ? calculateCreditCost({
          operationType: 'image',
          hasReferenceImage: true,
        }) - imageCreditsPerScene
      : 0;
    const imageCredits = sceneCount * (imageCreditsPerScene + referenceExtraPerScene);

    steps.push({
      type: 'scene_prompts',
      label: 'Roteiro visual das cenas',
      plannedCount: sceneCount,
      credits: scenePromptCredits,
      details: [
        `Estimativa baseada em ${durationSeconds}s e densidade de ${input.sceneDensity ?? 15}s.`,
        `Framework visual: ${input.visualFramework ?? 'general'}.`,
      ],
    });

    steps.push({
      type: 'image',
      label: 'Geração das imagens das cenas',
      plannedCount: sceneCount,
      credits: imageCredits,
      details: [
        `${sceneCount} imagem(ns) previstas.`,
        input.referenceImage
          ? 'Inclui custo extra de referência visual em cada imagem.'
          : 'Sem custo extra de referência visual.',
      ],
    });
  }

  return steps;
}

export function buildAudioPreflightPlan(
  input: AudioInput,
  creditSnapshot: CreditSnapshot,
): AudioPreflightOutput {
  const estimatedDurationSeconds = estimateDurationSeconds(input);
  const estimatedChunkCount = estimateChunkCount(input.script);
  const estimatedSceneCount = input.generateScenes
    ? estimateSceneCount(estimatedDurationSeconds, input.sceneDensity ?? undefined)
    : 0;
  const steps = buildSteps(input, estimatedDurationSeconds);
  const totalPlanned = steps.reduce((sum, step) => sum + step.credits, 0);
  const available = creditSnapshot.availableCredits;
  const remainingAfter = creditSnapshot.unlimitedCredits
    ? creditSnapshot.availableCredits
    : Math.max(0, available - totalPlanned);
  const canProceed = creditSnapshot.unlimitedCredits || available >= totalPlanned;

  const notes = [
    'Esta prévia é gratuita e não reserva créditos.',
    input.generateScenes
      ? 'A parte visual usa estimativa conservadora para reduzir surpresas no saldo, mas continua sujeita ao saldo disponível em cada etapa.'
      : 'Sem pipeline visual: o custo final deve ficar muito próximo desta prévia.',
  ];

  return {
    summary: input.generateScenes
      ? 'Áudio confirmado como etapa principal, com pacote visual estimado para confirmação.'
      : 'Áudio pronto para confirmação.',
    estimatedDurationSeconds,
    estimatedChunkCount,
    estimatedSceneCount,
    confidence: input.generateScenes ? 'medium' : 'high',
    steps,
    credits: {
      available,
      totalPlanned,
      remainingAfter,
      unlimited: creditSnapshot.unlimitedCredits,
    },
    canProceed,
    blockingReasonCode: canProceed ? undefined : 'INSUFFICIENT_CREDITS',
    blockingMessage: canProceed
      ? undefined
      : 'Seu saldo atual não cobre todas as etapas previstas desta geração.',
    notes,
  };
}
