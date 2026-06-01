import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, deleteUser, signOut, onAuthStateChanged, type User } from '../lib/firebase';
import { ensureAppCheck } from '../lib/app-check';
import { createLogger } from '../lib/logger';
import { DataMigrationDialog } from '../components/DataMigrationDialog';
import { isMigrationAlreadyHandled } from '../lib/db/migration';
import { deleteAllUserData } from '../lib/db/account-cleanup';
import { getUserSettings } from '../lib/db/user-settings';
import { useBillingInit } from '../features/billing/hooks';
import { isBillingEnabled } from '../lib/env';
import type { StudioDraftState } from '../features/studio/types';
import { useStudioStore } from '../features/studio/store';

const log = createLogger('AuthContext');

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Popup fechado pelo usuario. Tente novamente.',
  'auth/cancelled-popup-request': 'Login cancelado.',
  'auth/popup-blocked': 'Popup bloqueado pelo navegador. Permita popups para este site.',
  'auth/network-request-failed': 'Erro de conexao. Verifique sua internet.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
  'auth/email-already-in-use': 'Este email ja esta cadastrado.',
  'auth/invalid-email': 'Email invalido.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/user-not-found': 'Nenhuma conta encontrada com este email.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'Email ou senha incorretos.',
  'auth/requires-recent-login': 'Sessão expirada. Faça login novamente e tente excluir sua conta.',
};

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && 'code' in error) {
    const code = (error as { code: string }).code;
    return AUTH_ERROR_MESSAGES[code] ?? 'Erro ao fazer login. Tente novamente.';
  }
  return 'Erro inesperado. Tente novamente.';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  // Ref para o userId do último onAuthStateChanged — evita re-verificação
  // se o callback disparar múltiplas vezes com o mesmo usuário
  const lastCheckedUserId = useRef<string | null>(null);

  // Flag que indica se o login foi disparado ativamente (via popup).
  // Usada para diferenciar login ativo de restauração de sessão.
  const wasLoginRequested = useRef(false);

  // Inicializa billing quando auth estiver pronto (apenas se billing habilitado)
  const billingEnabled = isBillingEnabled();
  useBillingInit(billingEnabled ? !loading : false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);

      if (authUser) {
        const onboardingCompleted = localStorage.getItem('s2a_onboarding_completed') === 'true';

        // Login ativo recém-concluído: full reload para ativar COEP
        if (wasLoginRequested.current) {
          wasLoginRequested.current = false;
          try { await ensureAppCheck(); } catch { /* App Check falhou — chamadas podem falhar, mas app não trava */ }
          if (onboardingCompleted) {
            window.location.href = '/app/assistente';
          } else {
            // Verifica Firestore antes de redirecionar (localStorage pode ter sido limpo entre sessões)
            getUserSettings(authUser.uid).then((settings) => {
              const actuallyCompleted = settings && (settings.name || settings.goals?.length);
              if (actuallyCompleted) {
                localStorage.setItem('s2a_onboarding_completed', 'true');
                window.location.href = '/app/assistente';
              } else {
                window.location.href = '/onboarding';
              }
            }).catch(() => {
              window.location.href = '/onboarding';
            });
          }
          return;
        }

        // Sessão restaurada: verifica localStorage + Firestore antes de decidir
        if (!onboardingCompleted) {
          try { await ensureAppCheck(); } catch { /* App Check falhou — chamadas podem falhar, mas app não trava */ }
          getUserSettings(authUser.uid).then((settings) => {
            const actuallyCompleted = settings && (settings.name || settings.goals?.length);
            if (actuallyCompleted) {
              localStorage.setItem('s2a_onboarding_completed', 'true');
            }

            // Carregar settings do estúdio do Firestore ANTES de setLoading(false)
            if (settings) {
              const studioFields: Record<string, unknown> = {};
              const studioKeys = [
                'selectedVoice', 'isMultiSpeaker', 'speakerAName', 'speakerBName',
                'speakerBVoice', 'audioProfile', 'scene', 'pace', 'styleNotes',
                'generateScenes', 'sceneDensity', 'sceneRatio', 'visualFramework',
                'emotion', 'emotionIntensity', 'imageTextLanguage',
              ] as const;
              for (const key of studioKeys) {
                const value = (settings as unknown as Record<string, unknown>)[key];
                if (value !== undefined) {
                  studioFields[key] = value;
                }
              }
              if (Object.keys(studioFields).length > 0) {
                useStudioStore.getState().loadFromFirestore(studioFields as Partial<StudioDraftState>);
              }
            }

            if (!actuallyCompleted && window.location.pathname !== '/onboarding') {
              window.location.href = '/onboarding';
            } else {
              setLoading(false);
            }
          }).catch(() => {
            // Carregar settings falhou — continuar com localStorage
            if (window.location.pathname !== '/onboarding') {
              window.location.href = '/onboarding';
            } else {
              setLoading(false);
            }
          });
          return;
        }

        // Onboarding já concluído — carregar settings do estúdio do Firestore antes de liberar a UI
        try { await ensureAppCheck(); } catch { /* App Check falhou — chamadas podem falhar, mas app não trava */ }
        getUserSettings(authUser.uid).then((settings) => {
          if (settings) {
            const studioFields: Record<string, unknown> = {};
            const studioKeys = [
              'selectedVoice', 'isMultiSpeaker', 'speakerAName', 'speakerBName',
              'speakerBVoice', 'audioProfile', 'scene', 'pace', 'styleNotes',
              'generateScenes', 'sceneDensity', 'sceneRatio', 'visualFramework',
              'emotion', 'emotionIntensity', 'imageTextLanguage',
            ] as const;
            for (const key of studioKeys) {
              const value = (settings as unknown as Record<string, unknown>)[key];
              if (value !== undefined) {
                studioFields[key] = value;
              }
            }
            if (Object.keys(studioFields).length > 0) {
              useStudioStore.getState().loadFromFirestore(studioFields as Partial<StudioDraftState>);
            }
          }
          setLoading(false);
        }).catch((err: unknown) => {
          log.warn('Falha ao carregar settings do Firestore — usando localStorage', { error: err });
          setLoading(false);
        });
      } else {
        setLoading(false);
      }

      // Verifica migração quando o usuário faz login (null → não-null)
      if (authUser && authUser.uid !== lastCheckedUserId.current) {
        lastCheckedUserId.current = authUser.uid;

        if (!isMigrationAlreadyHandled(authUser.uid)) {
          setShowMigrationDialog(true);
        }
      }
    });
    return unsubscribe;
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const login = useCallback(async () => {
    try {
      setAuthError(null);
      wasLoginRequested.current = true;
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      wasLoginRequested.current = false;
      log.error('Erro no login', { error });
      setAuthError(getAuthErrorMessage(error));
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    try {
      setAuthError(null);
      wasLoginRequested.current = true;
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Envia email de verificação após cadastro bem-sucedido
      try {
        await sendEmailVerification(credential.user);
      } catch {
        // Falha na verificação não deve bloquear o cadastro
        log.warn('Falha ao enviar email de verificação', { email });
      }
    } catch (error) {
      wasLoginRequested.current = false;
      log.error('Erro no cadastro', { error });
      setAuthError(getAuthErrorMessage(error));
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setAuthError(null);
      wasLoginRequested.current = true;
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      wasLoginRequested.current = false;
      log.error('Erro no login com email', { error });
      setAuthError(getAuthErrorMessage(error));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      log.error('Erro ao enviar email de reset', { error });
      setAuthError(getAuthErrorMessage(error));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthError(null);
      await signOut(auth);
      // Full reload para limpar COEP e permitir próximo login via Firebase Auth
      window.location.href = '/login';
    } catch (error) {
      log.error('Erro no logout', { error });
      setAuthError(getAuthErrorMessage(error));
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      setAuthError(null);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setAuthError('Nenhum usuário logado para excluir.');
        return;
      }

      // Captura o userId antes do cleanup — deleteUser invalida auth.currentUser
      const userId = currentUser.uid;

      // Pipeline de limpeza LGPD — remove dados do Firestore e Storage PRIMEIRO
      // (se deletar o usuário antes, auth.currentUser vira null e o Firestore
      //  rejeita as operações de deleção, deixando dados órfãos sem owner ativo)
      const cleanupErrors = await deleteAllUserData(userId);

      // Remove autenticação APÓS o cleanup — se falhar, dados já foram limpos e
      // o usuário pode tentar novamente (se deleteUser falhar, a conta continua ativa)
      await deleteUser(currentUser);

      if (cleanupErrors.length > 0) {
        log.warn('Alguns dados não puderam ser removidos completamente após exclusão', {
          errors: cleanupErrors,
        });

        // Notifica o usuário sobre dados residuais antes do redirect (LGPD)
        const categories = cleanupErrors.join(', ');
        const confirmed = window.confirm(
          `Sua conta foi excluída, mas alguns dados não puderam ser removidos completamente: ${categories}.\n\n` +
          'Se isso for um problema, entre em contato com o suporte.\n\n' +
          'Clique em "OK" para continuar.',
        );

        if (!confirmed) {
          // Usuário decidiu não prosseguir — mas a conta já foi deletada.
          // Log apenas para auditoria, o redirect acontece de qualquer forma.
          log.info('Usuário cancelou o aviso de limpeza parcial, mas a conta já foi removida');
        }
      }

      // Usuário deletado — redireciona para login
      window.location.href = '/login';
    } catch (error) {
      log.error('Erro ao excluir conta', { error });
      setAuthError(getAuthErrorMessage(error));
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, clearAuthError, login, signup, loginWithEmail, resetPassword, deleteAccount, logout }}>
      {children}
      {showMigrationDialog && user && (
        <DataMigrationDialog
          userId={user.uid}
          onComplete={() => setShowMigrationDialog(false)}
        />
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
