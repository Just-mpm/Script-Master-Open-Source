import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { SCRIPT_TEMPLATES } from '../../src/data/scriptTemplates';
import type { ScriptTemplate } from '../../src/data/scriptTemplates';
import { TemplateGallery } from '../../src/features/studio/components/TemplateGallery';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

describe('TemplateGallery', () => {
  const onSelect = vi.fn<(template: ScriptTemplate) => void>();

  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('renderiza todos os templates sem filtro', () => {
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    const cards = screen.getAllByRole('button', { name: /Template:/i });
    expect(cards.length).toBe(SCRIPT_TEMPLATES.length);
  });

  it('renderiza o chip "Todos" como ativo inicialmente', () => {
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    const tablist = screen.getByRole('tablist');
    const allChip = within(tablist).getByRole('tab', { name: /Todos/i });
    expect(allChip).toHaveAttribute('aria-selected', 'true');
  });

  it('renderiza chips de categoria para cada categoria existente', () => {
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    // Deve ter chip para cada categoria + "Todos"
    const tablist = screen.getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    // 6 categorias + 1 "Todos" = 7 chips
    expect(tabs.length).toBeGreaterThanOrEqual(7);
  });

  it('filtra templates ao clicar no chip de categoria', async () => {
    const user = userEvent.setup();
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    const tablist = screen.getByRole('tablist');
    const youtubeChip = within(tablist).getByRole('tab', { name: /YouTube/i });
    await user.click(youtubeChip);

    // Agora deve ter apenas templates do YouTube
    const cards = screen.getAllByRole('button', { name: /Template:/i });
    const youtubeTemplates = SCRIPT_TEMPLATES.filter((t) => t.category === 'youtube');
    expect(cards.length).toBe(youtubeTemplates.length);
  });

  it('destaca o chip da categoria ativa', async () => {
    const user = userEvent.setup();
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    const tablist = screen.getByRole('tablist');
    const podcastChip = within(tablist).getByRole('tab', { name: /Podcast/i });
    await user.click(podcastChip);

    expect(podcastChip).toHaveAttribute('aria-selected', 'true');
  });

  it('desmarca chip "Todos" ao selecionar categoria', async () => {
    const user = userEvent.setup();
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    const tablist = screen.getByRole('tablist');
    const allChip = within(tablist).getByRole('tab', { name: /Todos/i });
    const podcastChip = within(tablist).getByRole('tab', { name: /Podcast/i });

    await user.click(podcastChip);
    expect(allChip).toHaveAttribute('aria-selected', 'false');
  });

  it('toggle: clicar na mesma categoria desmarca e volta para "Todos"', async () => {
    const user = userEvent.setup();
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    const tablist = screen.getByRole('tablist');
    const allChip = within(tablist).getByRole('tab', { name: /Todos/i });
    const youtubeChip = within(tablist).getByRole('tab', { name: /YouTube/i });

    // Clica em YouTube
    await user.click(youtubeChip);
    expect(youtubeChip).toHaveAttribute('aria-selected', 'true');

    // Clica novamente em YouTube (toggle)
    await user.click(youtubeChip);
    expect(youtubeChip).toHaveAttribute('aria-selected', 'false');
    expect(allChip).toHaveAttribute('aria-selected', 'true');

    // Todos os templates devem aparecer novamente
    const cards = screen.getAllByRole('button', { name: /Template:/i });
    expect(cards.length).toBe(SCRIPT_TEMPLATES.length);
  });

  it('clicar em "Todos" mostra todos os templates', async () => {
    const user = userEvent.setup();
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    const tablist = screen.getByRole('tablist');
    const podcastChip = within(tablist).getByRole('tab', { name: /Podcast/i });
    const allChip = within(tablist).getByRole('tab', { name: /Todos/i });

    // Filtra por podcast
    await user.click(podcastChip);
    let cards = screen.getAllByRole('button', { name: /Template:/i });
    expect(cards.length).toBeLessThan(SCRIPT_TEMPLATES.length);

    // Volta para Todos
    await user.click(allChip);
    cards = screen.getAllByRole('button', { name: /Template:/i });
    expect(cards.length).toBe(SCRIPT_TEMPLATES.length);
  });

  it('cada card de template na galeria é clicável e chama onSelect', async () => {
    const user = userEvent.setup();
    render(<TemplateGallery onSelect={onSelect} />, { wrapper: Wrapper });

    const firstCard = screen.getByRole('button', { name: /Template: Tutorial/i });
    await user.click(firstCard);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'youtube-tutorial' }),
    );
  });
});
