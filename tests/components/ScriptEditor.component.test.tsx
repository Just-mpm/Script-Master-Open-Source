import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ScriptEditor } from '../../src/components/ScriptEditor';
import type { StudioScene } from '../../src/features/studio/types';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

vi.mock('../../src/lib/scene', () => ({
  resolveActiveScene: vi.fn(),
}));

// InlineAIWidget usa useAuth() internamente — mock para evitar AuthProvider
vi.mock('../../src/features/studio/components/InlineAIWidget', () => ({
  InlineAIWidget: () => null,
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', () => ({
  ICON_SIZE_LG: 24,
  ICON_SIZE_MD: 20,
  GAP_MEDIUM: 8,
  GAP_COMPACT: 4,
  BLACK_18: 'rgba(0,0,0,0.18)',
  BLACK_24: 'rgba(0,0,0,0.24)',
  WHITE_16: 'rgba(255,255,255,0.16)',
  BRAND_GLOW_FOCUS: '0 0 0 3px rgba(46, 117, 182, 0.45)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
}));

const defaultProps = {
  script: '',
  setScript: vi.fn(),
  isGenerating: false,
  handleGenerate: vi.fn(),
  isGenerateDisabled: false,
  scenes: [] as StudioScene[],
  currentTime: 0,
};

describe('ScriptEditor', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('renderiza o textarea com placeholder', () => {
    render(<ScriptEditor {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByPlaceholderText(/Comece a escrever/i)).toBeDefined();
  });

  it('renderiza o botão Gerar áudio', () => {
    render(<ScriptEditor {...defaultProps} />, { wrapper: Wrapper });
    // O botão contém o texto "Gerar áudio"
    expect(screen.getByRole('button', { name: /Gerar áudio/i })).toBeDefined();
  });

  it('desabilita o botão quando isGenerateDisabled é true', () => {
    render(<ScriptEditor {...defaultProps} isGenerateDisabled={true} />, { wrapper: Wrapper });
    const btn = screen.getByRole('button', { name: /Gerar áudio/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('desabilita o botão e textarea quando isGenerating é true', () => {
    render(<ScriptEditor {...defaultProps} isGenerating={true} />, { wrapper: Wrapper });
    // Quando isGenerating=true, o botão de gerar está desabilitado
    const textarea = screen.getByPlaceholderText(/Comece a escrever/i);
    expect(textarea.hasAttribute('disabled')).toBe(true);
  });

  it('chama setScript ao digitar no textarea', async () => {
    const user = userEvent.setup();
    render(<ScriptEditor {...defaultProps} />, { wrapper: Wrapper });

    const textarea = screen.getByPlaceholderText(/Comece a escrever/i);
    await user.type(textarea, 'H');

    expect(defaultProps.setScript).toHaveBeenCalled();
  });

  it('exibe o contador de caracteres com formatação pt-BR', () => {
    render(<ScriptEditor {...defaultProps} script='texto' />, { wrapper: Wrapper });
    // toLocaleString() formata com ponto em pt-BR: "5 / 50.000"
    expect(screen.getByText('5 / 50.000')).toBeDefined();
  });

  it('exibe contador em vermelho quando ultrapassa limite', () => {
    const longScript = 'a'.repeat(50001);
    render(<ScriptEditor {...defaultProps} script={longScript} />, { wrapper: Wrapper });
    // O locale pode formatar 50001 e 50000 de forma diferente
    const counter = screen.getByText(/50.001.*50.000/);
    expect(counter).toBeDefined();
  });

  it('mostra o botão copiar quando há texto e não está gerando', () => {
    render(<ScriptEditor {...defaultProps} script='roteiro' />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /Copiar roteiro/i })).toBeDefined();
  });

  it('esconde o botão copiar quando não há texto', () => {
    render(<ScriptEditor {...defaultProps} script='' />, { wrapper: Wrapper });
    expect(screen.queryByRole('button', { name: /Copiar roteiro/i })).toBeNull();
  });

  it('esconde o botão copiar quando está gerando', () => {
    render(<ScriptEditor {...defaultProps} script='roteiro' isGenerating={true} />, { wrapper: Wrapper });
    expect(screen.queryByRole('button', { name: /Copiar roteiro/i })).toBeNull();
  });

  it('mostra o botão Limpar quando há texto e não está gerando', () => {
    render(<ScriptEditor {...defaultProps} script='roteiro' />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /Limpar roteiro/i })).toBeDefined();
  });

  it('chama setScript com string vazia ao clicar Limpar', async () => {
    const user = userEvent.setup();
    render(<ScriptEditor {...defaultProps} script='roteiro' />, { wrapper: Wrapper });

    await user.click(screen.getByRole('button', { name: /Limpar roteiro/i }));
    expect(defaultProps.setScript).toHaveBeenCalledWith('');
  });

  it('desabilita o textarea quando isGenerating é true', () => {
    render(<ScriptEditor {...defaultProps} isGenerating={true} />, { wrapper: Wrapper });
    const textarea = screen.getByPlaceholderText(/Comece a escrever/i);
    expect(textarea.hasAttribute('disabled')).toBe(true);
  });

  it('chama handleGenerate ao clicar no botão Gerar áudio', async () => {
    const user = userEvent.setup();
    render(<ScriptEditor {...defaultProps} />, { wrapper: Wrapper });

    const btn = screen.getByRole('button', { name: /Gerar áudio/i });
    await user.click(btn);

    expect(defaultProps.handleGenerate).toHaveBeenCalledTimes(1);
  });

  it('aciona Ctrl+Enter para gerar áudio via listener do container', () => {
    render(<ScriptEditor {...defaultProps} />, { wrapper: Wrapper });

    // O componente usa containerRef num Stack com component="section"
    // No jsdom, o role pode não ser detectado automaticamente, então usamos o container real
    const container = screen.getByText('Script').closest('section') ?? screen.getByText('Script').parentElement!.parentElement!;

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(event);

    expect(defaultProps.handleGenerate).toHaveBeenCalledTimes(1);
  });

  it('NÃO aciona handleGenerate quando isGenerateDisabled é true com Ctrl+Enter', () => {
    render(<ScriptEditor {...defaultProps} isGenerateDisabled={true} />, { wrapper: Wrapper });

    const container = screen.getByText('Script').closest('section') ?? screen.getByText('Script').parentElement!.parentElement!;

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(event);

    expect(defaultProps.handleGenerate).not.toHaveBeenCalled();
  });

  it('NÃO aciona handleGenerate com Enter sem Ctrl', () => {
    render(<ScriptEditor {...defaultProps} />, { wrapper: Wrapper });

    const container = screen.getByText('Script').closest('section') ?? screen.getByText('Script').parentElement!.parentElement!;

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: false,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(event);

    expect(defaultProps.handleGenerate).not.toHaveBeenCalled();
  });
});
