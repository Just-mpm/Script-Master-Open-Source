import { describe, it, expect, vi, beforeEach } from 'vitest';

// O módulo env.ts avalia import.meta.env na importação.
// Vitest isola cada arquivo de teste, então precisamos stubar antes de importar.

describe('env', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('getFirebaseEnvConfig retorna objeto com propriedades obrigatórias', async () => {
    // Stub todas as env vars necessárias ANTES de importar
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-gemini');
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'fb-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'myapp.firebaseapp.com');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'my-project');
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'my-project.firebasestorage.app');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '111');
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:111:web:abc');

    const { getFirebaseEnvConfig } = await import('../../src/lib/env');
    const config = getFirebaseEnvConfig();

    expect(config.apiKey).toBe('fb-key');
    expect(config.authDomain).toBe('myapp.firebaseapp.com');
    expect(config.projectId).toBe('my-project');
    expect(config.storageBucket).toBe('my-project.firebasestorage.app');
    expect(config.messagingSenderId).toBe('111');
    expect(config.appId).toBe('1:111:web:abc');
  });
});
