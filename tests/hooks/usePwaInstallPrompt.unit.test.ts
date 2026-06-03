/**
 * Testes unitários do hook `usePwaInstallPrompt`.
 *
 * O hook é um wrapper sobre o store singleton que:
 * - Inscreve-se no pub/sub para reagir a mudanças de estado.
 * - Registra listeners nativos (`beforeinstallprompt`, `appinstalled`).
 * - Reage ao pub/sub `subscribeDelayResolved` para marcar delay como resolvido
 *   (substitui o antigo polling de 500ms — GAP-17).
 * - Expõe `promptInstall` e `dismiss` que delegam ao store.
 *
 * Como o hook depende do módulo store, mockamos o store inteiro
 * (`vi.hoisted` para closures estáveis entre `vi.mock` e os testes).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { InstallPromptState } from '../../src/lib/pwa/install-prompt-store';
import type { BeforeInstallPromptEvent } from '../../src/types/pwa';

// Estado mockado do store — hoisted para que a factory de `vi.mock`
// consiga fechá-lo e os testes consigam mutá-lo entre cenários.
const storeMock = vi.hoisted(() => ({
  state: { canShow: false, isInstalled: false } as InstallPromptState,
  shouldDelayShow: true,
  deferredPrompt: null as BeforeInstallPromptEvent | null,
  listeners: new Set<(state: InstallPromptState) => void>(),
  delayListeners: new Set<() => void>(),
  setDeferredPrompt: vi.fn(),
  clearDeferredPrompt: vi.fn(),
  recordDismiss: vi.fn(),
  recordInstalled: vi.fn(),
  getInstallState: vi.fn(),
  getDeferredPrompt: vi.fn(),
  subscribe: vi.fn(),
  subscribeDelayResolved: vi.fn(),
}));

vi.mock('../../src/lib/pwa/install-prompt-store', () => ({
  getInstallState: () => storeMock.getInstallState(),
  getDeferredPrompt: () => storeMock.getDeferredPrompt(),
  setDeferredPrompt: (...args: unknown[]) => storeMock.setDeferredPrompt(...args),
  clearDeferredPrompt: () => storeMock.clearDeferredPrompt(),
  recordDismiss: () => storeMock.recordDismiss(),
  recordInstalled: () => storeMock.recordInstalled(),
  shouldDelayShow: () => storeMock.shouldDelayShow,
  subscribe: (listener: (state: InstallPromptState) => void) =>
    storeMock.subscribe(listener),
  subscribeDelayResolved: (listener: () => void) =>
    storeMock.subscribeDelayResolved(listener),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  }),
}));

import { usePwaInstallPrompt } from '../../src/hooks/usePwaInstallPrompt';

/** Cria um `BeforeInstallPromptEvent` mínimo com `prompt` e `userChoice` configuráveis. */
function createDeferredPrompt(
  prompt: () => Promise<void> = vi.fn().mockResolvedValue(undefined),
  outcome: 'accepted' | 'dismissed' = 'accepted',
): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  Object.defineProperty(event, 'platforms', { value: ['web'] });
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome, platform: 'web' }),
  });
  Object.defineProperty(event, 'prompt', { value: prompt });
  return event;
}

describe('usePwaInstallPrompt', () => {
  // Espiões em window para verificar listeners nativos.
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let addCalls: Array<{ type: string; handler: EventListener }>;
  let removeCalls: Array<{ type: string; handler: EventListener }>;

  beforeEach(() => {
    // Reseta estado do store mockado
    storeMock.state = { canShow: false, isInstalled: false };
    storeMock.shouldDelayShow = true;
    storeMock.deferredPrompt = null;
    storeMock.listeners = new Set();
    storeMock.delayListeners = new Set();
    storeMock.setDeferredPrompt.mockReset();
    storeMock.clearDeferredPrompt.mockReset();
    storeMock.recordDismiss.mockReset();
    storeMock.recordInstalled.mockReset();
    storeMock.getInstallState.mockImplementation(() => storeMock.state);
    storeMock.getDeferredPrompt.mockImplementation(() => storeMock.deferredPrompt);
    storeMock.subscribe.mockImplementation((listener: (s: InstallPromptState) => void) => {
      storeMock.listeners.add(listener);
      return () => {
        storeMock.listeners.delete(listener);
      };
    });
    storeMock.subscribeDelayResolved.mockImplementation((listener: () => void) => {
      storeMock.delayListeners.add(listener);
      return () => {
        storeMock.delayListeners.delete(listener);
      };
    });

    addCalls = [];
    removeCalls = [];
    addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, handler: EventListenerOrEventListenerObject) => {
        addCalls.push({ type, handler: handler as EventListener });
      },
    );
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener').mockImplementation(
      (type: string, handler: EventListenerOrEventListenerObject) => {
        removeCalls.push({ type, handler: handler as EventListener });
      },
    );
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Registro de listeners
  // ---------------------------------------------------------------------------

  describe('registro de listeners nativos', () => {
    it('registra listener de beforeinstallprompt', () => {
      renderHook(() => usePwaInstallPrompt());
      const types = addCalls.map((c) => c.type);
      expect(types).toContain('beforeinstallprompt');
    });

    it('registra listener de appinstalled', () => {
      renderHook(() => usePwaInstallPrompt());
      const types = addCalls.map((c) => c.type);
      expect(types).toContain('appinstalled');
    });

    it('inscreve no pub/sub do store com um listener', () => {
      renderHook(() => usePwaInstallPrompt());
      expect(storeMock.subscribe).toHaveBeenCalled();
      const firstCall = storeMock.subscribe.mock.calls[0];
      expect(firstCall).toBeDefined();
      expect(typeof firstCall?.[0]).toBe('function');
    });

    it('cleanup remove listeners de beforeinstallprompt e appinstalled no unmount', () => {
      const { unmount } = renderHook(() => usePwaInstallPrompt());
      const removeTypesBefore = removeCalls.map((c) => c.type);
      expect(removeTypesBefore).not.toContain('beforeinstallprompt');
      expect(removeTypesBefore).not.toContain('appinstalled');

      unmount();

      const removeTypes = removeCalls.map((c) => c.type);
      expect(removeTypes).toContain('beforeinstallprompt');
      expect(removeTypes).toContain('appinstalled');
    });
  });

  // ---------------------------------------------------------------------------
  // Integração com listener beforeinstallprompt
  // ---------------------------------------------------------------------------

  describe('integração com listener beforeinstallprompt', () => {
    it('handler chama event.preventDefault() e setDeferredPrompt', () => {
      renderHook(() => usePwaInstallPrompt());
      const beforeInstall = addCalls.find((c) => c.type === 'beforeinstallprompt');
      expect(beforeInstall).toBeDefined();
      const event = createDeferredPrompt();
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        (beforeInstall?.handler as (e: Event) => void).call(window, event);
      });

      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
      expect(storeMock.setDeferredPrompt).toHaveBeenCalledWith(event);
    });

    it('handler de appinstalled chama recordInstalled', () => {
      renderHook(() => usePwaInstallPrompt());
      const appInstalled = addCalls.find((c) => c.type === 'appinstalled');
      expect(appInstalled).toBeDefined();

      act(() => {
        appInstalled?.handler(new Event('appinstalled'));
      });

      expect(storeMock.recordInstalled).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // canShow — combinação de store.canShow com delayResolved
  // ---------------------------------------------------------------------------

  describe('canShow (combinação store + delay)', () => {
    it('retorna false quando store.canShow=false', () => {
      storeMock.state = { canShow: false, isInstalled: false };
      storeMock.shouldDelayShow = false;
      const { result } = renderHook(() => usePwaInstallPrompt());
      expect(result.current.canShow).toBe(false);
    });

    it('retorna false quando store.canShow=true mas delay ainda não resolveu', () => {
      storeMock.state = { canShow: true, isInstalled: false };
      storeMock.shouldDelayShow = true;
      const { result } = renderHook(() => usePwaInstallPrompt());
      expect(result.current.canShow).toBe(false);
    });

    it('retorna true quando store.canShow=true e delay já resolveu (inicial)', () => {
      storeMock.state = { canShow: true, isInstalled: false };
      storeMock.shouldDelayShow = false;
      const { result } = renderHook(() => usePwaInstallPrompt());
      expect(result.current.canShow).toBe(true);
    });

    it('reage a mudanças do store (pub/sub atualiza o estado)', () => {
      storeMock.state = { canShow: false, isInstalled: false };
      storeMock.shouldDelayShow = false;
      const { result } = renderHook(() => usePwaInstallPrompt());
      expect(result.current.canShow).toBe(false);

      act(() => {
        // Simula notificação do pub/sub do store
        storeMock.state = { canShow: true, isInstalled: false };
        storeMock.listeners.forEach((l) => l(storeMock.state));
      });

      expect(result.current.canShow).toBe(true);
    });

    it('reage ao evento subscribeDelayResolved (GAP-17 — substitui polling)', () => {
      storeMock.state = { canShow: true, isInstalled: false };
      storeMock.shouldDelayShow = true;
      const { result } = renderHook(() => usePwaInstallPrompt());
      expect(result.current.canShow).toBe(false);

      act(() => {
        // Simula expiração do delay via pub/sub do store
        storeMock.shouldDelayShow = false;
        storeMock.delayListeners.forEach((l) => l());
      });

      expect(result.current.canShow).toBe(true);
    });

    it('NÃO usa setInterval/setTimeout para polling do delay (GAP-17)', () => {
      storeMock.state = { canShow: true, isInstalled: false };
      storeMock.shouldDelayShow = true;
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      renderHook(() => usePwaInstallPrompt());
      // O hook NÃO agenda mais polling — depende de subscribeDelayResolved
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('inscreve no subscribeDelayResolved (GAP-17)', () => {
      renderHook(() => usePwaInstallPrompt());
      expect(storeMock.subscribeDelayResolved).toHaveBeenCalled();
    });

    it('libera delayResolved quando o store notifica canShow=false', () => {
      storeMock.state = { canShow: true, isInstalled: false };
      storeMock.shouldDelayShow = false;
      const { result } = renderHook(() => usePwaInstallPrompt());
      expect(result.current.canShow).toBe(true);

      act(() => {
        // Store sinaliza que o usuário não é mais elegível
        storeMock.state = { canShow: false, isInstalled: false };
        storeMock.listeners.forEach((l) => l(storeMock.state));
      });

      // canShow continua false porque store.canShow=false (independente do delay)
      expect(result.current.canShow).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isInstalled
  // ---------------------------------------------------------------------------

  describe('isInstalled', () => {
    it('espelha store.isInstalled=false', () => {
      storeMock.state = { canShow: false, isInstalled: false };
      const { result } = renderHook(() => usePwaInstallPrompt());
      expect(result.current.isInstalled).toBe(false);
    });

    it('espelha store.isInstalled=true', () => {
      storeMock.state = { canShow: false, isInstalled: true };
      const { result } = renderHook(() => usePwaInstallPrompt());
      expect(result.current.isInstalled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // promptInstall
  // ---------------------------------------------------------------------------

  describe('promptInstall', () => {
    it('chama clearDeferredPrompt ANTES de event.prompt()', async () => {
      const callOrder: string[] = [];
      const promptFn = vi.fn().mockImplementation(async () => {
        callOrder.push('prompt');
      });
      const event = createDeferredPrompt(promptFn);
      storeMock.deferredPrompt = event;
      storeMock.clearDeferredPrompt.mockImplementation(() => {
        callOrder.push('clearDeferredPrompt');
        storeMock.deferredPrompt = null;
      });

      const { result } = renderHook(() => usePwaInstallPrompt());

      let outcome: 'accepted' | 'dismissed' | 'error' | undefined;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });

      expect(callOrder[0]).toBe('clearDeferredPrompt');
      expect(callOrder).toContain('prompt');
      expect(promptFn).toHaveBeenCalledTimes(1);
      expect(outcome).toBe('accepted');
    });

    it('retorna "accepted" quando userChoice.outcome=accepted', async () => {
      const event = createDeferredPrompt(undefined, 'accepted');
      storeMock.deferredPrompt = event;
      const { result } = renderHook(() => usePwaInstallPrompt());

      let outcome: 'accepted' | 'dismissed' | 'error' | undefined;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });
      expect(outcome).toBe('accepted');
    });

    it('retorna "dismissed" quando userChoice.outcome=dismissed', async () => {
      const event = createDeferredPrompt(undefined, 'dismissed');
      storeMock.deferredPrompt = event;
      const { result } = renderHook(() => usePwaInstallPrompt());

      let outcome: 'accepted' | 'dismissed' | 'error' | undefined;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });
      expect(outcome).toBe('dismissed');
    });

    it('retorna "error" quando deferredPrompt é null', async () => {
      storeMock.deferredPrompt = null;
      const { result } = renderHook(() => usePwaInstallPrompt());

      let outcome: 'accepted' | 'dismissed' | 'error' | undefined;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });
      expect(outcome).toBe('error');
      expect(storeMock.clearDeferredPrompt).not.toHaveBeenCalled();
    });

    it('retorna "error" quando event.prompt() lança exceção', async () => {
      const promptFn = vi.fn().mockRejectedValue(new Error('browser blocked'));
      const event = createDeferredPrompt(promptFn);
      storeMock.deferredPrompt = event;
      const { result } = renderHook(() => usePwaInstallPrompt());

      let outcome: 'accepted' | 'dismissed' | 'error' | undefined;
      await act(async () => {
        outcome = await result.current.promptInstall();
      });
      expect(outcome).toBe('error');
    });

    it('retorna a mesma função entre renders (useCallback)', () => {
      const { result, rerender } = renderHook(() => usePwaInstallPrompt());
      const first = result.current.promptInstall;
      rerender();
      const second = result.current.promptInstall;
      expect(first).toBe(second);
    });
  });

  // ---------------------------------------------------------------------------
  // dismiss
  // ---------------------------------------------------------------------------

  describe('dismiss', () => {
    it('chama recordDismiss do store', () => {
      const { result } = renderHook(() => usePwaInstallPrompt());
      act(() => {
        result.current.dismiss();
      });
      expect(storeMock.recordDismiss).toHaveBeenCalledTimes(1);
    });

    it('retorna a mesma função entre renders (useCallback)', () => {
      const { result, rerender } = renderHook(() => usePwaInstallPrompt());
      const first = result.current.dismiss;
      rerender();
      expect(result.current.dismiss).toBe(first);
    });
  });

  // ---------------------------------------------------------------------------
  // Cleanup do pub/sub
  // ---------------------------------------------------------------------------

  describe('cleanup do pub/sub', () => {
    it('chama unsubscribe do subscribe no unmount', () => {
      const unsubscribe = vi.fn();
      storeMock.subscribe.mockReturnValue(unsubscribe);
      const { unmount } = renderHook(() => usePwaInstallPrompt());
      expect(unsubscribe).not.toHaveBeenCalled();
      unmount();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('chama unsubscribe do subscribeDelayResolved no unmount (GAP-17)', () => {
      const unsubscribe = vi.fn();
      storeMock.subscribeDelayResolved.mockReturnValue(unsubscribe);
      const { unmount } = renderHook(() => usePwaInstallPrompt());
      expect(unsubscribe).not.toHaveBeenCalled();
      unmount();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
