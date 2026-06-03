/**
 * Testes do FeedbackFab — FAB que abre o FeedbackDialog.
 *
 * Valida:
 * - Não renderiza quando não autenticado
 * - Não renderiza quando bônus já foi concedido
 * - Não renderiza quando tem créditos ilimitados
 * - Não renderiza em /app/estudio, /app/video, /onboarding
 * - Renderiza em outras rotas /app/* autenticadas
 * - Click dispara o evento OPEN_FEEDBACK_DIALOG_EVENT com o pathname atual
 * - Tem aria-label acessível
 * - Mostra badge "+250"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import { I18nProvider } from '../../../src/features/i18n';
import {
  FeedbackFab,
  OPEN_FEEDBACK_DIALOG_EVENT,
  FEEDBACK_BONUS_DISPLAY,
} from '../../../src/components/feedback';

// Mocks dos hooks
const mockUseAuth = vi.fn();
const mockUseCredits = vi.fn();

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../src/hooks/useCredits', () => ({
  useCredits: () => mockUseCredits(),
}));

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({
  children,
  initialPath = '/app/assistente',
}: {
  children: ReactNode;
  initialPath?: string;
}) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="*" element={children} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}

describe('FeedbackFab', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    // Defaults: autenticado + sem bônus + sem créditos ilimitados
    mockUseAuth.mockReturnValue({ user: { uid: 'test-user' } });
    mockUseCredits.mockReturnValue({
      feedbackBonusGranted: false,
      feedbackPromoSeen: true,
      unlimitedCredits: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('não renderiza quando não há usuário autenticado', () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(
      <Wrapper>
        <FeedbackFab />
      </Wrapper>,
    );

    expect(screen.queryByLabelText(/Enviar feedback/i)).toBeNull();
  });

  it('não renderiza quando bônus já foi concedido', () => {
    mockUseCredits.mockReturnValue({
      feedbackBonusGranted: true,
      unlimitedCredits: false,
    });

    render(
      <Wrapper>
        <FeedbackFab />
      </Wrapper>,
    );

    expect(screen.queryByLabelText(/Enviar feedback/i)).toBeNull();
  });

  it('não renderiza quando tem créditos ilimitados', () => {
    mockUseCredits.mockReturnValue({
      feedbackBonusGranted: false,
      unlimitedCredits: true,
    });

    render(
      <Wrapper>
        <FeedbackFab />
      </Wrapper>,
    );

    expect(screen.queryByLabelText(/Enviar feedback/i)).toBeNull();
  });

  it('não renderiza quando o usuário ainda não zerou os créditos (feedbackPromoSeen=false)', () => {
    mockUseCredits.mockReturnValue({
      feedbackBonusGranted: false,
      feedbackPromoSeen: false,
      unlimitedCredits: false,
    });

    render(
      <Wrapper initialPath="/app/assistente">
        <FeedbackFab />
      </Wrapper>,
    );

    expect(screen.queryByLabelText(/Enviar feedback/i)).toBeNull();
  });

  it('não renderiza em /app/estudio (ActionBar toma o bottom)', () => {
    render(
      <Wrapper initialPath="/app/estudio">
        <FeedbackFab />
      </Wrapper>,
    );

    expect(screen.queryByLabelText(/Enviar feedback/i)).toBeNull();
  });

  it('não renderiza em /app/video', () => {
    render(
      <Wrapper initialPath="/app/video">
        <FeedbackFab />
      </Wrapper>,
    );

    expect(screen.queryByLabelText(/Enviar feedback/i)).toBeNull();
  });

  it('não renderiza em /onboarding', () => {
    render(
      <Wrapper initialPath="/onboarding">
        <FeedbackFab />
      </Wrapper>,
    );

    expect(screen.queryByLabelText(/Enviar feedback/i)).toBeNull();
  });

  it('renderiza em /app/assistente com usuário autenticado e sem bônus', () => {
    render(
      <Wrapper initialPath="/app/assistente">
        <FeedbackFab />
      </Wrapper>,
    );

    const fab = screen.getByLabelText(/Enviar feedback/i);
    expect(fab).toBeDefined();
  });

  it('mostra badge "+250" no FAB', () => {
    render(
      <Wrapper initialPath="/app/assistente">
        <FeedbackFab />
      </Wrapper>,
    );

    expect(screen.getByText(`+${FEEDBACK_BONUS_DISPLAY}`)).toBeDefined();
  });

  it('dispara evento OPEN_FEEDBACK_DIALOG_EVENT com o pathname atual ao clicar', () => {
    const eventListener = vi.fn();
    window.addEventListener(OPEN_FEEDBACK_DIALOG_EVENT, eventListener);

    render(
      <Wrapper initialPath="/app/biblioteca">
        <FeedbackFab />
      </Wrapper>,
    );

    const fab = screen.getByLabelText(/Enviar feedback/i);
    fireEvent.click(fab);

    expect(eventListener).toHaveBeenCalledTimes(1);
    const event = eventListener.mock.calls[0][0] as CustomEvent<{ screenContext?: string }>;
    expect(event.detail.screenContext).toBe('/app/biblioteca');

    window.removeEventListener(OPEN_FEEDBACK_DIALOG_EVENT, eventListener);
  });

  it('possui aria-label acessível', () => {
    render(
      <Wrapper initialPath="/app/assistente">
        <FeedbackFab />
      </Wrapper>,
    );

    const fab = screen.getByLabelText('Enviar feedback (+250 créditos)');
    expect(fab).toBeDefined();
  });
});
