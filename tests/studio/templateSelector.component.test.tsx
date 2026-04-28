import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { StudioSettingsPatch } from '../../src/features/studio/types';
import { TemplateSelector } from '../../src/features/studio/components/TemplateSelector';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

// Estado mock do store
const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    applySettings: vi.fn<(patch: StudioSettingsPatch) => void>(),
  },
}));

vi.mock('../../src/features/studio/store/index.ts', () => ({
  useStudioStore: {
    getState: () => storeMock,
    subscribe: vi.fn(),
  },
}));

describe('TemplateSelector', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  /** Helper para buscar o trigger — usa custom data attribute (não data-testid) */
  function getTrigger(): HTMLElement {
    return document.querySelector('[data-template-selector-trigger]')!;
  }

  it('renderiza o botão trigger com texto de templates', () => {
    render(<TemplateSelector />, { wrapper: Wrapper });

    const trigger = getTrigger();
    expect(trigger).toBeDefined();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('expande a galeria ao clicar no trigger', async () => {
    const user = userEvent.setup();
    render(<TemplateSelector />, { wrapper: Wrapper });

    const trigger = getTrigger();
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('colapsa ao clicar novamente no trigger (toggle)', async () => {
    const user = userEvent.setup();
    render(<TemplateSelector />, { wrapper: Wrapper });

    const trigger = getTrigger();
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('mostra a galeria de templates ao expandir', async () => {
    const user = userEvent.setup();
    render(<TemplateSelector />, { wrapper: Wrapper });

    const trigger = getTrigger();
    await user.click(trigger);

    const section = document.getElementById('template-selector-section');
    expect(section).toBeDefined();
  });

  it('abre o dialog de preview ao clicar em um template', async () => {
    const user = userEvent.setup();
    render(<TemplateSelector />, { wrapper: Wrapper });

    const trigger = getTrigger();
    await user.click(trigger);

    const firstCard = screen.getByRole('button', { name: /Template: Tutorial/i });
    await user.click(firstCard);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      // "Tutorial" aparece no card da galeria E no dialog — verifica dentro do dialog
      expect(within(screen.getByRole('dialog')).getByText('Tutorial')).toBeDefined();
    });
  });

  it('chama applySettings do store ao confirmar no dialog', async () => {
    const user = userEvent.setup();
    render(<TemplateSelector />, { wrapper: Wrapper });

    const trigger = getTrigger();
    await user.click(trigger);

    const firstCard = screen.getByRole('button', { name: /Template: Tutorial/i });
    await user.click(firstCard);

    await waitFor(() => {
      const applyButton = screen.getByRole('button', { name: /Aplicar/i });
      expect(applyButton).toBeDefined();
    });

    const applyButton = screen.getByRole('button', { name: /Aplicar/i });
    await user.click(applyButton);

    expect(storeMock.applySettings).toHaveBeenCalledTimes(1);
    // O patch do Tutorial inclui pace: 'slow'
    expect(storeMock.applySettings).toHaveBeenCalledWith(
      expect.objectContaining({ pace: 'slow' }),
    );
  });

  it('fecha a galeria ao aplicar um template', async () => {
    const user = userEvent.setup();
    render(<TemplateSelector />, { wrapper: Wrapper });

    const trigger = getTrigger();
    await user.click(trigger);

    const firstCard = screen.getByRole('button', { name: /Template: Tutorial/i });
    await user.click(firstCard);

    await waitFor(() => {
      const applyButton = screen.getByRole('button', { name: /Aplicar/i });
      expect(applyButton).toBeDefined();
    });

    const applyButton = screen.getByRole('button', { name: /Aplicar/i });
    await user.click(applyButton);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('fecha o dialog ao clicar em cancelar', async () => {
    const user = userEvent.setup();
    render(<TemplateSelector />, { wrapper: Wrapper });

    const trigger = getTrigger();
    await user.click(trigger);

    const firstCard = screen.getByRole('button', { name: /Template: Tutorial/i });
    await user.click(firstCard);

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      expect(cancelButton).toBeDefined();
    });

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
