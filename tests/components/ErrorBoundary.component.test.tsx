import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// --- Mocks ---

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

import { ErrorBoundary } from '../../src/components/ErrorBoundary';

// --- Helpers ---

/** Componente que lança erro ao renderizar */
function ThrowOnRender({ message }: { message: string }) {
  throw new Error(message);
  // eslint-disable-next-line no-unreachable
  return null;
}

/** Componente que lança erro após clicar no botão */
function ThrowOnClick() {
  throw new Error('erro no click');
  // eslint-disable-next-line no-unreachable
  return <button>Click me</button>;
}

// --- Testes ---

describe('ErrorBoundary', () => {
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    // Silencia erros do React no console durante testes
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  it('deve renderizar children quando não há erro', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Conteúdo normal</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child').textContent).toBe('Conteúdo normal');
  });

  it('deve exibir UI de fallback quando filho lança erro', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Erro de teste" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeTruthy();
    expect(screen.getByText(/Ocorreu um erro inesperado ao renderizar/)).toBeTruthy();
  });

  it('deve exibir botão "Tentar novamente" no fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Erro de teste" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('deve exibir botão "Recarregar página" no fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Erro de teste" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recarregar página')).toBeTruthy();
  });
});
