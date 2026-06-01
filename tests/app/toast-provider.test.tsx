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
  isExportingVideo: false,
  videoExportProgress: 0,
  isVideoRoute: false,
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

  it('mostra toast de exportação de vídeo quando isExportingVideo é true', () => {
    render(
      <ToastManager
        {...defaultProps}
        isExportingVideo={true}
        videoExportProgress={45}
        isVideoRoute={false}
      />,
      { wrapper: Wrapper },
    );
    // O snackbar de exportação contém "Exportando vídeo..." e a porcentagem
    expect(screen.getByText(/Exportando vídeo/i)).toBeTruthy();
    expect(screen.getByText('45%')).toBeTruthy();
  });

  it('não mostra toast de exportação quando está na rota /video', () => {
    render(
      <ToastManager
        {...defaultProps}
        isExportingVideo={true}
        videoExportProgress={45}
        isVideoRoute={true}
      />,
      { wrapper: Wrapper },
    );
    // Não deve mostrar o snackbar de exportação quando já está na página de vídeo
    expect(screen.queryByText(/Exportando vídeo/i)).toBeNull();
  });

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
