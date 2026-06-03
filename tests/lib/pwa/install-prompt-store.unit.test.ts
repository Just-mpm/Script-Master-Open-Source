/**
 * Testes unitários do store singleton de install prompt PWA.
 *
 * O store mantém estado em escopo de módulo (`deferredPrompt`,
 * `captureTimestamp`, `listeners`) e persiste preferências em `localStorage`
 * com prefixo `s2a_pwa_*`. Para isolar testes, usamos `vi.resetModules()`
 * + import dinâmico, garantindo uma instância nova a cada cenário.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BeforeInstallPromptEvent } from '../../../src/types/pwa';

// Mock do logger para evitar side effects (error tracking, console) nos testes.
vi.mock('../../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  }),
}));

/** Cria um `BeforeInstallPromptEvent` mínimo para satisfazer a tipagem. */
function createDeferredPrompt(): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  Object.defineProperty(event, 'platforms', { value: ['web'] });
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
  });
  Object.defineProperty(event, 'prompt', { value: vi.fn().mockResolvedValue(undefined) });
  return event;
}

/** Configura `window.matchMedia` retornando o `matches` desejado. */
function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('install-prompt-store', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
    // navigator.standalone começa undefined em jsdom — força estado conhecido.
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: undefined,
      writable: true,
    });
    vi.resetModules();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Constantes públicas
  // ---------------------------------------------------------------------------

  describe('constantes', () => {
    it('exporta COOLDOWN_MS, MAX_DISMISSALS e SHOW_DELAY_MS com valores do plano', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000);
      expect(store.MAX_DISMISSALS).toBe(3);
      expect(store.SHOW_DELAY_MS).toBe(3_000);
    });

    it('STORAGE_KEYS contém as 4 chaves com prefixo s2a_pwa_', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.STORAGE_KEYS).toEqual({
        INSTALLED: 's2a_pwa_installed',
        DISMISSED_AT: 's2a_pwa_install_dismissed_at',
        DISMISSED_COUNT: 's2a_pwa_install_dismissed_count',
        DISMISSED_FOREVER: 's2a_pwa_install_dismissed_forever',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getInstallState — elegibilidade
  // ---------------------------------------------------------------------------

  describe('getInstallState — elegibilidade', () => {
    it('canShow=false e isInstalled=true quando está em modo standalone', async () => {
      mockMatchMedia(true);
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const state = store.getInstallState();
      expect(state).toEqual({ canShow: false, isInstalled: true });
    });

    it('canShow=false e isInstalled=true quando navigator.standalone é true', async () => {
      mockMatchMedia(false);
      Object.defineProperty(navigator, 'standalone', {
        configurable: true,
        value: true,
        writable: true,
      });
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.getInstallState()).toEqual({ canShow: false, isInstalled: true });
    });

    it('canShow=false e isInstalled=true quando flag INSTALLED=true no localStorage', async () => {
      localStorage.setItem('s2a_pwa_installed', 'true');
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.getInstallState()).toEqual({ canShow: false, isInstalled: true });
    });

    it('canShow=false quando DISMISSED_FOREVER=true', async () => {
      localStorage.setItem('s2a_pwa_install_dismissed_forever', 'true');
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.getInstallState()).toEqual({ canShow: false, isInstalled: false });
    });

    it('canShow=false quando cooldown de 7 dias não expirou', async () => {
      const now = Date.now();
      localStorage.setItem('s2a_pwa_install_dismissed_at', String(now - 60_000));
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.getInstallState()).toEqual({ canShow: false, isInstalled: false });
    });

    it('canShow=true quando cooldown já expirou (mais de 7 dias) e há deferredPrompt', async () => {
      const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        's2a_pwa_install_dismissed_at',
        String(Date.now() - eightDaysMs),
      );
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      expect(store.getInstallState()).toEqual({ canShow: true, isInstalled: false });
    });

    it('canShow=false quando contador >= MAX_DISMISSALS', async () => {
      localStorage.setItem('s2a_pwa_install_dismissed_count', '3');
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.getInstallState()).toEqual({ canShow: false, isInstalled: false });
    });

    it('canShow=true quando deferredPrompt existe e sem nenhum bloqueio', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      expect(store.getInstallState()).toEqual({ canShow: true, isInstalled: false });
    });

    it('canShow=false quando deferredPrompt é null', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.getInstallState()).toEqual({ canShow: false, isInstalled: false });
    });
  });

  // ---------------------------------------------------------------------------
  // getInstallState — precedência das regras
  // ---------------------------------------------------------------------------

  describe('getInstallState — precedência', () => {
    it('standalone prevalece sobre flag INSTALLED e DISMISSED_FOREVER', async () => {
      mockMatchMedia(true);
      localStorage.setItem('s2a_pwa_installed', 'true');
      localStorage.setItem('s2a_pwa_install_dismissed_forever', 'true');
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const state = store.getInstallState();
      expect(state.isInstalled).toBe(true);
      expect(state.canShow).toBe(false);
    });

    it('DISMISSED_FOREVER prevalece sobre cooldown e contador', async () => {
      localStorage.setItem('s2a_pwa_install_dismissed_forever', 'true');
      localStorage.setItem('s2a_pwa_install_dismissed_count', '99');
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.getInstallState()).toEqual({ canShow: false, isInstalled: false });
    });
  });

  // ---------------------------------------------------------------------------
  // getInstallState — resiliência a localStorage inacessível
  // ---------------------------------------------------------------------------

  describe('getInstallState — resiliência', () => {
    it('trata localStorage inacessível como elegível quando há deferredPrompt', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      // Simula falha em TODAS as leituras
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn().mockImplementation(() => {
        throw new Error('SecurityError');
      });
      try {
        const state = store.getInstallState();
        expect(state.canShow).toBe(true);
        expect(state.isInstalled).toBe(false);
      } finally {
        Storage.prototype.getItem = originalGetItem;
      }
    });

    it('trata localStorage inacessível como count=0 (sem bloqueio) quando não há deferredPrompt', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn().mockImplementation(() => {
        throw new Error('SecurityError');
      });
      try {
        const state = store.getInstallState();
        expect(state.canShow).toBe(false);
        expect(state.isInstalled).toBe(false);
      } finally {
        Storage.prototype.getItem = originalGetItem;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Persistência: recordDismiss
  // ---------------------------------------------------------------------------

  describe('recordDismiss', () => {
    it('grava timestamp e incrementa contador a partir de 0', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.recordDismiss();

      const dismissedAt = localStorage.getItem('s2a_pwa_install_dismissed_at');
      const count = localStorage.getItem('s2a_pwa_install_dismissed_count');
      expect(dismissedAt).not.toBeNull();
      expect(Number(dismissedAt)).toBeGreaterThan(0);
      expect(count).toBe('1');
    });

    it('incrementa contador existente (não sobrescreve)', async () => {
      localStorage.setItem('s2a_pwa_install_dismissed_count', '1');
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.recordDismiss();
      expect(localStorage.getItem('s2a_pwa_install_dismissed_count')).toBe('2');
    });

    it('marca DISMISSED_FOREVER=true ao atingir MAX_DISMISSALS=3', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.recordDismiss();
      store.recordDismiss();
      store.recordDismiss();
      expect(localStorage.getItem('s2a_pwa_install_dismissed_count')).toBe('3');
      expect(localStorage.getItem('s2a_pwa_install_dismissed_forever')).toBe('true');
    });

    it('não marca DISMISSED_FOREVER quando ainda está abaixo de MAX_DISMISSALS', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.recordDismiss();
      store.recordDismiss();
      expect(localStorage.getItem('s2a_pwa_install_dismissed_forever')).toBeNull();
    });

    it('libera deferredPrompt após recordDismiss', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const prompt = createDeferredPrompt();
      store.setDeferredPrompt(prompt);
      expect(store.getDeferredPrompt()).toBe(prompt);
      store.recordDismiss();
      expect(store.getDeferredPrompt()).toBeNull();
    });

    it('não lança quando localStorage está inacessível', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
      try {
        expect(() => store.recordDismiss()).not.toThrow();
      } finally {
        Storage.prototype.setItem = originalSetItem;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Persistência: recordInstalled
  // ---------------------------------------------------------------------------

  describe('recordInstalled', () => {
    it('grava INSTALLED=true', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.recordInstalled();
      expect(localStorage.getItem('s2a_pwa_installed')).toBe('true');
    });

    it('limpa flags de recusa (DISMISSED_AT, COUNT, FOREVER)', async () => {
      localStorage.setItem('s2a_pwa_install_dismissed_at', String(Date.now()));
      localStorage.setItem('s2a_pwa_install_dismissed_count', '2');
      localStorage.setItem('s2a_pwa_install_dismissed_forever', 'true');

      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.recordInstalled();

      expect(localStorage.getItem('s2a_pwa_install_dismissed_at')).toBeNull();
      expect(localStorage.getItem('s2a_pwa_install_dismissed_count')).toBeNull();
      expect(localStorage.getItem('s2a_pwa_install_dismissed_forever')).toBeNull();
    });

    it('libera deferredPrompt', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      store.recordInstalled();
      expect(store.getDeferredPrompt()).toBeNull();
    });

    it('reflete no getInstallState como isInstalled=true', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      store.recordInstalled();
      expect(store.getInstallState()).toEqual({ canShow: false, isInstalled: true });
    });
  });

  // ---------------------------------------------------------------------------
  // setDeferredPrompt / clearDeferredPrompt
  // ---------------------------------------------------------------------------

  describe('setDeferredPrompt / clearDeferredPrompt', () => {
    it('setDeferredPrompt armazena o evento e getDeferredPrompt o retorna', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const prompt = createDeferredPrompt();
      store.setDeferredPrompt(prompt);
      expect(store.getDeferredPrompt()).toBe(prompt);
    });

    it('clearDeferredPrompt limpa o evento armazenado', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      store.clearDeferredPrompt();
      expect(store.getDeferredPrompt()).toBeNull();
    });

    it('clearDeferredPrompt é idempotente (não notifica quando já estava null)', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribe(listener);
      // Não deve notificar — não havia estado para limpar
      store.clearDeferredPrompt();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Pub/sub
  // ---------------------------------------------------------------------------

  describe('pub/sub', () => {
    it('subscribe notifica listeners em setDeferredPrompt', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribe(listener);
      store.setDeferredPrompt(createDeferredPrompt());
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ canShow: true, isInstalled: false });
    });

    it('subscribe notifica listeners em clearDeferredPrompt', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribe(listener);
      store.setDeferredPrompt(createDeferredPrompt());
      listener.mockClear();
      store.clearDeferredPrompt();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('subscribe notifica listeners em recordDismiss quando há deferredPrompt', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribe(listener);
      // Precisa de deferredPrompt porque recordDismiss -> clearDeferredPrompt,
      // que é no-op (e não notifica) quando nada foi capturado.
      store.setDeferredPrompt(createDeferredPrompt());
      listener.mockClear();
      store.recordDismiss();
      expect(listener).toHaveBeenCalled();
    });

    it('subscribe notifica listeners em recordInstalled quando há deferredPrompt', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribe(listener);
      store.setDeferredPrompt(createDeferredPrompt());
      listener.mockClear();
      store.recordInstalled();
      expect(listener).toHaveBeenCalled();
    });

    it('subscribe retorna função de unsubscribe que remove o listener', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      unsubscribe();
      store.setDeferredPrompt(createDeferredPrompt());
      expect(listener).not.toHaveBeenCalled();
    });

    it('listener que lança exceção não impede outros listeners', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const broken = vi.fn().mockImplementation(() => {
        throw new Error('listener quebrado');
      });
      const ok = vi.fn();
      store.subscribe(broken);
      store.subscribe(ok);
      store.setDeferredPrompt(createDeferredPrompt());
      expect(broken).toHaveBeenCalledTimes(1);
      expect(ok).toHaveBeenCalledTimes(1);
    });

    it('notify não é chamado quando não há listeners registrados', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      // Sem subscribe — setDeferredPrompt não deve falhar
      expect(() => store.setDeferredPrompt(createDeferredPrompt())).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // shouldDelayShow
  // ---------------------------------------------------------------------------

  describe('shouldDelayShow', () => {
    it('retorna true quando nenhum evento foi capturado (captureTimestamp=null)', async () => {
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      expect(store.shouldDelayShow()).toBe(true);
    });

    it('retorna true quando evento foi capturado há menos de SHOW_DELAY_MS', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-03T12:00:00Z'));
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      vi.advanceTimersByTime(2_000);
      expect(store.shouldDelayShow()).toBe(true);
    });

    it('retorna false quando evento foi capturado há mais de SHOW_DELAY_MS', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-03T12:00:00Z'));
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      vi.advanceTimersByTime(3_001);
      expect(store.shouldDelayShow()).toBe(false);
    });

    it('retorna false quando evento foi capturado há exatamente SHOW_DELAY_MS', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-03T12:00:00Z'));
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      store.setDeferredPrompt(createDeferredPrompt());
      vi.advanceTimersByTime(3_000);
      // 3000 < 3000 é falso, então retorna false
      expect(store.shouldDelayShow()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // subscribeDelayResolved + agendamento de setTimeout (GAP-17)
  // ---------------------------------------------------------------------------

  describe('subscribeDelayResolved (GAP-17)', () => {
    it('setDeferredPrompt agenda setTimeout e dispara listener após SHOW_DELAY_MS', async () => {
      vi.useFakeTimers();
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribeDelayResolved(listener);
      store.setDeferredPrompt(createDeferredPrompt());
      // Antes do timeout, nada foi disparado
      vi.advanceTimersByTime(store.SHOW_DELAY_MS - 1);
      expect(listener).not.toHaveBeenCalled();
      // Após SHOW_DELAY_MS, o listener é chamado
      vi.advanceTimersByTime(1);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('clearDeferredPrompt cancela o setTimeout pendente (não dispara listener)', async () => {
      vi.useFakeTimers();
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribeDelayResolved(listener);
      store.setDeferredPrompt(createDeferredPrompt());
      store.clearDeferredPrompt();
      vi.advanceTimersByTime(store.SHOW_DELAY_MS + 1_000);
      expect(listener).not.toHaveBeenCalled();
    });

    it('recordDismiss cancela o setTimeout (banner dispensado não dispara delay)', async () => {
      vi.useFakeTimers();
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribeDelayResolved(listener);
      store.setDeferredPrompt(createDeferredPrompt());
      store.recordDismiss();
      vi.advanceTimersByTime(store.SHOW_DELAY_MS + 1_000);
      expect(listener).not.toHaveBeenCalled();
    });

    it('recordInstalled cancela o setTimeout', async () => {
      vi.useFakeTimers();
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribeDelayResolved(listener);
      store.setDeferredPrompt(createDeferredPrompt());
      store.recordInstalled();
      vi.advanceTimersByTime(store.SHOW_DELAY_MS + 1_000);
      expect(listener).not.toHaveBeenCalled();
    });

    it('nova chamada de setDeferredPrompt reseta o setTimeout (não dispara duas vezes)', async () => {
      vi.useFakeTimers();
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      store.subscribeDelayResolved(listener);
      store.setDeferredPrompt(createDeferredPrompt());
      // Avança metade do delay e captura novamente
      vi.advanceTimersByTime(store.SHOW_DELAY_MS / 2);
      store.setDeferredPrompt(createDeferredPrompt());
      // Avança o resto do delay original (deveria disparar se não tivesse sido resetado)
      vi.advanceTimersByTime(store.SHOW_DELAY_MS / 2);
      expect(listener).not.toHaveBeenCalled();
      // Agora avança o segundo delay completo
      vi.advanceTimersByTime(store.SHOW_DELAY_MS);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('subscribeDelayResolved retorna função de unsubscribe que remove o listener', async () => {
      vi.useFakeTimers();
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const listener = vi.fn();
      const unsubscribe = store.subscribeDelayResolved(listener);
      unsubscribe();
      store.setDeferredPrompt(createDeferredPrompt());
      vi.advanceTimersByTime(store.SHOW_DELAY_MS + 1_000);
      expect(listener).not.toHaveBeenCalled();
    });

    it('listener que lança exceção não impede outros listeners', async () => {
      vi.useFakeTimers();
      const store = await import('../../../src/lib/pwa/install-prompt-store');
      const broken = vi.fn().mockImplementation(() => {
        throw new Error('listener quebrado');
      });
      const ok = vi.fn();
      store.subscribeDelayResolved(broken);
      store.subscribeDelayResolved(ok);
      store.setDeferredPrompt(createDeferredPrompt());
      vi.advanceTimersByTime(store.SHOW_DELAY_MS);
      expect(broken).toHaveBeenCalledTimes(1);
      expect(ok).toHaveBeenCalledTimes(1);
    });
  });
});
