import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStoredEmotion } from '../../src/features/studio/store/studio.utils';

describe('studio.utils — helpers de emoção', () => {
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

  describe('getStoredEmotion', () => {
    it('retorna "neutral" quando não há valor no localStorage', () => {
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('retorna "neutral" quando o valor é null', () => {
      store.set('s2a_emotion', 'null');
      // O getItem retorna string, mas getStoredEmotion verifica null
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('retorna a emoção armazenada quando válida', () => {
      store.set('s2a_emotion', 'happy');
      expect(getStoredEmotion()).toBe('happy');
    });

    it('retorna "neutral" quando o valor armazenado é inválido', () => {
      store.set('s2a_emotion', 'excited');
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('retorna "neutral" quando o valor é string vazia', () => {
      store.set('s2a_emotion', '');
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('aceita todas as 8 emoções válidas', () => {
      const validEmotions = [
        'neutral', 'happy', 'sad', 'angry', 'calm', 'energetic', 'dramatic', 'friendly',
      ];
      for (const emotion of validEmotions) {
        store.set('s2a_emotion', emotion);
        expect(getStoredEmotion()).toBe(emotion);
      }
    });

    it('retorna "neutral" quando localStorage lança erro', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('Storage disabled');
      });
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('retorna "neutral" para string numérica inválida', () => {
      store.set('s2a_emotion', '123');
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('retorna "neutral" para valor com espaços', () => {
      store.set('s2a_emotion', ' happy ');
      expect(getStoredEmotion()).toBe('neutral');
    });
  });
});
