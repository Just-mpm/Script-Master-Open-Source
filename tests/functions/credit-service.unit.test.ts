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
    feedbackPromoSeen: false,
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

  describe('feedbackPromoSeen — ativação ao zerar saldo', () => {
    it('deve ativar feedbackPromoSeen quando o saldo total zera após confirmação (fluxo comum: reserve zerou livre)', async () => {
      const db = new MockFirestore();
      const uid = 'user-promo-reserve-zero';
      const requestId = 'req-promo';
      const periodKey = getCurrentPeriodKey();
      const estimatedCredits = 20;

      // Cenário real: reserveCredits(20) de um saldo de 20:
      // availableCredits = 0 (zerou), reservedCredits = 20
      // confirmCredits(20): totalBeforeConfirm = 0 + 20 = 20 > 0
      // finalAvailable = 0, finalReserved = 0 → ativa flag
      db.seed('users/user-promo-reserve-zero/beta_access/current', createBetaAccess({
        availableCredits: 0,
        reservedCredits: estimatedCredits,
        feedbackPromoSeen: false,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-reserve-zero/credit_months/${periodKey}`, createCreditMonth({
        availableCredits: 0,
        reservedCredits: estimatedCredits,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-reserve-zero/credit_events/${requestId}`, createReservedEvent(requestId, estimatedCredits) as unknown as Record<string, unknown>);

      const result = await confirmCredits(
        db as unknown as Parameters<typeof confirmCredits>[0],
        uid,
        requestId,
        estimatedCredits,
      );

      expect(result.success).toBe(true);
      expect(result.availableCredits).toBe(0);

      const betaSnap = db.read(`users/${uid}/beta_access/current`);
      expect(betaSnap?.feedbackPromoSeen).toBe(true);
    });

    it('deve ativar feedbackPromoSeen quando saldo livre e reserva somam zero após confirmação', async () => {
      const db = new MockFirestore();
      const uid = 'user-promo-partial';
      const requestId = 'req-promo-partial';
      const periodKey = getCurrentPeriodKey();

      // Cenário: availableCredits = 5, reservedCredits = 15, estimatedCredits = 15
      // confirmCredits(20): totalBeforeConfirm = 5 + 15 = 20
      // betaConfirmableCredits = 5 + 15 = 20
      // newAvailable = 0, newReserved = 0 → ativa flag
      db.seed('users/user-promo-partial/beta_access/current', createBetaAccess({
        availableCredits: 5,
        reservedCredits: 15,
        feedbackPromoSeen: false,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-partial/credit_months/${periodKey}`, createCreditMonth({
        availableCredits: 5,
        reservedCredits: 15,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-partial/credit_events/${requestId}`, createReservedEvent(requestId, 15) as unknown as Record<string, unknown>);

      const result = await confirmCredits(
        db as unknown as Parameters<typeof confirmCredits>[0],
        uid,
        requestId,
        20, // consome tudo (5 livre + 15 reserva)
      );

      expect(result.success).toBe(true);
      expect(result.availableCredits).toBe(0);

      const betaSnap = db.read(`users/${uid}/beta_access/current`);
      expect(betaSnap?.feedbackPromoSeen).toBe(true);
    });

    it('deve manter feedbackPromoSeen=true após nova confirmação que não zera', async () => {
      const db = new MockFirestore();
      const uid = 'user-promo-already-seen';
      const requestId = 'req-promo-2';
      const periodKey = getCurrentPeriodKey();
      const estimatedCredits = 10;

      db.seed('users/user-promo-already-seen/beta_access/current', createBetaAccess({
        availableCredits: 90,
        reservedCredits: estimatedCredits,
        feedbackPromoSeen: true,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-already-seen/credit_months/${periodKey}`, createCreditMonth({
        availableCredits: 90,
        reservedCredits: estimatedCredits,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-already-seen/credit_events/${requestId}`, createReservedEvent(requestId, estimatedCredits) as unknown as Record<string, unknown>);

      const result = await confirmCredits(
        db as unknown as Parameters<typeof confirmCredits>[0],
        uid,
        requestId,
        5,
      );

      expect(result.success).toBe(true);

      const betaSnap = db.read(`users/${uid}/beta_access/current`);
      expect(betaSnap?.feedbackPromoSeen).toBe(true);
    });

    it('não deve ativar feedbackPromoSeen se saldo total já era zero antes da reserva', async () => {
      const db = new MockFirestore();
      const uid = 'user-promo-already-zero';
      const requestId = 'req-promo-3';
      const periodKey = getCurrentPeriodKey();
      const estimatedCredits = 0;

      // Edge case: saldo já era zero antes de qualquer reserva.
      // Isso não deveria acontecer (reserveCredits falharia), mas testamos defensivamente.
      db.seed('users/user-promo-already-zero/beta_access/current', createBetaAccess({
        availableCredits: 0,
        reservedCredits: 0,
        feedbackPromoSeen: false,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-already-zero/credit_months/${periodKey}`, createCreditMonth({
        availableCredits: 0,
        reservedCredits: 0,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-already-zero/credit_events/${requestId}`, createReservedEvent(requestId, 0) as unknown as Record<string, unknown>);

      const result = await confirmCredits(
        db as unknown as Parameters<typeof confirmCredits>[0],
        uid,
        requestId,
        0,
      );

      expect(result.success).toBe(true);
      expect(result.availableCredits).toBe(0);

      const betaSnap = db.read(`users/${uid}/beta_access/current`);
      // totalBeforeConfirm = 0 + 0 = 0 → NÃO ativa
      expect(betaSnap?.feedbackPromoSeen).toBe(false);
    });

    it('não deve ativar feedbackPromoSeen quando sobram créditos reservados após confirmação', async () => {
      const db = new MockFirestore();
      const uid = 'user-promo-has-reserve';
      const requestId = 'req-promo-4';
      const periodKey = getCurrentPeriodKey();
      const estimatedCredits = 10;

      // Cenário: availableCredits = 0, reservedCredits = 30
      // confirmCredits(10): totalBeforeConfirm = 30 > 0
      // newAvailable = 0, newReserved = 20 → NÃO ativa (ainda tem reserva)
      db.seed('users/user-promo-has-reserve/beta_access/current', createBetaAccess({
        availableCredits: 0,
        reservedCredits: 30,
        feedbackPromoSeen: false,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-has-reserve/credit_months/${periodKey}`, createCreditMonth({
        availableCredits: 0,
        reservedCredits: 30,
      }) as unknown as Record<string, unknown>);
      db.seed(`users/user-promo-has-reserve/credit_events/${requestId}`, createReservedEvent(requestId, estimatedCredits) as unknown as Record<string, unknown>);

      const result = await confirmCredits(
        db as unknown as Parameters<typeof confirmCredits>[0],
        uid,
        requestId,
        estimatedCredits,
      );

      expect(result.success).toBe(true);

      const betaSnap = db.read(`users/${uid}/beta_access/current`);
      // finalReserved = 20 ≠ 0 → NÃO ativa
      expect(betaSnap?.feedbackPromoSeen).toBe(false);
    });
  });
});
