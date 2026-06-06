/**
 * Testes do FeedbackFab — FAB que abre o FeedbackDialog.
 *
 * Valida:
 * - Não renderiza quando não autenticado
 * - Não renderiza em /app/estudio, /app/video, /onboarding
 * - Renderiza em outras rotas /app/* autenticadas
 * - Click dispara o evento OPEN_FEEDBACK_DIALOG_EVENT com o pathname atual
 * - Tem aria-label acessível
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import { I18nProvider } from '../../../src/features/i18n';
import {
  FeedbackFab,
  OPEN_FEEDBACK_DIALOG_EVENT,
} from '../../../src/components/feedback';

// Mocks dos hooks
const mockUseAuth = vi.fn();

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
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
    mockUseAuth.mockReturnValue({ user: { uid: 'test-user' } });
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

  it('renderiza em /app/assistente com usuário autenticado', () => {
    render(
      <Wrapper initialPath="/app/assistente">
        <FeedbackFab />
      </Wrapper>,
    );

    const fab = screen.getByLabelText(/Enviar feedback/i);
    expect(fab).toBeDefined();
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

    const fab = screen.getByLabelText(/Enviar feedback/i);
    expect(fab).toBeDefined();
  });
});
