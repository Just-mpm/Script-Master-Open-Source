/**
 * Barrel export do sistema de feedback.
 *
 * Centraliza os pontos de entrada públicos do sistema:
 * - Componentes: FeedbackController, FeedbackDialog, FeedbackFormFields
 * - Hook: useFeedbackDialog
 * - Constantes: categorias, eventos, z-index
 */
export { FeedbackController } from './FeedbackController';
export { FeedbackDialog } from './FeedbackDialog';
export { FeedbackFab } from './FeedbackFab';
export { FeedbackBanner } from './FeedbackBanner';
export { FeedbackFormFields } from './FeedbackFormFields';
export type { FeedbackFormFieldsProps, FeedbackSubmitResult } from './FeedbackFormFields';
export type { FeedbackBannerProps } from './FeedbackBanner';
export { useFeedbackDialog } from './useFeedbackDialog';
export type { OpenFeedbackDialog } from './useFeedbackDialog';
export {
  FEEDBACK_CATEGORIES,
  OPEN_FEEDBACK_DIALOG_EVENT,
  FEEDBACK_FAB_Z_INDEX,
  FEEDBACK_BONUS_DISPLAY,
} from './constants';
export type { FeedbackCategory } from './constants';
