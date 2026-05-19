// ---------------------------------------------------------------------------
// Serviço transacional de créditos — operações atômicas no Firestore
// ---------------------------------------------------------------------------
//
// Gerencia o ciclo de vida dos créditos: acesso beta, reserva, confirmação,
// reversão e concessão de bônus. Todas as operações que modificam saldo
// usam transações Firestore para garantir atomicidade e consistência.
// ---------------------------------------------------------------------------

import type { Firestore } from 'firebase-admin/firestore';
import { getCurrentPeriodKey, isNewPeriod } from './period.js';
import {
  MONTHLY_BASE_CREDITS,
  FEEDBACK_BONUS_CREDITS,
  type OperationType,
} from './credit-policy.js';
import {
  type CreditEvent,
} from './credit-events.js';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

/** Dados do documento beta_access/current */
export interface BetaAccess {
  status: 'active';
  currentPeriodKey: string;
  baseCredits: number;
  bonusCredits: number;
  availableCredits: number;
  usedCredits: number;
  reservedCredits: number;
  updatedAt: number;
  feedbackBonusGranted: boolean;
}

/** Dados do documento credit_months/{YYYY-MM} */
export interface CreditMonth {
  periodKey: string;
  baseCredits: number;
  bonusCredits: number;
  reservedCredits: number;
  usedCredits: number;
  availableCredits: number;
  updatedAt: number;
  usage: {
    chatCredits: number;
    imageCredits: number;
    audioCredits: number;
    sceneCredits: number;
    inlineCredits: number;
  };
}

/** Resultado da operação de reserva */
export interface ReserveResult {
  success: boolean;
  error?: string;
  eventId?: string;
}

/** Resultado da operação de confirmação */
export interface ConfirmResult {
  success: boolean;
  availableCredits: number;
  error?: string;
}

/** Resultado da concessão de bônus */
export interface BonusResult {
  success: boolean;
  bonusGranted: boolean;
}

// ---------------------------------------------------------------------------
// Valores padrão para inicialização
// ---------------------------------------------------------------------------

/** Cria os dados iniciais de BetaAccess para um novo usuário */
function createInitialBetaAccess(periodKey: string): BetaAccess {
  return {
    status: 'active',
    currentPeriodKey: periodKey,
    baseCredits: MONTHLY_BASE_CREDITS,
    bonusCredits: 0,
    availableCredits: MONTHLY_BASE_CREDITS,
    usedCredits: 0,
    reservedCredits: 0,
    updatedAt: Date.now(),
    feedbackBonusGranted: false,
  };
}

/** Cria os dados iniciais de CreditMonth para um período */
function createInitialCreditMonth(periodKey: string, baseCredits: number, bonusCredits: number): CreditMonth {
  return {
    periodKey,
    baseCredits,
    bonusCredits,
    reservedCredits: 0,
    usedCredits: 0,
    availableCredits: baseCredits + bonusCredits,
    updatedAt: Date.now(),
    usage: {
      chatCredits: 0,
      imageCredits: 0,
      audioCredits: 0,
      sceneCredits: 0,
      inlineCredits: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Constantes de timeout
// ---------------------------------------------------------------------------

/** Tempo máximo que uma reserva pode ficar sem confirmação antes de expirar (5 min) */
const RESERVATION_TIMEOUT_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers de reconciliação de créditos zombie
// ---------------------------------------------------------------------------

/**
 * Expira reservas de crédito que ultrapassaram o timeout.
 * Chamado antes de cada nova reserva para evitar acúmulo de créditos
 * em estado 'reserved' quando a função crasha após gerar o conteúdo
 * mas antes de confirmar/reverter (ex: crash do audio.ts pós-TTS).
 *
 * Cada evento stale é limpo em uma transação individual para garantir
 * atomicidade e evitar race conditions com o flow original.
 *
 * @param db - Instância do Firestore
 * @param uid - ID do usuário
 * @returns Quantidade de reservas expiradas
 */
async function expireStaleReservations(
  db: Firestore,
  uid: string,
): Promise<number> {
  const cutoff = Date.now() - RESERVATION_TIMEOUT_MS;

  const staleSnap = await db
    .collection(`users/${uid}/credit_events`)
    .where('status', '==', 'reserved')
    .where('createdAt', '<', cutoff)
    .limit(10)
    .get();

  if (staleSnap.empty) return 0;

  let releasedCount = 0;
  const betaRef = db.doc(`users/${uid}/beta_access/current`);

  for (const doc of staleSnap.docs) {
    const staleEvent = doc.data() as CreditEvent;

    await db.runTransaction(async (transaction) => {
      const betaSnap = await transaction.get(betaRef);
      if (!betaSnap.exists) return;

      const beta = betaSnap.data() as BetaAccess;

      // Só libera o que ainda está reservado (evita saldo negativo)
      const releaseAmount = Math.min(staleEvent.estimatedCredits, beta.reservedCredits);
      if (releaseAmount <= 0) return;

      transaction.set(betaRef, {
        availableCredits: beta.availableCredits + releaseAmount,
        reservedCredits: beta.reservedCredits - releaseAmount,
        updatedAt: Date.now(),
      }, { merge: true });

      transaction.set(doc.ref, {
        status: 'expired' as const,
        finishedAt: Date.now(),
        errorCode: 'RESERVATION_TIMEOUT',
      }, { merge: true });
    });

    releasedCount++;
  }

  if (releasedCount > 0) {
    console.log(
      `[credit-service] ${releasedCount} reserva(s) stale expirada(s): uid=${uid}`,
    );
  }

  return releasedCount;
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Obtém ou cria o documento beta_access/current do usuário.
 * Se o documento já existe mas o mês virou, faz rollover automático:
 * reseta usedCredits e baseCredits, mantém bonusCredits acumulado.
 *
 * @param db - Instância do Firestore
 * @param uid - ID do usuário
 * @returns Dados atualizados do BetaAccess
 */
export async function getOrCreateBetaAccess(
  db: Firestore,
  uid: string,
): Promise<BetaAccess> {
  const betaRef = db.doc(`users/${uid}/beta_access/current`);
  const snap = await betaRef.get();

  const currentPeriod = getCurrentPeriodKey();

  if (!snap.exists) {
    // Usuário novo — cria documento inicial
    const initial = createInitialBetaAccess(currentPeriod);
    await betaRef.set(initial);
    console.log(`[credit-service] BetaAccess criado para uid=${uid} periodo=${currentPeriod}`);
    return initial;
  }

  const data = snap.data() as BetaAccess;

  // Verifica se o mês virou — rollover atômico
  if (isNewPeriod(data.currentPeriodKey)) {
    console.log(
      `[credit-service] Rollover detectado para uid=${uid}: ` +
      `${data.currentPeriodKey} → ${currentPeriod}`,
    );

    // Envolve o rollover em uma transação para garantir atomicidade.
    // Evita que duas requisições concorrentes na virada do mês criem
    // rollovers duplicados ou inconsistentes.
    const rolledOver = await db.runTransaction(async (transaction) => {
      // Releitura dentro da transação para garantir consistência
      const snap = await transaction.get(betaRef);
      const current = snap.data() as BetaAccess;

      // Se outro request já fez o rollover, retorna os dados atualizados
      if (!isNewPeriod(current.currentPeriodKey)) {
        return current;
      }

      const fresh: BetaAccess = {
        status: 'active',
        currentPeriodKey: currentPeriod,
        baseCredits: MONTHLY_BASE_CREDITS,
        bonusCredits: current.bonusCredits, // mantém bônus acumulado
        availableCredits: MONTHLY_BASE_CREDITS + current.bonusCredits,
        usedCredits: 0, // reseta consumo
        reservedCredits: 0, // reseta reservas
        updatedAt: Date.now(),
        feedbackBonusGranted: current.feedbackBonusGranted,
      };

      transaction.set(betaRef, fresh);
      return fresh;
    });

    return rolledOver;
  }

  return data;
}

/**
 * Reserva créditos para uma operação antes da execução.
 *
 * Fluxo atômico (transação Firestore):
 * 1. Verifica idempotência (requestId)
 * 2. Lê beta_access/current
 * 3. Se availableCredits < estimatedCredits → falha
 * 4. Subtrai estimatedCredits de availableCredits, adiciona em reservedCredits
 * 5. Cria credit_event com status 'reserved'
 * 6. Atualiza credit_months/{periodKey}
 *
 * @returns Resultado com success/error/eventId
 */
export async function reserveCredits(
  db: Firestore,
  uid: string,
  requestId: string,
  operationType: OperationType,
  estimatedCredits: number,
): Promise<ReserveResult> {
  // Feedback não consome créditos — não precisa reservar
  if (operationType === 'feedback') {
    return { success: true };
  }

  // Expira reservas stale (>5 min) antes da nova reserva.
  // Evita acúmulo de créditos zombie quando a função crasha após
  // gerar o conteúdo mas antes de confirmar/reverter os créditos.
  await expireStaleReservations(db, uid);

  const currentPeriod = getCurrentPeriodKey();
  const betaRef = db.doc(`users/${uid}/beta_access/current`);
  const monthRef = db.doc(`users/${uid}/credit_months/${currentPeriod}`);

  // O eventId é o próprio requestId — isso torna a verificação de
  // idempotência atômica: basta ler o documento dentro da transação.
  const eventRef = db.doc(`users/${uid}/credit_events/${requestId}`);

  try {
    // Transação atômica: idempotência + reserva + criação do evento
    await db.runTransaction(async (transaction) => {
      // 1. Verifica idempotência lendo credit_events/{requestId}
      //    Se o documento já existe, a requisição já foi processada
      const existingEventSnap = await transaction.get(eventRef);
      if (existingEventSnap.exists) {
        const existing = existingEventSnap.data() as CreditEvent;
        if (existing.status === 'confirmed' || existing.status === 'reserved') {
          throw new Error('DUPLICATE_REQUEST');
        }
        // Status 'reverted' ou 'expired': permite nova tentativa
      }

      // 2. Leitura (ou criação) do beta_access
      //    Se o documento não existe (usuário novo que nunca passou por
      //    getOrCreateBetaAccess), cria com valores iniciais dentro da
      //    transação — isso garante que QUALQUER flow que chame
      //    reserveCredits() primeiro funcione, não apenas o feedback.
      const betaSnap = await transaction.get(betaRef);
      let beta: BetaAccess;
      if (!betaSnap.exists) {
        beta = createInitialBetaAccess(currentPeriod);
        transaction.set(betaRef, beta);
        console.log(
          `[credit-service] BetaAccess criado sob demanda via reserveCredits: ` +
          `uid=${uid} periodo=${currentPeriod}`,
        );
      } else {
        beta = betaSnap.data() as BetaAccess;
      }

      // 3. Verifica saldo disponível
      if (beta.availableCredits < estimatedCredits) {
        throw new Error('Saldo insuficiente');
      }

      // 4. Leitura do credit_month (pode não existir ainda)
      const monthSnap = await transaction.get(monthRef);
      const month: CreditMonth = monthSnap.exists
        ? monthSnap.data() as CreditMonth
        : createInitialCreditMonth(currentPeriod, beta.baseCredits, beta.bonusCredits);

      // 5. Atualiza beta_access
      const updatedBeta: Partial<BetaAccess> = {
        availableCredits: beta.availableCredits - estimatedCredits,
        reservedCredits: beta.reservedCredits + estimatedCredits,
        updatedAt: Date.now(),
      };
      transaction.set(betaRef, updatedBeta, { merge: true });

      // 6. Atualiza credit_month
      const updatedMonth: Partial<CreditMonth> = {
        reservedCredits: month.reservedCredits + estimatedCredits,
        availableCredits: month.availableCredits - estimatedCredits,
        updatedAt: Date.now(),
      };
      transaction.set(monthRef, updatedMonth, { merge: true });

      // 7. Cria credit_event DENTRO da transação (idempotência atômica)
      //    Usa requestId como ID do documento — se duas chamadas concorrentes
      //    tentarem criar o mesmo documento, apenas uma será bem-sucedida.
      const eventData: CreditEvent = {
        requestId,
        flowName: operationType,
        operationType,
        status: 'reserved',
        estimatedCredits,
        finalCredits: 0, // será preenchido na confirmação
        model: '', // será preenchido pelo flow
        inputSize: 0,
        outputSize: 0,
        createdAt: Date.now(),
        finishedAt: 0,
      };
      transaction.set(eventRef, eventData);
    });

    return { success: true, eventId: requestId };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[credit-service] Falha na reserva: uid=${uid} requestId=${requestId} erro=${message}`);

    if (message === 'Saldo insuficiente') {
      return { success: false, error: 'Saldo insuficiente' };
    }

    if (message === 'DUPLICATE_REQUEST') {
      return { success: false, error: 'Requisição duplicada' };
    }

    return { success: false, error: `Erro interno: ${message}` };
  }
}

/**
 * Confirma o consumo de créditos após a execução bem-sucedida do flow.
 *
 * Fluxo atômico:
 * 1. Busca credit_event por requestId
 * 2. Se não encontrado ou status !== 'reserved' → erro
 * 3. Calcula diferença: estimatedCredits - finalCredits
 * 4. Devolve créditos excedentes ao availableCredits (se estimativa foi maior)
 * 5. Se finalCredits > estimatedCredits → consome a diferença extra (raro, mas possível)
 * 6. Move de reservedCredits para usedCredits
 * 7. Atualiza credit_event com status 'confirmed'
 * 8. Atualiza credit_months/{periodKey}
 *
 * @returns Resultado com saldo disponível atualizado
 */
export async function confirmCredits(
  db: Firestore,
  uid: string,
  requestId: string,
  finalCredits: number,
  outputSize?: number,
  model?: string,
): Promise<ConfirmResult> {
  // Busca o evento existente (fora da transação para identificar o eventId)
  const eventsSnap = await db
    .collection(`users/${uid}/credit_events`)
    .where('requestId', '==', requestId)
    .limit(1)
    .get();

  if (eventsSnap.empty) {
    return { success: false, availableCredits: 0, error: 'Evento de crédito não encontrado' };
  }

  const eventDoc = eventsSnap.docs[0];
  const eventId = eventDoc.id;
  const event = eventDoc.data() as CreditEvent;

  if (event.status !== 'reserved') {
    return {
      success: false,
      availableCredits: 0,
      error: `Evento com status inválido: ${event.status}`,
    };
  }

  const currentPeriod = getCurrentPeriodKey();
  const betaRef = db.doc(`users/${uid}/beta_access/current`);
  const monthRef = db.doc(`users/${uid}/credit_months/${currentPeriod}`);

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Leitura do beta_access
      const betaSnap = await transaction.get(betaRef);
      if (!betaSnap.exists) {
        throw new Error('BetaAccess não encontrado');
      }

      const beta = betaSnap.data() as BetaAccess;

      // 2. Leitura do credit_month
      const monthSnap = await transaction.get(monthRef);
      const month: CreditMonth = monthSnap.exists
        ? monthSnap.data() as CreditMonth
        : createInitialCreditMonth(currentPeriod, beta.baseCredits, beta.bonusCredits);

      // 3. Calcula ajustes
      const estimatedCredits = event.estimatedCredits;
      const creditDelta = estimatedCredits - finalCredits;
      // Positivo = devolver, Negativo = consumir adicional

      let newAvailable = beta.availableCredits;
      let newReserved = beta.reservedCredits - estimatedCredits; // libera reserva
      let newUsed = beta.usedCredits + finalCredits;

      if (creditDelta > 0) {
        // Estimativa foi maior que o real → devolve a diferença
        newAvailable += creditDelta;
      } else if (creditDelta < 0) {
        // Consumo foi maior que a estimativa → consome a diferença extra do available
        const extraConsumption = Math.abs(creditDelta);
        if (beta.availableCredits < extraConsumption) {
          // Saldo insuficiente para cobrir o extra — usa o que tem disponível
          newAvailable = 0;
          newUsed -= (extraConsumption - beta.availableCredits);
        } else {
          newAvailable -= extraConsumption;
        }
      }
      // creditDelta === 0 → sem ajuste

      // 4. Atualiza beta_access
      const updatedBeta: Partial<BetaAccess> = {
        availableCredits: Math.max(0, newAvailable),
        reservedCredits: Math.max(0, newReserved),
        usedCredits: newUsed,
        updatedAt: Date.now(),
      };
      transaction.set(betaRef, updatedBeta, { merge: true });

      // 5. Atualiza credit_month
      const updatedMonth: Partial<CreditMonth> = {
        reservedCredits: Math.max(0, month.reservedCredits - estimatedCredits),
        usedCredits: month.usedCredits + finalCredits,
        availableCredits: Math.max(0, newAvailable),
        updatedAt: Date.now(),
        usage: buildUsageUpdate(month.usage, event.flowName, finalCredits),
      };
      transaction.set(monthRef, updatedMonth, { merge: true });

      // 6. Atualiza credit_event
      const eventRef = db.doc(`users/${uid}/credit_events/${eventId}`);
      const updatedEvent: Partial<CreditEvent> = {
        status: 'confirmed',
        finalCredits,
        outputSize: outputSize ?? event.outputSize,
        model: model ?? event.model,
        finishedAt: Date.now(),
      };
      transaction.set(eventRef, updatedEvent, { merge: true });

      return { availableCredits: Math.max(0, newAvailable) };
    });

    console.log(
      `[credit-service] Créditos confirmados: uid=${uid} requestId=${requestId} ` +
      `finalCredits=${finalCredits} availableCredits=${result.availableCredits}`,
    );

    return { success: true, availableCredits: result.availableCredits };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[credit-service] Falha na confirmação: uid=${uid} requestId=${requestId} erro=${message}`);
    return { success: false, availableCredits: 0, error: message };
  }
}

/**
 * Reverte créditos após falha na execução do flow.
 *
 * Fluxo atômico:
 * 1. Busca credit_event por requestId
 * 2. Se status !== 'reserved' → no-op
 * 3. Devolve estimatedCredits ao availableCredits
 * 4. Subtrai de reservedCredits
 * 5. Atualiza credit_event com status 'reverted'
 */
export async function revertCredits(
  db: Firestore,
  uid: string,
  requestId: string,
  errorCode?: string,
): Promise<void> {
  // Busca o evento existente
  const eventsSnap = await db
    .collection(`users/${uid}/credit_events`)
    .where('requestId', '==', requestId)
    .limit(1)
    .get();

  if (eventsSnap.empty) {
    console.log(`[credit-service] Reversão ignorada: evento não encontrado para requestId=${requestId}`);
    return;
  }

  const eventDoc = eventsSnap.docs[0];
  const eventId = eventDoc.id;
  const event = eventDoc.data() as CreditEvent;

  if (event.status !== 'reserved') {
    console.log(
      `[credit-service] Reversão ignorada: status=${event.status} para requestId=${requestId}`,
    );
    return;
  }

  const currentPeriod = getCurrentPeriodKey();
  const betaRef = db.doc(`users/${uid}/beta_access/current`);
  const monthRef = db.doc(`users/${uid}/credit_months/${currentPeriod}`);

  try {
    await db.runTransaction(async (transaction) => {
      // 1. Leitura do beta_access
      const betaSnap = await transaction.get(betaRef);
      if (!betaSnap.exists) {
        throw new Error('BetaAccess não encontrado');
      }

      const beta = betaSnap.data() as BetaAccess;

      // 2. Leitura do credit_month
      const monthSnap = await transaction.get(monthRef);
      const month: CreditMonth = monthSnap.exists
        ? monthSnap.data() as CreditMonth
        : createInitialCreditMonth(currentPeriod, beta.baseCredits, beta.bonusCredits);

      const estimatedCredits = event.estimatedCredits;

      // 3. Devolve créditos
      const updatedBeta: Partial<BetaAccess> = {
        availableCredits: beta.availableCredits + estimatedCredits,
        reservedCredits: Math.max(0, beta.reservedCredits - estimatedCredits),
        updatedAt: Date.now(),
      };
      transaction.set(betaRef, updatedBeta, { merge: true });

      // 4. Atualiza credit_month
      const updatedMonth: Partial<CreditMonth> = {
        availableCredits: month.availableCredits + estimatedCredits,
        reservedCredits: Math.max(0, month.reservedCredits - estimatedCredits),
        updatedAt: Date.now(),
      };
      transaction.set(monthRef, updatedMonth, { merge: true });

      // 5. Atualiza credit_event
      const eventRef = db.doc(`users/${uid}/credit_events/${eventId}`);
      const updatedEvent: Partial<CreditEvent> = {
        status: 'reverted',
        errorCode: errorCode,
        finishedAt: Date.now(),
      };
      transaction.set(eventRef, updatedEvent, { merge: true });
    });

    console.log(
      `[credit-service] Créditos revertidos: uid=${uid} requestId=${requestId} ` +
      `credits=${event.estimatedCredits} errorCode=${errorCode ?? 'N/A'}`,
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[credit-service] Falha na reversão: uid=${uid} requestId=${requestId} erro=${message}`);
    // Não relança — a reversão é best-effort
  }
}

/**
 * Concede o bônus único de feedback (250 créditos).
 * Cada usuário recebe este bônus no máximo UMA vez.
 *
 * Fluxo atômico:
 * 1. Lê beta_access/current
 * 2. Se feedbackBonusGranted === true → retorna bonusGranted: false
 * 3. Adiciona FEEDBACK_BONUS_CREDITS ao bonusCredits e availableCredits
 * 4. Marca feedbackBonusGranted = true
 * 5. Cria feedback_rewards/{rewardId}
 * 6. Atualiza credit_months/{periodKey}
 *
 * @returns Resultado indicando se o bônus foi concedido
 */
export async function grantFeedbackBonus(
  db: Firestore,
  uid: string,
  requestId: string,
): Promise<BonusResult> {
  const currentPeriod = getCurrentPeriodKey();
  const betaRef = db.doc(`users/${uid}/beta_access/current`);
  const monthRef = db.doc(`users/${uid}/credit_months/${currentPeriod}`);

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Leitura do beta_access
      const betaSnap = await transaction.get(betaRef);
      if (!betaSnap.exists) {
        throw new Error('BetaAccess não encontrado — execute getOrCreateBetaAccess primeiro');
      }

      const beta = betaSnap.data() as BetaAccess;

      // 2. Verifica se já recebeu bônus
      if (beta.feedbackBonusGranted) {
        return { bonusGranted: false };
      }

      // 3. Leitura do credit_month
      const monthSnap = await transaction.get(monthRef);
      const month: CreditMonth = monthSnap.exists
        ? monthSnap.data() as CreditMonth
        : createInitialCreditMonth(currentPeriod, beta.baseCredits, beta.bonusCredits);

      // 4. Concede bônus no beta_access
      const updatedBeta: Partial<BetaAccess> = {
        bonusCredits: beta.bonusCredits + FEEDBACK_BONUS_CREDITS,
        availableCredits: beta.availableCredits + FEEDBACK_BONUS_CREDITS,
        feedbackBonusGranted: true,
        updatedAt: Date.now(),
      };
      transaction.set(betaRef, updatedBeta, { merge: true });

      // 5. Atualiza credit_month
      const updatedMonth: Partial<CreditMonth> = {
        bonusCredits: month.bonusCredits + FEEDBACK_BONUS_CREDITS,
        availableCredits: month.availableCredits + FEEDBACK_BONUS_CREDITS,
        updatedAt: Date.now(),
      };
      transaction.set(monthRef, updatedMonth, { merge: true });

      return { bonusGranted: true };
    });

    // Cria o feedback_reward APÓS a transação (documento separado)
    if (result.bonusGranted) {
      const rewardRef = db.collection(`users/${uid}/feedback_rewards`).doc();
      await rewardRef.set({
        rewardType: 'feedback_bonus' as const,
        grantedCredits: FEEDBACK_BONUS_CREDITS,
        source: 'Feedback do usuário — bônus único de beta',
        createdAt: Date.now(),
        requestId,
      });

      console.log(
        `[credit-service] Bônus de feedback concedido: uid=${uid} ` +
        `credits=${FEEDBACK_BONUS_CREDITS} rewardId=${rewardRef.id}`,
      );
    }

    return { success: true, bonusGranted: result.bonusGranted };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[credit-service] Falha ao conceder bônus: uid=${uid} erro=${message}`);
    return { success: false, bonusGranted: false };
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Atualiza o campo usage do CreditMonth com os créditos consumidos.
 * O flowName determina qual categoria de uso incrementar.
 */
function buildUsageUpdate(
  currentUsage: CreditMonth['usage'],
  flowName: string,
  credits: number,
): CreditMonth['usage'] {
  const usage = { ...currentUsage };

  switch (flowName) {
    case 'assistant':
      usage.chatCredits += credits;
      break;
    case 'inline_assistant':
      usage.inlineCredits += credits;
      break;
    case 'audio':
      usage.audioCredits += credits;
      break;
    case 'image':
      usage.imageCredits += credits;
      break;
    case 'scene_prompts':
      usage.sceneCredits += credits;
      break;
    case 'chunking':
      // Chunking é etapa do pipeline de áudio — agrupado em sceneCredits
      usage.sceneCredits += credits;
      break;
    // outros tipos caem no default (sem categoria específica)
  }

  return usage;
}
