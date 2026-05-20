import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// Stub import.meta.env.PROD para false em todos os testes
if (typeof import.meta !== 'undefined') {
  Object.defineProperty(import.meta, 'env', {
    value: { ...import.meta.env, PROD: false },
    writable: true,
    configurable: true,
  });
}

// ResizeObserver não existe no jsdom — polyfill mínimo para testes
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// IntersectionObserver não existe no jsdom — necessário para motion/react (viewport)
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

import { vi } from 'vitest';
import { useContext } from 'react';

vi.mock('../src/features/i18n', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/features/i18n')>();
  
  // Cache de instâncias estáveis de tradução para evitar loop de renders em hooks dependentes de t
  const ptMock = {
    locale: 'pt-BR' as const,
    setLocale: () => {},
    t: (key: string, params?: Record<string, string | number>) => {
      const dict = original.dictionaries['pt-BR'];
      let value = original.getNestedValue(dict, key);
      if (value === undefined) {
        value = key;
      }
      return original.interpolate(value, params);
    }
  };

  return {
    ...original,
    useLocale: () => {
      try {
        const ctx = useContext(original.I18nContext);
        if (ctx) {
          return ctx;
        }
      } catch (e) {
        // Se falhar (por exemplo, se chamado fora do ambiente React), usa mock padrão
      }
      return ptMock;
    },
    useLocaleSafe: () => {
      try {
        const ctx = useContext(original.I18nContext);
        if (ctx) {
          return ctx;
        }
      } catch (e) {
        // Ignora
      }
      return ptMock;
    }
  };
});
