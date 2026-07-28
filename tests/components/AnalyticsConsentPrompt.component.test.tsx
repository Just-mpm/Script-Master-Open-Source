/**
 * Testes de regressão do AnalyticsConsentPrompt.
 *
 * GAP-07: garantir que o Snackbar do cookie consent mantém os botões
 * (Recusar / Aceitar) ABAIXO do texto descritivo, no canto direito,
 * em todas as larguras. Antes o componente usava `actionPlacement="stack"`,
 * que em `direction="row"` (sm+) renderiza o stackedActionBlock como mais
 * um item do flex row, jogando os botões para o canto superior direito
 * (anti-pattern confirmado pelo notebook MUI v9).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../src/features/i18n';
import { AnalyticsConsentPrompt } from '../../src/components/app/AnalyticsConsentPrompt';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function renderWithProviders() {
  return render(
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>
        {/* MemoryRouter é necessário porque o `AnalyticsConsentPrompt`
            usa `RouterLink` (react-router-dom) no link "Saiba mais" da
            descrição do Snackbar. Sem Router, `useContext` retorna null
            e o componente quebra com "Cannot destructure property 'basename'". */}
        <MemoryRouter initialEntries={['/']}>
          <AnalyticsConsentPrompt />
        </MemoryRouter>
      </ThemeProvider>
    </I18nProvider>,
  );
}

describe('AnalyticsConsentPrompt', () => {
  beforeEach(() => {
    // consent = 'unknown' garante Snackbar visível (sem decisão salva).
    localStorage.removeItem('s2a_analytics_consent');
    // Garante locale pt-BR para que os textos esperados ("Recusar",
    // "Aceitar", "Cookies analíticos") apareçam. Sem isso, o
    // I18nProvider cai no default (en) e os textos ficam em inglês.
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  it('renderiza título, descrição e botões Recusar/Aceitar', () => {
    renderWithProviders();
    expect(screen.getByText('Cookies analíticos')).toBeInTheDocument();
    expect(screen.getByText(/Podemos coletar métricas pseudônimas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeInTheDocument();
  });

  it('GAP-07: botões ficam DEPOIS do título+descrição no DOM (bottomActionBlock)', () => {
    const { container } = renderWithProviders();
    const title = screen.getByText('Cookies analíticos');
    const description = screen.getByText(/Podemos coletar métricas pseudônimas/i);
    const rejectBtn = screen.getByRole('button', { name: 'Recusar' });
    const acceptBtn = screen.getByRole('button', { name: 'Aceitar' });

    // Title e description devem estar ANTES dos botões no DOM.
    // compareDocumentPosition retorna bitmask; FOLLOWING = 0x04.
    expect(title.compareDocumentPosition(rejectBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(description.compareDocumentPosition(rejectBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(acceptBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(description.compareDocumentPosition(acceptBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('GAP-07: botões ficam fora do mainRow (em wrapper próprio com alignItems: flex-end)', () => {
    const { container } = renderWithProviders();
    const rejectBtn = screen.getByRole('button', { name: 'Recusar' });

    // O bottomActionBlock é um Box com display:flex + justifyContent:flex-end.
    // Verifica que o pai imediato do botão tem esses estilos aplicados
    // (Emotion gera classes, comparamos contra o style inline se houver,
    // ou contra as regras CSS injetadas em <style>).
    const styles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join(' ');

    // O Box do bottomActionBlock precisa ter display:flex para alinhar.
    expect(styles).toMatch(/display:\s*flex/);
    // justifyContent: flex-end garante canto direito (actionAlign="end").
    expect(styles).toMatch(/justify-content:\s*flex-end/);

    // Sanidade: o botão existe dentro do Paper.
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
    expect(within(paper as HTMLElement).getByRole('button', { name: 'Recusar' })).toBeInTheDocument();
    expect(within(paper as HTMLElement).getByRole('button', { name: 'Aceitar' })).toBeInTheDocument();
  });
});
