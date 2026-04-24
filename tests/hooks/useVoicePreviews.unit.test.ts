import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock do logger
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { useVoicePreviews } from '../../src/hooks/useVoicePreviews';

describe('useVoicePreviews', () => {
  it('deve inicializar com playingId null e errorId null', () => {
    const { result } = renderHook(() => useVoicePreviews());
    expect(result.current.playingId).toBeNull();
    expect(result.current.errorId).toBeNull();
  });

  it('deve expor playPreview e stop como funções', () => {
    const { result } = renderHook(() => useVoicePreviews());
    expect(typeof result.current.playPreview).toBe('function');
    expect(typeof result.current.stop).toBe('function');
  });
});
