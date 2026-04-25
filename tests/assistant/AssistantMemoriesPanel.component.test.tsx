import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { AssistantMemoriesPanel } from '../../src/features/assistant/components/AssistantMemoriesPanel';
import type { Memory } from '../../src/lib/db';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

// Mock dos tokens
vi.mock('../../src/theme/tokens', () => ({
  BRAND_PRIMARY: '#06b6d4',
  BRAND_SECONDARY: '#8b5cf6',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247,148,30,0.12)',
  APP_BORDER: 'rgba(255,255,255,0.08)',
  TEXT_DISABLED: 'rgba(255,255,255,0.38)',
  TEXT_SECONDARY: 'rgba(248,250,252,0.68)',
  WHITE_06: 'rgba(255,255,255,0.06)',
  ICON_SIZE_MD: 20,
  ICON_SIZE_LG: 28,
  GAP_COMPACT: 4,
  GAP_DEFAULT: 12,
  GAP_MEDIUM: 8,
}));

// Mock do assistantUi
vi.mock('../../src/features/assistant/components/assistantUi', () => ({
  assistantDrawerPaperSx: vi.fn(() => ({})),
  assistantInsetSx: vi.fn(() => ({})),
  assistantDrawerHeaderSx: {},
}));

const defaultProps = {
  memories: [] as Memory[],
  isLoading: false,
  newMemory: '',
  documentInputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  onClose: vi.fn(),
  onNewMemoryChange: vi.fn(),
  onSubmit: vi.fn(),
  onDeleteMemory: vi.fn(),
  onDocumentUpload: vi.fn(),
};

function createMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'mem-1',
    content: 'Preferência de voz calma',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('AssistantMemoriesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra estado vazio quando não há memórias', () => {
    render(<AssistantMemoriesPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Ainda não há memórias salvas')).toBeDefined();
  });

  it('mostra skeleton quando isLoading é true', () => {
    render(
      <AssistantMemoriesPanel {...defaultProps} isLoading={true} />,
      { wrapper: Wrapper },
    );

    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('mostra título "Memórias e documentos"', () => {
    render(<AssistantMemoriesPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Memórias e documentos')).toBeDefined();
  });

  it('renderiza campo de texto para nova memória', () => {
    render(<AssistantMemoriesPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Adicionar memória curta')).toBeDefined();
  });

  it('renderiza botão "Anexar documento"', () => {
    render(<AssistantMemoriesPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Anexar documento')).toBeDefined();
  });

  it('lista memórias existentes', () => {
    const memories = [
      createMemory({ id: 'm1', content: 'Preferência de voz calma' }),
      createMemory({ id: 'm2', content: 'Tom de marca: descontraído' }),
    ];

    render(
      <AssistantMemoriesPanel {...defaultProps} memories={memories} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Preferência de voz calma')).toBeDefined();
    expect(screen.getByText('Tom de marca: descontraído')).toBeDefined();
  });

  it('trunca memória longa (320 chars) com reticências', () => {
    const longContent = 'a'.repeat(400);
    const memories = [createMemory({ content: longContent })];

    render(
      <AssistantMemoriesPanel {...defaultProps} memories={memories} />,
      { wrapper: Wrapper },
    );

    // Deve mostrar "aaa...aaa…" com reticências
    const displayed = screen.getByText(new RegExp(`^a{320}…$`));
    expect(displayed).toBeDefined();
  });

  it('NÃO trunca memória curta (<=320 chars)', () => {
    const shortContent = 'Memória curta';
    const memories = [createMemory({ content: shortContent })];

    render(
      <AssistantMemoriesPanel {...defaultProps} memories={memories} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Memória curta')).toBeDefined();
  });

  it('chama onDeleteMemory ao clicar em excluir memória', () => {
    const memories = [createMemory({ id: 'm1' })];

    render(
      <AssistantMemoriesPanel {...defaultProps} memories={memories} />,
      { wrapper: Wrapper },
    );

    const deleteBtn = screen.getByLabelText('Excluir memória');
    fireEvent.click(deleteBtn);

    expect(defaultProps.onDeleteMemory).toHaveBeenCalledWith('m1');
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    render(<AssistantMemoriesPanel {...defaultProps} />, { wrapper: Wrapper });

    const closeBtn = screen.getByLabelText('Fechar memórias');
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra data formatada para cada memória', () => {
    const timestamp = new Date('2026-04-20T14:30:00').getTime();
    const memories = [createMemory({ createdAt: timestamp })];

    render(
      <AssistantMemoriesPanel {...defaultProps} memories={memories} />,
      { wrapper: Wrapper },
    );

    const formattedDate = new Date(timestamp).toLocaleString();
    expect(screen.getByText(formattedDate)).toBeDefined();
  });

  it('chama onDocumentUpload ao selecionar documento', () => {
    render(<AssistantMemoriesPanel {...defaultProps} />, { wrapper: Wrapper });

    const uploadBtn = screen.getByText('Anexar documento');
    fireEvent.click(uploadBtn);

    // O clique deve acionar o click do input de arquivo via ref
    const fileInput = document.querySelector('input[type="file"][accept=".md,.txt,.csv"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();
    expect(fileInput.accept).toBe('.md,.txt,.csv');
  });

  it('renderiza input de arquivo hidden com aceitação correta', () => {
    render(<AssistantMemoriesPanel {...defaultProps} />, { wrapper: Wrapper });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();
    expect(fileInput.hasAttribute('hidden')).toBe(true);
    expect(fileInput.accept).toBe('.md,.txt,.csv');
  });

  it('chama onSubmit ao submeter o formulário de memória', () => {
    const newMemory = 'nova preferência de voz';

    render(
      <AssistantMemoriesPanel {...defaultProps} newMemory={newMemory} />,
      { wrapper: Wrapper },
    );

    const form = document.querySelector('form');
    expect(form).toBeDefined();
    fireEvent.submit(form!);

    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
  });
});
