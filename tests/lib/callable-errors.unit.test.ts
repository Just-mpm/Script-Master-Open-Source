import { describe, expect, it } from 'vitest';
import {
  getCallableErrorInfo,
  isCallableCancelledError,
} from '../../src/lib/callable-errors';

describe('callable-errors', () => {
  it('deve ler details no nível principal do erro callable', () => {
    const info = getCallableErrorInfo({
      code: 'functions/invalid-argument',
      message: 'Payload inválido',
      details: {
        code: 'INVALID_PAYLOAD',
        field: 'script',
      },
    });

    expect(info.firebaseCode).toBe('functions/invalid-argument');
    expect(info.detailCode).toBe('INVALID_PAYLOAD');
    expect(info.details?.field).toBe('script');
  });

  it('deve manter compatibilidade defensiva com customData.details', () => {
    const info = getCallableErrorInfo({
      code: 'functions/invalid-argument',
      message: 'Payload inválido',
      customData: {
        details: {
          code: 'INVALID_PAYLOAD',
        },
      },
    });

    expect(info.detailCode).toBe('INVALID_PAYLOAD');
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
