/**
 * Constantes compartilhadas do sistema de feedback.
 *
 * Mantém a lista de categorias e a chave do evento de abertura do dialog
 * sincronizadas entre todos os pontos de uso (FAB, banner, header, drawer).
 */

/** Categorias de feedback suportadas pelo backend (feedback.ts flow) */
export const FEEDBACK_CATEGORIES = [
  { value: 'general', i18nKey: 'categoryGeneral' },
  { value: 'bugs', i18nKey: 'categoryBugs' },
  { value: 'features', i18nKey: 'categoryFeatures' },
  { value: 'ux', i18nKey: 'categoryUX' },
  { value: 'performance', i18nKey: 'categoryPerformance' },
  { value: 'other', i18nKey: 'categoryOther' },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]['value'];

/** Evento DOM disparado para abrir o FeedbackDialog de qualquer lugar da app */
export const OPEN_FEEDBACK_DIALOG_EVENT = 's2a-open-feedback-dialog';

/** Z-index do FAB — entre MobileBottomNav (1200) e ActionBar (1400) */
export const FEEDBACK_FAB_Z_INDEX = 1250;

/** Valor de bônus de créditos exibido no badge (espelha FEEDBACK_BONUS_CREDITS do backend) */
export const FEEDBACK_BONUS_DISPLAY = 250;
