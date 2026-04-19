import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from '../lib/firebase';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': 'Popup fechado. Tente novamente.',
  'auth/cancelled-popup-request': 'Login cancelado.',
  'auth/popup-blocked': 'Popup bloqueado pelo navegador. Permita popups para este site.',
  'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const login = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(getAuthErrorMessage(error));
    }
  };

  const logout = async () => {
    try {
      setAuthError(null);
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError(getAuthErrorMessage(error));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, clearAuthError, login, logout }}>
      {children}
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
