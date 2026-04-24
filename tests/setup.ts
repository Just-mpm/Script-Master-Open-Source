import 'fake-indexeddb/auto';

// Stub import.meta.env.PROD para false em todos os testes
if (typeof import.meta !== 'undefined') {
  Object.defineProperty(import.meta, 'env', {
    value: { ...import.meta.env, PROD: false },
    writable: true,
    configurable: true,
  });
}
