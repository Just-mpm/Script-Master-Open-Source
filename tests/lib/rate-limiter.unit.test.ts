import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, type RateLimiterConfig } from '../../src/lib/rate-limiter';

// Mock logger para evitar poluição
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna resultado na primeira tentativa quando fn não falha', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);

    expect(result.value).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retorna resultado após retry quando fn falha com erro transitório (string com keyword)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('quota exceeded'))
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 50, jitterMs: 0 });
    const result = await promise;

    expect(result.value).toBe('recovered');
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('lança erro imediatamente para erro sem status transitório nem keyword', async () => {
    const error = new Error('algo errado');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn)).rejects.toThrow('algo errado');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('detecta retryable error via propriedade status em objeto simples', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 429, message: 'rate limited' })
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 50, jitterMs: 0 });
    const result = await promise;

    expect(result.value).toBe('ok');
  });

  it('detecta retryable error via propriedade code em objeto simples', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ code: 503, message: 'unavailable' })
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 50, jitterMs: 0 });
    const result = await promise;

    expect(result.value).toBe('ok');
  });

  it('retenta até o máximo de tentativas para erro transitório', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('quota exceeded'));

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 50, jitterMs: 0 });
    await expect(promise).rejects.toThrow('quota exceeded');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respeita maxRetries=1 (sem retry)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('quota'));

    await expect(withRetry(fn, { maxRetries: 1 })).rejects.toThrow('quota');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('usa config padrão quando não informada', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result.attempts).toBe(1);
  });

  it('detecta retryable error via mensagem com keyword "deadline"', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('deadline exceeded'))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 50, jitterMs: 0 });
    const result = await promise;

    expect(result.value).toBe('ok');
  });

  it('detecta retryable error via mensagem com keyword "unavailable"', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('service unavailable'))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 50, jitterMs: 0 });
    const result = await promise;

    expect(result.value).toBe('ok');
  });

  it('detecta retryable error via mensagem com keyword "resource_exhausted"', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('RESOURCE_EXHAUSTED'))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 50, jitterMs: 0 });
    const result = await promise;

    expect(result.value).toBe('ok');
  });
});
