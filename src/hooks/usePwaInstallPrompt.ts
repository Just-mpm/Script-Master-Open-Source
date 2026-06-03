/**
 * Hook que integra o app com a API nativa de instalação PWA.
 *
 * Responsabilidades:
 * - Captura o `BeforeInstallPromptEvent` nativo (Chrome/Edge) e armazena no
 *   store singleton para sobreviver a mudanças de rota.
 * - Detecta o evento `appinstalled` para marcar o app como instalado.
 * - Inscreve no pub/sub do store para re-renderizar quando a elegibilidade
 *   muda (instalado, dismiss, cooldown expirado, etc.).
 * - Aplica o delay de 3s (`SHOW_DELAY_MS` do store) reagindo ao evento
 *   `subscribeDelayResolved` do store — substitui o antigo polling de 500ms.
 *
 * O `canShow` retornado já combina `store.canShow && delayResolved`,
 * conforme convenção documentada no próprio store.
 */

import { useCallback, useEffect, useState } from 'react';
import type { BeforeInstallPromptEvent } from '../types/pwa';
import {
  clearDeferredPrompt,
  getDeferredPrompt,
  getInstallState,
  recordDismiss,
  recordInstalled,
  setDeferredPrompt,
  shouldDelayShow,
  subscribe,
  subscribeDelayResolved,
} from '../lib/pwa/install-prompt-store';
import type { InstallPromptState } from '../lib/pwa/install-prompt-store';
import { createLogger } from '../lib/logger';

const log = createLogger('PWA');

export type UsePwaInstallPromptReturn = {
  /** true se elegível e com o delay de 3s já resolvido */
  canShow: boolean;
  /** true se o app já está instalado (standalone ou flag manual) */
  isInstalled: boolean;
  /** Dispara o prompt nativo de instalação. Retorna a escolha do usuário. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'error'>;
  /** Registra recusa do usuário (fecha banner + grava no localStorage) */
  dismiss: () => void;
};

export function usePwaInstallPrompt(): UsePwaInstallPromptReturn {
  const [state, setState] = useState<InstallPromptState>(() => getInstallState());
  // Inicializa com base em `shouldDelayShow()` para o caso do delay já ter
  // expirado antes do hook montar (inscrição tardia em `subscribeDelayResolved`
  // não dispara o evento novamente).
  const [delayResolved, setDelayResolved] = useState<boolean>(() => !shouldDelayShow());

  // Inscreve no pub/sub do store para reagir a mudanças (captura de evento,
  // dismiss, instalação, etc.). Snapshot inicial já vem do useState acima.
  useEffect(() => {
    const unsubscribe = subscribe((next) => {
      setState(next);
      // Se o store deixou de ser elegível (dismiss, instalado, etc.) e o delay
      // não importa mais, garante que `delayResolved` não bloqueia o estado.
      if (!next.canShow) {
        setDelayResolved(true);
      }
    });
    return unsubscribe;
  }, []);

  // Inscreve no pub/sub dedicado do delay. O store dispara este evento
  // exatamente uma vez por `setDeferredPrompt` quando `SHOW_DELAY_MS` expira.
  // Se o delay já tiver expirado antes da inscrição (caso comum se o hook
  // montar 3s+ após a captura), o estado inicial `delayResolved` já reflete.
  useEffect(() => {
    const unsubscribe = subscribeDelayResolved(() => {
      setDelayResolved(true);
    });
    return unsubscribe;
  }, []);

  // Listeners nativos: captura o prompt deferido e detecta instalação efetiva.
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent): void => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = (): void => {
      recordInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'error'> => {
    const event = getDeferredPrompt();
    if (event === null) {
      return 'error';
    }

    // Limpa o deferredPrompt ANTES de chamar prompt() para mitigar risco de
    // chamada dupla (race condition entre re-render e clique do usuário).
    clearDeferredPrompt();

    try {
      await event.prompt();
      const choice = await event.userChoice;
      return choice.outcome;
    } catch (err: unknown) {
      log.error('Falha ao disparar prompt de instalação PWA', {
        error: err instanceof Error ? err.message : String(err),
      });
      return 'error';
    }
  }, []);

  const dismiss = useCallback((): void => {
    recordDismiss();
  }, []);

  return {
    canShow: state.canShow && delayResolved,
    isInstalled: state.isInstalled,
    promptInstall,
    dismiss,
  };
}
