import { ErrorToast } from '../ErrorToast';
import { SuccessToast } from '../SuccessToast';
import { WarningToast } from '../WarningToast';

interface ToastManagerProps {
  activeError: string | null;
  onDismissError: () => void;
  warning: string | null;
  onDismissWarning: () => void;
  successMessage: string | null;
  onDismissSuccess: () => void;
}

/**
 * Componente que centraliza a renderização dos toasts genéricos da aplicação:
 * - ErrorToast (erros de auth e estúdio)
 * - WarningToast (avisos parciais de geração de cenas)
 * - SuccessToast (feedback de sucesso)
 *
 * NOTA: o Snackbar de progresso de exportação de vídeo migrou para
 * `ExportCrossRouteToast` (M6) em `App.tsx`, para sobreviver à navegação
 * entre rotas.
 */
export function ToastManager({
  activeError,
  onDismissError,
  warning,
  onDismissWarning,
  successMessage,
  onDismissSuccess,
}: ToastManagerProps) {
  return (
    <>
      <ErrorToast error={activeError} onDismiss={onDismissError} />
      <WarningToast warning={warning} onDismiss={onDismissWarning} />
      <SuccessToast message={successMessage} onDismiss={onDismissSuccess} />
    </>
  );
}
