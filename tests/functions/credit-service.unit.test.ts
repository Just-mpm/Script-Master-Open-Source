import { describe, expect, it } from 'vitest';
import {
  confirmCredits,
  getCreditAvailabilitySnapshot,
  MONTHLY_BASE_CREDITS,
  reserveCredits,
} from '../../functions/src/usage/index.js';
import { getCurrentPeriodKey } from '../../functions/src/usage/period.js';
import type { BetaAccess, CreditMonth } from '../../functions/src/usage/credit-service.js';
import type { CreditEvent } from '../../functions/src/usage/credit-events.js';
import { MockFirestore } from './mockFirestore';

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
  };
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

function createReservedEvent(requestId: string, estimatedCredits: number, createdAt = Date.now()): CreditEvent {
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
    createdAt,
    finishedAt: 0,
  };
}

describe('credit-service', () => {
  it('deve criar e reconciliar snapshot de créditos para usuário novo', async () => {
    const db = new MockFirestore();

    const snapshot = await getCreditAvailabilitySnapshot(db as unknown as Parameters<typeof getCreditAvailabilitySnapshot>[0], 'user-new');

    expect(snapshot.availableCredits).toBe(MONTHLY_BASE_CREDITS);
    expect(snapshot.usedCredits).toBe(0);
    expect(snapshot.reservedCredits).toBe(0);
    expect(snapshot.unlimitedCredits).toBe(false);
    expect(snapshot.feedbackBonusGranted).toBe(false);
    expect(db.read('users/user-new/beta_access/current')).toBeTruthy();
  });

  it('deve expirar reservas stale ao montar o snapshot', async () => {
    const db = new MockFirestore();
    const staleRequestId = 'stale-request';
    const periodKey = getCurrentPeriodKey();
    const now = Date.now();

    db.seed('users/user-1/beta_access/current', createBetaAccess({
      availableCredits: 0,
      reservedCredits: 15,
      updatedAt: now,
    }) as unknown as Record<string, unknown>);
    db.seed(`users/user-1/credit_months/${periodKey}`, createCreditMonth({
      availableCredits: 0,
      reservedCredits: 15,
      updatedAt: now,
    }) as unknown as Record<string, unknown>);
    db.seed(`users/user-1/credit_events/${staleRequestId}`, createReservedEvent(
      staleRequestId,
      15,
      now - (6 * 60 * 1000),
    ) as unknown as Record<string, unknown>);

    const snapshot = await getCreditAvailabilitySnapshot(db as unknown as Parameters<typeof getCreditAvailabilitySnapshot>[0], 'user-1');

    expect(snapshot.availableCredits).toBe(15);
    expect(snapshot.reservedCredits).toBe(0);
    const month = db.read(`users/user-1/credit_months/${periodKey}`);
    expect(month?.availableCredits).toBe(15);
    expect(month?.reservedCredits).toBe(0);
    const updatedEvent = db.read(`users/user-1/credit_events/${staleRequestId}`);
    expect(updatedEvent?.status).toBe('expired');
  });

  it('deve criar beta_access completo e credit_month ao reservar para usuário novo', async () => {
    const db = new MockFirestore();
    const periodKey = getCurrentPeriodKey();

    const result = await reserveCredits(
      db as unknown as Parameters<typeof reserveCredits>[0],
      'user-reserve-new',
      'request-new',
      'assistant',
      12,
    );

    expect(result.success).toBe(true);

    const beta = db.read('users/user-reserve-new/beta_access/current');
    const month = db.read(`users/user-reserve-new/credit_months/${periodKey}`);

    expect(beta).toMatchObject({
      currentPeriodKey: periodKey,
      baseCredits: MONTHLY_BASE_CREDITS,
      usedCredits: 0,
      feedbackBonusGranted: false,
      availableCredits: MONTHLY_BASE_CREDITS - 12,
      reservedCredits: 12,
    });
    expect(month).toMatchObject({
      periodKey,
      baseCredits: MONTHLY_BASE_CREDITS,
      availableCredits: MONTHLY_BASE_CREDITS - 12,
      reservedCredits: 12,
      usedCredits: 0,
    });
  });

  it('deve fazer rollover do beta_access durante reserveCredits', async () => {
    const db = new MockFirestore();
    const currentPeriodKey = getCurrentPeriodKey();

    db.seed('users/user-rollover/beta_access/current', createBetaAccess({
      currentPeriodKey: '2000-01',
      baseCredits: 999,
      bonusCredits: 40,
      availableCredits: 123,
      usedCredits: 80,
      reservedCredits: 9,
      feedbackBonusGranted: true,
    }) as unknown as Record<string, unknown>);

    const result = await reserveCredits(
      db as unknown as Parameters<typeof reserveCredits>[0],
      'user-rollover',
      'request-rollover',
      'image',
      20,
    );

    expect(result.success).toBe(true);

    const beta = db.read('users/user-rollover/beta_access/current');
    const month = db.read(`users/user-rollover/credit_months/${currentPeriodKey}`);

    expect(beta).toMatchObject({
      currentPeriodKey,
      baseCredits: MONTHLY_BASE_CREDITS,
      bonusCredits: 40,
      usedCredits: 0,
      reservedCredits: 20,
      availableCredits: MONTHLY_BASE_CREDITS + 40 - 20,
      feedbackBonusGranted: true,
    });
    expect(month).toMatchObject({
      periodKey: currentPeriodKey,
      baseCredits: MONTHLY_BASE_CREDITS,
      bonusCredits: 40,
      usedCredits: 0,
      reservedCredits: 20,
      availableCredits: MONTHLY_BASE_CREDITS + 40 - 20,
    });
  });

  it('deve confirmar o custo final completo quando a soma saldo livre + reserva cobre o valor real', async () => {
    const db = new MockFirestore();
    const requestId = 'req-confirm-ok';
    const periodKey = getCurrentPeriodKey();

    db.seed('users/user-2/beta_access/current', createBetaAccess({
      availableCredits: 20,
      reservedCredits: 10,
      usedCredits: 5,
    }) as unknown as Record<string, unknown>);
    db.seed(`users/user-2/credit_months/${periodKey}`, createCreditMonth({
      availableCredits: 20,
      reservedCredits: 10,
      usedCredits: 5,
    }) as unknown as Record<string, unknown>);
    db.seed(`users/user-2/credit_events/${requestId}`, createReservedEvent(requestId, 10) as unknown as Record<string, unknown>);

    const result = await confirmCredits(
      db as unknown as Parameters<typeof confirmCredits>[0],
      'user-2',
      requestId,
      25,
      400,
      'gemini-test',
    );

    expect(result.success).toBe(true);
    expect(result.availableCredits).toBe(5);

    const beta = db.read('users/user-2/beta_access/current');
    const month = db.read(`users/user-2/credit_months/${periodKey}`);
    const event = db.read(`users/user-2/credit_events/${requestId}`);

    expect(beta?.availableCredits).toBe(5);
    expect(beta?.reservedCredits).toBe(0);
    expect(beta?.usedCredits).toBe(30);
    expect(month?.availableCredits).toBe(5);
    expect(month?.reservedCredits).toBe(0);
    expect(month?.usedCredits).toBe(30);
    expect(event?.status).toBe('confirmed');
    expect(event?.finalCredits).toBe(25);
  });

  it('deve falhar sem corromper saldo quando o custo final ultrapassa o total confirmável', async () => {
    const db = new MockFirestore();
    const requestId = 'req-confirm-fail';
    const periodKey = getCurrentPeriodKey();

    db.seed('users/user-3/beta_access/current', createBetaAccess({
      availableCredits: 5,
      reservedCredits: 10,
      usedCredits: 8,
    }) as unknown as Record<string, unknown>);
    db.seed(`users/user-3/credit_months/${periodKey}`, createCreditMonth({
      availableCredits: 5,
      reservedCredits: 10,
      usedCredits: 8,
    }) as unknown as Record<string, unknown>);
    db.seed(`users/user-3/credit_events/${requestId}`, createReservedEvent(requestId, 10) as unknown as Record<string, unknown>);

    const beforeBeta = db.read('users/user-3/beta_access/current');
    const beforeMonth = db.read(`users/user-3/credit_months/${periodKey}`);

    const result = await confirmCredits(
      db as unknown as Parameters<typeof confirmCredits>[0],
      'user-3',
      requestId,
      20,
      500,
      'gemini-test',
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Saldo insuficiente');
    expect(db.read('users/user-3/beta_access/current')).toEqual(beforeBeta);
    expect(db.read(`users/user-3/credit_months/${periodKey}`)).toEqual(beforeMonth);
    expect(db.read(`users/user-3/credit_events/${requestId}`)?.status).toBe('reserved');
  });
});
