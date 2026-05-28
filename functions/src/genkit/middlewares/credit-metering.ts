// ---------------------------------------------------------------------------
// Middleware Genkit de metering de créditos
// ---------------------------------------------------------------------------
//
// Centraliza a lógica de créditos (estimar → reservar → confirmar/reverter)
// que antes era duplicada em cada um dos 6 flows de IA (~30 linhas cada).
//
// Usa a API ai.generateMiddleware() do Genkit para interceptar chamadas ao
// modelo na fase `model`, gerenciando o ciclo de vida dos créditos de forma
// transparente para o flow.
//
// Uso:
//   import { creditMeteringMiddleware } from '../genkit/middlewares/credit-metering.js';
//
//   // Em ai.generate():
//   const response = await ai.generate({
//     model: '...',
//     prompt: '...',
//     use: [creditMeteringMiddleware({ operationType: 'image' })],
//   });
//
//   // Em ai.generateStream():
//   const { stream } = ai.generateStream({
//     model: '...',
//     system: '...',
//     messages: [...],
//     use: [creditMeteringMiddleware({ operationType: 'assistant' })],
//   });
//
// Para flows que precisam de lógica adicional (ex: streaming com desconexão
// parcial), use a função helper withCreditMetering() como wrapper manual.
// ---------------------------------------------------------------------------

import { generateMiddleware, z } from 'genkit';
import type { GenerateRequest, GenerateResponseData } from 'genkit/model';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  estimateCredits,
  reserveCredits,
  confirmCredits,
  revertCredits,
  calculateCreditCost,
  type OperationType,
} from '../../usage/index.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('credit-metering');

function createReserveError(error?: string): HttpsError {
  if (error === 'Saldo insuficiente') {
    return new HttpsError(
      'failed-precondition',
      'Créditos insuficientes para concluir esta operação.',
      { code: 'INSUFFICIENT_CREDITS' },
    );
  }

  if (error === 'Requisição duplicada') {
    return new HttpsError(
      'already-exists',
      'Esta requisição já foi processada.',
      { code: 'DUPLICATE_REQUEST' },
    );
  }

  return new HttpsError(
    'internal',
    'Não foi possível reservar créditos para esta operação.',
    { code: 'CREDIT_RESERVATION_FAILED', reason: error ?? 'UNKNOWN' },
  );
}

function createConfirmError(error?: string): HttpsError {
  return new HttpsError(
    'internal',
    'Não foi possível confirmar os créditos desta operação.',
    { code: 'CREDIT_CONFIRMATION_FAILED', reason: error ?? 'UNKNOWN' },
  );
}

// ---------------------------------------------------------------------------
// Config Schema
// ---------------------------------------------------------------------------

const CreditMeteringConfigSchema = z.object({
  /** Tipo da operação para o sistema de créditos */
  operationType: z.enum([
    'assistant',
    'inline_assistant',
    'audio',
    'image',
    'scene_prompts',
    'chunking',
    'feedback',
  ]),
  /** Nome do modelo (opcional — será extraído da resposta se omitido) */
  model: z.string().optional(),
  /** Se a imagem tem referência — afeta o custo (40 → 50 créditos).
   *  Apenas relevante para operationType === 'image'. */
  hasReferenceImage: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extrai o texto total das mensagens de um GenerateRequest para estimativa.
 * Soma o texto de todas as partes de todas as mensagens.
 */
function extractInputText(req: GenerateRequest): string {
  let total = '';
  for (const msg of req.messages ?? []) {
    for (const part of msg.content) {
      if ('text' in part && typeof part.text === 'string') {
        total += part.text;
      }
    }
  }
  return total;
}

/**
 * Extrai o texto de saída de uma GenerateResponseData.
 */
function extractOutputText(response: GenerateResponseData): string {
  let total = '';
  const content = response.message?.content;
  if (content) {
    for (const part of content) {
      if ('text' in part && typeof part.text === 'string') {
        total += part.text;
      }
    }
  }
  return total;
}

/**
 * Converte tokens para caracteres (aproximação: ~4 chars por token).
 * Usado como fallback quando a resposta não tem texto extraível.
 */
function tokensToChars(tokens: number): number {
  return Math.ceil(tokens * 4);
}

// ---------------------------------------------------------------------------
// Chave de contexto para evitar dupla contagem
// ---------------------------------------------------------------------------

/** Chave usada no ActionContext para marcar que o middleware já está ativo */
const METERING_ACTIVE_KEY = '__credit_metering_active';

// ---------------------------------------------------------------------------
// Middleware Definition
// ---------------------------------------------------------------------------

/**
 * Middleware Genkit que gerencia o ciclo de vida dos créditos.
 *
 * Fluxo:
 * 1. Extrai uid do contexto de autenticação (ai.currentContext)
 * 2. Estima créditos baseado no texto de entrada
 * 3. Reserva créditos via reserveCredits()
 * 4. Executa a chamada ao modelo (next)
 * 5. Confirma créditos com o custo real (calculateCreditCost)
 * 6. Em caso de erro, reverte créditos via revertCredits()
 *
 * Para evitar dupla contagem em chamadas aninhadas (ex: chunking dentro
 * de audio), o middleware verifica a flag __credit_metering_active no
 * contexto e se abstém quando já existe um middleware ativo na pilha.
 */
export const creditMeteringMiddleware = generateMiddleware(
  {
    name: 'credit-metering',
    configSchema: CreditMeteringConfigSchema,
    description:
      'Gerencia reserva, confirmação e reversão de créditos para chamadas ao modelo de IA',
  },
  ({ config }) => ({
    model: async (
      req: GenerateRequest,
      ctx,
      next,
    ): Promise<GenerateResponseData> => {
      // Evita dupla contagem: se já existe um middleware de créditos ativo
      // na pilha de chamadas (ex: chunking chamado dentro de audio),
      // passa adiante sem processar créditos novamente
      if (ctx.context?.[METERING_ACTIVE_KEY]) {
        return next(req, ctx);
      }

      const uid = ctx.context?.auth?.uid as string | undefined;
      if (!uid) {
        // Sem uid = chamada sem autenticação (ex: invoke manual ou dev UI).
        // Passa adiante sem gerenciar créditos.
        return next(req, ctx);
      }

      const operationType = config?.operationType as OperationType;
      if (!operationType) {
        // Sem operationType configurado — passa adiante
        return next(req, ctx);
      }

      // Feedback não consome créditos
      if (operationType === 'feedback') {
        return next(req, ctx);
      }

      // Marca o contexto para evitar reentrada em chamadas aninhadas
      const enrichedCtx = {
        ...ctx,
        context: {
          ...ctx.context,
          [METERING_ACTIVE_KEY]: true,
        },
      };

      const db = getFirestore();
      const requestId = randomUUID();
      const inputText = extractInputText(req);

      // ------------------------------------------------------------------
      // 1. Estima créditos
      // ------------------------------------------------------------------
      const estimateInput: Record<string, unknown> = {
        script: inputText,
        message: inputText,
        prompt: inputText,
        text: inputText,
      };
      // Propaga hasReferenceImage para que estimateCredits aplique
      // a sobretaxa de 10 créditos na estimativa (imagem com referência).
      if (config?.hasReferenceImage && operationType === 'image') {
        estimateInput.referenceImage = 'true';
      }
      const estimated = estimateCredits(operationType, estimateInput);

      // ------------------------------------------------------------------
      // 2. Reserva créditos
      // ------------------------------------------------------------------
      const reserveResult = await reserveCredits(
        db,
        uid,
        requestId,
        operationType,
        estimated,
      );

      if (!reserveResult.success) {
        throw createReserveError(reserveResult.error);
      }

      // ------------------------------------------------------------------
      // 3. Executa a chamada ao modelo
      // ------------------------------------------------------------------
      try {
        const response = await next(req, enrichedCtx);

        // ------------------------------------------------------------------
        // 4. Confirma créditos com o custo real
        // ------------------------------------------------------------------
        const outputText = extractOutputText(response);
        const outputChars =
          outputText.length > 0
            ? outputText.length
            : tokensToChars(response.usage?.outputTokens ?? 0);
        const inputChars =
          inputText.length > 0
            ? inputText.length
            : tokensToChars(response.usage?.inputTokens ?? 0);

        const finalCredits = calculateCreditCost({
          operationType,
          inputChars,
          outputChars,
          hasReferenceImage: config?.hasReferenceImage,
        });

        const model =
          config?.model ??
          (response.request?.config as Record<string, unknown>)?.model as
            | string
            | undefined;

        const confirmResult = await confirmCredits(
          db,
          uid,
          requestId,
          finalCredits,
          outputChars,
          model,
        );

        if (!confirmResult.success) {
          throw createConfirmError(confirmResult.error);
        }

        return response;
      } catch (error) {
        // ------------------------------------------------------------------
        // 5. Reverte créditos em caso de erro
        // ------------------------------------------------------------------
        const errorCode =
          error instanceof Error
            ? error.message.slice(0, 200)
            : 'erro_desconhecido';

        await revertCredits(db, uid, requestId, errorCode).catch(() => {
          // Reversão é best-effort
        });

        log.error('Erro na geração — créditos revertidos', {
          uid, requestId, error: errorCode,
        });

        throw error;
      }
    },
  }),
);

// ---------------------------------------------------------------------------
// Helper manual para flows com lógica adicional
// ---------------------------------------------------------------------------

/**
 * Wrapper manual para flows que precisam de controle granular sobre
 * o ciclo de créditos (ex: streaming com confirmação parcial em caso
 * de desconexão do cliente).
 *
 * Uso:
 * ```ts
 * const meter = await withCreditMetering(db, uid, requestId, 'assistant', {
 *   message: input.message,
 *   history: historyText,
 * });
 * // ... executa o modelo ...
 * await meter.confirm({ outputChars, model });
 * ```
 */
export interface CreditMeteringContext {
  requestId: string;
  estimated: number;
  confirm: (params: {
    finalCredits: number;
    outputSize?: number;
    model?: string;
  }) => Promise<void>;
  revert: (errorCode?: string) => Promise<void>;
}

export async function withCreditMetering(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  requestId: string,
  operationType: OperationType,
  estimationInput: Record<string, unknown>,
): Promise<CreditMeteringContext> {
  // Estima créditos
  const estimated = estimateCredits(operationType, estimationInput);

  // Reserva créditos
  const reserveResult = await reserveCredits(
    db,
    uid,
    requestId,
    operationType,
    estimated,
  );

  if (!reserveResult.success) {
    throw createReserveError(reserveResult.error);
  }

  return {
    requestId,
    estimated,
    confirm: async ({ finalCredits, outputSize, model }) => {
      const confirmResult = await confirmCredits(
        db,
        uid,
        requestId,
        finalCredits,
        outputSize,
        model,
      );

      if (!confirmResult.success) {
        throw createConfirmError(confirmResult.error);
      }
    },
    revert: async (errorCode) => {
      await revertCredits(db, uid, requestId, errorCode).catch(() => {});
    },
  };
}
