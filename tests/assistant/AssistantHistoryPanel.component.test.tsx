import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { AssistantHistoryPanel } from '../../src/features/assistant/components/AssistantHistoryPanel';
import type { ChatSession } from '../../src/lib/db';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

// Mock dos tokens
vi.mock('../../src/theme/tokens', () => ({
  BRAND_PRIMARY: '#06b6d4',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
  TEXT_DISABLED: 'rgba(255,255,255,0.38)',
  ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 20,
  ICON_SIZE_LG: 28,
  GAP_COMPACT: 4,
  GAP_MEDIUM: 8,
  GAP_DEFAULT: 12,
}));

// Mock do assistantUi
vi.mock('../../src/features/assistant/components/assistantUi', () => ({
  assistantDrawerPaperSx: vi.fn(() => ({})),
  assistantInsetSx: vi.fn(() => ({})),
  assistantDrawerHeaderSx: {},
  assistantHistoryItemSx: {},
}));

const defaultProps = {
  history: [] as ChatSession[],
  isLoading: false,
  onClose: vi.fn(),
  onSelectSession: vi.fn(),
  onDeleteHistory: vi.fn(),
};

function createSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 'session-1',
    title: 'Sessão de teste',
    messages: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('AssistantHistoryPanel', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('mostra estado vazio quando não há histórico', () => {
    render(<AssistantHistoryPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Nenhum chat salvo ainda')).toBeDefined();
  });

  it('mostra skeleton quando isLoading é true', () => {
    render(<AssistantHistoryPanel {...defaultProps} isLoading={true} />, { wrapper: Wrapper });

    // Skeleton é renderizado como elementos com animation="wave"
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('mostra título "Histórico de chats"', () => {
    render(<AssistantHistoryPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Histórico de chats')).toBeDefined();
  });

  it('mostra campo de busca quando há histórico', () => {
    const sessions = [createSession()];
    render(
      <AssistantHistoryPanel {...defaultProps} history={sessions} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByPlaceholderText('Buscar no histórico…')).toBeDefined();
  });

  it('NÃO mostra campo de busca quando não há histórico', () => {
    render(<AssistantHistoryPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.queryByPlaceholderText('Buscar no histórico…')).toBeNull();
  });

  it('lista sessões do histórico', () => {
    const sessions = [
      createSession({ id: 's1', title: 'Roteiro de podcast' }),
      createSession({ id: 's2', title: 'Análise de voz' }),
    ];

    render(
      <AssistantHistoryPanel {...defaultProps} history={sessions} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Roteiro de podcast')).toBeDefined();
    expect(screen.getByText('Análise de voz')).toBeDefined();
  });

  it('filtra sessões por busca no título', async () => {
    const sessions = [
      createSession({ id: 's1', title: 'Roteiro de podcast' }),
      createSession({ id: 's2', title: 'Análise de voz' }),
    ];

    render(
      <AssistantHistoryPanel {...defaultProps} history={sessions} />,
      { wrapper: Wrapper },
    );

    const searchInput = screen.getByPlaceholderText('Buscar no histórico…');
    fireEvent.change(searchInput, { target: { value: 'podcast' } });

    expect(screen.getByText('Roteiro de podcast')).toBeDefined();
    expect(screen.queryByText('Análise de voz')).toBeNull();
  });

  it('mostra "Nenhum chat encontrado" quando filtro não retorna resultados', () => {
    const sessions = [createSession({ title: 'Roteiro de podcast' })];

    render(
      <AssistantHistoryPanel {...defaultProps} history={sessions} />,
      { wrapper: Wrapper },
    );

    const searchInput = screen.getByPlaceholderText('Buscar no histórico…');
    fireEvent.change(searchInput, { target: { value: 'xyz-inexistente' } });

    expect(screen.getByText('Nenhum chat encontrado')).toBeDefined();
  });

  it('chama onSelectSession ao clicar numa sessão', async () => {
    const session = createSession({ id: 's1', title: 'Minha sessão' });

    render(
      <AssistantHistoryPanel {...defaultProps} history={[session]} />,
      { wrapper: Wrapper },
    );

    fireEvent.click(screen.getByText('Minha sessão'));

    expect(defaultProps.onSelectSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1' }),
    );
  });

  it('chama onDeleteHistory ao clicar no botão de excluir', () => {
    const session = createSession({ id: 's1', title: 'Minha sessão' });

    render(
      <AssistantHistoryPanel {...defaultProps} history={[session]} />,
      { wrapper: Wrapper },
    );

    const deleteBtn = screen.getByLabelText('Excluir conversa');
    fireEvent.click(deleteBtn);

    expect(defaultProps.onDeleteHistory).toHaveBeenCalledWith(
      expect.any(Object),
      's1',
    );
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    render(<AssistantHistoryPanel {...defaultProps} />, { wrapper: Wrapper });

    const closeBtn = screen.getByLabelText('Fechar histórico');
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('limpa busca ao clicar no botão de limpar', () => {
    const sessions = [createSession()];
    render(
      <AssistantHistoryPanel {...defaultProps} history={sessions} />,
      { wrapper: Wrapper },
    );

    const searchInput = screen.getByPlaceholderText('Buscar no histórico…');
    fireEvent.change(searchInput, { target: { value: 'texto' } });

    const clearBtn = screen.getByLabelText('Limpar busca');
    fireEvent.click(clearBtn);

    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('mostra data formatada para cada sessão', () => {
    const timestamp = new Date('2026-04-20T14:30:00').getTime();
    const session = createSession({ id: 's1', updatedAt: timestamp });

    render(
      <AssistantHistoryPanel {...defaultProps} history={[session]} />,
      { wrapper: Wrapper },
    );

    // Verifica que alguma data é exibida (formato depende do locale)
    const formattedDate = new Date(timestamp).toLocaleString();
    expect(screen.getByText(formattedDate)).toBeDefined();
  });
});
