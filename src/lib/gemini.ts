import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { createLogger } from './logger';
import { removeUndefinedFields } from './callable-utils';
import { getCallableErrorInfo, isCallableCancelledError, isCreditCallableError } from './callable-errors';

import type { Locale } from '../features/i18n/types';

const log = createLogger('gemini');

export interface ScenePrompt {
  timestamp: number; // in seconds
  prompt: string;
}

/** Resultado da geração de prompts de cena, incluindo flag de fallback */
export interface ScenePromptResult {
  readonly prompts: ScenePrompt[];
  /** true quando a API falhou e o resultado é um fallback genérico */
  readonly isFallback: boolean;
}

// ---------------------------------------------------------------------------
// Tipos internos para tipagem das chamadas httpsCallable
// ---------------------------------------------------------------------------

interface ScenePromptsFlowOutput {
  prompts: ScenePrompt[];
  isFallback: boolean;
}

interface ImagesFlowOutput {
  imageBase64: string;
  mimeType: string;
}

// ---------------------------------------------------------------------------
// generateScenePrompts
// ---------------------------------------------------------------------------

export async function generateScenePrompts(
  script: string,
  durationInSeconds: number,
  style: string,
  densitySeconds: number = 15,
  visualFramework: string = 'general',
  locale: Locale = 'pt-BR',
  requestId?: string,
): Promise<ScenePromptResult> {
  try {
    const callable = httpsCallable<{
      script: string;
      durationInSeconds: number;
      style: string;
      densitySeconds: number;
      visualFramework: string;
      locale: string;
      requestId: string;
    }, ScenePromptsFlowOutput>(functions, 'scenePrompts');

    const result = await callable({
      script,
      durationInSeconds,
      style: style || 'Nenhum específico',
      densitySeconds,
      visualFramework,
      locale,
      requestId: requestId ?? crypto.randomUUID(),
    });

    const { prompts, isFallback } = result.data;

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('Resposta de prompts de cena inválida ou vazia');
    }

    return { prompts, isFallback };
  } catch (error) {
    log.error('Erro ao gerar prompts de cena', { error });
    if (isCreditCallableError(error) || isCallableCancelledError(error)) {
      throw error;
    }

    // Fallback genérico como último recurso após falha
    const fallbackPrompts: ScenePrompt[] = [{
      timestamp: 0,
      prompt: `A captivating scene about: ${script.substring(0, 100)}... Style: ${style}`,
    }];
    return { prompts: fallbackPrompts, isFallback: true };
  }
}

// ---------------------------------------------------------------------------
// generateImageFromPrompt
// ---------------------------------------------------------------------------

export async function generateImageFromPrompt(
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '16:9',
  referenceImage?: string,
  requestId?: string,
): Promise<string | null> {
  try {
    const callable = httpsCallable<{
      prompt: string;
      aspectRatio: string;
      referenceImage?: string;
      requestId: string;
    }, ImagesFlowOutput>(functions, 'images');

    const result = await callable(removeUndefinedFields({
      prompt,
      aspectRatio,
      referenceImage,
      requestId: requestId ?? crypto.randomUUID(),
    }));

    const { imageBase64, mimeType } = result.data;

    if (!imageBase64) {
      return null;
    }

    return `data:${mimeType};base64,${imageBase64}`;
  } catch (error) {
    log.error('Erro ao gerar imagem', { error });
    const errorInfo = getCallableErrorInfo(error);
    if (
      isCallableCancelledError(error) ||
      errorInfo.detailCode === 'INSUFFICIENT_CREDITS' ||
      errorInfo.detailCode === 'CREDITS_CHANGED_AFTER_PREFLIGHT'
    ) {
      throw error;
    }
    return null;
  }
}
