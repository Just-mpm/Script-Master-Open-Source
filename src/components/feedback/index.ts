/**
 * Barrel export do sistema de feedback.
 *
 * Centraliza os pontos de entrada públicos do sistema:
 * - Componentes: FeedbackController, FeedbackDialog, FeedbackFormFields
 * - Hook: useFeedbackDialog
 * - Constantes: categorias, eventos
 */
export { FeedbackController } from './FeedbackController';
export { FeedbackDialog } from './FeedbackDialog';
export { FeedbackFormFields } from './FeedbackFormFields';
export type { FeedbackFormFieldsProps, FeedbackSubmitResult } from './FeedbackFormFields';
export { useFeedbackDialog } from './useFeedbackDialog';
export type { OpenFeedbackDialog } from './useFeedbackDialog';
export {
  FEEDBACK_CATEGORIES,
  OPEN_FEEDBACK_DIALOG_EVENT,
} from './constants';
export type { FeedbackCategory } from './constants';
