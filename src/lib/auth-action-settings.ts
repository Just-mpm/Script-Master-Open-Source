import type { ActionCodeSettings } from './firebase';

/**
 * ActionCodeSettings compartilhado para todas as ações de email do Firebase Auth.
 * Com handleCodeInApp: true, os links apontam para a página customizada
 * `/auth/action` em vez do handler padrão do Firebase.
 */
export const authActionCodeSettings: ActionCodeSettings = {
  url: `${window.location.origin}/auth/action`,
  handleCodeInApp: true,
};
