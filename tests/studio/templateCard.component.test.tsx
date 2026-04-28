import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { SCRIPT_TEMPLATES } from '../../src/data/scriptTemplates';
import type { ScriptTemplate } from '../../src/data/scriptTemplates';
import { TemplateCard } from '../../src/features/studio/components/TemplateCard';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

describe('TemplateCard', () => {
  const onSelect = vi.fn<(template: ScriptTemplate) => void>();
  const template = SCRIPT_TEMPLATES[0]; // Tutorial

  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('renderiza o nome do template', () => {
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });
    expect(screen.getByText('Tutorial')).toBeDefined();
  });

  it('renderiza a descrição do template', () => {
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });
    expect(screen.getByText(template.description)).toBeDefined();
  });

  it('renderiza o badge de categoria', () => {
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });
    expect(screen.getByText('YouTube')).toBeDefined();
  });

  it('renderiza como botão acessível com role="button"', () => {
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });
    const card = screen.getByRole('button', { name: /Template: Tutorial/i });
    expect(card).toBeDefined();
  });

  it('tem tabIndex=0 para navegação por teclado', () => {
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('não está pressionado quando selected=false', () => {
    render(<TemplateCard template={template} selected={false} onSelect={onSelect} />, { wrapper: Wrapper });
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it('está pressionado quando selected=true', () => {
    render(<TemplateCard template={template} selected onSelect={onSelect} />, { wrapper: Wrapper });
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('chama onSelect ao clicar no card', async () => {
    const user = userEvent.setup();
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });

    const card = screen.getByRole('button');
    await user.click(card);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(template);
  });

  it('chama onSelect ao pressionar Enter', async () => {
    const user = userEvent.setup();
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(template);
  });

  it('chama onSelect ao pressionar Space', async () => {
    const user = userEvent.setup();
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledWith(template);
  });

  it('renderiza ícone do template (School para Tutorial)', () => {
    render(<TemplateCard template={template} onSelect={onSelect} />, { wrapper: Wrapper });
    // School icon deve estar presente
    const icon = screen.getByTestId('SchoolIcon');
    expect(icon).toBeDefined();
  });

  it('renderiza fallback School quando ícone é desconhecido', () => {
    const unknownTemplate = {
      ...template,
      icon: 'UnknownIcon',
    };
    render(<TemplateCard template={unknownTemplate} onSelect={onSelect} />, { wrapper: Wrapper });
    // Deve renderizar School como fallback
    const icon = screen.getByTestId('SchoolIcon');
    expect(icon).toBeDefined();
  });

  it('renderiza label de categoria correto para cada template', () => {
    const { rerender } = render(
      <TemplateCard template={SCRIPT_TEMPLATES[2]} onSelect={onSelect} />,
      { wrapper: Wrapper },
    );
    // podcast-entrevista → Podcast
    expect(screen.getByText('Podcast')).toBeDefined();

    rerender(
      <Wrapper>
        <TemplateCard template={SCRIPT_TEMPLATES[4]} onSelect={onSelect} />
      </Wrapper>,
    );
    // educacao-aula → Educação
    expect(screen.getByText('Educação')).toBeDefined();
  });
});
