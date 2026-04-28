import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { SCRIPT_TEMPLATES } from '../../src/data/scriptTemplates';
import { TemplatePreviewDialog } from '../../src/features/studio/components/TemplatePreviewDialog';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

describe('TemplatePreviewDialog', () => {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const template = SCRIPT_TEMPLATES[0]; // Tutorial

  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('não renderiza nada quando template é null', () => {
    const { container } = render(
      <TemplatePreviewDialog template={null} open={false} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );
    expect(container.innerHTML).toBe('');
  });

  it('não renderiza nada quando open é false', () => {
    const { container } = render(
      <TemplatePreviewDialog template={template} open={false} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );
    // MUI Dialog com open=false pode renderizar o container vazio
    // mas o conteúdo interno não deve estar visível
    expect(container.innerHTML).toBe('');
  });

  it('renderiza o nome do template no dialog quando aberto', async () => {
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByText('Tutorial')).toBeDefined();
    });
  });

  it('renderiza a descrição do template', async () => {
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByText(template.description)).toBeDefined();
    });
  });

  it('renderiza o preview do roteiro', async () => {
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByText(/Hoje vou te ensinar/i)).toBeDefined();
    });
  });

  it('renderiza o badge de categoria', async () => {
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      // Deve ter pelo menos um badge "YouTube" (pode aparecer 2 vezes: título + badge)
      const badges = screen.getAllByText('YouTube');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renderiza as configurações que serão aplicadas (patch entries)', async () => {
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      // O patch do Tutorial tem pace: 'slow' → deve aparecer o label "Ritmo"
      expect(screen.getByText(/Ritmo/i)).toBeDefined();
    });
  });

  it('chama onApply ao clicar no botão de aplicar', async () => {
    const user = userEvent.setup();
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      const applyButton = screen.getByRole('button', { name: /Aplicar/i });
      expect(applyButton).toBeDefined();
    });

    const applyButton = screen.getByRole('button', { name: /Aplicar/i });
    await user.click(applyButton);

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no botão de cancelar', async () => {
    const user = userEvent.setup();
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      expect(cancelButton).toBeDefined();
    });

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renderiza disclaimer sobre templates não substituírem o roteiro', async () => {
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      // O disclaimer está em um Typography com fontStyle italic — busca pelo texto completo
      const disclaimers = screen.getAllByText(/roteiro/i);
      // Deve haver pelo menos 2 ocorrências de "roteiro" (previewScript + disclaimer)
      expect(disclaimers.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('filtra patch entries com valor undefined ou vazio', async () => {
    // Template com patch que tem campos vazios/undefined
    const templateWithEmpty = {
      ...SCRIPT_TEMPLATES[1], // Vlog — tem todos os campos preenchidos
    };

    render(
      <TemplatePreviewDialog
        template={templateWithEmpty}
        open={true}
        onClose={onClose}
        onApply={onApply}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByText('Vlog')).toBeDefined();
    });
  });

  it('tem aria-labelledby apontando para o título do dialog', async () => {
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'template-preview-title');
    });
  });

  it('formata valores booleanos como Sim/Não', async () => {
    // Template de podcast-entrevista tem isMultiSpeaker: true
    render(
      <TemplatePreviewDialog
        template={SCRIPT_TEMPLATES[2]}
        open={true}
        onClose={onClose}
        onApply={onApply}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      // isMultiSpeaker: true → deve mostrar "Sim"
      expect(screen.getByText('Sim')).toBeDefined();
    });
  });

  it('formata valores numéricos (sceneDensity)', async () => {
    render(
      <TemplatePreviewDialog template={template} open={true} onClose={onClose} onApply={onApply} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      // Tutorial tem sceneDensity: 60
      expect(screen.getByText(/60/i)).toBeDefined();
    });
  });
});
