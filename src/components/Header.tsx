import React from 'react';
import { Mic, Sparkles, Library, LogIn, LogOut, User, Image as ImageIcon, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const { user, login, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header className="h-16 border-b border-[var(--border)] flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40 glass-panel" role="banner">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center shadow-[0_0_15px_var(--accent-glow)]" aria-hidden="true">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-sm font-bold tracking-tight text-gradient hidden lg:block">Script Master</h1>
      </div>
      
      <nav className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] overflow-x-auto no-scrollbar max-w-[60%] sm:max-w-none" aria-label="Navegação principal">
        <Link
          to="/"
          aria-current={currentPath === '/' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            currentPath === '/' 
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
          }`}
        >
          <Mic className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
          Estúdio
        </Link>
        <Link
          to="/image"
          aria-current={currentPath === '/image' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            currentPath === '/image' 
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
          Imagem
        </Link>
        <Link
          to="/video"
          aria-current={currentPath === '/video' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            currentPath === '/video' 
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
          }`}
        >
          <PlayCircle className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
          Vídeo
        </Link>
        <Link
          to="/assistant"
          aria-current={currentPath === '/assistant' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            currentPath === '/assistant' 
              ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]' 
              : 'text-[var(--text-secondary)] hover:text-[var(--accent)] border border-transparent'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
          IA
        </Link>
        <Link
          to="/library"
          aria-current={currentPath === '/library' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            currentPath === '/library' 
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
          }`}
        >
          <Library className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
          Biblioteca
        </Link>
      </nav>

      <div className="flex items-center gap-2 sm:gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-5 h-5 rounded-full" />
              ) : (
                <User className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
              <span className="text-xs font-medium text-[var(--text-secondary)] hidden lg:inline-block">
                {user.displayName?.split(' ')[0]}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent-glow)]"
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
