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
import { createLogger } from '../genkit/utils/logger.js';

const log = createLogger('credit-service');

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface UserEntitlements {
  unlimitedCredits?: boolean;
}

interface UserProfile {
  entitlements?: UserEntitlements;
}

export interface CreditAvailabilitySnapshot {
  availableCredits: number;
  unlimitedCredits: boolean;
  baseCredits: number;
  bonusCredits: number;
  usedCredits: number;
  reservedCredits: number;
  feedbackBonusGranted: boolean;
  /** Marca que o usuário já teve saldo zero (>0 → 0) pelo menos uma vez */
  feedbackPromoSeen: boolean;
  currentPeriodKey: string;
}

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
  /** Marca que o usuário já teve saldo zero (>0 → 0) pelo menos uma vez */
  feedbackPromoSeen: boolean;
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
    feedbackPromoSeen: false,
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

function buildRolledOverBetaAccess(current: BetaAccess, nextPeriodKey: string): BetaAccess {
  return {
    status: 'active',
    currentPeriodKey: nextPeriodKey,
    baseCredits: MONTHLY_BASE_CREDITS,
    bonusCredits: current.bonusCredits,
    availableCredits: MONTHLY_BASE_CREDITS + current.bonusCredits,
    usedCredits: 0,
    reservedCredits: 0,
    updatedAt: Date.now(),
    feedbackBonusGranted: current.feedbackBonusGranted,
    feedbackPromoSeen: current.feedbackPromoSeen,
  };
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function sanitizeBetaAccess(raw: unknown, fallbackPeriodKey: string): BetaAccess {
  const data = raw && typeof raw === 'object'
    ? raw as Partial<BetaAccess>
    : {};

  const baseCredits = readNumber(data.baseCredits, MONTHLY_BASE_CREDITS);
  const bonusCredits = readNumber(data.bonusCredits, 0);
  const usedCredits = readNumber(data.usedCredits, 0);
  const reservedCredits = readNumber(data.reservedCredits, 0);
  const availableFallback = Math.max(baseCredits + bonusCredits - usedCredits - reservedCredits, 0);
  const availableCredits = readNumber(data.availableCredits, availableFallback);

  return {
    status: 'active',
    currentPeriodKey: typeof data.currentPeriodKey === 'string' && data.currentPeriodKey.length > 0
      ? data.currentPeriodKey
      : fallbackPeriodKey,
    baseCredits,
    bonusCredits,
    availableCredits,
    usedCredits,
    reservedCredits,
    updatedAt: readNumber(data.updatedAt, Date.now()),
    feedbackBonusGranted: data.feedbackBonusGranted === true,
    feedbackPromoSeen: data.feedbackPromoSeen === true,
  };
}

// ---------------------------------------------------------------------------
// Constantes de timeout
// ---------------------------------------------------------------------------

/** Tempo máximo que uma reserva pode ficar sem confirmação antes de expirar (5 min) */
const RESERVATION_TIMEOUT_MS = 5 * 60 * 1000;

async function hasUnlimitedCredits(
  db: Firestore,
  uid: string,
): Promise<boolean> {
  const userSnap = await db.doc(`users/${uid}`).get();

  if (!userSnap.exists) {
    return false;
  }

  const userData = userSnap.data() as UserProfile;
  return userData.entitlements?.unlimitedCredits === true;
}

export async function getCreditAvailabilitySnapshot(
  db: Firestore,
  uid: string,
): Promise<CreditAvailabilitySnapshot> {
  // Cada etapa é isolada para facilitar o diagnóstico de falhas.
  // Em caso de erro, o log indica exatamente qual operação falhou.

  let unlimitedCredits: boolean;
  try {
    unlimitedCredits = await hasUnlimitedCredits(db, uid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('hasUnlimitedCredits falhou', { uid, error: msg });
    throw err;
  }

  let initialBeta: BetaAccess;
  try {
    initialBeta = await getOrCreateBetaAccess(db, uid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('getOrCreateBetaAccess (inicial) falhou', { uid, error: msg });
    throw err;
  }

  let expiredReservations: number;
  try {
    expiredReservations = await expireStaleReservations(db, uid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('expireStaleReservations falhou', { uid, error: msg });
    throw err;
  }

  const beta = expiredReservations > 0
    ? await (async () => {
        try {
          return await getOrCreateBetaAccess(db, uid);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error('getOrCreateBetaAccess (pós-expiração) falhou', { uid, error: msg });
          throw err;
        }
      })()
    : initialBeta;

  return {
    availableCredits: beta.availableCredits,
    unlimitedCredits,
    baseCredits: beta.baseCredits,
    bonusCredits: beta.bonusCredits,
    usedCredits: beta.usedCredits,
    reservedCredits: beta.reservedCredits,
    feedbackBonusGranted: beta.feedbackBonusGranted,
    feedbackPromoSeen: beta.feedbackPromoSeen,
    currentPeriodKey: beta.currentPeriodKey,
  };
}

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

  const reservedSnap = await db
    .collection(`users/${uid}/credit_events`)
    .where('status', '==', 'reserved')
    .limit(25)
    .get();

  if (reservedSnap.empty) return 0;

  const staleDocs = reservedSnap.docs.filter((doc) => {
    const event = doc.data() as CreditEvent;
    return event.createdAt < cutoff;
  });

  if (staleDocs.length === 0) return 0;

  let releasedCount = 0;
  const betaRef = db.doc(`users/${uid}/beta_access/current`);

  for (const doc of staleDocs) {
    const staleEvent = doc.data() as CreditEvent;

    await db.runTransaction(async (transaction) => {
      const betaSnap = await transaction.get(betaRef);
      if (!betaSnap.exists) return;

      const beta = sanitizeBetaAccess(betaSnap.data(), getCurrentPeriodKey());
      const monthRef = db.doc(`users/${uid}/credit_months/${beta.currentPeriodKey}`);
      const monthSnap = await transaction.get(monthRef);
      const month = monthSnap.exists
        ? monthSnap.data() as CreditMonth
        : createInitialCreditMonth(beta.currentPeriodKey, beta.baseCredits, beta.bonusCredits);

      // Só libera o que ainda está reservado (evita saldo negativo)
      const releaseAmount = Math.min(staleEvent.estimatedCredits, beta.reservedCredits);
      const monthReleaseAmount = Math.min(staleEvent.estimatedCredits, month.reservedCredits);
      if (releaseAmount <= 0) return;

      transaction.set(betaRef, {
        availableCredits: beta.availableCredits + releaseAmount,
        reservedCredits: beta.reservedCredits - releaseAmount,
        updatedAt: Date.now(),
      }, { merge: true });
      transaction.set(monthRef, {
        availableCredits: month.availableCredits + monthReleaseAmount,
        reservedCredits: month.reservedCredits - monthReleaseAmount,
        updatedAt: Date.now(),
      } satisfies Partial<CreditMonth>, { merge: true });

      transaction.set(doc.ref, {
        status: 'expired' as const,
        finishedAt: Date.now(),
        errorCode: 'RESERVATION_TIMEOUT',
      }, { merge: true });
    });

    releasedCount++;
  }

  if (releasedCount > 0) {
    log.info('Reservas stale expiradas', { uid, count: releasedCount });
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
  const currentPeriod = getCurrentPeriodKey();
  const monthRef = db.doc(`users/${uid}/credit_months/${currentPeriod}`);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(betaRef);

    if (!snap.exists) {
      const initial = createInitialBetaAccess(currentPeriod);
      transaction.set(betaRef, initial);
      transaction.set(
        monthRef,
        createInitialCreditMonth(currentPeriod, initial.baseCredits, initial.bonusCredits),
      );
      log.info('BetaAccess criado', { uid, period: currentPeriod });
      return initial;
    }

    const data = sanitizeBetaAccess(snap.data(), currentPeriod);

    if (isNewPeriod(data.currentPeriodKey)) {
      log.info('Rollover detectado', { uid, from: data.currentPeriodKey, to: currentPeriod });

      const fresh = buildRolledOverBetaAccess(data, currentPeriod);
      transaction.set(betaRef, fresh);
      transaction.set(
        monthRef,
        createInitialCreditMonth(currentPeriod, fresh.baseCredits, fresh.bonusCredits),
      );
      return fresh;
    }

    const monthSnap = await transaction.get(monthRef);
    if (!monthSnap.exists) {
      transaction.set(
        monthRef,
        createInitialCreditMonth(currentPeriod, data.baseCredits, data.bonusCredits),
      );
    }

    transaction.set(betaRef, data);

    return data;
  });
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
  try {
    if (await hasUnlimitedCredits(db, uid)) {
      return { success: true, eventId: requestId };
    }

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
      let shouldCreateBeta = false;
      let shouldRefreshBeta = false;
      if (!betaSnap.exists) {
        beta = createInitialBetaAccess(currentPeriod);
        shouldCreateBeta = true;
      } else {
        beta = sanitizeBetaAccess(betaSnap.data(), currentPeriod);
        if (isNewPeriod(beta.currentPeriodKey)) {
          beta = buildRolledOverBetaAccess(beta, currentPeriod);
          shouldRefreshBeta = true;
        }
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

      if (shouldCreateBeta) {
        log.info('BetaAccess criado sob demanda via reserveCredits', { uid, period: currentPeriod });
      }

      if (shouldCreateBeta || shouldRefreshBeta) {
        transaction.set(betaRef, beta);
      }

      if (!monthSnap.exists) {
        transaction.set(monthRef, month);
      }

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
    log.error('Falha na reserva', { uid, requestId, error: message });

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
  if (await hasUnlimitedCredits(db, uid)) {
    return { success: true, availableCredits: Number.POSITIVE_INFINITY };
  }

  const currentPeriod = getCurrentPeriodKey();
  const betaRef = db.doc(`users/${uid}/beta_access/current`);
  const monthRef = db.doc(`users/${uid}/credit_months/${currentPeriod}`);
  const eventRef = db.doc(`users/${uid}/credit_events/${requestId}`);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists) {
        throw new Error('Evento de crédito não encontrado');
      }

      const event = eventSnap.data() as CreditEvent;
      if (event.status !== 'reserved') {
        throw new Error(`Evento com status inválido: ${event.status}`);
      }

      // 1. Leitura do beta_access
      const betaSnap = await transaction.get(betaRef);
      if (!betaSnap.exists) {
        throw new Error('BetaAccess não encontrado');
      }

      const beta = sanitizeBetaAccess(betaSnap.data(), currentPeriod);

      // 2. Leitura do credit_month
      const monthSnap = await transaction.get(monthRef);
      const month: CreditMonth = monthSnap.exists
        ? monthSnap.data() as CreditMonth
        : createInitialCreditMonth(currentPeriod, beta.baseCredits, beta.bonusCredits);

      // 3. Calcula ajustes de forma consistente entre beta_access e credit_month.
      // A confirmação só segue se o saldo total confirmável (reserva liberada +
      // saldo livre restante) cobre o custo final real.
      const estimatedCredits = event.estimatedCredits;
      const releasableReservation = Math.min(estimatedCredits, beta.reservedCredits);
      const releasableMonthReservation = Math.min(estimatedCredits, month.reservedCredits);
      const betaConfirmableCredits = beta.availableCredits + releasableReservation;
      const monthConfirmableCredits = month.availableCredits + releasableMonthReservation;

      if (betaConfirmableCredits < finalCredits || monthConfirmableCredits < finalCredits) {
        throw new Error('Saldo insuficiente para confirmar o consumo final');
      }

      const newAvailable = betaConfirmableCredits - finalCredits;
      const newReserved = beta.reservedCredits - releasableReservation;
      const newUsed = beta.usedCredits + finalCredits;
      const newMonthAvailable = monthConfirmableCredits - finalCredits;
      const newMonthReserved = month.reservedCredits - releasableMonthReservation;
      const newMonthUsed = month.usedCredits + finalCredits;

      // Detecta quando o saldo total do usuário chega a zero após a confirmação.
      // O `beta.availableCredits` já pode ser 0 (reserveCredits zerou antes),
      // então consideramos o saldo total (livre + reservado) antes da confirmação.
      // A flag é ativada atomicamente na mesma transação que atualiza o saldo.
      const totalBeforeConfirm = beta.availableCredits + beta.reservedCredits;
      const finalAvailable = Math.max(0, newAvailable);
      const finalReserved = Math.max(0, newReserved);
      const shouldActivateFeedbackPromo =
        totalBeforeConfirm > 0
        && finalAvailable === 0
        && finalReserved === 0
        && !beta.feedbackPromoSeen;

      // 4. Atualiza beta_access
      const updatedBeta: Partial<BetaAccess> = {
        availableCredits: finalAvailable,
        reservedCredits: Math.max(0, newReserved),
        usedCredits: newUsed,
        updatedAt: Date.now(),
        ...(shouldActivateFeedbackPromo ? { feedbackPromoSeen: true } : {}),
      };
      transaction.set(betaRef, updatedBeta, { merge: true });

      // 5. Atualiza credit_month
      const updatedMonth: Partial<CreditMonth> = {
        reservedCredits: Math.max(0, newMonthReserved),
        usedCredits: newMonthUsed,
        availableCredits: Math.max(0, newMonthAvailable),
        updatedAt: Date.now(),
        usage: buildUsageUpdate(month.usage, event.flowName, finalCredits),
      };
      transaction.set(monthRef, updatedMonth, { merge: true });

      // 6. Atualiza credit_event
      const updatedEvent: Partial<CreditEvent> = {
        status: 'confirmed',
        finalCredits,
        outputSize: outputSize ?? event.outputSize,
        model: model ?? event.model,
        finishedAt: Date.now(),
      };
      transaction.set(eventRef, updatedEvent, { merge: true });

      return { availableCredits: finalAvailable };
    });

    log.info('Créditos confirmados', { uid, requestId, finalCredits, availableCredits: result.availableCredits });

    return { success: true, availableCredits: result.availableCredits };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    log.error('Falha na confirmação', { uid, requestId, error: message });
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
  if (await hasUnlimitedCredits(db, uid)) {
    return;
  }

  const eventRef = db.doc(`users/${uid}/credit_events/${requestId}`);
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) {
    log.info('Reversão ignorada: evento não encontrado', { requestId });
    return;
  }

  const event = eventSnap.data() as CreditEvent;

  if (event.status !== 'reserved') {
    log.info('Reversão ignorada: status inválido', { requestId, status: event.status });
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

      const beta = sanitizeBetaAccess(betaSnap.data(), currentPeriod);

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
      const updatedEvent: Partial<CreditEvent> = {
        status: 'reverted',
        errorCode: errorCode,
        finishedAt: Date.now(),
      };
      transaction.set(eventRef, updatedEvent, { merge: true });
    });

    log.info('Créditos revertidos', { uid, requestId, credits: event.estimatedCredits, errorCode: errorCode ?? 'N/A' });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    log.error('Falha na reversão', { uid, requestId, error: message });
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

      const beta = sanitizeBetaAccess(betaSnap.data(), currentPeriod);

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

      log.info('Bônus de feedback concedido', { uid, credits: FEEDBACK_BONUS_CREDITS, rewardId: rewardRef.id });
    }

    return { success: true, bonusGranted: result.bonusGranted };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    log.error('Falha ao conceder bônus', { uid, error: message });
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
