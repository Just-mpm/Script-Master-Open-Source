/**
 * Simulação do bug na detecção de transição >0→0 no confirmCredits.
 *
 * Cenário: usuário tinha 5 créditos, reservou 5, confirmou consumo de 5.
 * O estado pós-reserva no Firestore é availableCredits=0, reservedCredits=5.
 * O check atual é prevAvailable (=beta.availableCredits = 0) > 0, que falha.
 *
 * Resultado esperado: a flag feedbackPromoSeen deveria ser ativada (transição 5→0).
 * Resultado atual: NÃO é ativada porque prevAvailable=0.
 */

import { MockFirestore } from './mockFirestore.ts';
import { getCurrentPeriodKey } from '../../functions/src/usage/period.ts';
import { MONTHLY_BASE_CREDITS } from '../../functions/src/usage/credit-policy.ts';
import { confirmCredits, reserveCredits, type BetaAccess, type CreditMonth } from '../../functions/src/usage/credit-service.ts';
import type { CreditEvent } from '../../functions/src/usage/credit-events.ts';

function createBetaAccess(overrides: Partial<BetaAccess> = {}): BetaAccess {
  return {
    status: 'active',
    currentPeriodKey: getCurrentPeriodKey(),
    baseCredits: MONTHLY_BASE_CREDITS,
    bonusCredits: 0,
    availableCredits: MONTHLY_BASE_CREDITS,
    usedCredits: 0,
    reservedCredits: 0,
    updatedAt: Date.now(),
    feedbackBonusGranted: false,
    ...overrides,
  } as unknown as BetaAccess;
}

function createCreditMonth(overrides: Partial<CreditMonth> = {}): CreditMonth {
  return {
    periodKey: getCurrentPeriodKey(),
    baseCredits: MONTHLY_BASE_CREDITS,
    bonusCredits: 0,
    reservedCredits: 0,
    usedCredits: 0,
    availableCredits: MONTHLY_BASE_CREDITS,
    updatedAt: Date.now(),
    usage: {
      chatCredits: 0,
      imageCredits: 0,
      audioCredits: 0,
      sceneCredits: 0,
      inlineCredits: 0,
    },
    ...overrides,
  };
}

function createReservedEvent(requestId: string, estimatedCredits: number): CreditEvent {
  return {
    requestId,
    flowName: 'audio',
    operationType: 'audio',
    status: 'reserved',
    estimatedCredits,
    finalCredits: 0,
    model: '',
    inputSize: 0,
    outputSize: 0,
    createdAt: Date.now(),
    finishedAt: 0,
  };
}

async function testCenarioA() {
  console.log('=== Cenário A: 5 créditos livres, reserva 5, confirma 5 ===');
  const db = new MockFirestore();
  const periodKey = getCurrentPeriodKey();
  const requestId = 'req-A';

  // Estado inicial: 5 livres, 0 reservados
  db.seed('users/user-A/beta_access/current', createBetaAccess({
    availableCredits: 5,
    reservedCredits: 0,
  }) as unknown as Record<string, unknown>);
  db.seed(`users/user-A/credit_months/${periodKey}`, createCreditMonth({
    availableCredits: 5,
    reservedCredits: 0,
  }) as unknown as Record<string, unknown>);
  db.seed(`users/user-A/credit_events/${requestId}`, createReservedEvent(requestId, 5) as unknown as Record<string, unknown>);

  // Garantir que o user não tem unlimited
  // (sem users/{uid} seed, hasUnlimitedCredits retorna false)

  const result = await confirmCredits(
    db as unknown as Parameters<typeof confirmCredits>[0],
    'user-A',
    requestId,
    5,
    100,
    'gemini-test',
  );

  console.log('Confirm result:', result);
  const beta = db.read('users/user-A/beta_access/current');
  console.log('Beta após confirm:', {
    availableCredits: beta?.availableCredits,
    reservedCredits: beta?.reservedCredits,
    usedCredits: beta?.usedCredits,
    feedbackPromoSeen: beta?.feedbackPromoSeen,
  });
  console.log('ESPERADO: feedbackPromoSeen = true (transição 5→0)');
  console.log('STATUS:', (beta?.feedbackPromoSeen === true ? 'OK' : 'BUG: flag não foi ativada'));
  console.log('');
}

async function testCenarioB() {
  console.log('=== Cenário B: 1 crédito livre, reserva 1, confirma 1 ===');
  const db = new MockFirestore();
  const periodKey = getCurrentPeriodKey();
  const requestId = 'req-B';

  db.seed('users/user-B/beta_access/current', createBetaAccess({
    availableCredits: 1,
    reservedCredits: 0,
  }) as unknown as Record<string, unknown>);
  db.seed(`users/user-B/credit_months/${periodKey}`, createCreditMonth({
    availableCredits: 1,
    reservedCredits: 0,
  }) as unknown as Record<string, unknown>);
  db.seed(`users/user-B/credit_events/${requestId}`, createReservedEvent(requestId, 1) as unknown as Record<string, unknown>);

  const result = await confirmCredits(
    db as unknown as Parameters<typeof confirmCredits>[0],
    'user-B',
    requestId,
    1,
    100,
    'gemini-test',
  );

  console.log('Confirm result:', result);
  const beta = db.read('users/user-B/beta_access/current');
  console.log('Beta após confirm:', {
    availableCredits: beta?.availableCredits,
    reservedCredits: beta?.reservedCredits,
    usedCredits: beta?.usedCredits,
    feedbackPromoSeen: beta?.feedbackPromoSeen,
  });
  console.log('ESPERADO: feedbackPromoSeen = true');
  console.log('STATUS:', (beta?.feedbackPromoSeen === true ? 'OK' : 'BUG: flag não foi ativada'));
  console.log('');
}

async function testCenarioC() {
  console.log('=== Cenário C: idempotência — já tem feedbackPromoSeen=true, chama confirm novamente ===');
  const db = new MockFirestore();
  const periodKey = getCurrentPeriodKey();
  const requestId = 'req-C';

  db.seed('users/user-C/beta_access/current', createBetaAccess({
    availableCredits: 1,
    reservedCredits: 0,
  }) as unknown as Record<string, unknown>);
  db.seed(`users/user-C/credit_months/${periodKey}`, createCreditMonth({
    availableCredits: 1,
    reservedCredits: 0,
  }) as unknown as Record<string, unknown>);
  db.seed(`users/user-C/credit_events/${requestId}`, createReservedEvent(requestId, 1) as unknown as Record<string, unknown>);

  await confirmCredits(
    db as unknown as Parameters<typeof confirmCredits>[0],
    'user-C',
    requestId,
    1,
    100,
    'gemini-test',
  );

  const beta = db.read('users/user-C/beta_access/current');
  console.log('Beta após confirm:', {
    availableCredits: beta?.availableCredits,
    feedbackPromoSeen: beta?.feedbackPromoSeen,
  });
  console.log('ESPERADO: feedbackPromoSeen = true (já estava, mantém)');
  console.log('STATUS:', (beta?.feedbackPromoSeen === true ? 'OK' : 'BUG: flag foi removida/alterada'));
  console.log('');
}

async function testCenarioD() {
  console.log('=== Cenário D: 50 livres, reserva 10, confirma 10 (NÃO zera saldo) ===');
  const db = new MockFirestore();
  const periodKey = getCurrentPeriodKey();
  const requestId = 'req-D';

  db.seed('users/user-D/beta_access/current', createBetaAccess({
    availableCredits: 50,
    reservedCredits: 0,
  }) as unknown as Record<string, unknown>);
  db.seed(`users/user-D/credit_months/${periodKey}`, createCreditMonth({
    availableCredits: 50,
    reservedCredits: 0,
  }) as unknown as Record<string, unknown>);
  db.seed(`users/user-D/credit_events/${requestId}`, createReservedEvent(requestId, 10) as unknown as Record<string, unknown>);

  await confirmCredits(
    db as unknown as Parameters<typeof confirmCredits>[0],
    'user-D',
    requestId,
    10,
    100,
    'gemini-test',
  );

  const beta = db.read('users/user-D/beta_access/current');
  console.log('Beta após confirm:', {
    availableCredits: beta?.availableCredits,
    feedbackPromoSeen: beta?.feedbackPromoSeen,
  });
  console.log('ESPERADO: feedbackPromoSeen = false (não zerou)');
  console.log('STATUS:', (beta?.feedbackPromoSeen === false ? 'OK' : 'BUG: flag ativada indevidamente'));
  console.log('');
}

await testCenarioA();
await testCenarioB();
await testCenarioC();
await testCenarioD();
