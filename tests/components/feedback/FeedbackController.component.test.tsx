/**
 * Testes do FeedbackController — escuta o evento de abertura e gerencia estado.
 *
 * Valida:
 * - Não renderiza nada visível por si só (apenas o Dialog)
 * - Abre o dialog ao receber o evento OPEN_FEEDBACK_DIALOG_EVENT
 * - Fecha o dialog ao chamar onClose
 * - Repassa o screenContext recebido via event.detail
 * - Rejeita event.detail inválido com graceful degradation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { I18nProvider } from '../../../src/features/i18n';
import { FeedbackController, OPEN_FEEDBACK_DIALOG_EVENT } from '../../../src/components/feedback';

// Mock do Firebase Functions (usado pelo FeedbackFormFields via httpsCallable)
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { success: true, bonusGranted: true } })),
  getFunctions: vi.fn(),
  connectFunctionsEmulator: vi.fn(),
}));

// Mock do useCredits (hook público usado em outros lugares) e do store
vi.mock('../../../src/hooks/useCredits', () => ({
  useCredits: () => ({
    availableCredits: 500,
    feedbackBonusGranted: false,
    unlimitedCredits: false,
    loading: false,
  }),
  useCreditsStore: () => ({
    refreshCredits: vi.fn().mockResolvedValue(undefined),
  }),
}));

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

describe('FeedbackController', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('não renderiza conteúdo visível inicialmente', () => {
    render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );
    // Dialog não está aberto → título não deve estar visível
    expect(screen.queryByText('Sua opinião vale créditos')).toBeNull();
  });

  it('abre o dialog ao receber o evento OPEN_FEEDBACK_DIALOG_EVENT', async () => {
    render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT));
    });

    // MUI Dialog pode precisar de microtasks extras para montar — espera breve
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Dialog do MUI renderiza em um portal
    expect(screen.getByText('Sua opinião vale créditos')).toBeDefined();
    expect(screen.getByText('Ganhe 250 créditos bônus')).toBeDefined();
  });

  it('repassa o screenContext via event.detail', () => {
    render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT, {
          detail: { screenContext: '/app/estudio' },
        }),
      );
    });

    // O campo "Tela atual" deve estar pré-preenchido com o valor recebido
    const screenContextInput = screen.getByLabelText('Tela atual (opcional)') as HTMLInputElement;
    expect(screenContextInput.value).toBe('/app/estudio');
  });

  it('aceita o evento sem detail (screenContext undefined)', () => {
    render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT));
    });

    const screenContextInput = screen.getByLabelText('Tela atual (opcional)') as HTMLInputElement;
    expect(screenContextInput.value).toBe('');
  });

  it('rejeita event.detail inválido com graceful degradation', () => {
    render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );

    // Dispatch com detail inválido (não objeto) — não deve quebrar
    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT, { detail: 'invalido' as unknown as object }));
    });

    // Dialog ainda abre
    expect(screen.getByText('Sua opinião vale créditos')).toBeDefined();
    const screenContextInput = screen.getByLabelText('Tela atual (opcional)') as HTMLInputElement;
    expect(screenContextInput.value).toBe('');
  });

  it('fecha o dialog ao clicar no botão Cancelar', async () => {
    render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT));
    });

    expect(screen.getByText('Sua opinião vale créditos')).toBeDefined();

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    // Após fechar, título some (Dialog tem animação de saída)
    await waitFor(() => {
      expect(screen.queryByText('Sua opinião vale créditos')).toBeNull();
    });
  });

  it('remove o listener ao desmontar', () => {
    const { unmount } = render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );

    unmount();

    // Após desmontar, evento não deve abrir dialog
    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT));
    });

    expect(screen.queryByText('Sua opinião vale créditos')).toBeNull();
  });

  it('renderiza os campos do form dentro do dialog', () => {
    render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT));
    });

    expect(screen.getByLabelText('Categoria')).toBeDefined();
    expect(screen.getByLabelText('Seu feedback')).toBeDefined();
    expect(screen.getByLabelText('Tela atual (opcional)')).toBeDefined();
    expect(screen.getByRole('button', { name: /Enviar feedback/i })).toBeDefined();
  });

  it('botão Enviar fica desabilitado sem categoria ou texto curto', () => {
    render(
      <Wrapper>
        <FeedbackController />
      </Wrapper>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT));
    });

    const submitButton = screen.getByRole('button', { name: /Enviar feedback/i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });
});
