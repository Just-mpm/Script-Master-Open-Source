/**
 * Testes do NotFoundPage para o redirect de usuário autenticado → /app/assistente
 * (mudança do PR de chat persistente + tour).
 *
 * Esses testes ficam em arquivo separado porque usam mocks de useAuth e
 * useNavigate diretamente, em vez do AuthProvider real (que dispara
 * window.location.href em login ativo).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...original,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();

import { NotFoundPage } from '../../src/pages/NotFoundPage';

function renderNotFound() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

const anonymousUser = { user: null, loading: false };
const authenticatedUser = {
  user: { uid: 'user-1', email: 'user@test.com' },
  loading: false,
};

describe('NotFoundPage — destino do botão "Voltar ao início"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(anonymousUser);
  });

  it('NÃO chama navigate ao montar (não auto-redireciona)', () => {
    mockUseAuth.mockReturnValue(anonymousUser);
    renderNotFound();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ao clicar no botão com usuário anônimo, navega para "/"', () => {
    mockUseAuth.mockReturnValue(anonymousUser);
    renderNotFound();

    const button = screen.getByText('Voltar ao início');
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('ao clicar no botão com usuário autenticado, navega para /app/assistente', () => {
    mockUseAuth.mockReturnValue(authenticatedUser);
    renderNotFound();

    const button = screen.getByText('Voltar ao início');
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/app/assistente');
  });
});
