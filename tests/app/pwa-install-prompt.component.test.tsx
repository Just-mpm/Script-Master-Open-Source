/**
 * Testes do componente `PwaInstallPrompt` — banner glass de instalação PWA.
 *
 * Cobre:
 * - Renderização condicional (canShow + serialização com update/analytics prompts)
 * - Eventos do componente (clique em "Instalar" / "Agora não")
 * - Acessibilidade (role="status", aria-labelledby)
 * - Toast de sucesso na instalação aceita + toast.error em caso de falha
 * - Coordenação de empilhamento via PWA_UPDATE_VISIBILITY_EVENT
 *
 * O hook `usePwaInstallPrompt` é mockado para isolar a lógica de UI da
 * lógica de captura/elegibilidade (já coberta em outros testes).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nProvider } from '../../src/features/i18n';
import { PWA_UPDATE_VISIBILITY_EVENT } from '../../src/components/app/PwaUpdatePrompt';
import { PwaInstallPrompt } from '../../src/components/app/PwaInstallPrompt';

// ─── Estado do hook mockado ──────────────────────────────────────
const hookState = vi.hoisted(() => ({
  canShow: true,
  isInstalled: false,
  promptInstall: vi.fn(),
  dismiss: vi.fn(),
}));

// ─── Estado do analytics ─────────────────────────────────────────
const analyticsState = vi.hoisted(() => ({
  consent: 'unknown' as 'unknown' | 'granted' | 'denied',
  changedEvent: 's2a-analytics-consent-changed',
}));

// ─── Mock do hook ────────────────────────────────────────────────
vi.mock('../../src/hooks/usePwaInstallPrompt', () => ({
  usePwaInstallPrompt: () => ({
    canShow: hookState.canShow,
    isInstalled: hookState.isInstalled,
    promptInstall: () => hookState.promptInstall(),
    dismiss: () => hookState.dismiss(),
  }),
}));

// ─── Mock do analytics (consent + evento de mudança) ─────────────
vi.mock('../../src/lib/analytics', () => ({
  ANALYTICS_CONSENT_CHANGED_EVENT: analyticsState.changedEvent,
  getAnalyticsConsent: () => analyticsState.consent,
}));

// ─── Mock do logger ──────────────────────────────────────────────
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  }),
}));

// ─── Mock do react-hot-toast ─────────────────────────────────────
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

import toast from 'react-hot-toast';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function renderComponent(): ReturnType<typeof render> {
  return render(
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>
        <PwaInstallPrompt />
      </ThemeProvider>
    </I18nProvider>,
  );
}

function resetMocks(): void {
  hookState.canShow = true;
  hookState.isInstalled = false;
  hookState.promptInstall.mockReset();
  hookState.promptInstall.mockResolvedValue('accepted');
  hookState.dismiss.mockReset();
  analyticsState.consent = 'granted';
}

/**
 * Verifica se o Paper do Snackbar está visível para o usuário.
 *
 * MUI Snackbar mantém o Paper montado no DOM mesmo com `open=false` —
 * a transição Slide apenas o move off-screen via `transform: translateY()`.
 * Esta função considera "invisível" o Paper que está fora da tela.
 *
 * O Paper é identificado por `role="status"` (WAI-ARIA: `role="status"`
 * já implica `aria-live="polite"` + `aria-atomic="true"`).
 */
function isPromptVisible(): boolean {
  const status = screen.queryByRole('status');
  if (!status) return false;
  const style = status.getAttribute('style') ?? '';
  // Quando Slide está em "exited", o Paper tem `transform: translateY(Npx)`
  return !style.includes('translateY(');
}

describe('PwaInstallPrompt', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Renderização condicional
  // ---------------------------------------------------------------------------

  describe('renderização condicional', () => {
    it('renderiza Snackbar aberto quando canShow=true e sem prompts concorrentes', () => {
      renderComponent();
      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
      expect(isPromptVisible()).toBe(true);
    });

    it('não renderiza o Paper (status) quando canShow=false', () => {
      hookState.canShow = false;
      renderComponent();
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('não renderiza quando isInstalled=true (já instalado)', () => {
      hookState.isInstalled = true;
      renderComponent();
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('fica invisível quando PwaUpdatePrompt emite PWA_UPDATE_VISIBILITY_EVENT=true', () => {
      renderComponent();
      expect(isPromptVisible()).toBe(true);
      act(() => {
        window.dispatchEvent(
          new CustomEvent(PWA_UPDATE_VISIBILITY_EVENT, { detail: true }),
        );
      });
      expect(isPromptVisible()).toBe(false);
    });

    it('volta a ficar visível quando PWA_UPDATE_VISIBILITY_EVENT retorna false', () => {
      renderComponent();
      act(() => {
        window.dispatchEvent(
          new CustomEvent(PWA_UPDATE_VISIBILITY_EVENT, { detail: true }),
        );
      });
      expect(isPromptVisible()).toBe(false);
      act(() => {
        window.dispatchEvent(
          new CustomEvent(PWA_UPDATE_VISIBILITY_EVENT, { detail: false }),
        );
      });
      expect(isPromptVisible()).toBe(true);
    });

    it('fica invisível quando consentimento de analytics está "unknown"', () => {
      analyticsState.consent = 'unknown';
      renderComponent();
      expect(isPromptVisible()).toBe(false);
    });

    it('fica visível quando consentimento de analytics é "granted"', () => {
      analyticsState.consent = 'granted';
      renderComponent();
      expect(isPromptVisible()).toBe(true);
    });

    it('fica visível quando consentimento de analytics é "denied"', () => {
      analyticsState.consent = 'denied';
      renderComponent();
      expect(isPromptVisible()).toBe(true);
    });

    it('reage ao evento ANALYTICS_CONSENT_CHANGED_EVENT', () => {
      analyticsState.consent = 'unknown';
      renderComponent();
      expect(isPromptVisible()).toBe(false);

      act(() => {
        analyticsState.consent = 'granted';
        window.dispatchEvent(new CustomEvent(analyticsState.changedEvent));
      });

      expect(isPromptVisible()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Interações
  // ---------------------------------------------------------------------------

  describe('interações', () => {
    it('clique em "Instalar" chama promptInstall do hook', () => {
      renderComponent();
      const installButton = screen.getByRole('button', { name: /Instalar/i });
      fireEvent.click(installButton);
      expect(hookState.promptInstall).toHaveBeenCalledTimes(1);
    });

    it('clique em "Agora não" chama dismiss do hook', () => {
      renderComponent();
      const dismissButton = screen.getByRole('button', { name: /Agora n.o/i });
      fireEvent.click(dismissButton);
      expect(hookState.dismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Toast de sucesso / erro
  // ---------------------------------------------------------------------------

  describe('toast de sucesso', () => {
    it('dispara toast.success quando promptInstall retorna "accepted"', async () => {
      hookState.promptInstall.mockResolvedValue('accepted');
      renderComponent();
      const installButton = screen.getByRole('button', { name: /Instalar/i });
      await act(async () => {
        fireEvent.click(installButton);
      });
      expect(toast.success).toHaveBeenCalledTimes(1);
      const [message, options] = vi.mocked(toast.success).mock.calls[0] as [
        string,
        { duration: number; icon: string } | undefined,
      ];
      expect(message).toContain('instalado');
      expect(options?.duration).toBe(4000);
      expect(options?.icon).toBe('✅');
    });

    it('NÃO dispara toast quando promptInstall retorna "dismissed"', async () => {
      hookState.promptInstall.mockResolvedValue('dismissed');
      renderComponent();
      const installButton = screen.getByRole('button', { name: /Instalar/i });
      await act(async () => {
        fireEvent.click(installButton);
      });
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('toast de erro', () => {
    it('dispara toast.error quando promptInstall retorna "error" (GAP-10)', async () => {
      hookState.promptInstall.mockResolvedValue('error');
      renderComponent();
      const installButton = screen.getByRole('button', { name: /Instalar/i });
      await act(async () => {
        fireEvent.click(installButton);
      });
      expect(toast.error).toHaveBeenCalledTimes(1);
      const [message] = vi.mocked(toast.error).mock.calls[0] as [string];
      // i18n resolve para a string pt-BR do dicionário
      expect(message).toContain('Não foi possível');
    });

    it('NÃO dispara toast.success junto com o toast.error', async () => {
      hookState.promptInstall.mockResolvedValue('error');
      renderComponent();
      const installButton = screen.getByRole('button', { name: /Instalar/i });
      await act(async () => {
        fireEvent.click(installButton);
      });
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Acessibilidade (WAI-ARIA)
  // ---------------------------------------------------------------------------

  describe('acessibilidade', () => {
    it('Paper usa role="status" (WAI-ARIA: implica aria-live="polite")', () => {
      renderComponent();
      const status = screen.getByRole('status');
      // role="status" já implica aria-live="polite" e aria-atomic="true"
      // pela própria spec WAI-ARIA, então não declaramos explicitamente.
      expect(status).not.toHaveAttribute('aria-live');
      expect(status).not.toHaveAttribute('role', 'alert');
    });

    it('Paper tem aria-labelledby apontando para o id do título (GAP-09)', () => {
      renderComponent();
      const status = screen.getByRole('status');
      const labelledBy = status.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      // O elemento com esse id deve ser o Typography que renderiza pwaInstall.title
      const titleElement = labelledBy ? document.getElementById(labelledBy) : null;
      expect(titleElement).not.toBeNull();
      expect(titleElement?.textContent).toContain('Instale o Script Master');
    });

    it('Paper NÃO tem aria-label (substituído por aria-labelledby)', () => {
      renderComponent();
      const status = screen.getByRole('status');
      expect(status).not.toHaveAttribute('aria-label');
    });
  });

  // ---------------------------------------------------------------------------
  // Coordenação de empilhamento (offset bottom)
  // ---------------------------------------------------------------------------

  describe('empilhamento (PWA_UPDATE_VISIBILITY_EVENT)', () => {
    /**
     * Devolve o conteúdo da regra CSS gerada pelo Emotion para o elemento
     * (classe `css-XXXX`). O valor de `bottom` do `sx` do Snackbar é
     * serializado em uma regra com `@media`, que o `getComputedStyle` do
     * jsdom não aplica — por isso lemos direto das tags `<style data-emotion>`.
     */
    function getEmotionCssForElement(element: Element): string {
      const className = Array.from(element.classList).find((c) =>
        c.startsWith('css-'),
      );
      if (!className) return '';
      const styles = document.querySelectorAll('style[data-emotion]');
      const chunks: string[] = [];
      for (const style of styles) {
        const text = style.textContent ?? '';
        if (text.includes(`.${className}`)) {
          chunks.push(text);
        }
      }
      return chunks.join('\n');
    }

    it('aplica offset bottom padrão (90px) quando update prompt NÃO está visível', () => {
      const { container } = renderComponent();
      const root = container.querySelector('.MuiSnackbar-root');
      expect(root).toBeInTheDocument();
      const css = getEmotionCssForElement(root as Element);
      expect(css).toContain('bottom:90px!important');
    });

    it('aplica offset bottom empilhado (200px) quando update prompt está visível', () => {
      const { container } = renderComponent();
      act(() => {
        window.dispatchEvent(
          new CustomEvent(PWA_UPDATE_VISIBILITY_EVENT, { detail: true }),
        );
      });
      // Quando updateVisible=true, o Snackbar é ocultado, mas o sx ainda é
      // aplicado ao root (MUI mantém o root montado com open=false).
      const root = container.querySelector('.MuiSnackbar-root');
      expect(root).toBeInTheDocument();
      const css = getEmotionCssForElement(root as Element);
      expect(css).toContain('bottom:200px!important');
    });

    it('muda a classe Emotion do Snackbar quando PWA_UPDATE_VISIBILITY_EVENT alterna', () => {
      const { container } = renderComponent();
      const before = (container.querySelector('.MuiSnackbar-root') as HTMLElement)
        .className;
      act(() => {
        window.dispatchEvent(
          new CustomEvent(PWA_UPDATE_VISIBILITY_EVENT, { detail: true }),
        );
      });
      const after = (container.querySelector('.MuiSnackbar-root') as HTMLElement)
        .className;
      expect(before).not.toBe(after);
    });

    it('remove listeners do window no unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderComponent();
      unmount();
      const types = removeSpy.mock.calls.map(([type]) => type);
      expect(types).toContain(PWA_UPDATE_VISIBILITY_EVENT);
      expect(types).toContain(analyticsState.changedEvent);
      removeSpy.mockRestore();
    });
  });
});
