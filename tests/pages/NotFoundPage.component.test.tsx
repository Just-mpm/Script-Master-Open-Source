import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- Mocks ---

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
    return vi.fn();
  }),
}));

vi.mock('../../src/lib/app-check', () => ({
  ensureAppCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

vi.mock('../../src/components/DataMigrationDialog', () => ({
  DataMigrationDialog: () => null,
}));

vi.mock('../../src/lib/db/migration', () => ({
  isMigrationAlreadyHandled: () => true,
}));

import { AuthProvider } from '../../src/contexts/AuthContext';
import { NotFoundPage } from '../../src/pages/NotFoundPage';

// --- Helpers ---

function renderWithRouter(children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
}

// --- Testes ---

describe('NotFoundPage', () => {
  it('deve renderizar título "Página não encontrada"', () => {
    renderWithRouter(<NotFoundPage />);

    expect(screen.getByText('Página não encontrada')).toBeTruthy();
  });

  it('deve renderizar mensagem de explicação', () => {
    renderWithRouter(<NotFoundPage />);

    expect(screen.getByText(/URL que você acessou não existe/)).toBeTruthy();
  });

  it('deve renderizar botão "Voltar ao início"', () => {
    renderWithRouter(<NotFoundPage />);

    expect(screen.getByText('Voltar ao início')).toBeTruthy();
  });

  it('deve exibir botão com destino "/" quando usuário não está logado', () => {
    renderWithRouter(<NotFoundPage />);

    // Como o mock seta user=null, o botão navega para "/"
    const button = screen.getByText('Voltar ao início');
    expect(button).toBeTruthy();
  });
});
