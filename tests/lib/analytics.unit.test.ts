import { beforeEach, describe, expect, it, vi } from 'vitest';

const analytics = {};
const getAnalytics = vi.fn(() => analytics);
const isSupported = vi.fn(async () => true);
const logEvent = vi.fn();
const setAnalyticsCollectionEnabled = vi.fn();
const setConsent = vi.fn();
const setUserId = vi.fn();
const setUserProperties = vi.fn();
let analyticsEnabled = true;

vi.mock('firebase/analytics', () => ({
  getAnalytics,
  isSupported,
  logEvent,
  setAnalyticsCollectionEnabled,
  setConsent,
  setUserId,
  setUserProperties,
}));

vi.mock('../../src/lib/firebase', () => ({ app: {} }));
vi.mock('../../src/lib/env', () => ({
  getFirebaseEnvConfig: () => ({ measurementId: 'G-TEST' }),
  isFirebaseAnalyticsEnabled: () => analyticsEnabled,
}));
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() }),
}));

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
    analyticsEnabled = true;
    isSupported.mockResolvedValue(true);
  });

  it('não envia eventos sem consentimento', async () => {
    const { trackAnalyticsEvent } = await import('../../src/lib/analytics');
    trackAnalyticsEvent('logout', {});
    await flushPromises();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('inicializa e envia eventos após consentimento', async () => {
    const { grantAnalyticsConsent, trackAnalyticsEvent } = await import('../../src/lib/analytics');
    await grantAnalyticsConsent();
    trackAnalyticsEvent('login', { method: 'google' });
    await flushPromises();
    expect(getAnalytics).toHaveBeenCalled();
    expect(setConsent).toHaveBeenCalledWith(expect.objectContaining({ analytics_storage: 'granted' }));
    expect(logEvent).toHaveBeenCalledWith(analytics, 'login', { method: 'google' });
  });

  it('desliga coleta e remove user id ao revogar', async () => {
    const { denyAnalyticsConsent, grantAnalyticsConsent, syncAnalyticsUser } = await import('../../src/lib/analytics');
    await grantAnalyticsConsent();
    syncAnalyticsUser('uid-123');
    await flushPromises();
    await denyAnalyticsConsent();
    expect(setUserId).toHaveBeenCalledWith(analytics, null);
    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(analytics, false);
  });

  it('normaliza falhas sem expor mensagens livres nos eventos', async () => {
    const { categorizeAnalyticsError } = await import('../../src/lib/analytics');
    expect(categorizeAnalyticsError(new Error('deadline exceeded after 504'))).toBe('timeout');
    expect(categorizeAnalyticsError(new Error('permission-denied from AppCheck'))).toBe('app_check');
    expect(categorizeAnalyticsError(new Error('detalhe interno inesperado'))).toBe('unknown');
  });

  it('aplica propriedades acumuladas antes do consentimento', async () => {
    const { grantAnalyticsConsent, setAnalyticsUserProperties } = await import('../../src/lib/analytics');
    setAnalyticsUserProperties({ locale: 'pt-BR', auth_state: 'anonymous' });
    await grantAnalyticsConsent();
    expect(setUserProperties).toHaveBeenCalledWith(analytics, {
      locale: 'pt-BR',
      auth_state: 'anonymous',
    });
  });

  it('não inicializa em ambiente desabilitado', async () => {
    analyticsEnabled = false;
    const { grantAnalyticsConsent } = await import('../../src/lib/analytics');
    await grantAnalyticsConsent();
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it('reativa a coleta após consentimento revogado', async () => {
    const { denyAnalyticsConsent, grantAnalyticsConsent } = await import('../../src/lib/analytics');
    await grantAnalyticsConsent();
    await denyAnalyticsConsent();
    await grantAnalyticsConsent();
    expect(getAnalytics).toHaveBeenCalledTimes(2);
    expect(setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(analytics, true);
  });

  it('tenta inicializar novamente após suporte inicialmente indisponível', async () => {
    isSupported.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { grantAnalyticsConsent } = await import('../../src/lib/analytics');
    await grantAnalyticsConsent();
    await grantAnalyticsConsent();
    expect(isSupported).toHaveBeenCalledTimes(2);
    expect(getAnalytics).toHaveBeenCalledTimes(1);
  });
});
