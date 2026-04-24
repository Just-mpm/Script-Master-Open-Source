import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../../src/hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(globalThis as Record<string, unknown>, 'navigator') ? true : true;

  let dispatchOnlineEvent: () => void;
  let dispatchOfflineEvent: () => void;

  beforeEach(() => {
    // Garante estado online inicial
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    // Mock de event listeners
    const listeners: Record<string, Array<() => void>> = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: EventListenerOrEventListenerObject) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler as () => void);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((event: string, handler: EventListenerOrEventListenerObject) => {
      const arr = listeners[event];
      if (arr) {
        const idx = arr.indexOf(handler as () => void);
        if (idx >= 0) arr.splice(idx, 1);
      }
    });

    dispatchOnlineEvent = () => {
      listeners['online']?.forEach(fn => fn());
    };
    dispatchOfflineEvent = () => {
      listeners['offline']?.forEach(fn => fn());
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve retornar true quando navigator.onLine é true', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('deve registrar event listeners online/offline na montagem', () => {
    renderHook(() => useOnlineStatus());
    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('deve atualizar para false quando evento offline é disparado', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      dispatchOfflineEvent();
    });

    expect(result.current).toBe(false);
  });

  it('deve atualizar para true quando evento online é disparado', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      dispatchOfflineEvent();
    });
    expect(result.current).toBe(false);

    act(() => {
      dispatchOnlineEvent();
    });
    expect(result.current).toBe(true);
  });

  it('deve remover event listeners na desmontagem', () => {
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
