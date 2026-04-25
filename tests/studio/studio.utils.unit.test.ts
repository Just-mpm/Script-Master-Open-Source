import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  STORAGE_KEYS,
  SCENE_RATIOS,
  safeSetItem,
  getStoredValue,
  getStoredBoolean,
  getStoredNumber,
  isSceneRatio,
  getStoredSceneRatio,
} from '../../src/features/studio/store/studio.utils';

// ---------------------------------------------------------------------------
// Testes das helpers de localStorage — importa funções reais de studio.utils.ts
// ---------------------------------------------------------------------------

describe('studio.utils — helpers de localStorage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
      removeItem: vi.fn((key: string) => { store.delete(key); }),
      clear: vi.fn(() => { store.clear(); }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('STORAGE_KEYS', () => {
    it('todas as 14 chaves usam prefixo s2a_', () => {
      const values = Object.values(STORAGE_KEYS);
      for (const key of values) {
        expect(key.startsWith('s2a_')).toBe(true);
      }
    });

    it('tem 14 chaves distintas', () => {
      const values = Object.values(STORAGE_KEYS);
      const unique = new Set(values);
      expect(unique.size).toBe(14);
    });

    it('não inclui referenceImage (session-only)', () => {
      expect(STORAGE_KEYS).not.toHaveProperty('referenceImage');
    });
  });

  describe('getStoredValue', () => {
    it('retorna valor do localStorage quando existe', () => {
      store.set('s2a_script', 'meu roteiro');
      expect(getStoredValue('s2a_script', '')).toBe('meu roteiro');
    });

    it('retorna fallback quando chave não existe', () => {
      expect(getStoredValue('s2a_script', 'fallback')).toBe('fallback');
    });

    it('retorna fallback quando valor é null', () => {
      expect(getStoredValue('s2a_inexistente', 'padrão')).toBe('padrão');
    });
  });

  describe('getStoredBoolean', () => {
    it('retorna true quando armazenado como "true"', () => {
      store.set('s2a_multi', 'true');
      expect(getStoredBoolean('s2a_multi')).toBe(true);
    });

    it('retorna false quando armazenado como "false"', () => {
      store.set('s2a_multi', 'false');
      expect(getStoredBoolean('s2a_multi')).toBe(false);
    });

    it('retorna fallback quando chave não existe', () => {
      expect(getStoredBoolean('s2a_inexistente')).toBe(false);
      expect(getStoredBoolean('s2a_inexistente', true)).toBe(true);
    });

    it('retorna false quando valor é string arbitrária', () => {
      store.set('s2a_multi', 'yes');
      expect(getStoredBoolean('s2a_multi')).toBe(false);
    });
  });

  describe('getStoredNumber', () => {
    it('retorna número quando valor válido e positivo', () => {
      store.set('s2a_scene_density', '20');
      expect(getStoredNumber('s2a_scene_density', 15)).toBe(20);
    });

    it('retorna fallback quando chave não existe', () => {
      expect(getStoredNumber('s2a_inexistente', 15)).toBe(15);
    });

    it('aceita zero como valor válido', () => {
      store.set('s2a_scene_density', '0');
      expect(getStoredNumber('s2a_scene_density', 15)).toBe(0);
    });

    it('retorna fallback quando valor é negativo', () => {
      store.set('s2a_scene_density', '-5');
      expect(getStoredNumber('s2a_scene_density', 15)).toBe(15);
    });

    it('retorna fallback quando valor é NaN', () => {
      store.set('s2a_scene_density', 'abc');
      expect(getStoredNumber('s2a_scene_density', 15)).toBe(15);
    });

    it('retorna fallback quando valor é Infinity', () => {
      store.set('s2a_scene_density', 'Infinity');
      expect(getStoredNumber('s2a_scene_density', 15)).toBe(15);
    });
  });

  describe('safeSetItem', () => {
    it('salva valor no localStorage', () => {
      safeSetItem('s2a_script', 'novo roteiro');
      expect(localStorage.setItem).toHaveBeenCalledWith('s2a_script', 'novo roteiro');
      expect(store.get('s2a_script')).toBe('novo roteiro');
    });

    it('não lança erro quando localStorage.setItem falha (QuotaExceededError)', () => {
      const realSetItem = localStorage.setItem as ReturnType<typeof vi.fn>;
      realSetItem.mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(() => safeSetItem('s2a_script', 'valor')).not.toThrow();
    });

    it('não lança erro quando SecurityError (Safari Private Browsing)', () => {
      const realSetItem = localStorage.setItem as ReturnType<typeof vi.fn>;
      realSetItem.mockImplementationOnce(() => {
        throw new DOMException('SecurityError');
      });

      expect(() => safeSetItem('s2a_script', 'valor')).not.toThrow();
    });
  });

  describe('isSceneRatio', () => {
    it('retorna true para "16:9"', () => {
      expect(isSceneRatio('16:9')).toBe(true);
    });

    it('retorna true para "9:16"', () => {
      expect(isSceneRatio('9:16')).toBe(true);
    });

    it('retorna true para "1:1"', () => {
      expect(isSceneRatio('1:1')).toBe(true);
    });

    it('retorna false para ratio inválido', () => {
      expect(isSceneRatio('4:3')).toBe(false);
    });

    it('retorna false para null', () => {
      expect(isSceneRatio(null)).toBe(false);
    });

    it('retorna false para string vazia', () => {
      expect(isSceneRatio('')).toBe(false);
    });
  });

  describe('getStoredSceneRatio', () => {
    it('retorna "16:9" por padrão (fallback)', () => {
      expect(getStoredSceneRatio()).toBe('16:9');
    });

    it('retorna valor armazenado quando é ratio válido', () => {
      store.set('s2a_scene_ratio', '9:16');
      expect(getStoredSceneRatio()).toBe('9:16');
    });

    it('retorna fallback "16:9" quando valor armazenado é inválido', () => {
      store.set('s2a_scene_ratio', '4:3');
      expect(getStoredSceneRatio()).toBe('16:9');
    });
  });
});
