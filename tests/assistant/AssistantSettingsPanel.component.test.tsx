import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { AssistantSettingsPanel } from '../../src/features/assistant/components/AssistantSettingsPanel';
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
vi.mock('../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
  return { ...actual, BRAND_PRIMARY: '#2E75B6',
  BRAND_SECONDARY: '#8b5cf6',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247,148,30,0.12)',
  APP_BORDER: 'rgba(255,255,255,0.08)',
  APP_SURFACE_ELEVATED: 'rgba(30,30,45,1)',
  TEXT_DISABLED: 'rgba(255,255,255,0.38)',
  TEXT_SECONDARY: 'rgba(248,250,252,0.68)',
  ICON_SIZE_MD: 20,
  ICON_SIZE_LG: 28,
  GAP_DEFAULT: 12,
  GAP_COMPACT: 4, };
});;

// Mock do assistantUi
vi.mock('../../src/features/assistant/components/assistantUi', () => ({
  assistantDrawerPaperSx: vi.fn(() => ({})),
  assistantInsetSx: vi.fn(() => ({})),
  assistantDrawerHeaderSx: {},
}));

const defaultProps = {
  customSystemPrompt: '',
  isSavingSettings: false,
  onClose: vi.fn(),
  onChangePrompt: vi.fn(),
  onSave: vi.fn(),
};

describe('AssistantSettingsPanel', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('mostra título "Persona da IA"', () => {
    render(<AssistantSettingsPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Persona da IA')).toBeDefined();
  });

  it('renderiza campo multiline para diretrizes', () => {
    render(<AssistantSettingsPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Diretrizes permanentes')).toBeDefined();
  });

  it('mostra placeholder no campo de diretrizes', () => {
    render(<AssistantSettingsPanel {...defaultProps} />, { wrapper: Wrapper });

    const textarea = screen.getByPlaceholderText(/responda com foco em retenção/i);
    expect(textarea).toBeDefined();
  });

  it('renderiza botão "Aplicar diretrizes"', () => {
    render(<AssistantSettingsPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Aplicar diretrizes')).toBeDefined();
  });

  it('chama onChangePrompt ao digitar no campo', () => {
    render(<AssistantSettingsPanel {...defaultProps} />, { wrapper: Wrapper });

    const textarea = screen.getByLabelText('Diretrizes permanentes');
    fireEvent.change(textarea, { target: { value: 'nova diretriz' } });

    expect(defaultProps.onChangePrompt).toHaveBeenCalledWith('nova diretriz');
  });

  it('chama onSave ao clicar em "Aplicar diretrizes"', () => {
    render(<AssistantSettingsPanel {...defaultProps} />, { wrapper: Wrapper });

    const saveBtn = screen.getByText('Aplicar diretrizes');
    fireEvent.click(saveBtn);

    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    render(<AssistantSettingsPanel {...defaultProps} />, { wrapper: Wrapper });

    const closeBtn = screen.getByLabelText('Fechar persona da IA');
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra valor customSystemPrompt no campo de texto', () => {
    const customPrompt = 'Sempre responda em tom profissional';

    render(
      <AssistantSettingsPanel {...defaultProps} customSystemPrompt={customPrompt} />,
      { wrapper: Wrapper },
    );

    const textarea = screen.getByLabelText('Diretrizes permanentes');
    expect((textarea as HTMLTextAreaElement).value).toBe(customPrompt);
  });

  it('mostra alerta informativo', () => {
    render(<AssistantSettingsPanel {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText(/Evite regras conflitantes/i)).toBeDefined();
  });
});
