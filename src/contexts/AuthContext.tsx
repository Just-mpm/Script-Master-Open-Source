import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from '../lib/firebase';
import { createLogger } from '../lib/logger';
import { DataMigrationDialog } from '../components/DataMigrationDialog';
import { isMigrationAlreadyHandled } from '../lib/db/migration';

const log = createLogger('AuthContext');

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Popup fechado pelo usuario. Tente novamente.',
  'auth/cancelled-popup-request': 'Login cancelado.',
  'auth/popup-blocked': 'Popup bloqueado pelo navegador. Permita popups para este site.',
  'auth/network-request-failed': 'Erro de conexao. Verifique sua internet.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);

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

  const login = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      log.error('Erro no login', { error });
      setAuthError(getAuthErrorMessage(error));
    }
  };

  const logout = async () => {
    try {
      setAuthError(null);
      await signOut(auth);
    } catch (error) {
      log.error('Erro no logout', { error });
      setAuthError(getAuthErrorMessage(error));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, clearAuthError, login, logout }}>
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
