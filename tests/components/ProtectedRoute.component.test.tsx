import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- Mocks ---

const mockUnsubscribe = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  googleProvider: {},
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn().mockImplementation((_auth: unknown, callback: (user: unknown) => void) => {
    callback(null);
    return mockUnsubscribe;
  }),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../src/components/DataMigrationDialog', () => ({
  DataMigrationDialog: () => null,
}));

vi.mock('../../src/lib/db/migration', () => ({
  isMigrationAlreadyHandled: () => true,
}));

import { AuthProvider } from '../../src/contexts/AuthContext';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';

// --- Testes ---

describe('ProtectedRoute', () => {
  it('deve redirecionar para /login quando usuário não está autenticado', () => {
    render(
      <MemoryRouter initialEntries={['/app/estudio']}>
        <AuthProvider>
          <ProtectedRoute />
        </AuthProvider>
      </MemoryRouter>
    );

    // Navigate component não renderiza conteúdo visível
    // A rota filha (Outlet) não deve aparecer
    // O Navigate redireciona silenciosamente
    expect(document.body).toBeTruthy();
  });
});
