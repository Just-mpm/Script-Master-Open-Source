/**
 * useFeedbackDialog — hook imperativo para abrir o FeedbackDialog.
 *
 * Dispara o evento customizado `OPEN_FEEDBACK_DIALOG_EVENT` na window, que é
 * capturado pelo `FeedbackController` (montado no App.tsx).
 *
 * Permite abrir o dialog de QUALQUER lugar da app sem prop drilling.
 *
 * @example
 * ```tsx
 * const openFeedback = useFeedbackDialog();
 *
 * <Button onClick={() => openFeedback('/app/estudio')}>
 *   Dar feedback
 * </Button>
 * ```
 */
import { useCallback } from 'react';
import { OPEN_FEEDBACK_DIALOG_EVENT } from './constants';

export type OpenFeedbackDialog = (screenContext?: string) => void;

/**
 * Retorna uma função que abre o FeedbackDialog.
 * Opcionalmente aceita o `screenContext` (geralmente a rota atual) para
 * pré-preencher o campo "Tela atual" do form.
 */
export function useFeedbackDialog(): OpenFeedbackDialog {
  return useCallback((screenContext?: string) => {
    const event = new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT, {
      detail: { screenContext },
    });
    window.dispatchEvent(event);
  }, []);
}
