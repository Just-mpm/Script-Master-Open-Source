import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockCreditSnapshotCallable = vi.hoisted(() => vi.fn());

const authState = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  loading: true,
}));

const snapshotListeners = vi.hoisted(() => ({
  next: null as ((snapshot: {
    exists: () => boolean;
    data: () => Record<string, unknown>;
    metadata?: { fromCache?: boolean };
  }) => void) | null,
  error: null as ((error: unknown) => void) | null,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ path: 'users/test-uid/beta_access/current' })),
  onSnapshot: vi.fn((_ref: unknown, onNext: typeof snapshotListeners.next, onError: typeof snapshotListeners.error) => {
    snapshotListeners.next = onNext;
    snapshotListeners.error = onError;
    return () => {
      snapshotListeners.next = null;
      snapshotListeners.error = null;
    };
  }),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => mockCreditSnapshotCallable),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { resetUseCreditsTestState, useCredits } from '../../src/hooks/useCredits';

function createCreditSnapshot(
  overrides: Partial<{
    availableCredits: number;
    usedCredits: number;
    reservedCredits: number;
    baseCredits: number;
    bonusCredits: number;
    feedbackBonusGranted: boolean;
    unlimitedCredits: boolean;
  }> = {},
) {
  return {
    data: {
      availableCredits: 200,
      usedCredits: 50,
      reservedCredits: 0,
      baseCredits: 200,
      bonusCredits: 50,
      feedbackBonusGranted: true,
      unlimitedCredits: false,
      ...overrides,
    },
  };
}

describe('useCredits', () => {
  beforeEach(() => {
    resetUseCreditsTestState();
    authState.user = null;
    authState.loading = true;
    snapshotListeners.next = null;
    snapshotListeners.error = null;
    mockCreditSnapshotCallable.mockReset();
    mockCreditSnapshotCallable.mockResolvedValue(createCreditSnapshot());
  });

  it('mantém loading enquanto a autenticação ainda está restaurando a sessão', () => {
    const { result } = renderHook(() => useCredits());

    expect(result.current.loading).toBe(true);
    expect(result.current.availableCredits).toBe(0);
    expect(result.current.canEnforceBalance).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('só libera loading após a autenticação resolver e o snapshot chegar', async () => {
    const { result, rerender } = renderHook(() => useCredits());

    authState.user = { uid: 'test-uid' };
    authState.loading = false;
    rerender();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.availableCredits).toBe(200);
      expect(result.current.canEnforceBalance).toBe(true);
    });
  });

  it('não trata snapshot em cache com saldo zero como bloqueio confirmado', async () => {
    mockCreditSnapshotCallable.mockRejectedValueOnce(new Error('timeout'));

    const { result, rerender } = renderHook(() => useCredits());

    authState.user = { uid: 'test-uid' };
    authState.loading = false;
    rerender();

    act(() => {
      snapshotListeners.next?.({
        exists: () => true,
        data: () => ({
          availableCredits: 0,
          usedCredits: 200,
          reservedCredits: 0,
          baseCredits: 200,
          bonusCredits: 0,
          feedbackBonusGranted: false,
          unlimitedCredits: false,
        }),
        metadata: { fromCache: true },
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.availableCredits).toBe(0);
      expect(result.current.canEnforceBalance).toBe(false);
    });
  });

  it('reaproveita o último saldo confirmado entre múltiplos consumidores do hook', async () => {
    const firstHook = renderHook(() => useCredits());

    authState.user = { uid: 'test-uid' };
    authState.loading = false;
    firstHook.rerender();

    await waitFor(() => {
      expect(firstHook.result.current.availableCredits).toBe(200);
      expect(firstHook.result.current.canEnforceBalance).toBe(true);
    });

    mockCreditSnapshotCallable.mockRejectedValueOnce(new Error('timeout'));

    const secondHook = renderHook(() => useCredits());

    await waitFor(() => {
      expect(secondHook.result.current.loading).toBe(false);
      expect(secondHook.result.current.availableCredits).toBe(200);
      expect(secondHook.result.current.canEnforceBalance).toBe(true);
      expect(secondHook.result.current.error).toBeNull();
    });
  });

  it('mantém o saldo como não confirmável quando a sincronização inicial falha sem dado confiável', async () => {
    mockCreditSnapshotCallable.mockRejectedValueOnce(new Error('timeout'));

    const { result, rerender } = renderHook(() => useCredits());

    authState.user = { uid: 'test-uid' };
    authState.loading = false;
    rerender();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.availableCredits).toBe(0);
      expect(result.current.canEnforceBalance).toBe(false);
      expect(result.current.error).toBe('Erro ao carregar saldo de créditos.');
    });
  });

  it('trata ausência confirmada do documento como saldo zero válido', async () => {
    mockCreditSnapshotCallable.mockRejectedValueOnce(new Error('timeout'));

    const { result, rerender } = renderHook(() => useCredits());

    authState.user = { uid: 'test-uid' };
    authState.loading = false;
    rerender();

    act(() => {
      snapshotListeners.next?.({
        exists: () => false,
        data: () => ({}),
        metadata: { fromCache: false },
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.availableCredits).toBe(0);
      expect(result.current.canEnforceBalance).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });
});
