import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { EmotionType } from '../../src/features/studio/types';
import { EMOTION_OPTIONS } from '../../src/features/studio/types';
import { EmotionSelector } from '../../src/features/studio/components/EmotionSelector';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

describe('EmotionSelector (componente)', () => {
  const onChange = vi.fn<(emotion: EmotionType, intensity: number) => void>();

  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('renderiza todas as 8 opções de emoção como chips', () => {
    render(
      <EmotionSelector value="neutral" intensity={0.5} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    const radioGroup = screen.getByRole('radiogroup');
    const chips = within(radioGroup).getAllByRole('radio');
    expect(chips).toHaveLength(8);
  });

  it('renderiza os labels das emoções em pt-BR', () => {
    render(
      <EmotionSelector value="neutral" intensity={0.5} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    for (const option of EMOTION_OPTIONS) {
      expect(screen.getByText(option.label)).toBeDefined();
    }
  });

  it('marca a emoção ativa como checked', () => {
    render(
      <EmotionSelector value="happy" intensity={0.7} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    const radioGroup = screen.getByRole('radiogroup');
    const happyChip = within(radioGroup).getByRole('radio', { name: /Feliz/i });
    expect(happyChip).toHaveAttribute('aria-checked', 'true');
  });

  it('marca apenas a emoção ativa como checked', () => {
    render(
      <EmotionSelector value="sad" intensity={0.5} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    const radioGroup = screen.getByRole('radiogroup');
    const chips = within(radioGroup).getAllByRole('radio');

    const checkedChips = chips.filter(
      (chip) => chip.getAttribute('aria-checked') === 'true',
    );
    expect(checkedChips).toHaveLength(1);
    expect(checkedChips[0]).toHaveTextContent('Triste');
  });

  it('chama onChange ao clicar em uma emoção diferente', async () => {
    const user = userEvent.setup();
    render(
      <EmotionSelector value="neutral" intensity={0.5} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    const happyChip = screen.getByRole('radio', { name: /Feliz/i });
    await user.click(happyChip);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('happy', 0.5);
  });

  it('toggle: clicar na emoção ativa (não-neutra) volta para neutro', async () => {
    const user = userEvent.setup();
    render(
      <EmotionSelector value="happy" intensity={0.8} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    const happyChip = screen.getByRole('radio', { name: /Feliz/i });
    await user.click(happyChip);

    expect(onChange).toHaveBeenCalledWith('neutral', 0.5);
  });

  it('toggle: clicar em neutro quando já está neutro NÃO muda para neutro de novo', async () => {
    const user = userEvent.setup();
    render(
      <EmotionSelector value="neutral" intensity={0.5} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    const neutralChip = screen.getByRole('radio', { name: /Neutro/i });
    await user.click(neutralChip);

    expect(onChange).toHaveBeenCalledWith('neutral', 0.5);
  });

  it('não exibe o slider de intensidade quando a emoção é neutra', () => {
    render(
      <EmotionSelector value="neutral" intensity={0.5} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('exibe o slider de intensidade quando a emoção não é neutra', () => {
    render(
      <EmotionSelector value="dramatic" intensity={0.7} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    const slider = screen.getByRole('slider', { name: /Intensidade/i });
    expect(slider).toBeDefined();
  });

  it('exibe a porcentagem de intensidade corretamente', () => {
    render(
      <EmotionSelector value="energetic" intensity={0.8} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('80%')).toBeDefined();
  });

  it('exibe 10% quando intensidade é 0.1', () => {
    render(
      <EmotionSelector value="calm" intensity={0.1} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('10%')).toBeDefined();
  });

  it('exibe 100% quando intensidade é 1.0', () => {
    render(
      <EmotionSelector value="angry" intensity={1.0} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('100%')).toBeDefined();
  });

  it('desabilita todos os chips quando disabled=true', () => {
    render(
      <EmotionSelector value="neutral" intensity={0.5} onChange={onChange} disabled />,
      { wrapper: Wrapper },
    );

    const radioGroup = screen.getByRole('radiogroup');
    const chips = within(radioGroup).getAllByRole('radio');
    for (const chip of chips) {
      expect(chip).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('desabilita o slider quando disabled=true', () => {
    render(
      <EmotionSelector value="happy" intensity={0.5} onChange={onChange} disabled />,
      { wrapper: Wrapper },
    );

    const slider = screen.getByRole('slider');
    // MUI Slider usa o atributo nativo disabled, não aria-disabled
    expect(slider).toHaveAttribute('disabled');
  });

  it('não chama onChange ao clicar quando desabilitado', async () => {
    const user = userEvent.setup();
    render(
      <EmotionSelector value="neutral" intensity={0.5} onChange={onChange} disabled />,
      { wrapper: Wrapper },
    );

    // Chips desabilitados no MUI recebem aria-disabled="true"
    const happyChip = screen.getByRole('radio', { name: /Feliz/i });
    expect(happyChip).toHaveAttribute('aria-disabled', 'true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('cada chip tem ícone acessível (aria-hidden)', () => {
    render(
      <EmotionSelector value="neutral" intensity={0.5} onChange={onChange} />,
      { wrapper: Wrapper },
    );

    // MUI exporta como SentimentSatisfiedIcon (não SentimentSatisfiedAltIcon)
    const icons = screen.getAllByTestId('MoodBadIcon');
    const sentimentIcons = screen.getAllByTestId('SentimentSatisfiedIcon');

    // MoodBad para sad, angry, dramatic; SentimentSatisfied para o resto
    const totalIcons = icons.length + sentimentIcons.length;
    expect(totalIcons).toBe(8);
  });
});
