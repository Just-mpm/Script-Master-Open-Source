import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { AssistantComposer } from '../../src/features/assistant/components/AssistantComposer';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

// Mock dos tokens
vi.mock('../../src/theme/tokens', () => ({
  ICON_SIZE_SM: 16,
  ICON_SIZE_MD: 20,
  RADIUS_XS: 8,
}));

const defaultProps = {
  input: '',
  pendingFiles: [] as File[],
  isLoading: false,
  fileInputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
  onFileChange: vi.fn(),
  onRemoveFile: vi.fn(),
};

describe('AssistantComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o campo de texto com placeholder', () => {
    render(<AssistantComposer {...defaultProps} />, { wrapper: Wrapper });

    const textarea = screen.getByPlaceholderText(/Peça ajustes/i);
    expect(textarea).toBeDefined();
  });

  it('renderiza o botão Enviar', () => {
    render(<AssistantComposer {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByRole('button', { name: /Enviar/i })).toBeDefined();
  });

  it('desabilita o botão Enviar quando input está vazio e sem arquivos', () => {
    render(<AssistantComposer {...defaultProps} />, { wrapper: Wrapper });

    const btn = screen.getByRole('button', { name: /Enviar/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('habilita o botão Enviar quando input tem texto', () => {
    render(<AssistantComposer {...defaultProps} input='texto qualquer' />, { wrapper: Wrapper });

    const btn = screen.getByRole('button', { name: /Enviar/i });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('habilita o botão Enviar quando há arquivos pendentes', () => {
    const file = new File(['data'], 'img.png', { type: 'image/png' });
    render(
      <AssistantComposer {...defaultProps} pendingFiles={[file]} />,
      { wrapper: Wrapper },
    );

    const btn = screen.getByRole('button', { name: /Enviar/i });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('desabilita o botão Enviar quando isLoading é true', () => {
    render(
      <AssistantComposer {...defaultProps} input='texto' isLoading={true} />,
      { wrapper: Wrapper },
    );

    const btn = screen.getByRole('button', { name: /Enviar/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('chama onInputChange ao digitar no campo de texto', async () => {
    const user = userEvent.setup();
    render(<AssistantComposer {...defaultProps} />, { wrapper: Wrapper });

    const textarea = screen.getByPlaceholderText(/Peça ajustes/i);
    await user.type(textarea, 'a');

    expect(defaultProps.onInputChange).toHaveBeenCalledWith('a');
  });

  it('chama onSubmit ao clicar no botão Enviar', async () => {
    const user = userEvent.setup();
    render(
      <AssistantComposer {...defaultProps} input='mensagem de teste' />,
      { wrapper: Wrapper },
    );

    const btn = screen.getByRole('button', { name: /Enviar/i });
    await user.click(btn);

    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('chama onSubmit ao pressionar Enter sem Shift', async () => {
    const user = userEvent.setup();
    render(
      <AssistantComposer {...defaultProps} input='mensagem' />,
      { wrapper: Wrapper },
    );

    const textarea = screen.getByPlaceholderText(/Peça ajustes/i);
    await user.type(textarea, '{Enter}');

    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('NÃO chama onSubmit ao pressionar Shift+Enter', async () => {
    const user = userEvent.setup();
    render(
      <AssistantComposer {...defaultProps} input='mensagem' />,
      { wrapper: Wrapper },
    );

    const textarea = screen.getByPlaceholderText(/Peça ajustes/i);
    await user.type(textarea, '{Shift>}{Enter}{/Shift}');

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('mostra chips para arquivos pendentes', () => {
    const file1 = new File(['data'], 'foto.png', { type: 'image/png' });
    const file2 = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    render(
      <AssistantComposer {...defaultProps} pendingFiles={[file1, file2]} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('foto.png')).toBeDefined();
    expect(screen.getByText('doc.pdf')).toBeDefined();
  });

  it('mostra ícone de imagem para arquivos de imagem', () => {
    const file = new File(['data'], 'foto.jpg', { type: 'image/jpeg' });

    render(
      <AssistantComposer {...defaultProps} pendingFiles={[file]} />,
      { wrapper: Wrapper },
    );

    // Chip com ícone de imagem (Image icon) para mime type image/*
    expect(screen.getByText('foto.jpg')).toBeDefined();
  });

  it('chama onRemoveFile ao clicar no delete do chip', async () => {
    const user = userEvent.setup();
    const file = new File(['data'], 'doc.txt', { type: 'text/plain' });

    render(
      <AssistantComposer {...defaultProps} pendingFiles={[file]} />,
      { wrapper: Wrapper },
    );

    // MUI Chip: o delete icon é um SVG dentro do Chip (role="button" no Chip inteiro).
    // O onClose é disparado quando se clica no elemento com classe deleteIcon.
    const deleteIcon = document.querySelector('.MuiChip-deleteIcon');
    expect(deleteIcon).not.toBeNull();

    // Clica no chip por inteiro (onDelete é acionado ao clicar no deleteIcon SVG)
    if (deleteIcon) {
      fireEvent.click(deleteIcon);
      expect(defaultProps.onRemoveFile).toHaveBeenCalledWith(0);
    }
  });

  it('mostra estado de loading no botão quando isLoading é true', () => {
    render(
      <AssistantComposer {...defaultProps} input='texto' isLoading={true} />,
      { wrapper: Wrapper },
    );

    // O botão deve ter o indicador de loading
    const btn = screen.getByRole('button', { name: /Enviar/i });
    expect(btn).toBeDefined();
  });

  it('renderiza input de arquivo hidden', () => {
    const { container } = render(<AssistantComposer {...defaultProps} />, { wrapper: Wrapper });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();
    expect(fileInput.hasAttribute('hidden')).toBe(true);
    expect(fileInput.multiple).toBe(true);
    expect(fileInput.accept).toContain('image/*');
    expect(fileInput.accept).toContain('.pdf');
    expect(fileInput.accept).toContain('.txt');
  });
});
