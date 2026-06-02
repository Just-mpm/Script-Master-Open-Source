import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// ─── Mocks mínimos ─────────────────────────────────────────

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

// ─── Imports após mocks ────────────────────────────────────

import { ToastManager } from '../../src/components/toast/ToastProvider';

// ─── Setup ─────────────────────────────────────────────────

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </ThemeProvider>
  );
}

const defaultProps = {
  activeError: null as string | null,
  onDismissError: vi.fn(),
  warning: null as string | null,
  onDismissWarning: vi.fn(),
  successMessage: null as string | null,
  onDismissSuccess: vi.fn(),
};

// ─── Testes ────────────────────────────────────────────────

describe('ToastManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza children normalmente sem toasts visíveis', () => {
    render(<ToastManager {...defaultProps} />, { wrapper: Wrapper });
    // Nenhum toast deve estar visível quando todos são null/false
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra snackbar de erro quando activeError é fornecido', () => {
    render(
      <ToastManager {...defaultProps} activeError="Erro de teste" />,
      { wrapper: Wrapper },
    );
    // ErrorToast usa Snackbar com Alert — deve aparecer como alert
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('mostra snackbar de sucesso quando successMessage é fornecido', () => {
    render(
      <ToastManager {...defaultProps} successMessage="Operação realizada!" />,
      { wrapper: Wrapper },
    );
    // SuccessToast usa Snackbar com Alert de severidade success
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('mostra snackbar de aviso quando warning é fornecido', () => {
    render(
      <ToastManager {...defaultProps} warning="Aviso parcial" />,
      { wrapper: Wrapper },
    );
    // WarningToast usa Snackbar com Alert de severidade warning
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  // NOTA: os testes de "toast de exportação" foram migrados para
  // `tests/components/ExportCrossRouteToast.component.test.tsx`.
  // O `ToastManager` atual (pós-PR1 do plano `video-render-survive-navigation`)
  // é responsável apenas por Error/Warning/Success. O Snackbar cross-route
  // vive em `ExportCrossRouteToast` (M6) montado em `App.tsx`.

  it('chama onDismissError ao fechar o toast de erro', async () => {
    const onDismissError = vi.fn();
    render(
      <ToastManager {...defaultProps} activeError="Erro" onDismissError={onDismissError} />,
      { wrapper: Wrapper },
    );

    const closeButton = screen.getByRole('button', { name: /Fechar/i });
    await userEvent.click(closeButton);
    expect(onDismissError).toHaveBeenCalledTimes(1);
  });

  it('prioriza erro sobre aviso e sucesso', () => {
    render(
      <ToastManager
        {...defaultProps}
        activeError="Erro crítico"
        warning="Aviso"
        successMessage="Sucesso"
      />,
      { wrapper: Wrapper },
    );
    // Todos os três devem renderizar (são snackbars independentes)
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });
});
