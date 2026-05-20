import { describe, expect, it } from 'vitest';
import {
  getCallableErrorInfo,
  isCallableCancelledError,
  isCreditCallableError,
} from '../../src/lib/callable-errors';

describe('callable-errors', () => {
  it('deve ler details no nível principal do erro callable', () => {
    const info = getCallableErrorInfo({
      code: 'functions/failed-precondition',
      message: 'Saldo insuficiente',
      details: {
        code: 'INSUFFICIENT_CREDITS',
        availableCredits: 3,
      },
    });

    expect(info.firebaseCode).toBe('functions/failed-precondition');
    expect(info.detailCode).toBe('INSUFFICIENT_CREDITS');
    expect(info.details?.availableCredits).toBe(3);
  });

  it('deve manter compatibilidade defensiva com customData.details', () => {
    const info = getCallableErrorInfo({
      code: 'functions/failed-precondition',
      message: 'Saldo insuficiente',
      customData: {
        details: {
          code: 'INSUFFICIENT_CREDITS',
        },
      },
    });

    expect(info.detailCode).toBe('INSUFFICIENT_CREDITS');
  });

  it('deve reconhecer erros estruturados de crédito', () => {
    expect(isCreditCallableError({
      code: 'functions/failed-precondition',
      message: 'Saldo insuficiente',
      details: {
        code: 'CREDITS_CHANGED_AFTER_PREFLIGHT',
      },
    })).toBe(true);
  });

  it('deve reconhecer cancelamento estruturado', () => {
    expect(isCallableCancelledError({
      code: 'functions/cancelled',
      message: 'Operação cancelada',
      details: {
        code: 'USER_CANCELLED',
      },
    })).toBe(true);
  });
});
