/**
 * FeedbackController — provê renderização global do FeedbackDialog.
 *
 * Deve ser montado uma única vez no App.tsx. Escuta o evento customizado
 * `OPEN_FEEDBACK_DIALOG_EVENT` e abre o dialog em resposta, repassando o
 * `screenContext` recebido via `event.detail`.
 *
 * O padrão segue o mesmo modelo do `AnalyticsConsentPrompt`, garantindo
 * consistência arquitetural e facilidade de disparo a partir de qualquer
 * componente (FAB, banner, header, drawer, links diretos).
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { FeedbackDialog } from './FeedbackDialog';
import { OPEN_FEEDBACK_DIALOG_EVENT } from './constants';

interface FeedbackOpenEventDetail {
  /** Contexto da tela atual pré-preenchido no form (ex: "/app/estudio") */
  screenContext?: string;
}

function isFeedbackOpenEventDetail(value: unknown): value is FeedbackOpenEventDetail {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.screenContext === undefined || typeof candidate.screenContext === 'string';
}

/**
 * Componente "sem render" que apenas gerencia o estado global do FeedbackDialog.
 * Deve ser montado uma vez no root da aplicação (App.tsx).
 */
export function FeedbackController(): ReactElement {
  const [open, setOpen] = useState(false);
  const [screenContext, setScreenContext] = useState<string | undefined>(undefined);

  // Ref para guardar o ID do timeout de limpeza e cancelar no cleanup (evita memory leak)
  const clearContextTimeoutRef = useRef<number | null>(null);

  const handleOpen = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<FeedbackOpenEventDetail>;
    const detail = customEvent.detail;
    if (isFeedbackOpenEventDetail(detail)) {
      setScreenContext(detail.screenContext);
    } else {
      setScreenContext(undefined);
    }
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Limpa o screenContext após fechar para não vazar entre aberturas
    if (clearContextTimeoutRef.current !== null) {
      window.clearTimeout(clearContextTimeoutRef.current);
    }
    clearContextTimeoutRef.current = window.setTimeout(() => {
      clearContextTimeoutRef.current = null;
      setScreenContext(undefined);
    }, 300);
  }, []);

  // Registra listener de abertura + cleanup ao desmontar
  useEffect(() => {
    window.addEventListener(OPEN_FEEDBACK_DIALOG_EVENT, handleOpen);
    return () => {
      window.removeEventListener(OPEN_FEEDBACK_DIALOG_EVENT, handleOpen);
      if (clearContextTimeoutRef.current !== null) {
        window.clearTimeout(clearContextTimeoutRef.current);
        clearContextTimeoutRef.current = null;
      }
    };
  }, [handleOpen]);

  return (
    <FeedbackDialog
      open={open}
      onClose={handleClose}
      defaultScreenContext={screenContext}
    />
  );
}
