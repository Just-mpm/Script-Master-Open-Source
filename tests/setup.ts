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
